const FieldValidator = require('./field-validator');

class DataMapper {
  constructor() {
    this.validator = new FieldValidator();
  }

  // Helper function to safely get nested values
  safeGet(obj, path, defaultValue = '') {
    try {
      return path.split('.').reduce((current, key) => {
        if (current && typeof current === 'object' && key in current) {
          return current[key];
        }
        return undefined;
      }, obj) || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  // Helper function to find files by source
  findFileBySource(files, source) {
    if (!files || !Array.isArray(files)) return '';
    const file = files.find(f => f.source === source);
    return file ? file.url : '';
  }

  // Helper function to get tree removal data
  getTreeRemovalData(deal) {
    const treeRemoval = this.safeGet(deal, 'treeRemoval');
    return {
      cost: this.safeGet(treeRemoval, 'cost', 0),
      contractor: this.safeGet(treeRemoval, 'contractor', ''),
      phone: this.safeGet(treeRemoval, 'phone', ''),
      quoteUrl: this.findFileBySource(deal.files, 'tree-quote')
    };
  }

  // Helper function to get utility data
  getUtilityData(deal) {
    const utility = this.safeGet(deal, 'utility');
    return {
      companyName: this.safeGet(utility, 'companyName', ''),
      annualConsumption: this.safeGet(utility, 'annualConsumption', 0),
      averageMonthlyBill: this.safeGet(utility, 'averageMonthlyBill', 0),
      ratePerKwh: this.safeGet(utility, 'ratePerKwh', 0)
    };
  }

  // Helper function to get address data
  getAddressData(deal) {
    const address = this.safeGet(deal, 'address');
    return {
      line1: this.safeGet(address, 'line1', ''),
      city: this.safeGet(address, 'city', ''),
      state: this.safeGet(address, 'state', ''),
      zip: this.safeGet(address, 'zip', ''),
      latitude: this.safeGet(address, 'latitude', 0),
      longitude: this.safeGet(address, 'longitude', 0)
    };
  }

  // Helper function to get first array module data
  getFirstArrayModule(proposal) {
    const arrays = this.safeGet(proposal, 'pricingOutputs.design.arrays', []);
    if (arrays.length === 0) return {};
    
    const firstArray = arrays[0];
    const modules = this.safeGet(firstArray, 'modules', []);
    if (modules.length === 0) return {};
    
    return modules[0];
  }

  // Helper function to calculate total panels
  calculateTotalPanels(proposal) {
    const arrays = this.safeGet(proposal, 'pricingOutputs.design.arrays', []);
    return arrays.reduce((total, array) => {
      const modules = this.safeGet(array, 'modules', []);
      return total + modules.reduce((arrayTotal, module) => {
        return arrayTotal + (this.safeGet(module, 'quantity', 0));
      }, 0);
    }, 0);
  }

  // Helper function to find adder amount
  findAdderAmount(adders, name) {
    if (!adders || !Array.isArray(adders)) return 0;
    const adder = adders.find(a => a.displayName === name);
    return adder ? (this.safeGet(adder, 'amount', 0)) : 0;
  }

  // Helper function to get contract URL
  getContractUrl(deal) {
    return this.findFileBySource(deal.files, 'signedContractFiles') || 
           this.findFileBySource(deal.files, 'contract') || '';
  }

  // Main mapping function
  mapWebhookToQuickBase(webhookPayload) {
    console.log('🔄 Mapping webhook data to QuickBase fields...');
    
    const { event, payload } = webhookPayload;
    const { deal, customer, proposal } = payload;

    // Validate required data
    if (!deal || !customer || !proposal) {
      throw new Error('Missing required data: deal, customer, or proposal');
    }

    // Get helper data
    const treeData = this.getTreeRemovalData(deal);
    const utilityData = this.getUtilityData(deal);
    const addressData = this.getAddressData(deal);
    const firstModule = this.getFirstArrayModule(proposal);
    const totalPanels = this.calculateTotalPanels(proposal);

    // Calculate system size in kW
    const systemSizeWatts = this.safeGet(proposal, 'pricingOutputs.design.systemSize', 0);
    const systemSizeKw = systemSizeWatts / 1000;

    // Calculate offset percentage
    const offset = this.safeGet(proposal, 'pricingOutputs.design.offset', 0);
    const offsetPercent = Math.round((offset || 0) * 100);

    // Get adders
    const systemAdders = this.safeGet(proposal, 'pricingOutputs.calculatedSystemAdders', []);
    const valueAdders = this.safeGet(proposal, 'pricingOutputs.calculatedValueAdders', []);

    // Build the complete field mapping
    const mappings = {
      // Basic Deal Information
      5: { value: deal.id || '', comment: 'Enerflo Deal ID' },
      6: { value: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(), comment: 'Customer Full Name' },
      7: { value: customer.email || '', comment: 'Customer Email' },
      10: { value: customer.phone || '', comment: 'Customer Phone' },
      11: { value: deal.status || '', comment: 'Project Status' },
      12: { value: deal.submittedAt || new Date().toISOString(), comment: 'Submission Date' },
      14: { value: systemSizeKw, comment: 'System Size kW' },
      15: { value: totalPanels, comment: 'Total Panel Count' },
      16: { value: customer.firstName || '', comment: 'Customer First Name' },
      17: { value: customer.lastName || '', comment: 'Customer Last Name' },
      18: { value: `${addressData.line1}, ${addressData.city}, ${addressData.state} ${addressData.zip}`.trim(), comment: 'Address Full' },
      19: { value: systemSizeWatts, comment: 'System Size Watts' },

      // Panel Information
      20: { value: this.safeGet(firstModule, 'model', ''), comment: 'Panel Model' },
      23: { value: this.safeGet(firstModule, 'manufacturer', ''), comment: 'Panel Manufacturer' },
      24: { value: this.safeGet(firstModule, 'watts', 0), comment: 'Panel Watts Each' },
      25: { value: this.safeGet(firstModule, 'name', ''), comment: 'Panel Name' },
      79: { value: this.safeGet(firstModule, 'efficiency', 0), comment: 'Panel Efficiency' },
      80: { value: this.safeGet(firstModule, 'degradation', 0), comment: 'Panel Degradation' },
      81: { value: this.safeGet(firstModule, 'width', 0), comment: 'Panel Width mm' },
      82: { value: this.safeGet(firstModule, 'length', 0), comment: 'Panel Length mm' },

      // Financial Information
      21: { value: this.safeGet(proposal, 'pricingOutputs.grossCost', 0), comment: 'Gross Cost' },
      22: { value: this.getContractUrl(deal), comment: 'Contract URL' },
      32: { value: this.safeGet(proposal, 'pricingOutputs.baseCost', 0), comment: 'Base Cost' },
      33: { value: this.safeGet(proposal, 'pricingOutputs.netCost', 0), comment: 'Net Cost After ITC' },
      34: { value: this.safeGet(proposal, 'pricingOutputs.basePPW', 0), comment: 'Base PPW' },
      35: { value: this.safeGet(proposal, 'pricingOutputs.grossPPW', 0), comment: 'Gross PPW' },
      36: { value: this.safeGet(proposal, 'pricingOutputs.federalITCAmount', 0), comment: 'Federal ITC Amount' },
      37: { value: this.safeGet(proposal, 'pricingOutputs.downPaymentAmount', 0), comment: 'Down Payment Amount' },
      38: { value: this.safeGet(proposal, 'pricingOutputs.totalAddersAmount', 0), comment: 'Total Adders Amount' },
      39: { value: this.safeGet(proposal, 'pricingOutputs.financeCost', 0), comment: 'Finance Cost' },
      93: { value: this.safeGet(proposal, 'pricingOutputs.netPPW', 0), comment: 'Net PPW' },
      94: { value: 30, comment: 'Federal ITC Percent' },
      95: { value: this.safeGet(proposal, 'pricingOutputs.rebatesTotal', 0), comment: 'Rebates Total' },
      97: { value: this.safeGet(proposal, 'pricingOutputs.dealerFeePercent', 0), comment: 'Dealer Fee Percent' },
      98: { value: this.safeGet(proposal, 'pricingOutputs.downPaymentPercent', 0), comment: 'Down Payment Percent' },
      99: { value: this.safeGet(proposal, 'pricingOutputs.equipmentTotal', 0), comment: 'Equipment Total' },
      100: { value: this.safeGet(proposal, 'pricingOutputs.moduleTotalCost', 0), comment: 'Module Total Cost' },
      101: { value: this.safeGet(proposal, 'pricingOutputs.inverterTotalCost', 0), comment: 'Inverter Total Cost' },
      102: { value: this.safeGet(proposal, 'pricingOutputs.taxRate', 0), comment: 'Tax Rate' },
      103: { value: this.safeGet(proposal, 'pricingOutputs.taxAmount', 0), comment: 'Tax Amount' },
      104: { value: this.safeGet(proposal, 'pricingOutputs.valueAddersTotal', 0), comment: 'Value Adders Total' },
      105: { value: this.safeGet(proposal, 'pricingOutputs.systemAddersTotal', 0), comment: 'System Adders Total' },
      106: { value: (systemAdders.length + valueAdders.length), comment: 'Adders Count' },
      96: { value: this.safeGet(proposal, 'pricingOutputs.dealerFee', 0), comment: 'Dealer Fee' },

      // System Adders
      50: { value: this.findAdderAmount(systemAdders, 'Electrical Upgrade If Needed'), comment: 'Electrical Upgrades Total' },
      51: { value: this.findAdderAmount(systemAdders, 'Metal Roof Adder'), comment: 'Metal Roof Adder' },
      52: { value: this.findAdderAmount(systemAdders, 'Trenching Cost'), comment: 'Trenching Cost' },
      115: { value: this.findAdderAmount(systemAdders, 'HVAC Cost'), comment: 'HVAC Cost' },
      117: { value: this.findAdderAmount(systemAdders, 'Sub Panel Cost'), comment: 'Sub Panel Cost' },
      118: { value: this.findAdderAmount(systemAdders, 'Generator Cost'), comment: 'Generator Cost' },
      120: { value: this.findAdderAmount(systemAdders, 'Re Roof Cost'), comment: 'Re Roof Cost' },

      // Tree Removal
      47: { value: treeData.cost, comment: 'Tree Removal Cost' },
      48: { value: treeData.contractor, comment: 'Tree Removal Contractor' },
      108: { value: this.findAdderAmount(systemAdders, 'Tree Trimming Cost'), comment: 'Tree Trimming Cost' },
      109: { value: this.findAdderAmount(systemAdders, 'Tree Trimming Contractor'), comment: 'Tree Trimming Contractor' },
      110: { value: treeData.phone, comment: 'Tree Contractor Phone' },
      149: { value: treeData.quoteUrl, comment: 'Tree Quote URL' },
      150: { value: this.findFileBySource(deal.files, 'picture-of-site-of-tree-removal'), comment: 'Tree Site Photo URL' },

      // Utility Information
      54: { value: offsetPercent, comment: 'System Offset Percent' },
      55: { value: utilityData.companyName, comment: 'Utility Company Name' },
      56: { value: utilityData.annualConsumption, comment: 'Annual Consumption kWh' },
      57: { value: utilityData.averageMonthlyBill, comment: 'Average Monthly Bill' },
      130: { value: utilityData.ratePerKwh, comment: 'Utility Rate per kWh' },

      // Address Information
      73: { value: addressData.line1, comment: 'Address Line 1' },
      74: { value: addressData.city, comment: 'Address City' },
      75: { value: addressData.state, comment: 'Address State' },
      76: { value: addressData.zip, comment: 'Address Zip' },
      77: { value: addressData.latitude, comment: 'Address Latitude' },
      78: { value: addressData.longitude, comment: 'Address Longitude' },

      // JSON Fields
      58: { value: JSON.stringify(this.safeGet(proposal, 'pricingOutputs.design.arrays', [])), comment: 'Arrays JSON' },
      59: { value: JSON.stringify(valueAdders), comment: 'Value Adder JSON' },
      60: { value: JSON.stringify(systemAdders), comment: 'System Adders JSON' },
      61: { value: JSON.stringify(deal.files || []), comment: 'All Files JSON' },
      95: { value: JSON.stringify(this.safeGet(proposal, 'pricingOutputs.rebates', [])), comment: 'Rebates JSON' },

      // Sales Information
      62: { value: this.safeGet(deal, 'state.notes-comments', ''), comment: 'Sales Notes' },
      63: { value: this.safeGet(deal, 'state.layout-preferences', ''), comment: 'Layout Preferences' },
      64: { value: customer.id || '', comment: 'Customer ID' },
      65: { value: this.safeGet(deal, 'salesRep.id', ''), comment: 'Sales Rep ID' },
      66: { value: this.safeGet(deal, 'salesTeam.name', ''), comment: 'Sales Team Name' },
      67: { value: this.safeGet(deal, 'salesTeam.id', ''), comment: 'Sales Team ID' },
      68: { value: payload.initiatedBy || '', comment: 'Initiated By User ID' },
      69: { value: this.safeGet(deal, 'targetOrganization.id', ''), comment: 'Target Organization ID' },
      70: { value: this.safeGet(deal, 'installerOrg.id', ''), comment: 'Installer Org ID' },
      71: { value: event || '', comment: 'Event Type' },
      72: { value: proposal.id || '', comment: 'Proposal ID' },

      // Checkbox Fields
      40: { value: !!this.getContractUrl(deal), comment: 'Has Signed Contract' },
      41: { value: !!proposal, comment: 'Has Design' },
      42: { value: this.safeGet(deal, 'welcomeCall.completed', false), comment: 'Welcome Call Completed' },
      43: { value: this.safeGet(deal, 'financing.approved', false), comment: 'Financing Approved' },
      44: { value: this.safeGet(deal, 'siteSurvey.scheduled', false), comment: 'Site Survey Scheduled' },
      45: { value: this.safeGet(deal, 'additionalWork.needed', false), comment: 'Additional Work Needed' },
      85: { value: this.safeGet(proposal, 'pricingOutputs.design.isMicroinverter', false), comment: 'Is Microinverter' },
      153: { value: !!proposal, comment: 'Has Created Proposal' },
      154: { value: !!this.getContractUrl(deal), comment: 'Has Approved Contract' },
      155: { value: !!deal.submittedAt, comment: 'Has Submitted Project' },
      156: { value: !!this.safeGet(deal, 'contract.generated', false), comment: 'Has Generated Contract' },
      157: { value: this.safeGet(deal, 'financing.submitted', false), comment: 'Has Submitted Financing' },
      158: { value: this.safeGet(deal, 'financing.signedDocs', false), comment: 'Has Signed Financing Docs' },
      159: { value: this.safeGet(deal, 'contract.noDocumentsToSign', false), comment: 'No Documents to Sign' },
      160: { value: this.safeGet(deal, 'contract.approvalEnabled', false), comment: 'Contract Approval Enabled' },
      161: { value: this.safeGet(deal, 'readyToSubmit', false), comment: 'Ready to Submit' },
      162: { value: this.safeGet(deal, 'salesRep.confirmation', false), comment: 'Sales Rep Confirmation' },
      165: { value: this.safeGet(deal, 'shading.concerns', false), comment: 'Shading Concerns' },
      166: { value: offsetPercent < 100, comment: 'System Offset Below 100%' },

      // File Information
      143: { value: this.safeGet(deal, 'files.find(f => f.source === "signedContractFiles").name', ''), comment: 'Contract Filename' },
      144: { value: this.findFileBySource(deal.files, 'installation-agreement'), comment: 'Installation Agreement URL' },
      145: { value: this.findFileBySource(deal.files, 'utility-bill'), comment: 'Utility Bill URL' },
      146: { value: this.safeGet(deal, 'files.find(f => f.source === "utility-bill").name', ''), comment: 'Utility Bill Filename' },
      147: { value: this.findFileBySource(deal.files, 'customers-photo-id'), comment: 'Customer ID Photo URL' },
      148: { value: this.findFileBySource(deal.files, 'proof-of-payment'), comment: 'Proof of Payment URL' },
      151: { value: JSON.stringify(deal.files?.filter(f => f.source === 'additional-documentation').map(f => f.url) || []), comment: 'Additional Docs URLs' },
      152: { value: deal.files?.filter(f => f.source === 'additional-documentation').length || 0, comment: 'Total Files Count' },

      // Individual Adders (first 5)
      192: { value: this.safeGet(valueAdders, '0.displayName', ''), comment: 'Adder 1 Name' },
      193: { value: this.safeGet(valueAdders, '0.amount', 0), comment: 'Adder 1 Cost' },
      194: { value: this.safeGet(valueAdders, '0.category', ''), comment: 'Adder 1 Category' },
      195: { value: this.safeGet(valueAdders, '0.quantity', 0), comment: 'Adder 1 Quantity' },
      196: { value: this.safeGet(valueAdders, '0.ppw', 0), comment: 'Adder 1 PPW' },
      197: { value: this.safeGet(valueAdders, '1.displayName', ''), comment: 'Adder 2 Name' },
      198: { value: this.safeGet(valueAdders, '1.amount', 0), comment: 'Adder 2 Cost' },
      199: { value: this.safeGet(valueAdders, '1.category', ''), comment: 'Adder 2 Category' },
      200: { value: this.safeGet(valueAdders, '1.quantity', 0), comment: 'Adder 2 Quantity' },
      201: { value: this.safeGet(valueAdders, '1.ppw', 0), comment: 'Adder 2 PPW' },
      202: { value: this.safeGet(valueAdders, '2.displayName', ''), comment: 'Adder 3 Name' },
      203: { value: this.safeGet(valueAdders, '2.amount', 0), comment: 'Adder 3 Cost' },
      204: { value: this.safeGet(valueAdders, '2.category', ''), comment: 'Adder 3 Category' },
      205: { value: this.safeGet(valueAdders, '2.quantity', 0), comment: 'Adder 3 Quantity' },
      206: { value: this.safeGet(valueAdders, '2.ppw', 0), comment: 'Adder 3 PPW' },
      207: { value: this.safeGet(valueAdders, '3.displayName', ''), comment: 'Adder 4 Name' },
      208: { value: this.safeGet(valueAdders, '3.amount', 0), comment: 'Adder 4 Cost' },
      209: { value: this.safeGet(valueAdders, '3.category', ''), comment: 'Adder 4 Category' },
      210: { value: this.safeGet(valueAdders, '3.quantity', 0), comment: 'Adder 4 Quantity' },
      211: { value: this.safeGet(valueAdders, '3.ppw', 0), comment: 'Adder 4 PPW' },
      212: { value: this.safeGet(valueAdders, '4.displayName', ''), comment: 'Adder 5 Name' },
      213: { value: this.safeGet(valueAdders, '4.amount', 0), comment: 'Adder 5 Cost' },
      214: { value: this.safeGet(valueAdders, '4.category', ''), comment: 'Adder 5 Category' },
      215: { value: this.safeGet(valueAdders, '4.quantity', 0), comment: 'Adder 5 Quantity' },
      216: { value: this.safeGet(valueAdders, '4.ppw', 0), comment: 'Adder 5 PPW' },

      // Setter and Closer
      218: { value: this.safeGet(deal, 'salesRep.id', payload.initiatedBy || ''), comment: 'Setter (Lead Owner)' },
      219: { value: this.safeGet(deal, 'salesRep.id', payload.initiatedBy || ''), comment: 'Closer (Sales Rep)' }
    };

    // Validate all mappings
    const isValid = this.validator.validateAllMappings(mappings);
    
    if (!isValid) {
      throw new Error('Field mapping validation failed. Check the validation results above.');
    }

    console.log(`✅ Successfully mapped ${Object.keys(mappings).length} fields to QuickBase`);
    return mappings;
  }
}

module.exports = DataMapper;
