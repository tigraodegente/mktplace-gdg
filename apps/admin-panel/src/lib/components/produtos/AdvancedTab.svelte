<script lang="ts">
	import MultiSelect from '$lib/components/ui/MultiSelect.svelte';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import SuppliersManager from './SuppliersManager.svelte';
	import StocksManager from './StocksManager.svelte';
	import CollectionsManager from './CollectionsManager.svelte';
	
	let { formData = $bindable() } = $props();

	// Inicializar campos avançados se não existirem
	if (!formData.is_digital) formData.is_digital = false;
	if (!formData.requires_shipping) formData.requires_shipping = true;
	if (!formData.tax_class) formData.tax_class = 'standard';
	if (!formData.warranty_period) formData.warranty_period = '';
	if (!formData.manufacturing_country) formData.manufacturing_country = '';
	if (!formData.condition) formData.condition = 'new';
	if (!formData.custom_fields) formData.custom_fields = {};
	if (!formData.related_products) formData.related_products = [];
	if (!formData.upsell_products) formData.upsell_products = [];
	if (!formData.download_files) formData.download_files = [];

	// Estados locais com $state
	let newCustomField = $state({ key: '', value: '' });
	let newDownloadFile = $state({ name: '', url: '' });
	let availableProducts = $state<Array<{id: string, name: string}>>([]);
	let loadingProducts = $state(false);
	let loadingRelated = $state(false);
	let loadingDownloads = $state(false);
	let hasInitialized = $state(false);

	// Validar se productId é um UUID válido
	function isValidUUID(id: string | undefined | null): boolean {
		if (!id || typeof id !== 'string') return false;
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		return uuidRegex.test(id);
	}

	// Carregar produtos disponíveis
	async function loadAvailableProducts() {
		if (loadingProducts) return;
		loadingProducts = true;
		
		try {
			// Usar exclude apenas se tiver um ID válido
			const excludeParam = isValidUUID(formData.id) ? `&exclude=${formData.id}` : '';
			const response = await fetch(`/api/products/related?limit=100${excludeParam}`);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					availableProducts = data.data.map((p: any) => ({
						id: p.id,
						name: p.name
					}));
				} else {
					console.warn('Erro ao carregar produtos:', data.error);
					availableProducts = [];
				}
			} else {
				console.warn('Erro HTTP ao carregar produtos:', response.status);
				availableProducts = [];
			}
		} catch (error) {
			console.error('Erro ao carregar produtos:', error);
			availableProducts = [];
		} finally {
			loadingProducts = false;
		}
	}

	// Carregar produtos relacionados existentes
	async function loadRelatedProducts() {
		if (!isValidUUID(formData.id) || loadingRelated) return;
		loadingRelated = true;
		
		try {
			const response = await fetch(`/api/products/related?productId=${formData.id}`);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					formData.related_products = data.data.map((r: any) => r.related_product_id);
				} else {
					console.warn('Erro ao carregar produtos relacionados:', data.error);
					formData.related_products = [];
				}
			} else {
				console.warn('Erro HTTP ao carregar produtos relacionados:', response.status);
				formData.related_products = [];
			}
		} catch (error) {
			console.error('Erro ao carregar produtos relacionados:', error);
			formData.related_products = [];
		} finally {
			loadingRelated = false;
		}
	}

	// Carregar arquivos de download
	async function loadDownloadFiles() {
		if (!isValidUUID(formData.id) || loadingDownloads) return;
		loadingDownloads = true;
		
		try {
			const response = await fetch(`/api/products/downloads?productId=${formData.id}`);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					formData.download_files = data.data;
				} else {
					console.warn('Erro ao carregar arquivos de download:', data.error);
					formData.download_files = [];
				}
			} else {
				console.warn('Erro HTTP ao carregar downloads:', response.status);
				formData.download_files = [];
			}
		} catch (error) {
			console.error('Erro ao carregar arquivos de download:', error);
			formData.download_files = [];
		} finally {
			loadingDownloads = false;
		}
	}

	// Adicionar campo customizado
	function addCustomField() {
		if (newCustomField.key.trim() && newCustomField.value.trim()) {
			if (!formData.specifications) formData.specifications = {};
			if (!formData.specifications.custom_fields) formData.specifications.custom_fields = {};
			
			formData.specifications.custom_fields[newCustomField.key.trim()] = newCustomField.value.trim();
			formData.specifications = { ...formData.specifications };
			newCustomField = { key: '', value: '' };
		}
	}

	// Remover campo customizado
	function removeCustomField(key: string) {
		if (formData.specifications?.custom_fields) {
			delete formData.specifications.custom_fields[key];
			formData.specifications = { ...formData.specifications };
		}
	}

	// Adicionar arquivo de download
	async function addDownloadFile() {
		if (newDownloadFile.name.trim() && newDownloadFile.url.trim()) {
			if (isValidUUID(formData.id)) {
				// Salvar no banco
				try {
					const response = await fetch('/api/products/downloads', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							productId: formData.id,
							fileName: newDownloadFile.name.trim(),
							fileUrl: newDownloadFile.url.trim()
						})
					});
					
					if (response.ok) {
						const data = await response.json();
						if (data.success) {
							// Recarregar lista
							await loadDownloadFiles();
							newDownloadFile = { name: '', url: '' };
						}
					}
				} catch (error) {
					console.error('Erro ao adicionar arquivo:', error);
				}
			} else {
				// Modo local (produto novo)
				if (!formData.download_files) formData.download_files = [];
				formData.download_files = [...formData.download_files, { ...newDownloadFile }];
				newDownloadFile = { name: '', url: '' };
			}
		}
	}

	// Remover arquivo de download
	async function removeDownloadFile(index: number, fileId?: string) {
		if (fileId && isValidUUID(formData.id)) {
			// Remover do banco
			try {
				const response = await fetch(`/api/products/downloads?id=${fileId}`, {
					method: 'DELETE'
				});
				
				if (response.ok) {
					// Recarregar lista
					await loadDownloadFiles();
				}
			} catch (error) {
				console.error('Erro ao remover arquivo:', error);
			}
		} else {
			// Modo local
			if (formData.download_files) {
				formData.download_files = formData.download_files.filter((_: any, i: number) => i !== index);
			}
		}
	}

	// Atualizar seleção de produtos relacionados
	async function updateRelatedProducts(productIds: string[]) {
		formData.related_products = productIds;
		
		// Se tem ID do produto válido, salvar no banco
		if (isValidUUID(formData.id)) {
			try {
				// Primeiro remover todos os relacionamentos existentes
				const currentResponse = await fetch(`/api/products/related?productId=${formData.id}`);
				if (currentResponse.ok) {
					const currentData = await currentResponse.json();
					if (currentData.success) {
						// Remover relacionamentos que não estão mais selecionados
						for (const rel of currentData.data) {
							if (!productIds.includes(rel.related_product_id)) {
								await fetch(`/api/products/related?productId=${formData.id}&relatedProductId=${rel.related_product_id}`, {
									method: 'DELETE'
								});
							}
						}
					}
				}
				
				// Adicionar novos relacionamentos
				for (const relatedId of productIds) {
					await fetch('/api/products/related', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							productId: formData.id,
							relatedProductId: relatedId,
							relationType: 'similar'
						})
					});
				}
			} catch (error) {
				console.error('Erro ao salvar produtos relacionados:', error);
			}
		}
	}

	// Atualizar seleção de produtos upsell
	async function updateUpsellProducts(productIds: string[]) {
		formData.upsell_products = productIds;
		
		// Similar ao updateRelatedProducts mas com relationType: 'upsell'
		if (isValidUUID(formData.id)) {
			try {
				for (const relatedId of productIds) {
					await fetch('/api/products/related', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							productId: formData.id,
							relatedProductId: relatedId,
							relationType: 'upsell'
						})
					});
				}
			} catch (error) {
				console.error('Erro ao salvar produtos upsell:', error);
			}
		}
	}

	// Extrair custom_fields de specifications
	$effect(() => {
		if (formData.specifications?.custom_fields) {
			formData.custom_fields = formData.specifications.custom_fields;
		}
	});

	// Inicializar dados quando o componente montar ou produto mudar - APENAS UMA VEZ
	$effect(() => {
		// Só executa se não foi inicializado ou se o ID do produto mudou
		const currentProductId = formData.id;
		
		// Não executar em loop - verificar se já está carregando ou se já foi inicializado para este produto
		if (loadingProducts || loadingRelated || loadingDownloads) {
			return;
		}
		
		// Inicializar apenas uma vez ou quando produto muda
		if (!hasInitialized) {
			hasInitialized = true;
			
			// Sempre carregar produtos disponíveis
			loadAvailableProducts();
			
			// Carregar dados específicos do produto apenas se tem ID
			if (currentProductId) {
				loadRelatedProducts();
				loadDownloadFiles();
			}
		}
	});
