const webhookPayload = require('./docs/webhook-actual.json');

console.log('=== FULL WEBHOOK STRUCTURE ===\n');

console.log('Top level keys:');
Object.keys(webhookPayload.payload).forEach(key => {
  console.log(`- ${key}`);
});

console.log('\nProposal keys:');
Object.keys(webhookPayload.payload.proposal).forEach(key => {
  console.log(`- ${key}`);
});

console.log('\nPricingOutputs keys:');
Object.keys(webhookPayload.payload.proposal.pricingOutputs).forEach(key => {
  console.log(`- ${key}`);
});

console.log('\nDeal keys:');
Object.keys(webhookPayload.payload.proposal.pricingOutputs.deal).forEach(key => {
  console.log(`- ${key}`);
});

// Let's look for adder data in the entire payload
console.log('\n=== SEARCHING FOR ADDER DATA ===');
const searchForAdders = (obj, path = '', depth = 0) => {
  if (depth > 5) return; // Prevent infinite recursion
  
  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (key.toLowerCase().includes('adder') || 
          key.toLowerCase().includes('value') || 
          key.toLowerCase().includes('system') ||
          key.toLowerCase().includes('calculated')) {
        console.log(`Found potential adder field at: ${currentPath}`);
        if (Array.isArray(value)) {
          console.log(`  Array length: ${value.length}`);
          if (value.length > 0 && typeof value[0] === 'object') {
            console.log(`  First item keys: ${Object.keys(value[0])}`);
          }
        } else if (typeof value === 'object') {
          console.log(`  Object keys: ${Object.keys(value)}`);
        }
      }
      
      if (typeof value === 'object') {
        searchForAdders(value, currentPath, depth + 1);
      }
    }
  }
};

searchForAdders(webhookPayload.payload);
