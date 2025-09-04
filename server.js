const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const WebhookProcessor = require('./webhook-processor');

const app = express();
const webhookProcessor = new WebhookProcessor();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'enerflo-quickbase-webhook',
    version: '1.0.0'
  });
});

// Test endpoint to verify QuickBase connection
app.get('/test', async (req, res) => {
  try {
    const result = await webhookProcessor.testProcessing();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Main webhook endpoint
app.post('/webhook/enerflo', async (req, res) => {
  try {
    console.log('📨 Received Enerflo webhook');
    console.log('Event type:', req.body.event);
    console.log('Deal ID:', req.body.payload?.deal?.id);
    
    // Validate webhook payload
    if (!req.body.event || !req.body.payload) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook payload - missing event or payload'
      });
    }
    
    // Process the webhook
    const result = await webhookProcessor.processWebhook(req.body);
    
    console.log('✅ Webhook processed successfully');
    res.json({
      success: true,
      message: 'Webhook processed successfully',
      result: {
        dealId: result.dealId,
        eventType: result.eventType,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      dealId: req.body.payload?.deal?.id || 'unknown'
    });
  }
});

// Test webhook endpoint with sample data
app.post('/webhook/test', async (req, res) => {
  try {
    console.log('🧪 Testing webhook with sample data');
    
    // Load sample webhook data
    const sampleWebhook = require('./docs/webhook-actual.json');
    
    const result = await webhookProcessor.processWebhook(sampleWebhook);
    
    res.json({
      success: true,
      message: 'Test webhook processed successfully',
      result
    });
    
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log('🚀 Enerflo-QuickBase Webhook Server Started');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`📨 Webhook endpoint: http://localhost:${PORT}/webhook/enerflo`);
  console.log(`🧪 Test webhook: http://localhost:${PORT}/webhook/test`);
  console.log('');
  console.log('📋 QuickBase Configuration:');
  console.log(`   Realm: ${config.quickbase.realm}`);
  console.log(`   Table ID: ${config.quickbase.tableId}`);
  console.log('');
  console.log('✅ Ready to receive webhooks!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
