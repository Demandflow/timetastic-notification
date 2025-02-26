// test-timetastic.js
require('dotenv').config();
const axios = require('axios');

// Create the API client
const timetasticClient = axios.create({
  baseURL: 'https://app.timetastic.co.uk/api',
  headers: {
    'Authorization': `Bearer ${process.env.TIMETASTIC_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Test function to check various API endpoints
async function testTimetasticAPI() {
  console.log('Testing Timetastic API connection...');
  console.log('API Key:', process.env.TIMETASTIC_API_KEY ? process.env.TIMETASTIC_API_KEY.substring(0, 10) + '...' : 'Not set');
  
  // Try different endpoints
  const endpoints = [
    '/departments',
    '/users',
    '/absence-types',
    '/holidays',
    '/me' // Often used for validation
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing endpoint: ${endpoint}`);
      const response = await timetasticClient.get(endpoint);
      console.log(`✅ ${endpoint} - Success (Status: ${response.status})`);
      
      // Show a sample of the data
      if (response.data && Array.isArray(response.data)) {
        console.log(`   Received ${response.data.length} items`);
        if (response.data.length > 0) {
          console.log(`   First item sample:`, JSON.stringify(response.data[0]).substring(0, 100) + '...');
        }
      } else if (response.data) {
        console.log(`   Response:`, JSON.stringify(response.data).substring(0, 100) + '...');
      }
    } catch (error) {
      console.error(`❌ ${endpoint} - Failed (Status: ${error.response?.status || 'Unknown'})`);
      console.error(`   Error: ${error.message}`);
      
      if (error.response && error.response.data) {
        console.error(`   Response data:`, error.response.data);
      }
    }
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Run the test
testTimetasticAPI(); 