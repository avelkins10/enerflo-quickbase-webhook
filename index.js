// Enerflo to QuickBase Webhook Handler - CORRECTED VERSION
// Based on ACTUAL webhook payload structure

const express = require('express');
const axios = require('axios');
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuration
const config = {
    quickbase: {
        realm: process.env.QB_REALM || 'kin.quickbase.com',
        userToken: process.env.QB_USER_TOKEN, // REQUIRED - no default for security
        tableId: process.env.QB_TABLE_ID || 'br9kwm8na'
    },
    port: process.env.PORT || 3000
};

// Validate required configuration
if (!config.quickbase.userToken) {
    console.error('ERROR: QB_USER_TOKEN environment variable is required');
    process.exit(1);
}

// QuickBase API helper class
class QuickBaseAPI {
    constructor() {
        this.baseURL = 'https://api.quickbase.com/v1';
        this.headers = {
            'QB-Realm-Hostname': config.quickbase.realm,
            'Authorization': `QB-USER-TOKEN ${config.quickbase.userToken}`,
            'Content-Type': 'application/json'
        };
    }

    // Format value based on QuickBase field type
    formatFieldValue(value, fieldType) {
        if (value === null || value === undefined) {
            return { value: '' };
        }

        switch (fieldType) {
            case 'currency':
                const currencyVal = String(value).replace(/[$,]/g, '');
                return { value: parseFloat(currencyVal) || 0 };
            
            case 'numeric':
                return { value: parseFloat(value) || 0 };
            
            case 'checkbox':
                return { value: Boolean(value) };
            
            case 'date':
            case 'datetime':
                if (value) {
                    const date = new Date(value);
                    return { value: isNaN(date.getTime()) ? '' : date.toISOString() };
                }
                return { value: '' };
            
            case 'email':
            case 'phone':
            case 'url':
            case 'text':
            case 'text-multi-line':
                return { value: String(value) };
            
            case 'text-multiple-choice':
                return { value: String(value) };
            
            default:
                return { value: value };
        }
    }

    async insertRecord(data) {
        try {
            const response = await axios.post(
                `${this.baseURL}/records`,
                {
                    to: config.quickbase.tableId,
                    data: [data],
                    fieldsToReturn: [3, 6, 7, 12]
                },
                { headers: this.headers }
            );
            
            return response.data;
        } catch (error) {
            console.error('QuickBase API Error:', error.response?.data || error.message);
            throw new Error('Failed to insert QuickBase record');
        }
    }
}

// Helper functions
function formatCurrency(value) {
    if (!value) return 0;
    return parseFloat(String(value).replace(/[$,]/g, '')) || 0;
}

