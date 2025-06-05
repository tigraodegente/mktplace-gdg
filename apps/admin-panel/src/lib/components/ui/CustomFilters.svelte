<script lang="ts">
  import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
  
  interface CustomFilter {
    key: string;
    label: string;
    type: 'select' | 'input' | 'range' | 'date';
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
  }
  
  interface Props {
    filters: CustomFilter[];
    onFilterChange?: (key: string, value: string) => void;
  }
  
  let { filters = [], onFilterChange }: Props = $props();
  
  function handleFilterChange(filterKey: string, value: string) {
    console.log(`Filtro ${filterKey}:`, value);
    onFilterChange?.(filterKey, value);
  }
</script>

{#if filters.length > 0}
  <div class="bg-white rounded-lg border border-gray-200 mb-6 p-6">
    <div class="flex items-center gap-3 mb-4">
      <div class="p-2 bg-purple-100 rounded-lg">
        <ModernIcon name="Settings" size={20} color="#7C3AED" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900">Filtros Específicos</h3>
    </div>
    
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {#each filters as filter}
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {filter.label}
          </label>
          
          {#if filter.type === 'select'}
            <select 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
              on:change={(e) => handleFilterChange(filter.key, e.currentTarget.value)}
            >
              {#each filter.options || [] as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
            
          {:else if filter.type === 'input'}
            <input 
              type="text"
              placeholder={filter.placeholder || `Filtrar por ${filter.label.toLowerCase()}`}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
              on:input={(e) => handleFilterChange(filter.key, e.currentTarget.value)}
            />
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if} 