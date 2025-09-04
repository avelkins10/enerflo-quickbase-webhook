const fs = require('fs');
const path = require('path');

class FieldValidator {
  constructor() {
    this.quickbaseFields = this.loadQuickBaseFields();
    this.validationErrors = [];
    this.validationWarnings = [];
  }

  loadQuickBaseFields() {
    try {
      const csvContent = fs.readFileSync('quickbase-fields.csv', 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      const fields = {};
      
      lines.forEach(line => {
        const [label, type, relationship, fieldId] = line.split(',');
        if (fieldId && fieldId.trim()) {
          fields[fieldId.trim()] = {
            label: label?.trim(),
            type: type?.trim(),
            relationship: relationship?.trim()
          };
        }
      });
      
      return fields;
    } catch (error) {
      console.error('❌ Error loading QuickBase fields:', error.message);
      return {};
    }
  }

  validateFieldMapping(fieldId, value, fieldName) {
    const fieldDef = this.quickbaseFields[fieldId];
    if (!fieldDef) {
      this.validationErrors.push(`❌ Field ID ${fieldId} not found in QuickBase field definitions`);
      return false;
    }

    const { type } = fieldDef;
    let isValid = true;

    // Check data type compatibility
    switch (type) {
      case 'Numeric':
        if (value !== null && value !== undefined && value !== '' && isNaN(Number(value))) {
          this.validationErrors.push(`❌ Field ${fieldId} (${fieldName}) expects Numeric, got: ${typeof value} = ${value}`);
          isValid = false;
        }
        break;
      
      case 'Currency':
        if (value !== null && value !== undefined && value !== '' && isNaN(Number(value))) {
          this.validationErrors.push(`❌ Field ${fieldId} (${fieldName}) expects Currency, got: ${typeof value} = ${value}`);
          isValid = false;
        }
        break;
      
      case 'Percent':
        if (value !== null && value !== undefined && value !== '' && isNaN(Number(value))) {
          this.validationErrors.push(`❌ Field ${fieldId} (${fieldName}) expects Percent, got: ${typeof value} = ${value}`);
          isValid = false;
        }
        break;
      
      case 'Date / Time':
        if (value && !this.isValidDate(value)) {
          this.validationErrors.push(`❌ Field ${fieldId} (${fieldName}) expects Date/Time, got: ${typeof value} = ${value}`);
          isValid = false;
        }
        break;
      
      case 'Checkbox':
        if (value !== null && value !== undefined && value !== '' && typeof value !== 'boolean') {
          this.validationWarnings.push(`⚠️  Field ${fieldId} (${fieldName}) expects Checkbox (boolean), got: ${typeof value} = ${value}`);
        }
        break;
      
      case 'Email':
        if (value && !this.isValidEmail(value)) {
          this.validationWarnings.push(`⚠️  Field ${fieldId} (${fieldName}) expects Email, got: ${value}`);
        }
        break;
      
      case 'Phone Number':
        if (value && !this.isValidPhone(value)) {
          this.validationWarnings.push(`⚠️  Field ${fieldId} (${fieldName}) expects Phone Number, got: ${value}`);
        }
        break;
      
      case 'URL':
        if (value && !this.isValidUrl(value)) {
          this.validationWarnings.push(`⚠️  Field ${fieldId} (${fieldName}) expects URL, got: ${value}`);
        }
        break;
    }

    return isValid;
  }

  isValidDate(value) {
    if (typeof value === 'string') {
      return !isNaN(Date.parse(value));
    }
    return value instanceof Date;
  }

  isValidEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  isValidPhone(value) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
  }

  isValidUrl(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  validateAllMappings(mappings) {
    console.log('🔍 Validating all field mappings...');
    
    Object.entries(mappings).forEach(([fieldId, mapping]) => {
      if (mapping && mapping.value !== undefined) {
        this.validateFieldMapping(fieldId, mapping.value, mapping.comment || `Field ${fieldId}`);
      }
    });

    this.printValidationResults();
    return this.validationErrors.length === 0;
  }

  printValidationResults() {
    console.log('\n📊 VALIDATION RESULTS:');
    console.log('='.repeat(50));
    
    if (this.validationErrors.length > 0) {
      console.log(`❌ ${this.validationErrors.length} CRITICAL ERRORS:`);
      this.validationErrors.forEach(error => console.log(`  ${error}`));
    }
    
    if (this.validationWarnings.length > 0) {
      console.log(`⚠️  ${this.validationWarnings.length} WARNINGS:`);
      this.validationWarnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    if (this.validationErrors.length === 0 && this.validationWarnings.length === 0) {
      console.log('✅ All field mappings are valid!');
    }
    
    console.log('='.repeat(50));
  }

  getFieldType(fieldId) {
    return this.quickbaseFields[fieldId]?.type || 'Unknown';
  }

  getFieldLabel(fieldId) {
    return this.quickbaseFields[fieldId]?.label || `Field ${fieldId}`;
  }
}

module.exports = FieldValidator;
