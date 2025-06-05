<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import FormField from '$lib/components/shared/FormField.svelte';
  import FormContainer from '$lib/components/shared/FormContainer.svelte';
  import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
  import { api } from '$lib/services/api';
  import { toast } from '$lib/stores/toast';

  // ID da modalidade
  const modalityId = $derived($page.params.id);

  // Estado do formulário
  let formData = $state({
    code: '',
    name: '',
    description: '',
    price_multiplier: 1.000,
    days_multiplier: 1.000,
    delivery_days_min: 3,
    delivery_days_max: 7,
    min_price: null,
    max_price: null,
    pricing_type: 'per_shipment',
    is_active: true,
    is_default: false,
    priority: 1,
    settings: {}
  });

  let loading = $state(true);
  let saving = $state(false);

  // Opções para selects
  const pricingTypeOptions = [
    { value: 'per_shipment', label: 'Por Envio' },
    { value: 'per_item', label: 'Por Item' }
  ];

  const priorityOptions = [
    { value: 1, label: '1 - Máxima (Express)' },
    { value: 2, label: '2 - Alta (Rápida)' },
    { value: 3, label: '3 - Normal' },
    { value: 4, label: '4 - Baixa' },
    { value: 5, label: '5 - Mínima' }
  ];

  // Carregar dados da modalidade
  async function loadModality() {
    try {
      const response = await api.get(`/shipping-modalities/${modalityId}`);
      
      if (response.success) {
        formData = { ...formData, ...response.data };
      } else {
        toast.error('Modalidade não encontrada');
        goto('/modalidades-frete');
      }
    } catch (error) {
      console.error('Erro ao carregar modalidade:', error);
      toast.error('Erro ao carregar modalidade');
      goto('/modalidades-frete');
    } finally {
      loading = false;
    }
  }

  // Validação do formulário
  function isFormValid() {
    return formData.code.trim() && 
           formData.name.trim() && 
           formData.delivery_days_min > 0 &&
           formData.delivery_days_max >= formData.delivery_days_min;
  }

  // Salvar modalidade
  async function handleSave() {
    if (!isFormValid()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    saving = true;
    try {
      const response = await api.put(`/shipping-modalities/${modalityId}`, formData);
      
      if (response.success) {
        toast.success('Modalidade atualizada com sucesso!');
        goto('/modalidades-frete');
      } else {
        toast.error(response.error || 'Erro ao atualizar modalidade');
      }
    } catch (error) {
      console.error('Erro ao salvar modalidade:', error);
      toast.error('Erro interno do servidor');
    } finally {
      saving = false;
    }
  }

  // Excluir modalidade
  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir esta modalidade? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await api.delete(`/shipping-modalities/${modalityId}`);
      
      if (response.success) {
        toast.success('Modalidade excluída com sucesso!');
        goto('/modalidades-frete');
      } else {
        toast.error(response.error || 'Erro ao excluir modalidade');
      }
    } catch (error) {
      console.error('Erro ao excluir modalidade:', error);
      toast.error('Erro interno do servidor');
    }
  }

  onMount(() => {
    loadModality();
  });
</script>

