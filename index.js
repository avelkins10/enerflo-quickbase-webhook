const express = require('express');
const https = require('https');
const app = express();
app.use(express.json());

// QuickBase Configuration
const QB_CONFIG = {
  realm: 'kin.quickbase.com',
  userToken: 'b6um6p_p3bs_0_bmrupwzbc82cdnb44a7pirtbxif',
  tableId: 'br9kwm8na'
};

// Helper function to safely access nested properties
function get(obj, path, defaultValue = '') {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return defaultValue;
    }
  }
  return result !== null && result !== undefined ? result : defaultValue;
}

// Format date for QuickBase
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

// Format currency
function formatCurrency(value) {
  if (!value) return 0;
  return parseFloat(String(value).replace(/[$,]/g, ''));
}

// Main mapping function with CORRECT QuickBase field IDs
function mapEnerflToQuickBase(webhookData) {
  const payload = get(webhookData, 'payload', {});
  const deal = get(payload, 'deal', {});
  const customer = get(payload, 'customer', {});
  const proposal = get(payload, 'proposal', {});
  const pricingOutputs = get(proposal, 'pricingOutputs', {});
  const design = get(pricingOutputs, 'design', {});
  const adderPricing = get(pricingOutputs, 'adderPricing', {});
  
  // Parse arrays for panel count
  const arrays = get(design, 'arrays', []);
  const totalPanels = arrays.reduce((sum, arr) => sum + (arr.moduleCount || 0), 0);
  
  // Parse adders
  const valueAdders = get(adderPricing, 'withDealerFees.calculatedValueAdders', []) || 
                      get(adderPricing, 'valueAdders', []) || [];
  const systemAdders = get(adderPricing, 'withDealerFees.calculatedSystemAdders', []) || 
                       get(adderPricing, 'systemAdders', []) || [];
  const allAdders = [...valueAdders, ...systemAdders];
  
  // Calculate total adders cost
  let totalAddersCost = 0;
  allAdders.forEach(adder => {
    totalAddersCost += formatCurrency(adder.amount || 0);
  });
  
  // Build QuickBase record with CORRECT field mappings
  const record = {
    // Core Fields (verified from QuickBase)
    "6": { value: String(get(deal, 'id', '')) }, // Enerflo Deal ID
    "7": { value: `${get(customer, 'firstName', '')} ${get(customer, 'lastName', '')}`.trim() }, // Customer Full Name
    "10": { value: get(customer, 'email', '') }, // Customer Email  
    "11": { value: String(get(customer, 'phone', '')).replace(/\D/g, '') }, // Customer Phone
    
    // Dates
    "13": { value: formatDate(new Date().toISOString()) }, // Submission Date
    
    // Customer Name Fields
    "16": { value: get(customer, 'firstName', '') }, // Customer First Name
    "17": { value: get(customer, 'lastName', '') }, // Customer Last Name
    
    // Address fields (from design.deal.projectAddress)
    "18": { value: get(design, 'deal.projectAddress.fullAddress', '') }, // Address Full
    "73": { value: get(design, 'deal.projectAddress.line1', '') }, // Address Line 1
    "74": { value: get(design, 'deal.projectAddress.city', '') }, // Address City
    "75": { value: get(design, 'deal.projectAddress.state', '') }, // Address State
    "76": { value: String(get(design, 'deal.projectAddress.postalCode', '')) }, // Address Zip
    
    // System Specs
    "14": { value: parseFloat(((get(design, 'totalSystemSizeWatts', 0) || get(design, 'cumulativeSystemSizeWatts', 0)) / 1000).toFixed(2)) }, // System Size kW
    "15": { value: totalPanels }, // Total Panel Count
    "19": { value: get(design, 'totalSystemSizeWatts', 0) || get(design, 'cumulativeSystemSizeWatts', 0) }, // System Size Watts
    "20": { value: get(arrays, '0.module.model', '') }, // Panel Model
    "23": { value: get(arrays, '0.module.manufacturer', '') }, // Panel Manufacturer
    "24": { value: get(arrays, '0.module.capacity', 0) }, // Panel Watts Each
    "25": { value: get(arrays, '0.module.name', '') }, // Panel Name
    
    // Inverter Info
    "26": { value: get(design, 'inverters.0.manufacturer', '') }, // Inverter Manufacturer
    "27": { value: get(design, 'inverters.0.model', '') }, // Inverter Model
    "28": { value: get(design, 'inverterCount', 0) }, // Inverter Count
    
    // Financial
    "21": { value: formatCurrency(get(pricingOutputs, 'grossCost', 0)) }, // Gross Cost
    "26": { value: formatCurrency(get(pricingOutputs, 'baseCost', 0)) }, // Base Cost
    "27": { value: formatCurrency(get(pricingOutputs, 'netCost', 0)) }, // Net Cost After ITC
    "28": { value: get(pricingOutputs, 'basePPW', 0) }, // Base PPW
    "36": { value: get(pricingOutputs, 'grossPPW', 0) }, // Gross PPW
    "93": { value: get(pricingOutputs, 'netPPW', 0) }, // Net PPW
    "30": { value: formatCurrency(get(pricingOutputs, 'federalRebateTotal', 0)) }, // Federal ITC Amount
    "31": { value: formatCurrency(get(pricingOutputs, 'downPayment', 0)) }, // Down Payment Amount
    
    // Adders
    "32": { value: totalAddersCost }, // Total Adders Amount
    "106": { value: allAdders.length }, // Adders Count
    
    // Status fields (these should be text/checkbox fields)
    "12": { value: "Submitted" }, // Project Status
    "34": { value: get(deal, 'state.hasSignedContract', false) }, // Has Signed Contract
    "35": { value: get(deal, 'state.hasDesign', false) }, // Has Design
    
    // Utility Info
    "48": { value: get(design, 'utility.name', '') }, // Utility Company Name
    "46": { value: get(design, 'firstYearProduction', 0) || get(design, 'annualProduction', 0) }, // Annual Production kWh
    "54": { value: get(design, 'offset', 1) * 100 }, // System Offset Percent
    
    // Files/URLs (if available)
    "22": { value: deal.files?.find(f => f.source === 'signedContractFiles')?.url || '' }, // Contract URL
    
    // Customer and Sales IDs
    "64": { value: String(get(customer, 'id', '')) }, // Customer ID
    
    // Finance Info
    "135": { value: get(pricingOutputs, 'financeProduct.name', '') }, // Finance Product Name
    "138": { value: get(deal, 'state.financingStatus', '') }, // Financing Status
    
    // Design Validation (custom field)
    "189": { value: "Pending" } // Design Validation Status
  };
  
  // Add first 3 itemized adders if they exist
  if (allAdders[0]) {
    record["193"] = { value: allAdders[0].name || '' }; // Adder 1 Name
    record["194"] = { value: formatCurrency(allAdders[0].amount || 0) }; // Adder 1 Cost
    record["195"] = { value: allAdders[0].category || 'Value' }; // Adder 1 Category
  }
  
  if (allAdders[1]) {
    record["198"] = { value: allAdders[1].name || '' }; // Adder 2 Name
    record["199"] = { value: formatCurrency(allAdders[1].amount || 0) }; // Adder 2 Cost
    record["200"] = { value: allAdders[1].category || 'Value' }; // Adder 2 Category
  }
  
  if (allAdders[2]) {
    record["203"] = { value: allAdders[2].name || '' }; // Adder 3 Name
    record["204"] = { value: formatCurrency(allAdders[2].amount || 0) }; // Adder 3 Cost
    record["213"] = { value: allAdders[2].category || 'Value' }; // Adder 3 Category (field 213)
  }
  
  return record;
}

