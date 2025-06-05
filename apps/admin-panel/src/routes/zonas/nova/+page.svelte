<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button, Input, Select } from '$lib/components/ui';
  import { toast } from '$lib/stores/toast';
  
  let loading = false;
  let formData = {
    name: '',
    description: '',
    states: '',
    cep_ranges: '',
    is_active: true
  };
  
  async function handleSave() {
    loading = true;
    try {
      console.log('Criando nova zona:', formData);
      toast.success('Zona de frete criada com sucesso!');
      goto('/zonas');
    } catch (error) {
      toast.error('Erro ao criar zona de frete');
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
        <h1 class="text-2xl font-bold text-gray-900">Nova Zona de Frete</h1>
        <div class="flex gap-3">
          <Button variant="secondary" onclick={() => goto('/zonas')}>
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
          <label class="block text-sm font-medium text-gray-700">Nome da Zona *</label>
          <Input
            type="text"
            bind:value={formData.name}
            placeholder="Ex: Sudeste, Sul, Nordeste"
            required
          />
        </div>
        
        <!-- Status -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Status</label>
          <Select
            bind:value={formData.is_active}
            options={[
              { value: true, label: 'Ativa' },
              { value: false, label: 'Inativa' }
            ]}
          />
        </div>
        
        <!-- Descrição -->
        <div class="space-y-2 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Descrição</label>
          <Input
            type="text"
            bind:value={formData.description}
            placeholder="Descrição da zona de frete"
          />
        </div>
        
        <!-- Estados -->
        <div class="space-y-2 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Estados/UF</label>
          <Input
            type="text"
            bind:value={formData.states}
            placeholder="Ex: SP, RJ, MG, ES"
          />
          <p class="text-xs text-gray-500">Separe os estados por vírgula</p>
        </div>
        
        <!-- Faixas de CEP -->
        <div class="space-y-2 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Faixas de CEP</label>
          <Input
            type="text"
            bind:value={formData.cep_ranges}
            placeholder="Ex: 01000000-19999999, 20000000-28999999"
          />
          <p class="text-xs text-gray-500">Separe as faixas por vírgula</p>
        </div>
        
      </div>
    </div>
  </div>
</div> 