<script lang="ts">
	import { aiReviewActions } from '$lib/stores/aiReview';
	import type { AISuggestion } from '$lib/stores/aiReview';
	import ModernIcon from './ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';

	interface Props {
		suggestion: AISuggestion;
		formData: any;
		categories?: Array<{id: string, name: string}>;
		brands?: Array<{id: string, name: string}>;
		showDebug?: boolean;
	}

	let { suggestion, formData, categories = [], brands = [], showDebug = false }: Props = $props();

	// Função para aplicar sugestão
	function applySuggestion() {
		aiReviewActions.applySuggestion(suggestion.field, formData);
		toast.success(`${suggestion.label} aplicado com sucesso!`);
	}

	// Função para rejeitar sugestão
	function rejectSuggestion() {
		aiReviewActions.rejectSuggestion(suggestion.field);
		toast.info(`${suggestion.label} rejeitado`);
	}

	// 🔧 FUNÇÃO SIMPLIFICADA: Usar displayValue quando disponível
	function getDisplayValue(suggestion: any, isCurrentValue: boolean): string {
		const value = isCurrentValue ? suggestion.currentValue : suggestion.suggestedValue;
		
		// Se tem displayValue customizado, usar ele
		if (!isCurrentValue && suggestion.displayValue) {
			return suggestion.displayValue;
		}
		
		if (value === null || value === undefined) return '[Vazio]';
		
		// 🎯 FORMATAR ATRIBUTOS DE FORMA LEGÍVEL
		if (suggestion.field === 'attributes' && typeof value === 'object' && value !== null) {
			const formatted = Object.entries(value).map(([key, val]) => {
				if (Array.isArray(val)) {
					return `${key}: ${val.join(', ')}`;
				}
				return `${key}: ${val}`;
			}).join('\n');
			return formatted || '[Sem atributos]';
		}
		
		// 🎯 FORMATAR VARIANTES DE PRODUTO DE FORMA LEGÍVEL  
		if (suggestion.field === 'product_variants' && Array.isArray(value)) {
			if (value.length === 0) return '[Nenhuma variante]';
			
			const formatted = value.map((variant, index) => {
				const options = variant.options ? Object.entries(variant.options).map(([key, val]) => `${key}: ${val}`).join(', ') : '';
				const price = variant.price ? `R$ ${Number(variant.price).toFixed(2)}` : '';
				const sku = variant.sku || '';
				
				return `${index + 1}. ${options}${price ? ` - ${price}` : ''}${sku ? ` (${sku})` : ''}`;
			}).join('\n');
			
			return formatted;
		}

		// 🎯 FORMATAR OPÇÕES DE PRODUTO DE FORMA LEGÍVEL
		if (suggestion.field === 'product_options' && typeof value === 'object' && value !== null) {
			const formatted = Object.entries(value).map(([key, val]) => {
				if (Array.isArray(val)) {
					return `${key}: ${val.join(', ')}`;
				}
				return `${key}: ${val}`;
			}).join('\n');
			return formatted || '[Sem opções]';
		}
		
		// 🎯 DETECTAR UUIDs não processados
		if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			return `⚠️ UUID: ${value.substring(0, 8)}...`;
		}
		
		// Formato normal
		if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
		if (typeof value === 'object') {
			if (Array.isArray(value)) {
				return value.length > 0 ? value.join(', ') : '[Array vazio]';
			}
			return JSON.stringify(value, null, 2);
		}
		return String(value);
	}

	// Função para copiar resposta completa da IA
	function copyAIResponse() {
		const response = {
			field: suggestion.field,
			label: suggestion.label,
			currentValue: suggestion.currentValue,
			suggestedValue: suggestion.suggestedValue,
			confidence: suggestion.confidence,
			reasoning: suggestion.reasoning,
			source: suggestion.source,
			category: suggestion.category
		};
		
		navigator.clipboard.writeText(JSON.stringify(response, null, 2)).then(() => {
			toast.success('Resposta da IA copiada para área de transferência!');
		});
	}

	// Valores formatados diretamente
