class ErrorRecovery {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    this.maxRetryDelay = 10000; // 10 seconds
    this.backoffMultiplier = 2;
  }

  // Retry a function with exponential backoff
  async retryWithBackoff(fn, context = '', maxAttempts = null) {
    const attempts = maxAttempts || this.retryAttempts;
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${attempts} for ${context}`);
        const result = await fn();
        console.log(`✅ Success on attempt ${attempt} for ${context}`);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️  Attempt ${attempt}/${attempts} failed for ${context}: ${error.message}`);
        
        if (attempt < attempts) {
          const delay = Math.min(
            this.retryDelay * Math.pow(this.backoffMultiplier, attempt - 1),
            this.maxRetryDelay
          );
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    console.error(`❌ All ${attempts} attempts failed for ${context}`);
    throw lastError;
  }

  // Handle QuickBase API errors with specific recovery strategies
  async handleQuickBaseError(error, operation, recordData = null) {
    console.error(`❌ QuickBase ${operation} error:`, error.message);

    if (error.message.includes('400 Bad Request')) {
      return this.handleBadRequestError(error, operation, recordData);
    }
    
    if (error.message.includes('401 Unauthorized')) {
      return this.handleUnauthorizedError(error, operation);
    }
    
    if (error.message.includes('403 Forbidden')) {
      return this.handleForbiddenError(error, operation);
    }
    
    if (error.message.includes('404 Not Found')) {
      return this.handleNotFoundError(error, operation);
    }
    
    if (error.message.includes('429 Too Many Requests')) {
      return this.handleRateLimitError(error, operation);
    }
    
    if (error.message.includes('500 Internal Server Error')) {
      return this.handleServerError(error, operation);
    }

    // Generic error handling
    return this.handleGenericError(error, operation);
  }

  handleBadRequestError(error, operation, recordData) {
    console.log('🔍 Analyzing 400 Bad Request error...');
    
    // Check for field validation errors
    if (error.message.includes('Incompatible value for field')) {
      const fieldMatch = error.message.match(/field with ID "(\d+)"/);
      if (fieldMatch) {
        const fieldId = fieldMatch[1];
        console.log(`🔧 Field ${fieldId} has incompatible value`);
        
        if (recordData && recordData[fieldId]) {
          console.log(`🔧 Attempting to fix field ${fieldId} value: ${recordData[fieldId].value}`);
          return this.fixFieldValue(fieldId, recordData[fieldId].value);
        }
      }
    }
    
    // Check for missing required fields
    if (error.message.includes('Required field')) {
      console.log('🔧 Missing required field detected');
      return this.fixMissingRequiredFields(recordData);
    }
    
    return {
      recoverable: false,
      action: 'manual_review',
      message: 'Bad request requires manual review of field mappings'
    };
  }

  handleUnauthorizedError(error, operation) {
    console.log('🔧 Unauthorized error - checking API credentials');
    return {
      recoverable: false,
      action: 'check_credentials',
      message: 'API credentials may be invalid or expired'
    };
  }

  handleForbiddenError(error, operation) {
    console.log('🔧 Forbidden error - checking permissions');
    return {
      recoverable: false,
      action: 'check_permissions',
      message: 'Insufficient permissions for this operation'
    };
  }

  handleNotFoundError(error, operation) {
    console.log('🔧 Not found error - checking resource existence');
    return {
      recoverable: false,
      action: 'check_resource',
      message: 'Resource not found - may need to create or verify existence'
    };
  }

  handleRateLimitError(error, operation) {
    console.log('🔧 Rate limit error - implementing backoff strategy');
    return {
      recoverable: true,
      action: 'retry_with_backoff',
      message: 'Rate limited - will retry with exponential backoff',
      retryDelay: this.maxRetryDelay
    };
  }

  handleServerError(error, operation) {
    console.log('🔧 Server error - implementing retry strategy');
    return {
      recoverable: true,
      action: 'retry_with_backoff',
      message: 'Server error - will retry with exponential backoff',
      retryDelay: this.retryDelay
    };
  }

  handleGenericError(error, operation) {
    console.log('🔧 Generic error - implementing fallback strategy');
    return {
      recoverable: false,
      action: 'log_and_continue',
      message: 'Unhandled error type - logging for manual review'
    };
  }

  fixFieldValue(fieldId, value) {
    console.log(`🔧 Attempting to fix field ${fieldId} value: ${value}`);
    
    // Common field value fixes
    if (value === null || value === undefined) {
      return { value: '', comment: 'Fixed null/undefined value' };
    }
    
    if (typeof value === 'string' && value.trim() === '') {
      return { value: '', comment: 'Fixed empty string' };
    }
    
    if (typeof value === 'object') {
      return { value: JSON.stringify(value), comment: 'Fixed object to JSON string' };
    }
    
    if (typeof value === 'boolean') {
      return { value: value, comment: 'Boolean value preserved' };
    }
    
    if (typeof value === 'number') {
      return { value: value, comment: 'Numeric value preserved' };
    }
    
    return { value: String(value), comment: 'Converted to string' };
  }

  fixMissingRequiredFields(recordData) {
    console.log('🔧 Attempting to fix missing required fields');
    
    // Common required fields that might be missing
    const commonRequiredFields = {
      5: { value: 'UNKNOWN', comment: 'Enerflo Deal ID (required)' },
      6: { value: 'Unknown Customer', comment: 'Customer Full Name (required)' },
      7: { value: 'unknown@example.com', comment: 'Customer Email (required)' },
      12: { value: new Date().toISOString(), comment: 'Submission Date (required)' }
    };
    
    const fixedFields = {};
    
    Object.entries(commonRequiredFields).forEach(([fieldId, fieldData]) => {
      if (!recordData || !recordData[fieldId]) {
        fixedFields[fieldId] = fieldData;
        console.log(`🔧 Added missing required field ${fieldId}: ${fieldData.value}`);
      }
    });
    
    return fixedFields;
  }

  // Create a fallback record with minimal required data
  createFallbackRecord(dealId, customerName = 'Unknown Customer') {
    console.log(`🔧 Creating fallback record for deal ${dealId}`);
    
    return {
      5: { value: dealId, comment: 'Enerflo Deal ID' },
      6: { value: customerName, comment: 'Customer Full Name' },
      7: { value: 'unknown@example.com', comment: 'Customer Email' },
      11: { value: 'submitted', comment: 'Project Status' },
      12: { value: new Date().toISOString(), comment: 'Submission Date' },
      13: { value: 0, comment: 'System Size kW' },
      15: { value: 0, comment: 'Total Panel Count' },
      21: { value: 0, comment: 'Gross Cost' },
      32: { value: 0, comment: 'Base Cost' },
      33: { value: 0, comment: 'Net Cost After ITC' }
    };
  }

  // Log error for manual review
  logErrorForReview(error, context, additionalData = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      additionalData,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage()
      }
    };
    
    console.error('📝 Error logged for manual review:', JSON.stringify(errorLog, null, 2));
    
    // In a production environment, you might want to send this to a logging service
    // like Sentry, LogRocket, or a custom logging endpoint
    
    return errorLog;
  }

  // Sleep utility for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Circuit breaker pattern for external API calls
  createCircuitBreaker(fn, failureThreshold = 5, timeout = 10000) {
    let failures = 0;
    let lastFailureTime = 0;
    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN

    return async (...args) => {
      if (state === 'OPEN') {
        if (Date.now() - lastFailureTime > timeout) {
          state = 'HALF_OPEN';
          console.log('🔧 Circuit breaker: Moving to HALF_OPEN state');
        } else {
          throw new Error('Circuit breaker is OPEN - too many failures');
        }
      }

      try {
        const result = await fn(...args);
        
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
          console.log('🔧 Circuit breaker: Moving to CLOSED state');
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();
        
        if (failures >= failureThreshold) {
          state = 'OPEN';
          console.log(`🔧 Circuit breaker: Moving to OPEN state after ${failures} failures`);
        }
        
        throw error;
      }
    };
  }
}

module.exports = ErrorRecovery;
