const express = require('express');
const cors = require('cors');
const DataMapper = require('./data-mapper');
const FieldValidator = require('./field-validator');
const DataTypeConverter = require('./data-type-converter');
const WebhookValidator = require('./webhook-validator');
const ErrorRecovery = require('./error-recovery');
const PerformanceMonitor = require('./performance-monitor');
const EnerfloAPIClientV2 = require('./enerflo-api-client-v2');
const DataEnrichmentV2 = require('./data-enrichment-v2');

class EnerfloWebhookServerV2 {
  constructor() {
    this.app = express();
    this.dataMapper = new DataMapper();
    this.fieldValidator = new FieldValidator();
    this.dataTypeConverter = new DataTypeConverter();
    this.webhookValidator = new WebhookValidator();
    this.errorRecovery = new ErrorRecovery();
    this.performanceMonitor = new PerformanceMonitor();
    this.apiClient = new EnerfloAPIClientV2();
    this.enrichment = new DataEnrichmentV2();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging with performance monitoring
    this.app.use((req, res, next) => {
      const requestId = `${req.method}-${req.path}-${Date.now()}`;
      req.requestId = requestId;
      
      console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.path} [${requestId}]`);
      this.performanceMonitor.startTimer(requestId, 'webhook_processing');
      
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const health = this.getHealthStatus();
      res.json(health);
    });

    // Performance monitoring endpoint
    this.app.get('/metrics', (req, res) => {
      const metrics = this.performanceMonitor.getPerformanceSummary();
      res.json(metrics);
    });

    // Main webhook endpoint
    this.app.post('/webhook/enerflo', async (req, res) => {
      try {
        await this.handleWebhook(req, res);
      } catch (error) {
        console.error('❌ Critical error in webhook handler:', error);
        this.performanceMonitor.endTimer(req.requestId, false, { error: error.message });
        res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    });

    // Test endpoint for development
    this.app.post('/test/webhook', async (req, res) => {
      try {
        console.log('🧪 Test webhook endpoint called');
        await this.handleWebhook(req, res);
      } catch (error) {
        console.error('❌ Test webhook error:', error);
        this.performanceMonitor.endTimer(req.requestId, false, { error: error.message });
        res.status(500).json({ 
          error: 'Test webhook failed',
          message: error.message 
        });
      }
    });
  }

  setupErrorHandling() {
    this.app.use((error, req, res, next) => {
      console.error('❌ Unhandled error:', error);
      this.performanceMonitor.endTimer(req.requestId, false, { error: error.message });
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    });
  }

  async handleWebhook(req, res) {
    const startTime = Date.now();
    const requestId = req.requestId;
    
    try {
      console.log(`🔄 Processing webhook request [${requestId}]`);
      
      // Step 1: Validate webhook payload
      const validationResult = this.webhookValidator.validateWebhookPayload(req.body);
      this.webhookValidator.printValidationReport(validationResult);
      
      if (!validationResult.isValid) {
        throw new Error(`Webhook validation failed: ${validationResult.errors.join(', ')}`);
      }

      const webhookPayload = req.body;
      const dealId = webhookPayload.payload.deal.id;
      const customerName = `${webhookPayload.payload.customer.firstName} ${webhookPayload.payload.customer.lastName}`.trim();
      
      console.log(`📨 Processing webhook for deal ${dealId} (${customerName})`);

      // Step 2: Map webhook data to QuickBase fields
      this.performanceMonitor.startTimer(`${requestId}-mapping`, 'field_mapping');
      const rawFieldMappings = this.dataMapper.mapWebhookToQuickBase(webhookPayload);
      this.performanceMonitor.endTimer(`${requestId}-mapping`, true, { 
        fieldCount: Object.keys(rawFieldMappings).length 
      });

      // Step 3: Convert data types
      const convertedMappings = this.dataTypeConverter.convertAllFields(
        rawFieldMappings, 
        this.fieldValidator.quickbaseFields
      );

      // Step 4: Validate converted fields
      const fieldValidationPassed = this.fieldValidator.validateAllMappings(convertedMappings);
      if (!fieldValidationPassed) {
        throw new Error('Field validation failed after data type conversion');
      }

      // Step 5: Create or update QuickBase record with error recovery
      const quickbaseResult = await this.errorRecovery.retryWithBackoff(
        () => this.upsertQuickBaseRecord(dealId, convertedMappings),
        `QuickBase upsert for deal ${dealId}`
      );
      
      // Step 6: Start enrichment process (async, don't wait)
      this.enrichment.enrichRecord(quickbaseResult.recordId, dealId)
        .catch(error => {
          console.error('❌ Enrichment failed:', error);
          this.performanceMonitor.addAlert('enrichment_failed', {
            dealId,
            recordId: quickbaseResult.recordId,
            error: error.message
          });
        });

      const processingTime = Date.now() - startTime;
      this.performanceMonitor.endTimer(requestId, true, { 
        dealId, 
        recordId: quickbaseResult.recordId,
        processingTime 
      });
      
      console.log(`✅ Webhook processed successfully in ${processingTime}ms [${requestId}]`);
      
      res.json({ 
        success: true, 
        message: 'Webhook processed successfully',
        dealId,
        recordId: quickbaseResult.recordId,
        processingTime: `${processingTime}ms`,
        requestId,
        validation: {
          errors: validationResult.errors.length,
          warnings: validationResult.warnings.length
        }
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Webhook processing failed after ${processingTime}ms [${requestId}]:`, error.message);
      
      this.performanceMonitor.endTimer(requestId, false, { 
        error: error.message,
        processingTime 
      });
      
      res.status(400).json({ 
        success: false,
        error: 'Webhook processing failed',
        message: error.message,
        processingTime: `${processingTime}ms`,
        requestId
      });
    }
  }

  async upsertQuickBaseRecord(dealId, fieldMappings) {
    const operationId = `qb-${dealId}-${Date.now()}`;
    this.performanceMonitor.startTimer(operationId, 'quickbase_operation');
    
    try {
      // Check if record already exists
      const existingRecordId = await this.findExistingRecord(dealId);
      
      const payload = {
        to: process.env.QB_TABLE_ID,
        data: [fieldMappings]
      };

      const url = existingRecordId 
        ? `https://${process.env.QB_REALM}/db/${process.env.QB_TABLE_ID}?a=API_EditRecord&rid=${existingRecordId}`
        : `https://${process.env.QB_REALM}/db/${process.env.QB_TABLE_ID}?a=API_AddRecord`;

      console.log(`🔄 ${existingRecordId ? 'Updating' : 'Creating'} record for deal ${dealId}`);
      console.log(`📊 Payload size: ${JSON.stringify(payload).length} characters`);
      console.log(`📊 Number of fields: ${Object.keys(fieldMappings).length}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getQuickBaseHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ QuickBase API Error: ${response.status} ${response.statusText}`);
        console.error(`❌ Error Details: ${errorText}`);
        
        this.performanceMonitor.endTimer(operationId, false, { 
          operation: existingRecordId ? 'update' : 'create',
          error: errorText 
        });
        
        throw new Error(`QuickBase operation failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ QuickBase API Response:`, JSON.stringify(result, null, 2));

      // Determine record ID
      let recordId;
      if (result.metadata?.createdRecordIds?.length > 0) {
        recordId = result.metadata.createdRecordIds[0];
        console.log(`✅ Successfully created record ${recordId} for deal ${dealId}`);
      } else if (result.metadata?.updatedRecordIds?.length > 0) {
        recordId = result.metadata.updatedRecordIds[0];
        console.log(`✅ Successfully updated record ${recordId} for deal ${dealId}`);
      } else {
        throw new Error(`No record created or updated for deal ${dealId}`);
      }

      this.performanceMonitor.endTimer(operationId, true, { 
        operation: existingRecordId ? 'update' : 'create',
        recordId 
      });

      return { recordId, result };

    } catch (error) {
      this.performanceMonitor.endTimer(operationId, false, { 
        operation: 'upsert',
        error: error.message 
      });
      
      throw error;
    }
  }

  async findExistingRecord(dealId) {
    try {
      const query = {
        from: process.env.QB_TABLE_ID,
        select: [3], // Record ID field
        where: `{6.EX.'${dealId}'}` // Enerflo Deal ID field
      };

      const response = await fetch(`https://${process.env.QB_REALM}/db/${process.env.QB_TABLE_ID}?a=API_DoQuery`, {
        method: 'POST',
        headers: this.getQuickBaseHeaders(),
        body: JSON.stringify(query)
      });

      if (!response.ok) {
        console.warn(`⚠️  Could not check for existing record: ${response.status}`);
        return null;
      }

      const result = await response.json();
      return result.data?.[0]?.[3] || null;

    } catch (error) {
      console.warn(`⚠️  Error checking for existing record: ${error.message}`);
      return null;
    }
  }

  getQuickBaseHeaders() {
    return {
      'Content-Type': 'application/json',
      'QB-Realm-Hostname': process.env.QB_REALM,
      'Authorization': `QB-USER-TOKEN ${process.env.QB_USER_TOKEN}`
    };
  }

  getHealthStatus() {
    const performance = this.performanceMonitor.getPerformanceSummary();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      health: performance.health,
      agents: [
        'Webhook Validator',
        'Field Validator', 
        'Data Type Converter',
        'Error Recovery',
        'Performance Monitor',
        'Enerflo API Client v2',
        'Data Enrichment v2'
      ],
      metrics: {
        webhookProcessing: performance.metrics.webhookProcessing.total,
        quickbaseOperations: performance.metrics.quickbaseOperations.total,
        enerfloAPI: performance.metrics.enerfloAPI.total
      },
      alerts: performance.alerts.length,
      uptime: process.uptime()
    };
  }

  start(port = process.env.PORT || 3000) {
    this.app.listen(port, () => {
      console.log(`🚀 Enerflo Webhook Server v2.0.0 running on port ${port}`);
      console.log(`📡 Webhook endpoint: http://localhost:${port}/webhook/enerflo`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
      console.log(`📊 Metrics: http://localhost:${port}/metrics`);
      console.log(`🧪 Test endpoint: http://localhost:${port}/test/webhook`);
      console.log('');
      console.log('🛡️  Agents loaded:');
      console.log('  ✅ Webhook Validator');
      console.log('  ✅ Field Validator');
      console.log('  ✅ Data Type Converter');
      console.log('  ✅ Error Recovery');
      console.log('  ✅ Performance Monitor');
      console.log('  ✅ Enerflo API Client v2');
      console.log('  ✅ Data Enrichment v2');
      console.log('');
      console.log('🎯 Ready to process webhooks with bulletproof reliability!');
    });
  }
}

// Start the server
const server = new EnerfloWebhookServerV2();
server.start();

module.exports = EnerfloWebhookServerV2;
