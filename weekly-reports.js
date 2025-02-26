// Time-tastic Weekly Team Holiday Report
// This script fetches time-off data from the Time-tastic API and generates a weekly report

// Import required modules
import axios from 'axios';
import moment from 'moment';
// Comment out nodemailer as we're not using email
// import nodemailer from 'nodemailer';
import { config as dotenvConfig } from 'dotenv';

// Initialize environment variables
dotenvConfig();

// Configuration
const config = {
  timetastic: {
    apiKey: process.env.TIMETASTIC_API_KEY,
    baseUrl: 'https://app.timetastic.co.uk/api',
  },
  email: {
    enabled: false, // Disable email notifications
    // Rest of email config remains but won't be used
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    from: 'Team Calendar <team-calendar@example.com>',
    to: process.env.EMAIL_RECIPIENTS,
    subject: 'Weekly Team Absence Report',
  },
  slackWebhook: {
    enabled: true, // Enable Slack notifications
    url: process.env.SLACK_WEBHOOK_URL,
  },
};

// Initialize HTTP client with authentication
const timetasticClient = axios.create({
  baseURL: config.timetastic.baseUrl,
  headers: {
    'Authorization': `Bearer ${config.timetastic.apiKey}`,
    'Content-Type': 'application/json',
  },
});

// Get date range for the current and upcoming week (today through next Sunday)
function getUpcomingWeekDateRange() {
  const today = moment();
  // Start from today
  const startDate = today.clone();
  // Find next Sunday (7 = Sunday in moment.js)
  const nextSunday = moment().day(7 + 7); // This Sunday + 7 days = Next Sunday
  
  console.log(`Today is ${today.format('YYYY-MM-DD')} (${today.format('dddd')})`);
  console.log(`Start date is ${startDate.format('YYYY-MM-DD')} (${startDate.format('dddd')})`);
  console.log(`Next Sunday is ${nextSunday.format('YYYY-MM-DD')} (${nextSunday.format('dddd')})`);
  
  return {
    start: startDate.format('YYYY-MM-DD'),
    end: nextSunday.format('YYYY-MM-DD'),
    formattedRange: `${startDate.format('MMM D')} - ${nextSunday.format('MMM D, YYYY')}`,
  };
}

// Fetch department information - modified to handle empty results
async function getDepartments() {
  try {
    const response = await timetasticClient.get('/departments');
    return response.data;
  } catch (error) {
    // If we get a 404, it might mean no departments exist yet
    if (error.response && error.response.status === 404) {
      console.log('No departments found - this might be normal if none are configured yet.');
      return []; // Return empty array instead of throwing
    }
    console.error('Error fetching departments:', error.message);
    throw error;
  }
}

// Fetch users information - modified to handle empty results
async function getUsers() {
  try {
    const response = await timetasticClient.get('/users');
    return response.data;
  } catch (error) {
    // If we get a 404, it might mean no users exist yet
    if (error.response && error.response.status === 404) {
      console.log('No users found - this might be normal if none are configured yet.');
      return []; // Return empty array instead of throwing
    }
    console.error('Error fetching users:', error.message);
    throw error;
  }
}

// Fetch absence types - modified to handle empty results
async function getAbsenceTypes() {
  try {
    const response = await timetasticClient.get('/absence-types');
    return response.data;
  } catch (error) {
    // If we get a 404, it might mean no absence types exist yet
    if (error.response && error.response.status === 404) {
      console.log('No absence types found - this might be normal if none are configured yet.');
      return []; // Return empty array instead of throwing
    }
    console.error('Error fetching absence types:', error.message);
    throw error;
  }
}

