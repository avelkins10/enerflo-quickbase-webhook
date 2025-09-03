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

// Main mapping function
function mapEnerflToQuickBase(webhookData) {
  const payload = get(webhookData, 'payload', {});
  const deal = get(payload, 'deal', {});
  const customer = get(payload, 'customer', {});
  const proposal = get(payload, 'proposal', {});
  const pricingOutputs = get(proposal, 'pricingOutputs', {});
  const design = get(pricingOutputs, 'design', {});
  const adderPricing = get(pricingOutputs, 'adderPricing', {});
  
  // Parse value and system adders
  const valueAdders = get(adderPricing, 'withDealerFees.calculatedValueAdders', []) || 
                      get(adderPricing, 'valueAdders', []) || [];
  const systemAdders = get(adderPricing, 'withDealerFees.calculatedSystemAdders', []) || 
                       get(adderPricing, 'systemAdders', []) || [];
  const allAdders = [...valueAdders, ...systemAdders];
  
  // Calculate total panels across all arrays
  const arrays = get(design, 'arrays', []);
  const totalPanels = arrays.reduce((sum, arr) => sum + (arr.moduleCount || 0), 0);
  
  // Calculate total adders cost
  let totalAddersCost = 0;
  let addersByType = {
    tree: 0, electrical: 0, metalRoof: 0, mpu: 0, trenching: 0
  };
  
  allAdders.forEach(adder => {
    const cost = formatCurrency(adder.amount || 0);
    totalAddersCost += cost;
    
    const name = (adder.name || '').toLowerCase();
    if (name.includes('tree')) addersByType.tree = cost;
    else if (name.includes('electrical')) addersByType.electrical = cost;
    else if (name.includes('metal roof')) addersByType.metalRoof = cost;
    else if (name.includes('mpu') || name.includes('main panel')) addersByType.mpu = cost;
    else if (name.includes('trenching')) addersByType.trenching = cost;
  });
  
  // Build QuickBase record
  const record = {
    // Core Fields
    "6": { value: String(get(deal, 'id', '')) },
    "7": { value: String(get(customer, 'id', '')) },
    "8": { value: `${get(customer, 'firstName', '')} ${get(customer, 'lastName', '')}`.trim() },
    "9": { value: get(customer, 'email', '') },
    "10": { value: String(get(customer, 'phone', '')).replace(/\D/g, '') },
    
    // Address
    "11": { value: get(design, 'deal.projectAddress.line1', '') || get(pricingOutputs, 'deal.projectAddress.line1', '') },
    "12": { value: get(design, 'deal.projectAddress.city', '') || get(pricingOutputs, 'deal.projectAddress.city', '') },
    "13": { value: get(design, 'deal.projectAddress.state', '') || get(pricingOutputs, 'deal.projectAddress.state', '') },
    "14": { value: String(get(design, 'deal.projectAddress.postalCode', '') || get(pricingOutputs, 'deal.projectAddress.postalCode', '')) },
    
    // Dates
    "17": { value: formatDate(get(deal, 'createdAt', '')) },
    "18": { value: formatDate(new Date().toISOString()) },
    
    // System Specs
    "19": { value: get(design, 'totalSystemSizeWatts', 0) || get(design, 'cumulativeSystemSizeWatts', 0) },
    "20": { value: ((get(design, 'totalSystemSizeWatts', 0) || get(design, 'cumulativeSystemSizeWatts', 0)) / 1000).toFixed(2) },
    "21": { value: get(arrays, '0.module.model', '') },
    "22": { value: totalPanels }, // Correctly summed!
    "23": { value: get(arrays, '0.module.capacity', 0) },
    "24": { value: get(design, 'inverters.0.model', '') },
    "25": { value: get(design, 'inverterCount', 0) },
    
    // Financial
    "29": { value: formatCurrency(get(pricingOutputs, 'grossCost', 0)) },
    "30": { value: formatCurrency(get(pricingOutputs, 'netCost', 0)) },
    "31": { value: get(pricingOutputs, 'grossPPW', 0) },
    "32": { value: get(pricingOutputs, 'netPPW', 0) },
    
    // Status
    "53": { value: "Submitted" },
    "54": { value: get(deal, 'state.financingStatus', 'Pending') },
    "55": { value: get(deal, 'state.hasSignedContract', false) },
    
    // Adders
    "88": { value: totalAddersCost },
    "91": { value: addersByType.tree },
    "92": { value: addersByType.electrical },
    "93": { value: addersByType.metalRoof },
    
    // Timestamps
    "109": { value: formatDate(new Date()) },
    "111": { value: formatDate(new Date()) },
    
    // JSON Storage
    "206": { value: JSON.stringify(deal).substring(0, 5000) }, // Limit size
    "208": { value: JSON.stringify(allAdders).substring(0, 5000) }
  };
  
  // Add itemized adders
  allAdders.slice(0, 5).forEach((adder, i) => {
    const base = 200 + (i * 5);
    record[String(base)] = { value: adder.name || '' };
    record[String(base + 1)] = { value: formatCurrency(adder.amount || 0) };
  });
  
  return record;
}

// Send to QuickBase
async function sendToQuickBase(recordData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      to: QB_CONFIG.tableId,
      data: [recordData],
      fieldsToReturn: [6, 8, 53]
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
        console.log('QuickBase Response:', res.statusCode, data);
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
  console.log('Headers:', req.headers);
  
  try {
    const enerflData = req.body;
    console.log('Event Type:', enerflData.event);
    console.log('Deal ID:', get(enerflData, 'payload.deal.id'));
    
    // Map to QuickBase format
    const qbRecord = mapEnerflToQuickBase(enerflData);
    console.log('Mapped Fields Count:', Object.keys(qbRecord).length);
    
    // Send to QuickBase
    const result = await sendToQuickBase(qbRecord);
    console.log('QuickBase Success:', result);
    
    res.json({ 
      success: true, 
      message: 'Deal processed successfully',
      recordId: result.data?.[0]?.[6]?.value 
    });
    
  } catch (error) {
    console.error('ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Webhook handler is running',
    endpoint: '/webhook',
    time: new Date().toISOString()
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test successful',
    config: {
      realm: QB_CONFIG.realm,
      tableId: QB_CONFIG.tableId,
      tokenPresent: !!QB_CONFIG.userToken
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});