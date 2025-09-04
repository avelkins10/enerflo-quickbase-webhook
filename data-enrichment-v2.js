const EnerfloAPIClientV2 = require('./enerflo-api-client-v2');

class DataEnrichmentV2 {
  constructor() {
    this.apiClient = new EnerfloAPIClientV2();
    this.enrichmentFields = this.getEnrichmentFields();
  }

  getEnrichmentFields() {
    return {
      // Sales Rep Information
      'salesRep': {
        fields: [65, 66, 67], // Sales Rep ID, Sales Team Name, Sales Team ID
        source: 'deal.salesRep'
      },
      
      // Welcome Call / CallPilot Data
      'welcomeCall': {
        fields: [170, 171, 172, 173, 174, 175, 176, 177], // Welcome Call fields
        source: 'deal.welcomeCall'
      },
      
      // Notes and Comments
      'notes': {
        fields: [178, 179, 180, 181, 182, 183, 184], // Notes fields
        source: 'deal.notes'
      },
      
      // Financing Information
      'financing': {
        fields: [134, 135, 136, 137, 138, 139, 140, 141, 157, 158], // Financing fields
        source: 'deal.financing'
      },
      
      // Site Survey
      'siteSurvey': {
        fields: [162, 44], // Site Survey Selection, Site Survey Scheduled
        source: 'deal.siteSurvey'
      },
      
      // Additional Work
      'additionalWork': {
        fields: [45, 124], // Additional Work Needed, Additional Work Types
        source: 'deal.additionalWork'
      },
      
      // Contract Information
      'contract': {
        fields: [156, 159, 160], // Has Generated Contract, No Documents to Sign, Contract Approval Enabled
        source: 'deal.contract'
      },
      
      // Shading and Move-in
      'shading': {
        fields: [165, 164], // Shading Concerns, New Move In
        source: 'deal.shading'
      },
      
      // Status Flags
      'status': {
        fields: [161, 162], // Ready to Submit, Sales Rep Confirmation
        source: 'deal'
      }
    };
  }

  async enrichRecord(quickbaseRecordId, dealId) {
    try {
      console.log(`🔄 Starting enrichment for QuickBase record ${quickbaseRecordId} (deal ${dealId})`);
      
      // Fetch comprehensive data from Enerflo API
      const apiData = await this.apiClient.getComprehensiveDealData(dealId);
      
      if (!apiData.deal) {
        console.warn(`⚠️  No deal data found for ${dealId} - skipping enrichment`);
        return;
      }

      // Build enrichment payload
      const enrichmentPayload = this.buildEnrichmentPayload(apiData.deal);
      
      if (Object.keys(enrichmentPayload).length === 0) {
        console.log(`ℹ️  No enrichment data available for deal ${dealId}`);
        return;
      }

      // Update QuickBase record
      await this.updateQuickBaseRecord(quickbaseRecordId, enrichmentPayload);
      
      console.log(`✅ Enrichment completed for record ${quickbaseRecordId}`);

    } catch (error) {
      console.error(`❌ Enrichment failed for record ${quickbaseRecordId}:`, error.message);
      throw error;
    }
  }

