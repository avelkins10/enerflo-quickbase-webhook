const EnerfloAPIClient = require('./enerflo-api-client');
const QuickBaseClient = require('./quickbase-client');

class DataEnrichment {
    constructor() {
        this.enerfloClient = new EnerfloAPIClient();
        this.quickbaseClient = new QuickBaseClient();
        this.enrichmentEnabled = this.enerfloClient.isAvailable();
    }

    /**
     * Enrich QuickBase record with missing data from Enerflo API
     * @param {string} quickbaseRecordId - QuickBase record ID
     * @param {Object} webhookData - Original webhook data
     * @returns {Object} Enrichment results
     */
    async enrichRecord(quickbaseRecordId, webhookData) {
        if (!this.enrichmentEnabled) {
            console.log('⚠️  Data enrichment disabled - Enerflo API key not configured');
            return { success: false, reason: 'API not configured' };
        }

        const enrichmentResults = {
            success: true,
            recordId: quickbaseRecordId,
            enrichedFields: [],
            errors: [],
            timestamp: new Date().toISOString()
        };

        try {
            console.log(`🔄 Starting data enrichment for record ${quickbaseRecordId}`);

            // Extract IDs from webhook data
            const dealId = webhookData?.payload?.deal?.id;
            const customerId = webhookData?.payload?.customer?.id;

            if (!dealId || !customerId) {
                throw new Error('Missing deal ID or customer ID in webhook data');
            }

            // Fetch additional data from Enerflo API
            const [customerData, dealData, notes, welcomeCallData, projectStatus] = await Promise.allSettled([
                this.enerfloClient.getCustomerData(customerId),
                this.enerfloClient.getDealData(dealId),
                this.enerfloClient.getCustomerNotes(customerId),
                this.enerfloClient.getWelcomeCallData(dealId),
                this.enerfloClient.getProjectStatus(dealId)
            ]);

            // Process customer data
            if (customerData.status === 'fulfilled' && customerData.value) {
                const customerEnrichment = await this.enrichCustomerData(quickbaseRecordId, customerData.value);
                enrichmentResults.enrichedFields.push(...customerEnrichment.enrichedFields);
                enrichmentResults.errors.push(...customerEnrichment.errors);
            }

            // Process deal data
            if (dealData.status === 'fulfilled' && dealData.value) {
                const dealEnrichment = await this.enrichDealData(quickbaseRecordId, dealData.value);
                enrichmentResults.enrichedFields.push(...dealEnrichment.enrichedFields);
                enrichmentResults.errors.push(...dealEnrichment.errors);
            }

            // Process notes data
            if (notes.status === 'fulfilled' && notes.value?.length > 0) {
                const notesEnrichment = await this.enrichNotesData(quickbaseRecordId, notes.value);
                enrichmentResults.enrichedFields.push(...notesEnrichment.enrichedFields);
                enrichmentResults.errors.push(...notesEnrichment.errors);
            }

            // Process welcome call data
            if (welcomeCallData.status === 'fulfilled' && welcomeCallData.value) {
                const welcomeCallEnrichment = await this.enrichWelcomeCallData(quickbaseRecordId, welcomeCallData.value);
                enrichmentResults.enrichedFields.push(...welcomeCallEnrichment.enrichedFields);
                enrichmentResults.errors.push(...welcomeCallEnrichment.errors);
            }

            // Process project status
            if (projectStatus.status === 'fulfilled' && projectStatus.value) {
                const statusEnrichment = await this.enrichProjectStatus(quickbaseRecordId, projectStatus.value);
                enrichmentResults.enrichedFields.push(...statusEnrichment.enrichedFields);
                enrichmentResults.errors.push(...statusEnrichment.errors);
            }

            // Handle rejected promises
            [customerData, dealData, notes, welcomeCallData, projectStatus].forEach((result, index) => {
                if (result.status === 'rejected') {
                    const apiNames = ['customer', 'deal', 'notes', 'welcomeCall', 'projectStatus'];
                    enrichmentResults.errors.push({
                        field: apiNames[index],
                        error: result.reason.message
                    });
                }
            });

            console.log(`✅ Data enrichment completed for record ${quickbaseRecordId}`);
            console.log(`   Enriched ${enrichmentResults.enrichedFields.length} fields`);
            console.log(`   ${enrichmentResults.errors.length} errors encountered`);

        } catch (error) {
            console.error(`❌ Data enrichment failed for record ${quickbaseRecordId}:`, error.message);
            enrichmentResults.success = false;
            enrichmentResults.errors.push({
                field: 'general',
                error: error.message
            });
        }

        return enrichmentResults;
    }

