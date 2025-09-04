const axios = require('axios');

class EnerfloAPIClientV2 {
  constructor() {
    this.apiKey = process.env.ENERFLO_API_KEY;
    this.orgId = process.env.ENERFLO_ORG_ID || 'kinhome';
    
    // Enerflo v1 REST API
    this.v1BaseURL = 'https://api.enerflo.io/v1';
    
    // Enerflo v2 GraphQL API
    this.v2BaseURL = 'https://api.enerflo.io/v2/graphql';
    
    if (!this.apiKey) {
      console.warn('⚠️  ENERFLO_API_KEY not set - API enrichment will be disabled');
    }
  }

  // Get customer data from Enerflo v1 REST API
  async getCustomerData(customerId) {
    if (!this.apiKey) {
      throw new Error('ENERFLO_API_KEY not configured');
    }

    try {
      console.log(`🔍 Fetching customer data for ID: ${customerId}`);
      
      const response = await axios.get(`${this.v1BaseURL}/customers/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`✅ Retrieved customer data for ${customerId}`);
      return response.data;

    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`⚠️  Customer ${customerId} not found in Enerflo v1 API`);
        return null;
      }
      
      console.error(`❌ Error fetching customer data for ${customerId}:`, error.message);
      throw error;
    }
  }

  // Get deal data from Enerflo v2 GraphQL API
  async getDealData(dealId) {
    if (!this.apiKey) {
      throw new Error('ENERFLO_API_KEY not configured');
    }

    try {
      console.log(`🔍 Fetching deal data for ID: ${dealId}`);
      
      const query = `
        query GetDeal($dealId: ID!) {
          deal(id: $dealId) {
            id
            status
            submittedAt
            salesRep {
              id
              name
              email
            }
            salesTeam {
              id
              name
            }
            targetOrganization {
              id
              name
            }
            installerOrg {
              id
              name
            }
            welcomeCall {
              id
              completed
              date
              duration
              recordingUrl
              agent
              outcome
              questions
              answers
            }
            notes {
              id
              content
              author
              createdAt
              category
            }
            financing {
              approved
              submitted
              signedDocs
              type
              productName
              productId
              lenderName
              status
              termMonths
              paymentStructure
              downPaymentMethod
            }
            siteSurvey {
              scheduled
              selection
            }
            additionalWork {
              needed
              types
            }
            contract {
              generated
              approvalEnabled
              noDocumentsToSign
            }
            shading {
              concerns
            }
            newMoveIn
            readyToSubmit
            salesRepConfirmation
          }
        }
      `;

      const response = await axios.post(this.v2BaseURL, {
        query,
        variables: { dealId }
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'x-org': this.orgId,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data.errors) {
        console.error(`❌ GraphQL errors for deal ${dealId}:`, response.data.errors);
        return null;
      }

      console.log(`✅ Retrieved deal data for ${dealId}`);
      return response.data.data?.deal;

    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`⚠️  Deal ${dealId} not found in Enerflo v2 API`);
        return null;
      }
      
      console.error(`❌ Error fetching deal data for ${dealId}:`, error.message);
      throw error;
    }
  }

  // Get CallPilot data (welcome call system)
  async getCallPilotData(dealId) {
    try {
      const dealData = await this.getDealData(dealId);
      return dealData?.welcomeCall || null;
    } catch (error) {
      console.error(`❌ Error fetching CallPilot data for deal ${dealId}:`, error.message);
      return null;
    }
  }

  // Get comprehensive deal information
  async getComprehensiveDealData(dealId) {
    try {
      console.log(`🔍 Fetching comprehensive data for deal: ${dealId}`);
      
      const [dealData, customerData] = await Promise.allSettled([
        this.getDealData(dealId),
        this.getCustomerData(dealId) // Note: This might need customer ID instead
      ]);

      const result = {
        deal: dealData.status === 'fulfilled' ? dealData.value : null,
        customer: customerData.status === 'fulfilled' ? customerData.value : null,
        errors: []
      };

      if (dealData.status === 'rejected') {
        result.errors.push(`Deal data: ${dealData.reason.message}`);
      }

      if (customerData.status === 'rejected') {
        result.errors.push(`Customer data: ${customerData.reason.message}`);
      }

      return result;

    } catch (error) {
      console.error(`❌ Error fetching comprehensive data for deal ${dealId}:`, error.message);
      throw error;
    }
  }

  // Test API connectivity
  async testConnectivity() {
    console.log('🧪 Testing Enerflo API connectivity...');
    
    if (!this.apiKey) {
      console.log('❌ ENERFLO_API_KEY not configured');
      return false;
    }

    try {
      // Test v1 API
      const v1Response = await axios.get(`${this.v1BaseURL}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 5000
      });
      console.log('✅ Enerflo v1 API: Connected');

      // Test v2 API
      const v2Response = await axios.post(this.v2BaseURL, {
        query: '{ __schema { types { name } } }'
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'x-org': this.orgId,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      console.log('✅ Enerflo v2 API: Connected');

      return true;

    } catch (error) {
      console.error('❌ Enerflo API connectivity test failed:', error.message);
      return false;
    }
  }
}

module.exports = EnerfloAPIClientV2;
