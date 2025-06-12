import type { FormConfig, FormField } from '$lib/config/formConfigs';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

class ValidationService {
  
  // Validar formulário completo
  validate(data: any, config: FormConfig): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};
    
    // Validar campos obrigatórios globais
    if (config.requiredFields) {
      config.requiredFields.forEach(fieldName => {
        if (!this.isFieldValid(data[fieldName])) {
          errors[fieldName] = `${fieldName} é obrigatório`;
        }
      });
    }
    
    // Validar campos definidos nas abas
    config.tabs.forEach(tab => {
      if (tab.fields) {
        tab.fields.forEach(field => {
          const fieldErrors = this.validateField(field, data[field.name], data);
          if (fieldErrors.length > 0) {
            errors[field.name] = fieldErrors[0]; // Pegar primeiro erro
          }
        });
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings: Object.keys(warnings).length > 0 ? warnings : undefined
    };
  }
  
  // Validar campo individual
  validateField(field: FormField, value: any, allData?: any): string[] {
    const errors: string[] = [];
    
    // Verificar se campo é visível (condicional)
    if (field.conditional && allData) {
      if (!this.checkConditional(field.conditional, allData)) {
        return []; // Campo não visível, não validar
      }
    }
    
    // Validar campo obrigatório
    if (field.required && !this.isFieldValid(value)) {
      errors.push(`${field.label} é obrigatório`);
      return errors; // Parar aqui se obrigatório e vazio
    }
    
    // Se campo vazio e não obrigatório, não validar resto
    if (!this.isFieldValid(value)) {
      return errors;
    }
    
    // Validações por tipo
    errors.push(...this.validateByType(field, value));
    
    // Validações customizadas
    if (field.validation) {
      errors.push(...this.validateCustomRules(field, value));
    }
    
    return errors;
  }
  
  // Verificar se valor é válido (não vazio)
  private isFieldValid(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  }
  
  // Validações por tipo de campo
  private validateByType(field: FormField, value: any): string[] {
    const errors: string[] = [];
    
    switch (field.type) {
      case 'email':
        if (!this.isValidEmail(value)) {
          errors.push(`${field.label} deve ser um email válido`);
        }
        break;
        
      case 'url':
        if (!this.isValidUrl(value)) {
          errors.push(`${field.label} deve ser uma URL válida`);
        }
        break;
        
      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`${field.label} deve ser um número válido`);
        }
        break;
        
      case 'date':
        if (!this.isValidDate(value)) {
          errors.push(`${field.label} deve ser uma data válida`);
        }
        break;
        
      case 'color':
        if (!this.isValidColor(value)) {
          errors.push(`${field.label} deve ser uma cor válida (ex: #FF0000)`);
        }
        break;
        
      case 'json':
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
          }
        } catch {
          errors.push(`${field.label} deve ser um JSON válido`);
        }
        break;
        
      case 'password':
        if (value.length < 6) {
          errors.push(`${field.label} deve ter pelo menos 6 caracteres`);
        }
        break;
    }
    
    return errors;
  }
  
  // Validações customizadas
  private validateCustomRules(field: FormField, value: any): string[] {
    const errors: string[] = [];
    const validation = field.validation!;
    
    // Validação de comprimento mínimo
    if (validation.min !== undefined) {
      if (field.type === 'number') {
        if (Number(value) < validation.min) {
          errors.push(`${field.label} deve ser no mínimo ${validation.min}`);
        }
      } else if (typeof value === 'string') {
        if (value.length < validation.min) {
          errors.push(`${field.label} deve ter pelo menos ${validation.min} caracteres`);
        }
      }
    }
    
    // Validação de comprimento máximo
    if (validation.max !== undefined) {
      if (field.type === 'number') {
        if (Number(value) > validation.max) {
          errors.push(`${field.label} deve ser no máximo ${validation.max}`);
        }
      } else if (typeof value === 'string') {
        if (value.length > validation.max) {
          errors.push(`${field.label} deve ter no máximo ${validation.max} caracteres`);
        }
      }
    }
    
    // Validação por padrão (regex)
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push(`${field.label} não atende ao formato esperado`);
      }
    }
    
    // Validação customizada
    if (validation.custom) {
      const customError = validation.custom(value);
      if (customError) {
        errors.push(customError);
      }
    }
    
    return errors;
  }
  
  // Verificar condições
  private checkConditional(conditional: NonNullable<FormField['conditional']>, allData: any): boolean {
    const { field, value: condValue, operator = 'equals' } = conditional;
    const fieldValue = allData[field];
    
    switch (operator) {
      case 'equals': return fieldValue === condValue;
      case 'not-equals': return fieldValue !== condValue;
      case 'contains': return String(fieldValue).includes(String(condValue));
      case 'greater': return Number(fieldValue) > Number(condValue);
      case 'less': return Number(fieldValue) < Number(condValue);
      default: return true;
    }
  }
  
  // Validações específicas
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  private isValidDate(date: string): boolean {
    return !isNaN(Date.parse(date));
  }
  
  private isValidColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }
  
  // Validações específicas de negócio
  validateCNPJ(cnpj: string): boolean {
    // Remove formatação
    cnpj = cnpj.replace(/[^\d]+/g, '');
    
    // Valida tamanho
    if (cnpj.length !== 14) return false;
    
    // Elimina CNPJs inválidos conhecidos
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    
    // Valida DVs
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(0))) return false;
    
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(1))) return false;
    
    return true;
  }
  
  validateCPF(cpf: string): boolean {
    // Remove formatação
    cpf = cpf.replace(/[^\d]+/g, '');
    
    // Valida tamanho
    if (cpf.length !== 11) return false;
    
    // Elimina CPFs inválidos conhecidos
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Valida 1º dígito
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let dv1 = resto < 2 ? 0 : resto;
    
    if (dv1 !== parseInt(cpf.charAt(9))) return false;
    
    // Valida 2º dígito
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let dv2 = resto < 2 ? 0 : resto;
    
    if (dv2 !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  }
  
  validateCEP(cep: string): boolean {
    // Remove formatação
    cep = cep.replace(/\D/g, '');
    
    // Valida tamanho
    if (cep.length !== 8) return false;
    
    // Verifica se não são todos números iguais
    if (/^(\d)\1{7}$/.test(cep)) return false;
    
    return true;
  }
  
  // Validação de senhas fortes
  validateStrongPassword(password: string): string[] {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Senha deve ter pelo menos 8 caracteres');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Senha deve conter pelo menos um caractere especial');
    }
    
    return errors;
  }
}

export const validationService = new ValidationService(); 