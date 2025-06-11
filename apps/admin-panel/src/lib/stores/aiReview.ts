import { writable, derived, type Writable, type Readable } from 'svelte/store';

export interface AISuggestion {
	field: string;
	label: string;
	currentValue: any;
	suggestedValue: any;
	confidence: number;
	reasoning: string;
	category: string;
	applied: boolean;
	rejected: boolean;
}

export interface AIReviewState {
	isActive: boolean;
	isLoading: boolean;
	currentProductId: string | null;
	suggestions: AISuggestion[];
	originalData: any;
	error: string | null;
	progress: number;
}

const initialState: AIReviewState = {
	isActive: false,
	isLoading: false,
	currentProductId: null,
	suggestions: [],
	originalData: null,
	error: null,
	progress: 0
};

// Store principal
export const aiReviewStore: Writable<AIReviewState> = writable(initialState);

// Stores derivadas para facilitar o uso
export const aiReviewMode: Readable<boolean> = derived(
	aiReviewStore,
	($store) => $store.isActive
);

export const aiIsLoading: Readable<boolean> = derived(
	aiReviewStore,
	($store) => $store.isLoading
);

export const aiError: Readable<string | null> = derived(
	aiReviewStore,
	($store) => $store.error
);

export const aiSuggestions: Readable<AISuggestion[]> = derived(
	aiReviewStore,
	($store) => $store.suggestions
);

export const aiSuggestionsByCategory: Readable<Record<string, AISuggestion[]>> = derived(
	aiSuggestions,
	($suggestions) => {
		return $suggestions.reduce((acc, suggestion) => {
			if (!acc[suggestion.category]) {
				acc[suggestion.category] = [];
			}
			acc[suggestion.category].push(suggestion);
			return acc;
		}, {} as Record<string, AISuggestion[]>);
	}
);

export const aiChangesCount: Readable<Record<string, number>> = derived(
	aiSuggestionsByCategory,
	($grouped) => {
		const counts: Record<string, number> = {};
		
		// Mapeamento de categorias IA para IDs das abas - APENAS as que devem mostrar contadores
		const categoryToTabMap: Record<string, string> = {
			'basic': 'basic',
			'category': 'basic', // Categorias ficam na aba básico
			'attributes': 'attributes',
			'specifications': 'attributes', // Especificações ficam na aba atributos
			'variants': 'variants',
			'shipping': 'shipping',
			'seo': 'seo'
			// REMOVIDO: pricing, inventory, media, advanced
		};
		
		Object.entries($grouped).forEach(([category, suggestions]) => {
			const tabId = categoryToTabMap[category];
			if (tabId) { // Só processar se a categoria está no mapeamento
				const pendingSuggestions = suggestions.filter(s => !s.applied && !s.rejected).length;
				
				// Só adicionar ao contador se há sugestões pendentes
				if (pendingSuggestions > 0) {
					counts[tabId] = (counts[tabId] || 0) + pendingSuggestions;
				}
			}
		});
		
		return counts;
	}
);

export const aiTotalChanges: Readable<number> = derived(
	aiChangesCount,
	($counts) => Object.values($counts).reduce((sum, count) => sum + count, 0)
);

export const aiAppliedChanges: Readable<number> = derived(
	aiSuggestions,
	($suggestions) => $suggestions.filter(s => s.applied).length
);

export const aiRejectedChanges: Readable<number> = derived(
	aiSuggestions,
	($suggestions) => $suggestions.filter(s => s.rejected).length
);

export const aiPendingChanges: Readable<number> = derived(
	aiSuggestions,
	($suggestions) => $suggestions.filter(s => !s.applied && !s.rejected).length
);

