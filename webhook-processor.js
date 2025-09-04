const QuickBaseClient = require('./quickbase-client');

class WebhookProcessor {
  constructor() {
    this.qbClient = new QuickBaseClient();
  }

  /**
   * Process Enerflo webhook and sync to QuickBase
   */
  async processWebhook(webhookData) {
    try {
      const eventType = webhookData.event;
      const dealId = webhookData.payload?.deal?.id;
      
      if (!dealId) {
        throw new Error('No deal ID found in webhook payload');
      }

      console.log(`Processing ${eventType} for deal ${dealId}`);

      // Transform webhook data to QuickBase format
      const recordData = this.transformWebhookToQuickBase(webhookData);
      
      // Upsert record to QuickBase
      const result = await this.qbClient.upsertRecord(dealId, recordData);
      
      console.log(`✅ Successfully processed ${eventType} for deal ${dealId}`);
      return { success: true, dealId, eventType, result };
      
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      throw error;
    }
  }

  /**
   * Transform Enerflo webhook data to QuickBase record format
   */
  transformWebhookToQuickBase(webhook) {
    const payload = webhook.payload;
    const deal = payload.deal;
    const customer = payload.customer;
    const proposal = payload.proposal;
    
    // Helper functions
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

    const findFileByName = (files, name) => {
      if (!files) return '';
      const file = files.find(f => f.name && f.name.includes(name));
      return file ? file.url : '';
    };

    // Transform to QuickBase field format
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
      
      // System Design
      15: { value: calculateTotalPanels(proposal?.design?.arrays) }, // Total Panel Count
      20: { value: proposal?.design?.arrays?.[0]?.module?.model || '' }, // Panel Model
      23: { value: proposal?.design?.arrays?.[0]?.module?.manufacturer || '' }, // Panel Manufacturer
      24: { value: proposal?.design?.arrays?.[0]?.module?.capacity || 0 }, // Panel Watts Each
      26: { value: proposal?.design?.inverters?.[0]?.manufacturer || '' }, // Inverter Manufacturer
      27: { value: proposal?.design?.inverters?.[0]?.model || '' }, // Inverter Model
      28: { value: proposal?.design?.inverters?.[0]?.count || 0 }, // Inverter Count
      30: { value: proposal?.design?.roofMaterial || '' }, // Roof Material
      31: { value: proposal?.design?.mountingType || '' }, // Mounting Type
      32: { value: proposal?.design?.weightedTsrf || 0 }, // Weighted TSRF
      53: { value: proposal?.design?.firstYearProduction || 0 }, // Annual Production kWh
      54: { value: proposal?.design?.offset || 0 }, // System Offset Percent
      
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
      
      // Additional Work
      48: { value: deal.state?.['additional-work-substage']?.['tree-removal-contractor'] || '' }, // Tree Removal Contractor
      47: { value: findAdderAmount(proposal?.pricingOutputs?.adderPricing?.valueAdders, 'Tree Removal') }, // Tree Removal Cost
      109: { value: deal.state?.['additional-work-substage']?.['tree-trimming-contractor'] || '' }, // Tree Trimming Contractor
      108: { value: findAdderAmount(proposal?.pricingOutputs?.adderPricing?.valueAdders, 'Tree Trimming') }, // Tree Trimming Cost
      49: { value: deal.state?.['additional-work-substage']?.['how-many-optional-electrical-upgrades-are-needed'] || 0 }, // Electrical Upgrades Count
      50: { value: findAdderAmount(proposal?.pricingOutputs?.adderPricing?.systemAdders, 'Electrical Upgrade If Needed') }, // Electrical Upgrades Total
      
      // Finance Info
      135: { value: proposal?.pricingOutputs?.financeProduct?.financeMethodName || '' }, // Finance Type
      136: { value: proposal?.pricingOutputs?.financeProduct?.name || '' }, // Finance Product Name
      137: { value: proposal?.pricingOutputs?.financeProduct?.id || '' }, // Finance Product ID
      139: { value: deal.state?.financingStatus || '' }, // Financing Status
      140: { value: proposal?.pricingOutputs?.financeProduct?.termMonths || 0 }, // Loan Term Months
      142: { value: deal.state?.['lender-welcome-call']?.['how-is-the-customer-making-their-down-payment'] || '' }, // Down Payment Method
      
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

  /**
   * Test webhook processing with sample data
   */
  async testProcessing() {
    try {
      console.log('🧪 Testing webhook processing...');
      
      // Test QuickBase connection first
      const connectionTest = await this.qbClient.testConnection();
      if (!connectionTest) {
        throw new Error('QuickBase connection failed');
      }
      
      console.log('✅ QuickBase connection successful');
      console.log('✅ Webhook processor ready');
      
      return { success: true, message: 'Webhook processor is ready' };
    } catch (error) {
      console.error('❌ Webhook processor test failed:', error);
      throw error;
    }
  }
}

module.exports = WebhookProcessor;
