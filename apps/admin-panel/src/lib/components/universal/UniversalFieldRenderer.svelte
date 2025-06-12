<script lang="ts">
	import type { FormField, FormConfig } from '$lib/config/formConfigs';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	// Props
	interface Props {
		field: FormField;
		value: any;
		error?: string;
		config: FormConfig;
		entityId?: string;
		isEdit: boolean;
		onChange: (value: any) => void;
	}
	
	let { field, value, error, config, entityId, isEdit, onChange }: Props = $props();
	
	// Estados locais
	let internalValue = $state(value ?? getDefaultValue());
	let isValid = $state(true);
	let isFocused = $state(false);
	
	// Sincronizar valor interno com prop value
	$effect(() => {
		internalValue = value ?? getDefaultValue();
	});
	
	// Função para obter valor padrão baseado no tipo
	function getDefaultValue() {
		switch (field.type) {
			case 'boolean': return false;
			case 'number': return 0;
			case 'multiselect': return [];
			case 'json': return {};
			default: return '';
		}
	}
	
	// Validação local
	function validateValue(val: any) {
		if (field.required && (!val || (typeof val === 'string' && val.trim() === ''))) {
			return `${field.label} é obrigatório`;
		}
		
		if (field.validation) {
			const v = field.validation;
			
			if (v.min !== undefined && Number(val) < v.min) {
				return `${field.label} deve ser no mínimo ${v.min}`;
			}
			
			if (v.max !== undefined && Number(val) > v.max) {
				return `${field.label} deve ser no máximo ${v.max}`;
			}
			
			if (v.pattern && typeof val === 'string' && !new RegExp(v.pattern).test(val)) {
				return `${field.label} não atende ao formato esperado`;
			}
			
			if (v.custom) {
				const customError = v.custom(val);
				if (customError) return customError;
			}
		}
		
		return null;
	}
	
	// Handler de mudança
	function handleChange(newValue: any) {
		internalValue = newValue;
		const validationError = validateValue(newValue);
		isValid = !validationError;
		
		onChange(newValue);
	}
	
	// Verificar condições
	function checkConditional(): boolean {
		if (!field.conditional) return true;
		
		const { field: condField, value: condValue, operator = 'equals' } = field.conditional;
		const fieldValue = value; // Aqui deveria vir do formData completo
		
		switch (operator) {
			case 'equals': return fieldValue === condValue;
			case 'not-equals': return fieldValue !== condValue;
			case 'contains': return String(fieldValue).includes(String(condValue));
			case 'greater': return Number(fieldValue) > Number(condValue);
			case 'less': return Number(fieldValue) < Number(condValue);
			default: return true;
		}
	}
	
	// CSS classes
	const baseInputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors";
	const errorInputClass = "border-red-300 focus:ring-red-500 focus:border-red-500";
	const inputClass = error ? `${baseInputClass} ${errorInputClass}` : baseInputClass;
</script>

