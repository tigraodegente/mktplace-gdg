<script lang="ts">
	let { formData = $bindable() } = $props();

	// Estados locais para gestão de tags
	let newTag = '';
	let newKeyword = '';
	let metaKeywordsText = '';
	let keywordsBulk = '';

	// Tags sugeridas
	const suggestedTags = [
		'popular', 'novo', 'promoção', 'limitado', 'premium', 'básico',
		'importado', 'nacional', 'orgânico', 'sustentável', 'econômico',
		'profissional', 'casual', 'esportivo', 'tecnologia', 'moderno'
	];

	// Inicializar arrays se não existirem
	if (!formData.tags) formData.tags = [];
	if (!formData.meta_keywords) formData.meta_keywords = [];
	if (!formData.searchable) formData.searchable = true;
	if (!formData.seo_indexable) formData.seo_indexable = true;
	if (!formData.collections) formData.collections = '';
	if (!formData.primary_category) formData.primary_category = '';
	if (!formData.subcategory) formData.subcategory = '';

	// Função para adicionar tag
	function addTag() {
		const tag = newTag.trim();
		if (tag && !formData.tags.includes(tag)) {
			formData.tags = [...formData.tags, tag];
			newTag = '';
		}
	}

	// Função para adicionar tag sugerida
	function addSuggestedTag(tag: string) {
		if (!formData.tags.includes(tag)) {
			formData.tags = [...formData.tags, tag];
		}
	}

	// Função para remover tag
	function removeTag(tag: string) {
		formData.tags = formData.tags.filter((t: string) => t !== tag);
	}

	// Função para adicionar palavra-chave
	function addKeyword() {
		const keyword = newKeyword.trim();
		if (keyword && !formData.meta_keywords.includes(keyword)) {
			formData.meta_keywords = [...formData.meta_keywords, keyword];
			newKeyword = '';
			updateKeywordsText();
		}
	}

	// Função para adicionar múltiplas keywords
	function addBulkKeywords() {
		if (keywordsBulk.trim()) {
			const keywords = keywordsBulk
				.split(',')
				.map(k => k.trim())
				.filter(k => k.length > 0);
			
			// Remove duplicatas
			const newKeywords = keywords.filter(k => !formData.meta_keywords.includes(k));
			formData.meta_keywords = [...formData.meta_keywords, ...newKeywords];
			keywordsBulk = '';
			updateKeywordsText();
		}
	}

	// Função para remover palavra-chave
	function removeKeyword(keyword: string) {
		formData.meta_keywords = formData.meta_keywords.filter((k: string) => k !== keyword);
		updateKeywordsText();
	}

	// Atualizar texto das palavras-chave
	function updateKeywordsText() {
		metaKeywordsText = formData.meta_keywords.join(', ');
	}

	// Processar texto de palavras-chave (separado por vírgula)
	function processKeywordsText() {
		if (metaKeywordsText.trim()) {
			const keywords = metaKeywordsText
				.split(',')
				.map(k => k.trim())
				.filter(k => k.length > 0);
			
			formData.meta_keywords = [...new Set([...formData.meta_keywords, ...keywords])];
			metaKeywordsText = '';
			updateKeywordsText();
		}
	}

	// Handler para Enter nas tags
	function handleTagKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addTag();
		}
	}

	// Handler para Enter nas keywords
	function handleKeywordKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addKeyword();
		}
	}

	// Inicializar o texto das keywords quando o componente carrega
	$effect(() => {
		if (formData.meta_keywords?.length > 0 && !metaKeywordsText) {
			updateKeywordsText();
		}
	});
</script>

