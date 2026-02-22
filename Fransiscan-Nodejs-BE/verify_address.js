const AddressUtils = require('./src/utils/AddressUtils');

const testCases = [
    {
        name: 'Standard Unit and Postal',
        data: {
            AddressNo: 'Blk',
            Address: '123',
            Address2: 'STREET NAME',
            AddressCity: '01-01',
            DistrictCode: '123456',
            Country: 'Singapore'
        },
        expected: 'Blk 123 STREET NAME #01-01 Singapore 123456'
    },
    {
        name: 'Duplicated Postal (User reported)',
        data: {
            AddressNo: 'No 768',
            Address: 'YISHUN AVENUE 3',
            Address2: '#656860',
            AddressCity: '#656860',
            Country: 'Singapore'
        },
        expected: 'No 768 YISHUN AVENUE 3 #656860 Singapore'
    },
    {
        name: 'Mixed Overlapping Fields',
        data: {
            AddressNo: 'No',
            Address: '390 Bukit Batok West Ave 5',
            Address2: '#21-384 Singapore 650390',
            AddressCity: '650390',
            Country: 'Singapore'
        },
        expected: 'No 390 Bukit Batok West Ave 5 #21-384 Singapore 650390'
    }
];

let passed = 0;
testCases.forEach(tc => {
    const result = AddressUtils.formatAddress(tc.data);
    const match = result === tc.expected;
    console.log(`\nTEST: ${tc.name}`);
    console.log(`RESULT:   [${result}]`);
    console.log(`EXPECTED: [${tc.expected}]`);
    console.log(`STATUS:   ${match ? '✅ PASSED' : '❌ FAILED'}`);
    if (match) passed++;
});

console.log(`\nSummary: ${passed}/${testCases.length} passed.`);
process.exit(passed === testCases.length ? 0 : 1);
