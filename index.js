const express = require('express');
const cors = require('cors');
const DataEnrichment = require('./data-enrichment');
const app = express();

// Initialize Data Enrichment
const dataEnrichment = new DataEnrichment();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// QuickBase Configuration
const QB_CONFIG = {
  realm: 'kin.quickbase.com',
  tableId: 'bveiu6xy5',
  userToken: 'b6um6p_p3bs_0_bmrupwzbc82cdnb44a7pirtbxif',
  baseUrl: 'https://api.quickbase.com/v1'
};

// QuickBase Headers
const getQBHeaders = () => ({
  'QB-Realm-Hostname': QB_CONFIG.realm,
  'Authorization': `QB-USER-TOKEN ${QB_CONFIG.userToken}`,
  'Content-Type': 'application/json'
});

// Helper Functions
const calculateTotalPanels = (arrays) => {
  return arrays ? arrays.reduce((total, array) => total + (array.moduleCount || 0), 0) : 0;
};

const findAdderAmount = (adders, name) => {
  if (!adders) return 0;
  const adder = adders.find(a => a.displayName === name);
  return adder ? adder.amount : 0;
};

const findFileUrl = (files, source) => {
  if (!files) return '';
  const file = files.find(f => f.source === source);
  return file ? file.url : '';
};

