<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	let { formData = $bindable() } = $props();

	// Inicializar campos avançados se não existirem
	if (!formData.requires_shipping) formData.requires_shipping = true;
	if (!formData.is_digital) formData.is_digital = false;
	if (!formData.tax_class) formData.tax_class = 'standard';
	if (!formData.warranty_period) formData.warranty_period = '';
	if (!formData.manufacturing_country) formData.manufacturing_country = '';
	if (!formData.product_condition) formData.product_condition = 'new';
	if (!formData.custom_fields) formData.custom_fields = {};
	if (!formData.related_products) formData.related_products = [];
	if (!formData.upsell_products) formData.upsell_products = [];
	if (!formData.download_files) formData.download_files = [];

	// Estados locais
	let newCustomField = { key: '', value: '' };
	let newDownloadFile = { name: '', url: '' };

	// Lista de produtos de exemplo (deveria vir de uma API)
	const sampleProducts = [
		{ id: '1', name: 'Produto Exemplo 1' },
		{ id: '2', name: 'Produto Exemplo 2' },
		{ id: '3', name: 'Produto Exemplo 3' }
	];

	// Lista de países
	const countries = [
		'Brasil', 'Estados Unidos', 'China', 'Alemanha', 'Japão', 
		'Coreia do Sul', 'Taiwan', 'França', 'Itália', 'Reino Unido'
	];

	// Adicionar campo customizado
	function addCustomField() {
		if (newCustomField.key.trim() && newCustomField.value.trim()) {
			formData.custom_fields[newCustomField.key.trim()] = newCustomField.value.trim();
			formData.custom_fields = { ...formData.custom_fields };
			newCustomField = { key: '', value: '' };
		}
	}

	// Remover campo customizado
	function removeCustomField(key: string) {
		delete formData.custom_fields[key];
		formData.custom_fields = { ...formData.custom_fields };
	}

	// Adicionar arquivo de download
	function addDownloadFile() {
		if (newDownloadFile.name.trim() && newDownloadFile.url.trim()) {
			formData.download_files = [...(formData.download_files || []), { 
				name: newDownloadFile.name.trim(), 
				url: newDownloadFile.url.trim() 
			}];
			newDownloadFile = { name: '', url: '' };
		}
	}

	// Remover arquivo de download
	function removeDownloadFile(index: number) {
		formData.download_files = formData.download_files.filter((_: any, i: number) => i !== index);
	}
</script>

