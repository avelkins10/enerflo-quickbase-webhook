class WebhookValidator {
  constructor() {
    this.requiredFields = {
      event: 'string',
      payload: 'object',
      'payload.deal': 'object',
      'payload.customer': 'object',
      'payload.proposal': 'object'
    };
    
    this.requiredDealFields = ['id', 'status'];
    this.requiredCustomerFields = ['id', 'firstName', 'lastName', 'email'];
    this.requiredProposalFields = ['id', 'pricingOutputs'];
  }

  validateWebhookPayload(payload) {
    const errors = [];
    const warnings = [];

    // Check top-level structure
    if (!payload || typeof payload !== 'object') {
      errors.push('Payload must be a valid JSON object');
      return { isValid: false, errors, warnings };
    }

    // Check required fields
    for (const [field, expectedType] of Object.entries(this.requiredFields)) {
      const value = this.getNestedValue(payload, field);
      
      if (value === undefined || value === null) {
        errors.push(`Missing required field: ${field}`);
      } else if (typeof value !== expectedType) {
        errors.push(`Field ${field} must be ${expectedType}, got ${typeof value}`);
      }
    }

    // Validate deal structure
    if (payload.payload?.deal) {
      const dealErrors = this.validateDeal(payload.payload.deal);
      errors.push(...dealErrors);
    }

    // Validate customer structure
    if (payload.payload?.customer) {
      const customerErrors = this.validateCustomer(payload.payload.customer);
      errors.push(...customerErrors);
    }

    // Validate proposal structure
    if (payload.payload?.proposal) {
      const proposalErrors = this.validateProposal(payload.payload.proposal);
      errors.push(...proposalErrors);
    }

    // Check for common data quality issues
    const qualityWarnings = this.checkDataQuality(payload);
    warnings.push(...qualityWarnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        dealId: payload.payload?.deal?.id,
        customerName: payload.payload?.customer ? 
          `${payload.payload.customer.firstName} ${payload.payload.customer.lastName}`.trim() : 'Unknown'
      }
    };
  }

  validateDeal(deal) {
    const errors = [];
    
    this.requiredDealFields.forEach(field => {
      if (!deal[field]) {
        errors.push(`Deal missing required field: ${field}`);
      }
    });

    // Validate deal ID format
    if (deal.id && typeof deal.id === 'string' && deal.id.length < 10) {
      errors.push('Deal ID appears to be too short or invalid');
    }

    // Validate status
    if (deal.status && !['draft', 'submitted', 'approved', 'rejected', 'completed'].includes(deal.status)) {
      errors.push(`Unknown deal status: ${deal.status}`);
    }

    return errors;
  }

  validateCustomer(customer) {
    const errors = [];
    
    this.requiredCustomerFields.forEach(field => {
      if (!customer[field]) {
        errors.push(`Customer missing required field: ${field}`);
      }
    });

    // Validate email format
    if (customer.email && !this.isValidEmail(customer.email)) {
      errors.push(`Invalid customer email format: ${customer.email}`);
    }

    // Validate phone format
    if (customer.phone && !this.isValidPhone(customer.phone)) {
      errors.push(`Invalid customer phone format: ${customer.phone}`);
    }

    return errors;
  }

  validateProposal(proposal) {
    const errors = [];
    
    this.requiredProposalFields.forEach(field => {
      if (!proposal[field]) {
        errors.push(`Proposal missing required field: ${field}`);
      }
    });

    // Validate pricing outputs structure
    if (proposal.pricingOutputs) {
      const pricingErrors = this.validatePricingOutputs(proposal.pricingOutputs);
      errors.push(...pricingErrors);
    }

    return errors;
  }

  validatePricingOutputs(pricingOutputs) {
    const errors = [];
    
    // Check for required pricing fields
    const requiredPricingFields = ['design', 'grossCost', 'baseCost'];
    requiredPricingFields.forEach(field => {
      if (pricingOutputs[field] === undefined || pricingOutputs[field] === null) {
        errors.push(`Pricing outputs missing required field: ${field}`);
      }
    });

    // Validate design structure
    if (pricingOutputs.design) {
      if (!pricingOutputs.design.systemSize || pricingOutputs.design.systemSize <= 0) {
        errors.push('Invalid or missing system size in design');
      }
      
      if (!pricingOutputs.design.arrays || !Array.isArray(pricingOutputs.design.arrays)) {
        errors.push('Design missing or invalid arrays data');
      }
    }

    // Validate cost fields are numeric
    const costFields = ['grossCost', 'baseCost', 'netCost'];
    costFields.forEach(field => {
      if (pricingOutputs[field] !== undefined && isNaN(Number(pricingOutputs[field]))) {
        errors.push(`Pricing field ${field} must be numeric, got: ${pricingOutputs[field]}`);
      }
    });

    return errors;
  }

  checkDataQuality(payload) {
    const warnings = [];
    
    // Check for empty or suspicious values
    if (payload.payload?.customer?.email === '') {
      warnings.push('Customer email is empty');
    }
    
    if (payload.payload?.customer?.phone === '') {
      warnings.push('Customer phone is empty');
    }
    
    if (payload.payload?.deal?.status === 'draft') {
      warnings.push('Deal is still in draft status - may not be ready for processing');
    }
    
    // Check for missing address data
    if (!payload.payload?.deal?.address) {
      warnings.push('Deal missing address information');
    }
    
    // Check for missing financial data
    if (!payload.payload?.proposal?.pricingOutputs?.grossCost) {
      warnings.push('Proposal missing gross cost information');
    }
    
    // Check for missing panel data
    const arrays = payload.payload?.proposal?.pricingOutputs?.design?.arrays;
    if (!arrays || arrays.length === 0) {
      warnings.push('Proposal missing panel/array information');
    }

    return warnings;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  printValidationReport(validationResult) {
    console.log('\n🔍 WEBHOOK VALIDATION REPORT');
    console.log('='.repeat(50));
    
    if (validationResult.summary) {
      console.log(`📊 Deal ID: ${validationResult.summary.dealId}`);
      console.log(`👤 Customer: ${validationResult.summary.customerName}`);
      console.log(`❌ Errors: ${validationResult.summary.totalErrors}`);
      console.log(`⚠️  Warnings: ${validationResult.summary.totalWarnings}`);
    }
    
    if (validationResult.errors.length > 0) {
      console.log('\n❌ VALIDATION ERRORS:');
      validationResult.errors.forEach(error => console.log(`  • ${error}`));
    }
    
    if (validationResult.warnings.length > 0) {
      console.log('\n⚠️  DATA QUALITY WARNINGS:');
      validationResult.warnings.forEach(warning => console.log(`  • ${warning}`));
    }
    
    if (validationResult.isValid) {
      console.log('\n✅ Webhook payload is valid and ready for processing');
    } else {
      console.log('\n❌ Webhook payload has validation errors');
    }
    
    console.log('='.repeat(50));
  }
}

module.exports = WebhookValidator;
