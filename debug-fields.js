const EnerfloAPIEnrichment = require('./enerflo-api-enrichment.js');
const fs = require('fs');

// Load the webhook payload
const webhookPayload = JSON.parse(fs.readFileSync('./docs/webhook-actual.json', 'utf8'));

// Test the enrichment
const enrichment = new EnerfloAPIEnrichment('13686046e8dc420946.70185370');

async function test() {
  try {
    console.log('🔍 Debugging Welcome Call and Design Image URL fields...');
    const enriched = await enrichment.enrichWebhookData(webhookPayload);
    const surveyId = enriched.fullInstall?.survey_id;
    const enrichedFields = enrichment.extractEnrichedFields(enriched, surveyId);
    
    console.log('\n📊 Welcome Call Fields Debug:');
    console.log('  Survey ID:', surveyId);
    console.log('  CallPilot data exists:', !!enriched.callPilot);
    console.log('  Field 171 (Welcome Call ID):', enrichedFields[171]?.value || 'MISSING');
    console.log('  Field 172 (Welcome Call Date):', enrichedFields[172]?.value || 'MISSING');
    console.log('  Field 174 (Recording URL):', enrichedFields[174]?.value || 'MISSING');
    console.log('  Field 177 (Agent):', enrichedFields[177]?.value || 'MISSING');
    
    console.log('\n📊 Design Image URL Debug:');
    console.log('  Field 220 (Design Image URL):', enrichedFields[220]?.value || 'MISSING');
    if (enrichedFields[220]) {
      console.log('  ✅ Design Image URL found:', enrichedFields[220].value);
    }
    
    console.log('\n🔍 Raw CallPilot data structure:');
    if (enriched.callPilot) {
      console.log('  Call completed:', enriched.callPilot.call_completed);
      console.log('  Video URL:', enriched.callPilot.video_url);
      console.log('  Agent name:', enriched.callPilot.enerflo_answers?.agent_name);
    } else {
      console.log('  ❌ No CallPilot data found');
    }
    
    console.log('\n🔍 All enriched fields:');
    Object.keys(enrichedFields).forEach(fieldId => {
      console.log(`  Field ${fieldId}:`, enrichedFields[fieldId].value);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
