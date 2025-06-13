<script lang="ts">
  import type { FormField, FormConfig } from '$lib/config/formConfigs';
  import UniversalFieldRenderer from '$lib/components/universal/UniversalFieldRenderer.svelte';
  
  interface Props {
    fields?: FormField[];
    formData: any;
    errors?: Record<string, string>;
    config: FormConfig;
    entityId?: string;
    isEdit?: boolean;
  }
  
  let { 
    fields = [], 
    formData = $bindable({}), 
    errors = {}, 
    config,
    entityId,
    isEdit = false
  }: Props = $props();
  
  // Função para atualizar campos e manter reatividade
  function updateField(fieldName: string, value: any) {
    formData[fieldName] = value;
    
    // Limpar erro quando campo é alterado
    if (errors && errors[fieldName]) {
      const newErrors = { ...errors };
      delete newErrors[fieldName];
      errors = newErrors;
    }
  }
  
  // Filtrar campos baseado em condições
  function shouldShowField(field: FormField): boolean {
    if (!field.conditional) return true;
    
    const { field: conditionField, value: conditionValue, operator = 'equals' } = field.conditional;
    const currentValue = formData[conditionField];
    
    switch (operator) {
      case 'equals':
        return currentValue === conditionValue;
      case 'not-equals':
        return currentValue !== conditionValue;
      case 'contains':
        return Array.isArray(currentValue) && currentValue.includes(conditionValue);
      case 'greater':
        return Number(currentValue) > Number(conditionValue);
      case 'less':
        return Number(currentValue) < Number(conditionValue);
      default:
        return true;
    }
  }
</script>

<div class="generic-tab">
  <div class="grid grid-cols-1 gap-6">
    {#each fields as field}
      {#if shouldShowField(field)}
        <div 
          class="form-field" 
          class:full-width={field.fullWidth}
          class:md:col-span-2={field.fullWidth}
        >
          <UniversalFieldRenderer 
            {field}
            value={formData[field.name]}
            error={errors?.[field.name]}
            {config}
            {entityId}
            {isEdit}
            onChange={(value) => updateField(field.name, value)}
          />
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .generic-tab {
    @apply space-y-6;
  }
  
  .form-field {
    @apply w-full;
  }
  
  .full-width {
    @apply w-full;
  }
  
  /* Grid responsivo */
  @media (min-width: 768px) {
    .generic-tab .grid {
      @apply grid-cols-2;
    }
  }
  
  /* Campos específicos que precisam de largura total */
  :global(.generic-tab .form-field.full-width) {
    @apply md:col-span-2;
  }
  
  /* Estilos para campos com erro */
  :global(.generic-tab .form-field.has-error) {
    @apply ring-2 ring-red-200 rounded-lg p-2;
  }
</style> 