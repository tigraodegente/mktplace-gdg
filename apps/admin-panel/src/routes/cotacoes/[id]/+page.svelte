<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Button, Input, Select } from '$lib/components/ui';
  import { toast } from '$lib/stores/toast';
  
  let loading = false;
  let formData = {
    quote_id: '',
    customer_email: '',
    origin_cep: '',
    destination_cep: '',
    total_weight: 0,
    best_price: 0,
    options_count: 0,
    status: 'quoted'
  };
  
  const id = $page.params.id;
  
  onMount(async () => {
    console.log('Carregando cotação ID:', id);
    // Simular carregamento dos dados
    formData = {
      quote_id: 'QT-2024-001',
      customer_email: 'joao@exemplo.com',
      origin_cep: '01000-000',
      destination_cep: '04000-000',
      total_weight: 2.5,
      best_price: 18.90,
      options_count: 3,
      status: 'quoted'
    };
  });
  
  async function handleSave() {
    loading = true;
    try {
      console.log('Atualizando cotação:', formData);
      toast.success('Cotação atualizada com sucesso!');
      goto('/cotacoes');
    } catch (error) {
      toast.error('Erro ao atualizar cotação');
    } finally {
      loading = false;
    }
  }
  
  async function handleDelete() {
    if (confirm('Tem certeza que deseja excluir esta cotação?')) {
      try {
        console.log('Excluindo cotação ID:', id);
        toast.success('Cotação excluída com sucesso!');
        goto('/cotacoes');
      } catch (error) {
        toast.error('Erro ao excluir cotação');
      }
    }
  }
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b">
    <div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Editar Cotação</h1>
        <div class="flex gap-3">
          <Button variant="danger" onclick={handleDelete}>
            Excluir
          </Button>
          <Button variant="secondary" onclick={() => goto('/cotacoes')}>
            Cancelar
          </Button>
          <Button onclick={handleSave} {loading}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Form -->
  <div class="max-w-[calc(100vw-100px)] mx-auto p-6">
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- ID da Cotação -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">ID da Cotação *</label>
          <Input
            type="text"
            bind:value={formData.quote_id}
            placeholder="Ex: QT-2024-001"
            required
            readonly
          />
        </div>
        
        <!-- Email do Cliente -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Email do Cliente *</label>
          <Input
            type="email"
            bind:value={formData.customer_email}
            placeholder="cliente@exemplo.com"
            required
          />
        </div>
        
        <!-- CEP de Origem -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">CEP de Origem</label>
          <Input
            type="text"
            bind:value={formData.origin_cep}
            placeholder="00000-000"
            maxlength="9"
          />
        </div>
        
        <!-- CEP de Destino -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">CEP de Destino</label>
          <Input
            type="text"
            bind:value={formData.destination_cep}
            placeholder="00000-000"
            maxlength="9"
          />
        </div>
        
        <!-- Peso Total -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Peso Total (kg)</label>
          <Input
            type="number"
            step="0.1"
            bind:value={formData.total_weight}
            min="0"
          />
        </div>
        
        <!-- Melhor Preço -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Melhor Preço (R$)</label>
          <Input
            type="number"
            step="0.01"
            bind:value={formData.best_price}
            min="0"
          />
        </div>
        
        <!-- Quantidade de Opções -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Opções Disponíveis</label>
          <Input
            type="number"
            bind:value={formData.options_count}
            min="0"
            readonly
          />
        </div>
        
        <!-- Status -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Status</label>
          <Select
            bind:value={formData.status}
            options={[
              { value: 'quoted', label: 'Cotado' },
              { value: 'selected', label: 'Selecionado' },
              { value: 'expired', label: 'Expirado' },
              { value: 'failed', label: 'Falha' }
            ]}
          />
        </div>
        
      </div>
    </div>
  </div>
</div> 