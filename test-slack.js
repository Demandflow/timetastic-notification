// test-slack.js
require('dotenv').config();
const axios = require('axios');

async function testSlackWebhook() {
  console.log('Testing Slack webhook integration...');
  
  // Check if the webhook URL is set
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('❌ SLACK_WEBHOOK_URL is not set in your .env file');
    return;
  }
  
  console.log('✅ SLACK_WEBHOOK_URL is set');
  
  try {
    // Send a test message to Slack
    const message = {
      text: '*Timetastic Weekly Report - Test Message*\nThis is a test message from your Timetastic Weekly Report tool. If you can see this, your Slack webhook integration is working! 🎉',
      unfurl_links: false,
      unfurl_media: false,
    };
    
    console.log('Sending test message to Slack...');
    await axios.post(webhookUrl, message);
    console.log('✅ Test message sent successfully to Slack!');
  } catch (error) {
    console.error('❌ Error sending message to Slack:', error.message);
    console.error('Please check your webhook URL and Slack workspace settings.');
  }
}

// Run the test
testSlackWebhook(); 