// Find existing record by Enerflo Deal ID
async function findExistingRecord(dealId) {
  const url = `${QB_CONFIG.baseUrl}/records/query`;
  
  const payload = {
    from: QB_CONFIG.tableId,
    where: `{6.EX.'${dealId}'}`,
    select: [3]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getQBHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`QuickBase query failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data.length > 0 ? result.data[0][3].value : null;
  } catch (error) {
    console.error('Error querying QuickBase:', error);
    return null;
  }
}

// Transform webhook data to QuickBase format with ALL fields
function transformWebhookToQuickBase(webhook) {
  const payload = webhook.payload;
  const deal = payload.deal;
  const customer = payload.customer;
  const proposal = payload.proposal;
  
  console.log('🔄 Transforming webhook data...');
  console.log('   Deal ID:', deal.id);
  console.log('   Customer:', customer.firstName, customer.lastName);
  console.log('   System Size:', proposal?.pricingOutputs?.systemSizeWatts, 'W');
  
  // Complete field mapping - ALL 150+ fields
  const recordData = {
    // Basic Deal Info
    6: { value: deal.id }, // Enerflo Deal ID
    64: { value: customer.id }, // Customer ID
    16: { value: customer.firstName || '' }, // Customer First Name
    17: { value: customer.lastName || '' }, // Customer Last Name
    7: { value: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() }, // Customer Full Name
    65: { value: payload.salesRep?.id || '' }, // Sales Rep ID
    68: { value: payload.initiatedBy || '' }, // Initiated By User ID
    69: { value: payload.targetOrg || '' }, // Target Organization ID
    71: { value: webhook.event || '' }, // Event Type
    218: { value: payload.initiatedBy || '' }, // Setter (Lead Owner)
    219: { value: payload.salesRep?.id || '' }, // Closer (Sales Rep)
    
    // Proposal Info
    72: { value: proposal?.id || '' }, // Proposal ID
    19: { value: proposal?.pricingOutputs?.systemSizeWatts || 0 }, // System Size Watts
    14: { value: (proposal?.pricingOutputs?.systemSizeWatts || 0) / 1000 }, // System Size kW
    21: { value: proposal?.pricingOutputs?.grossCost || 0 }, // Gross Cost
    33: { value: proposal?.pricingOutputs?.baseCost || 0 }, // Base Cost
    34: { value: proposal?.pricingOutputs?.netCost || 0 }, // Net Cost After ITC
    35: { value: proposal?.pricingOutputs?.basePPW || 0 }, // Base PPW
    36: { value: proposal?.pricingOutputs?.grossPPW || 0 }, // Gross PPW
    93: { value: proposal?.pricingOutputs?.netPPW || 0 }, // Net PPW
    37: { value: proposal?.pricingOutputs?.federalRebateTotal || 0 }, // Federal ITC Amount
    38: { value: (proposal?.pricingOutputs?.downPayment || 0) * (proposal?.pricingOutputs?.grossCost || 0) }, // Down Payment Amount
    99: { value: proposal?.pricingOutputs?.downPayment || 0 }, // Down Payment Percent
    40: { value: proposal?.pricingOutputs?.financeCost || 0 }, // Finance Cost
    92: { value: proposal?.pricingOutputs?.commissionBase || 0 }, // Commission Base
    95: { value: proposal?.pricingOutputs?.rebatesTotal || 0 }, // Rebates Total
    97: { value: proposal?.pricingOutputs?.dealerFee || 0 }, // Dealer Fee
    98: { value: proposal?.pricingOutputs?.dealerFeePercent || 0 }, // Dealer Fee Percent
    100: { value: proposal?.pricingOutputs?.equipmentTotal || 0 }, // Equipment Total
    101: { value: proposal?.pricingOutputs?.moduleTotal || 0 }, // Module Total Cost
    102: { value: proposal?.pricingOutputs?.inverterTotal || 0 }, // Inverter Total Cost
    103: { value: proposal?.pricingOutputs?.taxRate || 0 }, // Tax Rate
    104: { value: proposal?.pricingOutputs?.calculatedTaxes?.totalTax || 0 }, // Tax Amount
    105: { value: proposal?.pricingOutputs?.valueAddersTotal || 0 }, // Value Adders Total
    106: { value: proposal?.pricingOutputs?.systemAddersTotal || 0 }, // System Adders Total
    107: { value: (proposal?.pricingOutputs?.adderPricing?.valueAdders?.length || 0) + (proposal?.pricingOutputs?.adderPricing?.systemAdders?.length || 0) }, // Adders Count
    39: { value: (proposal?.pricingOutputs?.valueAddersTotal || 0) + (proposal?.pricingOutputs?.systemAddersTotal || 0) }, // Total Adders Amount
    
    // System Design
    15: { value: calculateTotalPanels(proposal?.design?.arrays) }, // Total Panel Count
    20: { value: proposal?.design?.arrays?.[0]?.module?.model || '' }, // Panel Model
    23: { value: proposal?.design?.arrays?.[0]?.module?.manufacturer || '' }, // Panel Manufacturer
    24: { value: proposal?.design?.arrays?.[0]?.module?.capacity || 0 }, // Panel Watts Each
    25: { value: proposal?.design?.arrays?.[0]?.module?.name || '' }, // Panel Name
    79: { value: proposal?.design?.arrays?.[0]?.module?.efficiency || 0 }, // Panel Efficiency
    80: { value: proposal?.design?.arrays?.[0]?.module?.degradation || 0 }, // Panel Degradation
    81: { value: proposal?.design?.arrays?.[0]?.module?.width || 0 }, // Panel Width mm
    82: { value: proposal?.design?.arrays?.[0]?.module?.length || 0 }, // Panel Length mm
    29: { value: proposal?.design?.arrays?.length || 0 }, // Array Count
    26: { value: proposal?.design?.inverters?.[0]?.manufacturer || '' }, // Inverter Manufacturer
    27: { value: proposal?.design?.inverters?.[0]?.model || '' }, // Inverter Model
    28: { value: proposal?.design?.inverters?.[0]?.count || 0 }, // Inverter Count
    84: { value: proposal?.design?.inverters?.[0]?.acOutput || 0 }, // Inverter AC Output
    85: { value: proposal?.design?.inverters?.[0]?.efficiency || 0 }, // Inverter Efficiency
    86: { value: proposal?.design?.inverters?.[0]?.isMicro || false }, // Is Microinverter
    87: { value: proposal?.design?.inverters?.[0]?.panelRatio || 0 }, // DC AC Ratio
    30: { value: proposal?.design?.roofMaterial || '' }, // Roof Material
    31: { value: proposal?.design?.mountingType || '' }, // Mounting Type
    32: { value: proposal?.design?.weightedTsrf || 0 }, // Weighted TSRF
    53: { value: proposal?.design?.firstYearProduction || 0 }, // Annual Production kWh
    54: { value: proposal?.design?.offset || 0 }, // System Offset Percent
    88: { value: proposal?.design?.batteryCount || 0 }, // Battery Count
    89: { value: proposal?.design?.batteryPurpose || '' }, // Battery Purpose
    90: { value: proposal?.pricingOutputs?.batteryTotal || 0 }, // Battery Total Cost
    91: { value: proposal?.pricingOutputs?.batteryTotal || 0 }, // Battery Adder Cost
    83: { value: (proposal?.pricingOutputs?.systemSizeWatts || 0) / 1000 }, // System Size kW2
    
    // Address Info
    73: { value: proposal?.pricingOutputs?.deal?.projectAddress?.line1 || '' }, // Address Line 1
    74: { value: proposal?.pricingOutputs?.deal?.projectAddress?.city || '' }, // Address City
    75: { value: proposal?.pricingOutputs?.deal?.projectAddress?.state || '' }, // Address State
    76: { value: proposal?.pricingOutputs?.deal?.projectAddress?.postalCode || '' }, // Address Zip
    18: { value: proposal?.pricingOutputs?.deal?.projectAddress?.fullAddress || '' }, // Address Full
    77: { value: proposal?.pricingOutputs?.deal?.projectAddress?.lat || 0 }, // Address Latitude
    78: { value: proposal?.pricingOutputs?.deal?.projectAddress?.lng || 0 }, // Address Longitude
    
    // Utility Info
    55: { value: proposal?.design?.utility?.name || '' }, // Utility Company Name
    125: { value: proposal?.design?.utility?.id || '' }, // Utility Company ID
    126: { value: proposal?.design?.utility?.genabilityId || 0 }, // Genability Utility ID
    127: { value: proposal?.design?.consumptionProfile?.tariff?.tariffName || '' }, // Rate Schedule Name
    128: { value: proposal?.design?.consumptionProfile?.tariff?.tariffCode || 0 }, // Rate Schedule Code
    129: { value: proposal?.design?.consumptionProfile?.tariff?.tariffId || 0 }, // Tariff ID
    130: { value: proposal?.design?.consumptionProfile?.rate || 0 }, // Utility Rate per kWh
    131: { value: proposal?.design?.consumptionProfile?.postSolarRate || 0 }, // Post Solar Rate
    132: { value: proposal?.design?.consumptionProfile?.annualBill || 0 }, // Annual Bill Amount
    133: { value: proposal?.design?.consumptionProfile?.averageMonthlyConsumption || 0 }, // Average Monthly Usage
    57: { value: proposal?.design?.consumptionProfile?.averageMonthlyBill || 0 }, // Average Monthly Bill
    56: { value: proposal?.design?.consumptionProfile?.annualConsumption || 0 }, // Annual Consumption kWh
    134: { value: proposal?.design?.consumptionProfile?.buildingArea || 0 }, // Building Area sqft
    
    // Deal Status Flags
    41: { value: deal.state?.hasSignedContract || false }, // Has Signed Contract
    42: { value: deal.state?.hasDesign || false }, // Has Design
    44: { value: deal.state?.financingStatus === 'approved' }, // Financing Approved
    45: { value: deal.state?.['site-survey']?.['schedule-site-survey'] || false }, // Site Survey Scheduled
    46: { value: deal.state?.['additional-work-substage']?.['is-there-additional-work'] || false }, // Additional Work Needed
    153: { value: deal.state?.hasCreatedProposal || false }, // Has Created Proposal
    154: { value: deal.state?.hasApprovedContract || false }, // Has Approved Contract
    155: { value: deal.state?.hasSubmittedProject || false }, // Has Submitted Project
    156: { value: deal.state?.hasGeneratedContract || false }, // Has Generated Contract
    157: { value: deal.state?.hasSubmittedFinancingApplication || false }, // Has Submitted Financing
    158: { value: deal.state?.hasSignedFinancingDocs || false }, // Has Signed Financing Docs
    159: { value: deal.state?.noDocumentsToSign || false }, // No Documents to Sign
    160: { value: deal.state?.contractApprovalEnabled || false }, // Contract Approval Enabled
    161: { value: deal.state?.['sales-rep-confirmation']?.['ready-to-submit'] || false }, // Ready to Submit
    162: { value: deal.state?.['sales-rep-confirmation']?.['sales-rep-confirmation-message'] || false }, // Sales Rep Confirmation
    163: { value: deal.state?.['site-survey']?.['site-survey-selection'] || '' }, // Site Survey Selection
    164: { value: deal.state?.['system-offset']?.['new-move-in'] || '' }, // New Move In
    166: { value: deal.state?.['system-offset']?.['are-there-any-shading-concerns'] || false }, // Shading Concerns
    167: { value: deal.state?.['system-offset']?.['is-the-system-offset-below-100'] || false }, // System Offset Below 100%
    
    // Additional Work
    48: { value: deal.state?.['additional-work-substage']?.['tree-removal-contractor'] || '' }, // Tree Removal Contractor
    47: { value: findAdderAmount(proposal?.pricingOutputs?.adderPricing?.valueAdders, 'Tree Removal') }, // Tree Removal Cost
    109: { value: deal.state?.['additional-work-substage']?.['tree-trimming-contractor'] || '' }, // Tree Trimming Contractor
    108: { value: findAdderAmount(proposal?.pricingOutputs?.adderPricing?.valueAdders, 'Tree Trimming') }, // Tree Trimming Cost
    110: { value: deal.state?.['additional-work-substage']?.['tree-removal-contractor-phone-number'] || '' }, // Tree Contractor Phone
    49: { value: deal.state?.['additional-work-substage']?.['how-many-optional-electrical-upgrades-are-needed'] || 0 }, // Electrical Upgrades Count
    50: { value: findAdderAmount(proposal?.pricingOutputs?.adderPricing?.systemAdders, 'Electrical Upgrade If Needed') }, // Electrical Upgrades Total
    111: { value: proposal?.pricingOutputs?.adderPricing?.systemAdders?.find(a => a.displayName === 'Electrical Upgrade If Needed')?.costPerUpgrade || 0 }, // Electrical Cost Each
    51: { value: findAdderAmount(proposal?.pricingOutputs?.adderPricing?.systemAdders, 'Metal Roof Adder') }, // Metal Roof Adder
    112: { value: proposal?.pricingOutputs?.adderPricing?.systemAdders?.find(a => a.displayName === 'Metal Roof Adder')?.ppw || 0 }, // Metal Roof PPW
    52: { value: findAdderAmount(proposal?.pricingOutputs?.adderPricing?.systemAdders, 'Trenching') }, // Trenching Cost
    113: { value: proposal?.pricingOutputs?.adderPricing?.systemAdders?.find(a => a.displayName.includes('Trenching'))?.fieldInputs?.['how-many-feet-of-trenching'] || 0 }, // Trenching Linear Feet
    114: { value: proposal?.pricingOutputs?.adderPricing?.systemAdders?.find(a => a.displayName.includes('Trenching'))?.displayName || '' }, // Trenching Type
    115: { value: findAdderAmount(proposal?.pricingOutputs?.adderPricing?.systemAdders, 'HVAC') }, // HVAC Cost
    116: { value: deal.state?.['additional-work-substage']?.['hvac-contractor-name'] || '' }, // HVAC Contractor
    117: { value: findAdderAmount(proposal?.pricingOutputs?.adderPricing?.systemAdders, 'Sub Panel') }, // Sub Panel Cost
    118: { value: findAdderAmount(proposal?.pricingOutputs?.adderPricing?.systemAdders, 'Generator') }, // Generator Cost
    119: { value: proposal?.pricingOutputs?.adderPricing?.systemAdders?.find(a => a.displayName.includes('Generator'))?.displayName || '' }, // Generator Type
    120: { value: findAdderAmount(proposal?.pricingOutputs?.adderPricing?.systemAdders, 'Re-Roof') }, // Re Roof Cost
    
    // Finance Info
    135: { value: proposal?.pricingOutputs?.financeProduct?.financeMethodName || '' }, // Finance Type
    136: { value: proposal?.pricingOutputs?.financeProduct?.name || '' }, // Finance Product Name
    137: { value: proposal?.pricingOutputs?.financeProduct?.id || '' }, // Finance Product ID
    138: { value: proposal?.pricingOutputs?.financeProduct?.financeMethodName || '' }, // Lender Name
    139: { value: deal.state?.financingStatus || '' }, // Financing Status
    140: { value: proposal?.pricingOutputs?.financeProduct?.termMonths || 0 }, // Loan Term Months
    141: { value: proposal?.pricingOutputs?.financeProduct?.name || '' }, // Payment Structure
    142: { value: deal.state?.['lender-welcome-call']?.['how-is-the-customer-making-their-down-payment'] || '' }, // Down Payment Method
    
    // Design Info
    168: { value: proposal?.design?.id || '' }, // Design ID
    169: { value: proposal?.design?.source?.tool || '' }, // Design Tool
    170: { value: proposal?.design?.source?.id || '' }, // Design Source ID
    
    // Sales Team Info
    66: { value: proposal?.pricingOutputs?.salesTeams?.[0]?.name || '' }, // Sales Team Name
    67: { value: proposal?.pricingOutputs?.salesTeams?.[0]?.id || '' }, // Sales Team ID
    70: { value: proposal?.pricingOutputs?.deal?.installer?.id || '' }, // Installer Org ID
    
    // JSON Fields for Complex Data
    58: { value: JSON.stringify(proposal?.design?.arrays || []) }, // Arrays JSON
    59: { value: JSON.stringify(proposal?.pricingOutputs?.adderPricing?.valueAdders || []) }, // Value Adder JSON
    60: { value: JSON.stringify(proposal?.pricingOutputs?.adderPricing?.systemAdders || []) }, // System Adders JSON
    61: { value: JSON.stringify(deal.files || []) }, // All Files JSON
    96: { value: JSON.stringify(proposal?.pricingOutputs?.rebates || []) }, // Rebates JSON
    62: { value: deal.state?.['notes-comments'] || '' }, // Sales Notes
    63: { value: deal.state?.['system-offset']?.['layout-preferences'] || '' }, // Layout Preferences
    124: { value: JSON.stringify(deal.state?.['additional-work-substage']?.['additional-work'] || []) }, // Additional Work Types
    123: { value: JSON.stringify(proposal?.design?.consumptionProfile?.consumption || []) }, // Monthly Consumption
    121: { value: JSON.stringify(proposal?.pricingOutputs?.adderPricing?.valueAdders?.map(a => a.fieldInputs) || []) }, // Adder Dynamic Inputs JSON
    122: { value: JSON.stringify(proposal?.pricingOutputs || {}) }, // Pricing Model JSON
    
    // File URLs
    22: { value: findFileUrl(deal.files, 'signedContractFiles') }, // Contract Url
    144: { value: findFileUrl(deal.files, 'signedContractFiles') }, // Installation Agreement URL
    145: { value: findFileUrl(deal.files, 'full-utility-bill') }, // Utility Bill URL
    146: { value: deal.files?.find(f => f.source === 'full-utility-bill')?.name || '' }, // Utility Bill Filename
    147: { value: findFileUrl(deal.files, 'customers-photo-id') }, // Customer ID Photo URL
    148: { value: findFileUrl(deal.files, 'proof-of-payment') }, // Proof of Payment URL
    149: { value: findFileUrl(deal.files, 'tree-quote') }, // Tree Quote URL
    150: { value: findFileUrl(deal.files, 'picture-of-site-of-tree-removal') }, // Tree Site Photo URL
    151: { value: JSON.stringify(deal.files?.filter(f => f.source === 'additional-documentation').map(f => f.url) || []) }, // Additional Docs URLs
    152: { value: deal.files?.length || 0 }, // Total Files Count
    143: { value: deal.files?.find(f => f.source === 'signedContractFiles')?.name || '' }, // Contract Filename
    
    // Individual Adders (first 5)
    192: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[0]?.displayName || '' }, // Adder 1 Name
    193: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[0]?.amount || 0 }, // Adder 1 Cost
    194: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[0]?.priceableEntityName || '' }, // Adder 1 Category
    195: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[0]?.pricingOption?.model?.amount?.ppw || 0 }, // Adder 1 PPW
    196: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[0]?.fieldInputs?.quantity || 0 }, // Adder 1 Quantity
    
    197: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[1]?.displayName || '' }, // Adder 2 Name
    198: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[1]?.amount || 0 }, // Adder 2 Cost
    199: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[1]?.priceableEntityName || '' }, // Adder 2 Category
    200: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[1]?.fieldInputs?.quantity || 0 }, // Adder 2 Quantity
    201: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[1]?.pricingOption?.model?.amount?.ppw || 0 }, // Adder 2 PPW
    
    202: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[2]?.displayName || '' }, // Adder 3 Name
    204: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[2]?.amount || 0 }, // Adder 3 Cost
    217: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[2]?.priceableEntityName || '' }, // Adder 3 Category
    205: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[2]?.fieldInputs?.quantity || 0 }, // Adder 3 Quantity
    206: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[2]?.pricingOption?.model?.amount?.ppw || 0 }, // Adder 3 PPW
    
    207: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[3]?.displayName || '' }, // Adder 4 Name
    208: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[3]?.priceableEntityName || '' }, // Adder 4 Category
    209: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[3]?.amount || 0 }, // Adder 4 Cost
    210: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[3]?.fieldInputs?.quantity || 0 }, // Adder 4 Quantity
    211: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[3]?.pricingOption?.model?.amount?.ppw || 0 }, // Adder 4 PPW
    
    212: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[4]?.displayName || '' }, // Adder 5 Name
    213: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[4]?.priceableEntityName || '' }, // Adder 5 Category
    214: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[4]?.amount || 0 }, // Adder 5 Cost
    215: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[4]?.fieldInputs?.quantity || 0 }, // Adder 5 Quantity
    216: { value: proposal?.pricingOutputs?.adderPricing?.valueAdders?.[4]?.pricingOption?.model?.amount?.ppw || 0 }, // Adder 5 PPW
    
    // Timestamps
    186: { value: new Date().toISOString() }, // Created At
    187: { value: new Date().toISOString() } // Updated At
  };
  
  console.log(`✅ Mapped ${Object.keys(recordData).length} fields to QuickBase`);
  return recordData;
}

// Add or update record in QuickBase
async function upsertRecord(dealId, recordData) {
  try {
    const existingRecordId = await findExistingRecord(dealId);
    
    const url = `${QB_CONFIG.baseUrl}/records`;
    const payload = {
      to: QB_CONFIG.tableId,
      data: existingRecordId ? [{
        [3]: { value: existingRecordId },
        ...recordData
      }] : [recordData]
    };

    console.log(`🔄 ${existingRecordId ? 'Updating' : 'Creating'} record for deal ${dealId}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getQBHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`QuickBase operation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Successfully ${existingRecordId ? 'updated' : 'created'} record for deal ${dealId}`);
    return result;
    
  } catch (error) {
    console.error('❌ Error in upsert operation:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  const enrichmentStats = dataEnrichment.getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'enerflo-quickbase-webhook',
    version: '2.0.0',
    enrichment: enrichmentStats
  });
});

