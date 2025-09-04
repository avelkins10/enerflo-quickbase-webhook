const webhookPayload = require('./docs/webhook-actual.json');

console.log('=== PRICING STRUCTURE ANALYSIS ===\n');

// Extract pricing data
const pricing = webhookPayload.payload.proposal.pricingOutputs.deal;

console.log('Available pricing properties:');
Object.keys(pricing).forEach(key => {
  console.log(`- ${key}`);
});

console.log('\n=== ADDER PREFIX SEARCH ===');
Object.keys(pricing).forEach(key => {
  if (key.toLowerCase().includes('adder') || key.toLowerCase().includes('value') || key.toLowerCase().includes('system')) {
    console.log(`Found: ${key}`);
    if (Array.isArray(pricing[key])) {
      console.log(`  Array length: ${pricing[key].length}`);
      if (pricing[key].length > 0) {
        console.log(`  First item keys: ${Object.keys(pricing[key][0])}`);
      }
    } else if (typeof pricing[key] === 'object') {
      console.log(`  Object keys: ${Object.keys(pricing[key])}`);
    }
  }
});

console.log('\n=== SEARCHING FOR TREE REMOVAL ===');
const searchForTreeRemoval = (obj, path = '') => {
  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (typeof value === 'string' && value.includes('Tree Removal')) {
        console.log(`Found "Tree Removal" at: ${currentPath}`);
        console.log(`  Value: ${value}`);
        if (typeof obj === 'object' && obj.amount !== undefined) {
          console.log(`  Amount: ${obj.amount}`);
        }
      }
      if (typeof value === 'object') {
        searchForTreeRemoval(value, currentPath);
      }
    }
  }
};

searchForTreeRemoval(pricing);
