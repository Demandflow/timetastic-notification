// Script to run the weekly report immediately
require('dotenv').config();
const { generateWeeklyReport } = require('./weekly-reports');

console.log('Running Timetastic weekly report immediately...');
console.log(`Current time: ${new Date().toLocaleString()}`);

// Run the report generation function
generateWeeklyReport()
  .then(() => {
    console.log('Report generation completed.');
  })
  .catch(error => {
    console.error('Error running report:', error);
  }); 