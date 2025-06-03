<script lang="ts">
	import { cn } from '$lib/utils/cn';
	
	interface Props {
		type?: string;
		value?: any;
		placeholder?: string;
		label?: string;
		error?: string;
		hint?: string;
		required?: boolean;
		disabled?: boolean;
		readonly?: boolean;
		class?: string;
		icon?: string;
		onchange?: (e: Event) => void;
		oninput?: (e: Event) => void;
		onblur?: (e: Event) => void;
		onfocus?: (e: Event) => void;
		[key: string]: any;
	}
	
	let { 
		type = 'text',
		value = $bindable(),
		placeholder = '',
		label = '',
		error = '',
		hint = '',
		required = false,
		disabled = false,
		readonly = false,
		class: className = '',
		icon = '',
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
	
	<div class="relative">
		{#if icon}
			<div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
				{icon}
			</div>
		{/if}
		
		<input
			{type}
			bind:value
			{placeholder}
			{required}
			{disabled}
			{readonly}
			class={cn(
				"w-full px-4 py-3 border rounded-lg transition-all duration-200",
				"focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]",
				{
					"pl-10": icon,
					"border-gray-300": !error,
					"border-red-500": error,
					"bg-gray-50 cursor-not-allowed": disabled,
					"bg-gray-100": readonly
				},
				className
			)}
			{...restProps}
		/>
	</div>
	
	{#if error}
		<p class="mt-1 text-sm text-red-600">{error}</p>
	{:else if hint}
		<p class="mt-1 text-sm text-gray-500">{hint}</p>
	{/if}
</div> 