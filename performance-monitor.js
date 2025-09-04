class PerformanceMonitor {
  constructor() {
    this.metrics = {
      webhookProcessing: {
        total: 0,
        successful: 0,
        failed: 0,
        averageProcessingTime: 0,
        processingTimes: []
      },
      quickbaseOperations: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimes: []
      },
      enerfloAPI: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimes: []
      },
      fieldMapping: {
        total: 0,
        averageFieldsPerRecord: 0,
        fieldCounts: []
      }
    };
    
    this.startTimes = new Map();
    this.alerts = [];
    this.alertThresholds = {
      webhookProcessingTime: 30000, // 30 seconds
      quickbaseResponseTime: 10000, // 10 seconds
      enerfloAPIResponseTime: 15000, // 15 seconds
      errorRate: 0.1 // 10%
    };
  }

  // Start timing an operation
  startTimer(operationId, operationType) {
    this.startTimes.set(operationId, {
      startTime: Date.now(),
      operationType
    });
  }

  // End timing an operation and record metrics
  endTimer(operationId, success = true, additionalData = {}) {
    const timer = this.startTimes.get(operationId);
    if (!timer) {
      console.warn(`⚠️  Timer not found for operation: ${operationId}`);
      return;
    }

    const duration = Date.now() - timer.startTime;
    const { operationType } = timer;
    
    this.recordMetric(operationType, duration, success, additionalData);
    this.startTimes.delete(operationId);
    
    return duration;
  }

  recordMetric(operationType, duration, success, additionalData = {}) {
    switch (operationType) {
      case 'webhook_processing':
        this.recordWebhookMetric(duration, success, additionalData);
        break;
      case 'quickbase_operation':
        this.recordQuickBaseMetric(duration, success, additionalData);
        break;
      case 'enerflo_api':
        this.recordEnerfloAPIMetric(duration, success, additionalData);
        break;
      case 'field_mapping':
        this.recordFieldMappingMetric(duration, success, additionalData);
        break;
      default:
        console.warn(`⚠️  Unknown operation type: ${operationType}`);
    }
  }

  recordWebhookMetric(duration, success, additionalData) {
    const metrics = this.metrics.webhookProcessing;
    
    metrics.total++;
    if (success) {
      metrics.successful++;
    } else {
      metrics.failed++;
    }
    
    metrics.processingTimes.push(duration);
    
    // Keep only last 100 processing times for average calculation
    if (metrics.processingTimes.length > 100) {
      metrics.processingTimes.shift();
    }
    
    metrics.averageProcessingTime = this.calculateAverage(metrics.processingTimes);
    
    // Check for alerts
    this.checkWebhookAlerts(duration, success, additionalData);
  }

  recordQuickBaseMetric(duration, success, additionalData) {
    const metrics = this.metrics.quickbaseOperations;
    
    metrics.total++;
    if (success) {
      metrics.successful++;
    } else {
      metrics.failed++;
    }
    
    metrics.responseTimes.push(duration);
    
    if (metrics.responseTimes.length > 100) {
      metrics.responseTimes.shift();
    }
    
    metrics.averageResponseTime = this.calculateAverage(metrics.responseTimes);
    
    this.checkQuickBaseAlerts(duration, success, additionalData);
  }

  recordEnerfloAPIMetric(duration, success, additionalData) {
    const metrics = this.metrics.enerfloAPI;
    
    metrics.total++;
    if (success) {
      metrics.successful++;
    } else {
      metrics.failed++;
    }
    
    metrics.responseTimes.push(duration);
    
    if (metrics.responseTimes.length > 100) {
      metrics.responseTimes.shift();
    }
    
    metrics.averageResponseTime = this.calculateAverage(metrics.responseTimes);
    
    this.checkEnerfloAPIAlerts(duration, success, additionalData);
  }

  recordFieldMappingMetric(duration, success, additionalData) {
    const metrics = this.metrics.fieldMapping;
    
    metrics.total++;
    
    if (additionalData.fieldCount) {
      metrics.fieldCounts.push(additionalData.fieldCount);
      
      if (metrics.fieldCounts.length > 100) {
        metrics.fieldCounts.shift();
      }
      
      metrics.averageFieldsPerRecord = this.calculateAverage(metrics.fieldCounts);
    }
  }

  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  checkWebhookAlerts(duration, success, additionalData) {
    if (duration > this.alertThresholds.webhookProcessingTime) {
      this.addAlert('webhook_slow_processing', {
        duration,
        threshold: this.alertThresholds.webhookProcessingTime,
        dealId: additionalData.dealId
      });
    }
    
    if (!success) {
      this.addAlert('webhook_processing_failed', {
        dealId: additionalData.dealId,
        error: additionalData.error
      });
    }
  }

  checkQuickBaseAlerts(duration, success, additionalData) {
    if (duration > this.alertThresholds.quickbaseResponseTime) {
      this.addAlert('quickbase_slow_response', {
        duration,
        threshold: this.alertThresholds.quickbaseResponseTime,
        operation: additionalData.operation
      });
    }
    
    if (!success) {
      this.addAlert('quickbase_operation_failed', {
        operation: additionalData.operation,
        error: additionalData.error
      });
    }
  }

  checkEnerfloAPIAlerts(duration, success, additionalData) {
    if (duration > this.alertThresholds.enerfloAPIResponseTime) {
      this.addAlert('enerflo_api_slow_response', {
        duration,
        threshold: this.alertThresholds.enerfloAPIResponseTime,
        endpoint: additionalData.endpoint
      });
    }
    
    if (!success) {
      this.addAlert('enerflo_api_failed', {
        endpoint: additionalData.endpoint,
        error: additionalData.error
      });
    }
  }

  addAlert(type, data) {
    const alert = {
      type,
      timestamp: new Date().toISOString(),
      data
    };
    
    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }
    
    console.warn(`🚨 Performance Alert: ${type}`, data);
  }

  // Get current performance summary
  getPerformanceSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      metrics: { ...this.metrics },
      alerts: this.alerts.slice(-10), // Last 10 alerts
      health: this.calculateHealthScore()
    };
    
    // Calculate error rates
    summary.metrics.webhookProcessing.errorRate = this.calculateErrorRate(
      this.metrics.webhookProcessing.failed,
      this.metrics.webhookProcessing.total
    );
    
    summary.metrics.quickbaseOperations.errorRate = this.calculateErrorRate(
      this.metrics.quickbaseOperations.failed,
      this.metrics.quickbaseOperations.total
    );
    
    summary.metrics.enerfloAPI.errorRate = this.calculateErrorRate(
      this.metrics.enerfloAPI.failed,
      this.metrics.enerfloAPI.total
    );
    
    return summary;
  }

  calculateErrorRate(failed, total) {
    if (total === 0) return 0;
    return failed / total;
  }

  calculateHealthScore() {
    const webhookHealth = this.calculateOperationHealth(this.metrics.webhookProcessing);
    const quickbaseHealth = this.calculateOperationHealth(this.metrics.quickbaseOperations);
    const enerfloHealth = this.calculateOperationHealth(this.metrics.enerfloAPI);
    
    return {
      overall: Math.round((webhookHealth + quickbaseHealth + enerfloHealth) / 3),
      webhook: webhookHealth,
      quickbase: quickbaseHealth,
      enerflo: enerfloHealth
    };
  }

  calculateOperationHealth(metrics) {
    if (metrics.total === 0) return 100;
    
    const errorRate = metrics.failed / metrics.total;
    const successRate = 1 - errorRate;
    
    // Base health on success rate (0-100)
    let health = successRate * 100;
    
    // Penalize for slow performance
    if (metrics.averageProcessingTime > this.alertThresholds.webhookProcessingTime) {
      health *= 0.8;
    }
    
    return Math.round(health);
  }

  // Print performance report
  printPerformanceReport() {
    const summary = this.getPerformanceSummary();
    
    console.log('\n📊 PERFORMANCE MONITORING REPORT');
    console.log('='.repeat(60));
    console.log(`🕐 Generated: ${summary.timestamp}`);
    console.log(`🏥 Overall Health: ${summary.health.overall}%`);
    console.log('');
    
    // Webhook Processing
    console.log('📨 WEBHOOK PROCESSING:');
    console.log(`  Total: ${summary.metrics.webhookProcessing.total}`);
    console.log(`  Successful: ${summary.metrics.webhookProcessing.successful}`);
    console.log(`  Failed: ${summary.metrics.webhookProcessing.failed}`);
    console.log(`  Error Rate: ${(summary.metrics.webhookProcessing.errorRate * 100).toFixed(2)}%`);
    console.log(`  Avg Processing Time: ${summary.metrics.webhookProcessing.averageProcessingTime.toFixed(2)}ms`);
    console.log(`  Health: ${summary.health.webhook}%`);
    console.log('');
    
    // QuickBase Operations
    console.log('🗄️  QUICKBASE OPERATIONS:');
    console.log(`  Total: ${summary.metrics.quickbaseOperations.total}`);
    console.log(`  Successful: ${summary.metrics.quickbaseOperations.successful}`);
    console.log(`  Failed: ${summary.metrics.quickbaseOperations.failed}`);
    console.log(`  Error Rate: ${(summary.metrics.quickbaseOperations.errorRate * 100).toFixed(2)}%`);
    console.log(`  Avg Response Time: ${summary.metrics.quickbaseOperations.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Health: ${summary.health.quickbase}%`);
    console.log('');
    
    // Enerflo API
    console.log('🔌 ENERFLO API:');
    console.log(`  Total: ${summary.metrics.enerfloAPI.total}`);
    console.log(`  Successful: ${summary.metrics.enerfloAPI.successful}`);
    console.log(`  Failed: ${summary.metrics.enerfloAPI.failed}`);
    console.log(`  Error Rate: ${(summary.metrics.enerfloAPI.errorRate * 100).toFixed(2)}%`);
    console.log(`  Avg Response Time: ${summary.metrics.enerfloAPI.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Health: ${summary.health.enerflo}%`);
    console.log('');
    
    // Field Mapping
    console.log('🗺️  FIELD MAPPING:');
    console.log(`  Total Records: ${summary.metrics.fieldMapping.total}`);
    console.log(`  Avg Fields per Record: ${summary.metrics.fieldMapping.averageFieldsPerRecord.toFixed(2)}`);
    console.log('');
    
    // Recent Alerts
    if (summary.alerts.length > 0) {
      console.log('🚨 RECENT ALERTS:');
      summary.alerts.forEach(alert => {
        console.log(`  ${alert.timestamp}: ${alert.type}`);
      });
    } else {
      console.log('✅ No recent alerts');
    }
    
    console.log('='.repeat(60));
  }

  // Reset all metrics
  reset() {
    this.metrics = {
      webhookProcessing: {
        total: 0,
        successful: 0,
        failed: 0,
        averageProcessingTime: 0,
        processingTimes: []
      },
      quickbaseOperations: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimes: []
      },
      enerfloAPI: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimes: []
      },
      fieldMapping: {
        total: 0,
        averageFieldsPerRecord: 0,
        fieldCounts: []
      }
    };
    
    this.alerts = [];
    this.startTimes.clear();
    
    console.log('🔄 Performance metrics reset');
  }
}

module.exports = PerformanceMonitor;
