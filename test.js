// test.js
require('dotenv').config();
const { getUpcomingWeekDateRange } = require('./weekly-reports');

console.log('Testing Time-tastic report generator');
console.log('API Key:', process.env.TIMETASTIC_API_KEY ? 'Set ✅' : 'Not set ❌');
console.log('Email config:', process.env.EMAIL_HOST ? 'Set ✅' : 'Not set ❌');

// Test date range functionality
const dateRange = getUpcomingWeekDateRange();
console.log('Next week date range:', dateRange); 