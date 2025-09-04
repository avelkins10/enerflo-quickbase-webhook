const axios = require('axios');

class EnerfloAPIClient {
    constructor() {
        // Hybrid API approach: v1 REST + v2 GraphQL
        this.v1BaseURL = process.env.ENERFLO_V1_API_URL || 'https://api.enerflo.io/v1';
        this.v2BaseURL = process.env.ENERFLO_V2_API_URL || 'https://api.enerflo.io/graphql';
        this.apiKey = process.env.ENERFLO_API_KEY;
        this.orgId = process.env.ENERFLO_ORG_ID || 'kin'; // Your Enerflo subdomain
        this.timeout = 10000; // 10 seconds
        
        if (!this.apiKey) {
            console.warn('⚠️  ENERFLO_API_KEY not set - enrichment will be disabled');
        }
    }

    /**
     * Fetch customer data from Enerflo v1 REST API
     * @param {string} customerId - Enerflo customer ID
     * @returns {Object} Customer data
     */
    async getCustomerData(customerId) {
        if (!this.apiKey) {
            throw new Error('Enerflo API key not configured');
        }

        try {
            const response = await axios.get(`${this.v1BaseURL}/customers/${customerId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`Customer ${customerId} not found in Enerflo v1`);
                return null;
            }
            console.log(`Failed to fetch customer ${customerId} from v1:`, error.message);
            return null;
        }
    }

    /**
     * Fetch deal data from Enerflo v2 GraphQL API
     * @param {string} dealId - Enerflo deal ID
     * @returns {Object} Deal data
     */
    async getDealData(dealId) {
        if (!this.apiKey) {
            throw new Error('Enerflo API key not configured');
        }

        // Simple query to test GraphQL connectivity
        const query = `
            query GetDeal($dealId: ID!) {
                deal(id: $dealId) {
                    id
                    state
                }
            }
        `;

        try {
            const response = await axios.post(this.v2BaseURL, {
                query: query,
                variables: { dealId: dealId }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'x-org': this.orgId,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.data.errors) {
                console.log(`GraphQL errors for deal ${dealId}:`, response.data.errors);
                return null;
            }

            return response.data.data?.deal;
        } catch (error) {
            console.log(`Failed to fetch deal ${dealId} from v2:`, error.message);
            return null;
        }
    }

    /**
     * Fetch customer notes from Enerflo API
     * @param {string} customerId - Enerflo customer ID
     * @returns {Array} Array of notes
     */
    async getCustomerNotes(customerId) {
        if (!this.apiKey) {
            throw new Error('Enerflo API key not configured');
        }

        try {
            const response = await axios.get(`${this.baseURL}/customers/${customerId}/notes`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            return response.data || [];
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`No notes found for customer ${customerId}`);
                return [];
            }
            throw new Error(`Failed to fetch customer notes: ${error.message}`);
        }
    }

    /**
     * Fetch welcome call data from Enerflo API
     * @param {string} dealId - Enerflo deal ID
     * @returns {Object} Welcome call data
     */
    async getWelcomeCallData(dealId) {
        if (!this.apiKey) {
            throw new Error('Enerflo API key not configured');
        }

        try {
            const response = await axios.get(`${this.baseURL}/deals/${dealId}/welcome-call`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`No welcome call data found for deal ${dealId}`);
                return null;
            }
            throw new Error(`Failed to fetch welcome call data: ${error.message}`);
        }
    }

    /**
     * Fetch project status from Enerflo API
     * @param {string} dealId - Enerflo deal ID
     * @returns {Object} Project status data
     */
    async getProjectStatus(dealId) {
        if (!this.apiKey) {
            throw new Error('Enerflo API key not configured');
        }

        try {
            const response = await axios.get(`${this.baseURL}/deals/${dealId}/status`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`No project status found for deal ${dealId}`);
                return null;
            }
            throw new Error(`Failed to fetch project status: ${error.message}`);
        }
    }

    /**
     * Check if API is available and configured
     * @returns {boolean} True if API is available
     */
    isAvailable() {
        return !!this.apiKey;
    }
}

module.exports = EnerfloAPIClient;
