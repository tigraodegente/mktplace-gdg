<script lang="ts">
	import { cn } from '$lib/utils/cn';
	
	interface Option {
		value: string | number;
		label: string;
		disabled?: boolean;
	}
	
	interface Props {
		value?: any;
		options?: Option[];
		placeholder?: string;
		label?: string;
		error?: string;
		hint?: string;
		required?: boolean;
		disabled?: boolean;
		multiple?: boolean;
		class?: string;
		onchange?: (e: Event) => void;
		[key: string]: any;
	}
	
	let { 
		value = $bindable(),
		options = [],
		placeholder = 'Selecione...',
		label = '',
		error = '',
		hint = '',
		required = false,
		disabled = false,
		multiple = false,
		class: className = '',
		...restProps
	} = $props<Props>();
</script>

<div class="w-full">
	{#if label}
		<label class="block text-sm font-medium text-gray-700 mb-2">
			{label}
			{#if required}
				<span class="text-red-500 ml-1">*</span>
			{/if}
		</label>
	{/if}
	
	{#if multiple}
		<select
			bind:value
			{required}
			{disabled}
			multiple
			class={cn(
				"w-full px-4 py-3 border rounded-lg transition-all duration-200",
				"focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]",
				{
					"border-gray-300": !error,
					"border-red-500": error,
					"bg-gray-50 cursor-not-allowed": disabled
				},
				className
			)}
			{...restProps}
		>
			{#each options as option}
				<option value={option.value} disabled={option.disabled}>
					{option.label}
				</option>
			{/each}
		</select>
	{:else}
		<select
			bind:value
			{required}
			{disabled}
			class={cn(
				"w-full px-4 py-3 border rounded-lg transition-all duration-200",
				"focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]",
				{
					"border-gray-300": !error,
					"border-red-500": error,
					"bg-gray-50 cursor-not-allowed": disabled
				},
				className
			)}
			{...restProps}
		>
			{#if placeholder}
				<option value="">{placeholder}</option>
			{/if}
			
			{#each options as option}
				<option value={option.value} disabled={option.disabled}>
					{option.label}
				</option>
			{/each}
		</select>
	{/if}
	
	{#if error}
		<p class="mt-1 text-sm text-red-600">{error}</p>
	{:else if hint}
		<p class="mt-1 text-sm text-gray-500">{hint}</p>
	{/if}
</div> 