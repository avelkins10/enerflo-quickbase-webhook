const EnerfloWebhookServerV2 = require('./index-v2-final');
const FieldValidator = require('./field-validator');
const DataTypeConverter = require('./data-type-converter');
const WebhookValidator = require('./webhook-validator');
const PerformanceMonitor = require('./performance-monitor');

class TestSuite {
  constructor() {
    this.fieldValidator = new FieldValidator();
    this.dataTypeConverter = new DataTypeConverter();
    this.webhookValidator = new WebhookValidator();
    this.performanceMonitor = new PerformanceMonitor();
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Test Suite');
    console.log('='.repeat(60));
    
    try {
      await this.testFieldValidator();
      await this.testDataTypeConverter();
      await this.testWebhookValidator();
      await this.testPerformanceMonitor();
      await this.testIntegration();
      
      this.printTestResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }
  }

  async testFieldValidator() {
    console.log('\n🔍 Testing Field Validator...');
    
    // Test 1: Valid field mapping
    this.runTest('Field Validator - Valid Mapping', () => {
      const mappings = {
        5: { value: 'test-deal-id', comment: 'Enerflo Deal ID' },
        6: { value: 'John Doe', comment: 'Customer Full Name' },
        13: { value: 10.5, comment: 'System Size kW' },
        21: { value: 50000, comment: 'Gross Cost' }
      };
      
      const isValid = this.fieldValidator.validateAllMappings(mappings);
      return isValid;
    });

    // Test 2: Invalid field mapping
    this.runTest('Field Validator - Invalid Mapping', () => {
      const mappings = {
        5: { value: 123, comment: 'Enerflo Deal ID' }, // Should be string
        6: { value: null, comment: 'Customer Full Name' }, // Should not be null
        13: { value: 'not-a-number', comment: 'System Size kW' }, // Should be numeric
        21: { value: 'invalid-currency', comment: 'Gross Cost' } // Should be numeric
      };
      
      const isValid = this.fieldValidator.validateAllMappings(mappings);
      return !isValid; // Should be invalid
    });

    // Test 3: Field type detection
    this.runTest('Field Validator - Type Detection', () => {
      const fieldType = this.fieldValidator.getFieldType('5');
      const fieldLabel = this.fieldValidator.getFieldLabel('5');
      return fieldType === 'Text' && fieldLabel === 'Enerflo Deal ID';
    });
  }

  async testDataTypeConverter() {
    console.log('\n🔄 Testing Data Type Converter...');
    
    // Test 1: Numeric conversion
    this.runTest('Data Type Converter - Numeric', () => {
      const result = this.dataTypeConverter.convertFieldValue('123.45', 'Numeric', '13', 'System Size kW');
      return typeof result === 'number' && result === 123.45;
    });

    // Test 2: Currency conversion
    this.runTest('Data Type Converter - Currency', () => {
      const result = this.dataTypeConverter.convertFieldValue('$50,000.00', 'Currency', '21', 'Gross Cost');
      return typeof result === 'number' && result === 50000;
    });

    // Test 3: Checkbox conversion
    this.runTest('Data Type Converter - Checkbox', () => {
      const result1 = this.dataTypeConverter.convertFieldValue('true', 'Checkbox', '40', 'Has Signed Contract');
      const result2 = this.dataTypeConverter.convertFieldValue('false', 'Checkbox', '40', 'Has Signed Contract');
      return result1 === true && result2 === false;
    });

    // Test 4: Date conversion
    this.runTest('Data Type Converter - Date', () => {
      const result = this.dataTypeConverter.convertFieldValue('2024-01-15T10:30:00Z', 'Date / Time', '12', 'Submission Date');
      return typeof result === 'string' && result.includes('2024-01-15');
    });

    // Test 5: Email validation
    this.runTest('Data Type Converter - Email', () => {
      const result1 = this.dataTypeConverter.convertFieldValue('test@example.com', 'Email', '7', 'Customer Email');
      const result2 = this.dataTypeConverter.convertFieldValue('invalid-email', 'Email', '7', 'Customer Email');
      return result1 === 'test@example.com' && result2 === '';
    });
  }

  async testWebhookValidator() {
    console.log('\n📨 Testing Webhook Validator...');
    
    // Test 1: Valid webhook payload
    this.runTest('Webhook Validator - Valid Payload', () => {
      const validPayload = {
        event: 'deal.projectSubmitted',
        payload: {
          deal: {
            id: 'test-deal-123',
            status: 'submitted'
          },
          customer: {
            id: 'customer-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com'
          },
          proposal: {
            id: 'proposal-123',
            pricingOutputs: {
              design: {
                systemSize: 10000,
                arrays: []
              },
              grossCost: 50000,
              baseCost: 45000
            }
          }
        }
      };
      
      const result = this.webhookValidator.validateWebhookPayload(validPayload);
      return result.isValid;
    });

    // Test 2: Invalid webhook payload
    this.runTest('Webhook Validator - Invalid Payload', () => {
      const invalidPayload = {
        event: 'deal.projectSubmitted',
        payload: {
          deal: {
            id: 'test-deal-123'
            // Missing status
          },
          customer: {
            id: 'customer-123'
            // Missing required fields
          },
          proposal: {
            id: 'proposal-123'
            // Missing pricingOutputs
          }
        }
      };
      
      const result = this.webhookValidator.validateWebhookPayload(invalidPayload);
      return !result.isValid;
    });

    // Test 3: Data quality warnings
    this.runTest('Webhook Validator - Data Quality', () => {
      const payloadWithWarnings = {
        event: 'deal.projectSubmitted',
        payload: {
          deal: {
            id: 'test-deal-123',
            status: 'draft' // Should trigger warning
          },
          customer: {
            id: 'customer-123',
            firstName: 'John',
            lastName: 'Doe',
            email: '', // Should trigger warning
            phone: '' // Should trigger warning
          },
          proposal: {
            id: 'proposal-123',
            pricingOutputs: {
              design: {
                systemSize: 10000,
                arrays: []
              },
              grossCost: 50000,
              baseCost: 45000
            }
          }
        }
      };
      
      const result = this.webhookValidator.validateWebhookPayload(payloadWithWarnings);
      return result.isValid && result.warnings.length > 0;
    });
  }

