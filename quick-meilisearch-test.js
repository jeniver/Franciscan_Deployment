const axios = require('axios');

// Simple test without authentication to verify Meilisearch connection
async function quickMeilisearchTest() {
  console.log('=== Quick Meilisearch Test ===\n');
  
  try {
    // Test 1: Check if Meilisearch is running
    console.log('1. Testing Meilisearch connection...');
    const healthResponse = await axios.get('http://127.0.0.1:7700/health');
    console.log('✅ Meilisearch is running!');
    console.log('Health:', healthResponse.data);
    console.log();
    
    // Test 2: Check if index exists
    console.log('2. Checking if global_search index exists...');
    try {
      const indexResponse = await axios.get('http://127.0.0.1:7700/indexes/global_search');
      console.log('✅ Index exists');
      console.log('Index info:', indexResponse.data);
    } catch (error) {
      console.log('ℹ️ Index does not exist yet - this is normal');
    }
    console.log();
    
    // Test 3: Try a simple search (will fail if no data)
    console.log('3. Testing search (may fail if no data)...');
    try {
      const searchResponse = await axios.post('http://127.0.0.1:7700/indexes/global_search/search', {
        q: 'test'
      });
      console.log('✅ Search working!');
      console.log('Results found:', searchResponse.data.hits.length);
    } catch (error) {
      console.log('ℹ️ Search failed - likely no data indexed yet');
      console.log('Error:', error.response?.data || error.message);
    }
    console.log();
    
    console.log('=== Test Complete ===');
    console.log('Meilisearch is running and accessible!');
    console.log('Next step: Run the data sync from your application');
    
  } catch (error) {
    console.error('❌ Meilisearch connection failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Run install-and-start-meilisearch.bat first');
    console.log('2. Check if Meilisearch is running on port 7700');
    console.log('3. Try: netstat -an | findstr 7700');
  }
}

quickMeilisearchTest();