class DataTypeConverter {
  constructor() {
    this.conversionRules = {
      'Numeric': this.convertToNumeric,
      'Currency': this.convertToCurrency,
      'Percent': this.convertToPercent,
      'Date / Time': this.convertToDateTime,
      'Checkbox': this.convertToCheckbox,
      'Email': this.convertToEmail,
      'Phone Number': this.convertToPhone,
      'URL': this.convertToUrl,
      'Text': this.convertToText,
      'Text - Multi-line': this.convertToText,
      'Text - Multiple Choice': this.convertToText
    };
  }

  convertFieldValue(value, fieldType, fieldId, fieldName) {
    try {
      if (value === null || value === undefined || value === '') {
        return this.getDefaultValue(fieldType);
      }

      const converter = this.conversionRules[fieldType];
      if (!converter) {
        console.warn(`⚠️  Unknown field type: ${fieldType} for field ${fieldId} (${fieldName})`);
        return String(value);
      }

      return converter(value, fieldId, fieldName);

    } catch (error) {
      console.error(`❌ Conversion error for field ${fieldId} (${fieldName}): ${error.message}`);
      return this.getDefaultValue(fieldType);
    }
  }

  convertToNumeric(value, fieldId, fieldName) {
    if (typeof value === 'number') return value;
    
    const numValue = Number(value);
    if (isNaN(numValue)) {
      console.warn(`⚠️  Field ${fieldId} (${fieldName}) expected numeric, got: ${value}`);
      return 0;
    }
    
    return numValue;
  }

  convertToCurrency(value, fieldId, fieldName) {
    if (typeof value === 'number') return value;
    
    // Remove currency symbols and commas
    const cleanValue = String(value).replace(/[$,\s]/g, '');
    const numValue = Number(cleanValue);
    
    if (isNaN(numValue)) {
      console.warn(`⚠️  Field ${fieldId} (${fieldName}) expected currency, got: ${value}`);
      return 0;
    }
    
    return numValue;
  }

  convertToPercent(value, fieldId, fieldName) {
    if (typeof value === 'number') return value;
    
    // Handle percentage strings (e.g., "30%" -> 30)
    const cleanValue = String(value).replace(/[%\s]/g, '');
    const numValue = Number(cleanValue);
    
    if (isNaN(numValue)) {
      console.warn(`⚠️  Field ${fieldId} (${fieldName}) expected percent, got: ${value}`);
      return 0;
    }
    
    return numValue;
  }