    /**
     * Enrich customer-specific data
     */
    async enrichCustomerData(recordId, customerData) {
        const enrichment = { enrichedFields: [], errors: [] };
        const updates = {};

        try {
            // Customer Email (Field ID 10)
            if (customerData.email && !updates[10]) {
                updates[10] = { value: customerData.email };
                enrichment.enrichedFields.push('Customer Email');
            }

            // Customer Phone (Field ID 11)
            if (customerData.phone && !updates[11]) {
                updates[11] = { value: customerData.phone };
                enrichment.enrichedFields.push('Customer Phone');
            }

            // Update QuickBase record if we have data
            if (Object.keys(updates).length > 0) {
                await this.quickbaseClient.updateRecord(recordId, updates);
                console.log(`   📧 Enriched customer contact data: ${enrichment.enrichedFields.join(', ')}`);
            }

        } catch (error) {
            enrichment.errors.push({
                field: 'customer',
                error: error.message
            });
        }

        return enrichment;
    }

    /**
     * Enrich deal-specific data
     */
    async enrichDealData(recordId, dealData) {
        const enrichment = { enrichedFields: [], errors: [] };
        const updates = {};

        try {
            // Project Status (Field ID 12)
            if (dealData.status && !updates[12]) {
                updates[12] = { value: dealData.status };
                enrichment.enrichedFields.push('Project Status');
            }

            // Submission Date (Field ID 13)
            if (dealData.submittedAt && !updates[13]) {
                updates[13] = { value: new Date(dealData.submittedAt).toISOString() };
                enrichment.enrichedFields.push('Submission Date');
            }

            // Created At (Field ID 186)
            if (dealData.createdAt && !updates[186]) {
                updates[186] = { value: new Date(dealData.createdAt).toISOString() };
                enrichment.enrichedFields.push('Created At');
            }

            // Updated At (Field ID 187)
            if (dealData.updatedAt && !updates[187]) {
                updates[187] = { value: new Date(dealData.updatedAt).toISOString() };
                enrichment.enrichedFields.push('Updated At');
            }

            // Update QuickBase record if we have data
            if (Object.keys(updates).length > 0) {
                await this.quickbaseClient.updateRecord(recordId, updates);
                console.log(`   📋 Enriched deal data: ${enrichment.enrichedFields.join(', ')}`);
            }

        } catch (error) {
            enrichment.errors.push({
                field: 'deal',
                error: error.message
            });
        }

        return enrichment;
    }

    /**
     * Enrich notes data
     */
    async enrichNotesData(recordId, notes) {
        const enrichment = { enrichedFields: [], errors: [] };
        const updates = {};

        try {
            if (notes.length > 0) {
                // Notes Count (Field ID 179)
                updates[179] = { value: notes.length };
                enrichment.enrichedFields.push('Notes Count');

                // Latest Note Text (Field ID 180)
                const latestNote = notes[notes.length - 1];
                if (latestNote.text) {
                    updates[180] = { value: latestNote.text };
                    enrichment.enrichedFields.push('Latest Note Text');
                }

                // Latest Note Date (Field ID 181)
                if (latestNote.createdAt) {
                    updates[181] = { value: new Date(latestNote.createdAt).toISOString() };
                    enrichment.enrichedFields.push('Latest Note Date');
                }

                // Latest Note Author (Field ID 182)
                if (latestNote.author) {
                    updates[182] = { value: latestNote.author };
                    enrichment.enrichedFields.push('Latest Note Author');
                }

                // All Notes JSON (Field ID 183)
                updates[183] = { value: JSON.stringify(notes) };
                enrichment.enrichedFields.push('All Notes JSON');

                // Note Categories (Field ID 184)
                const categories = [...new Set(notes.map(note => note.category).filter(Boolean))];
                if (categories.length > 0) {
                    updates[184] = { value: categories.join(', ') };
                    enrichment.enrichedFields.push('Note Categories');
                }

                // Note Authors List (Field ID 185)
                const authors = [...new Set(notes.map(note => note.author).filter(Boolean))];
                if (authors.length > 0) {
                    updates[185] = { value: authors.join(', ') };
                    enrichment.enrichedFields.push('Note Authors List');
                }

                // Update QuickBase record
                await this.quickbaseClient.updateRecord(recordId, updates);
                console.log(`   📝 Enriched notes data: ${enrichment.enrichedFields.join(', ')}`);
            }

        } catch (error) {
            enrichment.errors.push({
                field: 'notes',
                error: error.message
            });
        }

        return enrichment;
    }

