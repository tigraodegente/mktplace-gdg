/**
 * Utilitários de validação de formulários
 */

export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

export interface FieldValidation {
  rules: ValidationRule[];
  touched?: boolean;
  error?: string;
}

export interface FormValidation {
  [field: string]: FieldValidation;
}

/**
 * Regras de validação pré-definidas
 */
export const validators = {
  required: (message = 'Este campo é obrigatório'): ValidationRule => ({
    validate: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value != null && value !== '';
    },
    message
  }),
  
  email: (message = 'Email inválido'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message
  }),
  
  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      return String(value).length >= min;
    },
    message: message || `Mínimo de ${min} caracteres`
  }),
  
  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      return String(value).length <= max;
    },
    message: message || `Máximo de ${max} caracteres`
  }),
  
  pattern: (regex: RegExp, message = 'Formato inválido'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      return regex.test(String(value));
    },
    message
  }),
  
  cpf: (message = 'CPF inválido'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      
      // Remove caracteres não numéricos
      const cpf = String(value).replace(/\D/g, '');
      
      // Verifica se tem 11 dígitos
      if (cpf.length !== 11) return false;
      
      // Verifica se todos os dígitos são iguais
      if (/^(\d)\1+$/.test(cpf)) return false;
      
      // Validação do CPF
      let sum = 0;
      let remainder;
      
      for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
      }
      
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cpf.substring(9, 10))) return false;
      
      sum = 0;
      for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
      }
      
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cpf.substring(10, 11))) return false;
      
      return true;
    },
    message
  }),
  
  phone: (message = 'Telefone inválido'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      const phone = String(value).replace(/\D/g, '');
      return phone.length === 10 || phone.length === 11;
    },
    message
  }),
  
  cep: (message = 'CEP inválido'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      const cep = String(value).replace(/\D/g, '');
      return cep.length === 8;
    },
    message
  }),
  
  number: (message = 'Deve ser um número'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      return !isNaN(Number(value));
    },
    message
  }),
  
  min: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      return Number(value) >= min;
    },
    message: message || `Valor mínimo: ${min}`
  }),
  
  max: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      return Number(value) <= max;
    },
    message: message || `Valor máximo: ${max}`
  }),
  
  date: (message = 'Data inválida'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    message
  }),
  
  futureDate: (message = 'A data deve ser futura'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      const date = new Date(value);
      return date > new Date();
    },
    message
  }),
  
  pastDate: (message = 'A data deve ser passada'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Opcional por padrão
      const date = new Date(value);
      return date < new Date();
    },
    message
  }),
  
  match: (fieldName: string, getValue: () => any, message?: string): ValidationRule => ({
    validate: (value) => {
      return value === getValue();
    },
    message: message || `Os campos não coincidem`
  })
};

/**
 * Valida um campo com suas regras
 */
export function validateField(value: any, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return rule.message;
    }
  }
  return null;
}

/**
 * Valida todos os campos de um formulário
 */
export function validateForm(
  values: Record<string, any>,
  validation: FormValidation
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  for (const [field, fieldValidation] of Object.entries(validation)) {
    const error = validateField(values[field], fieldValidation.rules);
    if (error) {
      errors[field] = error;
    }
  }
  
  return errors;
}

/**
 * Hook para usar validação em componentes Svelte
 */
export function createFormValidation(initialValidation: FormValidation) {
  const validation = $state(initialValidation);
  const errors = $state<Record<string, string>>({});
  const touched = $state<Record<string, boolean>>({});
  
  function validateSingleField(field: string, value: any) {
    const fieldValidation = validation[field];
    if (!fieldValidation) return;
    
    const error = validateField(value, fieldValidation.rules);
    if (error) {
      errors[field] = error;
    } else {
      delete errors[field];
    }
  }
  
  function touchField(field: string) {
    touched[field] = true;
  }
  
  function validateAll(values: Record<string, any>) {
    const newErrors = validateForm(values, validation);
    Object.assign(errors, newErrors);
    
    // Marca todos os campos como tocados
    for (const field of Object.keys(validation)) {
      touched[field] = true;
    }
    
    return Object.keys(newErrors).length === 0;
  }
  
  function reset() {
    Object.keys(errors).forEach(key => delete errors[key]);
    Object.keys(touched).forEach(key => delete touched[key]);
  }
  
  return {
    errors: $derived(errors),
    touched: $derived(touched),
    isValid: $derived(Object.keys(errors).length === 0),
    validateField: validateSingleField,
    touchField,
    validateAll,
    reset
  };
} 