// Main webhook processor - BASED ON ACTUAL PAYLOAD STRUCTURE
async function processEnerfloWebhook(webhookData) {
    // Extract from CORRECT locations in payload
    const payload = webhookData.payload || {};
    const deal = payload.deal || {};
    const customer = payload.customer || {};
    const proposal = payload.proposal || {};
    const design = payload.design || proposal.design || {};
    
    // Pricing outputs are under proposal, not deal
    const pricingOutputs = proposal.pricingOutputs || {};
    const adderPricing = pricingOutputs.adderPricing || {};
    const withDealerFees = pricingOutputs.withDealerFees || {};
    
    // Get calculated adders (the ones with actual amounts)
    const valueAdders = withDealerFees.calculatedValueAdders || [];
    const systemAdders = withDealerFees.calculatedSystemAdders || [];
    
    // Arrays are under design
    const arrays = design.arrays || [];
    
    // Calculate system size from arrays
    let totalPanelCount = 0;
    let systemSizeWatts = 0;
    
    arrays.forEach(array => {
        const moduleCount = array.moduleCount || 0;
        const moduleWatts = array.module?.capacity || 0;
        totalPanelCount += moduleCount;
        systemSizeWatts += (moduleCount * moduleWatts);
    });
    
    // Use pricingOutputs systemSize if available, otherwise calculate
    if (pricingOutputs.totalSystemSizeWatts) {
        systemSizeWatts = pricingOutputs.totalSystemSizeWatts;
    }
    
    const systemSizeKW = systemSizeWatts / 1000;
    
    // Get address from deal.project if exists
    const address = pricingOutputs.deal?.projectAddress?.fullAddress || '';
    
    // Build QuickBase record with CORRECT field mapping
    const qbRecord = {
        // Core Fields
        "6": { value: deal.id || '' }, // Enerflo Deal ID
        
        // Customer Fields
        "7": { value: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() }, // Full Name
        "10": { value: customer.email || '' }, // Email
        "11": { value: customer.phone || '' }, // Phone
        "16": { value: customer.firstName || '' }, // First Name
        "17": { value: customer.lastName || '' }, // Last Name
        "18": { value: address }, // Address Full
        "64": { value: customer.id || '' }, // Customer ID
        
        // Project Status
        "12": { value: 'Submitted' }, // Project Status
        "13": { value: new Date().toISOString() }, // Submission Date
        
        // System Specifications
        "14": { value: systemSizeKW }, // System Size kW
        "15": { value: totalPanelCount }, // Total Panel Count
        "19": { value: systemSizeWatts }, // System Size Watts
        
        // Panel Details (from first array)
        "20": { value: arrays[0]?.module?.model || '' }, // Panel Model
        "23": { value: arrays[0]?.module?.manufacturer || '' }, // Panel Manufacturer
        "24": { value: arrays[0]?.module?.capacity || 0 }, // Panel Watts Each
        "25": { value: arrays[0]?.module?.name || '' }, // Panel Name
        
        // Inverter Details
        "26": { value: design.inverters?.[0]?.manufacturer || '' }, // Inverter Manufacturer
        "27": { value: design.inverters?.[0]?.model || '' }, // Inverter Model
        "28": { value: design.inverters?.length || 0 }, // Inverter Count
        
        // Financial Fields
        "21": { value: formatCurrency(pricingOutputs.grossCost) }, // Gross Cost
        "33": { value: formatCurrency(pricingOutputs.baseCost) }, // Base Cost
        "34": { value: formatCurrency(pricingOutputs.netCost) }, // Net Cost After ITC
        "35": { value: pricingOutputs.basePPW || 0 }, // Base PPW
        "36": { value: pricingOutputs.grossPPW || 0 }, // Gross PPW
        "40": { value: formatCurrency(pricingOutputs.financeCost) }, // Finance Cost
        
        // Federal ITC
        "37": { value: formatCurrency(pricingOutputs.rebates?.[0]?.pricingOption?.inputs?.itcPercent * pricingOutputs.grossCost || 0) },
        
        // Checkboxes
        "41": { value: Boolean(deal.state?.hasSignedContract) }, // Has Signed Contract
        "42": { value: Boolean(deal.state?.hasDesign) }, // Has Design
        "43": { value: Boolean(deal.state?.['complete-call-pilot-welcome-call']) }, // Welcome Call Completed
        
        // Status Fields
        "139": { value: deal.state?.financingStatus || 'Pending' }, // Financing Status
        "188": { value: 'Pending' }, // Design Validation Status
    };
    
    // Process Adders with EXACT field mapping
    let totalAddersAmount = 0;
    let valueAddersTotal = 0;
    let systemAddersTotal = 0;
    
    // Combine all adders for itemization
    const allAdders = [
        ...valueAdders.map(a => ({ 
            ...a, 
            category: 'Value',
            name: a.displayName || a.name,
            ppw: a.pricingOptionId ? (a.amount / systemSizeWatts) : 0,
            quantity: a.fieldInputs?.quantity || 1
        })),
        ...systemAdders.map(a => ({ 
            ...a, 
            category: 'System',
            name: a.displayName || a.name,
            ppw: a.ppw || (a.amount / systemSizeWatts) || 0,
            quantity: a.fieldInputs?.quantity || a.fieldInputs?.['how-many-optional-electrical-upgrades-are-needed'] || 1
        }))
    ];
    
    // Map up to 5 adders with CORRECT field IDs
    allAdders.slice(0, 5).forEach((adder, index) => {
        const adderNum = index + 1;
        const amount = formatCurrency(adder.amount || 0);
        
        // Map to EXACT fields based on QuickBase structure
        switch(adderNum) {
            case 1:
                qbRecord["192"] = { value: adder.name || '' };           // Adder 1 Name
                qbRecord["193"] = { value: amount };                     // Adder 1 Cost
                qbRecord["194"] = { value: adder.category };             // Adder 1 Category
                qbRecord["195"] = { value: adder.ppw || 0 };            // Adder 1 PPW
                qbRecord["196"] = { value: adder.quantity || 1 };       // Adder 1 Quantity
                break;
            case 2:
                qbRecord["197"] = { value: adder.name || '' };           // Adder 2 Name
                qbRecord["198"] = { value: amount };                     // Adder 2 Cost
                qbRecord["199"] = { value: adder.category };             // Adder 2 Category
                qbRecord["200"] = { value: adder.quantity || 1 };       // Adder 2 Quantity
                qbRecord["201"] = { value: adder.ppw || 0 };            // Adder 2 PPW
                break;
            case 3:
                qbRecord["202"] = { value: adder.name || '' };           // Adder 3 Name
                qbRecord["204"] = { value: amount };                     // Adder 3 Cost (203 doesn't exist)
                qbRecord["205"] = { value: adder.quantity || 1 };       // Adder 3 Quantity
                qbRecord["206"] = { value: adder.ppw || 0 };            // Adder 3 PPW
                qbRecord["217"] = { value: adder.category };             // Adder 3 Category (out of sequence)
                break;
            case 4:
                qbRecord["207"] = { value: adder.name || '' };           // Adder 4 Name
                qbRecord["208"] = { value: adder.category };             // Adder 4 Category
                qbRecord["209"] = { value: amount };                     // Adder 4 Cost
                qbRecord["210"] = { value: adder.quantity || 1 };       // Adder 4 Quantity
                qbRecord["211"] = { value: adder.ppw || 0 };            // Adder 4 PPW
                break;
            case 5:
                qbRecord["212"] = { value: adder.name || '' };           // Adder 5 Name
                qbRecord["213"] = { value: adder.category };             // Adder 5 Category
                qbRecord["214"] = { value: amount };                     // Adder 5 Cost
                qbRecord["215"] = { value: adder.quantity || 1 };       // Adder 5 Quantity
                qbRecord["216"] = { value: adder.ppw || 0 };            // Adder 5 PPW
                break;
        }
        
        // Add to totals
        totalAddersAmount += amount;
        if (adder.category === 'Value') {
            valueAddersTotal += amount;
        } else {
            systemAddersTotal += amount;
        }
    });
    
    // Adder Totals
    qbRecord["39"] = { value: totalAddersAmount }; // Total Adders Amount
    qbRecord["105"] = { value: valueAddersTotal }; // Value Adders Total
    qbRecord["106"] = { value: systemAddersTotal }; // System Adders Total
    qbRecord["107"] = { value: allAdders.length }; // Adders Count
    
    // Process Files
    const files = deal.files || [];
    const contractFiles = files.filter(f => f.source === 'signedContractFiles');
    const utilityBill = files.find(f => f.source === 'full-utility-bill');
    
    if (contractFiles.length > 0) {
        qbRecord["22"] = { value: contractFiles[0].url || '' }; // Contract URL
        qbRecord["143"] = { value: contractFiles[0].name || '' }; // Contract Filename
    }
    
    if (utilityBill) {
        qbRecord["145"] = { value: utilityBill.url || '' }; // Utility Bill URL
        qbRecord["146"] = { value: utilityBill.name || '' }; // Utility Bill Filename
    }
    
    qbRecord["152"] = { value: files.length }; // Total Files Count
    
    // Store JSON backups
    qbRecord["58"] = { value: JSON.stringify(arrays) }; // Arrays JSON
    qbRecord["59"] = { value: JSON.stringify(valueAdders) }; // Value Adders JSON
    qbRecord["60"] = { value: JSON.stringify(systemAdders) }; // System Adders JSON
    qbRecord["61"] = { value: JSON.stringify(files) }; // All Files JSON
    
    // Additional fields from deal state
    if (deal.salesRep?.id) qbRecord["119"] = { value: deal.salesRep.id };
    if (pricingOutputs.deal?.roofMaterial) qbRecord["30"] = { value: pricingOutputs.deal.roofMaterial };
    if (pricingOutputs.deal?.mountingType) qbRecord["31"] = { value: pricingOutputs.deal.mountingType };
    if (pricingOutputs.downPayment) qbRecord["38"] = { value: formatCurrency(pricingOutputs.downPayment) };
    
    return qbRecord;
}

