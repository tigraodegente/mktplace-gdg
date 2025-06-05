<script lang="ts">
	// Props do componente usando $props() para Svelte 5
	interface Props {
		type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'datetime-local' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
		label?: string;
		value?: any;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		readonly?: boolean;
		maxlength?: number;
		min?: number | string;
		max?: number | string;
		step?: number | string;
		rows?: number;
		options?: Array<{value: any, label: string}>;
		multiple?: boolean;
		accept?: string;
		helpText?: string;
		error?: string;
		icon?: string;
		suffix?: string;
		prefix?: string;
		loading?: boolean;
		characterCount?: boolean;
		containerClass?: string;
		inputClass?: string;
		labelClass?: string;
	}

	let {
		type = 'text',
		label = '',
		value = $bindable(),
		placeholder = '',
		required = false,
		disabled = false,
		readonly = false,
		maxlength = undefined,
		min = undefined,
		max = undefined,
		step = undefined,
		rows = 3,
		options = [],
		multiple = false,
		accept = '',
		helpText = '',
		error = '',
		icon = '',
		suffix = '',
		prefix = '',
		loading = false,
		characterCount = false,
		containerClass = '',
		inputClass = '',
		labelClass = ''
	}: Props = $props();

	// Estados internos
	let focused = $state(false);
	let currentLength = $state(0);

	// Watchers
	$effect(() => {
		if (typeof value === 'string') {
			currentLength = value.length;
		}
	});

	// Funções
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
		
		if (type === 'number') {
			value = target.value ? parseFloat(target.value) : '';
		} else if (type === 'checkbox') {
			value = (target as HTMLInputElement).checked;
		} else if (type === 'file') {
			value = (target as HTMLInputElement).files;
		} else if (type === 'select' && multiple) {
			const selectElement = target as HTMLSelectElement;
			value = Array.from(selectElement.selectedOptions).map(option => option.value);
		} else {
			value = target.value;
		}
	}

	function handleFocus() {
		focused = true;
	}

	function handleBlur() {
		focused = false;
	}

	// Classes condicionais usando $derived
	const baseInputClass = $derived(`
		w-full px-4 py-3 border rounded-xl transition-all duration-200 placeholder-slate-500
		${focused || value ? 'border-[#00BFB3] ring-2 ring-[#00BFB3]/20' : 'border-slate-300'}
		${error ? 'border-red-500 ring-2 ring-red-500/20' : ''}
		${disabled ? 'bg-slate-100 cursor-not-allowed opacity-75' : 'bg-white hover:border-[#00BFB3]/50'}
		${readonly ? 'bg-slate-50' : ''}
		${prefix ? 'pl-12' : ''}
		${suffix ? 'pr-12' : ''}
		${icon ? 'pl-12' : ''}
		${inputClass}
	`.trim().replace(/\s+/g, ' '));

	const textareaClass = $derived(`
		w-full px-4 py-3 border rounded-xl transition-all duration-200 placeholder-slate-500 resize-none
		${focused || value ? 'border-[#00BFB3] ring-2 ring-[#00BFB3]/20' : 'border-slate-300'}
		${error ? 'border-red-500 ring-2 ring-red-500/20' : ''}
		${disabled ? 'bg-slate-100 cursor-not-allowed opacity-75' : 'bg-white hover:border-[#00BFB3]/50'}
		${readonly ? 'bg-slate-50' : ''}
		${inputClass}
	`.trim().replace(/\s+/g, ' '));

	const selectClass = $derived(`
		w-full px-4 py-3 border rounded-xl transition-all duration-200 bg-white
		${focused ? 'border-[#00BFB3] ring-2 ring-[#00BFB3]/20' : 'border-slate-300'}
		${error ? 'border-red-500 ring-2 ring-red-500/20' : ''}
		${disabled ? 'bg-slate-100 cursor-not-allowed opacity-75' : 'hover:border-[#00BFB3]/50'}
		${inputClass}
	`.trim().replace(/\s+/g, ' '));

	const checkboxClass = $derived(`
		w-5 h-5 rounded border-slate-300 text-[#00BFB3] transition-colors
		focus:ring-2 focus:ring-[#00BFB3]/20 focus:border-[#00BFB3]
		${disabled ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}
		${inputClass}
	`.trim().replace(/\s+/g, ' '));
