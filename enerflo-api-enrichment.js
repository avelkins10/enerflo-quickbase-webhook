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
    this.baseURL = 'https://api.enerflo.io';
  }

  /**
   * Get full install object from Enerflo API
   * @param {string} dealId - The deal ID from the webhook payload
   * @returns {Object} Full install object with enriched data
   */
  async getFullInstallObject(dealId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/v3/installs/find/${dealId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch full install object:', error.message);
      throw new Error(`Enerflo API enrichment failed: ${error.message}`);
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
      
      // Create enriched payload
      const enrichedPayload = {
        ...webhookPayload,
        enriched: true,
        enrichmentTimestamp: new Date().toISOString(),
        fullInstall: fullInstall
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
          enrichedFields[10] = fullInstall.customer.email; // Customer Email
        }
        if (fullInstall.customer.phone) {
          enrichedFields[11] = fullInstall.customer.phone; // Customer Phone
        }
      }
      
      // Sales rep enrichment (Setter/Closer)
      if (fullInstall.salesRep) {
        enrichedFields[218] = fullInstall.salesRep.name || fullInstall.salesRep.id; // Setter
        enrichedFields[219] = fullInstall.salesRep.name || fullInstall.salesRep.id; // Closer
      }
      
      // Installer enrichment
      if (fullInstall.installer) {
        enrichedFields[70] = fullInstall.installer.id; // Installer Org ID
      }
      
      // CallPilot/Welcome Call enrichment
      if (fullInstall.welcomeCall) {
        enrichedFields[170] = fullInstall.welcomeCall.id; // Welcome Call ID
        enrichedFields[171] = fullInstall.welcomeCall.date; // Welcome Call Date
        enrichedFields[172] = fullInstall.welcomeCall.duration; // Welcome Call Duration
        enrichedFields[173] = fullInstall.welcomeCall.recordingUrl; // Welcome Call Recording URL
        enrichedFields[174] = JSON.stringify(fullInstall.welcomeCall.questions); // Welcome Call Questions JSON
        enrichedFields[175] = JSON.stringify(fullInstall.welcomeCall.answers); // Welcome Call Answers JSON
        enrichedFields[176] = fullInstall.welcomeCall.agent; // Welcome Call Agent
        enrichedFields[177] = fullInstall.welcomeCall.outcome; // Welcome Call Outcome
      }
      
      // Add any other enriched fields as needed
    }
    
    return enrichedFields;
  }
}

module.exports = EnerfloAPIEnrichment;