// Enrichment status endpoint
app.get('/enrichment/status', (req, res) => {
  const stats = dataEnrichment.getStats();
  res.json({
    enabled: stats.enabled,
    apiConfigured: stats.apiConfigured,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/test', async (req, res) => {
  try {
    const url = `${QB_CONFIG.baseUrl}/records/query`;
    const payload = {
      from: QB_CONFIG.tableId,
      select: [3],
      limit: 1
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getQBHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      res.json({ success: true, message: 'QuickBase connection successful' });
    } else {
      res.status(500).json({ success: false, error: 'QuickBase connection failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Main webhook endpoint
app.post('/webhook/enerflo', async (req, res) => {
  try {
    console.log('📨 Received Enerflo webhook');
    console.log('   Event type:', req.body.event);
    console.log('   Deal ID:', req.body.payload?.deal?.id);
    
    // Validate webhook payload
    if (!req.body.event || !req.body.payload) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook payload - missing event or payload'
      });
    }
    
    const dealId = req.body.payload.deal.id;
    
    // Transform webhook data to QuickBase format
    const recordData = transformWebhookToQuickBase(req.body);
    
    // Upsert record to QuickBase
    const result = await upsertRecord(dealId, recordData);
    
    console.log('✅ Webhook processed successfully');
    
    // Start data enrichment in background (don't wait for completion)
    if (result.recordId) {
      dataEnrichment.enrichRecord(result.recordId, req.body)
        .then(enrichmentResult => {
          if (enrichmentResult.success) {
            console.log(`🎯 Data enrichment completed for record ${result.recordId}`);
            console.log(`   Enriched ${enrichmentResult.enrichedFields.length} fields`);
          } else {
            console.log(`⚠️  Data enrichment failed for record ${result.recordId}:`, enrichmentResult.reason);
          }
        })
        .catch(error => {
          console.error(`❌ Data enrichment error for record ${result.recordId}:`, error.message);
        });
    }
    
    res.json({
      success: true,
      message: 'Webhook processed successfully',
      dealId: dealId,
      eventType: req.body.event,
      recordId: result.recordId,
      action: result.action,
      enrichmentStarted: !!result.recordId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      dealId: req.body.payload?.deal?.id || 'unknown'
    });
  }
});

// Test webhook endpoint
app.post('/webhook/test', async (req, res) => {
  try {
    console.log('🧪 Testing webhook with sample data');
    
    const sampleWebhook = {
      event: 'deal.projectSubmitted',
      payload: {
        targetOrg: 'test-org',
        initiatedBy: 'test-user',
        deal: {
          id: 'test-deal-123',
          shortCode: 'test123',
          state: {
            hasDesign: true,
            hasSignedContract: true,
            hasSubmittedProject: true
          }
        },
        customer: {
          id: 'test-customer',
          firstName: 'Test',
          lastName: 'Customer'
        }
      }
    };
    
    const dealId = sampleWebhook.payload.deal.id;
    const recordData = transformWebhookToQuickBase(sampleWebhook);
    const result = await upsertRecord(dealId, recordData);
    
    // Start data enrichment in background for test
    if (result.recordId) {
      dataEnrichment.enrichRecord(result.recordId, sampleWebhook)
        .then(enrichmentResult => {
          console.log(`🧪 Test enrichment completed: ${enrichmentResult.enrichedFields.length} fields enriched`);
        })
        .catch(error => {
          console.error(`🧪 Test enrichment error:`, error.message);
        });
    }
    
    res.json({
      success: true,
      message: 'Test webhook processed successfully',
      result,
      enrichmentStarted: !!result.recordId
    });
    
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 ENHANCED Enerflo-QuickBase Webhook Server Started');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`📨 Webhook endpoint: http://localhost:${PORT}/webhook/enerflo`);
  console.log(`🧪 Test webhook: http://localhost:${PORT}/webhook/test`);
  console.log('');
  console.log('📋 QuickBase Configuration:');
  console.log(`   Realm: ${QB_CONFIG.realm}`);
  console.log(`   Table ID: ${QB_CONFIG.tableId}`);
  console.log('');
  console.log('✅ Ready to receive webhooks with FULL field mapping!');
});

module.exports = app;