<div class="space-y-8">
	<!-- CATEGORIA PRINCIPAL -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			📂 Categorização Principal
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Categoria Principal -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Categoria Principal *
				</label>
				<select
					bind:value={formData.primary_category}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					required
				>
					<option value="">Selecione uma categoria</option>
					<option value="eletronicos">🔌 Eletrônicos</option>
					<option value="roupas">👕 Roupas & Acessórios</option>
					<option value="casa">🏠 Casa & Jardim</option>
					<option value="esportes">⚽ Esportes & Lazer</option>
					<option value="livros">📚 Livros & Mídia</option>
					<option value="beleza">💄 Beleza & Saúde</option>
					<option value="brinquedos">🧸 Brinquedos & Jogos</option>
					<option value="automotivo">🚗 Automotivo</option>
					<option value="ferramentas">🔧 Ferramentas</option>
					<option value="alimentacao">🍕 Alimentação</option>
				</select>
				<p class="text-xs text-gray-500 mt-1">Categoria principal para navegação</p>
			</div>

			<!-- Subcategoria -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Subcategoria
				</label>
				<input
					type="text"
					bind:value={formData.subcategory}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Ex: Smartphones, Notebooks, Camisetas..."
				/>
				<p class="text-xs text-gray-500 mt-1">Refinamento da categoria principal</p>
			</div>
		</div>
	</div>

	<!-- TAGS E ETIQUETAS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			🏷️ Tags do Produto
		</h4>

		<!-- Campo de Adição de Tags -->
		<div class="mb-4">
			<label class="block text-sm font-medium text-gray-700 mb-2">
				Adicionar Tag
			</label>
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={newTag}
					onkeydown={handleTagKeydown}
					class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Digite uma tag e pressione Enter"
				/>
				<button
					type="button"
					onclick={addTag}
					disabled={!newTag.trim()}
					class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Adicionar
				</button>
			</div>
			<p class="text-xs text-gray-500 mt-1">Tags ajudam na busca e organização</p>
		</div>

		<!-- Tags Adicionadas -->
		{#if formData.tags && formData.tags.length > 0}
			<div class="mb-4">
				<h6 class="text-sm font-medium text-gray-700 mb-2">Tags Adicionadas ({formData.tags.length})</h6>
				<div class="flex flex-wrap gap-2">
					{#each formData.tags as tag, index}
						<span class="inline-flex items-center gap-2 px-3 py-2 bg-[#00BFB3]/10 text-[#00BFB3] rounded-lg text-sm">
							<span>{tag}</span>
							<button
								type="button"
								onclick={() => removeTag(tag)}
								class="text-[#00BFB3] hover:text-red-600 transition-colors"
								title="Remover tag"
							>
								✕
							</button>
						</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Tags Sugeridas -->
		<div>
			<h6 class="text-sm font-medium text-gray-700 mb-2">Tags Populares</h6>
			<div class="flex flex-wrap gap-2">
				{#each suggestedTags as tag}
					<button
						type="button"
						onclick={() => addSuggestedTag(tag)}
						disabled={formData.tags.includes(tag)}
						class="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{tag}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- PALAVRAS-CHAVE SEO -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			🔍 Palavras-chave para SEO
		</h4>

		<!-- Campo de Adição de Keywords -->
		<div class="mb-4">
			<label class="block text-sm font-medium text-gray-700 mb-2">
				Adicionar Palavra-chave
			</label>
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={newKeyword}
					onkeydown={handleKeywordKeydown}
					class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Digite palavra-chave e pressione Enter"
				/>
				<button
					type="button"
					onclick={addKeyword}
					disabled={!newKeyword.trim()}
					class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Adicionar
				</button>
			</div>
		</div>

		<!-- Adicionar Múltiplas Keywords -->
		<div class="mb-4">
			<label class="block text-sm font-medium text-gray-700 mb-2">
				Adicionar Múltiplas (separadas por vírgula)
			</label>
			<textarea
				bind:value={keywordsBulk}
				rows="3"
				class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors resize-none"
				placeholder="smartphone, celular, android, ios, mobile..."
			></textarea>
			<div class="flex justify-between items-center mt-2">
				<p class="text-xs text-gray-500">Separe as palavras-chave por vírgula</p>
				<button
					type="button"
					onclick={addBulkKeywords}
					disabled={!keywordsBulk.trim()}
					class="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors text-sm disabled:opacity-50"
				>
					Adicionar Todas
				</button>
			</div>
		</div>

		<!-- Keywords Adicionadas -->
		{#if formData.meta_keywords && formData.meta_keywords.length > 0}
			<div class="mb-4">
				<h6 class="text-sm font-medium text-gray-700 mb-2">
					Palavras-chave Adicionadas ({formData.meta_keywords.length})
				</h6>
				<div class="flex flex-wrap gap-2">
					{#each formData.meta_keywords as keyword, index}
						<span class="inline-flex items-center gap-2 px-3 py-2 bg-[#00BFB3]/10 text-[#00BFB3] rounded-lg text-sm">
							<span>{keyword}</span>
							<button
								type="button"
								onclick={() => removeKeyword(keyword)}
								class="text-[#00BFB3] hover:text-red-600 transition-colors"
								title="Remover palavra-chave"
							>
								✕
							</button>
						</span>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- CONFIGURAÇÕES DE BUSCA -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			⚙️ Configurações de Busca e Indexação
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div class="space-y-4">
				<div class="flex items-center">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.searchable}
							class="w-6 h-6 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
						/>
						<div>
							<span class="text-sm font-medium text-gray-900">🔍 Produto Pesquisável</span>
							<p class="text-xs text-gray-600">Aparece nos resultados de busca</p>
						</div>
					</label>
				</div>

				<div class="flex items-center">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.seo_indexable}
							class="w-6 h-6 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
						/>
						<div>
							<span class="text-sm font-medium text-gray-900">🌐 Indexável (SEO)</span>
							<p class="text-xs text-gray-600">Pode ser indexado pelo Google</p>
						</div>
					</label>
				</div>
			</div>

			<!-- Coleções -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					📚 Coleções / Agrupamentos
				</label>
				<input
					type="text"
					bind:value={formData.collections}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Ex: Verão 2024, Lançamentos, Black Friday..."
				/>
				<p class="text-xs text-gray-500 mt-1">Agrupe produtos por coleções ou campanhas</p>
			</div>
		</div>
	</div>

	<!-- RESUMO DA CATEGORIZAÇÃO -->
	{#if formData.primary_category || formData.tags?.length > 0 || formData.meta_keywords?.length > 0}
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
				📋 Resumo da Categorização
			</h4>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Categoria -->
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<h5 class="font-medium text-gray-900 mb-2">📂 Categoria</h5>
					<p class="text-sm text-gray-600">
						{formData.primary_category || 'Não definida'}
						{#if formData.subcategory}
							<br><span class="text-xs text-gray-500">→ {formData.subcategory}</span>
						{/if}
					</p>
				</div>

				<!-- Tags -->
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<h5 class="font-medium text-gray-900 mb-2">🏷️ Tags</h5>
					<p class="text-sm text-gray-600">
						{formData.tags?.length || 0} tag(s) adicionada(s)
					</p>
				</div>

				<!-- SEO Keywords -->
				<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
					<h5 class="font-medium text-gray-900 mb-2">🔍 SEO</h5>
					<p class="text-sm text-gray-600">
						{formData.meta_keywords?.length || 0} palavra(s)-chave
					</p>
				</div>
			</div>
		</div>
	{/if}
</div> 