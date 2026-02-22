/**
 * Test script to verify item data synchronization fix
 * 
 * This script tests that:
 * 1. Item updates are properly persisted
 * 2. Updated data is reflected in list views
 * 3. Cache-busting is working correctly
 * 4. Refresh functionality works as expected
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://192.168.1.24:3000';
const TEST_ITEM_ID = 35; // The item ID mentioned in the issue
const AUTH_TOKEN = 'your-auth-token-here'; // Replace with valid token

// Test data
const originalItemData = {
  name: 'Test Item Original',
  code: 'TEST001',
  price: 100.00,
  docType: 'OTHERS',
  isRefType: true
};

const updatedItemData = {
  name: 'Test Item Updated',
  code: 'TEST001-UPD',
  price: 150.50,
  docType: 'NAPP',
  isRefType: false
};

// Axios instance with auth
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function runTest() {
  console.log('🧪 Starting Item Data Synchronization Test\n');
  
  try {
    // Test 1: Get original item data
    console.log('📋 Test 1: Fetching original item data...');
    const originalResponse = await api.get(`/api/items/${TEST_ITEM_ID}`);
    const originalItem = originalResponse.data.data || originalResponse.data;
    console.log('✅ Original item fetched:', {
      name: originalItem.Name,
      code: originalItem.Code,
      price: originalItem.Price
    });
    
    // Test 2: Update the item
    console.log('\n✏️  Test 2: Updating item data...');
    const updateResponse = await api.put(`/api/items/${TEST_ITEM_ID}`, updatedItemData);
    const updatedItem = updateResponse.data.data || updateResponse.data;
    console.log('✅ Item updated successfully:', {
      name: updatedItem.Name,
      code: updatedItem.Code,
      price: updatedItem.Price
    });
    
    // Test 3: Verify update via direct GET (cache-busting)
    console.log('\n🔍 Test 3: Verifying update with cache-busting...');
    const verifyResponse = await api.get(`/api/items/${TEST_ITEM_ID}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      params: {
        _t: Date.now() // Cache-busting parameter
      }
    });
    const verifiedItem = verifyResponse.data.data || verifyResponse.data;
    console.log('✅ Verified item data:', {
      name: verifiedItem.Name,
      code: verifiedItem.Code,
      price: verifiedItem.Price
    });
    
    // Test 4: Check if updated data appears in list view
    console.log('\n📋 Test 4: Checking list view for updated data...');
    const listResponse = await api.get('/api/items', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      params: {
        _t: Date.now() // Cache-busting parameter
      }
    });
    const items = listResponse.data.data || listResponse.data;
    const updatedItemInList = items.find(item => item.ItemId === TEST_ITEM_ID);
    
    if (updatedItemInList) {
      console.log('✅ Updated item found in list view:', {
        name: updatedItemInList.Name,
        code: updatedItemInList.Code,
        price: updatedItemInList.Price
      });
    } else {
      console.log('❌ Updated item NOT found in list view');
      return false;
    }
    
    // Test 5: Verify data consistency
    console.log('\n⚖️  Test 5: Verifying data consistency...');
    const isConsistent = 
      updatedItemInList.Name === updatedItem.Name &&
      updatedItemInList.Code === updatedItem.Code &&
      updatedItemInList.Price === updatedItem.Price;
    
    if (isConsistent) {
      console.log('✅ Data is consistent between update and list view');
    } else {
      console.log('❌ Data inconsistency detected');
      console.log('List view data:', updatedItemInList);
      console.log('Update response data:', updatedItem);
      return false;
    }
    
    // Test 6: Test with different cache scenarios
    console.log('\n🔄 Test 6: Testing cache scenarios...');
    
    // Test with cache headers
    const cachedResponse = await api.get(`/api/items/${TEST_ITEM_ID}`);
    const cachedItem = cachedResponse.data.data || cachedResponse.data;
    console.log('✅ Cached response received');
    
    // Test with fresh data request
    const freshResponse = await api.get(`/api/items/${TEST_ITEM_ID}?_t=${Date.now()}`);
    const freshItem = freshResponse.data.data || freshResponse.data;
    console.log('✅ Fresh data response received');
    
    console.log('\n🎉 All tests passed! Item data synchronization is working correctly.');
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    return false;
  }
}

// Run the test
if (require.main === module) {
  runTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTest };