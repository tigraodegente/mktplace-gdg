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
    cnpj: '',
    contact_email: '',
    contact_phone: '',
    api_integration: false,
    api_url: '',
    api_key: '',
    coverage_type: 'national',
    is_active: true
  };
  
  const id = $page.params.id;
  
  onMount(async () => {
    console.log('Carregando transportadora ID:', id);
    // Simular carregamento dos dados
    formData = {
      name: 'Correios',
      description: 'Empresa Brasileira de Correios e Telégrafos',
      cnpj: '34028316000103',
      contact_email: 'atendimento@correios.com.br',
      contact_phone: '(11) 3003-0100',
      api_integration: true,
      api_url: 'https://api.correios.com.br',
      api_key: 'api_key_example',
      coverage_type: 'national',
      is_active: true
    };
  });
  
  async function handleSave() {
    loading = true;
    try {
      console.log('Atualizando transportadora:', formData);
      toast.success('Transportadora atualizada com sucesso!');
      goto('/transportadoras');
    } catch (error) {
      toast.error('Erro ao atualizar transportadora');
    } finally {
      loading = false;
    }
  }
  
  async function handleDelete() {
    if (confirm('Tem certeza que deseja excluir esta transportadora?')) {
      try {
        console.log('Excluindo transportadora ID:', id);
        toast.success('Transportadora excluída com sucesso!');
        goto('/transportadoras');
      } catch (error) {
        toast.error('Erro ao excluir transportadora');
      }
    }
  }
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b">
    <div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Editar Transportadora</h1>
        <div class="flex gap-3">
          <Button variant="danger" onclick={handleDelete}>
            Excluir
          </Button>
          <Button variant="secondary" onclick={() => goto('/transportadoras')}>
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
          <label class="block text-sm font-medium text-gray-700">Nome da Transportadora *</label>
          <Input
            type="text"
            bind:value={formData.name}
            placeholder="Ex: Correios, Jadlog, Total Express"
            required
          />
        </div>
        
        <!-- CNPJ -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">CNPJ</label>
          <Input
            type="text"
            bind:value={formData.cnpj}
            placeholder="00.000.000/0000-00"
          />
        </div>
        
        <!-- Email -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Email de Contato</label>
          <Input
            type="email"
            bind:value={formData.contact_email}
            placeholder="contato@transportadora.com"
          />
        </div>
        
        <!-- Telefone -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Telefone</label>
          <Input
            type="text"
            bind:value={formData.contact_phone}
            placeholder="(11) 99999-9999"
          />
        </div>
        
        <!-- Descrição -->
        <div class="space-y-2 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Descrição</label>
          <Input
            type="text"
            bind:value={formData.description}
            placeholder="Descrição da transportadora"
          />
        </div>
        
        <!-- API Integration -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Integração API</label>
          <Select
            bind:value={formData.api_integration}
            options={[
              { value: false, label: 'Manual' },
              { value: true, label: 'API Integrada' }
            ]}
          />
        </div>
        
        <!-- Coverage Type -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Tipo de Cobertura</label>
          <Select
            bind:value={formData.coverage_type}
            options={[
              { value: 'national', label: 'Nacional' },
              { value: 'regional', label: 'Regional' },
              { value: 'local', label: 'Local' }
            ]}
          />
        </div>
        
        <!-- API URL (if integrated) -->
        {#if formData.api_integration}
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">URL da API</label>
            <Input
              type="url"
              bind:value={formData.api_url}
              placeholder="https://api.transportadora.com"
            />
          </div>
          
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Chave da API</label>
            <Input
              type="password"
              bind:value={formData.api_key}
              placeholder="Chave de acesso da API"
            />
          </div>
        {/if}
        
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