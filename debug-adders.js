const webhookPayload = require('./docs/webhook-actual.json');

console.log('=== ADDER ANALYSIS ===\n');

// Extract pricing data
const pricing = webhookPayload.payload.proposal.pricingOutputs.deal;

console.log('VALUE ADDERS:');
if (pricing.calculatedValueAdders) {
  pricing.calculatedValueAdders.forEach((adder, index) => {
    console.log(`Adder ${index + 1}:`);
    console.log(`  Name: ${adder.displayName}`);
    console.log(`  Amount: ${adder.amount}`);
    console.log(`  PPW: ${adder.ppw}`);
    console.log(`  Category: ${adder.category}`);
    console.log(`  Quantity: ${adder.quantity || 1}`);
    console.log('');
  });
}

console.log('SYSTEM ADDERS:');
if (pricing.calculatedSystemAdders) {
  pricing.calculatedSystemAdders.forEach((adder, index) => {
    console.log(`System Adder ${index + 1}:`);
    console.log(`  Name: ${adder.displayName}`);
    console.log(`  Amount: ${adder.amount}`);
    console.log(`  PPW: ${adder.ppw}`);
    console.log(`  Category: ${adder.category}`);
    console.log(`  Quantity: ${adder.quantity || 1}`);
    console.log('');
  });
}

console.log('ALL ADDERS COMBINED:');
const allAdders = [
  ...(pricing.calculatedValueAdders || []),
  ...(pricing.calculatedSystemAdders || [])
];

allAdders.slice(0, 5).forEach((adder, index) => {
  console.log(`Combined Adder ${index + 1}:`);
  console.log(`  Name: ${adder.displayName}`);
  console.log(`  Amount: ${adder.amount}`);
  console.log(`  PPW: ${adder.ppw}`);
  console.log(`  Category: ${adder.category}`);
  console.log(`  Quantity: ${adder.quantity || 1}`);
  console.log('');
});
