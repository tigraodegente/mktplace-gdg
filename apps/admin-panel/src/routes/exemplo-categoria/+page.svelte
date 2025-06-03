<script lang="ts">
	import TabsForm from '$lib/components/shared/TabsForm.svelte';
	import FormContainer from '$lib/components/shared/FormContainer.svelte';
	import FormField from '$lib/components/shared/FormField.svelte';
	import { onMount } from 'svelte';

	// Dados do formulário
	let formData = {
		name: '',
		slug: '',
		description: '',
		parent_id: '',
		meta_title: '',
		meta_description: '',
		is_active: true,
		featured: false,
		sort_order: 0,
		icon: '',
		banner_image: '',
		show_on_menu: true,
		commission_rate: '',
		tax_class: 'standard'
	};

	// Estados
	let loading = false;
	let saving = false;

	// Configuração das abas usando o sistema reutilizável
	const tabs = [
		{
			id: 'basic',
			name: 'Básico',
			icon: '📁',
			description: 'Informações essenciais'
		},
		{
			id: 'seo',
			name: 'SEO',
			icon: '🔍', 
			description: 'Otimização para buscas'
		},
		{
			id: 'config',
			name: 'Configurações',
			icon: '⚙️',
			description: 'Configurações avançadas'
		}
	];

	// Opções para selects
	const parentCategories = [
		{ value: '', label: 'Categoria Raiz' },
		{ value: '1', label: 'Eletrônicos' },
		{ value: '2', label: 'Roupas' },
		{ value: '3', label: 'Casa e Jardim' }
	];

	const taxClasses = [
		{ value: 'standard', label: 'Padrão' },
		{ value: 'reduced', label: 'Reduzida' },
		{ value: 'zero', label: 'Isento' }
	];

	// Funções
	async function handleSave(data: any) {
		saving = true;
		try {
			// Simular API call
			await new Promise(resolve => setTimeout(resolve, 2000));
			console.log('Categoria salva:', data);
			// Aqui você faria a chamada real para a API
		} catch (error) {
			console.error('Erro ao salvar categoria:', error);
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		// Voltar para listagem ou limpar formulário
		console.log('Cancelado');
	}

	function generateSlug() {
		if (formData.name) {
			formData.slug = formData.name
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.replace(/[^a-z0-9\s-]/g, '')
				.trim()
				.replace(/\s+/g, '-')
				.replace(/-+/g, '-');
		}
	}

	onMount(() => {
		// Carregar dados se editando
		loading = false;
	});
</script>

<TabsForm
	title="Nova Categoria"
	subtitle="Crie uma nova categoria para organizar seus produtos"
	{tabs}
	{formData}
	{loading}
	{saving}
	isEditing={false}
	requiredFields={['name', 'slug']}
	onSave={handleSave}
	onCancel={handleCancel}
	customSlot={true}
>
	<div slot="tab-content" let:activeTab let:formData>
		{#if activeTab === 'basic'}
			<!-- ABA BÁSICA -->
			<div class="space-y-8">
				<!-- Informações Principais -->
				<FormContainer 
					title="Informações Essenciais"
					subtitle="Dados fundamentais da categoria"
					icon="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					variant="primary"
					columns={2}
				>
					<FormField
						type="text"
						label="📁 Nome da Categoria"
						bind:value={formData.name}
						placeholder="Nome atrativo da categoria"
						required={true}
						helpText="Nome que será exibido na navegação"
						on:input={generateSlug}
					/>

					<FormField
						type="text"
						label="🔗 Slug (URL)"
						bind:value={formData.slug}
						placeholder="categoria-exemplo"
						required={true}
						helpText="URL amigável gerada automaticamente"
						readonly={true}
					/>

					<FormField
						type="select"
						label="📂 Categoria Pai"
						bind:value={formData.parent_id}
						options={parentCategories}
						placeholder="Selecione a categoria pai"
						helpText="Deixe vazio para categoria raiz"
						containerClass="md:col-span-2"
					/>

					<FormField
						type="textarea"
						label="📝 Descrição"
						bind:value={formData.description}
						placeholder="Descrição detalhada da categoria"
						rows={4}
						maxlength={500}
						characterCount={true}
						helpText="Descrição que aparece na página da categoria"
						containerClass="md:col-span-2"
					/>
				</FormContainer>

				<!-- Status e Visibilidade -->
				<FormContainer
					title="Status e Visibilidade"
					subtitle="Configure como a categoria será exibida"
					icon="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					variant="secondary"
					columns={3}
				>
					<FormField
						type="checkbox"
						bind:value={formData.is_active}
						placeholder="✅ Categoria Ativa"
						helpText="Categoria visível na loja"
					/>

					<FormField
						type="checkbox"
						bind:value={formData.featured}
						placeholder="⭐ Categoria Destaque"
						helpText="Aparece em destaque na home"
					/>

					<FormField
						type="checkbox"
						bind:value={formData.show_on_menu}
						placeholder="🧭 Mostrar no Menu"
						helpText="Exibir no menu de navegação"
					/>

					<FormField
						type="number"
						label="📊 Ordem de Exibição"
						bind:value={formData.sort_order}
						placeholder="0"
						min="0"
						helpText="Ordem na listagem (menor primeiro)"
					/>

					<FormField
						type="text"
						label="🎨 Ícone"
						bind:value={formData.icon}
						placeholder="📱"
						helpText="Emoji ou classe CSS do ícone"
					/>

					<FormField
						type="url"
						label="🖼️ Banner da Categoria"
						bind:value={formData.banner_image}
						placeholder="https://exemplo.com/banner.jpg"
						helpText="Imagem de destaque da categoria"
					/>
				</FormContainer>
			</div>

		{:else if activeTab === 'seo'}
			<!-- ABA SEO -->
			<div class="space-y-8">
				<FormContainer
					title="Otimização para Buscadores"
					subtitle="Configure SEO para melhor posicionamento"
					icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					variant="tertiary"
					columns={1}
				>
					<FormField
						type="text"
						label="📝 Meta Título"
						bind:value={formData.meta_title}
						placeholder="Título otimizado para Google (50-60 caracteres)"
						maxlength={60}
						characterCount={true}
						helpText="Título que aparece nos resultados de busca"
					/>

					<FormField
						type="textarea"
						label="📄 Meta Descrição"
						bind:value={formData.meta_description}
						placeholder="Descrição atrativa para aparecer no Google (140-160 caracteres)"
						maxlength={160}
						characterCount={true}
						rows={3}
						helpText="Descrição que aparece abaixo do título no Google"
					/>
				</FormContainer>

				<!-- Preview do Google -->
				<FormContainer
					title="Preview no Google"
					subtitle="Como sua categoria aparecerá nos resultados"
					icon="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					variant="quaternary"
					columns={1}
				>
					<div class="bg-white rounded-lg p-4 border border-[#00BFB3]/30">
						<div class="space-y-2">
							<div class="flex items-center gap-2 text-sm text-slate-600">
								<div class="w-4 h-4 bg-[#00BFB3] rounded-sm"></div>
								<span>www.sualoja.com.br › categoria › {formData.slug || 'categoria-exemplo'}</span>
							</div>
							<h3 class="text-xl text-[#00BFB3] hover:underline cursor-pointer">
								{formData.meta_title || formData.name || 'Nome da Categoria'}
							</h3>
							<p class="text-sm text-slate-700 leading-relaxed">
								{formData.meta_description || formData.description || 'Descrição da categoria que aparecerá nos resultados de busca do Google...'}
							</p>
						</div>
					</div>
				</FormContainer>
			</div>

		{:else if activeTab === 'config'}
			<!-- ABA CONFIGURAÇÕES -->
			<div class="space-y-8">
				<FormContainer
					title="Configurações Comerciais"
					subtitle="Configurações de comissão e impostos"
					icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
					variant="quinary"
					columns={2}
				>
					<FormField
						type="number"
						label="💰 Taxa de Comissão (%)"
						bind:value={formData.commission_rate}
						placeholder="5.0"
						min="0"
						max="100"
						step="0.1"
						suffix="%"
						helpText="Comissão aplicada aos produtos desta categoria"
					/>

					<FormField
						type="select"
						label="📊 Classe Tributária"
						bind:value={formData.tax_class}
						options={taxClasses}
						helpText="Categoria fiscal para cálculo de impostos"
					/>
				</FormContainer>

				<!-- Resumo de Configurações -->
				<FormContainer
					title="Resumo das Configurações"
					subtitle="Visualize as configurações aplicadas"
					variant="quaternary"
					columns={1}
				>
					<div class="bg-white rounded-lg p-4 border border-[#00BFB3]/30">
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="font-medium text-slate-700">Status:</span>
								<span class="ml-2 {formData.is_active ? 'text-green-600' : 'text-red-600'}">
									{formData.is_active ? '✅ Ativa' : '❌ Inativa'}
								</span>
							</div>
							<div>
								<span class="font-medium text-slate-700">Destaque:</span>
								<span class="ml-2 {formData.featured ? 'text-[#00BFB3]' : 'text-slate-500'}">
									{formData.featured ? '⭐ Sim' : '➖ Não'}
								</span>
							</div>
							<div>
								<span class="font-medium text-slate-700">No Menu:</span>
								<span class="ml-2 {formData.show_on_menu ? 'text-[#00BFB3]' : 'text-slate-500'}">
									{formData.show_on_menu ? '🧭 Sim' : '➖ Não'}
								</span>
							</div>
							<div>
								<span class="font-medium text-slate-700">Comissão:</span>
								<span class="ml-2 text-slate-600">
									{formData.commission_rate ? `${formData.commission_rate}%` : 'Não definida'}
								</span>
							</div>
						</div>
					</div>
				</FormContainer>
			</div>
		{/if}
	</div>
</TabsForm> 