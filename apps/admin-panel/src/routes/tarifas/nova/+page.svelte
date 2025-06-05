<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button, Input, Select } from '$lib/components/ui';
  import { toast } from '$lib/stores/toast';
  
  let loading = false;
  let formData = {
    zone_name: '',
    zone_states: '',
    min_weight: 0,
    max_weight: 30,
    base_price: 0,
    price_per_kg: 0,
    carrier_name: '',
    is_active: true
  };
  
  async function handleSave() {
    loading = true;
    try {
      console.log('Criando nova tarifa:', formData);
      toast.success('Tarifa base criada com sucesso!');
      goto('/tarifas');
    } catch (error) {
      toast.error('Erro ao criar tarifa base');
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
        <h1 class="text-2xl font-bold text-gray-900">Nova Tarifa Base</h1>
        <div class="flex gap-3">
          <Button variant="secondary" onclick={() => goto('/tarifas')}>
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
        
        <!-- Zona -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Nome da Zona *</label>
          <Input
            type="text"
            bind:value={formData.zone_name}
            placeholder="Ex: Sudeste, Sul, Nordeste"
            required
          />
        </div>
        
        <!-- Transportadora -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Transportadora *</label>
          <Input
            type="text"
            bind:value={formData.carrier_name}
            placeholder="Ex: Correios, Jadlog"
            required
          />
        </div>
        
        <!-- Estados -->
        <div class="space-y-2 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Estados/UF</label>
          <Input
            type="text"
            bind:value={formData.zone_states}
            placeholder="Ex: SP, RJ, MG, ES"
          />
        </div>
        
        <!-- Peso Mínimo -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Peso Mínimo (kg)</label>
          <Input
            type="number"
            step="0.1"
            bind:value={formData.min_weight}
            min="0"
          />
        </div>
        
        <!-- Peso Máximo -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Peso Máximo (kg)</label>
          <Input
            type="number"
            step="0.1"
            bind:value={formData.max_weight}
            min="0"
          />
        </div>
        
        <!-- Preço Base -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Preço Base (R$)</label>
          <Input
            type="number"
            step="0.01"
            bind:value={formData.base_price}
            placeholder="0.00"
          />
        </div>
        
        <!-- Preço por Kg Adicional -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Preço por Kg Adicional (R$)</label>
          <Input
            type="number"
            step="0.01"
            bind:value={formData.price_per_kg}
            placeholder="0.00"
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