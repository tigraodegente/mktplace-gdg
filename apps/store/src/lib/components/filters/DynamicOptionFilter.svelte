<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { page } from '$app/stores';
  
  interface Props {
    optionName: string;
    optionSlug: string;
    facets?: Array<{ value: string; count: number }>;
    selectedValues?: string[];
  }
  
  let {
    optionName,
    optionSlug,
    facets = [],
    selectedValues = []
  }: Props = $props();
  
  const dispatch = createEventDispatcher();
  

  
  function toggleValue(value: string) {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    
    dispatch('change', { values: newValues });
  }
  
  function clearAll() {
    dispatch('change', { values: [] });
  }
  
  const hasSelection = $derived(selectedValues.length > 0);
  const showSearch = $derived(facets.length > 10);
  
  let searchQuery = $state('');
  const filteredFacets = $derived(searchQuery
    ? facets.filter(f => f.value.toLowerCase().includes(searchQuery.toLowerCase()))
    : facets);
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-medium text-gray-900">{optionName}</h3>
    {#if hasSelection}
      <button
        onclick={clearAll}
        class="text-xs text-blue-600 hover:text-blue-800"
      >
        Limpar
      </button>
    {/if}
  </div>
  
  {#if showSearch}
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Buscar {optionName.toLowerCase()}..."
      class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
    />
  {/if}
  
  <div class="space-y-2 max-h-60 overflow-y-auto">
    {#each filteredFacets as facet}
      {@const isSelected = selectedValues.includes(facet.value)}
      
      <label class="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
        <input
          type="checkbox"
          checked={isSelected}
          onchange={() => toggleValue(facet.value)}
          class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        
        <span class="ml-2 flex-1 flex items-center gap-2">
          <span class="text-sm text-gray-700">
            {facet.value}
          </span>
        </span>
        
        <span class="text-xs text-gray-500">
          ({facet.count})
        </span>
      </label>
    {/each}
    
    {#if filteredFacets.length === 0}
      <p class="text-sm text-gray-500 text-center py-2">
        Nenhuma opção encontrada
      </p>
    {/if}
  </div>
</div> 