</script>

<div class="border rounded-lg p-4 transition-all duration-200 {
	suggestion.applied ? 'border-[#00BFB3]/30 bg-[#00BFB3]/10' : 
	suggestion.rejected ? 'border-gray-200 bg-gray-50 opacity-60' : 
	'border-[#00BFB3]/20 bg-[#00BFB3]/5 hover:bg-[#00BFB3]/10'
}">
	<!-- Header da sugestão -->
	<div class="flex items-center justify-between mb-3">
		<div class="flex items-center gap-2">
			<div class="w-8 h-8 rounded-full bg-white flex items-center justify-center">
				<ModernIcon name="robot" size="sm" />
			</div>
			
			<div class="flex-1 min-w-0">
				<h5 class="font-medium text-gray-900 truncate">{suggestion.label}</h5>
				<div class="flex items-center gap-2 mt-1">
					<span class="text-xs text-[#00BFB3] font-medium">
						{suggestion.confidence}% confiança
					</span>
					<span class="text-xs text-gray-500">
						Campo: {suggestion.field}
					</span>
				</div>
			</div>
		</div>

		<!-- Ações -->
		<div class="flex items-center gap-1">
			{#if showDebug}
				<button
					type="button"
					onclick={copyAIResponse}
					class="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs flex items-center gap-1"
					title="Copiar resposta da IA"
				>
					<ModernIcon name="Copy" size="xs" />
					Debug
				</button>
			{/if}
			
			{#if suggestion.applied}
				<span class="text-[#00BFB3] text-sm">Aplicado ✓</span>
			{:else if suggestion.rejected}
				<span class="text-gray-500 text-sm">Rejeitado ✗</span>
			{:else}
				<button
					type="button"
					onclick={applySuggestion}
					class="px-3 py-1 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded text-sm"
				>
					Aplicar
				</button>
				<button
					type="button"
					onclick={rejectSuggestion}
					class="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
				>
					Rejeitar
				</button>
			{/if}
		</div>
	</div>

	<!-- Comparação de valores -->
	<div class="grid grid-cols-2 gap-3">
		<!-- Valor atual -->
		<div class="bg-white rounded-lg p-3 border">
			<div class="text-xs font-medium text-gray-600 mb-1">📝 Atual</div>
			<div class="text-sm text-gray-900 break-words">
				{getDisplayValue(suggestion, true)}
			</div>
		</div>

		<!-- Valor sugerido -->
		<div class="bg-white rounded-lg p-3 border border-[#00BFB3]/20">
			<div class="text-xs font-medium text-[#00BFB3] mb-1">🤖 Sugerido pela IA</div>
			<div class="text-sm text-[#00BFB3] break-words font-medium">
				{getDisplayValue(suggestion, false)}
			</div>
		</div>
	</div>

	<!-- 🔧 PAINEL DE DEBUG (quando ativado) -->
	{#if showDebug}
		<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
			<div class="text-xs font-medium text-yellow-700 mb-2 flex items-center gap-1">
				<ModernIcon name="Bug" size="xs" />
				Debug da IA - Copie esta resposta completa
			</div>
			<div class="text-xs text-yellow-800 font-mono bg-yellow-100 p-2 rounded overflow-x-auto">
				{JSON.stringify({
					field: suggestion.field,
					label: suggestion.label,
					currentValue: suggestion.currentValue,
					suggestedValue: suggestion.suggestedValue,
					confidence: suggestion.confidence,
					reasoning: suggestion.reasoning,
					source: suggestion.source,
					category: suggestion.category
				}, null, 2)}
			</div>
		</div>
	{/if}

	<!-- Explicação da IA -->
	{#if suggestion.reasoning}
		<div class="bg-[#00BFB3]/10 rounded-lg p-3 border border-[#00BFB3]/20 mt-3">
			<div class="text-xs font-medium text-[#00BFB3] mb-1">💡 Por que a IA sugere isso?</div>
			<p class="text-sm text-gray-800">{suggestion.reasoning}</p>
		</div>
	{/if}
</div> 