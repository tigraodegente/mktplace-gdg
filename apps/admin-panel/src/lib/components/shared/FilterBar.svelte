<script lang="ts">
	import ModernIcon from './ModernIcon.svelte';
	
	export let searchValue = '';
	export let searchPlaceholder = 'Buscar...';
	export let filters: Filter[] = [];
	export let onSearch: (value: string) => void = () => {};
	export let onFilterChange: (filterId: string, value: any) => void = () => {};
	export let onClearFilters: () => void = () => {};
	export let showClearButton = true;
	
	interface Filter {
		id: string;
		label: string;
		type: 'select' | 'date' | 'daterange' | 'number' | 'checkbox';
		value: any;
		options?: FilterOption[];
		placeholder?: string;
		min?: number;
		max?: number;
		className?: string;
	}
	
	interface FilterOption {
		value: string | number;
		label: string;
		icon?: string;
	}
	
	function handleSearch(e: Event) {
		const target = e.target as HTMLInputElement;
		searchValue = target.value;
		onSearch(searchValue);
	}
	
	function handleFilterChange(filterId: string, e: Event & { currentTarget: EventTarget & (HTMLInputElement | HTMLSelectElement) }) {
		const target = e.currentTarget;
		const filter = filters.find(f => f.id === filterId);
		
		if (!filter) return;
		
		let value: any = target.value;
		
		if (filter.type === 'number') {
			value = target.value ? Number(target.value) : null;
		} else if (filter.type === 'checkbox') {
			value = (target as HTMLInputElement).checked;
		}
		
		onFilterChange(filterId, value);
	}
</script>

<div class="bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
	<div class="grid grid-cols-1 md:grid-cols-{filters.length + 2} gap-4">
		<!-- Campo de busca -->
		<div class="relative">
			<div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">
				<ModernIcon name="search" size="md" color="muted" />
			</div>
			<input
				type="text"
				bind:value={searchValue}
				on:input={handleSearch}
				placeholder={searchPlaceholder}
				class="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
			/>
		</div>
		
		<!-- Filtros dinâmicos -->
		{#each filters as filter}
			<div class={filter.className || ''}>
				{#if filter.type === 'select'}
					<select
						value={filter.value}
						on:change={(e) => handleFilterChange(filter.id, e)}
						class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					>
						{#if filter.placeholder}
							<option value="">{filter.placeholder}</option>
						{/if}
						{#each filter.options || [] as option}
							<option value={option.value}>
								{option.label}
							</option>
						{/each}
					</select>
				{:else if filter.type === 'date'}
					<input
						type="date"
						value={filter.value || ''}
						on:change={(e) => handleFilterChange(filter.id, e)}
						placeholder={filter.placeholder}
						class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					/>
				{:else if filter.type === 'number'}
					<input
						type="number"
						value={filter.value || ''}
						on:change={(e) => handleFilterChange(filter.id, e)}
						placeholder={filter.placeholder}
						min={filter.min}
						max={filter.max}
						class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					/>
				{:else if filter.type === 'checkbox'}
					<label class="flex items-center gap-3 px-4 py-3 cursor-pointer">
						<input
							type="checkbox"
							checked={filter.value || false}
							on:change={(e) => handleFilterChange(filter.id, e)}
							class="w-5 h-5 rounded border-slate-300 text-[#00BFB3] focus:ring-[#00BFB3]"
						/>
						<span class="text-slate-700">{filter.label}</span>
					</label>
				{/if}
			</div>
		{/each}
		
		<!-- Botão limpar filtros -->
		{#if showClearButton}
			<button
				type="button"
				on:click={onClearFilters}
				class="px-4 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
			>
				<ModernIcon name="delete" size="sm" color="muted" />
				Limpar Filtros
			</button>
		{/if}
	</div>
</div> 