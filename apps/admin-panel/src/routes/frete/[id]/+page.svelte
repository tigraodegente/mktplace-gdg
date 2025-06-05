<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Button, Input, Select } from '$lib/components/ui';
  import { toast } from '$lib/stores/toast';
  
  let loading = false;
  let formData = {
    name: '',
    description: '',
    base_cost: 0,
    cost_per_kg: 0,
    min_delivery_days: 1,
    max_delivery_days: 7,
    is_active: true
  };
  
  const id = $page.params.id;
  
  onMount(async () => {
    // Simular carregamento dos dados
    console.log('Carregando modalidade ID:', id);
    // Aqui você implementaria a chamada da API real
    formData = {
      name: 'PAC - Exemplo',
      description: 'Correios - Encomenda Econômica',
      base_cost: 15.50,
      cost_per_kg: 2.00,
      min_delivery_days: 5,
      max_delivery_days: 10,
      is_active: true
    };
  });
  
  async function handleSave() {
    loading = true;
    try {
      console.log('Atualizando modalidade:', formData);
      toast.success('Modalidade de frete atualizada com sucesso!');
      goto('/frete');
    } catch (error) {
      toast.error('Erro ao atualizar modalidade de frete');
    } finally {
      loading = false;
    }
  }
  
  async function handleDelete() {
    if (confirm('Tem certeza que deseja excluir esta modalidade de frete?')) {
      try {
        console.log('Excluindo modalidade ID:', id);
        toast.success('Modalidade de frete excluída com sucesso!');
        goto('/frete');
      } catch (error) {
        toast.error('Erro ao excluir modalidade de frete');
      }
    }
  }
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b">
    <div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Editar Modalidade de Frete</h1>
        <div class="flex gap-3">
          <Button variant="danger" onclick={handleDelete}>
            Excluir
          </Button>
          <Button variant="secondary" onclick={() => goto('/frete')}>
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
        
        <!-- Nome -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Nome *</label>
          <Input
            type="text"
            bind:value={formData.name}
            placeholder="Ex: PAC, SEDEX, Entrega Expressa"
            required
          />
        </div>
        
        <!-- Descrição -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Descrição</label>
          <Input
            type="text"
            bind:value={formData.description}
            placeholder="Descrição da modalidade"
          />
        </div>
        
        <!-- Custo Base -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Custo Base (R$)</label>
          <Input
            type="number"
            step="0.01"
            bind:value={formData.base_cost}
            placeholder="0.00"
          />
        </div>
        
        <!-- Custo por Kg -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Custo por Kg (R$)</label>
          <Input
            type="number"
            step="0.01"
            bind:value={formData.cost_per_kg}
            placeholder="0.00"
          />
        </div>
        
        <!-- Prazo Mínimo -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Prazo Mínimo (dias)</label>
          <Input
            type="number"
            bind:value={formData.min_delivery_days}
            min="0"
          />
        </div>
        
        <!-- Prazo Máximo -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Prazo Máximo (dias)</label>
          <Input
            type="number"
            bind:value={formData.max_delivery_days}
            min="0"
          />
        </div>
        
        <!-- Status -->
        <div class="space-y-2 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Status</label>
          <Select
            bind:value={formData.is_active}
            options={[
              { value: true, label: 'Ativa' },
              { value: false, label: 'Inativa' }
            ]}
          />
        </div>
        
      </div>
    </div>
  </div>
</div> 