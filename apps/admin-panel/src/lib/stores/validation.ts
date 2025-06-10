import { writable } from 'svelte/store';

export interface ValidationError {
	field: string;
	message: string;
	type: 'required' | 'format' | 'range';
}

export interface ValidationState {
	errors: ValidationError[];
	isValid: boolean;
	touched: Set<string>;
}

function createValidationStore() {
	const { subscribe, set, update } = writable<ValidationState>({
		errors: [],
		isValid: true,
		touched: new Set()
	});

	return {
		subscribe,
		
		// Marcar campo como tocado
		touch: (field: string) => {
			update(state => ({
				...state,
				touched: new Set([...state.touched, field])
			}));
		},
		
		// Validar um campo específico
		validateField: (field: string, value: any, rules: ValidationRules) => {
			update(state => {
				// Remover erros antigos deste campo
				const filteredErrors = state.errors.filter(e => e.field !== field);
				const newErrors: ValidationError[] = [];
				
				// Aplicar regras de validação
				if (rules.required && (!value || value.toString().trim() === '')) {
					newErrors.push({
						field,
						message: rules.requiredMessage || `${field} é obrigatório`,
						type: 'required'
					});
				}
				
				if (value && rules.minLength && value.toString().length < rules.minLength) {
					newErrors.push({
						field,
						message: `${field} deve ter pelo menos ${rules.minLength} caracteres`,
						type: 'format'
					});
				}
				
				if (value && rules.pattern && !rules.pattern.test(value.toString())) {
					newErrors.push({
						field,
						message: rules.patternMessage || `${field} tem formato inválido`,
						type: 'format'
					});
				}
				
				if (value && rules.min && Number(value) < rules.min) {
					newErrors.push({
						field,
						message: `${field} deve ser maior que ${rules.min}`,
						type: 'range'
					});
				}
				
				const allErrors = [...filteredErrors, ...newErrors];
				
				return {
					...state,
					errors: allErrors,
					isValid: allErrors.length === 0,
					touched: new Set([...state.touched, field])
				};
			});
		},
		
		// Validar formulário completo
		validateForm: (formData: any, rules: Record<string, ValidationRules>) => {
			update(state => {
				const allErrors: ValidationError[] = [];
				
				Object.entries(rules).forEach(([field, fieldRules]) => {
					const value = formData[field];
					
					if (fieldRules.required && (!value || value.toString().trim() === '')) {
						allErrors.push({
							field,
							message: fieldRules.requiredMessage || `${field} é obrigatório`,
							type: 'required'
						});
					}
					
					if (value && fieldRules.minLength && value.toString().length < fieldRules.minLength) {
						allErrors.push({
							field,
							message: `${field} deve ter pelo menos ${fieldRules.minLength} caracteres`,
							type: 'format'
						});
					}
					
					if (value && fieldRules.pattern && !fieldRules.pattern.test(value.toString())) {
						allErrors.push({
							field,
							message: fieldRules.patternMessage || `${field} tem formato inválido`,
							type: 'format'
						});
					}
					
					if (value && fieldRules.min && Number(value) < fieldRules.min) {
						allErrors.push({
							field,
							message: `${field} deve ser maior que ${fieldRules.min}`,
							type: 'range'
						});
					}
				});
				
				return {
					errors: allErrors,
					isValid: allErrors.length === 0,
					touched: new Set(Object.keys(rules))
				};
			});
		},
		
		// Limpar validações
		clear: () => {
			set({
				errors: [],
				isValid: true,
				touched: new Set()
			});
		},
		
		// Obter erro de um campo específico
		getFieldError: (field: string) => {
			let fieldError: ValidationError | undefined;
			update(state => {
				fieldError = state.errors.find(e => e.field === field);
				return state;
			});
			return fieldError;
		}
	};
}

export interface ValidationRules {
	required?: boolean;
	requiredMessage?: string;
	minLength?: number;
	pattern?: RegExp;
	patternMessage?: string;
	min?: number;
	max?: number;
}

// Regras de validação para produtos
export const productValidationRules: Record<string, ValidationRules> = {
	name: {
		required: true,
		requiredMessage: 'Nome do produto é obrigatório',
		minLength: 3
	},
	sku: {
		required: true,
		requiredMessage: 'SKU é obrigatório',
		pattern: /^[A-Z0-9\-_]+$/i,
		patternMessage: 'SKU deve conter apenas letras, números, hífens e sublinhados'
	},
	price: {
		required: true,
		requiredMessage: 'Preço é obrigatório',
		min: 0.01
	},
	sale_price: {
		required: true,
		requiredMessage: 'Preço de venda é obrigatório',
		min: 0.01
	},
	cost_price: {
		min: 0
	},
	quantity: {
		min: 0
	},
	weight: {
		min: 0.001
	}
};

export const validation = createValidationStore(); 