// Fetch holidays for a date range - modified to handle actual API response format
async function getHolidays(startDate, endDate, apiKey) {
  try {
    const url = `https://app.timetastic.co.uk/api/holidays?start=${startDate}&end=${endDate}`;
    console.log(`Requesting holidays from ${startDate} to ${endDate}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      console.log("Got 404 response when fetching holidays - returning empty array");
      return [];
    }
    
    const data = await response.json();
    
    // Handle API response format correctly
    if (data && data.holidays && Array.isArray(data.holidays)) {
      console.log(`Found ${data.holidays.length} holidays in the response`);
      
      // Log detailed information about each holiday
      data.holidays.forEach((holiday, index) => {
        console.log(`Holiday #${index + 1}:`);
        console.log(`  User: ${holiday.userName}`);
        console.log(`  Date: ${holiday.dateRangeString}`);
        console.log(`  Start: ${holiday.startDate} (${holiday.startType})`);
        console.log(`  End: ${holiday.endDate} (${holiday.endType})`);
        console.log(`  Status: ${holiday.status || 'Unknown'}`);
      });
      
      return data.holidays;
    } else {
      console.log("Unexpected API response format for holidays:", JSON.stringify(data, null, 2));
      return [];
    }
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return [];
  }
}

// Format holidays by day for the weekly report
function formatHolidaysByDay(holidays, users, absenceTypes, dateRange) {
  // Ensure holidays is an array
  holidays = Array.isArray(holidays) ? holidays : [];
  // Ensure users is an array
  users = Array.isArray(users) ? users : [];
  // Ensure absenceTypes is an array
  absenceTypes = Array.isArray(absenceTypes) ? absenceTypes : [];
  
  // Create a map of users by ID for quick lookup
  const userMap = users.reduce((map, user) => {
    map[user.id] = user;
    return map;
  }, {});

  // Create a map of absence types by ID for quick lookup
  const absenceTypeMap = absenceTypes.reduce((map, type) => {
    map[type.id] = type;
    return map;
  }, {});

  // Generate array of all dates in the range
  const startDate = moment(dateRange.start);
  const endDate = moment(dateRange.end);
  const dates = [];
  let currentDate = startDate.clone();

  while (currentDate.isSameOrBefore(endDate)) {
    dates.push(currentDate.format('YYYY-MM-DD'));
    currentDate.add(1, 'days');
  }

  // Create a map of dates to absences
  const holidaysByDay = {};
  
  // Initialize each date with an empty array
  dates.forEach(date => {
    holidaysByDay[date] = [];
  });

  // Populate the map with holidays
  holidays.forEach(holiday => {
    const start = moment(holiday.startDate).format('YYYY-MM-DD');
    const end = moment(holiday.endDate).format('YYYY-MM-DD');
    
    // Get all dates between start and end (inclusive)
    let currentDate = moment(start);
    const endDateObj = moment(end);
    
    while (currentDate.isSameOrBefore(endDateObj)) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      
      // Only add if the date is within our week range
      if (holidaysByDay[dateStr] !== undefined) {
        const user = userMap[holiday.userId];
        const absenceType = absenceTypeMap[holiday.absenceTypeId];
        
        holidaysByDay[dateStr].push({
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
          absenceType: absenceType ? absenceType.name : 'Unknown Type',
          reason: holiday.reason || 'No reason provided',
          approved: holiday.approved,
          duration: holiday.duration,
          deduction: holiday.deduction,
        });
      }
      
      currentDate.add(1, 'days');
    }
  });

  return holidaysByDay;
}

// Generate a summary of who is off for the entire week
function generateWeeklySummary(holidaysByDay) {
  // Track who is off and on which days
  const userAbsences = {};
  
  // Iterate through each day
  Object.entries(holidaysByDay).forEach(([date, absences]) => {
    const formattedDate = moment(date).format('ddd, MMM D');
    
    // For each absence on this day
    absences.forEach(absence => {
      if (!userAbsences[absence.userName]) {
        userAbsences[absence.userName] = {
          days: [],
          types: new Set(),
        };
      }
      
      userAbsences[absence.userName].days.push(formattedDate);
      userAbsences[absence.userName].types.add(absence.absenceType);
    });
  });
  
  // Format the summary
  const summary = Object.entries(userAbsences).map(([userName, data]) => {
    const types = Array.from(data.types).join(', ');
    return {
      userName,
      days: data.days,
      types,
      totalDays: data.days.length,
    };
  });
  
  // Sort by most days off
  return summary.sort((a, b) => b.totalDays - a.totalDays);
}

