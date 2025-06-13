<script lang="ts">
  import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
  import { toast } from '$lib/stores/toast';
  import type { 
    VirtualField, 
    FormulaTemplate, 
    VirtualFieldFormData,
    EntityType,
    FieldType,
    VirtualFieldFilters 
  } from '$lib/types/virtualFields';
  import { FIELD_TYPE_LABELS, ENTITY_TYPE_LABELS, DEFAULT_FORMAT_OPTIONS } from '$lib/types/virtualFields';

  // Estados principais
  let fields = $state<VirtualField[]>([]);
  let templates = $state<FormulaTemplate[]>([]);
  let categories = $state<string[]>([]);
  let loading = $state(false);
  let saving = $state(false);

  // Estados da interface
  let showCreateModal = $state(false);
  let showEditModal = $state(false);
  let showDeleteModal = $state(false);
  let showTemplatesModal = $state(false);
  let selectedField = $state<VirtualField | null>(null);

  // Filtros
  let filters = $state<VirtualFieldFilters>({
    entity_type: 'products',
    is_active: true
  });

  // Formulário
  let formData = $state<VirtualFieldFormData>({
    name: '',
    display_name: '',
    description: '',
    formula: '',
    dependencies: [],
    ai_enabled: false,
    ai_prompt: '',
    entity_type: 'products',
    field_type: 'text',
    format_options: {},
    validation_rules: {},
    is_active: true,
    sort_order: 0
  });

  let formErrors = $state<Record<string, string>>({});

  // Estados auxiliares
  let newDependency = $state('');
  let selectedTemplate = $state<FormulaTemplate | null>(null);
  let testResult = $state<any>(null);
  let testLoading = $state(false);

  // Carregar dados iniciais
  $effect(() => {
    loadFields();
    loadTemplates();
  });

  // Carregar campos virtuais
  async function loadFields() {
    loading = true;
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/virtual-fields?${params}`);
      const data = await response.json();
      
      if (data.success) {
        fields = data.data;
      } else {
        toast.error(data.error || 'Erro ao carregar campos virtuais');
      }
    } catch (error) {
      console.error('Erro ao carregar campos:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      loading = false;
    }
  }

  // Carregar templates
  async function loadTemplates() {
    try {
      const response = await fetch('/api/virtual-fields/templates');
      const data = await response.json();
      
      if (data.success) {
        templates = data.data;
        categories = data.categories;
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  }

  // Criar novo campo
  function createField() {
    formData = {
      name: '',
      display_name: '',
      description: '',
      formula: '',
      dependencies: [],
      ai_enabled: false,
      ai_prompt: '',
      entity_type: filters.entity_type || 'products',
      field_type: 'text',
      format_options: {},
      validation_rules: {},
      is_active: true,
      sort_order: 0
    };
    formErrors = {};
    selectedField = null;
    showCreateModal = true;
  }

  // Editar campo existente
  function editField(field: VirtualField) {
    formData = {
      name: field.name,
      display_name: field.display_name,
      description: field.description || '',
      formula: field.formula,
      dependencies: [...field.dependencies],
      ai_enabled: field.ai_enabled,
      ai_prompt: field.ai_prompt || '',
      entity_type: field.entity_type,
      field_type: field.field_type,
      format_options: { ...field.format_options },
      validation_rules: { ...field.validation_rules },
      is_active: field.is_active,
      sort_order: field.sort_order
    };
    formErrors = {};
    selectedField = field;
    showEditModal = true;
  }

  // Confirmar exclusão
  function confirmDelete(field: VirtualField) {
    selectedField = field;
    showDeleteModal = true;
  }

  // Salvar campo (criar ou editar)
  async function saveField() {
    if (!validateForm()) return;
    
    saving = true;
    try {
      const url = selectedField ? `/api/virtual-fields/${selectedField.id}` : '/api/virtual-fields';
      const method = selectedField ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || 'Campo salvo com sucesso');
        showCreateModal = false;
        showEditModal = false;
        await loadFields();
      } else {
        toast.error(data.error || 'Erro ao salvar campo');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      saving = false;
    }
  }

  // Deletar campo
  async function deleteField() {
    if (!selectedField) return;
    
    saving = true;
    try {
      const response = await fetch(`/api/virtual-fields/${selectedField.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campo deletado com sucesso');
        showDeleteModal = false;
        await loadFields();
      } else {
        toast.error(data.error || 'Erro ao deletar campo');
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      saving = false;
    }
  }

  // Validar formulário
  function validateForm(): boolean {
    formErrors = {};
    
    if (!formData.name.trim()) {
      formErrors.name = 'Nome é obrigatório';
    }
    
    if (!formData.display_name.trim()) {
      formErrors.display_name = 'Nome de exibição é obrigatório';
    }
    
    if (!formData.formula.trim()) {
      formErrors.formula = 'Fórmula é obrigatória';
    }
    
    if (formData.dependencies.length === 0) {
      formErrors.dependencies = 'Pelo menos uma dependência é obrigatória';
    }
    
    return Object.keys(formErrors).length === 0;
  }

  // Aplicar template
  function applyTemplate(template: FormulaTemplate) {
    formData.formula = template.formula_template;
    formData.dependencies = [...template.required_fields];
    formData.description = template.description || formData.description;
    
    if (!formData.name) {
      formData.name = template.name;
    }
    
    if (!formData.display_name) {
      formData.display_name = template.display_name;
    }
    
    toast.success('Template aplicado com sucesso');
    showTemplatesModal = false;
  }

  // Adicionar dependência
  function addDependency() {
    if (newDependency.trim() && !formData.dependencies.includes(newDependency.trim())) {
      formData.dependencies = [...formData.dependencies, newDependency.trim()];
      newDependency = '';
    }
  }

  // Remover dependência
  function removeDependency(index: number) {
    formData.dependencies = formData.dependencies.filter((_, i) => i !== index);
  }

  // Testar fórmula
  async function testFormula() {
    if (!formData.formula.trim()) {
      toast.error('Digite uma fórmula primeiro');
      return;
    }
    
    testLoading = true;
    try {
      // Dados mock para teste
      const testData = {
        price: 100,
        cost: 60,
        quantity: 50,
        rating_average: 4.5,
        rating_count: 25,
        view_count: 1000,
        sales_count: 10
      };
      
      const response = await fetch('/api/virtual-fields/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_name: 'test',
          entity_data: testData
        })
      });
      
      const result = await response.json();
      testResult = result;
      
      if (result.success) {
        toast.success('Fórmula testada com sucesso');
      } else {
        toast.error('Erro no teste: ' + result.error);
      }
    } catch (error) {
      console.error('Erro no teste:', error);
      toast.error('Erro ao testar fórmula');
    } finally {
      testLoading = false;
    }
  }

  // Atualizar format_options quando field_type muda
  $effect(() => {
    if (formData.field_type && !Object.keys(formData.format_options).length) {
      formData.format_options = { ...DEFAULT_FORMAT_OPTIONS[formData.field_type] };
    }
  });
