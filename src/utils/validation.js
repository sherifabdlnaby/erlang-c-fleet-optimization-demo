/**
 * Form validation utilities
 */

export const validateNumber = (value, min, max, fieldName = 'Value') => {
  const num = Number(value);
  
  if (isNaN(num) || value === '' || value === null || value === undefined) {
    return {
      isValid: false,
      error: `${fieldName} must be a number`
    };
  }
  
  if (min !== undefined && num < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${min}`
    };
  }
  
  if (max !== undefined && num > max) {
    return {
      isValid: false,
      error: `${fieldName} must be at most ${max}`
    };
  }
  
  return {
    isValid: true,
    error: null
  };
};

export const validatePositive = (value, fieldName = 'Value') => {
  return validateNumber(value, 0.01, undefined, fieldName);
};

export const validateRange = (value, min, max, fieldName = 'Value') => {
  return validateNumber(value, min, max, fieldName);
};

export const validateRequired = (value, fieldName = 'Field') => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return {
      isValid: false,
      error: `${fieldName} is required`
    };
  }
  
  return {
    isValid: true,
    error: null
  };
};
