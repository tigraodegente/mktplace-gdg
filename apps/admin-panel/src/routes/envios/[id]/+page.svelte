<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Button, Input, Select } from '$lib/components/ui';
  import { toast } from '$lib/stores/toast';
  
  let loading = false;
  let formData = {
    tracking_code: '',
    order_id: '',
    customer_name: '',
    destination_city: '',
    destination_state: '',
    shipping_method: '',
    status: 'pending',
    shipped_at: '',
    estimated_delivery: ''
  };
  
  const id = $page.params.id;
  
  onMount(async () => {
    console.log('Carregando envio ID:', id);
    // Simular carregamento dos dados
    formData = {
      tracking_code: 'BR123456789BR',
      order_id: 'ORD-2024-001',
      customer_name: 'João Silva',
      destination_city: 'São Paulo',
      destination_state: 'SP',
      shipping_method: 'PAC',
      status: 'shipped',
      shipped_at: '2024-06-01',
      estimated_delivery: '2024-06-05'
    };
  });
  
  async function handleSave() {
    loading = true;
    try {
      console.log('Atualizando envio:', formData);
      toast.success('Envio atualizado com sucesso!');
      goto('/envios');
    } catch (error) {
      toast.error('Erro ao atualizar envio');
    } finally {
      loading = false;
    }
  }
  
  async function handleDelete() {
    if (confirm('Tem certeza que deseja excluir este envio?')) {
      try {
        console.log('Excluindo envio ID:', id);
        toast.success('Envio excluído com sucesso!');
        goto('/envios');
      } catch (error) {
        toast.error('Erro ao excluir envio');
      }
    }
  }
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b">
    <div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Editar Envio</h1>
        <div class="flex gap-3">
          <Button variant="danger" onclick={handleDelete}>
            Excluir
          </Button>
          <Button variant="secondary" onclick={() => goto('/envios')}>
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
        
        <!-- Código de Rastreio -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Código de Rastreio *</label>
          <Input
            type="text"
            bind:value={formData.tracking_code}
            placeholder="Ex: BR123456789BR"
            required
          />
        </div>
        
        <!-- ID do Pedido -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">ID do Pedido *</label>
          <Input
            type="text"
            bind:value={formData.order_id}
            placeholder="Ex: ORD-2024-001"
            required
          />
        </div>
        
        <!-- Nome do Cliente -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Nome do Cliente</label>
          <Input
            type="text"
            bind:value={formData.customer_name}
            placeholder="Nome do cliente"
          />
        </div>
        
        <!-- Modalidade de Envio -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Modalidade de Envio</label>
          <Input
            type="text"
            bind:value={formData.shipping_method}
            placeholder="Ex: PAC, SEDEX, Expressa"
          />
        </div>
        
        <!-- Cidade de Destino -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Cidade de Destino</label>
          <Input
            type="text"
            bind:value={formData.destination_city}
            placeholder="Ex: São Paulo"
          />
        </div>
        
        <!-- Estado de Destino -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Estado de Destino</label>
          <Input
            type="text"
            bind:value={formData.destination_state}
            placeholder="Ex: SP"
            maxlength="2"
          />
        </div>
        
        <!-- Status -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Status</label>
          <Select
            bind:value={formData.status}
            options={[
              { value: 'pending', label: 'Pendente' },
              { value: 'shipped', label: 'Enviado' },
              { value: 'in_transit', label: 'Em Trânsito' },
              { value: 'delivered', label: 'Entregue' },
              { value: 'failed', label: 'Falha na Entrega' }
            ]}
          />
        </div>
        
        <!-- Data de Envio -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Data de Envio</label>
          <Input
            type="date"
            bind:value={formData.shipped_at}
          />
        </div>
        
        <!-- Previsão de Entrega -->
        <div class="space-y-2 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Previsão de Entrega</label>
          <Input
            type="date"
            bind:value={formData.estimated_delivery}
          />
        </div>
        
      </div>
    </div>
  </div>
</div> 