// Send to QuickBase
async function sendToQuickBase(recordData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      to: QB_CONFIG.tableId,
      data: [recordData],
      fieldsToReturn: [6, 7, 12] // Return Deal ID, Customer Name, Status
    });
    
    const options = {
      hostname: 'api.quickbase.com',
      path: '/v1/records',
      method: 'POST',
      headers: {
        'QB-Realm-Hostname': QB_CONFIG.realm,
        'Authorization': `QB-USER-TOKEN ${QB_CONFIG.userToken}`,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('QuickBase Response Status:', res.statusCode);
        console.log('QuickBase Response:', data);
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`QuickBase API error: ${res.statusCode} - ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  console.log('=== Webhook Received ===');
  console.log('Time:', new Date().toISOString());
  
  try {
    const enerflData = req.body;
    console.log('Event Type:', enerflData.event);
    console.log('Deal ID:', get(enerflData, 'payload.deal.id'));
    console.log('Customer:', get(enerflData, 'payload.customer.firstName'), get(enerflData, 'payload.customer.lastName'));
    
    // Map to QuickBase format
    const qbRecord = mapEnerflToQuickBase(enerflData);
    console.log('Mapped Fields Count:', Object.keys(qbRecord).length);
    console.log('Sending fields:', Object.keys(qbRecord).join(', '));
    
    // Send to QuickBase
    const result = await sendToQuickBase(qbRecord);
    console.log('✅ SUCCESS! QuickBase record created');
    console.log('Result:', JSON.stringify(result));
    
    res.json({ 
      success: true, 
      message: 'Deal successfully processed and created in QuickBase',
      recordId: result.data?.[0]?.[6]?.value,
      recordsCreated: result.metadata?.createdRecordIds?.length || 0,
      quickbaseResponse: result
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Webhook handler is running with correct field mappings',
    endpoint: '/webhook',
    time: new Date().toISOString(),
    version: '2.0',
    fields_mapped: '45+ fields correctly mapped to QuickBase'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`✨ Using corrected QuickBase field mappings v2.0`);
});