</script>

<div class="space-y-2 {containerClass}">
	<!-- Label -->
	{#if label}
		<label class="block text-sm font-medium text-slate-700 {labelClass}">
			{#if icon}
				<span class="mr-2">{icon}</span>
			{/if}
			{label}
			{#if required}
				<span class="text-red-500 ml-1">*</span>
			{/if}
		</label>
	{/if}

	<!-- Campo de Input -->
	<div class="relative">
		{#if type === 'textarea'}
			<!-- Textarea -->
			<textarea
				{placeholder}
				{required}
				{disabled}
				{readonly}
				{maxlength}
				{rows}
				bind:value
				on:input={handleInput}
				on:focus={handleFocus}
				on:blur={handleBlur}
				class={textareaClass}
			></textarea>
		{:else if type === 'select'}
			<!-- Select -->
			<select
				{required}
				{disabled}
				{multiple}
				bind:value
				on:change={handleInput}
				on:focus={handleFocus}
				on:blur={handleBlur}
				class={selectClass}
			>
				{#if !multiple && placeholder}
					<option value="" disabled>{placeholder}</option>
				{/if}
				{#each options as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		{:else if type === 'checkbox'}
			<!-- Checkbox -->
			<label class="flex items-center gap-3 cursor-pointer">
				<input
					type="checkbox"
					{required}
					{disabled}
					checked={value}
					on:change={handleInput}
					class={checkboxClass}
				/>
				<span class="text-sm text-slate-900">{placeholder}</span>
			</label>
		{:else if type === 'radio'}
			<!-- Radio Group -->
			<div class="space-y-2">
				{#each options as option}
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="radio"
							{required}
							{disabled}
							bind:group={value}
							value={option.value}
							on:change={handleInput}
							class="w-5 h-5 text-[#00BFB3] border-slate-300 focus:ring-2 focus:ring-[#00BFB3]/20 focus:border-[#00BFB3] {disabled ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}"
						/>
						<span class="text-sm text-slate-900">{option.label}</span>
					</label>
				{/each}
			</div>
		{:else if type === 'file'}
			<!-- File Input -->
			<input
				type="file"
				{required}
				{disabled}
				{multiple}
				{accept}
				on:change={handleInput}
				class={baseInputClass}
			/>
		{:else}
			<!-- Input padrão -->
			<input
				{type}
				{placeholder}
				{required}
				{disabled}
				{readonly}
				{maxlength}
				{min}
				{max}
				{step}
				bind:value
				on:input={handleInput}
				on:focus={handleFocus}
				on:blur={handleBlur}
				class={baseInputClass}
			/>
		{/if}

		<!-- Prefix -->
		{#if prefix}
			<div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">
				{prefix}
			</div>
		{/if}

		<!-- Suffix -->
		{#if suffix}
			<div class="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">
				{suffix}
			</div>
		{/if}

		<!-- Icon -->
		{#if icon && type !== 'checkbox' && type !== 'radio'}
			<div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#00BFB3]">
				{icon}
			</div>
		{/if}

		<!-- Loading Spinner -->
		{#if loading}
			<div class="absolute right-4 top-1/2 transform -translate-y-1/2">
				<div class="w-4 h-4 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
			</div>
		{/if}
	</div>

	<!-- Helper Text, Error e Character Count -->
	<div class="flex justify-between items-center">
		<div class="flex-1">
			{#if error}
				<p class="text-sm text-red-600 flex items-center gap-1">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</p>
			{:else if helpText}
				<p class="text-sm text-slate-500">{helpText}</p>
			{/if}
		</div>

		{#if characterCount && maxlength}
			<p class="text-xs {currentLength > maxlength * 0.9 ? 'text-[#00BFB3]' : 'text-slate-500'}">
				{currentLength}/{maxlength}
			</p>
		{/if}
	</div>
</div> 