// Generate HTML for the email report
function generateHtmlReport(holidaysByDay, weeklySummary, dateRange) {
  let html = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
        h1, h2, h3 { color: #2c3e50; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .week-summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .day-section { margin-bottom: 25px; }
        .no-absences { color: #27ae60; font-style: italic; }
        .warning { color: #e74c3c; }
      </style>
    </head>
    <body>
      <h1>Weekly Team Absence Report</h1>
      <p>Week of ${dateRange.formattedRange}</p>
      
      <div class="week-summary">
        <h2>Week Overview</h2>
  `;
  
  if (weeklySummary.length === 0) {
    html += `<p class="no-absences">No team members are scheduled to be absent this week!</p>`;
  } else {
    html += `
        <table>
          <tr>
            <th>Team Member</th>
            <th>Days Absent</th>
            <th>Absence Type</th>
          </tr>
    `;
    
    weeklySummary.forEach(summary => {
      html += `
          <tr>
            <td>${summary.userName}</td>
            <td>${summary.totalDays} (${summary.days.join(', ')})</td>
            <td>${summary.types}</td>
          </tr>
      `;
    });
    
    html += `</table>`;
  }
  
  html += `</div>`;
  
  // Daily breakdown
  html += `<h2>Daily Breakdown</h2>`;
  
  Object.entries(holidaysByDay).forEach(([date, absences]) => {
    const formattedDate = moment(date).format('dddd, MMMM D, YYYY');
    
    html += `
      <div class="day-section">
        <h3>${formattedDate}</h3>
    `;
    
    if (absences.length === 0) {
      html += `<p class="no-absences">No absences scheduled.</p>`;
    } else {
      html += `
        <table>
          <tr>
            <th>Team Member</th>
            <th>Absence Type</th>
            <th>Reason</th>
            <th>Status</th>
          </tr>
      `;
      
      absences.forEach(absence => {
        html += `
          <tr>
            <td>${absence.userName}</td>
            <td>${absence.absenceType}</td>
            <td>${absence.reason}</td>
            <td>${absence.approved ? 'Approved' : '<span class="warning">Pending</span>'}</td>
          </tr>
        `;
      });
      
      html += `</table>`;
    }
    
    html += `</div>`;
  });
  
  html += `
      <p>This report was automatically generated from Time-tastic.</p>
    </body>
    </html>
  `;
  
  return html;
}

// Generate plain text for the email report (for email clients that don't support HTML)
function generateTextReport(holidaysByDay, weeklySummary, dateRange) {
  let text = `Weekly Team Absence Report\n`;
  text += `Week of ${dateRange.formattedRange}\n\n`;
  
  text += `WEEK OVERVIEW\n`;
  text += `=============\n\n`;
  
  if (weeklySummary.length === 0) {
    text += `No team members are scheduled to be absent this week!\n\n`;
  } else {
    weeklySummary.forEach(summary => {
      text += `${summary.userName}: ${summary.totalDays} days (${summary.days.join(', ')})\n`;
      text += `Type: ${summary.types}\n\n`;
    });
  }
  
  text += `DAILY BREAKDOWN\n`;
  text += `===============\n\n`;
  
  Object.entries(holidaysByDay).forEach(([date, absences]) => {
    const formattedDate = moment(date).format('dddd, MMMM D, YYYY');
    
    text += `${formattedDate}\n`;
    text += `${'-'.repeat(formattedDate.length)}\n\n`;
    
    if (absences.length === 0) {
      text += `No absences scheduled.\n\n`;
    } else {
      absences.forEach(absence => {
        text += `${absence.userName} - ${absence.absenceType}\n`;
        text += `Reason: ${absence.reason}\n`;
        text += `Status: ${absence.approved ? 'Approved' : 'Pending'}\n\n`;
      });
    }
  });
  
  text += `This report was automatically generated from Time-tastic.`;
  
  return text;
}

// Send email report
async function sendEmailReport(htmlContent, textContent, dateRange) {
  if (!config.email.enabled) {
    console.log('Email notifications are disabled.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.auth,
    });

    const info = await transporter.sendMail({
      from: config.email.from,
      to: config.email.to,
      subject: `${config.email.subject} (${dateRange.formattedRange})`,
      text: textContent,
      html: htmlContent,
    });

    console.log('Email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error.message);
  }
}

// Send Slack notification
async function sendSlackNotification(message) {
  if (!config.slackWebhook.enabled) {
    console.log('Slack notifications are disabled.');
    return;
  }

  try {
    console.log('Sending notification to Slack webhook...');
    const response = await axios.post(config.slackWebhook.url, message);
    console.log('Slack notification sent successfully', response.status, response.statusText);
  } catch (error) {
    console.error('Error sending Slack notification:', error.message);
    // Check if this is a network error
    if (error.code) {
      console.error('Network error code:', error.code);
      console.error('This may be a temporary network issue or a problem with the Slack webhook URL.');
      console.error('Webhook URL:', config.slackWebhook.url.substring(0, 30) + '...');
    }
    // Check if we have a response
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
  }
}

// Main function to run the weekly report
async function generateWeeklyReport() {
  console.log('Generating weekly team absence report...');
  try {
    // Get the next week's date range
    const dateRange = getUpcomingWeekDateRange();
    console.log(`Date range: ${dateRange.start} to ${dateRange.end}`);
    
    // We don't need to reinitialize the timetasticClient - it's already initialized at the top of the file
    // Get all the data we need concurrently
    const [departments, users, absenceTypes, holidays] = await Promise.all([
      getDepartments(),
      getUsers(),
      getAbsenceTypes(),
      getHolidays(dateRange.start, dateRange.end, config.timetastic.apiKey),
    ]);
    
    // Generate the Slack message with our new function
    const slackMessage = generateSlackMessage(departments, users, absenceTypes, holidays);
    
    // Send the Slack message if enabled in config
    if (config.slackWebhook.enabled) {
      await sendSlackNotification(slackMessage);
    } else {
      console.log('Slack notifications are disabled in config');
    }
    
    // Send the email notification if enabled in config
    if (config.email.enabled) {
      // We need to format holidays by day for the email report
      const holidaysByDay = formatHolidaysByDay(holidays, users, absenceTypes, dateRange);
      const weeklySummary = generateWeeklySummary(holidaysByDay);
      
      const htmlReport = generateHtmlReport(holidaysByDay, weeklySummary, dateRange);
      const textReport = generateTextReport(holidaysByDay, weeklySummary, dateRange);
      await sendEmailReport(htmlReport, textReport, dateRange);
      console.log('Email notification sent successfully');
    } else {
      console.log('Email notifications are disabled in config');
    }
    
    console.log('Weekly report generation completed successfully.');
    return { success: true };
  } catch (error) {
    console.error('Error generating weekly report:', error);
    return { success: false, error: error.message };
  }
}

// Instead of using node-cron, we'll export a module format for Cloudflare Workers
// Remove the cron schedule code

// This is what Cloudflare Workers needs - an export default with handlers
export default {
  // Handle scheduled events (this will be triggered by Cloudflare's cron)
  async scheduled(event, env, ctx) {
    console.log(`Running scheduled report at ${new Date().toLocaleString()}`);
    await generateWeeklyReport();
    return new Response("Report generated successfully");
  },
  
  // Handle HTTP requests (optional - for manual triggering via HTTP request)
  async fetch(request, env, ctx) {
    // Add environment variables from Cloudflare
    if (env.TIMETASTIC_API_KEY) {
      process.env.TIMETASTIC_API_KEY = env.TIMETASTIC_API_KEY;
    }
    
    if (env.SLACK_WEBHOOK_URL) {
      process.env.SLACK_WEBHOOK_URL = env.SLACK_WEBHOOK_URL;
    }
    
    console.log(`Manual report generation requested at ${new Date().toLocaleString()}`);
    try {
      await generateWeeklyReport();
      return new Response("Report generated successfully", { status: 200 });
    } catch (error) {
      console.error("Error generating report:", error);
      return new Response(`Error generating report: ${error.message}`, { status: 500 });
    }
  }
};

// Format a date to show the day of week prominently
function formatDateForSlack(dateString) {
  const date = new Date(dateString);
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `*${dayOfWeek}*, ${formattedDate}`;
}

// Determine the type of absence (Full day, Morning only, Afternoon only, or Multiple days)
function getAbsenceLabel(holiday) {
  if (holiday.startDate === holiday.endDate) {
    // Single day
    if (holiday.startType === "Morning" && holiday.endType === "Morning") {
      return "Morning only";
    } else if (holiday.startType === "Afternoon" && holiday.endType === "Afternoon") {
      return "Afternoon only";
    } else {
      return "Full day";
    }
  } else {
    // Multi-day absence
    return "Multiple days";
  }
}

function generateSlackMessage(departments, users, absenceTypes, holidays) {
  console.log(`Working with ${departments.length} departments, ${users.length} users, ${absenceTypes.length} absence types, and ${holidays.length} holidays.`);
  
  // Get the formatted date range
  const dateRange = getUpcomingWeekDateRange();
  
  // Filter to just holidays in the date range that have been approved
  const approvedHolidays = holidays.filter(holiday => {
    return holiday.status === "Approved" || holiday.status === undefined; // Some APIs may not include status if all are approved
  });

  // Sort holidays by startDate in chronological order
  approvedHolidays.sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateA - dateB; // Ascending order (earliest dates first)
  });

  let message = {
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `<!channel> *🔔 Team Absence Report*\nFrom today through next week (${dateRange.formattedRange}):`
        }
      }
    ]
  };

  if (approvedHolidays.length === 0) {
    message.blocks.push({
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "No team members are scheduled to be absent during this period! 🎉"
      }
    });
  } else {
    message.blocks.push({
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Team members with scheduled absences:*"
      }
    });

    // Group holidays by user
    const holidaysByUser = {};
    approvedHolidays.forEach(holiday => {
      if (!holidaysByUser[holiday.userName]) {
        holidaysByUser[holiday.userName] = [];
      }
      holidaysByUser[holiday.userName].push(holiday);
    });

    // Create a message for each user with their absence dates
    // Sort users by their earliest absence date
    const usersByEarliestAbsence = Object.keys(holidaysByUser).map(userName => {
      // Get the earliest absence date for this user
      const earliestDate = holidaysByUser[userName].reduce((earliest, holiday) => {
        const holidayDate = new Date(holiday.startDate);
        return earliest === null || holidayDate < earliest ? holidayDate : earliest;
      }, null);
      
      return {
        userName,
        earliestDate
      };
    }).sort((a, b) => a.earliestDate - b.earliestDate); // Sort by earliest date
    
    // Now add each user's absences to the message in chronological order
    usersByEarliestAbsence.forEach(({ userName }) => {
      const userHolidays = holidaysByUser[userName];
      
      // Add user name as a separate block
      message.blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*${userName}*`
        }
      });
      
      // Add each absence on its own line with detailed information
      const absenceDetails = userHolidays.map(holiday => {
        const absenceType = getAbsenceLabel(holiday);
        
        // Format the date nicely using our new function
        let dateText = "";
        if (holiday.startDate === holiday.endDate) {
          // Single day
          dateText = `🗓️ ${formatDateForSlack(holiday.startDate)} - ${absenceType}`;
        } else {
          // Date range
          dateText = `🗓️ ${formatDateForSlack(holiday.startDate)} to ${formatDateForSlack(holiday.endDate)} - ${absenceType}`;
        }
        
        return dateText;
      }).join('\n');
      
      // Add all absences for this user as a single block with line breaks
      message.blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": absenceDetails
        }
      });
      
      // Add a divider after each user except the last one
      if (userName !== usersByEarliestAbsence[usersByEarliestAbsence.length - 1].userName) {
        message.blocks.push({
          "type": "divider"
        });
      }
    });
  }

  return message;
}