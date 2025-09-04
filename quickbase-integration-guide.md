# QuickBase Integration Implementation Guide

## Overview
This guide shows how to implement the Enerflo webhook to QuickBase integration using the [QuickBase API](https://helpv2.quickbase.com/hc/en-us/categories/4408105460116-API-Guide).

## Prerequisites
1. QuickBase API access enabled
2. User token for authentication
3. App ID (DBID) for your QuickBase application
4. Field IDs mapped (already completed in `enerflo-to-quickbase-mapping.csv`)

## Authentication Setup

### 1. Get User Token
```bash
# Get user token from QuickBase
curl -X POST "https://api.quickbase.com/v1/auth" \
  -H "QB-Realm-Hostname: your-realm.quickbase.com" \
  -H "Content-Type: application/json" \
  -d '{
    "userToken": "your-user-token"
  }'
```

### 2. Set Up Headers
```javascript
const headers = {
  'QB-Realm-Hostname': 'your-realm.quickbase.com',
  'Authorization': 'QB-USER-TOKEN your-user-token',
  'Content-Type': 'application/json'
};
```

## Core Integration Functions

### 1. Add/Update Record Function
```javascript
async function addOrUpdateRecord(recordData) {
  const url = `https://api.quickbase.com/v1/records`;
  
  const payload = {
    to: 'your-dbid', // Your QuickBase App ID
    data: recordData
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error adding record:', error);
    throw error;
  }
}
```

### 2. Query Existing Record
```javascript
async function findExistingRecord(dealId) {
  const url = `https://api.quickbase.com/v1/records/query`;
  
  const payload = {
    from: 'your-dbid',
    where: `{6.EX.'${dealId}'}`, // Field 6 = Enerflo Deal ID
    select: [3] // Field 3 = Record ID#
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    return result.data.length > 0 ? result.data[0][3].value : null;
  } catch (error) {
    console.error('Error querying record:', error);
    return null;
  }
}
```

### 3. Update Existing Record
```javascript
async function updateRecord(recordId, recordData) {
  const url = `https://api.quickbase.com/v1/records`;
  
  const payload = {
    to: 'your-dbid',
    data: [{
      [3]: { value: recordId }, // Field 3 = Record ID#
      ...recordData
    }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error updating record:', error);
    throw error;
  }
}
```

## Webhook Processing Implementation

### Main Webhook Handler
```javascript
async function processEnerfloWebhook(webhookPayload) {
  try {
    // Extract deal ID
    const dealId = webhookPayload.payload.deal.id;
    
    // Check if record exists
    const existingRecordId = await findExistingRecord(dealId);
    
    // Transform webhook data to QuickBase format
    const recordData = transformWebhookToQuickBase(webhookPayload);
    
    if (existingRecordId) {
      // Update existing record
      await updateRecord(existingRecordId, recordData);
      console.log(`Updated record ${existingRecordId} for deal ${dealId}`);
    } else {
      // Create new record
      const result = await addOrUpdateRecord(recordData);
      console.log(`Created new record for deal ${dealId}`);
    }
    
    return { success: true, dealId };
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw error;
  }
}
```

### Data Transformation Function
```javascript
function transformWebhookToQuickBase(webhook) {
  const payload = webhook.payload;
  const deal = payload.deal;
  const customer = payload.customer;
  const proposal = payload.proposal;
  
  // Map fields according to our mapping table
  const recordData = {
    // Basic Deal Info
    6: { value: deal.id }, // Enerflo Deal ID
    64: { value: customer.id }, // Customer ID
    16: { value: customer.firstName }, // Customer First Name
    17: { value: customer.lastName }, // Customer Last Name
    7: { value: `${customer.firstName} ${customer.lastName}` }, // Customer Full Name
    65: { value: payload.salesRep.id }, // Sales Rep ID
    68: { value: payload.initiatedBy }, // Initiated By User ID
    69: { value: payload.targetOrg }, // Target Organization ID
    71: { value: webhook.event }, // Event Type
    
    // Proposal Info
    72: { value: proposal.id }, // Proposal ID
    19: { value: proposal.pricingOutputs.systemSizeWatts }, // System Size Watts
    14: { value: proposal.pricingOutputs.systemSizeWatts / 1000 }, // System Size kW
    21: { value: proposal.pricingOutputs.grossCost }, // Gross Cost
    33: { value: proposal.pricingOutputs.baseCost }, // Base Cost
    34: { value: proposal.pricingOutputs.netCost }, // Net Cost After ITC
    35: { value: proposal.pricingOutputs.basePPW }, // Base PPW
    36: { value: proposal.pricingOutputs.grossPPW }, // Gross PPW
    93: { value: proposal.pricingOutputs.netPPW }, // Net PPW
    
    // System Design
    15: { value: calculateTotalPanels(proposal.design.arrays) }, // Total Panel Count
    20: { value: proposal.design.arrays[0]?.module.model }, // Panel Model
    23: { value: proposal.design.arrays[0]?.module.manufacturer }, // Panel Manufacturer
    24: { value: proposal.design.arrays[0]?.module.capacity }, // Panel Watts Each
    26: { value: proposal.design.inverters[0]?.manufacturer }, // Inverter Manufacturer
    27: { value: proposal.design.inverters[0]?.model }, // Inverter Model
    28: { value: proposal.design.inverters[0]?.count }, // Inverter Count
    30: { value: proposal.design.roofMaterial }, // Roof Material
    31: { value: proposal.design.mountingType }, // Mounting Type
    32: { value: proposal.design.weightedTsrf }, // Weighted TSRF
    53: { value: proposal.design.firstYearProduction }, // Annual Production kWh
    54: { value: proposal.design.offset }, // System Offset Percent
    
    // Address Info
    73: { value: proposal.pricingOutputs.deal.projectAddress.line1 }, // Address Line 1
    74: { value: proposal.pricingOutputs.deal.projectAddress.city }, // Address City
    75: { value: proposal.pricingOutputs.deal.projectAddress.state }, // Address State
    76: { value: proposal.pricingOutputs.deal.projectAddress.postalCode }, // Address Zip
    18: { value: proposal.pricingOutputs.deal.projectAddress.fullAddress }, // Address Full
    77: { value: proposal.pricingOutputs.deal.projectAddress.lat }, // Address Latitude
    78: { value: proposal.pricingOutputs.deal.projectAddress.lng }, // Address Longitude
    
    // Utility Info
    55: { value: proposal.design.utility.name }, // Utility Company Name
    125: { value: proposal.design.utility.id }, // Utility Company ID
    126: { value: proposal.design.utility.genabilityId }, // Genability Utility ID
    130: { value: proposal.design.consumptionProfile.rate }, // Utility Rate per kWh
    131: { value: proposal.design.consumptionProfile.postSolarRate }, // Post Solar Rate
    132: { value: proposal.design.consumptionProfile.annualBill }, // Annual Bill Amount
    133: { value: proposal.design.consumptionProfile.averageMonthlyConsumption }, // Average Monthly Usage
    57: { value: proposal.design.consumptionProfile.averageMonthlyBill }, // Average Monthly Bill
    56: { value: proposal.design.consumptionProfile.annualConsumption }, // Annual Consumption kWh
    134: { value: proposal.design.consumptionProfile.buildingArea }, // Building Area sqft
    
    // Deal Status Flags
    41: { value: deal.state.hasSignedContract }, // Has Signed Contract
    42: { value: deal.state.hasDesign }, // Has Design
    44: { value: deal.state.financingStatus === 'approved' }, // Financing Approved
    45: { value: deal.state['site-survey']['schedule-site-survey'] }, // Site Survey Scheduled
    46: { value: deal.state['additional-work-substage']['is-there-additional-work'] }, // Additional Work Needed
    153: { value: deal.state.hasCreatedProposal }, // Has Created Proposal
    154: { value: deal.state.hasApprovedContract }, // Has Approved Contract
    155: { value: deal.state.hasSubmittedProject }, // Has Submitted Project
    156: { value: deal.state.hasGeneratedContract }, // Has Generated Contract
    157: { value: deal.state.hasSubmittedFinancingApplication }, // Has Submitted Financing
    158: { value: deal.state.hasSignedFinancingDocs }, // Has Signed Financing Docs
    
    // Additional Work
    48: { value: deal.state['additional-work-substage']['tree-removal-contractor'] }, // Tree Removal Contractor
    47: { value: findAdderAmount(proposal.pricingOutputs.adderPricing.valueAdders, 'Tree Removal') }, // Tree Removal Cost
    109: { value: deal.state['additional-work-substage']['tree-trimming-contractor'] }, // Tree Trimming Contractor
    108: { value: findAdderAmount(proposal.pricingOutputs.adderPricing.valueAdders, 'Tree Trimming') }, // Tree Trimming Cost
    49: { value: deal.state['additional-work-substage']['how-many-optional-electrical-upgrades-are-needed'] }, // Electrical Upgrades Count
    50: { value: findAdderAmount(proposal.pricingOutputs.adderPricing.systemAdders, 'Electrical Upgrade If Needed') }, // Electrical Upgrades Total
    
    // Finance Info
    135: { value: proposal.pricingOutputs.financeProduct.financeMethodName }, // Finance Type
    136: { value: proposal.pricingOutputs.financeProduct.name }, // Finance Product Name
    137: { value: proposal.pricingOutputs.financeProduct.id }, // Finance Product ID
    139: { value: deal.state.financingStatus }, // Financing Status
    140: { value: proposal.pricingOutputs.financeProduct.termMonths }, // Loan Term Months
    142: { value: deal.state['lender-welcome-call']['how-is-the-customer-making-their-down-payment'] }, // Down Payment Method
    
    // JSON Fields for Complex Data
    58: { value: JSON.stringify(proposal.design.arrays) }, // Arrays JSON
    59: { value: JSON.stringify(proposal.pricingOutputs.adderPricing.valueAdders) }, // Value Adder JSON
    60: { value: JSON.stringify(proposal.pricingOutputs.adderPricing.systemAdders) }, // System Adders JSON
    61: { value: JSON.stringify(deal.files) }, // All Files JSON
    96: { value: JSON.stringify(proposal.pricingOutputs.rebates) }, // Rebates JSON
    62: { value: deal.state['notes-comments'] }, // Sales Notes
    63: { value: deal.state['system-offset']['layout-preferences'] }, // Layout Preferences
    124: { value: JSON.stringify(deal.state['additional-work-substage']['additional-work']) }, // Additional Work Types
    123: { value: JSON.stringify(proposal.design.consumptionProfile.consumption) }, // Monthly Consumption
    
    // File URLs (find specific files by source)
    22: { value: findFileUrl(deal.files, 'signedContractFiles') }, // Contract Url
    144: { value: findFileUrl(deal.files, 'signedContractFiles') }, // Installation Agreement URL
    145: { value: findFileUrl(deal.files, 'full-utility-bill') }, // Utility Bill URL
    147: { value: findFileUrl(deal.files, 'customers-photo-id') }, // Customer ID Photo URL
    148: { value: findFileUrl(deal.files, 'proof-of-payment') }, // Proof of Payment URL
    149: { value: findFileUrl(deal.files, 'tree-quote') }, // Tree Quote URL
    150: { value: findFileUrl(deal.files, 'picture-of-site-of-tree-removal') }, // Tree Site Photo URL
    
    // Timestamps
    186: { value: new Date().toISOString() }, // Created At
    187: { value: new Date().toISOString() } // Updated At
  };
  
  return recordData;
}
```

### Helper Functions
```javascript
function calculateTotalPanels(arrays) {
  return arrays.reduce((total, array) => total + array.moduleCount, 0);
}

function findAdderAmount(adders, name) {
  const adder = adders.find(a => a.displayName === name);
  return adder ? adder.amount : 0;
}

function findFileUrl(files, source) {
  const file = files.find(f => f.source === source);
  return file ? file.url : '';
}

function findFileByName(files, name) {
  const file = files.find(f => f.name === name);
  return file ? file.url : '';
}
```

## Error Handling and Logging

### Error Handling
```javascript
async function handleWebhookError(error, webhookData) {
  console.error('Webhook processing error:', {
    error: error.message,
    dealId: webhookData?.payload?.deal?.id,
    timestamp: new Date().toISOString(),
    stack: error.stack
  });
  
  // Log to external service if needed
  // await logToExternalService(error, webhookData);
  
  throw error;
}
```

### Retry Logic
```javascript
async function processWithRetry(webhookData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await processEnerfloWebhook(webhookData);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}
```

## Complete Webhook Endpoint

### Express.js Example
```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook/enerflo', async (req, res) => {
  try {
    const result = await processWithRetry(req.body);
    res.status(200).json({ success: true, result });
  } catch (error) {
    await handleWebhookError(error, req.body);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

## Testing and Validation

### Test Function
```javascript
async function testWebhookIntegration() {
  // Load your sample webhook data
  const sampleWebhook = require('./docs/webhook-actual.json');
  
  try {
    const result = await processEnerfloWebhook(sampleWebhook);
    console.log('Test successful:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}
```

## Deployment Considerations

1. **Environment Variables**: Store QuickBase credentials securely
2. **Rate Limiting**: Implement rate limiting for QuickBase API calls
3. **Monitoring**: Set up monitoring for webhook processing success/failure
4. **Backup**: Implement backup/retry mechanisms for failed webhooks
5. **Security**: Validate webhook signatures if Enerflo provides them

## Next Steps

1. Set up your QuickBase API credentials
2. Test with the sample webhook data
3. Deploy the webhook endpoint
4. Configure Enerflo to send webhooks to your endpoint
5. Monitor and iterate based on real data

This implementation provides a complete foundation for integrating Enerflo webhooks with your QuickBase application using the official QuickBase API.
