/**
 * BULLETPROOF FIELD MAPPING: Enerflo Webhook → QuickBase
 * 
 * This module maps all available data from the Enerflo webhook payload
 * to the corresponding QuickBase fields, ensuring perfect data transfer.
 */

// Helper function to format dates for QuickBase (MM-DD-YYYY HH:MM AM/PM)
function formatDateForQuickBase(date) {
  if (!date) return null;
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${month}-${day}-${year} ${displayHours}:${minutes} ${ampm}`;
}

// Helper function to ensure numeric values are numbers
function ensureNumber(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function mapWebhookToQuickBase(webhookPayload) {
  const { deal, customer, proposal } = webhookPayload.payload;
  const pricing = proposal?.pricingOutputs;
  const design = proposal?.pricingOutputs?.design;
  const addr = pricing?.deal?.projectAddress;
  const state = deal?.state;
  
  // Initialize the QuickBase record
  const quickbaseRecord = {};
  
  // ===== CORE DEAL & CUSTOMER INFO =====
  quickbaseRecord[6] = deal?.id; // Enerflo Deal ID
  quickbaseRecord[7] = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim(); // Customer Full Name
  quickbaseRecord[10] = customer?.email; // Customer Email
  quickbaseRecord[11] = customer?.phone; // Customer Phone
  quickbaseRecord[12] = deal?.status || 'submitted'; // Project Status
  quickbaseRecord[13] = formatDateForQuickBase(new Date()); // Submission Date
  quickbaseRecord[16] = customer?.firstName; // Customer First Name
  quickbaseRecord[17] = customer?.lastName; // Customer Last Name
  
  // ===== ADDRESS INFORMATION =====
  if (addr) {
    quickbaseRecord[18] = addr.fullAddress; // Address Full
    quickbaseRecord[73] = addr.line1; // Address Line 1
    quickbaseRecord[74] = addr.city; // Address City
    quickbaseRecord[75] = addr.state; // Address State
    quickbaseRecord[76] = addr.postalCode; // Address Zip
    quickbaseRecord[77] = ensureNumber(addr.lat); // Address Latitude
    quickbaseRecord[78] = ensureNumber(addr.lng); // Address Longitude
  }
  
  // ===== SYSTEM DESIGN & SPECIFICATIONS =====
  if (design) {
    quickbaseRecord[14] = ensureNumber(design.totalSystemSizeWatts ? (design.totalSystemSizeWatts / 1000) : null); // System Size kW
    quickbaseRecord[19] = ensureNumber(design.totalSystemSizeWatts); // System Size Watts
    quickbaseRecord[15] = ensureNumber(design.arrays?.reduce((total, array) => total + (array.moduleCount || 0), 0)); // Total Panel Count
    quickbaseRecord[29] = ensureNumber(design.arrays?.length); // Array Count
    quickbaseRecord[30] = design.roofMaterial; // Roof Material
    quickbaseRecord[31] = design.mountingType; // Mounting Type
    quickbaseRecord[32] = ensureNumber(design.weightedTsrf); // Weighted TSRF
    quickbaseRecord[53] = ensureNumber(design.firstYearProduction); // Annual Production kWh
    quickbaseRecord[54] = ensureNumber(design.offset); // System Offset Percent (decimal 0-1)
    quickbaseRecord[87] = ensureNumber(design.batteryCount || 0); // Battery Count
    quickbaseRecord[89] = design.batteryPurpose; // Battery Purpose
    
    // Panel Information (from first array)
    if (design.arrays?.[0]?.module) {
      const module = design.arrays[0].module;
      quickbaseRecord[20] = module.model; // Panel Model
      quickbaseRecord[23] = module.manufacturer; // Panel Manufacturer
      quickbaseRecord[24] = ensureNumber(module.capacity); // Panel Watts Each
      quickbaseRecord[79] = ensureNumber(module.efficiency); // Panel Efficiency
      quickbaseRecord[80] = ensureNumber(module.degradation); // Panel Degradation
      quickbaseRecord[81] = ensureNumber(module.width); // Panel Width mm
      quickbaseRecord[82] = ensureNumber(module.length); // Panel Length mm
    }
    
    // Inverter Information
    if (design.inverters?.[0]) {
      const inverter = design.inverters[0];
      quickbaseRecord[26] = inverter.manufacturer; // Inverter Manufacturer
      quickbaseRecord[27] = inverter.model; // Inverter Model
      quickbaseRecord[28] = ensureNumber(inverter.count); // Inverter Count
      quickbaseRecord[84] = ensureNumber(inverter.acOutput); // Inverter AC Output
      quickbaseRecord[85] = ensureNumber(inverter.efficiency); // Inverter Efficiency
      quickbaseRecord[86] = Boolean(inverter.isMicro); // Is Microinverter
      quickbaseRecord[87] = ensureNumber(inverter.panelRatio); // DC AC Ratio
    }
    
    // Utility Information
    if (design.utility) {
      quickbaseRecord[55] = design.utility.name; // Utility Company Name
      quickbaseRecord[125] = design.utility.id; // Utility Company ID
      quickbaseRecord[126] = ensureNumber(design.utility.genabilityId); // Genability Utility ID
    }
    
    // Consumption Profile
    if (design.consumptionProfile) {
      const consumption = design.consumptionProfile;
      quickbaseRecord[56] = ensureNumber(consumption.annualConsumption); // Annual Consumption kWh
      quickbaseRecord[57] = ensureNumber(consumption.averageMonthlyBill); // Average Monthly Bill
      quickbaseRecord[130] = ensureNumber(consumption.rate); // Utility Rate per kWh
      quickbaseRecord[131] = ensureNumber(consumption.postSolarRate); // Post Solar Rate
      quickbaseRecord[132] = ensureNumber(consumption.annualBill); // Annual Bill Amount
      quickbaseRecord[133] = ensureNumber(consumption.averageMonthlyConsumption); // Average Monthly Usage
      quickbaseRecord[134] = ensureNumber(consumption.buildingArea); // Building Area sqft
    }
  }
  
  // ===== PRICING & FINANCIAL INFORMATION =====
  if (pricing) {
    quickbaseRecord[21] = ensureNumber(pricing.grossCost); // Gross Cost
    quickbaseRecord[33] = ensureNumber(pricing.baseCost); // Base Cost
    quickbaseRecord[34] = ensureNumber(pricing.netCost); // Net Cost After ITC
    quickbaseRecord[35] = ensureNumber(pricing.basePPW); // Base PPW
    quickbaseRecord[36] = ensureNumber(pricing.grossPPW); // Gross PPW
    quickbaseRecord[92] = ensureNumber(pricing.netPPW); // Net PPW
    quickbaseRecord[37] = ensureNumber(pricing.federalRebateTotal); // Federal ITC Amount
    quickbaseRecord[38] = ensureNumber(pricing.downPayment ? (pricing.grossCost * pricing.downPayment) : null); // Down Payment Amount
    quickbaseRecord[39] = ensureNumber((pricing.valueAddersTotal || 0) + (pricing.systemAddersTotal || 0)); // Total Adders Amount
    quickbaseRecord[40] = ensureNumber(pricing.financeCost); // Finance Cost
    quickbaseRecord[94] = ensureNumber(pricing.federalRebateTotal ? (pricing.federalRebateTotal / pricing.grossCost) : null); // Federal ITC Percent (decimal 0-1)
    quickbaseRecord[95] = ensureNumber(pricing.rebatesTotal); // Rebates Total
    quickbaseRecord[97] = ensureNumber(pricing.dealerFee); // Dealer Fee
    quickbaseRecord[98] = ensureNumber(pricing.dealerFeePercent ? (pricing.dealerFeePercent / 100) : null); // Dealer Fee Percent (decimal 0-1)
    quickbaseRecord[99] = ensureNumber(pricing.downPayment); // Down Payment Percent (decimal 0-1)
    quickbaseRecord[100] = ensureNumber(pricing.equipmentTotal); // Equipment Total
    quickbaseRecord[101] = ensureNumber(pricing.moduleTotal); // Module Total Cost
    quickbaseRecord[102] = ensureNumber(pricing.inverterTotal); // Inverter Total Cost
    quickbaseRecord[103] = ensureNumber(pricing.taxRate ? (pricing.taxRate / 100) : null); // Tax Rate (decimal 0-1)
    quickbaseRecord[104] = ensureNumber(pricing.calculatedTaxes?.totalTax); // Tax Amount
    quickbaseRecord[105] = ensureNumber(pricing.valueAddersTotal); // Value Adders Total
    quickbaseRecord[106] = ensureNumber(pricing.systemAddersTotal); // System Adders Total
    quickbaseRecord[107] = ensureNumber((pricing.calculatedValueAdders?.length || 0) + (pricing.calculatedSystemAdders?.length || 0)); // Adders Count
    quickbaseRecord[90] = ensureNumber(pricing.batteryTotal); // Battery Total Cost
    quickbaseRecord[91] = ensureNumber(pricing.batteryAdderCost); // Battery Adder Cost
    quickbaseRecord[92] = ensureNumber(pricing.commissionBase); // Commission Base
  }
  
  // ===== DEAL STATE & STATUS FLAGS =====
  if (state) {
    // Convert to proper boolean values for checkbox fields
    quickbaseRecord[41] = Boolean(state.hasSignedContract); // Has Signed Contract
    quickbaseRecord[42] = Boolean(state.hasDesign); // Has Design
    quickbaseRecord[43] = Boolean(state['complete-call-pilot-welcome-call']); // Welcome Call Completed
    quickbaseRecord[44] = Boolean(state.financingStatus === 'approved'); // Financing Approved
    quickbaseRecord[45] = Boolean(state['site-survey']?.scheduleSiteSurvey); // Site Survey Scheduled
    quickbaseRecord[46] = Boolean(state['additional-work-substage']?.isThereAdditionalWork); // Additional Work Needed
    quickbaseRecord[153] = Boolean(state.hasCreatedProposal); // Has Created Proposal
    quickbaseRecord[154] = Boolean(state.hasApprovedContract); // Has Approved Contract
    quickbaseRecord[155] = Boolean(state.hasSubmittedProject); // Has Submitted Project
    quickbaseRecord[156] = Boolean(state.hasGeneratedContract); // Has Generated Contract
    quickbaseRecord[157] = Boolean(state.hasSubmittedFinancingApplication); // Has Submitted Financing
    quickbaseRecord[158] = Boolean(state.hasSignedFinancingDocs); // Has Signed Financing Docs
    quickbaseRecord[159] = Boolean(state.noDocumentsToSign); // No Documents to Sign
    quickbaseRecord[160] = Boolean(state.contractApprovalEnabled); // Contract Approval Enabled
    quickbaseRecord[161] = Boolean(state['sales-rep-confirmation']?.readyToSubmit); // Ready to Submit
    quickbaseRecord[162] = state['sales-rep-confirmation']?.salesRepConfirmationMessage; // Sales Rep Confirmation
    quickbaseRecord[163] = state['site-survey']?.siteSurveySelection; // Site Survey Selection
    quickbaseRecord[164] = state['system-offset']?.newMoveIn; // New Move In
    quickbaseRecord[166] = Boolean(state['system-offset']?.areThereAnyShadingConcerns); // Shading Concerns
    quickbaseRecord[167] = Boolean(state['system-offset']?.isTheSystemOffsetBelow100); // System Offset Below 100%
  }
  
  // ===== ADDITIONAL WORK & CONTRACTORS =====
  if (state?.['additional-work-substage']) {
    const additionalWork = state['additional-work-substage'];
    quickbaseRecord[47] = ensureNumber(additionalWork.treeRemovalCost); // Tree Removal Cost
    quickbaseRecord[48] = additionalWork.treeRemovalContractor; // Tree Removal Contractor
    quickbaseRecord[49] = ensureNumber(additionalWork.electricalUpgradesCount); // Electrical Upgrades Count
    quickbaseRecord[50] = ensureNumber(additionalWork.electricalUpgradesTotal); // Electrical Upgrades Total
    quickbaseRecord[51] = ensureNumber(additionalWork.metalRoofAdder); // Metal Roof Adder
    quickbaseRecord[52] = ensureNumber(additionalWork.trenchingCost); // Trenching Cost
    quickbaseRecord[108] = ensureNumber(additionalWork.treeTrimmingCost); // Tree Trimming Cost
    quickbaseRecord[109] = additionalWork.treeTrimmingContractor; // Tree Trimming Contractor
    quickbaseRecord[110] = additionalWork.treeContractorPhone; // Tree Contractor Phone
    quickbaseRecord[111] = ensureNumber(additionalWork.electricalCostEach); // Electrical Cost Each
    quickbaseRecord[112] = ensureNumber(additionalWork.metalRoofPPW); // Metal Roof PPW
    quickbaseRecord[113] = ensureNumber(additionalWork.trenchingLinearFeet); // Trenching Linear Feet
    quickbaseRecord[114] = additionalWork.trenchingType; // Trenching Type
    quickbaseRecord[115] = ensureNumber(additionalWork.hvacCost); // HVAC Cost
    quickbaseRecord[116] = additionalWork.hvacContractor; // HVAC Contractor
    quickbaseRecord[117] = ensureNumber(additionalWork.subPanelCost); // Sub Panel Cost
    quickbaseRecord[118] = ensureNumber(additionalWork.generatorCost); // Generator Cost
    quickbaseRecord[119] = additionalWork.generatorType; // Generator Type
    quickbaseRecord[120] = ensureNumber(additionalWork.reRoofCost); // Re Roof Cost
  }
  
  // ===== ADDER MAPPING (Dynamic) =====
  if (pricing?.calculatedValueAdders || pricing?.calculatedSystemAdders) {
    const allAdders = [
      ...(pricing.calculatedValueAdders || []),
      ...(pricing.calculatedSystemAdders || [])
    ];
    
    // Map up to 5 adders to dedicated fields
    allAdders.slice(0, 5).forEach((adder, index) => {
      const fieldBase = 192 + (index * 5); // 192, 197, 202, 207, 212
      quickbaseRecord[fieldBase] = adder.displayName; // Adder Name
      quickbaseRecord[fieldBase + 1] = ensureNumber(adder.amount); // Adder Cost
      quickbaseRecord[fieldBase + 2] = adder.category || 'VALUE'; // Adder Category
      quickbaseRecord[fieldBase + 3] = ensureNumber(adder.ppw); // Adder PPW
      quickbaseRecord[fieldBase + 4] = ensureNumber(adder.quantity || 1); // Adder Quantity
    });
  }
  
  // ===== FINANCING INFORMATION =====
  if (pricing?.financeProduct) {
    const finance = pricing.financeProduct;
    quickbaseRecord[135] = finance.financeMethodName; // Finance Type
    quickbaseRecord[136] = finance.name; // Finance Product Name
    quickbaseRecord[137] = finance.id; // Finance Product ID
    quickbaseRecord[138] = finance.lenderName; // Lender Name
    quickbaseRecord[139] = state?.financingStatus; // Financing Status
    quickbaseRecord[140] = ensureNumber(finance.termMonths); // Loan Term Months
    quickbaseRecord[141] = finance.paymentStructure; // Payment Structure
    quickbaseRecord[142] = finance.downPaymentMethod; // Down Payment Method
  }
  
  // ===== FILES & DOCUMENTS =====
  if (deal?.files) {
    quickbaseRecord[152] = ensureNumber(deal.files.length); // Total Files Count
    
    // Find specific file types
    deal.files.forEach(file => {
      switch (file.source) {
        case 'signedContractFiles':
          quickbaseRecord[22] = file.url; // Contract URL
          quickbaseRecord[143] = file.name; // Contract Filename
          quickbaseRecord[144] = file.url; // Installation Agreement URL
          break;
        case 'full-utility-bill':
          quickbaseRecord[145] = file.url; // Utility Bill URL
          quickbaseRecord[146] = file.name; // Utility Bill Filename
          break;
        case 'customers-photo-id':
          quickbaseRecord[147] = file.url; // Customer ID Photo URL
          break;
        case 'proof-of-payment':
          quickbaseRecord[148] = file.url; // Proof of Payment URL
          break;
        case 'tree-quote':
          quickbaseRecord[149] = file.url; // Tree Quote URL
          break;
        case 'picture-of-site-of-tree-removal':
          quickbaseRecord[150] = file.url; // Tree Site Photo URL
          break;
        case 'additional-documentation':
          quickbaseRecord[151] = file.url; // Additional Docs URLs
          break;
      }
    });
  }
  
  // ===== JSON DATA FIELDS =====
  if (design?.arrays) {
    quickbaseRecord[58] = JSON.stringify(design.arrays); // Arrays JSON
  }
  
  if (pricing?.calculatedValueAdders) {
    quickbaseRecord[59] = JSON.stringify(pricing.calculatedValueAdders); // Value Adder JSON
  }
  
  if (pricing?.calculatedSystemAdders) {
    quickbaseRecord[60] = JSON.stringify(pricing.calculatedSystemAdders); // System Adders JSON
  }
  
  if (deal?.files) {
    quickbaseRecord[61] = JSON.stringify(deal.files); // All Files JSON
  }
  
  if (state?.['notes-comments']) {
    quickbaseRecord[62] = state['notes-comments']; // Sales Notes
  }
  
  if (state?.['system-offset']?.['layout-preferences']) {
    quickbaseRecord[63] = state['system-offset']['layout-preferences']; // Layout Preferences
  }
  
  if (pricing?.adderPricing) {
    quickbaseRecord[121] = JSON.stringify(pricing.adderPricing); // Adder Dynamic Inputs JSON
  }
  
  if (pricing) {
    quickbaseRecord[122] = JSON.stringify(pricing); // Pricing Model JSON
  }
  
  if (design?.consumptionProfile?.consumption) {
    quickbaseRecord[123] = JSON.stringify(design.consumptionProfile.consumption); // Monthly Consumption
  }
  
  if (state?.['additional-work-substage']?.additionalWork) {
    quickbaseRecord[124] = JSON.stringify(state['additional-work-substage'].additionalWork); // Additional Work Types
  }
  
  if (pricing?.rebates) {
    quickbaseRecord[96] = JSON.stringify(pricing.rebates); // Rebates JSON
  }
  
  // ===== METADATA & IDS =====
  quickbaseRecord[64] = customer?.id; // Customer ID
  quickbaseRecord[65] = deal?.salesRep?.id; // Sales Rep ID
  quickbaseRecord[66] = pricing?.salesTeams?.[0]?.name; // Sales Team Name
  quickbaseRecord[67] = pricing?.salesTeams?.[0]?.id; // Sales Team ID
  quickbaseRecord[68] = webhookPayload.payload.initiatedBy; // Initiated By User ID
  quickbaseRecord[69] = webhookPayload.payload.targetOrg; // Target Organization ID
  quickbaseRecord[70] = design?.installer?.id; // Installer Org ID
  quickbaseRecord[71] = webhookPayload.event; // Event Type
  quickbaseRecord[72] = proposal?.id; // Proposal ID
  
  // ===== DESIGN METADATA =====
  if (design) {
    quickbaseRecord[168] = design.id; // Design ID
    quickbaseRecord[169] = design.source?.tool; // Design Tool
    quickbaseRecord[170] = design.source?.id; // Design Source ID
  }
  
  // ===== WELCOME CALL DATA =====
  if (state?.['lender-welcome-call']) {
    const welcomeCall = state['lender-welcome-call'];
    quickbaseRecord[171] = welcomeCall.id; // Welcome Call ID
    quickbaseRecord[172] = formatDateForQuickBase(welcomeCall.date); // Welcome Call Date
    quickbaseRecord[173] = ensureNumber(welcomeCall.duration); // Welcome Call Duration
    quickbaseRecord[174] = welcomeCall.recordingUrl; // Welcome Call Recording URL
    quickbaseRecord[175] = JSON.stringify(welcomeCall.questions); // Welcome Call Questions JSON
    quickbaseRecord[176] = JSON.stringify(welcomeCall.answers); // Welcome Call Answers JSON
    quickbaseRecord[177] = welcomeCall.agent; // Welcome Call Agent
    quickbaseRecord[178] = welcomeCall.outcome; // Welcome Call Outcome
  }
  
  // ===== SETTER & CLOSER =====
  // These would need to be fetched from Enerflo API as they're not in webhook
  // For now, we'll leave them empty and handle in enrichment phase
  quickbaseRecord[218] = null; // Setter (lead owner)
  quickbaseRecord[219] = null; // Closer (sales rep)
  
  // ===== CLEAN UP NULL/UNDEFINED VALUES =====
  Object.keys(quickbaseRecord).forEach(key => {
    if (quickbaseRecord[key] === null || quickbaseRecord[key] === undefined) {
      delete quickbaseRecord[key];
    }
  });
  
  return quickbaseRecord;
}

module.exports = { mapWebhookToQuickBase };