  async testPerformanceMonitor() {
    console.log('\n📊 Testing Performance Monitor...');
    
    // Test 1: Metric recording
    this.runTest('Performance Monitor - Metric Recording', () => {
      this.performanceMonitor.startTimer('test-1', 'webhook_processing');
      this.performanceMonitor.endTimer('test-1', true, { dealId: 'test-123' });
      
      const summary = this.performanceMonitor.getPerformanceSummary();
      return summary.metrics.webhookProcessing.total === 1;
    });

    // Test 2: Alert generation
    this.runTest('Performance Monitor - Alert Generation', () => {
      // Simulate slow processing
      this.performanceMonitor.startTimer('test-2', 'webhook_processing');
      this.performanceMonitor.endTimer('test-2', true, { 
        dealId: 'test-123',
        processingTime: 35000 // 35 seconds (above threshold)
      });
      
      const summary = this.performanceMonitor.getPerformanceSummary();
      return summary.alerts.length > 0;
    });

    // Test 3: Health score calculation
    this.runTest('Performance Monitor - Health Score', () => {
      const summary = this.performanceMonitor.getPerformanceSummary();
      return summary.health.overall >= 0 && summary.health.overall <= 100;
    });
  }

  async testIntegration() {
    console.log('\n🔗 Testing Integration...');
    
    // Test 1: End-to-end field mapping
    this.runTest('Integration - End-to-End Mapping', () => {
      const testWebhook = {
        event: 'deal.projectSubmitted',
        payload: {
          deal: {
            id: 'integration-test-123',
            status: 'submitted',
            submittedAt: '2024-01-15T10:30:00Z'
          },
          customer: {
            id: 'customer-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '555-123-4567'
          },
          proposal: {
            id: 'proposal-123',
            pricingOutputs: {
              design: {
                systemSize: 10000,
                arrays: [{
                  modules: [{
                    model: 'Test Panel',
                    manufacturer: 'Test Manufacturer',
                    watts: 400,
                    quantity: 25
                  }]
                }]
              },
              grossCost: 50000,
              baseCost: 45000,
              netCost: 40000
            }
          }
        }
      };
      
      try {
        // Validate webhook
        const validation = this.webhookValidator.validateWebhookPayload(testWebhook);
        if (!validation.isValid) return false;
        
        // Map fields (simplified version)
        const mappings = {
          5: { value: testWebhook.payload.deal.id, comment: 'Enerflo Deal ID' },
          6: { value: `${testWebhook.payload.customer.firstName} ${testWebhook.payload.customer.lastName}`, comment: 'Customer Full Name' },
          7: { value: testWebhook.payload.customer.email, comment: 'Customer Email' },
          13: { value: testWebhook.payload.proposal.pricingOutputs.design.systemSize / 1000, comment: 'System Size kW' },
          21: { value: testWebhook.payload.proposal.pricingOutputs.grossCost, comment: 'Gross Cost' }
        };
        
        // Convert data types
        const converted = this.dataTypeConverter.convertAllFields(mappings, this.fieldValidator.quickbaseFields);
        
        // Validate converted fields
        const fieldValidation = this.fieldValidator.validateAllMappings(converted);
        
        return fieldValidation;
        
      } catch (error) {
        console.error('Integration test error:', error.message);
        return false;
      }
    });
  }

  runTest(testName, testFunction) {
    this.testResults.total++;
    
    try {
      const result = testFunction();
      if (result) {
        this.testResults.passed++;
        this.testResults.details.push({ name: testName, status: 'PASSED' });
        console.log(`  ✅ ${testName}`);
      } else {
        this.testResults.failed++;
        this.testResults.details.push({ name: testName, status: 'FAILED' });
        console.log(`  ❌ ${testName}`);
      }
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({ name: testName, status: 'ERROR', error: error.message });
      console.log(`  ❌ ${testName} - ERROR: ${error.message}`);
    }
  }

  printTestResults() {
    console.log('\n📋 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);
    console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.details
        .filter(test => test.status !== 'PASSED')
        .forEach(test => {
          console.log(`  • ${test.name}: ${test.status}`);
          if (test.error) {
            console.log(`    Error: ${test.error}`);
          }
        });
    }
    
    console.log('='.repeat(60));
    
    if (this.testResults.failed === 0) {
      console.log('🎉 All tests passed! The system is ready for production.');
    } else {
      console.log('⚠️  Some tests failed. Please review and fix before deployment.');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new TestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = TestSuite;