// Webhook endpoints
app.post('/webhook/enerflo', async (req, res) => {
    const startTime = Date.now();
    console.log('Received Enerflo webhook:', new Date().toISOString());
    
    try {
        const webhookData = req.body;
        
        // Validate webhook data
        if (!webhookData.payload?.deal?.id) {
            console.error('Invalid webhook: missing payload.deal.id');
            return res.status(400).json({
                error: 'Invalid webhook data: missing payload.deal.id'
            });
        }
        
        console.log(`Processing deal: ${webhookData.payload.deal.id}`);
        
        // Process and format data for QuickBase
        const qbRecord = await processEnerfloWebhook(webhookData);
        
        // Insert into QuickBase
        const qb = new QuickBaseAPI();
        const result = await qb.insertRecord(qbRecord);
        
        const processingTime = Date.now() - startTime;
        console.log(`Success: Deal ${webhookData.payload.deal.id} → QB Record ${result.data?.[0]?.[3]?.value} (${processingTime}ms)`);
        
        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
            recordId: result.data?.[0]?.[3]?.value,
            processingTime: processingTime
        });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`Failed: Webhook processing error after ${processingTime}ms:`, error.message);
        
        // Don't expose internal errors to webhook sender
        res.status(500).json({
            error: 'Failed to process webhook',
            message: 'Internal processing error'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        config: {
            realm: config.quickbase.realm,
            tableId: config.quickbase.tableId,
            hasToken: !!config.quickbase.userToken
        }
    });
});

// Test endpoint
app.get('/test/fields', async (req, res) => {
    try {
        const qb = new QuickBaseAPI();
        
        const testRecord = {
            "6": { value: 'TEST-' + Date.now() },
            "7": { value: 'Test Customer' },
            "12": { value: 'Test' },
            "14": { value: 10.5 },
            "15": { value: 25 }
        };
        
        const result = await qb.insertRecord(testRecord);
        
        res.json({
            success: true,
            message: 'Test record created',
            record: result.data?.[0]
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Test failed',
            message: error.message
        });
    }
});

// Start server
app.listen(config.port, () => {
    console.log(`Webhook handler running on port ${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/health`);
    console.log(`Webhook endpoint: http://localhost:${config.port}/webhook/enerflo`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});