  buildEnrichmentPayload(dealData) {
    const payload = {};

    // Sales Rep Information
    if (dealData.salesRep) {
      payload[65] = { value: dealData.salesRep.id || '' }; // Sales Rep ID
      payload[66] = { value: dealData.salesTeam?.name || '' }; // Sales Team Name
      payload[67] = { value: dealData.salesTeam?.id || '' }; // Sales Team ID
    }

    // Welcome Call / CallPilot Data
    if (dealData.welcomeCall) {
      const wc = dealData.welcomeCall;
      payload[170] = { value: wc.id || '' }; // Welcome Call ID
      payload[171] = { value: wc.date || '' }; // Welcome Call Date
      payload[172] = { value: wc.duration || 0 }; // Welcome Call Duration
      payload[173] = { value: wc.recordingUrl || '' }; // Welcome Call Recording URL
      payload[174] = { value: JSON.stringify(wc.questions || []) }; // Welcome Call Questions JSON
      payload[175] = { value: JSON.stringify(wc.answers || []) }; // Welcome Call Answers JSON
      payload[176] = { value: wc.agent || '' }; // Welcome Call Agent
      payload[177] = { value: wc.outcome || '' }; // Welcome Call Outcome
    }

    // Notes and Comments
    if (dealData.notes && Array.isArray(dealData.notes)) {
      const notes = dealData.notes;
      payload[178] = { value: notes.length }; // Notes Count
      
      if (notes.length > 0) {
        const latestNote = notes[notes.length - 1];
        payload[179] = { value: latestNote.content || '' }; // Latest Note Text
        payload[180] = { value: latestNote.createdAt || '' }; // Latest Note Date
        payload[181] = { value: latestNote.author || '' }; // Latest Note Author
      }
      
      payload[182] = { value: JSON.stringify(notes) }; // All Notes JSON
      payload[183] = { value: [...new Set(notes.map(n => n.category).filter(Boolean))].join(', ') }; // Note Categories
      payload[184] = { value: [...new Set(notes.map(n => n.author).filter(Boolean))].join(', ') }; // Note Authors List
    }

    // Financing Information
    if (dealData.financing) {
      const fin = dealData.financing;
      payload[134] = { value: fin.type || '' }; // Finance Type
      payload[135] = { value: fin.productName || '' }; // Finance Product Name
      payload[136] = { value: fin.productId || '' }; // Finance Product ID
      payload[137] = { value: fin.lenderName || '' }; // Lender Name
      payload[138] = { value: fin.status || '' }; // Financing Status
      payload[139] = { value: fin.termMonths || 0 }; // Loan Term Months
      payload[140] = { value: fin.paymentStructure || '' }; // Payment Structure
      payload[141] = { value: fin.downPaymentMethod || '' }; // Down Payment Method
      payload[157] = { value: fin.submitted || false }; // Has Submitted Financing
      payload[158] = { value: fin.signedDocs || false }; // Has Signed Financing Docs
    }

    // Site Survey
    if (dealData.siteSurvey) {
      payload[162] = { value: dealData.siteSurvey.selection || '' }; // Site Survey Selection
      payload[44] = { value: dealData.siteSurvey.scheduled || false }; // Site Survey Scheduled
    }

    // Additional Work
    if (dealData.additionalWork) {
      payload[45] = { value: dealData.additionalWork.needed || false }; // Additional Work Needed
      payload[124] = { value: dealData.additionalWork.types || '' }; // Additional Work Types
    }

    // Contract Information
    if (dealData.contract) {
      payload[156] = { value: dealData.contract.generated || false }; // Has Generated Contract
      payload[159] = { value: dealData.contract.noDocumentsToSign || false }; // No Documents to Sign
      payload[160] = { value: dealData.contract.approvalEnabled || false }; // Contract Approval Enabled
    }

    // Shading and Move-in
    if (dealData.shading) {
      payload[165] = { value: dealData.shading.concerns || false }; // Shading Concerns
    }
    
    if (dealData.newMoveIn) {
      payload[164] = { value: dealData.newMoveIn || '' }; // New Move In
    }

    // Status Flags
    payload[161] = { value: dealData.readyToSubmit || false }; // Ready to Submit
    payload[162] = { value: dealData.salesRepConfirmation || false }; // Sales Rep Confirmation

    return payload;
  }

  async updateQuickBaseRecord(recordId, enrichmentPayload) {
    try {
      const payload = {
        to: process.env.QB_TABLE_ID,
        data: [enrichmentPayload]
      };

      const url = `https://${process.env.QB_REALM}/db/${process.env.QB_TABLE_ID}?a=API_EditRecord&rid=${recordId}`;

      console.log(`🔄 Updating QuickBase record ${recordId} with enrichment data`);
      console.log(`📊 Enrichment fields: ${Object.keys(enrichmentPayload).length}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'QB-Realm-Hostname': process.env.QB_REALM,
          'Authorization': `QB-USER-TOKEN ${process.env.QB_USER_TOKEN}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ QuickBase enrichment update failed: ${response.status} ${response.statusText}`);
        console.error(`❌ Error Details: ${errorText}`);
        throw new Error(`QuickBase enrichment update failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ QuickBase enrichment update successful for record ${recordId}`);

      return result;

    } catch (error) {
      console.error(`❌ QuickBase enrichment update failed for record ${recordId}:`, error.message);
      throw error;
    }
  }

  // Test enrichment with a specific deal ID
  async testEnrichment(dealId) {
    try {
      console.log(`🧪 Testing enrichment for deal: ${dealId}`);
      
      const apiData = await this.apiClient.getComprehensiveDealData(dealId);
      console.log('📊 API Data received:', JSON.stringify(apiData, null, 2));
      
      const enrichmentPayload = this.buildEnrichmentPayload(apiData.deal);
      console.log('📊 Enrichment payload:', JSON.stringify(enrichmentPayload, null, 2));
      
      return { apiData, enrichmentPayload };

    } catch (error) {
      console.error(`❌ Enrichment test failed for deal ${dealId}:`, error.message);
      throw error;
    }
  }
}

module.exports = DataEnrichmentV2;
