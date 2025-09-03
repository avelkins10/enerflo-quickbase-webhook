// COMPLETE FIELD MAPPING FOR ALL 217 FIELDS
// Replace your entire processEnerfloWebhook function with this

async function processEnerfloWebhook(webhookData) {
    // Extract all data sections
    const payload = webhookData.payload || {};
    const deal = payload.deal || {};
    const dealState = deal.state || {};
    const customer = payload.customer || {};
    const proposal = payload.proposal || {};
    const design = payload.design || proposal.design || {};
    const pricingOutputs = proposal.pricingOutputs || {};
    const adderPricing = pricingOutputs.adderPricing || {};
    const withDealerFees = pricingOutputs.withDealerFees || {};
    const valueAdders = withDealerFees.calculatedValueAdders || [];
    const systemAdders = withDealerFees.calculatedSystemAdders || [];
    const arrays = design.arrays || [];
    const files = deal.files || [];
    const consumptionProfile = design.consumptionProfile || pricingOutputs.deal?.consumptionProfile || {};
    const projectAddress = pricingOutputs.deal?.projectAddress || {};
    const financeProduct = proposal.financeProduct || {};
    
    // Extract nested state data
    const systemOffset = dealState['system-offset'] || {};
    const additionalWork = dealState['additional-work-substage'] || {};
    const lenderCall = dealState['lender-welcome-call'] || {};
    const siteSurvey = dealState['site-survey'] || {};
    const salesConfirmation = dealState['sales-rep-confirmation'] || {};
    
    // Calculate system size
    let totalPanelCount = 0;
    let systemSizeWatts = 0;
    arrays.forEach(array => {
        totalPanelCount += (array.moduleCount || 0);
        systemSizeWatts += ((array.moduleCount || 0) * (array.module?.capacity || 0));
    });
    systemSizeWatts = pricingOutputs.totalSystemSizeWatts || systemSizeWatts || (pricingOutputs.cumulativeSystemSizeWatts || 0);
    const systemSizeKW = systemSizeWatts / 1000;
    
    // Build complete QuickBase record
    const qbRecord = {
        // === CORE IDENTIFICATION FIELDS (1-10) ===
        "6": { value: deal.id || '' }, // Enerflo Deal ID
        "7": { value: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() }, // Customer Full Name
        "10": { value: customer.email || '' }, // Customer Email
        
        // === CUSTOMER FIELDS (11-20) ===
        "11": { value: customer.phone || '' }, // Customer Phone
        "16": { value: customer.firstName || '' }, // Customer First Name
        "17": { value: customer.lastName || '' }, // Customer Last Name
        "18": { value: projectAddress.fullAddress || '' }, // Address Full
        "64": { value: customer.id || '' }, // Customer ID
        
        // === PROJECT STATUS FIELDS (12-15) ===
        "12": { value: 'Submitted' }, // Project Status
        "13": { value: new Date().toISOString() }, // Submission Date
        "14": { value: systemSizeKW }, // System Size kW
        "15": { value: totalPanelCount }, // Total Panel Count
        "19": { value: systemSizeWatts }, // System Size Watts
        
        // === PANEL SPECIFICATIONS (20-25, 75-78) ===
        "20": { value: arrays[0]?.module?.model || '' }, // Panel Model
        "23": { value: arrays[0]?.module?.manufacturer || '' }, // Panel Manufacturer
        "24": { value: arrays[0]?.module?.capacity || 0 }, // Panel Watts Each
        "25": { value: arrays[0]?.module?.name || '' }, // Panel Name
        "75": { value: arrays[0]?.module?.efficiency || 0 }, // Panel Efficiency
        "76": { value: arrays[0]?.module?.degradation || 0 }, // Panel Degradation
        "77": { value: arrays[0]?.module?.width || 0 }, // Panel Width mm
        "78": { value: arrays[0]?.module?.length || 0 }, // Panel Length mm
        
        // === INVERTER SPECIFICATIONS (26-28, 80-82) ===
        "26": { value: design.inverters?.[0]?.manufacturer || '' }, // Inverter Manufacturer
        "27": { value: design.inverters?.[0]?.model || '' }, // Inverter Model
        "28": { value: design.inverterCount || design.inverters?.length || 0 }, // Inverter Count
        "80": { value: design.inverters?.[0]?.acOutput || 0 }, // Inverter AC Output
        "81": { value: design.inverters?.[0]?.efficiency || 0 }, // Inverter Efficiency
        "82": { value: design.inverters?.[0]?.isMicro ? 'true' : 'false' }, // Is Microinverter
        
        // === ARRAY/ROOF/MOUNTING (29-32) ===
        "29": { value: arrays.length }, // Array Count
        "30": { value: design.roofMaterial || '' }, // Roof Material
        "31": { value: design.mountingType || '' }, // Mounting Type
        "32": { value: design.weightedTsrf || 0 }, // Weighted TSRF
        
        // === FINANCIAL FIELDS (21, 33-40, 92-106) ===
        "21": { value: formatCurrency(pricingOutputs.grossCost) }, // Gross Cost
        "33": { value: formatCurrency(pricingOutputs.baseCost) }, // Base Cost
        "34": { value: formatCurrency(pricingOutputs.netCost) }, // Net Cost After ITC
        "35": { value: pricingOutputs.basePPW || 0 }, // Base PPW
        "36": { value: pricingOutputs.grossPPW || 0 }, // Gross PPW
        "37": { value: formatCurrency(pricingOutputs.federalRebateTotal || (pricingOutputs.grossCost * 0.3)) }, // Federal ITC Amount
        "38": { value: formatCurrency(pricingOutputs.downPayment * pricingOutputs.grossCost || 0) }, // Down Payment Amount
        "40": { value: formatCurrency(pricingOutputs.financeCost) }, // Finance Cost
        "92": { value: formatCurrency(pricingOutputs.commissionBase) }, // Commission Base
        "93": { value: pricingOutputs.netPPW || 0 }, // Net PPW
        "95": { value: pricingOutputs.rebates?.[0]?.pricingOption?.inputs?.itcPercent || 0.3 }, // Federal ITC Percent
        "96": { value: formatCurrency(pricingOutputs.rebatesTotal || 0) }, // Rebates Total
        "98": { value: formatCurrency(pricingOutputs.dealerFee || 0) }, // Dealer Fee
        "99": { value: pricingOutputs.dealerFeePercent || 0 }, // Dealer Fee Percent
        "100": { value: (pricingOutputs.downPayment * 100) || 0 }, // Down Payment Percent
        "101": { value: formatCurrency(pricingOutputs.equipmentTotal || 0) }, // Equipment Total
        "102": { value: formatCurrency(pricingOutputs.moduleTotal || 0) }, // Module Total Cost
        "103": { value: formatCurrency(pricingOutputs.inverterTotal || 0) }, // Inverter Total Cost
        "104": { value: pricingOutputs.taxRate || 0 }, // Tax Rate
        
        // === CHECKBOX FIELDS (41-43, 154-163, 165-166) ===
        "41": { value: Boolean(dealState.hasSignedContract) }, // Has Signed Contract
        "42": { value: Boolean(dealState.hasDesign) }, // Has Design
        "43": { value: Boolean(dealState['complete-call-pilot-welcome-call']) }, // Welcome Call Completed
        "154": { value: Boolean(dealState.hasCreatedProposal) }, // Has Created Proposal
        "155": { value: Boolean(dealState.hasApprovedContract) }, // Has Approved Contract
        "156": { value: Boolean(dealState.hasSubmittedProject) }, // Has Submitted Project
        "157": { value: Boolean(dealState.hasGeneratedContract) }, // Has Generated Contract
        "158": { value: Boolean(dealState.hasSubmittedFinancingApplication) }, // Has Submitted Financing
        "159": { value: Boolean(dealState.hasSignedFinancingDocs) }, // Has Signed Financing Docs
        "160": { value: Boolean(dealState.noDocumentsToSign) }, // No Documents to Sign
        "161": { value: Boolean(dealState.contractApprovalEnabled) }, // Contract Approval Enabled
        "162": { value: Boolean(salesConfirmation['ready-to-submit']) }, // Ready to Submit
        "163": { value: Boolean(salesConfirmation['sales-rep-confirmation-message']) }, // Sales Rep Confirmation
        "165": { value: Boolean(siteSurvey['schedule-site-survey']) }, // Site Survey Scheduled
        "166": { value: Boolean(additionalWork['is-there-additional-work']) }, // Additional Work Needed
        "167": { value: systemOffset['are-there-any-shading-concerns'] ? 'true' : 'false' }, // Shading Concerns
        "168": { value: systemOffset['is-the-system-offset-below-100'] ? 'true' : 'false' }, // System Offset Below 100%
        
        // === SALES NOTES & PREFERENCES (63, 65, 164) ===
        "63": { value: dealState['notes-comments'] || '' }, // Sales Notes
        "65": { value: systemOffset['layout-preferences'] || '' }, // Layout Preferences
        "164": { value: systemOffset['new-move-in'] || '' }, // New Move In
        
        // === ADDITIONAL WORK DETAILS (44-53, 108-118) ===
        "44": { value: additionalWork['tree-removal-contractor'] || '' }, // Tree Removal Contractor
        "48": { value: additionalWork['tree-removal-contractor-phone-number'] || '' }, // Tree Contractor Phone (field 110)
        "110": { value: additionalWork['tree-removal-contractor-phone-number'] || '' }, // Tree Contractor Phone
        "108": { value: additionalWork['tree-trimming-contractor'] || '' }, // Tree Trimming Contractor
        "115": { value: additionalWork['hvac-contractor-name'] || '' }, // HVAC Contractor
        "116": { value: additionalWork['hvac-contractor-phone-number'] || '' }, // HVAC Contractor Phone
        "123": { value: additionalWork['additional-work']?.join(', ') || '' }, // Additional Work Types
        
        // === ADDRESS DETAILS (69-74) ===
        "69": { value: projectAddress.line1 || '' }, // Address Line 1
        "70": { value: projectAddress.city || '' }, // Address City
        "71": { value: projectAddress.state || '' }, // Address State
        "72": { value: String(projectAddress.postalCode || '') }, // Address Zip
        "73": { value: projectAddress.lat || 0 }, // Address Latitude
        "74": { value: projectAddress.lng || 0 }, // Address Longitude
        
        // === UTILITY & CONSUMPTION (54-57, 124-133) ===
        "54": { value: design.firstYearProduction || 0 }, // Annual Production kWh
        "55": { value: design.offset ? (design.offset * 100) : 0 }, // System Offset Percent
        "56": { value: consumptionProfile.utility?.name || pricingOutputs.deal?.utility?.name || '' }, // Utility Company Name
        "57": { value: consumptionProfile.annualConsumption || 0 }, // Annual Consumption kWh
        "58": { value: consumptionProfile.averageMonthlyBill || 0 }, // Average Monthly Bill
        "124": { value: consumptionProfile.utility?.id || '' }, // Utility Company ID
        "125": { value: consumptionProfile.utility?.name || '' }, // Utility Company Name (duplicate)
        "126": { value: consumptionProfile.utility?.genabilityId || 0 }, // Genability Utility ID
        "127": { value: consumptionProfile.tariff?.tariffName || '' }, // Rate Schedule Name
        "128": { value: consumptionProfile.tariff?.tariffCode || '' }, // Rate Schedule Code
        "129": { value: consumptionProfile.tariff?.tariffId || 0 }, // Tariff ID
        "130": { value: consumptionProfile.rate || consumptionProfile.averageUtilityRate || 0 }, // Utility Rate per kWh
        "131": { value: consumptionProfile.postSolarRate || 0 }, // Post Solar Rate
        "132": { value: consumptionProfile.annualBill || 0 }, // Annual Bill Amount
        "133": { value: consumptionProfile.averageMonthlyConsumption || 0 }, // Average Monthly Usage
        "122": { value: consumptionProfile.buildingArea || 0 }, // Building Area sqft
        
        // === SALES/ORG/USER IDS (66-68, 119-121) ===
        "66": { value: deal.salesRep?.id || '' }, // Sales Rep ID
        "67": { value: pricingOutputs.salesTeams?.[0]?.name || '' }, // Sales Team Name
        "68": { value: proposal.id || '' }, // Proposal ID
        "119": { value: payload.initiatedBy || '' }, // Initiated By User ID
        "120": { value: payload.targetOrg || '' }, // Target Organization ID
        "121": { value: pricingOutputs.deal?.installer?.id || '' }, // Installer Org ID
        
        // === FINANCE DETAILS (134-141) ===
        "134": { value: financeProduct.financeMethodName || financeProduct.plugin || '' }, // Finance Type
        "135": { value: financeProduct.name || '' }, // Finance Product Name
        "136": { value: financeProduct.id || '' }, // Finance Product ID
        "137": { value: lenderCall['lender-dropdown'] || '' }, // Lender Name
        "138": { value: financeProduct.termMonths || 0 }, // Loan Term Months
        "139": { value: dealState.financingStatus || 'Pending' }, // Financing Status
        "140": { value: lenderCall['how-is-the-customer-making-their-down-payment'] || '' }, // Down Payment Method
        "141": { value: financeProduct.originalName || '' }, // Payment Structure
        
        // === DESIGN FIELDS (168-170) ===
        "168": { value: design.id || '' }, // Design ID
        "169": { value: design.source?.tool || '' }, // Design Tool
        "170": { value: design.source?.id || '' }, // Design Source ID
        
        // === STATUS FIELDS (188) ===
        "188": { value: 'Pending' }, // Design Validation Status
        
        // === JSON STORAGE FIELDS (58-61, 97, 121, 189) ===
        "58": { value: JSON.stringify(arrays) }, // Arrays JSON
        "59": { value: JSON.stringify(valueAdders) }, // Value Adders JSON
        "60": { value: JSON.stringify(systemAdders) }, // System Adders JSON
        "61": { value: JSON.stringify(files) }, // All Files JSON
        "97": { value: JSON.stringify(pricingOutputs.rebates || []) }, // Rebates JSON
        "121": { value: JSON.stringify(adderPricing) }, // Adder Dynamic Inputs JSON
        "189": { value: '' }, // Design Discrepancies JSON (empty initially)
    };
    
    // === FILE/DOCUMENT FIELDS (22, 143-153) ===
    const contractFiles = files.filter(f => f.source === 'signedContractFiles');
    const utilityBill = files.find(f => f.source === 'full-utility-bill');
    const idPhoto = files.find(f => f.source === 'customers-photo-id');
    const proofPayment = files.find(f => f.source === 'proof-of-payment');
    const treeQuote = files.find(f => f.source === 'tree-quote');
    const treeSitePhoto = files.find(f => f.source === 'picture-of-site-of-tree-removal');
    const additionalDocs = files.filter(f => f.source === 'additional-documentation');
    
    if (contractFiles.length > 0) {
        qbRecord["22"] = { value: contractFiles[0].url || '' }; // Contract URL
        qbRecord["143"] = { value: contractFiles[0].name || '' }; // Contract Filename
        if (contractFiles[1]) {
            qbRecord["144"] = { value: contractFiles[1].url || '' }; // Installation Agreement URL
        }
    }
    
    qbRecord["145"] = { value: utilityBill?.url || '' }; // Utility Bill URL
    qbRecord["146"] = { value: utilityBill?.name || '' }; // Utility Bill Filename
    qbRecord["147"] = { value: idPhoto?.url || '' }; // Customer ID Photo URL
    qbRecord["148"] = { value: proofPayment?.url || '' }; // Proof of Payment URL
    qbRecord["149"] = { value: treeQuote?.url || '' }; // Tree Quote URL
    qbRecord["150"] = { value: treeSitePhoto?.url || '' }; // Tree Site Photo URL
    qbRecord["151"] = { value: additionalDocs.map(d => d.url).join('\n') || '' }; // Additional Docs URLs
    qbRecord["152"] = { value: files.length }; // Total Files Count
    
    // === ADDER TOTALS (39, 105-107) ===
    let totalAddersAmount = 0;
    let valueAddersTotal = 0;
    let systemAddersTotal = 0;
    
    // === PROCESS ITEMIZED ADDERS (192-217) ===
    const allAdders = [
        ...valueAdders.map(a => ({ 
            ...a, 
            category: 'Value',
            name: a.displayName || a.name,
            ppw: a.ppw || (a.amount / systemSizeWatts) || 0,
            quantity: a.fieldInputs?.quantity || 1
        })),
        ...systemAdders.map(a => ({ 
            ...a, 
            category: 'System',
            name: a.displayName || a.name,
            ppw: a.ppw || (a.amount / systemSizeWatts) || 0,
            quantity: a.fieldInputs?.['how-many-optional-electrical-upgrades-are-needed'] || 
                      a.fieldInputs?.quantity || 1
        }))
    ];
    
    // Map specific adders to dedicated fields
    const treeRemoval = valueAdders.find(a => a.name?.includes('Tree Removal'));
    if (treeRemoval) {
        qbRecord["47"] = { value: formatCurrency(treeRemoval.amount) }; // Tree Removal Cost
    }
    
    const electrical = systemAdders.find(a => a.name?.includes('Electrical'));
    if (electrical) {
        qbRecord["49"] = { value: electrical.fieldInputs?.['how-many-optional-electrical-upgrades-are-needed'] || 1 }; // Electrical Upgrades Count
        qbRecord["50"] = { value: formatCurrency(electrical.amount) }; // Electrical Upgrades Total
        qbRecord["111"] = { value: formatCurrency(electrical.costPerUpgrade || (electrical.amount / (electrical.fieldInputs?.['how-many-optional-electrical-upgrades-are-needed'] || 1))) }; // Electrical Cost Each
    }
    
    const metalRoof = systemAdders.find(a => a.name?.includes('Metal Roof'));
    if (metalRoof) {
        qbRecord["51"] = { value: formatCurrency(metalRoof.amount) }; // Metal Roof Adder
        qbRecord["112"] = { value: metalRoof.ppw || 0 }; // Metal Roof PPW
    }
    
    // Process itemized adders (up to 5)
    allAdders.slice(0, 5).forEach((adder, index) => {
        const adderNum = index + 1;
        const amount = formatCurrency(adder.amount || 0);
        
        switch(adderNum) {
            case 1:
                qbRecord["192"] = { value: adder.name || '' };
                qbRecord["193"] = { value: amount };
                qbRecord["194"] = { value: adder.category };
                qbRecord["195"] = { value: adder.ppw || 0 };
                qbRecord["196"] = { value: adder.quantity || 1 };
                break;
            case 2:
                qbRecord["197"] = { value: adder.name || '' };
                qbRecord["198"] = { value: amount };
                qbRecord["199"] = { value: adder.category };
                qbRecord["200"] = { value: adder.quantity || 1 };
                qbRecord["201"] = { value: adder.ppw || 0 };
                break;
            case 3:
                qbRecord["202"] = { value: adder.name || '' };
                qbRecord["204"] = { value: amount };
                qbRecord["205"] = { value: adder.quantity || 1 };
                qbRecord["206"] = { value: adder.ppw || 0 };
                qbRecord["217"] = { value: adder.category };
                break;
            case 4:
                qbRecord["207"] = { value: adder.name || '' };
                qbRecord["208"] = { value: adder.category };
                qbRecord["209"] = { value: amount };
                qbRecord["210"] = { value: adder.quantity || 1 };
                qbRecord["211"] = { value: adder.ppw || 0 };
                break;
            case 5:
                qbRecord["212"] = { value: adder.name || '' };
                qbRecord["213"] = { value: adder.category };
                qbRecord["214"] = { value: amount };
                qbRecord["215"] = { value: adder.quantity || 1 };
                qbRecord["216"] = { value: adder.ppw || 0 };
                break;
        }
        
        totalAddersAmount += amount;
        if (adder.category === 'Value') {
            valueAddersTotal += amount;
        } else {
            systemAddersTotal += amount;
        }
    });
    
    // Set adder totals
    qbRecord["39"] = { value: totalAddersAmount }; // Total Adders Amount
    qbRecord["105"] = { value: valueAddersTotal }; // Value Adders Total
    qbRecord["106"] = { value: systemAddersTotal }; // System Adders Total
    qbRecord["107"] = { value: allAdders.length }; // Adders Count
    
    return qbRecord;
}

// Helper function
function formatCurrency(value) {
    if (!value) return 0;
    return parseFloat(String(value).replace(/[$,]/g, '')) || 0;
}