const { mapWebhookToQuickBase } = require('./field-mapping');

// Load the real webhook data
const fs = require('fs');
const realWebhookData = JSON.parse(fs.readFileSync('./docs/webhook-actual.json', 'utf8'));

// Change the deal ID to make it unique
realWebhookData.payload.deal.id = 'TEST-REAL-DATA-LOCAL';

console.log('Testing with real Enerflo webhook data...');
console.log('Deal ID:', realWebhookData.payload.deal.id);
console.log('Customer:', realWebhookData.payload.customer.firstName, realWebhookData.payload.customer.lastName);

try {
  const mappedData = mapWebhookToQuickBase(realWebhookData);
  
  console.log('\n=== FIELD MAPPING RESULTS ===');
  console.log(`Total fields mapped: ${Object.keys(mappedData).length}`);
  
  // Show first 20 fields as examples
  console.log('\nFirst 20 mapped fields:');
  Object.keys(mappedData).slice(0, 20).forEach(fieldId => {
    const value = mappedData[fieldId];
    console.log(`Field ${fieldId}: ${JSON.stringify(value)}`);
  });
  
  // Count fields by category
  const fieldCounts = {
    'Core Deal/Customer': 0,
    'Address': 0,
    'System Design': 0,
    'Pricing/Financial': 0,
    'Deal State/Flags': 0,
    'Additional Work': 0,
    'Adders': 0,
    'Financing': 0,
    'Files/Documents': 0,
    'JSON Data': 0,
    'Metadata/IDs': 0,
    'Welcome Call': 0,
    'Setter/Closer': 0
  };
  
  Object.keys(mappedData).forEach(fieldId => {
    const id = parseInt(fieldId);
    if (id >= 6 && id <= 17) fieldCounts['Core Deal/Customer']++;
    else if (id >= 18 && id <= 78) fieldCounts['Address']++;
    else if (id >= 14 && id <= 89) fieldCounts['System Design']++;
    else if (id >= 21 && id <= 144) fieldCounts['Pricing/Financial']++;
    else if (id >= 41 && id <= 167) fieldCounts['Deal State/Flags']++;
    else if (id >= 47 && id <= 120) fieldCounts['Additional Work']++;
    else if (id >= 192 && id <= 216) fieldCounts['Adders']++;
    else if (id >= 135 && id <= 142) fieldCounts['Financing']++;
    else if (id >= 22 && id <= 151) fieldCounts['Files/Documents']++;
    else if (id >= 58 && id <= 124) fieldCounts['JSON Data']++;
    else if (id >= 64 && id <= 72) fieldCounts['Metadata/IDs']++;
    else if (id >= 171 && id <= 178) fieldCounts['Welcome Call']++;
    else if (id >= 218 && id <= 219) fieldCounts['Setter/Closer']++;
  });
  
  console.log('\n=== FIELD COUNTS BY CATEGORY ===');
  Object.entries(fieldCounts).forEach(([category, count]) => {
    if (count > 0) {
      console.log(`${category}: ${count} fields`);
    }
  });
  
} catch (error) {
  console.error('Error mapping webhook data:', error.message);
  console.error(error.stack);
}
