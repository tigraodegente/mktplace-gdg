<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';
	
	let { formData = $bindable() } = $props();
	
	// Estados para seleções
	let categories = $state<Array<{id: string, name: string}>>([]);
	let brands = $state<Array<{id: string, name: string}>>([]);
	let sellers = $state<Array<{id: string, company_name: string}>>([]);
	let loading = $state(true);
	
	// Estados de loading para IA
	let aiLoading = $state({
		name: false,
		description: false,
		shortDescription: false,
		sku: false,
		tags: false
	});
	
	// Função de enriquecimento com IA
	async function enrichField(field: string) {
		aiLoading[field] = true;
		
		try {
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					field,
					currentData: formData,
					category: categories.find(c => c.id === formData.category_id)?.name
				})
			});
			
			if (!response.ok) throw new Error('Erro na resposta da API');
			
			const result = await response.json();
			
			if (result.success) {
				// Aplicar o resultado ao campo específico
				switch (field) {
					case 'name':
						formData.name = result.data;
						formData.slug = generateSlug(result.data);
						break;
					case 'description':
						formData.description = result.data;
						break;
					case 'short_description':
						formData.short_description = result.data;
						break;
					case 'sku':
						formData.sku = result.data;
						break;
					case 'tags':
						formData.tags = result.data;
						formData.tags_input = result.data.join(', ');
						break;
				}
				
				toast.success(`${field === 'short_description' ? 'Descrição curta' : field.charAt(0).toUpperCase() + field.slice(1)} enriquecido com IA!`);
			} else {
				toast.error('Erro ao enriquecer com IA');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao conectar com o serviço de IA');
		} finally {
			aiLoading[field] = false;
		}
	}
	
	// Gerar slug automaticamente
	function generateSlug(name: string) {
		return name
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}
	
	// Atualizar slug quando o nome mudar
	$effect(() => {
		if (formData.name && !formData.slug) {
			formData.slug = generateSlug(formData.name);
		}
	});
	
	// Carregar dados de seleção
	async function loadSelectData() {
		loading = true;
		try {
			// Carregar categorias
			const catResponse = await fetch('/api/categories');
			if (catResponse.ok) {
				const catData = await catResponse.json();
				categories = catData.data || [];
			}
			
			// Carregar marcas
			const brandResponse = await fetch('/api/brands');
			if (brandResponse.ok) {
				const brandData = await brandResponse.json();
				brands = brandData.data || [];
			}
			
			// Carregar vendedores
			const sellerResponse = await fetch('/api/sellers');
			if (sellerResponse.ok) {
				const sellerData = await sellerResponse.json();
				sellers = sellerData.data || [];
			}
		} catch (error) {
			console.error('Erro ao carregar dados:', error);
		} finally {
			loading = false;
		}
	}
	
	// Lifecycle
	import { onMount } from 'svelte';
	onMount(() => {
		loadSelectData();
	});
</script>

