<script lang="ts">
	import { validation, productValidationRules, type ValidationRules } from '$lib/stores/validation';
	import ModernIcon from './ModernIcon.svelte';
	
	export let field: string;
	export let label: string;
	export let value: any = '';
	export let type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' = 'text';
	export let placeholder: string = '';
	export let required: boolean = false;
	export let rules: ValidationRules | undefined = undefined;
	export let options: Array<{ value: string; label: string }> = [];
	export let rows: number = 3;
	export let step: string | undefined = undefined;
	export let min: number | undefined = undefined;
	export let max: number | undefined = undefined;
	export let disabled: boolean = false;
	export let hint: string | undefined = undefined;
	
	// Usar regras padrão se não fornecidas
	const fieldRules = rules || productValidationRules[field] || {};
	
	// Estado de validação reativo
	let validationState: any = {};
	validation.subscribe(state => validationState = state);
	
	// Computadas derivadas
	$: fieldError = validationState.errors?.find((e: any) => e.field === field);
	$: hasError = !!fieldError && validationState.touched?.has(field);
	$: isRequired = required || fieldRules.required;
	$: isValid = validationState.touched?.has(field) && !fieldError;
	
	// Validar quando valor mudar
	function handleInput() {
		validation.touch(field);
		validation.validateField(field, value, fieldRules);
	}
	
	function handleBlur() {
		validation.touch(field);
		validation.validateField(field, value, fieldRules);
	}
	
	// Classes CSS
	function getInputClasses() {
		let classes = 'w-full px-4 py-3 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent';
		
		if (hasError) {
			classes += ' border-red-500 bg-red-50';
		} else if (isValid) {
			classes += ' border-green-500 bg-green-50';
		} else {
			classes += ' border-gray-300 hover:border-gray-400';
		}
		
		if (disabled) {
			classes += ' bg-gray-100 cursor-not-allowed';
		}
		
		return classes;
	}
</script>

<div class="space-y-2">
	<!-- Label -->
	<label class="block text-sm font-medium text-gray-700">
		{label}
		{#if isRequired}
			<span class="text-red-500 ml-1">*</span>
		{/if}
		{#if hint}
			<span class="text-xs text-gray-500 ml-2">{hint}</span>
		{/if}
	</label>
	
	<!-- Input Field -->
	<div class="relative">
		{#if type === 'textarea'}
			<textarea
				bind:value
				placeholder={placeholder}
				rows={rows}
				disabled={disabled}
				class={getInputClasses()}
				on:input={handleInput}
				on:blur={handleBlur}
			></textarea>
		{:else if type === 'select'}
			<select
				bind:value
				disabled={disabled}
				class={getInputClasses()}
				on:change={handleInput}
				on:blur={handleBlur}
			>
				<option value="">{placeholder || 'Selecione...'}</option>
				{#each options as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		{:else}
			<input
				bind:value
				type={type}
				placeholder={placeholder}
				step={step}
				min={min}
				max={max}
				disabled={disabled}
				class={getInputClasses()}
				on:input={handleInput}
				on:blur={handleBlur}
			/>
		{/if}
		
		<!-- Ícone de Status -->
		<div class="absolute right-3 top-3 flex items-center">
			{#if hasError}
				<div class="text-red-500">
					<ModernIcon name="AlertCircle" size="sm" />
				</div>
			{:else if isValid}
				<div class="text-green-500">
					<ModernIcon name="CheckCircle" size="sm" />
				</div>
			{/if}
		</div>
	</div>
	
	<!-- Mensagem de Erro -->
	{#if hasError && fieldError}
		<div class="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
			<ModernIcon name="AlertTriangle" size="xs" />
			<span>{fieldError.message}</span>
		</div>
	{/if}
	
	<!-- Mensagem de Sucesso -->
	{#if isValid && value}
		<div class="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
			<ModernIcon name="Check" size="xs" />
			<span>Campo válido</span>
		</div>
	{/if}
</div>

<style>
	/* Transições suaves para mudanças de estado */
	input, textarea, select {
		transition: all 0.2s ease-in-out;
	}
	
	/* Highlight do campo com erro */
	:global(.border-red-500) {
		box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
	}
	
	/* Highlight do campo válido */
	:global(.border-green-500) {
		box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
	}
</style> 