// Actions
export const aiReviewActions = {
	// Iniciar revisão IA
	async startReview(productData: any): Promise<void> {
		aiReviewStore.update(state => ({
			...state,
			isLoading: true,
			isActive: false,
			currentProductId: productData.id,
			originalData: { ...productData },
			error: null,
			progress: 0,
			suggestions: []
		}));

		try {
			// Fazer chamada para nova API de análise
			const response = await fetch('/api/ai/enrich-review', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentData: productData
				})
			});

			if (!response.ok) {
				throw new Error('Erro ao analisar produto com IA');
			}

			const result = await response.json();
			
			if (result.success && result.suggestions) {
				const suggestions: AISuggestion[] = result.suggestions.map((s: any) => ({
					...s,
					applied: false,
					rejected: false
				}));

				aiReviewStore.update(state => ({
					...state,
					isLoading: false,
					isActive: true,
					suggestions,
					progress: 100
				}));
			} else {
				throw new Error(result.error || 'Erro ao processar sugestões');
			}
		} catch (error: any) {
			aiReviewStore.update(state => ({
				...state,
				isLoading: false,
				error: error.message
			}));
		}
	},

	// Aplicar sugestão individual
	applySuggestion(field: string, formData: any): void {
		aiReviewStore.update(state => {
			const suggestion = state.suggestions.find(s => s.field === field);
			if (suggestion && !suggestion.applied) {
				// Aplicar valor no formData
				if (suggestion.field.includes('.')) {
					// Campo aninhado (ex: dimensions.height)
					const keys = suggestion.field.split('.');
					let obj = formData;
					for (let i = 0; i < keys.length - 1; i++) {
						if (!obj[keys[i]]) obj[keys[i]] = {};
						obj = obj[keys[i]];
					}
					obj[keys[keys.length - 1]] = suggestion.suggestedValue;
				} else {
					// Campo simples
					formData[suggestion.field] = suggestion.suggestedValue;
				}

				// Marcar como aplicado
				suggestion.applied = true;
				suggestion.rejected = false;
			}
			
			return state;
		});
	},

	// Rejeitar sugestão
	rejectSuggestion(field: string): void {
		aiReviewStore.update(state => {
			const suggestion = state.suggestions.find(s => s.field === field);
			if (suggestion) {
				suggestion.rejected = true;
				suggestion.applied = false;
			}
			return state;
		});
	},

	// Aplicar todas as sugestões
	applyAllSuggestions(formData: any): void {
		aiReviewStore.update(state => {
			state.suggestions
				.filter(s => !s.rejected)
				.forEach(suggestion => {
					// Aplicar valor no formData
					if (suggestion.field.includes('.')) {
						const keys = suggestion.field.split('.');
						let obj = formData;
						for (let i = 0; i < keys.length - 1; i++) {
							if (!obj[keys[i]]) obj[keys[i]] = {};
							obj = obj[keys[i]];
						}
						obj[keys[keys.length - 1]] = suggestion.suggestedValue;
					} else {
						formData[suggestion.field] = suggestion.suggestedValue;
					}

					suggestion.applied = true;
					suggestion.rejected = false;
				});
			
			return state;
		});
	},

	// Rejeitar todas as sugestões
	rejectAllSuggestions(): void {
		aiReviewStore.update(state => {
			state.suggestions.forEach(suggestion => {
				if (!suggestion.applied) {
					suggestion.rejected = true;
				}
			});
			return state;
		});
	},

	// Aplicar todas as sugestões de uma categoria
	applyAllInCategory(category: string, formData: any): void {
		aiReviewStore.update(state => {
			state.suggestions
				.filter(s => s.category === category && !s.rejected)
				.forEach(suggestion => {
					// Aplicar valor no formData
					if (suggestion.field.includes('.')) {
						const keys = suggestion.field.split('.');
						let obj = formData;
						for (let i = 0; i < keys.length - 1; i++) {
							if (!obj[keys[i]]) obj[keys[i]] = {};
							obj = obj[keys[i]];
						}
						obj[keys[keys.length - 1]] = suggestion.suggestedValue;
					} else {
						formData[suggestion.field] = suggestion.suggestedValue;
					}

					suggestion.applied = true;
				});
			
			return state;
		});
	},

	// Rejeitar todas as sugestões de uma categoria
	rejectAllInCategory(category: string): void {
		aiReviewStore.update(state => {
			state.suggestions
				.filter(s => s.category === category && !s.applied)
				.forEach(suggestion => {
					suggestion.rejected = true;
				});
			
			return state;
		});
	},

	// Resetar sugestão (voltar ao valor original)
	resetSuggestion(field: string, formData: any): void {
		aiReviewStore.update(state => {
			const suggestion = state.suggestions.find(s => s.field === field);
			if (suggestion && suggestion.applied) {
				// Voltar ao valor original
				if (suggestion.field.includes('.')) {
					const keys = suggestion.field.split('.');
					let obj = formData;
					for (let i = 0; i < keys.length - 1; i++) {
						if (!obj[keys[i]]) obj[keys[i]] = {};
						obj = obj[keys[i]];
					}
					obj[keys[keys.length - 1]] = suggestion.currentValue;
				} else {
					formData[suggestion.field] = suggestion.currentValue;
				}

				suggestion.applied = false;
				suggestion.rejected = false;
			}
			
			return state;
		});
	},

	// Finalizar revisão
	finishReview(): void {
		aiReviewStore.set(initialState);
	},

	// Cancelar revisão
	cancelReview(formData: any): void {
		aiReviewStore.update(state => {
			// Restaurar dados originais se necessário
			if (state.originalData) {
				Object.assign(formData, state.originalData);
			}
			
			return initialState;
		});
	}
}; 