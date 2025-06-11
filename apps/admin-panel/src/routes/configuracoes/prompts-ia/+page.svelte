<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	// Estado dos prompts
	let prompts: any[] = $state([]);
	let loading = $state(true);
	let selectedPrompt: any = $state(null);
	let showEditor = $state(false);
	let saving = $state(false);
	
	// Filtros
	let categoryFilter = $state('all');
	let nameFilter = $state('all');
	
	// Categorias disponíveis
	const categories = [
		{ value: 'all', label: 'Todas as Categorias' },
		{ value: 'general', label: 'Geral' },
		{ value: 'baby', label: 'Produtos Infantis' },
		{ value: 'electronics', label: 'Eletrônicos' },
		{ value: 'home', label: 'Casa e Decoração' },
		{ value: 'fashion', label: 'Moda e Vestuário' }
	];
	
	// Tipos de prompt
	const promptTypes = [
		{ value: 'all', label: 'Todos os Tipos' },
		{ value: 'complete_enrichment', label: 'Enriquecimento Completo' },
		{ value: 'attributes', label: 'Atributos para Filtros' },
		{ value: 'specifications', label: 'Especificações Técnicas' },
		{ value: 'description', label: 'Descrição do Produto' },
		{ value: 'tags', label: 'Tags SEO' }
	];
	
	// Dados do formulário de edição
	let formData = $state({
		id: '',
		name: '',
		category: 'general',
		title: '',
		description: '',
		prompt_template: '',
		variables: [],
		expected_output: '',
		is_active: true
	});
	
	onMount(() => {
		loadPrompts();
	});
	
	async function loadPrompts() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (categoryFilter !== 'all') params.append('category', categoryFilter);
			if (nameFilter !== 'all') params.append('name', nameFilter);
			
			const response = await fetch(`/api/ai-prompts?${params}`);
			const result = await response.json();
			
			if (result.success) {
				prompts = result.data;
			} else {
				toast.error('Erro ao carregar prompts');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao carregar prompts');
		} finally {
			loading = false;
		}
	}
	
	function editPrompt(prompt: any) {
		formData = {
			id: prompt.id,
			name: prompt.name,
			category: prompt.category,
			title: prompt.title,
			description: prompt.description || '',
			prompt_template: prompt.prompt_template,
			variables: Array.isArray(prompt.variables) ? prompt.variables : JSON.parse(prompt.variables || '[]'),
			expected_output: prompt.expected_output || '',
			is_active: prompt.is_active
		};
		selectedPrompt = prompt;
		showEditor = true;
	}
	
	function createNewPrompt() {
		formData = {
			id: '',
			name: '',
			category: 'general',
			title: '',
			description: '',
			prompt_template: '',
			variables: [],
			expected_output: '',
			is_active: true
		};
		selectedPrompt = null;
		showEditor = true;
	}
	
	async function savePrompt() {
		if (!formData.name || !formData.title || !formData.prompt_template) {
			toast.error('Preencha todos os campos obrigatórios');
			return;
		}
		
		saving = true;
		try {
			const method = formData.id ? 'PUT' : 'POST';
			const response = await fetch('/api/ai-prompts', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});
			
			const result = await response.json();
			
			if (result.success) {
				toast.success(result.message || 'Prompt salvo com sucesso!');
				closeEditor();
				loadPrompts();
			} else {
				toast.error(result.error || 'Erro ao salvar prompt');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao salvar prompt');
		} finally {
			saving = false;
		}
	}
	
	async function togglePrompt(prompt: any) {
		try {
			const response = await fetch('/api/ai-prompts', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...prompt,
					is_active: !prompt.is_active
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				toast.success(`Prompt ${prompt.is_active ? 'desativado' : 'ativado'} com sucesso!`);
				loadPrompts();
			} else {
				toast.error('Erro ao alterar status do prompt');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao alterar status do prompt');
		}
	}
	
	async function testPrompt() {
		if (!formData.prompt_template) {
			toast.error('Adicione um template do prompt para testar');
			return;
		}
		
		// Simular teste com dados fictícios
		const testData = {
			name: "Produto Teste",
			price: 99.90,
			category: "Categoria Teste",
			description: "Descrição de teste"
		};
		
		// Substituir variáveis no template
		let testPrompt = formData.prompt_template;
		for (const [key, value] of Object.entries(testData)) {
			testPrompt = testPrompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
		}
		
		// Mostrar prompt processado
		alert(`Prompt processado:\n\n${testPrompt.substring(0, 500)}...`);
	}
	
	function closeEditor() {
		showEditor = false;
		selectedPrompt = null;
		formData = {
			id: '',
			name: '',
			category: 'general',
			title: '',
			description: '',
			prompt_template: '',
			variables: [],
			expected_output: '',
			is_active: true
		};
	}
	
	function addVariable() {
		formData.variables = [...formData.variables, ''];
	}
	
	function removeVariable(index: number) {
		formData.variables = formData.variables.filter((_, i) => i !== index);
	}
	
	// Prompts filtrados
	let filteredPrompts = $derived(() => {
		return prompts.filter(prompt => {
			const matchesCategory = categoryFilter === 'all' || prompt.category === categoryFilter;
			const matchesName = nameFilter === 'all' || prompt.name === nameFilter;
			return matchesCategory && matchesName;
		});
	});
	
	// Estatísticas
	let stats = $derived(() => {
		const total = prompts.length;
		const active = prompts.filter(p => p.is_active).length;
		const byCategory = prompts.reduce((acc, p) => {
			acc[p.category] = (acc[p.category] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);
		
		return { total, active, inactive: total - active, byCategory };
	});
</script>

<svelte:head>
	<title>Prompts de IA - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b">
		<div class="max-w-7xl mx-auto px-6 py-6">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
						<ModernIcon name="robot" size="lg" />
						Configuração de Prompts IA
					</h1>
					<p class="text-gray-600 mt-1">
						Gerencie os prompts usados pela IA para enriquecer produtos
					</p>
				</div>
				
				<button
					onclick={createNewPrompt}
					class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
				>
					<ModernIcon name="Plus" size="sm" />
					Novo Prompt
				</button>
			</div>
		</div>
	</div>
	
	<!-- Estatísticas -->
	<div class="max-w-7xl mx-auto px-6 py-6">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center">
						<ModernIcon name="robot" size="md" color="#00BFB3" />
					</div>
					<div>
						<p class="text-sm text-gray-600">Total de Prompts</p>
						<p class="text-2xl font-bold text-gray-900">{stats.total}</p>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
						<ModernIcon name="Check" size="md" color="green" />
					</div>
					<div>
						<p class="text-sm text-gray-600">Prompts Ativos</p>
						<p class="text-2xl font-bold text-gray-900">{stats.active}</p>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
						<ModernIcon name="X" size="md" color="red" />
					</div>
					<div>
						<p class="text-sm text-gray-600">Prompts Inativos</p>
						<p class="text-2xl font-bold text-gray-900">{stats.inactive}</p>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
						<ModernIcon name="Settings" size="md" color="purple" />
					</div>
					<div>
						<p class="text-sm text-gray-600">Categorias</p>
						<p class="text-2xl font-bold text-gray-900">{Object.keys(stats.byCategory).length}</p>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Filtros -->
		<div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
					<select
						bind:value={categoryFilter}
						onchange={loadPrompts}
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
					>
						{#each categories as category}
							<option value={category.value}>{category.label}</option>
						{/each}
					</select>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
					<select
						bind:value={nameFilter}
						onchange={loadPrompts}
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
					>
						{#each promptTypes as type}
							<option value={type.value}>{type.label}</option>
						{/each}
					</select>
				</div>
				
				<div class="flex items-end">
					<button
						onclick={loadPrompts}
						class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
					>
						<ModernIcon name="refresh" size="sm" />
						Atualizar
					</button>
				</div>
			</div>
		</div>
		
		<!-- Lista de Prompts -->
		<div class="bg-white rounded-lg border border-gray-200">
			{#if loading}
				<div class="p-12 text-center">
					<div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p class="text-gray-600">Carregando prompts...</p>
				</div>
			{:else if filteredPrompts.length === 0}
				<div class="p-12 text-center">
					<ModernIcon name="robot" size="xl" color="gray" />
					<h3 class="text-lg font-semibold text-gray-900 mt-4">Nenhum prompt encontrado</h3>
					<p class="text-gray-600 mt-2">Crie seu primeiro prompt de IA</p>
					<button
						onclick={createNewPrompt}
						class="mt-4 px-6 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors"
					>
						Criar Prompt
					</button>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-gray-50 border-b border-gray-200">
							<tr>
								<th class="text-left px-6 py-4 text-sm font-medium text-gray-700">Prompt</th>
								<th class="text-left px-6 py-4 text-sm font-medium text-gray-700">Categoria</th>
								<th class="text-left px-6 py-4 text-sm font-medium text-gray-700">Tipo</th>
								<th class="text-left px-6 py-4 text-sm font-medium text-gray-700">Status</th>
								<th class="text-left px-6 py-4 text-sm font-medium text-gray-700">Versão</th>
								<th class="text-left px-6 py-4 text-sm font-medium text-gray-700">Ações</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each filteredPrompts as prompt}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4">
										<div>
											<h4 class="font-medium text-gray-900">{prompt.title}</h4>
											<p class="text-sm text-gray-600">{prompt.description || 'Sem descrição'}</p>
										</div>
									</td>
									<td class="px-6 py-4">
										<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#00BFB3]/10 text-[#00BFB3]">
											{categories.find(c => c.value === prompt.category)?.label || prompt.category}
										</span>
									</td>
									<td class="px-6 py-4">
										<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
											{promptTypes.find(t => t.value === prompt.name)?.label || prompt.name}
										</span>
									</td>
									<td class="px-6 py-4">
										<button
											onclick={() => togglePrompt(prompt)}
											class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors {prompt.is_active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}"
										>
											{prompt.is_active ? '✅ Ativo' : '❌ Inativo'}
										</button>
									</td>
									<td class="px-6 py-4 text-sm text-gray-600">
										v{prompt.version}
									</td>
									<td class="px-6 py-4">
										<div class="flex items-center gap-2">
											<button
												onclick={() => editPrompt(prompt)}
												class="p-2 text-gray-600 hover:text-[#00BFB3] hover:bg-[#00BFB3]/10 rounded-lg transition-colors"
												title="Editar prompt"
											>
												<ModernIcon name="edit" size="sm" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Editor Modal -->
{#if showEditor}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
			<div class="sticky top-0 bg-white border-b border-gray-200 p-6">
				<div class="flex items-center justify-between">
					<h3 class="text-xl font-semibold text-gray-900">
						{selectedPrompt ? 'Editar Prompt' : 'Novo Prompt'}
					</h3>
					<button
						onclick={closeEditor}
						class="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
					>
						<ModernIcon name="X" size="md" />
					</button>
				</div>
			</div>
			
			<div class="p-6 space-y-6">
				<!-- Informações Básicas -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Nome Interno <span class="text-red-500">*</span>
						</label>
						<input
							type="text"
							bind:value={formData.name}
							placeholder="ex: attributes, specifications"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
						/>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
						<select
							bind:value={formData.category}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
						>
							{#each categories.slice(1) as category}
								<option value={category.value}>{category.label}</option>
							{/each}
						</select>
					</div>
					
					<div class="md:col-span-2">
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Título <span class="text-red-500">*</span>
						</label>
						<input
							type="text"
							bind:value={formData.title}
							placeholder="Ex: Atributos para Filtros - Produtos Infantis"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
						/>
					</div>
					
					<div class="md:col-span-2">
						<label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
						<textarea
							bind:value={formData.description}
							rows="2"
							placeholder="Descrição do que este prompt faz..."
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
						></textarea>
					</div>
				</div>
				
				<!-- Template do Prompt -->
				<div>
					<div class="flex items-center justify-between mb-2">
						<label class="block text-sm font-medium text-gray-700">
							Template do Prompt <span class="text-red-500">*</span>
						</label>
						<button
							onclick={testPrompt}
							class="px-3 py-1 bg-[#00BFB3] hover:bg-[#00A89D] text-white text-sm rounded-lg transition-colors"
						>
							🧪 Testar
						</button>
					</div>
					<textarea
						bind:value={formData.prompt_template}
						rows="15"
						placeholder="Escreva o prompt aqui. Use {{variavel}} para inserir variáveis..."
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] font-mono text-sm"
					></textarea>
					<p class="text-xs text-gray-500 mt-1">
						Use variáveis como {{name}}, {{price}}, {{category}}, {{description}}
					</p>
				</div>
				
				<!-- Variáveis -->
				<div>
					<div class="flex items-center justify-between mb-2">
						<label class="block text-sm font-medium text-gray-700">Variáveis Disponíveis</label>
						<button
							onclick={addVariable}
							class="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
						>
							+ Adicionar
						</button>
					</div>
					
					<div class="space-y-2">
						{#each formData.variables as variable, index}
							<div class="flex items-center gap-2">
								<input
									type="text"
									bind:value={formData.variables[index]}
									placeholder="nome_da_variavel"
									class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
								/>
								<button
									onclick={() => removeVariable(index)}
									class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
								>
									<ModernIcon name="delete" size="sm" />
								</button>
							</div>
						{/each}
						
						{#if formData.variables.length === 0}
							<p class="text-sm text-gray-500 italic">Nenhuma variável adicionada</p>
						{/if}
					</div>
				</div>
				
				<!-- Formato Esperado -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Formato Esperado da Resposta</label>
					<textarea
						bind:value={formData.expected_output}
						rows="3"
						placeholder="Descreva o formato esperado da resposta da IA..."
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
					></textarea>
				</div>
				
				<!-- Status -->
				<div class="flex items-center">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.is_active}
							class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
						/>
						<span class="text-sm font-medium text-gray-900">Prompt ativo</span>
					</label>
				</div>
			</div>
			
			<!-- Footer -->
			<div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
				<div class="flex items-center justify-end gap-4">
					<button
						onclick={closeEditor}
						class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Cancelar
					</button>
					<button
						onclick={savePrompt}
						disabled={saving}
						class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
					>
						{#if saving}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{/if}
						{saving ? 'Salvando...' : 'Salvar Prompt'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if} 