  convertToDateTime(value, fieldId, fieldName) {
    if (value instanceof Date) return value.toISOString();
    
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        console.warn(`⚠️  Field ${fieldId} (${fieldName}) expected date/time, got: ${value}`);
        return new Date().toISOString();
      }
      return date.toISOString();
    }
    
    if (typeof value === 'number') {
      // Assume it's a timestamp
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        console.warn(`⚠️  Field ${fieldId} (${fieldName}) expected date/time, got: ${value}`);
        return new Date().toISOString();
      }
      return date.toISOString();
    }
    
    console.warn(`⚠️  Field ${fieldId} (${fieldName}) expected date/time, got: ${value}`);
    return new Date().toISOString();
  }

  convertToCheckbox(value, fieldId, fieldName) {
    if (typeof value === 'boolean') return value;
    
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (['true', 'yes', '1', 'on', 'checked'].includes(lowerValue)) {
        return true;
      }
      if (['false', 'no', '0', 'off', 'unchecked'].includes(lowerValue)) {
        return false;
      }
    }
    
    if (typeof value === 'number') {
      return value !== 0;
    }
    
    // Default to false for unknown values
    console.warn(`⚠️  Field ${fieldId} (${fieldName}) expected checkbox, got: ${value}`);
    return false;
  }

  convertToEmail(value, fieldId, fieldName) {
    const email = String(value).trim();
    
    if (email === '') return '';
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn(`⚠️  Field ${fieldId} (${fieldName}) expected email, got: ${value}`);
      return '';
    }
    
    return email;
  }

  convertToPhone(value, fieldId, fieldName) {
    const phone = String(value).trim();
    
    if (phone === '') return '';
    
    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // Basic phone validation (at least 10 digits)
    if (cleanPhone.length < 10) {
      console.warn(`⚠️  Field ${fieldId} (${fieldName}) expected phone number, got: ${value}`);
      return '';
    }
    
    return cleanPhone;
  }

  convertToUrl(value, fieldId, fieldName) {
    const url = String(value).trim();
    
    if (url === '') return '';
    
    try {
      new URL(url);
      return url;
    } catch (error) {
      console.warn(`⚠️  Field ${fieldId} (${fieldName}) expected URL, got: ${value}`);
      return '';
    }
  }

  convertToText(value, fieldId, fieldName) {
    return String(value || '');
  }

  getDefaultValue(fieldType) {
    switch (fieldType) {
      case 'Numeric':
      case 'Currency':
      case 'Percent':
        return 0;
      case 'Checkbox':
        return false;
      case 'Date / Time':
        return new Date().toISOString();
      case 'Email':
      case 'Phone Number':
      case 'URL':
      case 'Text':
      case 'Text - Multi-line':
      case 'Text - Multiple Choice':
        return '';
      default:
        return '';
    }
  }

  // Convert all fields in a mapping object
  convertAllFields(fieldMappings, fieldDefinitions) {
    const convertedMappings = {};
    let conversionErrors = 0;
    let conversionWarnings = 0;

    Object.entries(fieldMappings).forEach(([fieldId, mapping]) => {
      if (!mapping || mapping.value === undefined) {
        return;
      }

      const fieldDef = fieldDefinitions[fieldId];
      if (!fieldDef) {
        console.warn(`⚠️  Field ID ${fieldId} not found in field definitions`);
        conversionWarnings++;
        return;
      }

      const originalValue = mapping.value;
      const convertedValue = this.convertFieldValue(
        originalValue, 
        fieldDef.type, 
        fieldId, 
        fieldDef.label
      );

      convertedMappings[fieldId] = {
        value: convertedValue,
        comment: mapping.comment || fieldDef.label
      };

      // Log if conversion changed the value
      if (originalValue !== convertedValue) {
        console.log(`🔄 Field ${fieldId} (${fieldDef.label}): ${originalValue} → ${convertedValue}`);
      }
    });

    console.log(`✅ Field conversion completed: ${Object.keys(convertedMappings).length} fields processed`);
    
    if (conversionErrors > 0) {
      console.warn(`⚠️  ${conversionErrors} conversion errors occurred`);
    }
    
    if (conversionWarnings > 0) {
      console.warn(`⚠️  ${conversionWarnings} conversion warnings occurred`);
    }

    return convertedMappings;
  }

  // Validate converted values
  validateConvertedFields(convertedMappings, fieldDefinitions) {
    const validationErrors = [];

    Object.entries(convertedMappings).forEach(([fieldId, mapping]) => {
      const fieldDef = fieldDefinitions[fieldId];
      if (!fieldDef) return;

      const { value } = mapping;
      const { type } = fieldDef;

      // Additional validation after conversion
      switch (type) {
        case 'Numeric':
        case 'Currency':
        case 'Percent':
          if (typeof value !== 'number' || isNaN(value)) {
            validationErrors.push(`Field ${fieldId} (${fieldDef.label}) conversion failed: ${value}`);
          }
          break;
        
        case 'Checkbox':
          if (typeof value !== 'boolean') {
            validationErrors.push(`Field ${fieldId} (${fieldDef.label}) conversion failed: ${value}`);
          }
          break;
        
        case 'Date / Time':
          if (typeof value !== 'string' || isNaN(Date.parse(value))) {
            validationErrors.push(`Field ${fieldId} (${fieldDef.label}) conversion failed: ${value}`);
          }
          break;
      }
    });

    if (validationErrors.length > 0) {
      console.error('❌ Field conversion validation failed:');
      validationErrors.forEach(error => console.error(`  • ${error}`));
    }

    return validationErrors.length === 0;
  }
}

module.exports = DataTypeConverter;
