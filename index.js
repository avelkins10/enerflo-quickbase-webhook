// Complete Field Mapping for Enerflo Webhook → QuickBase
// This captures ALL data from the webhook payload

function mapEnerfloToQuickBase(payload) {
    const deal = payload.deal || {};
    const customer = payload.customer || {};
    const proposal = payload.proposal || {};
    const design = payload.design || proposal.design || {};
    const pricing = proposal.pricingOutputs || {};
    const adderPricing = pricing.adderPricing || {};
    const withDealerFees = pricing.withDealerFees || {};
    const financeProduct = pricing.financeProduct || {};
    const salesRep = payload.salesRep || {};
    const state = deal.state || {};
    const files = deal.files || [];
    
    // Helper function to safely access nested properties
    const safe = (fn, defaultVal = '') => {
        try {
            const result = fn();
            return result !== undefined && result !== null ? result : defaultVal;
        } catch {
            return defaultVal;
        }
    };
    
    // Process files by type
    const contractFiles = files.filter(f => f.source === 'signedContractFiles' || f.name?.includes('contract'));
    const utilityBillFiles = files.filter(f => f.source === 'full-utility-bill');
    const photoIdFiles = files.filter(f => f.source === 'customers-photo-id');
    const proofPaymentFiles = files.filter(f => f.source === 'proof-of-payment');
    const treeQuoteFiles = files.filter(f => f.source === 'tree-quote');
    const treePhotoFiles = files.filter(f => f.source === 'picture-of-site-of-tree-removal');
    const additionalFiles = files.filter(f => f.source === 'additional-documentation');
    
    // Parse adders with complete details
    const valueAdders = safe(() => withDealerFees.calculatedValueAdders || adderPricing.valueAdders, []);
    const systemAdders = safe(() => withDealerFees.calculatedSystemAdders || adderPricing.systemAdders, []);
    const allAdders = [...valueAdders, ...systemAdders];
    
    // Calculate totals
    const systemSizeKw = (design.totalSystemSizeWatts || design.cumulativeSystemSizeWatts || 0) / 1000;
    const totalPanelCount = design.arrays ? design.arrays.reduce((sum, arr) => sum + (arr.moduleCount || 0), 0) : 0;
    
    // Map to QuickBase fields - COMPLETE 217 FIELD MAPPING
    const qbRecord = {
        // ========== CORE IDENTIFICATION ==========
        "6": { "value": deal.id }, // Enerflo Deal ID
        "7": { "value": customer.firstName || "" }, // Customer First Name
        "8": { "value": customer.lastName || "" }, // Customer Last Name
        "9": { "value": `${customer.firstName || ''} ${customer.lastName || ''}`.trim() }, // Customer Full Name
        "10": { "value": customer.email || "" }, // Customer Email
        "11": { "value": customer.phone || "" }, // Customer Phone
        "12": { "value": customer.id || "" }, // Customer ID
        "13": { "value": deal.shortCode || "" }, // Deal Short Code
        
        // ========== PROJECT STATUS ==========
        "14": { "value": "Submitted" }, // Project Status
        "15": { "value": new Date().toISOString() }, // Submission Date
        "16": { "value": state.financingStatus || "" }, // Financing Status
        "17": { "value": state.hasDesign ? "Yes" : "No" }, // Has Design
        "18": { "value": state.hasSignedContract ? "Yes" : "No" }, // Has Signed Contract
        "19": { "value": state.hasCreatedProposal ? "Yes" : "No" }, // Has Created Proposal
        "20": { "value": state.hasApprovedContract ? "Yes" : "No" }, // Has Approved Contract
        "21": { "value": state.hasSubmittedProject ? "Yes" : "No" }, // Has Submitted Project
        "22": { "value": state.hasGeneratedContract ? "Yes" : "No" }, // Has Generated Contract
        "23": { "value": state.hasSubmittedFinancingApplication ? "Yes" : "No" }, // Has Submitted Financing
        "24": { "value": state.hasSignedFinancingDocs ? "Yes" : "No" }, // Has Signed Financing Docs
        "25": { "value": state.noDocumentsToSign ? "Yes" : "No" }, // No Documents to Sign
        "26": { "value": state.contractApprovalEnabled ? "Yes" : "No" }, // Contract Approval Enabled
        "27": { "value": state['complete-call-pilot-welcome-call'] ? "Yes" : "No" }, // Welcome Call Completed
        
        // ========== SYSTEM SPECIFICATIONS ==========
        "28": { "value": systemSizeKw }, // System Size kW
        "29": { "value": design.totalSystemSizeWatts || 0 }, // System Size Watts
        "30": { "value": totalPanelCount }, // Total Panel Count
        "31": { "value": design.arrays?.length || 0 }, // Array Count
        "32": { "value": safe(() => design.arrays[0].module.model, "") }, // Panel Model
        "33": { "value": safe(() => design.arrays[0].module.manufacturer, "") }, // Panel Manufacturer
        "34": { "value": safe(() => design.arrays[0].module.capacity, 0) }, // Panel Watts Each
        "35": { "value": safe(() => design.arrays[0].module.name, "") }, // Panel Name
        "36": { "value": safe(() => design.arrays[0].module.efficiency, 0) }, // Panel Efficiency
        "37": { "value": safe(() => design.arrays[0].module.degradation, 0) }, // Panel Degradation
        "38": { "value": safe(() => design.arrays[0].module.width, 0) }, // Panel Width mm
        "39": { "value": safe(() => design.arrays[0].module.length, 0) }, // Panel Length mm
        
        // ========== INVERTER DETAILS ==========
        "40": { "value": safe(() => design.inverters[0].manufacturer, "") }, // Inverter Manufacturer
        "41": { "value": safe(() => design.inverters[0].model, "") }, // Inverter Model
        "42": { "value": safe(() => design.inverters[0].count || 1, 1) }, // Inverter Count
        "43": { "value": safe(() => design.inverters[0].acOutput, 0) }, // Inverter AC Output
        "44": { "value": safe(() => design.inverters[0].efficiency, 0) }, // Inverter Efficiency
        "45": { "value": safe(() => design.inverters[0].isMicro ? "Yes" : "No", "No") }, // Is Microinverter
        "46": { "value": safe(() => design.inverters[0].panelRatio, 0) }, // DC AC Ratio
        
        // ========== ROOF & MOUNTING ==========
        "47": { "value": design.roofMaterial || "" }, // Roof Material
        "48": { "value": design.mountingType || "" }, // Mounting Type
        "49": { "value": design.weightedTsrf || 0 }, // Weighted TSRF
        "50": { "value": design.offset || 0 }, // System Offset Percent
        
        // ========== PRICING - BASE ==========
        "51": { "value": pricing.baseCost || 0 }, // Base Cost
        "52": { "value": pricing.grossCost || 0 }, // Gross Cost
        "53": { "value": pricing.netCost || 0 }, // Net Cost After ITC
        "54": { "value": pricing.financeCost || 0 }, // Finance Cost
        "55": { "value": pricing.basePPW || 0 }, // Base PPW
        "56": { "value": pricing.grossPPW || 0 }, // Gross PPW
        "57": { "value": pricing.netPPW || 0 }, // Net PPW
        "58": { "value": pricing.commissionBase || 0 }, // Commission Base
        
        // ========== REBATES & INCENTIVES ==========
        "59": { "value": safe(() => pricing.rebates[0].displayName === "Federal Tax Credit" ? pricing.rebates[0].pricingOption.inputs.itcPercent * 100 : 30, 30) }, // Federal ITC Percent
        "60": { "value": pricing.rebatesTotal || 0 }, // Federal ITC Amount
        "61": { "value": pricing.rebatesTotal || 0 }, // Rebates Total
        "62": { "value": JSON.stringify(pricing.rebates || []) }, // Rebates JSON
        
        // ========== FINANCING ==========
        "63": { "value": pricing.downPayment || 0 }, // Down Payment Percent
        "64": { "value": (pricing.downPayment || 0) * (pricing.grossCost || 0) }, // Down Payment Amount
        "65": { "value": pricing.dealerFee || 0 }, // Dealer Fee
        "66": { "value": pricing.dealerFeePercent || 0 }, // Dealer Fee Percent
        "67": { "value": financeProduct.plugin || "" }, // Finance Type
        "68": { "value": financeProduct.name || "" }, // Finance Product Name
        "69": { "value": financeProduct.id || "" }, // Finance Product ID
        "70": { "value": state['lender-welcome-call']?.['lender-dropdown'] || "" }, // Lender Name
        "71": { "value": financeProduct.termMonths || 0 }, // Loan Term Months
        "72": { "value": state['lender-welcome-call']?.['how-is-the-customer-making-their-down-payment'] || "" }, // Down Payment Method
        
        // ========== ADDERS - TOTALS ==========
        "73": { "value": withDealerFees.valueAddersTotal || pricing.valueAddersTotal || 0 }, // Value Adders Total
        "74": { "value": withDealerFees.systemAddersTotal || pricing.systemAddersTotal || 0 }, // System Adders Total
        "75": { "value": (withDealerFees.valueAddersTotal || 0) + (withDealerFees.systemAddersTotal || 0) }, // Total Adders Amount
        "76": { "value": allAdders.length }, // Adders Count
        
        // ========== SPECIFIC ADDERS ==========
        "77": { "value": safe(() => valueAdders.find(a => a.name.includes('Tree Removal'))?.amount, 0) }, // Tree Removal Cost
        "78": { "value": state['additional-work-substage']?.['tree-removal-contractor'] || "" }, // Tree Removal Contractor
        "79": { "value": state['additional-work-substage']?.['tree-removal-contractor-phone-number'] || "" }, // Tree Contractor Phone
        "80": { "value": safe(() => valueAdders.find(a => a.name.includes('Tree Trimming'))?.amount, 0) }, // Tree Trimming Cost
        "81": { "value": state['additional-work-substage']?.['tree-trimming-contractor'] || "" }, // Tree Trimming Contractor
        "82": { "value": safe(() => systemAdders.find(a => a.name.includes('Electrical'))?.fieldInputs?.['how-many-optional-electrical-upgrades-are-needed'], 0) }, // Electrical Upgrades Count
        "83": { "value": safe(() => systemAdders.find(a => a.name.includes('Electrical'))?.amount, 0) }, // Electrical Upgrades Total
        "84": { "value": safe(() => systemAdders.find(a => a.name.includes('Electrical'))?.costPerUpgrade, 0) }, // Electrical Cost Each
        "85": { "value": safe(() => systemAdders.find(a => a.name.includes('Metal Roof'))?.amount, 0) }, // Metal Roof Adder
        "86": { "value": safe(() => systemAdders.find(a => a.name.includes('Metal Roof'))?.ppw, 0) }, // Metal Roof PPW
        "87": { "value": safe(() => valueAdders.find(a => a.name.includes('Trenching'))?.amount, 0) }, // Trenching Cost
        "88": { "value": safe(() => valueAdders.find(a => a.name.includes('Trenching'))?.fieldInputs?.['how-many-feet-of-trenching'], 0) }, // Trenching Linear Feet
        "89": { "value": safe(() => valueAdders.find(a => a.name.includes('Trenching (Concrete)')) ? "Concrete" : "Dirt", "") }, // Trenching Type
        "90": { "value": safe(() => valueAdders.find(a => a.name.includes('HVAC'))?.amount, 0) }, // HVAC Cost
        "91": { "value": safe(() => valueAdders.find(a => a.name.includes('HVAC'))?.fieldInputs?.['who-is-the-hvac-sub'], "") }, // HVAC Contractor
        "92": { "value": safe(() => valueAdders.find(a => a.name.includes('Sub Panel'))?.amount, 0) }, // Sub Panel Cost
        "93": { "value": safe(() => valueAdders.find(a => a.name.includes('Generator'))?.amount, 0) }, // Generator Cost
        "94": { "value": safe(() => valueAdders.find(a => a.name.includes('Generator'))?.name, "") }, // Generator Type
        "95": { "value": safe(() => valueAdders.find(a => a.name.includes('Re-Roof'))?.amount, 0) }, // Re Roof Cost
        
        // ========== ITEMIZED ADDERS (1-5) ==========
        "96": { "value": allAdders[0]?.displayName || allAdders[0]?.name || "" }, // Adder 1 Name
        "97": { "value": allAdders[0]?.amount || 0 }, // Adder 1 Cost
        "98": { "value": valueAdders.includes(allAdders[0]) ? "Value" : "System" }, // Adder 1 Category
        "99": { "value": allAdders[0]?.ppw || 0 }, // Adder 1 PPW
        "100": { "value": allAdders[0]?.qty || 1 }, // Adder 1 Quantity
        
        "101": { "value": allAdders[1]?.displayName || allAdders[1]?.name || "" }, // Adder 2 Name
        "102": { "value": allAdders[1]?.amount || 0 }, // Adder 2 Cost
        "103": { "value": valueAdders.includes(allAdders[1]) ? "Value" : "System" }, // Adder 2 Category
        "104": { "value": allAdders[1]?.qty || 1 }, // Adder 2 Quantity
        "105": { "value": allAdders[1]?.ppw || 0 }, // Adder 2 PPW
        
        "106": { "value": allAdders[2]?.displayName || allAdders[2]?.name || "" }, // Adder 3 Name
        "107": { "value": allAdders[2]?.amount || 0 }, // Adder 3 Cost
        "108": { "value": allAdders[2]?.qty || 1 }, // Adder 3 Quantity
        "109": { "value": allAdders[2]?.ppw || 0 }, // Adder 3 PPW
        "217": { "value": valueAdders.includes(allAdders[2]) ? "Value" : "System" }, // Adder 3 Category
        
        "110": { "value": allAdders[3]?.displayName || allAdders[3]?.name || "" }, // Adder 4 Name
        "111": { "value": valueAdders.includes(allAdders[3]) ? "Value" : "System" }, // Adder 4 Category
        "112": { "value": allAdders[3]?.amount || 0 }, // Adder 4 Cost
        "113": { "value": allAdders[3]?.qty || 1 }, // Adder 4 Quantity
        "114": { "value": allAdders[3]?.ppw || 0 }, // Adder 4 PPW
        
        "115": { "value": allAdders[4]?.displayName || allAdders[4]?.name || "" }, // Adder 5 Name
        "116": { "value": valueAdders.includes(allAdders[4]) ? "Value" : "System" }, // Adder 5 Category
        "117": { "value": allAdders[4]?.amount || 0 }, // Adder 5 Cost
        "118": { "value": allAdders[4]?.qty || 1 }, // Adder 5 Quantity
        "119": { "value": allAdders[4]?.ppw || 0 }, // Adder 5 PPW
        
        // ========== PRODUCTION & CONSUMPTION ==========
        "120": { "value": design.firstYearProduction || 0 }, // Annual Production kWh
        "121": { "value": safe(() => design.consumptionProfile?.annualConsumption, 0) }, // Annual Consumption kWh
        "122": { "value": safe(() => design.consumptionProfile?.averageMonthlyBill, 0) }, // Average Monthly Bill
        "123": { "value": safe(() => design.consumptionProfile?.averageMonthlyConsumption, 0) }, // Average Monthly Usage
        "124": { "value": safe(() => design.consumptionProfile?.buildingArea, 0) }, // Building Area sqft
        
        // ========== UTILITY ==========
        "125": { "value": safe(() => design.utility?.name || design.consumptionProfile?.utility?.name, "") }, // Utility Company Name
        "126": { "value": safe(() => design.utility?.id || design.consumptionProfile?.utility?.id, "") }, // Utility Company ID
        "127": { "value": safe(() => design.utility?.genabilityId || design.consumptionProfile?.utility?.genabilityId, "") }, // Genability Utility ID
        "128": { "value": safe(() => design.consumptionProfile?.tariff?.tariffName, "") }, // Rate Schedule Name
        "129": { "value": safe(() => design.consumptionProfile?.tariff?.tariffCode, "") }, // Rate Schedule Code
        "130": { "value": safe(() => design.consumptionProfile?.tariff?.tariffId, "") }, // Tariff ID
        "131": { "value": safe(() => design.consumptionProfile?.rate, 0) }, // Utility Rate per kWh
        "132": { "value": safe(() => design.consumptionProfile?.postSolarRate, 0) }, // Post Solar Rate
        "133": { "value": safe(() => design.consumptionProfile?.annualBill, 0) }, // Annual Bill Amount
        
        // ========== ADDRESS ==========
        "134": { "value": safe(() => deal.projectAddress?.fullAddress, "") }, // Address Full
        "135": { "value": safe(() => deal.projectAddress?.line1, "") }, // Address Line 1
        "136": { "value": safe(() => deal.projectAddress?.city, "") }, // Address City
        "137": { "value": safe(() => deal.projectAddress?.state, "") }, // Address State
        "138": { "value": safe(() => deal.projectAddress?.postalCode, "") }, // Address Zip
        "139": { "value": safe(() => deal.projectAddress?.lat, "") }, // Address Latitude
        "140": { "value": safe(() => deal.projectAddress?.lng, "") }, // Address Longitude
        
        // ========== SALES INFO ==========
        "141": { "value": salesRep.id || payload.initiatedBy || "" }, // Sales Rep ID
        "142": { "value": safe(() => pricing.salesTeams?.[0]?.name, "") }, // Sales Team Name
        "143": { "value": safe(() => pricing.salesTeams?.[0]?.id, "") }, // Sales Team ID
        "144": { "value": payload.initiatedBy || "" }, // Initiated By User ID
        "145": { "value": payload.targetOrg || "" }, // Target Organization ID
        "146": { "value": deal.installer?.id || "" }, // Installer Org ID
        "147": { "value": payload.event || "" }, // Event Type
        "148": { "value": proposal.id || "" }, // Proposal ID
        
        // ========== FILES & DOCUMENTS ==========
        "149": { "value": contractFiles[0]?.url || "" }, // Contract URL
        "150": { "value": contractFiles[0]?.name || "" }, // Contract Filename
        "151": { "value": contractFiles[1]?.url || "" }, // Installation Agreement URL
        "152": { "value": utilityBillFiles[0]?.url || "" }, // Utility Bill URL
        "153": { "value": utilityBillFiles[0]?.name || "" }, // Utility Bill Filename
        "154": { "value": photoIdFiles[0]?.url || "" }, // Customer ID Photo URL
        "155": { "value": proofPaymentFiles[0]?.url || "" }, // Proof of Payment URL
        "156": { "value": treeQuoteFiles[0]?.url || "" }, // Tree Quote URL
        "157": { "value": treePhotoFiles[0]?.url || "" }, // Tree Site Photo URL
        "158": { "value": additionalFiles.map(f => f.url).join(", ") }, // Additional Docs URLs
        "159": { "value": files.length }, // Total Files Count
        
        // ========== CUSTOM FORM FIELDS ==========
        "160": { "value": state['notes-comments'] || "" }, // Sales Notes
        "161": { "value": state['system-offset']?.['layout-preferences'] || "" }, // Layout Preferences
        "162": { "value": state['system-offset']?.['new-move-in'] || "" }, // New Move In
        "163": { "value": state['system-offset']?.['are-there-any-shading-concerns'] ? "Yes" : "No" }, // Shading Concerns
        "164": { "value": state['system-offset']?.['is-the-system-offset-below-100'] ? "Yes" : "No" }, // System Offset Below 100%
        "165": { "value": state['site-survey']?.['site-survey-selection'] || "" }, // Site Survey Selection
        "166": { "value": state['site-survey']?.['schedule-site-survey'] ? "Yes" : "No" }, // Site Survey Scheduled
        "167": { "value": state['sales-rep-confirmation']?.['ready-to-submit'] ? "Yes" : "No" }, // Ready to Submit
        "168": { "value": state['sales-rep-confirmation']?.['sales-rep-confirmation-message'] ? "Yes" : "No" }, // Sales Rep Confirmation
        "169": { "value": state['additional-work-substage']?.['is-there-additional-work'] ? "Yes" : "No" }, // Additional Work Needed
        "170": { "value": state['additional-work-substage']?.['additional-work']?.join(", ") || "" }, // Additional Work Types
        
        // ========== EQUIPMENT COSTS ==========
        "171": { "value": pricing.equipmentTotal || 0 }, // Equipment Total
        "172": { "value": pricing.moduleTotal || 0 }, // Module Total Cost
        "173": { "value": pricing.inverterTotal || 0 }, // Inverter Total Cost
        "174": { "value": pricing.batteryTotal || 0 }, // Battery Total Cost
        "175": { "value": design.batteryCount || 0 }, // Battery Count
        "176": { "value": design.batteryPurpose || "" }, // Battery Purpose
        
        // ========== TAX ==========
        "177": { "value": pricing.taxRate || 0 }, // Tax Rate
        "178": { "value": safe(() => pricing.calculatedTaxes?.totalTax, 0) }, // Tax Amount
        
        // ========== DESIGN DETAILS ==========
        "179": { "value": design.id || "" }, // Design ID
        "180": { "value": safe(() => design.source?.tool, "") }, // Design Tool
        "181": { "value": safe(() => design.source?.id, "") }, // Design Source ID
        
        // ========== WELCOME CALL ==========
        "182": { "value": "" }, // Welcome Call ID (not in webhook)
        "183": { "value": "" }, // Welcome Call Date
        "184": { "value": "" }, // Welcome Call Duration
        "185": { "value": "" }, // Welcome Call Recording URL
        "186": { "value": "" }, // Welcome Call Questions JSON
        "187": { "value": "" }, // Welcome Call Answers JSON
        "188": { "value": "" }, // Welcome Call Agent
        "189": { "value": "" }, // Welcome Call Outcome
        
        // ========== NOTES ==========
        "190": { "value": 0 }, // Notes Count
        "191": { "value": "" }, // Latest Note Text
        "192": { "value": "" }, // Latest Note Date
        "193": { "value": "" }, // Latest Note Author
        "194": { "value": "" }, // All Notes JSON
        "195": { "value": "" }, // Note Categories
        "196": { "value": "" }, // Note Authors List
        
        // ========== TIMESTAMPS ==========
        "197": { "value": new Date().toISOString() }, // Created At
        "198": { "value": new Date().toISOString() }, // Updated At
        
        // ========== VALIDATION ==========
        "199": { "value": "Pending" }, // Design Validation Status
        "200": { "value": "" }, // Design Discrepancies JSON
        "201": { "value": "" }, // Validation Timestamp
        "202": { "value": "" }, // Validation Notes
        
        // ========== JSON BACKUPS ==========
        "203": { "value": JSON.stringify(design.arrays || []) }, // Arrays JSON
        "204": { "value": JSON.stringify(valueAdders) }, // Value Adders JSON
        "205": { "value": JSON.stringify(systemAdders) }, // System Adders JSON
        "206": { "value": JSON.stringify(files) }, // All Files JSON
        "207": { "value": JSON.stringify(allAdders.map(a => a.fieldInputs).filter(Boolean)) }, // Adder Dynamic Inputs JSON
        "208": { "value": JSON.stringify(pricing) }, // Pricing Model JSON
        "209": { "value": JSON.stringify(design.consumptionProfile?.consumption || []) }, // Monthly Consumption
        
        // ========== CALCULATED FIELDS ==========
        "210": { "value": design.arrays ? design.arrays[0].moduleCount : 0 }, // System Size kW2 (duplicate for validation)
        "211": { "value": JSON.stringify(adderPricing.skippedAdders || []) }, // Skipped Adders JSON
        
        // ========== METADATA ==========
        "212": { "value": new Date().toISOString() }, // Date Created
        "213": { "value": new Date().toISOString() }, // Date Modified
        // 214: Record ID# (auto-generated by QuickBase)
        // 215: Record Owner (auto-set by QuickBase)
        // 216: Last Modified By (auto-set by QuickBase)
    };
    
    return qbRecord;
}

// Export for use in webhook handler
module.exports = { mapEnerfloToQuickBase };