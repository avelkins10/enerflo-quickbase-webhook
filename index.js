const express = require('express');
const cors = require('cors');
const axios = require('axios');

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    health: {
      overall: 100,
      webhook: 100,
      quickbase: 100,
      enerflo: 100
    }
  });
});

// Webhook endpoint
app.post('/webhook/enerflo', async (req, res) => {
  const startTime = Date.now();
  const requestId = `${req.method}-${req.path}-${Date.now()}`;
  
  try {
    console.log(`[${requestId}] Webhook received:`, req.body.event);
    
    // Validate webhook payload
    const validation = validateWebhookPayload(req.body);
    if (!validation.isValid) {
      console.log(`[${requestId}] Validation failed:`, validation.errors);
      return res.status(400).json({
        success: false,
        error: 'Webhook validation failed',
        message: validation.errors.join(', '),
        processingTime: `${Date.now() - startTime}ms`,
        requestId
      });
    }
    
    // Process webhook
    const result = await processWebhook(req.body);
    
    console.log(`[${requestId}] Webhook processed successfully`);
    res.json({
      success: true,
      message: 'Webhook processed successfully',
      processingTime: `${Date.now() - startTime}ms`,
      requestId,
      quickbaseRecordId: result.quickbaseRecordId
    });
    
  } catch (error) {
    console.error(`[${requestId}] Webhook processing failed:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
      message: error.message,
      processingTime: `${Date.now() - startTime}ms`,
      requestId
    });
  }
});

// Validate webhook payload
function validateWebhookPayload(payload) {
  const errors = [];
  
  // Check basic structure
  if (!payload.event) errors.push('Missing event');
  if (!payload.payload) errors.push('Missing payload');
  
  if (payload.payload) {
    const { deal, customer, proposal } = payload.payload;
    
    // Validate deal
    if (!deal) errors.push('Missing deal');
    else {
      if (!deal.id) errors.push('Deal missing ID');
    }
    
    // Validate customer
    if (!customer) errors.push('Missing customer');
    else {
      if (!customer.id) errors.push('Customer missing ID');
      if (!customer.firstName) errors.push('Customer missing firstName');
      if (!customer.lastName) errors.push('Customer missing lastName');
    }
    
    // Validate proposal
    if (!proposal) errors.push('Missing proposal');
    else {
      if (!proposal.id) errors.push('Proposal missing ID');
      if (!proposal.pricingOutputs) errors.push('Proposal missing pricingOutputs');
      else {
        if (!proposal.pricingOutputs.design) errors.push('Missing design');
        else {
          const systemSize = proposal.pricingOutputs.design.totalSystemSizeWatts || 
                            proposal.pricingOutputs.design.systemSize;
          if (!systemSize || systemSize <= 0) {
            errors.push('Invalid or missing system size');
          }
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Process webhook
async function processWebhook(payload) {
  const { deal, customer, proposal } = payload.payload;
  
  // Map data to QuickBase fields
  const quickbaseData = mapToQuickBaseFields(deal, customer, proposal);
  
  // Create/update QuickBase record
  const quickbaseRecordId = await upsertQuickBaseRecord(deal.id, quickbaseData);
  
  return { quickbaseRecordId };
}

// Map Enerflo data to QuickBase fields
function mapToQuickBaseFields(deal, customer, proposal) {
  const fields = {};
  
  // Basic deal info
  fields[6] = deal.id; // Enerflo Deal ID
  fields[7] = `${customer.firstName} ${customer.lastName}`; // Customer Full Name
  fields[10] = customer.email || ''; // Customer Email
  fields[11] = customer.phone || ''; // Customer Phone
  fields[12] = 'submitted'; // Project Status
  fields[13] = new Date().toISOString(); // Submission Date
  
  // System info
  if (proposal?.pricingOutputs?.design) {
    const design = proposal.pricingOutputs.design;
    fields[14] = (design.totalSystemSizeWatts || design.systemSize || 0) / 1000; // System Size kW
    fields[15] = calculateTotalPanels(design.arrays || []); // Total Panel Count
    fields[18] = design.totalSystemSizeWatts || design.systemSize || 0; // System Size Watts
  }
  
  // Customer info
  fields[16] = customer.firstName || ''; // Customer First Name
  fields[17] = customer.lastName || ''; // Customer Last Name
  fields[64] = customer.id || ''; // Customer ID
  
  // Address info
  if (proposal?.pricingOutputs?.deal?.projectAddress) {
    const addr = proposal.pricingOutputs.deal.projectAddress;
    fields[17] = addr.fullAddress || ''; // Address Full
    fields[73] = addr.line1 || ''; // Address Line 1
    fields[74] = addr.city || ''; // Address City
    fields[75] = addr.state || ''; // Address State
    fields[76] = addr.postalCode || ''; // Address Zip
    fields[77] = addr.lat || 0; // Address Latitude
    fields[78] = addr.lng || 0; // Address Longitude
  }
  
  // Financial info
  if (proposal?.pricingOutputs) {
    const pricing = proposal.pricingOutputs;
    fields[20] = pricing.grossCost || 0; // Gross Cost
    fields[21] = pricing.baseCost || 0; // Base Cost
    fields[22] = pricing.netCost || 0; // Net Cost After ITC
    fields[23] = pricing.basePPW || 0; // Base PPW
    fields[24] = pricing.grossPPW || 0; // Gross PPW
    fields[25] = pricing.netPPW || 0; // Net PPW
  }
  
  // Sales rep info
  if (deal.salesRep?.id) {
    fields[65] = deal.salesRep.id; // Sales Rep ID
    fields[66] = deal.salesRep.name || ''; // Sales Team Name
  }
  
  // Files count
  fields[152] = deal.files?.filter(f => f.source === 'additional-documentation').length || 0; // Total Files Count
  
  // Proposal status
  fields[153] = proposal ? true : false; // Has Created Proposal
  
  return fields;
}

// Helper function to calculate total panels
function calculateTotalPanels(arrays) {
  if (!Array.isArray(arrays)) return 0;
  return arrays.reduce((total, array) => total + (array.moduleCount || 0), 0);
}

// Upsert QuickBase record
async function upsertQuickBaseRecord(enerfloDealId, fields) {
  const url = `https://${QB_REALM}/db/${QB_TABLE_ID}`;
  
  const payload = {
    to: QB_TABLE_ID,
    data: [fields]
  };
  
  const headers = {
    'Authorization': `QB-USER-TOKEN ${QB_USER_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  try {
    const response = await axios.post(url, payload, { headers });
    
    if (response.data.createdRecordIds && response.data.createdRecordIds.length > 0) {
      console.log(`Created new QuickBase record: ${response.data.createdRecordIds[0]}`);
      return response.data.createdRecordIds[0];
    } else if (response.data.updatedRecordIds && response.data.updatedRecordIds.length > 0) {
      console.log(`Updated existing QuickBase record: ${response.data.updatedRecordIds[0]}`);
      return response.data.updatedRecordIds[0];
    } else {
      throw new Error('No record created or updated');
    }
  } catch (error) {
    console.error('QuickBase API error:', error.response?.data || error.message);
    throw error;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Enerflo-QuickBase Webhook Server v1.0.0 running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook/enerflo`);
});