    /**
     * Enrich welcome call data
     */
    async enrichWelcomeCallData(recordId, welcomeCallData) {
        const enrichment = { enrichedFields: [], errors: [] };
        const updates = {};

        try {
            // Welcome Call ID (Field ID 171)
            if (welcomeCallData.id) {
                updates[171] = { value: welcomeCallData.id };
                enrichment.enrichedFields.push('Welcome Call ID');
            }

            // Welcome Call Date (Field ID 172)
            if (welcomeCallData.date) {
                updates[172] = { value: new Date(welcomeCallData.date).toISOString() };
                enrichment.enrichedFields.push('Welcome Call Date');
            }

            // Welcome Call Duration (Field ID 173)
            if (welcomeCallData.duration) {
                updates[173] = { value: welcomeCallData.duration };
                enrichment.enrichedFields.push('Welcome Call Duration');
            }

            // Welcome Call Recording URL (Field ID 174)
            if (welcomeCallData.recordingUrl) {
                updates[174] = { value: welcomeCallData.recordingUrl };
                enrichment.enrichedFields.push('Welcome Call Recording URL');
            }

            // Welcome Call Questions JSON (Field ID 175)
            if (welcomeCallData.questions) {
                updates[175] = { value: JSON.stringify(welcomeCallData.questions) };
                enrichment.enrichedFields.push('Welcome Call Questions JSON');
            }

            // Welcome Call Answers JSON (Field ID 176)
            if (welcomeCallData.answers) {
                updates[176] = { value: JSON.stringify(welcomeCallData.answers) };
                enrichment.enrichedFields.push('Welcome Call Answers JSON');
            }

            // Welcome Call Agent (Field ID 177)
            if (welcomeCallData.agent) {
                updates[177] = { value: welcomeCallData.agent };
                enrichment.enrichedFields.push('Welcome Call Agent');
            }

            // Welcome Call Outcome (Field ID 178)
            if (welcomeCallData.outcome) {
                updates[178] = { value: welcomeCallData.outcome };
                enrichment.enrichedFields.push('Welcome Call Outcome');
            }

            // Update QuickBase record if we have data
            if (Object.keys(updates).length > 0) {
                await this.quickbaseClient.updateRecord(recordId, updates);
                console.log(`   📞 Enriched welcome call data: ${enrichment.enrichedFields.join(', ')}`);
            }

        } catch (error) {
            enrichment.errors.push({
                field: 'welcomeCall',
                error: error.message
            });
        }

        return enrichment;
    }

    /**
     * Enrich project status data
     */
    async enrichProjectStatus(recordId, projectStatus) {
        const enrichment = { enrichedFields: [], errors: [] };
        const updates = {};

        try {
            // Design Validation Status (Field ID 188)
            if (projectStatus.designValidation?.status) {
                updates[188] = { value: projectStatus.designValidation.status };
                enrichment.enrichedFields.push('Design Validation Status');
            }

            // Design Discrepancies JSON (Field ID 189)
            if (projectStatus.designValidation?.discrepancies) {
                updates[189] = { value: JSON.stringify(projectStatus.designValidation.discrepancies) };
                enrichment.enrichedFields.push('Design Discrepancies JSON');
            }

            // Validation Timestamp (Field ID 190)
            if (projectStatus.designValidation?.timestamp) {
                updates[190] = { value: new Date(projectStatus.designValidation.timestamp).toISOString() };
                enrichment.enrichedFields.push('Validation Timestamp');
            }

            // Validation Notes (Field ID 191)
            if (projectStatus.designValidation?.notes) {
                updates[191] = { value: projectStatus.designValidation.notes };
                enrichment.enrichedFields.push('Validation Notes');
            }

            // Update QuickBase record if we have data
            if (Object.keys(updates).length > 0) {
                await this.quickbaseClient.updateRecord(recordId, updates);
                console.log(`   ✅ Enriched project status data: ${enrichment.enrichedFields.join(', ')}`);
            }

        } catch (error) {
            enrichment.errors.push({
                field: 'projectStatus',
                error: error.message
            });
        }

        return enrichment;
    }

    /**
     * Get enrichment statistics
     */
    getStats() {
        return {
            enabled: this.enrichmentEnabled,
            apiConfigured: this.enerfloClient.isAvailable()
        };
    }
}

module.exports = DataEnrichment;
