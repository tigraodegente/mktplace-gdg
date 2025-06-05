<script lang="ts">
  import { goto } from '$app/navigation';
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
  
  async function handleSave() {
    loading = true;
    try {
      console.log('Criando novo envio:', formData);
      toast.success('Envio criado com sucesso!');
      goto('/envios');
    } catch (error) {
      toast.error('Erro ao criar envio');
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b">
    <div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Novo Envio</h1>
        <div class="flex gap-3">
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