</script>

<!-- Header da página -->
<div class="mb-8">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Campos Virtuais</h1>
      <p class="text-gray-600 mt-1">Gerencie campos calculados dinamicamente</p>
    </div>
    <div class="flex items-center gap-3">
      <button
        onclick={() => showTemplatesModal = true}
        class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
      >
        <ModernIcon name="Template" size="sm" />
        Templates
      </button>
      <button
        onclick={createField}
        class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2"
      >
        <ModernIcon name="Plus" size="sm" />
        Novo Campo
      </button>
    </div>
  </div>
</div>

<!-- Filtros -->
<div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
  <h3 class="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
  
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <!-- Tipo de Entidade -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Entidade</label>
      <select
        bind:value={filters.entity_type}
        onchange={loadFields}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
      >
        <option value="">Todos</option>
        {#each Object.entries(ENTITY_TYPE_LABELS) as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>
    </div>

    <!-- Tipo de Campo -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Campo</label>
      <select
        bind:value={filters.field_type}
        onchange={loadFields}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
      >
        <option value="">Todos</option>
        {#each Object.entries(FIELD_TYPE_LABELS) as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>
    </div>

    <!-- IA Habilitada -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">IA Habilitada</label>
      <select
        bind:value={filters.ai_enabled}
        onchange={loadFields}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
      >
        <option value={undefined}>Todos</option>
        <option value={true}>Sim</option>
        <option value={false}>Não</option>
      </select>
    </div>

    <!-- Status -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
      <select
        bind:value={filters.is_active}
        onchange={loadFields}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
      >
        <option value={undefined}>Todos</option>
        <option value={true}>Ativo</option>
        <option value={false}>Inativo</option>
      </select>
    </div>
  </div>
</div>

<!-- Lista de Campos -->
<div class="bg-white rounded-lg border border-gray-200">
  {#if loading}
    <div class="p-8 text-center">
      <div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-gray-600">Carregando campos...</p>
    </div>
  {:else if fields.length === 0}
    <div class="p-8 text-center">
      <ModernIcon name="Database" size="lg" class="text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum campo encontrado</h3>
      <p class="text-gray-600 mb-4">Crie seu primeiro campo virtual ou ajuste os filtros</p>
      <button
        onclick={createField}
        class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors"
      >
        Criar Primeiro Campo
      </button>
    </div>
  {:else}
    <!-- Cabeçalho da tabela -->
    <div class="p-6 border-b border-gray-200">
      <div class="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
        <div class="col-span-3">Campo</div>
        <div class="col-span-2">Tipo</div>
        <div class="col-span-2">Entidade</div>
        <div class="col-span-1">IA</div>
        <div class="col-span-2">Dependências</div>
        <div class="col-span-1">Status</div>
        <div class="col-span-1">Ações</div>
      </div>
    </div>

    <!-- Linhas da tabela -->
    <div class="divide-y divide-gray-200">
      {#each fields as field}
        <div class="p-6 hover:bg-gray-50 transition-colors">
          <div class="grid grid-cols-12 gap-4 items-center">
            <!-- Campo -->
            <div class="col-span-3">
              <div class="font-medium text-gray-900">{field.display_name}</div>
              <div class="text-sm text-gray-500 font-mono">{field.name}</div>
              {#if field.description}
                <div class="text-sm text-gray-600 mt-1">{field.description}</div>
              {/if}
            </div>

            <!-- Tipo -->
            <div class="col-span-2">
              <span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {FIELD_TYPE_LABELS[field.field_type]}
              </span>
            </div>

            <!-- Entidade -->
            <div class="col-span-2">
              <span class="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                {ENTITY_TYPE_LABELS[field.entity_type]}
              </span>
            </div>

            <!-- IA -->
            <div class="col-span-1">
              {#if field.ai_enabled}
                <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  Sim
                </span>
              {:else}
                <span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  Não
                </span>
              {/if}
            </div>

            <!-- Dependências -->
            <div class="col-span-2">
              <div class="flex flex-wrap gap-1">
                {#each field.dependencies.slice(0, 3) as dep}
                  <span class="px-2 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded">
                    {dep}
                  </span>
                {/each}
                {#if field.dependencies.length > 3}
                  <span class="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                    +{field.dependencies.length - 3}
                  </span>
                {/if}
              </div>
            </div>

            <!-- Status -->
            <div class="col-span-1">
              {#if field.is_active}
                <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  Ativo
                </span>
              {:else}
                <span class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                  Inativo
                </span>
              {/if}
            </div>

            <!-- Ações -->
            <div class="col-span-1">
              <div class="flex items-center gap-2">
                <button
                  onclick={() => editField(field)}
                  class="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Editar"
                >
                  <ModernIcon name="Edit" size="sm" />
                </button>
                <button
                  onclick={() => confirmDelete(field)}
                  class="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Deletar"
                >
                  <ModernIcon name="Trash" size="sm" />
                </button>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal de Criação/Edição -->
{#if showCreateModal || showEditModal}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">
          {selectedField ? 'Editar Campo Virtual' : 'Criar Campo Virtual'}
        </h3>
        <button
          onclick={() => { showCreateModal = false; showEditModal = false; }}
          class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ModernIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Form Content -->
      <div class="p-6 space-y-6">
        <!-- Informações Básicas -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Nome -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Nome do Campo *
            </label>
            <input
              type="text"
              bind:value={formData.name}
              placeholder="ex: profit_margin"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] {formErrors.name ? 'border-red-300' : ''}"
            />
            {#if formErrors.name}
              <p class="text-red-600 text-sm mt-1">{formErrors.name}</p>
            {/if}
          </div>

          <!-- Nome de Exibição -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Nome de Exibição *
            </label>
            <input
              type="text"
              bind:value={formData.display_name}
              placeholder="ex: Margem de Lucro"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] {formErrors.display_name ? 'border-red-300' : ''}"
            />
            {#if formErrors.display_name}
              <p class="text-red-600 text-sm mt-1">{formErrors.display_name}</p>
            {/if}
          </div>
        </div>

        <!-- Descrição -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
          <textarea
            bind:value={formData.description}
            placeholder="Descreva o que este campo calcula..."
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
          ></textarea>
        </div>

        <!-- Configurações -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Tipo de Entidade -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Entidade</label>
            <select
              bind:value={formData.entity_type}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
            >
              {#each Object.entries(ENTITY_TYPE_LABELS) as [value, label]}
                <option {value}>{label}</option>
              {/each}
            </select>
          </div>

          <!-- Tipo de Campo -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Campo</label>
            <select
              bind:value={formData.field_type}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
            >
              {#each Object.entries(FIELD_TYPE_LABELS) as [value, label]}
                <option {value}>{label}</option>
              {/each}
            </select>
          </div>

          <!-- Ordem -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Ordem de Exibição</label>
            <input
              type="number"
              bind:value={formData.sort_order}
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
            />
          </div>
        </div>

        <!-- Fórmula -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700">Fórmula *</label>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={() => showTemplatesModal = true}
                class="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Templates
              </button>
              <button
                type="button"
                onclick={testFormula}
                disabled={testLoading}
                class="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50"
              >
                {#if testLoading}
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Testando...
                  </div>
                {:else}
                  Testar
                {/if}
              </button>
            </div>
          </div>
          <textarea
            bind:value={formData.formula}
            placeholder="ex: (price - cost) / price * 100"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] font-mono text-sm {formErrors.formula ? 'border-red-300' : ''}"
          ></textarea>
          {#if formErrors.formula}
            <p class="text-red-600 text-sm mt-1">{formErrors.formula}</p>
          {/if}
          
          <!-- Resultado do teste -->
          {#if testResult}
            <div class="mt-3 p-3 bg-gray-50 rounded-lg">
              <div class="text-sm font-medium text-gray-700 mb-1">Resultado do Teste:</div>
              {#if testResult.success}
                <div class="text-green-600 font-mono">{JSON.stringify(testResult.data, null, 2)}</div>
              {:else}
                <div class="text-red-600">{testResult.error}</div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Dependências -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Dependências * <span class="text-gray-500">(campos necessários para o cálculo)</span>
          </label>
          
          <!-- Adicionar nova dependência -->
          <div class="flex items-center gap-2 mb-3">
            <input
              type="text"
              bind:value={newDependency}
              placeholder="ex: price, cost, quantity"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
              onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDependency(); } }}
            />
            <button
              type="button"
              onclick={addDependency}
              class="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Adicionar
            </button>
          </div>

          <!-- Lista de dependências -->
          <div class="flex flex-wrap gap-2">
            {#each formData.dependencies as dep, index}
              <span class="inline-flex items-center gap-2 px-3 py-1 bg-[#00BFB3]/10 text-[#00BFB3] rounded-lg">
                <span class="font-mono text-sm">{dep}</span>
                <button
                  type="button"
                  onclick={() => removeDependency(index)}
                  class="text-[#00BFB3] hover:text-red-600 transition-colors"
                >
                  <ModernIcon name="X" size="xs" />
                </button>
              </span>
            {/each}
          </div>
          
          {#if formErrors.dependencies}
            <p class="text-red-600 text-sm mt-1">{formErrors.dependencies}</p>
          {/if}
        </div>

        <!-- Configurações de IA -->
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="ai_enabled"
              bind:checked={formData.ai_enabled}
              class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
            />
            <label for="ai_enabled" class="text-sm font-medium text-gray-700">
              Habilitar sugestões de IA
            </label>
          </div>

          {#if formData.ai_enabled}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Prompt da IA
              </label>
              <textarea
                bind:value={formData.ai_prompt}
                placeholder="ex: Calcule a margem de lucro ideal para este produto considerando sua categoria e concorrência"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
              ></textarea>
            </div>
          {/if}
        </div>

        <!-- Status -->
        <div class="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            bind:checked={formData.is_active}
            class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
          />
          <label for="is_active" class="text-sm font-medium text-gray-700">
            Campo ativo
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
        <button
          type="button"
          onclick={() => { showCreateModal = false; showEditModal = false; }}
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onclick={saveField}
          disabled={saving}
          class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {#if saving}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {/if}
          {selectedField ? 'Atualizar' : 'Criar'} Campo
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal de Templates -->
{#if showTemplatesModal}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Templates de Fórmulas</h3>
        <button
          onclick={() => showTemplatesModal = false}
          class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ModernIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Templates por categoria -->
      <div class="p-6">
        {#each categories as category}
          <div class="mb-6">
            <h4 class="text-md font-semibold text-gray-900 mb-3 capitalize">{category}</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each templates.filter(t => t.category === category) as template}
                <div class="border border-gray-200 rounded-lg p-4 hover:border-[#00BFB3] transition-colors">
                  <div class="flex items-start justify-between mb-2">
                    <h5 class="font-medium text-gray-900">{template.display_name}</h5>
                    <button
                      onclick={() => applyTemplate(template)}
                      class="px-3 py-1 text-sm bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                  
                  {#if template.description}
                    <p class="text-sm text-gray-600 mb-2">{template.description}</p>
                  {/if}
                  
                  <div class="bg-gray-50 rounded p-2 mb-2">
                    <code class="text-sm text-gray-800">{template.formula_template}</code>
                  </div>
                  
                  <div class="flex flex-wrap gap-1">
                    {#each template.required_fields as field}
                      <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded font-mono">
                        {field}
                      </span>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- Modal de Confirmação de Exclusão -->
{#if showDeleteModal && selectedField}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
      </div>

      <!-- Content -->
      <div class="p-6">
        <p class="text-gray-600 mb-4">
          Tem certeza que deseja deletar o campo virtual 
          <strong>{selectedField.display_name}</strong>?
        </p>
        <p class="text-sm text-red-600">
          Esta ação não pode ser desfeita e pode afetar cálculos existentes.
        </p>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
        <button
          type="button"
          onclick={() => showDeleteModal = false}
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onclick={deleteField}
          disabled={saving}
          class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {#if saving}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {/if}
          Deletar Campo
        </button>
      </div>
    </div>
  </div>
{/if} 