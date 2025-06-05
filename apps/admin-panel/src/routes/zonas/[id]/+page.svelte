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
    states: [],
    cep_ranges: [],
    is_active: true
  };
  
  const id = $page.params.id;
  
  onMount(async () => {
    console.log('Carregando zona ID:', id);
    // Simular carregamento dos dados
    formData = {
      name: 'Sudeste',
      description: 'Estados do Sudeste - SP, RJ, MG, ES',
      states: ['SP', 'RJ', 'MG', 'ES'],
      cep_ranges: ['01000000-19999999', '20000000-28999999', '30000000-39999999'],
      is_active: true
    };
  });
  
  async function handleSave() {
    loading = true;
    try {
      console.log('Atualizando zona:', formData);
      toast.success('Zona de frete atualizada com sucesso!');
      goto('/zonas');
    } catch (error) {
      toast.error('Erro ao atualizar zona de frete');
    } finally {
      loading = false;
    }
  }
  
  async function handleDelete() {
    if (confirm('Tem certeza que deseja excluir esta zona de frete?')) {
      try {
        console.log('Excluindo zona ID:', id);
        toast.success('Zona de frete excluída com sucesso!');
        goto('/zonas');
      } catch (error) {
        toast.error('Erro ao excluir zona de frete');
      }
    }
  }
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b">
    <div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Editar Zona de Frete</h1>
        <div class="flex gap-3">
          <Button variant="danger" onclick={handleDelete}>
            Excluir
          </Button>
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
            value={formData.states.join(', ')}
            placeholder="Ex: SP, RJ, MG, ES"
            readonly
          />
          <p class="text-xs text-gray-500">Lista dos estados cobertos por esta zona</p>
        </div>
        
        <!-- Faixas de CEP -->
        <div class="space-y-2 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Faixas de CEP</label>
          <div class="space-y-2">
            {#each formData.cep_ranges as range, index}
              <Input
                type="text"
                value={range}
                placeholder="Ex: 01000000-19999999"
                readonly
              />
            {/each}
          </div>
          <p class="text-xs text-gray-500">Faixas de CEP cobertas por esta zona</p>
        </div>
        
      </div>
    </div>
  </div>
</div> 