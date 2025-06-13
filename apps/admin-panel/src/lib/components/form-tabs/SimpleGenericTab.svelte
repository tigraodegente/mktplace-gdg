<script lang="ts">
  import type { FormField } from '$lib/config/formConfigs';
  
  interface Props {
    fields?: FormField[];
    formData: any;
    errors?: Record<string, string>;
  }
  
  let { 
    fields = [], 
    formData = $bindable({}), 
    errors = {}
  }: Props = $props();
  
  // Função para atualizar campos
  function updateField(fieldName: string, value: any) {
    formData[fieldName] = value;
  }
  
  // Verificar se campo deve ser exibido
  function shouldShowField(field: FormField): boolean {
    if (!field.conditional) return true;
    
    const { field: conditionField, value: conditionValue, operator = 'equals' } = field.conditional;
    const currentValue = formData[conditionField];
    
    switch (operator) {
      case 'equals':
        return currentValue === conditionValue;
      case 'not-equals':
        return currentValue !== conditionValue;
      default:
        return true;
    }
  }
  
  // CSS classes
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors";
  const errorInputClass = "border-red-300 focus:ring-red-500 focus:border-red-500";
</script>

<div class="space-y-6">
  {#each fields as field}
    {#if shouldShowField(field)}
      <div class="form-field" class:md:col-span-2={field.fullWidth}>
        <!-- Label -->
        <label class="block text-sm font-medium text-gray-700 mb-2" for={field.name}>
          {field.label}
          {#if field.required}
            <span class="text-red-500 ml-1">*</span>
          {/if}
        </label>
        
        <!-- Campo baseado no tipo -->
        {#if field.type === 'text' || field.type === 'email' || field.type === 'url'}
          <input
            id={field.name}
            type={field.type}
            class={errors?.[field.name] ? `${inputClass} ${errorInputClass}` : inputClass}
            placeholder={field.placeholder}
            value={formData[field.name] || ''}
            required={field.required}
            oninput={(e) => updateField(field.name, e.currentTarget.value)}
          />
          
        {:else if field.type === 'number'}
          <input
            id={field.name}
            type="number"
            class={errors?.[field.name] ? `${inputClass} ${errorInputClass}` : inputClass}
            placeholder={field.placeholder}
            value={formData[field.name] || 0}
            min={field.validation?.min}
            max={field.validation?.max}
            required={field.required}
            oninput={(e) => updateField(field.name, Number(e.currentTarget.value))}
          />
          
        {:else if field.type === 'textarea'}
          <textarea
            id={field.name}
            class={`${errors?.[field.name] ? `${inputClass} ${errorInputClass}` : inputClass} min-h-[100px] resize-y`}
            placeholder={field.placeholder}
            value={formData[field.name] || ''}
            required={field.required}
            oninput={(e) => updateField(field.name, e.currentTarget.value)}
          ></textarea>
          
        {:else if field.type === 'select'}
          <select
            id={field.name}
            class={errors?.[field.name] ? `${inputClass} ${errorInputClass}` : inputClass}
            value={formData[field.name] || ''}
            required={field.required}
            onchange={(e) => updateField(field.name, e.currentTarget.value)}
          >
            {#if !field.required}
              <option value="">Selecione...</option>
            {/if}
            {#each field.options || [] as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          
        {:else if field.type === 'boolean'}
          <div class="flex items-center space-x-3">
            <label class="flex items-center cursor-pointer">
              <input
                type="checkbox"
                class="sr-only"
                checked={formData[field.name] || false}
                onchange={(e) => updateField(field.name, e.currentTarget.checked)}
              />
              <div class="relative">
                <div 
                  class="w-11 h-6 rounded-full shadow-inner transition-colors duration-300 ease-in-out"
                  class:bg-green-500={formData[field.name]}
                  class:bg-gray-200={!formData[field.name]}
                ></div>
                <div 
                  class="absolute inset-y-0 left-0 w-6 h-6 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out"
                  class:translate-x-5={formData[field.name]}
                  class:translate-x-0={!formData[field.name]}
                ></div>
              </div>
            </label>
            <span class="text-sm text-gray-700">
              {formData[field.name] ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          
        {:else if field.type === 'date'}
          <input
            id={field.name}
            type="date"
            class={errors?.[field.name] ? `${inputClass} ${errorInputClass}` : inputClass}
            value={formData[field.name] || ''}
            required={field.required}
            onchange={(e) => updateField(field.name, e.currentTarget.value)}
          />
          
        {:else if field.type === 'image'}
          <div class="space-y-3">
            {#if formData[field.name]}
              <div class="relative inline-block">
                <img 
                  src={formData[field.name]} 
                  alt={field.label}
                  class="w-32 h-32 object-cover rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  onclick={() => updateField(field.name, '')}
                >
                  ×
                </button>
              </div>
            {/if}
            
            <input
              type="text"
              class={errors?.[field.name] ? `${inputClass} ${errorInputClass}` : inputClass}
              placeholder="URL da imagem"
              value={formData[field.name] || ''}
              oninput={(e) => updateField(field.name, e.currentTarget.value)}
            />
          </div>
          
        {:else}
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
        {#if errors?.[field.name]}
          <p class="mt-1 text-sm text-red-600">
            {errors[field.name]}
          </p>
        {/if}
      </div>
    {/if}
  {/each}
</div>

<style>
  .form-field {
    transition: all 0.2s ease;
  }
</style> 