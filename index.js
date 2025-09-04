/**
 * ENERFLO → QUICKBASE WEBHOOK SERVER
 * 
 * Bulletproof webhook integration that maps Enerflo deal submissions
 * to QuickBase CRM records with perfect field mapping.
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { mapWebhookToQuickBase } = require('./field-mapping');
const EnerfloAPIEnrichment = require('./enerflo-api-enrichment');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Environment variables
const QB_REALM = process.env.QB_REALM;
const QB_TABLE_ID = process.env.QB_TABLE_ID;
const QB_USER_TOKEN = process.env.QB_USER_TOKEN;
const ENERFLO_API_KEY = process.env.ENERFLO_API_KEY;

// Initialize Enerflo API enrichment
const enerfloEnrichment = new EnerfloAPIEnrichment(ENERFLO_API_KEY);

// Request timing middleware
app.use((req, res, next) => {
  req.timestamp = Date.now();
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    health: {
      overall: 100,
      webhook: 100,
      quickbase: QB_REALM && QB_TABLE_ID && QB_USER_TOKEN ? 100 : 0,
      enerflo: 100
    },
    environment: {
      qbRealm: QB_REALM ? 'configured' : 'missing',
      qbTableId: QB_TABLE_ID ? 'configured' : 'missing',
      qbUserToken: QB_USER_TOKEN ? 'configured' : 'missing',
      enerfloApiKey: ENERFLO_API_KEY ? 'configured' : 'missing'
    }
  });
});

// Main webhook endpoint
app.post('/webhook/enerflo', async (req, res) => {
  const requestId = `POST-/webhook/enerflo-${Date.now()}`;
  console.log(`[${requestId}] Webhook received: ${req.body.event}`);
  
  try {
    // Validate webhook payload
    if (!req.body || !req.body.event || !req.body.payload) {
      throw new Error('Invalid webhook payload - missing event or payload');
    }
    
    if (req.body.event !== 'deal.projectSubmitted') {
      throw new Error(`Unsupported event type: ${req.body.event}`);
    }
    
    const { deal, customer, proposal } = req.body.payload;
    
    if (!deal || !deal.id) {
      throw new Error('Webhook validation failed: Deal ID is missing');
    }
    
    if (!customer || !customer.id) {
      throw new Error('Webhook validation failed: Customer ID is missing');
    }
    
    if (!proposal || !proposal.id) {
      throw new Error('Webhook validation failed: Proposal ID is missing');
    }
    
    console.log(`[${requestId}] Processing deal: ${deal.id} for customer: ${customer.id}`);
    
    // Enrich webhook data with Enerflo API (as recommended by Enerflo docs)
    let enrichedPayload = req.body;
    let enrichedFields = {};
    
    if (ENERFLO_API_KEY) {
      try {
        console.log(`[${requestId}] Enriching webhook data with Enerflo API...`);
        enrichedPayload = await enerfloEnrichment.enrichWebhookData(req.body);
        enrichedFields = enerfloEnrichment.extractEnrichedFields(enrichedPayload);
        console.log(`[${requestId}] Enriched with ${Object.keys(enrichedFields).length} additional fields`);
      } catch (error) {
        console.warn(`[${requestId}] API enrichment failed, continuing with webhook data only:`, error.message);
      }
    } else {
      console.log(`[${requestId}] No Enerflo API key provided, skipping enrichment`);
    }
    
    // Map webhook data to QuickBase fields
    const quickbaseData = mapWebhookToQuickBase(enrichedPayload);
    
    // Add enriched fields
    Object.assign(quickbaseData, enrichedFields);
    
    console.log(`[${requestId}] Mapped ${Object.keys(quickbaseData).length} fields to QuickBase`);
    
    // Create/update QuickBase record
    const quickbaseRecordId = await upsertQuickBaseRecord(deal.id, quickbaseData, requestId);
    
    const processingTime = Date.now() - req.timestamp;
    console.log(`[${requestId}] Successfully processed in ${processingTime}ms`);
    
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      dealId: deal.id,
      customerId: customer.id,
      proposalId: proposal.id,
      quickbaseRecordId,
      fieldsMapped: Object.keys(quickbaseData).length,
      processingTime: `${processingTime}ms`,
      requestId
    });
    
  } catch (error) {
    const processingTime = Date.now() - req.timestamp;
    console.error(`[${requestId}] Webhook processing failed:`, error.message);
    console.error(`[${requestId}] Error details:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
      message: error.message,
      processingTime: `${processingTime}ms`,
      requestId
    });
  }
});

// Upsert QuickBase record (create new or update existing)
async function upsertQuickBaseRecord(enerfloDealId, fields, requestId) {
  if (!QB_REALM || !QB_TABLE_ID || !QB_USER_TOKEN) {
    throw new Error('QuickBase API credentials are not configured. Please set QB_REALM, QB_TABLE_ID, and QB_USER_TOKEN environment variables.');
  }
  
  const url = `https://api.quickbase.com/v1/records`;
  const headers = {
    'Authorization': `QB-USER-TOKEN ${QB_USER_TOKEN}`,
    'QB-Realm-Hostname': QB_REALM,
    'Content-Type': 'application/json',
    'User-Agent': 'Enerflo-QuickBase-Webhook/1.0.0'
  };
  
  try {
    // First, try to find an existing record by Enerflo Deal ID (Field ID 6)
    console.log(`[${requestId}] Searching for existing record with Deal ID: ${enerfloDealId}`);
    const queryUrl = `https://api.quickbase.com/v1/records/query`;
    const queryPayload = {
      from: QB_TABLE_ID,
      where: `{6.EX.'${enerfloDealId}'}`,
      select: [3] // Field ID 3 is Record ID#
    };
    const queryResponse = await axios.post(queryUrl, queryPayload, { 
      headers: { 
        'Authorization': `QB-USER-TOKEN ${QB_USER_TOKEN}`,
        'QB-Realm-Hostname': QB_REALM,
        'Content-Type': 'application/json',
        'User-Agent': 'Enerflo-QuickBase-Webhook/1.0.0'
      } 
    });
    
    let existingRecordId = null;
    if (queryResponse.data.records && queryResponse.data.records.length > 0) {
      existingRecordId = queryResponse.data.records[0]['3'].value; // Field ID 3 is Record ID#
      console.log(`[${requestId}] Found existing record: ${existingRecordId}`);
    }
    
    if (existingRecordId) {
      // Update existing record
      console.log(`[${requestId}] Updating existing QuickBase record: ${existingRecordId}`);
      const updatePayload = {
        to: QB_TABLE_ID,
        data: [{
          3: existingRecordId, // Record ID#
          ...fields
        }]
      };
      
      const updateResponse = await axios.post(url, updatePayload, { headers });
      
      if (updateResponse.data.updatedRecordIds && updateResponse.data.updatedRecordIds.length > 0) {
        console.log(`[${requestId}] Successfully updated QuickBase record: ${updateResponse.data.updatedRecordIds[0]}`);
        return updateResponse.data.updatedRecordIds[0];
      } else {
        throw new Error('Failed to update QuickBase record - no updated record IDs returned');
      }
    } else {
      // Create new record
      console.log(`[${requestId}] Creating new QuickBase record`);
      const createPayload = {
        to: QB_TABLE_ID,
        data: [fields]
      };
      
      const createResponse = await axios.post(url, createPayload, { headers });
      
      console.log(`[${requestId}] QuickBase create response:`, JSON.stringify(createResponse.data, null, 2));
      
      if (createResponse.data.createdRecordIds && createResponse.data.createdRecordIds.length > 0) {
        console.log(`[${requestId}] Successfully created QuickBase record: ${createResponse.data.createdRecordIds[0]}`);
        return createResponse.data.createdRecordIds[0];
      } else {
        console.error(`[${requestId}] QuickBase create failed. Full response:`, JSON.stringify(createResponse.data, null, 2));
        throw new Error('Failed to create QuickBase record - no created record IDs returned');
      }
    }
  } catch (error) {
    console.error(`[${requestId}] QuickBase API error:`, error.response?.data || error.message);
    console.error(`[${requestId}] Full error details:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 400) {
      throw new Error(`QuickBase validation error: ${JSON.stringify(error.response.data)}`);
    } else if (error.response?.status === 401) {
      throw new Error('QuickBase authentication failed - check your QB_USER_TOKEN');
    } else if (error.response?.status === 403) {
      throw new Error('QuickBase access denied - check your table permissions');
    } else if (error.response?.status === 404) {
      throw new Error('QuickBase table not found - check your QB_TABLE_ID');
    } else {
      throw new Error(`QuickBase API error: ${error.message}`);
    }
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Enerflo-QuickBase Webhook Server v1.0.0 running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook/enerflo`);
  console.log(`🔧 Environment: ${QB_REALM ? 'QuickBase configured' : 'QuickBase NOT configured'}`);
});

module.exports = app;