<svelte:head>
  <title>Editar Modalidade de Frete - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b">
    <div class="max-w-7xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {loading ? 'Carregando...' : `Editar ${formData.name}`}
          </h1>
          <p class="text-gray-600 mt-1">Modificar configurações da modalidade de entrega</p>
        </div>
        <div class="flex gap-3">
          <button
            type="button"
            onclick={() => goto('/modalidades-frete')}
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onclick={handleDelete}
            disabled={loading || formData.is_default}
            class="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={formData.is_default ? 'Não é possível excluir modalidade padrão' : 'Excluir modalidade'}
          >
            Excluir
          </button>
          <button
            type="button"
            onclick={handleSave}
            disabled={loading || saving || !isFormValid()}
            class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {#if saving}
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {/if}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Content -->
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-600">Carregando modalidade...</p>
      </div>
    </div>
  {:else}
    <div class="max-w-4xl mx-auto p-6 space-y-6">
      
      <!-- Status da Modalidade -->
      {#if formData.is_default}
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center gap-2">
            <ModernIcon name="Star" size="sm" color="blue" />
            <span class="text-blue-800 font-medium">Modalidade Padrão do Sistema</span>
          </div>
          <p class="text-blue-700 text-sm mt-1">
            Esta é a modalidade padrão. Não pode ser excluída e tem configurações especiais.
          </p>
        </div>
      {/if}
      
      <!-- Informações Básicas -->
      <FormContainer
        title="Informações Básicas"
        subtitle="Dados principais da modalidade"
        icon="Package"
        columns={2}
      >
        <FormField
          label="Nome da Modalidade *"
          type="text"
          bind:value={formData.name}
          placeholder="Ex: SEDEX, PAC, Express"
          required
        />

        <FormField
          label="Código *"
          type="text"
          bind:value={formData.code}
          placeholder="Ex: sedex, pac, express"
          helpText="Código único para identificação interna"
          required
          disabled={formData.is_default}
        />

        <div class="col-span-2">
          <FormField
            label="Descrição"
            type="textarea"
            bind:value={formData.description}
            placeholder="Descrição detalhada da modalidade"
            rows={3}
          />
        </div>
      </FormContainer>

      <!-- Configurações de Preço -->
      <FormContainer
        title="Configurações de Preço"
        subtitle="Como esta modalidade afeta o cálculo de frete"
        icon="Calculator"
        columns={2}
      >
        <FormField
          label="Multiplicador de Preço"
          type="number"
          bind:value={formData.price_multiplier}
          step="0.001"
          min="0"
          helpText="1.0 = preço normal, 0.8 = 20% desconto, 1.4 = 40% acréscimo"
        />

        <FormField
          label="Tipo de Cobrança"
          type="select"
          bind:value={formData.pricing_type}
          options={pricingTypeOptions}
        />

        <FormField
          label="Preço Mínimo (R$)"
          type="number"
          bind:value={formData.min_price}
          step="0.01"
          min="0"
          placeholder="0.00"
          helpText="Valor mínimo cobrado por esta modalidade"
        />

        <FormField
          label="Preço Máximo (R$)"
          type="number"
          bind:value={formData.max_price}
          step="0.01"
          min="0"
          placeholder="0.00"
          helpText="Valor máximo cobrado por esta modalidade"
        />
      </FormContainer>

      <!-- Configurações de Prazo -->
      <FormContainer
        title="Configurações de Prazo"
        subtitle="Prazos de entrega para esta modalidade"
        icon="Clock"
        columns={3}
      >
        <FormField
          label="Prazo Mínimo (dias) *"
          type="number"
          bind:value={formData.delivery_days_min}
          min="0"
          required
          helpText="Menor prazo de entrega"
        />

        <FormField
          label="Prazo Máximo (dias) *"
          type="number"
          bind:value={formData.delivery_days_max}
          min={formData.delivery_days_min}
          required
          helpText="Maior prazo de entrega"
        />

        <FormField
          label="Multiplicador de Prazo"
          type="number"
          bind:value={formData.days_multiplier}
          step="0.001"
          min="0"
          helpText="1.0 = prazo normal, 0.6 = 40% mais rápido"
        />
      </FormContainer>

      <!-- Configurações Avançadas -->
      <FormContainer
        title="Configurações Avançadas"
        subtitle="Prioridade e configurações especiais"
        icon="Settings"
        columns={2}
      >
        <FormField
          label="Prioridade"
          type="select"
          bind:value={formData.priority}
          options={priorityOptions}
          helpText="Ordem de exibição na loja (1 = primeira opção)"
        />

        <div class="space-y-4">
          <FormField
            label="Status Ativo"
            type="checkbox"
            bind:value={formData.is_active}
            placeholder="Modalidade disponível para uso"
          />

          <FormField
            label="Modalidade Padrão"
            type="checkbox"
            bind:value={formData.is_default}
            placeholder="Definir como modalidade padrão do sistema"
            disabled={true}
            helpText="Apenas administradores podem alterar modalidade padrão"
          />
        </div>
      </FormContainer>

      <!-- Preview -->
      <FormContainer
        title="Preview"
        subtitle="Como será exibido para o cliente"
        icon="Eye"
        columns={1}
      >
        <div class="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-medium text-gray-900">{formData.name || 'Nome da Modalidade'}</h4>
              <p class="text-sm text-gray-600">{formData.description || 'Descrição da modalidade'}</p>
              <div class="flex items-center gap-4 mt-2">
                <span class="text-sm text-gray-500">
                  Prazo: {formData.delivery_days_min === formData.delivery_days_max 
                    ? `${formData.delivery_days_min} dia${formData.delivery_days_min !== 1 ? 's' : ''}`
                    : `${formData.delivery_days_min}-${formData.delivery_days_max} dias`}
                </span>
                {#if formData.price_multiplier !== 1}
                  <span class="text-sm {formData.price_multiplier < 1 ? 'text-green-600' : 'text-red-600'}">
                    {formData.price_multiplier < 1 ? 'Desconto' : 'Acréscimo'}: 
                    {Math.abs((formData.price_multiplier - 1) * 100).toFixed(0)}%
                  </span>
                {/if}
              </div>
            </div>
            <div class="text-right">
              <span class="font-medium text-gray-900">R$ XX,XX</span>
              <div class="text-xs text-gray-500">Calculado na hora</div>
            </div>
          </div>
        </div>
      </FormContainer>

    </div>
  {/if}
</div> 