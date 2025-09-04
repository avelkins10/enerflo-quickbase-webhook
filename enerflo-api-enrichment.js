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
   * Get CallPilot/Welcome Call data from Enerflo API
   * @param {string} dealId - The deal ID from the webhook payload
   * @returns {Object} CallPilot data with welcome call details
   */
  async getCallPilotData(dealId) {
    try {
      console.log(`🔍 Fetching CallPilot data for deal: ${dealId}`);
      const response = await axios.get(`${this.baseURL}/api/v1/callpilot/answers/${dealId}`, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Successfully fetched CallPilot data for deal: ${dealId}`);
      return response.data;
    } catch (error) {
      console.log(`❌ CallPilot data not available for deal ${dealId}: ${error.response?.status || error.message}`);
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
      
      // Get CallPilot data from separate endpoint
      const callPilotData = await this.getCallPilotData(dealId);
      
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
   * @returns {Object} Additional fields for QuickBase
   */
  extractEnrichedFields(enrichedPayload) {
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
      
      // Sales rep enrichment (Setter/Closer)
      if (fullInstall.salesRep) {
        enrichedFields[218] = { value: fullInstall.salesRep.name || fullInstall.salesRep.id }; // Setter
        enrichedFields[219] = { value: fullInstall.salesRep.name || fullInstall.salesRep.id }; // Closer
      }
      
      // Installer enrichment
      if (fullInstall.installer) {
        enrichedFields[70] = { value: fullInstall.installer.id }; // Installer Org ID
      }
      
      // CallPilot/Welcome Call enrichment from fullInstall
      if (fullInstall.welcomeCall) {
        enrichedFields[170] = { value: fullInstall.welcomeCall.id }; // Welcome Call ID
        enrichedFields[171] = { value: fullInstall.welcomeCall.date }; // Welcome Call Date
        enrichedFields[172] = { value: fullInstall.welcomeCall.duration }; // Welcome Call Duration
        enrichedFields[173] = { value: fullInstall.welcomeCall.recordingUrl }; // Welcome Call Recording URL
        enrichedFields[174] = { value: JSON.stringify(fullInstall.welcomeCall.questions) }; // Welcome Call Questions JSON
        enrichedFields[175] = { value: JSON.stringify(fullInstall.welcomeCall.answers) }; // Welcome Call Answers JSON
        enrichedFields[176] = { value: fullInstall.welcomeCall.agent }; // Welcome Call Agent
        enrichedFields[177] = { value: fullInstall.welcomeCall.outcome }; // Welcome Call Outcome
      }
    }
    
    // CallPilot/Welcome Call enrichment from separate CallPilot API
    if (enrichedPayload.enriched && enrichedPayload.callPilot) {
      const callPilot = enrichedPayload.callPilot;
      
      // Map CallPilot data to QuickBase fields
      if (callPilot.id) {
        enrichedFields[170] = { value: callPilot.id }; // Welcome Call ID
      }
      if (callPilot.date) {
        enrichedFields[171] = { value: callPilot.date }; // Welcome Call Date
      }
      if (callPilot.duration) {
        enrichedFields[172] = { value: callPilot.duration }; // Welcome Call Duration
      }
      if (callPilot.recordingUrl) {
        enrichedFields[173] = { value: callPilot.recordingUrl }; // Welcome Call Recording URL
      }
      if (callPilot.questions) {
        enrichedFields[174] = { value: JSON.stringify(callPilot.questions) }; // Welcome Call Questions JSON
      }
      if (callPilot.answers) {
        enrichedFields[175] = { value: JSON.stringify(callPilot.answers) }; // Welcome Call Answers JSON
      }
      if (callPilot.agent) {
        enrichedFields[176] = { value: callPilot.agent }; // Welcome Call Agent
      }
      if (callPilot.outcome) {
        enrichedFields[177] = { value: callPilot.outcome }; // Welcome Call Outcome
      }
    }
    
    return enrichedFields;
  }
}

module.exports = EnerfloAPIEnrichment;
