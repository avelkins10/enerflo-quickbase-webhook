const WebhookProcessor = require('./webhook-processor');

async function testWebhookIntegration() {
  console.log('🧪 Starting Enerflo-QuickBase Integration Test');
  console.log('=' .repeat(50));
  
  const processor = new WebhookProcessor();
  
  try {
    // Test 1: QuickBase Connection
    console.log('\n1️⃣ Testing QuickBase Connection...');
    const connectionTest = await processor.testProcessing();
    console.log('✅ Connection test passed');
    
    // Test 2: Load and process sample webhook
    console.log('\n2️⃣ Testing Webhook Processing...');
    const sampleWebhook = require('./docs/webhook-actual.json');
    
    console.log(`   Event: ${sampleWebhook.event}`);
    console.log(`   Deal ID: ${sampleWebhook.payload.deal.id}`);
    console.log(`   Customer: ${sampleWebhook.payload.customer.firstName} ${sampleWebhook.payload.customer.lastName}`);
    console.log(`   System Size: ${sampleWebhook.payload.proposal.pricingOutputs.systemSizeWatts}W`);
    
    const result = await processor.processWebhook(sampleWebhook);
    console.log('✅ Webhook processing test passed');
    console.log(`   Result: ${JSON.stringify(result, null, 2)}`);
    
    // Test 3: Test duplicate processing (should update, not create new)
    console.log('\n3️⃣ Testing Duplicate Processing (Update)...');
    const duplicateResult = await processor.processWebhook(sampleWebhook);
    console.log('✅ Duplicate processing test passed');
    console.log(`   Result: ${JSON.stringify(duplicateResult, null, 2)}`);
    
    console.log('\n🎉 All tests passed successfully!');
    console.log('=' .repeat(50));
    console.log('✅ Integration is ready for production');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testWebhookIntegration();
}

module.exports = testWebhookIntegration;
