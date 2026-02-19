// Test script to verify inscription deceased data update fix
const axios = require('axios');

async function testInscriptionUpdate() {
  const baseURL = 'http://localhost:3000'; // Adjust to your backend URL
  const inscriptionCode = 'I-5674-0'; // Replace with actual test inscription code
  
  console.log('🧪 Testing Inscription Deceased Data Update Fix');
  console.log('==============================================');
  
  try {
    // Step 1: Get initial agreement data
    console.log('\n1. Fetching initial agreement data...');
    const initialResponse = await axios.get(`${baseURL}/api/inscription-agreements/${inscriptionCode}/pdf`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      params: {
        _t: Date.now()
      }
    });
    
    if (!initialResponse.data.success) {
      console.error('❌ Failed to fetch initial data:', initialResponse.data.message);
      return;
    }
    
    const initialData = initialResponse.data.data;
    console.log('✅ Initial data fetched successfully');
    console.log('   Deceased count:', initialData.deceased.length);
    console.log('   Deceased names:', initialData.deceased.map(d => d.name).join(', '));
    
    // Step 2: Update inscription with new deceased data
    console.log('\n2. Updating inscription with new deceased data...');
    const updateData = {
      applicant: {
        name: initialData.applicant.name,
        nricPassportNo: initialData.applicant.nric,
        address: {
          block: 'Test Block',
          blockNo: 'Test Block',
          street: 'Test Street',
          streetName: 'Test Street',
          unitNo: '01-01',
          postalCode: '123456'
        },
        mobile: initialData.applicant.mobile,
        homeTel: initialData.applicant.phone,
        emailId: initialData.applicant.email
      },
      deceasedDetails: [
        {
          name: 'Updated Test Deceased',
          dateOfDeath: '2024-01-01',
          dateOfBirth: '1950-01-01',
          internmentDate: '2024-01-02 10:00',
          deathCertificateNo: 'TEST123',
          birthYear: '1950',
          inscriptionText: 'In Loving Memory'
        }
      ],
      inscription: {
        bibleInscriptionChoiceId: null,
        bibleInscriptionText: '',
        additionalInscriptionPhrase: 'Test inscription text',
        remarks: '',
        crossType: 'Crucifix'
      }
    };
    
    const updateResponse = await axios.put(`${baseURL}/api/inscriptions/${inscriptionCode}`, updateData);
    
    if (!updateResponse.data.success) {
      console.error('❌ Failed to update inscription:', updateResponse.data.message);
      return;
    }
    
    console.log('✅ Inscription updated successfully');
    
    // Step 3: Wait a moment for database sync
    console.log('\n3. Waiting for database sync...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Fetch updated agreement data
    console.log('\n4. Fetching updated agreement data...');
    const updatedResponse = await axios.get(`${baseURL}/api/inscription-agreements/${inscriptionCode}/pdf`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      params: {
        _t: Date.now()
      }
    });
    
    if (!updatedResponse.data.success) {
      console.error('❌ Failed to fetch updated data:', updatedResponse.data.message);
      return;
    }
    
    const updatedData = updatedResponse.data.data;
    console.log('✅ Updated data fetched successfully');
    console.log('   Deceased count:', updatedData.deceased.length);
    console.log('   Deceased names:', updatedData.deceased.map(d => d.name).join(', '));
    
    // Step 5: Validate the update
    console.log('\n5. Validating update...');
    const initialNames = initialData.deceased.map(d => d.name).sort();
    const updatedNames = updatedData.deceased.map(d => d.name).sort();
    
    if (JSON.stringify(initialNames) !== JSON.stringify(updatedNames)) {
      console.log('✅ Deceased data was successfully updated!');
      console.log('   Before:', initialNames.join(', '));
      console.log('   After:', updatedNames.join(', '));
    } else {
      console.log('⚠️  Deceased data appears unchanged');
      console.log('   This might indicate the update didn\'t work or the test data was the same');
    }
    
    // Step 6: Validate specific fields
    if (updatedData.deceased.length > 0) {
      const firstDeceased = updatedData.deceased[0];
      console.log('\n   First deceased details:');
      console.log('   - Name:', firstDeceased.name);
      console.log('   - Date of Birth:', firstDeceased.formattedDates?.birth || firstDeceased.dateOfBirth);
      console.log('   - Date of Death:', firstDeceased.formattedDates?.death || firstDeceased.dateOfDeath);
      console.log('   - Internment Date:', firstDeceased.formattedDates?.internment || firstDeceased.internmentDate);
      console.log('   - Death Certificate:', firstDeceased.deathCertificateNo);
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testInscriptionUpdate();