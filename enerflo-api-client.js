const axios = require('axios');

class EnerfloAPIClient {
    constructor() {
        this.baseURL = process.env.ENERFLO_API_BASE_URL || 'https://api.enerflo.io';
        this.apiKey = process.env.ENERFLO_API_KEY;
        this.timeout = 10000; // 10 seconds
        
        if (!this.apiKey) {
            console.warn('⚠️  ENERFLO_API_KEY not set - enrichment will be disabled');
        }
    }

    /**
     * Fetch customer data from Enerflo API
     * @param {string} customerId - Enerflo customer ID
     * @returns {Object} Customer data
     */
    async getCustomerData(customerId) {
        if (!this.apiKey) {
            throw new Error('Enerflo API key not configured');
        }

        try {
            const response = await axios.get(`${this.baseURL}/customers/${customerId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`Customer ${customerId} not found in Enerflo`);
                return null;
            }
            throw new Error(`Failed to fetch customer data: ${error.message}`);
        }
    }

    /**
     * Fetch deal data from Enerflo API
     * @param {string} dealId - Enerflo deal ID
     * @returns {Object} Deal data
     */
    async getDealData(dealId) {
        if (!this.apiKey) {
            throw new Error('Enerflo API key not configured');
        }

        try {
            const response = await axios.get(`${this.baseURL}/deals/${dealId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`Deal ${dealId} not found in Enerflo`);
                return null;
            }
            throw new Error(`Failed to fetch deal data: ${error.message}`);
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