</script>

<div class="space-y-8">
	<!-- FORNECEDORES -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<SuppliersManager productId={formData.id} />
	</div>

	<!-- MÚLTIPLOS ESTOQUES -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<StocksManager productId={formData.id} />
	</div>

	<!-- COLEÇÕES E KITS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<CollectionsManager productId={formData.id} />
	</div>

	<!-- TIPO DE PRODUTO -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="Package" size="md" /> Tipo de Produto
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-3">
					Natureza do Produto
				</label>
				<div class="space-y-3">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="radio"
							bind:group={formData.is_digital}
							value={false}
							class="w-5 h-5 text-[#00BFB3] border-gray-300 focus:ring-[#00BFB3]"
						/>
						<div>
							<span class="text-sm font-medium text-gray-900 flex items-center gap-2">
								<ModernIcon name="Package" size="sm" /> Produto Físico
							</span>
							<p class="text-xs text-gray-500 mt-1">Precisa de envio/frete</p>
						</div>
					</label>
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="radio"
							bind:group={formData.is_digital}
							value={true}
							class="w-5 h-5 text-[#00BFB3] border-gray-300 focus:ring-[#00BFB3]"
						/>
						<div>
							<span class="text-sm font-medium text-gray-900 flex items-center gap-2">
								<ModernIcon name="download" size="sm" /> Produto Digital
							</span>
							<p class="text-xs text-gray-500 mt-1">Download instantâneo</p>
						</div>
					</label>
				</div>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-3">
					Configurações de Envio
				</label>
				<div class="flex items-center">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.requires_shipping}
							class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
						/>
						<div>
							<span class="text-sm font-medium text-gray-900 flex items-center gap-2">
								<ModernIcon name="truck" size="sm" /> Requer Envio
							</span>
							<p class="text-xs text-gray-500 mt-1">Produto precisa ser enviado</p>
						</div>
					</label>
				</div>
			</div>
		</div>
	</div>

	<!-- INFORMAÇÕES LEGAIS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="info" size="md" /> Informações Legais e Compliance
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Classe Tributária
				</label>
				<select
					bind:value={formData.tax_class}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				>
					<option value="standard">Padrão</option>
					<option value="reduced">Reduzida</option>
					<option value="zero">Isento</option>
					<option value="food">Alimentos</option>
					<option value="medicine">Medicamentos</option>
					<option value="books">Livros</option>
				</select>
				<p class="text-xs text-gray-500 mt-1">Categoria fiscal do produto</p>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					País de Fabricação
				</label>
				<select
					bind:value={formData.manufacturing_country}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
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
				<p class="text-xs text-gray-500 mt-1">Local de origem do produto</p>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Período de Garantia
				</label>
				<input
					type="text"
					bind:value={formData.warranty_period}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Ex: 12 meses, 2 anos, 90 dias..."
				/>
				<p class="text-xs text-gray-500 mt-1">Tempo de garantia oferecida</p>
			</div>

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
					<option value="damaged">Com defeito</option>
				</select>
				<p class="text-xs text-gray-500 mt-1">Estado atual do produto</p>
			</div>

			<!-- Código NCM -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					📋 Código NCM
					<span class="text-xs text-gray-500 ml-2">Nomenclatura Comum do Mercosul</span>
				</label>
				<input
					type="text"
					bind:value={formData.ncm_code}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Ex: 8517.12.31"
					pattern="[0-9]{4}\.[0-9]{2}\.[0-9]{2}"
					maxlength="10"
				/>
				<p class="text-xs text-gray-500 mt-1">
					Código fiscal obrigatório para produtos físicos no Brasil
				</p>
			</div>

			<!-- Código GTIN -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					🔢 Código GTIN
					<span class="text-xs text-gray-500 ml-2">Global Trade Item Number</span>
				</label>
				<input
					type="text"
					bind:value={formData.gtin}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Ex: 7891234567890"
					pattern="[0-9]{8,14}"
					maxlength="14"
				/>
				<p class="text-xs text-gray-500 mt-1">
					Código de barras internacional (EAN, UPC, etc.)
				</p>
			</div>

			<!-- Origem -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					🌍 Origem do Produto
				</label>
				<input
					type="text"
					bind:value={formData.origin}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Ex: Nacional, Importado, China, etc."
				/>
				<p class="text-xs text-gray-500 mt-1">
					Origem de fabricação ou procedência
				</p>
			</div>
		</div>

		<!-- CONFIGURAÇÕES ADICIONAIS -->
		<div class="mt-6 space-y-4">
			<h5 class="font-medium text-gray-900">Configurações de Produto</h5>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.allow_reviews}
							class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
						/>
						<div>
							<span class="text-sm font-medium text-gray-900">⭐ Permitir Avaliações</span>
							<p class="text-xs text-gray-500">Clientes podem avaliar este produto</p>
						</div>
					</label>
				</div>
				
				<div>
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.is_customizable}
							class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
						/>
						<div>
							<span class="text-sm font-medium text-gray-900">🎨 Produto Customizável</span>
							<p class="text-xs text-gray-500">Permite personalização pelo cliente</p>
						</div>
					</label>
				</div>
			</div>
		</div>

		<!-- INSTRUÇÕES DE CUIDADO -->
		<div class="mt-6">
			<label class="block text-sm font-medium text-gray-700 mb-2">
				🧼 Instruções de Cuidado
				<span class="text-xs text-gray-500 ml-2">Como cuidar, limpar ou manter o produto</span>
			</label>
			<textarea
				bind:value={formData.care_instructions}
				rows="4"
				class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors resize-none"
				placeholder="Ex: Lavar à mão em água fria. Não usar alvejante. Secar à sombra. Não passar ferro em alta temperatura."
			></textarea>
			<p class="text-xs text-gray-500 mt-1">
				Instruções importantes para conservação e uso adequado do produto
			</p>
		</div>
	</div>

	<!-- CAMPOS PERSONALIZADOS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="Settings" size="md" /> Campos Personalizados
		</h4>

		<!-- Adicionar Campo -->
		<div class="mb-4">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
				<input
					type="text"
					bind:value={newCustomField.key}
					placeholder="Nome do campo"
					class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				/>
				<input
					type="text"
					bind:value={newCustomField.value}
					placeholder="Valor do campo"
					class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				/>
				<button
					type="button"
					onclick={addCustomField}
					disabled={!newCustomField.key.trim() || !newCustomField.value.trim()}
					class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					<ModernIcon name="Plus" size="sm" /> Adicionar
				</button>
			</div>
			<p class="text-xs text-gray-500 mt-2">Adicione informações extras específicas do produto</p>
		</div>

		<!-- Campos Adicionados -->
		{#if formData.specifications?.custom_fields && Object.keys(formData.specifications.custom_fields).length > 0}
			<div class="space-y-3">
				<h5 class="text-sm font-medium text-gray-700">Campos Configurados:</h5>
				{#each Object.entries(formData.specifications.custom_fields) as [key, value]}
					<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
						<div>
							<span class="font-medium text-gray-900">{key}:</span>
							<span class="text-gray-600 ml-2">{value}</span>
						</div>
						<button
							type="button"
							onclick={() => removeCustomField(key)}
							class="text-red-600 hover:text-red-800 transition-colors"
							title="Remover campo"
						>
							<ModernIcon name="delete" size="sm" />
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- PRODUTOS RELACIONADOS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="url" size="md" /> Produtos Relacionados
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Produtos Relacionados -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Produtos Relacionados
				</label>
				<MultiSelect
					items={availableProducts}
					selected={formData.related_products || []}
					onSelectionChange={updateRelatedProducts}
					placeholder="Selecione produtos relacionados..."
					allowMultiple={true}
				/>
				<p class="text-xs text-gray-500 mt-1">Produtos similares ou complementares</p>
			</div>

			<!-- Produtos Upsell -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Produtos para Upsell
				</label>
				<MultiSelect
					items={availableProducts}
					selected={formData.upsell_products || []}
					onSelectionChange={updateUpsellProducts}
					placeholder="Selecione produtos para upsell..."
					allowMultiple={true}
				/>
				<p class="text-xs text-gray-500 mt-1">Produtos mais caros para sugerir</p>
			</div>
		</div>
	</div>

	<!-- ARQUIVOS DIGITAIS -->
	{#if formData.is_digital}
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
				<ModernIcon name="save" size="md" /> Arquivos para Download
			</h4>

			<!-- Adicionar Arquivo -->
			<div class="mb-4">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
					<input
						type="text"
						bind:value={newDownloadFile.name}
						placeholder="Nome do arquivo"
						class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					/>
					<input
						type="url"
						bind:value={newDownloadFile.url}
						placeholder="URL do arquivo"
						class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					/>
					<button
						type="button"
						onclick={addDownloadFile}
						disabled={!newDownloadFile.name.trim() || !newDownloadFile.url.trim()}
						class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						<ModernIcon name="Plus" size="sm" /> Adicionar
					</button>
				</div>
				<p class="text-xs text-gray-500 mt-2">URLs dos arquivos que serão disponibilizados para download</p>
			</div>

			<!-- Arquivos Adicionados -->
			{#if formData.download_files && formData.download_files.length > 0}
				<div class="space-y-3">
					<h5 class="text-sm font-medium text-gray-700">Arquivos Configurados:</h5>
					{#each formData.download_files as file, index}
						<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
							<div>
								<span class="font-medium text-gray-900">{file.name}</span>
								<span class="text-gray-600 ml-2 text-sm">({file.url})</span>
							</div>
							<button
								type="button"
								onclick={() => removeDownloadFile(index, file.id)}
								class="text-red-600 hover:text-red-800 transition-colors"
								title="Remover arquivo"
							>
								<ModernIcon name="delete" size="sm" />
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- RESUMO DAS CONFIGURAÇÕES -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="preview" size="md" /> Resumo das Configurações
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<h5 class="font-medium text-gray-900 mb-2 flex items-center gap-2">
					<ModernIcon name="Package" size="sm" /> Tipo
				</h5>
				<p class="text-sm text-gray-600">
					{formData.is_digital ? 'Digital' : 'Físico'}
				</p>
			</div>

			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<h5 class="font-medium text-gray-900 mb-2 flex items-center gap-2">
					<ModernIcon name="sku" size="sm" /> Condição
				</h5>
				<p class="text-sm text-gray-600">
					{formData.condition === 'new' ? 'Novo' : 
					 formData.condition === 'used' ? 'Usado' :
					 formData.condition === 'refurbished' ? 'Recondicionado' :
					 formData.condition || 'Não definido'}
				</p>
			</div>

			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<h5 class="font-medium text-gray-900 mb-2 flex items-center gap-2">
					<ModernIcon name="info" size="sm" /> Garantia
				</h5>
				<p class="text-sm text-gray-600">
					{formData.warranty_period || 'Não definido'}
				</p>
			</div>

			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<h5 class="font-medium text-gray-900 mb-2 flex items-center gap-2">
					<ModernIcon name="Settings" size="sm" /> Campos
				</h5>
				<p class="text-sm text-gray-600">
					{Object.keys(formData.specifications?.custom_fields || {}).length} personalizados
				</p>
			</div>
		</div>
	</div>
</div> 