{#if checkConditional()}
	<div class="field-wrapper" class:has-error={!!error}>
		<!-- Label -->
		<label class="block text-sm font-medium text-gray-700 mb-2" for={field.name}>
			{field.label}
			{#if field.required}
				<span class="text-red-500 ml-1">*</span>
			{/if}
		</label>
		
		<!-- Campo baseado no tipo -->
		{#if field.type === 'text' || field.type === 'email' || field.type === 'url' || field.type === 'password'}
			<input
				id={field.name}
				type={field.type}
				class={inputClass}
				placeholder={field.placeholder}
				value={internalValue}
				required={field.required}
				on:input={(e) => handleChange(e.currentTarget.value)}
				on:focus={() => isFocused = true}
				on:blur={() => isFocused = false}
			/>
			
		{:else if field.type === 'number'}
			<input
				id={field.name}
				type="number"
				class={inputClass}
				placeholder={field.placeholder}
				value={internalValue}
				min={field.validation?.min}
				max={field.validation?.max}
				required={field.required}
				on:input={(e) => handleChange(Number(e.currentTarget.value))}
				on:focus={() => isFocused = true}
				on:blur={() => isFocused = false}
			/>
			
		{:else if field.type === 'textarea'}
			<textarea
				id={field.name}
				class={`${inputClass} min-h-[100px] resize-y`}
				placeholder={field.placeholder}
				value={internalValue}
				required={field.required}
				on:input={(e) => handleChange(e.currentTarget.value)}
				on:focus={() => isFocused = true}
				on:blur={() => isFocused = false}
			></textarea>
			
		{:else if field.type === 'rich-text'}
			<div class="border border-gray-300 rounded-lg overflow-hidden">
				<div class="bg-gray-50 border-b border-gray-300 p-2 flex gap-2">
					<button type="button" class="p-1 text-gray-600 hover:text-gray-900" title="Negrito">
						<ModernIcon name="Bold" size="16" />
					</button>
					<button type="button" class="p-1 text-gray-600 hover:text-gray-900" title="Itálico">
						<ModernIcon name="Italic" size="16" />
					</button>
					<button type="button" class="p-1 text-gray-600 hover:text-gray-900" title="Link">
						<ModernIcon name="Link" size="16" />
					</button>
				</div>
				<textarea
					id={field.name}
					class="w-full p-3 min-h-[150px] border-0 focus:ring-0 resize-none"
					placeholder={field.placeholder}
					value={internalValue}
					required={field.required}
					on:input={(e) => handleChange(e.currentTarget.value)}
				></textarea>
			</div>
			
		{:else if field.type === 'select'}
			<select
				id={field.name}
				class={inputClass}
				value={internalValue}
				required={field.required}
				on:change={(e) => handleChange(e.currentTarget.value)}
			>
				{#if !field.required}
					<option value="">Selecione...</option>
				{/if}
				{#each field.options || [] as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
			
		{:else if field.type === 'multiselect'}
			<div class="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
				{#each field.options || [] as option}
					<label class="flex items-center space-x-2 cursor-pointer">
						<input
							type="checkbox"
							class="rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
							value={option.value}
							checked={Array.isArray(internalValue) && internalValue.includes(option.value)}
							on:change={(e) => {
								const checked = e.currentTarget.checked;
								const currentArray = Array.isArray(internalValue) ? [...internalValue] : [];
								
								if (checked) {
									if (!currentArray.includes(option.value)) {
										currentArray.push(option.value);
									}
								} else {
									const index = currentArray.indexOf(option.value);
									if (index > -1) {
										currentArray.splice(index, 1);
									}
								}
								
								handleChange(currentArray);
							}}
						/>
						<span class="text-sm text-gray-700">{option.label}</span>
					</label>
				{/each}
			</div>
			
		{:else if field.type === 'boolean'}
			<div class="flex items-center space-x-3">
				<label class="flex items-center cursor-pointer">
					<input
						type="checkbox"
						class="sr-only"
						checked={internalValue}
						on:change={(e) => handleChange(e.currentTarget.checked)}
					/>
					<div class="relative">
						<div 
							class="w-11 h-6 rounded-full shadow-inner transition-colors duration-300 ease-in-out"
							class:bg-green-500={internalValue}
							class:bg-gray-200={!internalValue}
						></div>
						<div 
							class="absolute inset-y-0 left-0 w-6 h-6 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out"
							class:translate-x-5={internalValue}
							class:translate-x-0={!internalValue}
						></div>
					</div>
				</label>
				<span class="text-sm text-gray-700">
					{internalValue ? 'Ativo' : 'Inativo'}
				</span>
			</div>
			
		{:else if field.type === 'date'}
			<input
				id={field.name}
				type="date"
				class={inputClass}
				value={internalValue}
				required={field.required}
				on:change={(e) => handleChange(e.currentTarget.value)}
			/>
			
		{:else if field.type === 'color'}
			<div class="flex items-center space-x-3">
				<input
					id={field.name}
					type="color"
					class="w-12 h-10 border border-gray-300 rounded cursor-pointer"
					value={internalValue || '#000000'}
					on:change={(e) => handleChange(e.currentTarget.value)}
				/>
				<input
					type="text"
					class={`${inputClass} flex-1`}
					placeholder="#000000"
					value={internalValue}
					on:input={(e) => handleChange(e.currentTarget.value)}
				/>
			</div>
			
		{:else if field.type === 'image'}
			<div class="space-y-3">
				{#if internalValue}
					<div class="relative inline-block">
						<img 
							src={internalValue} 
							alt={field.label}
							class="w-32 h-32 object-cover rounded-lg border border-gray-300"
						/>
						<button
							type="button"
							class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
							on:click={() => handleChange('')}
						>
							<ModernIcon name="X" size="12" />
						</button>
					</div>
				{/if}
				
				<div class="flex gap-2">
					<input
						type="text"
						class={`${inputClass} flex-1`}
						placeholder="URL da imagem ou clique para enviar"
						value={internalValue}
						on:input={(e) => handleChange(e.currentTarget.value)}
					/>
					<button
						type="button"
						class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
						on:click={() => {
							// TODO: Implementar upload de imagem
							console.log('Upload de imagem não implementado');
						}}
					>
						<ModernIcon name="Upload" size="16" />
					</button>
				</div>
			</div>
			
		{:else if field.type === 'json'}
			<div class="space-y-2">
				<textarea
					id={field.name}
					class={`${inputClass} font-mono text-sm min-h-[120px]`}
					placeholder={`{"key": "value"}`}
					value={typeof internalValue === 'object' ? JSON.stringify(internalValue, null, 2) : internalValue}
					on:input={(e) => {
						try {
							const parsed = JSON.parse(e.currentTarget.value);
							handleChange(parsed);
						} catch {
							handleChange(e.currentTarget.value);
						}
					}}
				></textarea>
				<p class="text-xs text-gray-500">
					Formato JSON válido. Use aspas duplas para chaves e valores texto.
				</p>
			</div>
			
		{:else}
			<!-- Tipo não suportado -->
			<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
				<p class="text-sm text-yellow-800">
					Tipo de campo "{field.type}" não suportado ainda.
				</p>
			</div>
		{/if}
		
		<!-- Help text -->
		{#if field.help}
			<p class="mt-1 text-xs text-gray-500">{field.help}</p>
		{/if}
		
		<!-- Erro -->
		{#if error}
			<p class="mt-1 text-sm text-red-600 flex items-center gap-1">
				<ModernIcon name="AlertCircle" size="14" />
				{error}
			</p>
		{/if}
	</div>
{/if}

<style>
	.field-wrapper {
		transition: all 0.2s ease;
	}
	
	.field-wrapper.has-error {
		animation: shake 0.3s ease-in-out;
	}
	
	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-4px); }
		75% { transform: translateX(4px); }
	}
</style> 