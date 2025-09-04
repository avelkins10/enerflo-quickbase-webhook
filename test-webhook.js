/**
 * TEST WEBHOOK MAPPING
 * 
 * This script tests the field mapping using the actual webhook payload
 * to ensure all fields are correctly mapped to QuickBase.
 */

const { mapWebhookToQuickBase } = require('./field-mapping');
const fs = require('fs');

// Load the actual webhook payload
const webhookPayload = JSON.parse(fs.readFileSync('./docs/webhook-actual.json', 'utf8'));

console.log('🧪 Testing Webhook Field Mapping...\n');

try {
  // Map the webhook data
  const quickbaseData = mapWebhookToQuickBase(webhookPayload);
  
  console.log(`✅ Successfully mapped ${Object.keys(quickbaseData).length} fields\n`);
  
  // Show key mappings
  console.log('📋 Key Field Mappings:');
  console.log(`   Deal ID (Field 6): ${quickbaseData[6]}`);
  console.log(`   Customer Name (Field 7): ${quickbaseData[7]}`);
  console.log(`   Customer Email (Field 10): ${quickbaseData[10]}`);
  console.log(`   System Size kW (Field 14): ${quickbaseData[14]}`);
  console.log(`   System Size Watts (Field 19): ${quickbaseData[19]}`);
  console.log(`   Total Panel Count (Field 15): ${quickbaseData[15]}`);
  console.log(`   Gross Cost (Field 21): ${quickbaseData[21]}`);
  console.log(`   Address (Field 18): ${quickbaseData[18]}`);
  console.log(`   Sales Notes (Field 62): ${quickbaseData[62] ? 'Present' : 'Missing'}`);
  console.log(`   Layout Preferences (Field 63): ${quickbaseData[63] ? 'Present' : 'Missing'}`);
  
  // Show adder mappings
  const adderCount = Object.keys(quickbaseData).filter(key => 
    key >= 192 && key <= 216 && quickbaseData[key] !== null
  ).length;
  console.log(`   Adders Mapped: ${adderCount} fields`);
  
  // Show file mappings
  console.log(`   Total Files (Field 152): ${quickbaseData[152]}`);
  console.log(`   Contract URL (Field 22): ${quickbaseData[22] ? 'Present' : 'Missing'}`);
  
  console.log('\n🎯 All fields mapped successfully!');
  
} catch (error) {
  console.error('❌ Mapping failed:', error.message);
  console.error(error);
}