<div class="space-y-8">
	<div class="mb-6">
		<h3 class="text-xl font-semibold text-slate-900 mb-2">Configurações Avançadas</h3>
		<p class="text-slate-600">Configurações especiais e personalizações do produto</p>
	</div>

	<!-- TIPO DE PRODUTO -->
	<div class="bg-gradient-to-r from-[#00BFB3]/10 to-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7l2 2m0 0l2 2m-2-2h-6m6 0V2" />
			</svg>
			Tipo de Produto
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Produto Digital/Físico -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-3">
					📦 Natureza do Produto
				</label>
				<div class="space-y-3">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="radio"
							bind:group={formData.is_digital}
							value={false}
							class="w-5 h-5 text-[#00BFB3] border-slate-300 focus:ring-[#00BFB3]"
						/>
						<div>
							<span class="text-sm font-medium text-slate-900">📦 Produto Físico</span>
							<p class="text-xs text-slate-600">Precisa de envio/frete</p>
						</div>
					</label>
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="radio"
							bind:group={formData.is_digital}
							value={true}
							class="w-5 h-5 text-[#00BFB3] border-slate-300 focus:ring-[#00BFB3]"
						/>
						<div>
							<span class="text-sm font-medium text-slate-900">💾 Produto Digital</span>
							<p class="text-xs text-slate-600">Download instantâneo</p>
						</div>
					</label>
				</div>
			</div>

			<!-- Requer Frete -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-3">
					🚚 Configurações de Envio
				</label>
				<div class="flex items-center">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.requires_shipping}
							class="w-6 h-6 rounded border-slate-300 text-[#00BFB3] shadow-sm focus:border-[#00BFB3] focus:ring focus:ring-[#00BFB3]/20 focus:ring-opacity-50"
						/>
						<div>
							<span class="text-sm font-medium text-slate-900">📮 Requer Envio</span>
							<p class="text-xs text-slate-600">Produto precisa ser enviado</p>
						</div>
					</label>
				</div>
			</div>
		</div>
	</div>

	<!-- INFORMAÇÕES LEGAIS -->
	<div class="bg-gradient-to-r from-[#00BFB3]/8 to-[#00BFB3]/12 border border-[#00BFB3]/25 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
			</svg>
			Informações Legais e Compliance
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Classe Tributária -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					📊 Classe Tributária
				</label>
				<select
					bind:value={formData.tax_class}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				>
					<option value="standard">Padrão</option>
					<option value="reduced">Reduzida</option>
					<option value="zero">Isento</option>
					<option value="food">Alimentos</option>
					<option value="medicine">Medicamentos</option>
					<option value="books">Livros</option>
				</select>
				<p class="text-xs text-slate-500 mt-1">Categoria fiscal do produto</p>
			</div>

			<!-- País de Fabricação -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					🌍 País de Fabricação
				</label>
				<select
					bind:value={formData.manufacturing_country}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				>
					<option value="">Selecione um país</option>
					<option value="BR">🇧🇷 Brasil</option>
					<option value="US">🇺🇸 Estados Unidos</option>
					<option value="CN">🇨🇳 China</option>
					<option value="DE">🇩🇪 Alemanha</option>
					<option value="JP">🇯🇵 Japão</option>
					<option value="KR">🇰🇷 Coreia do Sul</option>
					<option value="IT">🇮🇹 Itália</option>
					<option value="FR">🇫🇷 França</option>
				</select>
				<p class="text-xs text-slate-500 mt-1">Local de origem do produto</p>
			</div>

			<!-- Período de Garantia -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					🛡️ Período de Garantia
				</label>
				<input
					type="text"
					bind:value={formData.warranty_period}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Ex: 12 meses, 2 anos, 90 dias..."
				/>
				<p class="text-xs text-slate-500 mt-1">Tempo de garantia oferecida</p>
			</div>

			<!-- Condição do Produto -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					🔍 Condição do Produto
				</label>
				<select
					bind:value={formData.product_condition}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				>
					<option value="new">✨ Novo</option>
					<option value="used">🔄 Usado</option>
					<option value="refurbished">🔧 Recondicionado</option>
					<option value="damaged">⚠️ Com defeito</option>
				</select>
				<p class="text-xs text-slate-500 mt-1">Estado atual do produto</p>
			</div>
		</div>
	</div>

	<!-- CAMPOS PERSONALIZADOS -->
	<div class="bg-gradient-to-r from-[#00BFB3]/6 to-[#00BFB3]/10 border border-[#00BFB3]/20 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
			</svg>
			Campos Personalizados
		</h4>

		<!-- Adicionar Campo -->
		<div class="mb-4">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
				<input
					type="text"
					bind:value={newCustomField.key}
					placeholder="Nome do campo"
					class="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				/>
				<input
					type="text"
					bind:value={newCustomField.value}
					placeholder="Valor do campo"
					class="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				/>
				<button
					type="button"
					on:click={addCustomField}
					disabled={!newCustomField.key.trim() || !newCustomField.value.trim()}
					class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Adicionar
				</button>
			</div>
			<p class="text-xs text-slate-500 mt-2">Adicione informações extras específicas do produto</p>
		</div>

		<!-- Campos Adicionados -->
		{#if Object.keys(formData.custom_fields || {}).length > 0}
			<div class="space-y-3">
				<h6 class="text-sm font-medium text-slate-700">Campos Criados</h6>
				{#each Object.entries(formData.custom_fields || {}) as [key, value], index}
					<div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#00BFB3]/30">
						<div class="flex-1 grid grid-cols-2 gap-3">
							<div>
								<span class="text-sm font-medium text-slate-900">{key}:</span>
							</div>
							<div>
								<span class="text-sm text-slate-700">{value}</span>
							</div>
						</div>
						<button
							type="button"
							on:click={() => removeCustomField(key)}
							class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
							title="Remover campo"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-6 border-2 border-dashed border-slate-300 rounded-lg">
				<p class="text-slate-500 text-sm">Nenhum campo personalizado adicionado</p>
			</div>
		{/if}
	</div>

	<!-- PRODUTOS RELACIONADOS -->
	<div class="bg-gradient-to-r from-[#00BFB3]/4 to-[#00BFB3]/8 border border-[#00BFB3]/15 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
			</svg>
			Produtos Relacionados e Upsell
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Produtos Relacionados -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					🔗 Produtos Relacionados
				</label>
				<select
					multiple
					bind:value={formData.related_products}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					size="4"
				>
					{#each sampleProducts as product}
						<option value={product.id}>{product.name}</option>
					{/each}
				</select>
				<p class="text-xs text-slate-500 mt-1">Produtos similares ou complementares</p>
			</div>

			<!-- Produtos Upsell -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					📈 Produtos para Upsell
				</label>
				<select
					multiple
					bind:value={formData.upsell_products}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					size="4"
				>
					{#each sampleProducts as product}
						<option value={product.id}>{product.name}</option>
					{/each}
				</select>
				<p class="text-xs text-slate-500 mt-1">Produtos premium para sugerir</p>
			</div>
		</div>
	</div>

	<!-- DOWNLOADS (PRODUTOS DIGITAIS) -->
	{#if formData.is_digital}
		<div class="bg-gradient-to-r from-[#00BFB3]/3 to-[#00BFB3]/6 border border-[#00BFB3]/10 rounded-xl p-6">
			<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
				<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
				</svg>
				Arquivos para Download
			</h4>

			<!-- Adicionar Arquivo -->
			<div class="mb-4">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
					<input
						type="text"
						bind:value={newDownloadFile.name}
						placeholder="Nome do arquivo"
						class="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					/>
					<input
						type="url"
						bind:value={newDownloadFile.url}
						placeholder="URL do arquivo"
						class="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					/>
					<button
						type="button"
						on:click={addDownloadFile}
						disabled={!newDownloadFile.name.trim() || !newDownloadFile.url.trim()}
						class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Adicionar
					</button>
				</div>
				<p class="text-xs text-slate-500 mt-2">Arquivos que serão disponibilizados após a compra</p>
			</div>

			<!-- Arquivos Adicionados -->
			{#if formData.download_files && formData.download_files.length > 0}
				<div class="space-y-3">
					<h6 class="text-sm font-medium text-slate-700">Arquivos de Download</h6>
					{#each formData.download_files as file, index}
						<div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#00BFB3]/30">
							<div class="flex-1">
								<p class="text-sm font-medium text-slate-900">{file.name}</p>
								<p class="text-xs text-slate-500 font-mono">{file.url}</p>
							</div>
							<button
								type="button"
								on:click={() => removeDownloadFile(index)}
								class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
								title="Remover arquivo"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-6 border-2 border-dashed border-slate-300 rounded-lg">
					<p class="text-slate-500 text-sm">Nenhum arquivo de download adicionado</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- RESUMO CONFIGURAÇÕES -->
	<div class="bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			Resumo das Configurações
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			<!-- Tipo -->
			<div class="bg-white rounded-lg p-4 border border-slate-200">
				<h5 class="font-medium text-slate-900 mb-2">📦 Tipo</h5>
				<p class="text-sm text-slate-600">
					{formData.is_digital ? 'Digital' : 'Físico'}
				</p>
			</div>

			<!-- Condição -->
			<div class="bg-white rounded-lg p-4 border border-slate-200">
				<h5 class="font-medium text-slate-900 mb-2">🏷️ Condição</h5>
				<p class="text-sm text-slate-600">
					{formData.product_condition === 'new' ? 'Novo' : 
					 formData.product_condition === 'used_like_new' ? 'Usado - Como Novo' :
					 formData.product_condition || 'Não definido'}
				</p>
			</div>

			<!-- Garantia -->
			<div class="bg-white rounded-lg p-4 border border-slate-200">
				<h5 class="font-medium text-slate-900 mb-2">🛡️ Garantia</h5>
				<p class="text-sm text-slate-600">
					{formData.warranty_period || 'Não definido'}
				</p>
			</div>

			<!-- Campos Customizados -->
			<div class="bg-white rounded-lg p-4 border border-slate-200">
				<h5 class="font-medium text-slate-900 mb-2">⚙️ Campos</h5>
				<p class="text-sm text-slate-600">
					{Object.keys(formData.custom_fields).length} personalizados
				</p>
			</div>
		</div>
	</div>

	<!-- GESTÃO DE ESTOQUE -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="Package" size={20} color="#00BFB3" />
			Gestão de Estoque
		</h4>
		
		<div class="space-y-6">
			<!-- Rastreamento de Estoque -->
			<div>
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.track_inventory}
						class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">Rastrear Estoque</span>
						<p class="text-xs text-gray-500">Controlar quantidade disponível</p>
					</div>
				</label>
			</div>
			
			<!-- Permitir Backorder -->
			<div>
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.allow_backorder}
						class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">Permitir Backorder</span>
						<p class="text-xs text-gray-500">Vender mesmo sem estoque disponível</p>
					</div>
				</label>
			</div>
			
			<!-- Localização no Estoque -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					📍 Localização no Estoque
				</label>
				<input
					type="text"
					bind:value={formData.stock_location}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Ex: Prateleira A-15, Corredor 3"
				/>
			</div>
			
			<!-- Alerta de Estoque Baixo -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					⚠️ Quantidade Mínima para Alerta
				</label>
				<input
					type="number"
					bind:value={formData.low_stock_alert}
					min="0"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="10"
				/>
			</div>
		</div>
	</div>
	
	<!-- INFORMAÇÕES FISCAIS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="document" size={20} color="#00BFB3" />
			Informações Fiscais
		</h4>
		
		<div class="space-y-6">
			<!-- Código NCM -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					🏷️ Código NCM
					<span class="text-xs text-gray-500 ml-2">Nomenclatura Comum do Mercosul</span>
				</label>
				<input
					type="text"
					bind:value={formData.ncm_code}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0000.00.00"
				/>
			</div>
			
			<!-- Código EAN/GTIN -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					🏷️ Código EAN/GTIN
					<span class="text-xs text-gray-500 ml-2">Código de barras global</span>
				</label>
				<input
					type="text"
					bind:value={formData.gtin}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="7890000000000"
				/>
			</div>
			
			<!-- Origem do Produto -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					🌍 Origem do Produto
				</label>
				<select
					bind:value={formData.origin}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				>
					<option value="">Selecione a origem</option>
					<option value="0">Nacional</option>
					<option value="1">Estrangeira - Importação direta</option>
					<option value="2">Estrangeira - Adquirida no mercado interno</option>
					<option value="3">Nacional com conteúdo importado superior a 40%</option>
					<option value="4">Nacional com conteúdo importado inferior a 40%</option>
					<option value="5">Nacional com conteúdo importado inferior a 70%</option>
					<option value="6">Estrangeira - Importação direta sem similar nacional</option>
					<option value="7">Estrangeira - Adquirida no mercado interno sem similar nacional</option>
					<option value="8">Nacional - Mercadoria ou bem com conteúdo de importação superior a 70%</option>
				</select>
			</div>
		</div>
	</div>
	
	<!-- GARANTIA E SUPORTE -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="shield" size={20} color="#00BFB3" />
			Garantia e Suporte
		</h4>
		
		<div class="space-y-6">
			<!-- Período de Garantia -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					🛡️ Período de Garantia
				</label>
				<input
					type="text"
					bind:value={formData.warranty_period}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Ex: 12 meses, 90 dias, 2 anos"
				/>
			</div>
			
			<!-- Instruções de Cuidado -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					📋 Instruções de Cuidado/Uso
				</label>
				<textarea
					bind:value={formData.care_instructions}
					rows="4"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Descreva cuidados especiais, modo de uso, manutenção..."
				></textarea>
			</div>
			
			<!-- Manual do Usuário -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					📄 Link do Manual
					<span class="text-xs text-gray-500 ml-2">URL do manual online</span>
				</label>
				<input
					type="url"
					bind:value={formData.manual_link}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="https://exemplo.com/manual.pdf"
				/>
			</div>
		</div>
	</div>
	
	<!-- CONFIGURAÇÕES AVANÇADAS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="settings" size={20} color="#00BFB3" />
			Configurações Avançadas
		</h4>
		
		<div class="space-y-6">
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
						<p class="text-xs text-gray-500">Exibir na página inicial e vitrines</p>
					</div>
				</label>
			</div>
			
			<!-- Produto Digital -->
			<div>
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.is_digital}
						class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">Produto Digital</span>
						<p class="text-xs text-gray-500">Download ou acesso online</p>
					</div>
				</label>
			</div>
			
			<!-- Permitir Avaliações -->
			<div>
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.allow_reviews}
						class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">Permitir Avaliações</span>
						<p class="text-xs text-gray-500">Clientes podem avaliar o produto</p>
					</div>
				</label>
			</div>
			
			<!-- Requer Idade Mínima -->
			<div>
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.age_restricted}
						class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">Produto com Restrição de Idade</span>
						<p class="text-xs text-gray-500">Apenas para maiores de 18 anos</p>
					</div>
				</label>
			</div>
			
			<!-- Produto Personalizado -->
			<div>
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.is_customizable}
						class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">Aceita Personalização</span>
						<p class="text-xs text-gray-500">Cliente pode personalizar o produto</p>
					</div>
				</label>
			</div>
		</div>
	</div>
	
	<!-- NOTAS INTERNAS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="note" size={20} color="#00BFB3" />
			Notas Internas
		</h4>
		
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-2">
				📝 Observações (não visível para clientes)
			</label>
			<textarea
				bind:value={formData.internal_notes}
				rows="4"
				class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				placeholder="Anotações internas sobre o produto, fornecedor, etc..."
			></textarea>
		</div>
	</div>
	
	<!-- VARIAÇÕES SUGERIDAS PELA IA -->
	{#if formData._suggested_variations && formData._suggested_variations.length > 0}
	<div class="bg-purple-50 border border-purple-200 rounded-lg p-6">
		<h4 class="font-semibold text-purple-900 mb-4 flex items-center gap-2">
			<ModernIcon name="robot" size={20} color="#9333ea" />
			Variações Sugeridas pela IA
		</h4>
		
		<div class="space-y-4">
			<p class="text-sm text-purple-700">
				A IA identificou que este produto pode ter as seguintes variações:
			</p>
			
			{#each formData._suggested_variations as variation}
			<div class="bg-white rounded-lg p-4 border border-purple-200">
				<h5 class="font-medium text-purple-900 mb-2">{variation.type}</h5>
				<div class="flex flex-wrap gap-2">
					{#each variation.options as option}
					<span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
						{option}
					</span>
					{/each}
				</div>
			</div>
			{/each}
			
			<div class="mt-4 p-3 bg-purple-100 rounded-lg">
				<p class="text-xs text-purple-800">
					<strong>💡 Dica:</strong> Para criar variações, vá para a aba "Variações" após salvar o produto principal.
				</p>
			</div>
		</div>
	</div>
	{/if}
</div> 