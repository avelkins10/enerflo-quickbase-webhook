/**
 * ENERFLO API ENRICHMENT
 * 
 * This module enriches webhook data with additional information from the Enerflo API
 * as recommended by Enerflo's official documentation for project submission events.
 */

const axios = require('axios');

class EnerfloAPIEnrichment {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://enerflo.io';
  }

  /**
   * Get full install object from Enerflo API
   * @param {string} dealId - The deal ID from the webhook payload
   * @returns {Object} Full install object with enriched data
   */
  async getFullInstallObject(dealId) {
    try {
      // Try multiple API endpoints to find the correct one
      const endpoints = [
        `/api/v3/installs/find/${dealId}`,
        `/api/v3/deals/${dealId}`,
        `/api/v3/installs/${dealId}`,
        `/api/v1/installs/${dealId}`,
        `/api/v1/deals/${dealId}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying API endpoint: ${endpoint}`);
          const response = await axios.get(`${this.baseURL}${endpoint}`, {
            headers: {
              'api-key': this.apiKey,
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`✅ Successfully fetched data from: ${endpoint}`);
          return response.data;
        } catch (endpointError) {
          console.log(`❌ Endpoint ${endpoint} failed: ${endpointError.response?.status || endpointError.message}`);
          continue;
        }
      }
      
      throw new Error('All API endpoints failed');
    } catch (error) {
      console.error('Failed to fetch full install object:', error.message);
      throw new Error(`Enerflo API enrichment failed: ${error.message}`);
    }
  }

  /**
   * Get CallPilot/Welcome Call data from Enerflo API using survey ID
   * @param {string} surveyId - The survey ID from the install object
   * @returns {Object} CallPilot data with welcome call details
   */
  async getCallPilotData(surveyId) {
    try {
      console.log(`🔍 Fetching CallPilot data for survey: ${surveyId}`);
      const response = await axios.get(`${this.baseURL}/api/v1/callpilot/answers/${surveyId}`, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Successfully fetched CallPilot data for survey: ${surveyId}`);
      return response.data;
    } catch (error) {
      console.log(`❌ CallPilot data not available for survey ${surveyId}: ${error.response?.status || error.message}`);
      return null; // Return null if no CallPilot data is available
    }
  }

  /**
   * Enrich webhook data with missing information from Enerflo API
   * @param {Object} webhookPayload - Original webhook payload
   * @returns {Object} Enriched payload with additional data
   */
  async enrichWebhookData(webhookPayload) {
    const dealId = webhookPayload.payload.deal.id;
    
    try {
      console.log(`🔍 Enriching webhook data for deal: ${dealId}`);
      
      // Get full install object from API
      const fullInstall = await this.getFullInstallObject(dealId);
      
      // Get CallPilot data using survey ID from the install object
      const surveyId = fullInstall.survey_id;
      const callPilotData = surveyId ? await this.getCallPilotData(surveyId) : null;
      
      // Create enriched payload
      const enrichedPayload = {
        ...webhookPayload,
        enriched: true,
        enrichmentTimestamp: new Date().toISOString(),
        fullInstall: fullInstall,
        callPilot: callPilotData
      };
      
      // Extract missing customer data
      if (fullInstall.customer) {
        enrichedPayload.payload.customer = {
          ...webhookPayload.payload.customer,
          email: fullInstall.customer.email || webhookPayload.payload.customer.email,
          phone: fullInstall.customer.phone || webhookPayload.payload.customer.phone,
          // Add any other missing customer fields
        };
      }
      
      // Extract sales rep information (Setter/Closer)
      if (fullInstall.salesRep) {
        enrichedPayload.payload.salesRep = fullInstall.salesRep;
      }
      
      // Extract welcome call/CallPilot data
      if (fullInstall.welcomeCall) {
        enrichedPayload.payload.welcomeCall = fullInstall.welcomeCall;
      }
      
      // Extract any other missing data
      if (fullInstall.installer) {
        enrichedPayload.payload.installer = fullInstall.installer;
      }
      
      console.log(`✅ Successfully enriched webhook data for deal: ${dealId}`);
      return enrichedPayload;
      
    } catch (error) {
      console.error(`❌ Failed to enrich webhook data for deal ${dealId}:`, error.message);
      
      // Return original payload if enrichment fails
      return {
        ...webhookPayload,
        enriched: false,
        enrichmentError: error.message,
        enrichmentTimestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Extract enriched data for QuickBase mapping
   * @param {Object} enrichedPayload - Enriched webhook payload
   * @param {string} surveyId - Survey ID for CallPilot data
   * @returns {Object} Additional fields for QuickBase
   */
  extractEnrichedFields(enrichedPayload, surveyId) {
    const enrichedFields = {};
    
    if (enrichedPayload.enriched && enrichedPayload.fullInstall) {
      const fullInstall = enrichedPayload.fullInstall;
      
      // Customer enrichment
      if (fullInstall.customer) {
        if (fullInstall.customer.email) {
          enrichedFields[10] = { value: fullInstall.customer.email }; // Customer Email
        }
        if (fullInstall.customer.phone) {
          enrichedFields[11] = { value: fullInstall.customer.phone }; // Customer Phone
        }
      }
      
      // Sales rep enrichment (Setter/Closer) - check webhook payload first
      const salesRepId = enrichedPayload.payload?.deal?.salesRep?.id;
      if (salesRepId) {
        // Use the sales rep ID from webhook payload
        enrichedFields[218] = { value: salesRepId }; // Setter (Sales Rep ID)
        enrichedFields[219] = { value: salesRepId }; // Closer (Sales Rep ID)
      }
      
      // Fallback to fullInstall data if available
      if (fullInstall.salesRep) {
        enrichedFields[218] = { value: fullInstall.salesRep.name || fullInstall.salesRep.id }; // Setter
        enrichedFields[219] = { value: fullInstall.salesRep.name || fullInstall.salesRep.id }; // Closer
      }
      
      // Installer enrichment
      if (fullInstall.installer) {
        enrichedFields[70] = { value: fullInstall.installer.id }; // Installer Org ID
      }
      
      // Design enrichment - Aurora design image and metadata
      if (fullInstall.image) {
        // Note: Field 220 (Design Image URL) needs to be created in QuickBase
        // For now, we'll skip this field until it's created
        console.log('🎨 Design Image URL found but Field 220 not available in QuickBase:', fullInstall.image);
      }
      
      // Design ID (Aurora design ID) - check both API and webhook payload
      const designSourceId = fullInstall.design?.source?.id || enrichedPayload.payload?.proposal?.pricingOutputs?.design?.source?.id;
      if (designSourceId) {
        enrichedFields[168] = { value: designSourceId }; // Design ID
      }
      
      // Design tool (Aurora) - check both API and webhook payload
      const designTool = fullInstall.design?.source?.tool || enrichedPayload.payload?.proposal?.pricingOutputs?.design?.source?.tool;
      if (designTool) {
        enrichedFields[169] = { value: designTool }; // Design Tool
      }
      
      // Design source ID (Aurora design ID - same as Design ID for now)
      if (designSourceId) {
        enrichedFields[170] = { value: designSourceId }; // Design Source ID
      }
      
      // Proposal files enrichment
      if (fullInstall.files && Array.isArray(fullInstall.files)) {
        // Map all files to JSON
        const filesData = fullInstall.files.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          url: file.url,
          survey_id: file.survey_id
        }));
        enrichedFields[61] = { value: JSON.stringify(filesData) }; // All Files JSON
        
        // Map total files count
        enrichedFields[152] = { value: fullInstall.files.length }; // Total Files Count
      }
      
      // Note: CallPilot/Welcome Call data is now handled by separate CallPilot API below
    }
    
    // CallPilot/Welcome Call enrichment from separate CallPilot API
    if (enrichedPayload.enriched && enrichedPayload.callPilot) {
      const callPilot = enrichedPayload.callPilot;
      
      // Debug: Log the CallPilot response structure
      console.log('🔍 CallPilot response structure:', JSON.stringify(callPilot, null, 2));
      
      // Check if CallPilot API returned an error message
      if (typeof callPilot === 'string' && callPilot.includes('Access not Permitted')) {
        console.log('⚠️ CallPilot API returned access denied, skipping CallPilot mapping');
        return enrichedFields;
      }
      
      // Map CallPilot data to QuickBase fields based on actual API response structure
      if (callPilot.enerflo_answers) {
        const answers = callPilot.enerflo_answers;
        
        // Welcome Call ID - use survey ID as the call ID
        enrichedFields[171] = { value: surveyId }; // Welcome Call ID
        
        // Welcome Call Date - use call_completed date from API
        if (callPilot.call_completed) {
          enrichedFields[172] = { value: new Date(callPilot.call_completed).toISOString() }; // Welcome Call Date
        }
        
        // Welcome Call Duration - not available in API, leave empty
        // enrichedFields[172] = { value: null }; // Welcome Call Duration
        
        // Welcome Call Recording URL
        if (callPilot.video_url) {
          enrichedFields[174] = { value: callPilot.video_url }; // Welcome Call Recording URL
        }
        
        // Welcome Call Questions and Answers
        if (callPilot.question_answers && Array.isArray(callPilot.question_answers)) {
          const questions = callPilot.question_answers.map(qa => qa.question).filter(q => q);
          const answers = callPilot.question_answers.map(qa => qa.selectedAnswer || qa.providedExternalAnswer).filter(a => a);
          
          enrichedFields[175] = { value: JSON.stringify(questions) }; // Welcome Call Questions JSON
          enrichedFields[176] = { value: JSON.stringify(answers) }; // Welcome Call Answers JSON
        }
        
        // Welcome Call Agent - get from enerflo_answers
        if (answers.agent_name) {
          enrichedFields[177] = { value: answers.agent_name }; // Welcome Call Agent
        }
        
        // Welcome Call Outcome
        if (callPilot.call_completed) {
          enrichedFields[178] = { value: callPilot.call_completed }; // Welcome Call Outcome
        }
      } else {
        // Fallback: Try to map CallPilot data even if structure is different
        console.log('🔍 CallPilot data found but no enerflo_answers, trying fallback mapping...');
        
        // Welcome Call ID - use survey ID as the call ID
        enrichedFields[171] = { value: surveyId }; // Welcome Call ID
        
        // Welcome Call Date - use call_completed date if available
        if (callPilot.call_completed) {
          enrichedFields[172] = { value: new Date(callPilot.call_completed).toISOString() }; // Welcome Call Date
        }
        
        // Try to map other available fields
        if (callPilot.video_url) {
          enrichedFields[174] = { value: callPilot.video_url }; // Welcome Call Recording URL
        }
        
        if (callPilot.question_answers && Array.isArray(callPilot.question_answers)) {
          const questions = callPilot.question_answers.map(qa => qa.question).filter(q => q);
          const answers = callPilot.question_answers.map(qa => qa.selectedAnswer || qa.providedExternalAnswer).filter(a => a);
          
          enrichedFields[175] = { value: JSON.stringify(questions) }; // Welcome Call Questions JSON
          enrichedFields[176] = { value: JSON.stringify(answers) }; // Welcome Call Answers JSON
        }
        
        if (callPilot.call_completed) {
          enrichedFields[178] = { value: callPilot.call_completed }; // Welcome Call Outcome
        }
      }
    }
    
    return enrichedFields;
  }
}

module.exports = EnerfloAPIEnrichment;