<div class="space-y-8">
	<!-- INFORMAÇÕES BÁSICAS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="Package" size={20} color="#00BFB3" />
			Informações do Produto
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Nome do Produto -->
			<div class="md:col-span-2">
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Nome do Produto *
				</label>
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={formData.name}
						required
						class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="Ex: Cesto Organizador para Brinquedos"
					/>
					<button
						type="button"
						onclick={() => enrichField('name')}
						disabled={aiLoading.name || !formData.name}
						class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
						title="Melhorar com IA"
					>
						{#if aiLoading.name}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size={20} />
						{/if}
					</button>
				</div>
			</div>
			
			<!-- Slug -->
			<div class="md:col-span-2">
				<label class="block text-sm font-medium text-gray-700 mb-2">
					URL Amigável (Slug) *
				</label>
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={formData.slug}
						required
						class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="cesto-organizador-brinquedos"
					/>
					<button
						type="button"
						onclick={() => formData.slug = generateSlug(formData.name || '')}
						class="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
						title="Gerar automaticamente"
					>
						<ModernIcon name="refresh" size={20} />
					</button>
				</div>
			</div>
			
			<!-- SKU -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					SKU (Código do Produto) *
				</label>
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={formData.sku}
						required
						class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="PROD-001"
					/>
					<button
						type="button"
						onclick={() => enrichField('sku')}
						disabled={aiLoading.sku || !formData.name}
						class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
						title="Gerar com IA"
					>
						{#if aiLoading.sku}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size={20} />
						{/if}
					</button>
				</div>
			</div>
			
			<!-- Código de Barras -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Código de Barras (EAN/UPC)
				</label>
				<input
					type="text"
					bind:value={formData.barcode}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="7891234567890"
				/>
			</div>
			
			<!-- Modelo -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Modelo
				</label>
				<input
					type="text"
					bind:value={formData.model}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="MX-2024"
				/>
			</div>
			
			<!-- Condição -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Condição do Produto
				</label>
				<select
					bind:value={formData.condition}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				>
					<option value="new">Novo</option>
					<option value="used">Usado</option>
					<option value="refurbished">Recondicionado</option>
				</select>
			</div>
		</div>
	</div>
	
	<!-- DESCRIÇÕES -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="description" size={20} color="#00BFB3" />
			Descrições
		</h4>
		
		<div class="space-y-6">
			<!-- Descrição Curta -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Descrição Curta
					<span class="text-xs text-gray-500 ml-2">Aparece nos cards de produto</span>
				</label>
				<div class="flex gap-2">
					<textarea
						bind:value={formData.short_description}
						rows="3"
						class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="Uma breve descrição do produto..."
					></textarea>
					<button
						type="button"
						onclick={() => enrichField('short_description')}
						disabled={aiLoading.shortDescription || !formData.name}
						class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
						title="Gerar com IA"
					>
						{#if aiLoading.shortDescription}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size={20} />
						{/if}
					</button>
				</div>
			</div>
			
			<!-- Descrição Completa -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Descrição Completa *
				</label>
				<div class="flex gap-2">
					<textarea
						bind:value={formData.description}
						rows="6"
						required
						class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="Descrição detalhada do produto..."
					></textarea>
					<button
						type="button"
						onclick={() => enrichField('description')}
						disabled={aiLoading.description || !formData.name}
						class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
						title="Gerar com IA"
					>
						{#if aiLoading.description}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size={20} />
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
	
	<!-- CATEGORIZAÇÃO -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="category" size={20} color="#00BFB3" />
			Categorização
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Categoria -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Categoria *
				</label>
				<select
					bind:value={formData.category_id}
					required
					disabled={loading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors disabled:bg-gray-100"
				>
					<option value="">Selecione uma categoria</option>
					{#each categories as category}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
			</div>
			
			<!-- Marca -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Marca
				</label>
				<select
					bind:value={formData.brand_id}
					disabled={loading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors disabled:bg-gray-100"
				>
					<option value="">Sem marca</option>
					{#each brands as brand}
						<option value={brand.id}>{brand.name}</option>
					{/each}
				</select>
			</div>
			
			<!-- Vendedor -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Vendedor *
				</label>
				<select
					bind:value={formData.seller_id}
					required
					disabled={loading}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors disabled:bg-gray-100"
				>
					<option value="">Selecione um vendedor</option>
					{#each sellers as seller}
						<option value={seller.id}>{seller.company_name}</option>
					{/each}
				</select>
			</div>
		</div>
		
		<!-- Tags -->
		<div class="mt-6">
			<label class="block text-sm font-medium text-gray-700 mb-2">
				Tags
				<span class="text-xs text-gray-500 ml-2">Separe por vírgula</span>
			</label>
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={formData.tags_input}
					onblur={() => formData.tags = formData.tags_input?.split(',').map((t: string) => t.trim()).filter(Boolean) || []}
					class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="decoração, organização, infantil"
				/>
				<button
					type="button"
					onclick={() => enrichField('tags')}
					disabled={aiLoading.tags || !formData.name}
					class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
					title="Gerar tags com IA"
				>
					{#if aiLoading.tags}
						<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
					{:else}
						<ModernIcon name="robot" size={20} />
					{/if}
				</button>
			</div>
		</div>
	</div>
	
	<!-- PREÇOS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="price" size={20} color="#00BFB3" />
			Preços e Valores
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Preço de Venda -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Preço de Venda *
				</label>
				<div class="relative">
					<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
					<input
						type="number"
						bind:value={formData.price}
						required
						step="0.01"
						min="0"
						class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
					/>
				</div>
			</div>
			
			<!-- Preço Original -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Preço Original
					<span class="text-xs text-gray-500 ml-2">Para mostrar desconto</span>
				</label>
				<div class="relative">
					<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
					<input
						type="number"
						bind:value={formData.original_price}
						step="0.01"
						min="0"
						class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
					/>
				</div>
			</div>
			
			<!-- Preço de Custo -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Preço de Custo
					<span class="text-xs text-gray-500 ml-2">Para cálculo de lucro</span>
				</label>
				<div class="relative">
					<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
					<input
						type="number"
						bind:value={formData.cost}
						step="0.01"
						min="0"
						class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
					/>
				</div>
			</div>
		</div>
		
		<!-- Cálculo de Margem -->
		{#if formData.price && formData.cost}
			<div class="mt-4 p-4 bg-gray-50 rounded-lg">
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Margem de Lucro:</span>
					<span class="font-semibold text-green-600">
						R$ {(formData.price - formData.cost).toFixed(2)} 
						({((formData.price - formData.cost) / formData.price * 100).toFixed(1)}%)
					</span>
				</div>
			</div>
		{/if}
	</div>
	
	<!-- ESTOQUE -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="stock" size={20} color="#00BFB3" />
			Controle de Estoque
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Quantidade -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Quantidade em Estoque *
				</label>
				<input
					type="number"
					bind:value={formData.quantity}
					required
					min="0"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0"
				/>
			</div>
			
			<!-- Localização -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Localização no Estoque
				</label>
				<input
					type="text"
					bind:value={formData.stock_location}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="A1-B2-C3"
				/>
			</div>
			
			<!-- Controle de Inventário -->
			<div>
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.track_inventory}
						class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">Controlar Inventário</span>
						<p class="text-xs text-gray-500">Diminuir estoque automaticamente nas vendas</p>
					</div>
				</label>
			</div>
			
			<!-- Permitir Pedido sem Estoque -->
			<div>
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.allow_backorder}
						class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">Permitir Backorder</span>
						<p class="text-xs text-gray-500">Aceitar pedidos mesmo sem estoque</p>
					</div>
				</label>
			</div>
		</div>
	</div>
	
	<!-- STATUS E VISIBILIDADE -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="status" size={20} color="#00BFB3" />
			Status e Visibilidade
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Status -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Status do Produto
				</label>
				<select
					bind:value={formData.status}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				>
					<option value="draft">Rascunho</option>
					<option value="active">Ativo</option>
					<option value="inactive">Inativo</option>
				</select>
			</div>
			
			<!-- Data de Publicação -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Data de Publicação
				</label>
				<input
					type="datetime-local"
					bind:value={formData.published_at}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				/>
			</div>
			
			<!-- Produto Ativo -->
			<div>
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.is_active}
						class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">Produto Ativo</span>
						<p class="text-xs text-gray-500">Visível na loja</p>
					</div>
				</label>
			</div>
			
			<!-- Produto em Destaque -->
			<div>
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.featured}
						class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">Produto em Destaque</span>
						<p class="text-xs text-gray-500">Aparece na página inicial</p>
					</div>
				</label>
			</div>
		</div>
	</div>
</div> 