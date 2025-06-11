<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import AISuggestionCard from '$lib/components/shared/AISuggestionCard.svelte';
	import { aiReviewMode, aiSuggestionsByCategory } from '$lib/stores/aiReview';
	import { toast } from '$lib/stores/toast';
	
	interface Props {
		formData: any;
	}
	
	let { formData = $bindable() }: Props = $props();

	// Estados de loading para IA expandidos
	let aiLoading = $state<Record<string, boolean>>({
		metaTitle: false,
		metaDescription: false,
		ogTitle: false,
		ogDescription: false,
		keywords: false
	});

	// Estados locais
	let newTag = $state('');
	let newKeyword = $state('');
	let metaKeywordsText = $state('');

	// Estado para validação de URL
	let canonicalUrlValid = $state<boolean | null>(null);

	// Tags sugeridas
	const suggestedTags = [
		'popular', 'novo', 'promoção', 'limitado', 'premium', 'básico',
		'importado', 'nacional', 'orgânico', 'sustentável', 'econômico',
		'profissional', 'casual', 'esportivo', 'tecnologia', 'moderno'
	];

	// Keywords sugeridas por categoria
	const categoryKeywords: Record<string, string[]> = {
		'decoracao': ['decoração', 'casa', 'ambiente', 'design', 'estilo', 'móveis'],
		'infantil': ['bebê', 'criança', 'infantil', 'brinquedo', 'educativo', 'seguro'],
		'eletronicos': ['eletrônico', 'digital', 'tecnologia', 'gadget', 'conectividade'],
		'roupas': ['moda', 'vestuário', 'roupa', 'estilo', 'fashion', 'casual'],
		'casa': ['casa', 'lar', 'doméstico', 'utilidade', 'praticidade'],
		'esporte': ['esporte', 'fitness', 'exercício', 'atividade', 'saúde'],
		'beleza': ['beleza', 'cuidado', 'cosmético', 'bem-estar', 'pele']
	};

	// Estados para revisão IA em lote
	let isAIReviewMode = $state(false);
	let aiSuggestions = $state<any[]>([]);

	// Subscrever ao modo IA
	aiReviewMode.subscribe(mode => {
		isAIReviewMode = mode;
	});

	// Subscrever às sugestões da categoria 'seo'
	aiSuggestionsByCategory.subscribe(suggestions => {
		aiSuggestions = suggestions.seo || [];
		console.log('🔍 SeoTab: Sugestões recebidas:', aiSuggestions);
	});

	// Função de enriquecimento com IA expandida
	async function enrichField(field: string) {
		const fieldMap: Record<string, string> = {
			metaTitle: 'meta_title',
			metaDescription: 'meta_description',
			ogTitle: 'og_title',
			ogDescription: 'og_description',
			keywords: 'meta_keywords'
		};
		
		if (!(field in aiLoading)) return;
		aiLoading[field] = true;
		
		try {
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					field: fieldMap[field],
					currentData: formData,
					category: formData.category_name
				})
			});
			
			if (!response.ok) throw new Error('Erro na resposta da API');
			
			const result = await response.json();
			
			if (result.success) {
				switch (field) {
					case 'metaTitle':
						formData.meta_title = result.data;
						if (!formData.slug) {
							generateSlugFromTitle();
						}
						break;
					case 'metaDescription':
						formData.meta_description = result.data;
						break;
					case 'ogTitle':
						formData.og_title = result.data;
						break;
					case 'ogDescription':
						formData.og_description = result.data;
						break;
					case 'keywords':
						if (Array.isArray(result.data)) {
							formData.meta_keywords = [...formData.meta_keywords, ...result.data];
							updateKeywordsText();
						}
						break;
				}
				
				const fieldNames: Record<string, string> = {
					metaTitle: 'Meta título',
					metaDescription: 'Meta descrição',
					ogTitle: 'Título Open Graph',
					ogDescription: 'Descrição Open Graph',
					keywords: 'Keywords'
				};
				
				toast.success(`${fieldNames[field]} otimizado com IA!`);
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

	// Função para validar URL canônica
	function validateCanonicalUrl(url: string) {
		if (!url) {
			canonicalUrlValid = null;
			return;
		}
		
		try {
			new URL(url);
			canonicalUrlValid = true;
		} catch {
			canonicalUrlValid = false;
		}
	}

	// Função para obter keywords sugeridas baseadas na categoria
	function getCategorySuggestedKeywords(): string[] {
		if (!formData.category_name) return [];
		
		const categoryName = formData.category_name.toLowerCase();
		
		// Procurar por correspondências nas chaves do categoryKeywords
		for (const [key, keywords] of Object.entries(categoryKeywords)) {
			if (categoryName.includes(key) || key.includes(categoryName)) {
				return keywords.filter(keyword => !formData.meta_keywords.includes(keyword));
			}
		}
		
		return [];
	}

	// Inicializar arrays se não existirem
	if (!formData.tags) formData.tags = [];
	if (!formData.meta_keywords) formData.meta_keywords = [];

	// Inicializar campos SEO se não existirem - usando valores padrão seguros
	if (!formData.meta_title) formData.meta_title = '';
	if (!formData.meta_description) formData.meta_description = '';
	if (!formData.robots_meta) formData.robots_meta = 'index,follow';
	if (!formData.canonical_url) formData.canonical_url = '';
	if (!formData.schema_type) formData.schema_type = 'Product';
	if (!formData.og_title) formData.og_title = '';
	if (!formData.og_description) formData.og_description = '';
	if (!formData.og_image) formData.og_image = '';
	if (formData.seo_index === undefined) formData.seo_index = true;
	if (formData.seo_follow === undefined) formData.seo_follow = true;

	// Sincronizar tags com a aba Basic
	$effect(() => {
		if (formData.tags && Array.isArray(formData.tags)) {
			formData.tags_input = formData.tags.join(', ');
		}
	});

	// Atualizar texto das keywords quando o componente carrega
	$effect(() => {
		if (formData.meta_keywords?.length > 0 && !metaKeywordsText) {
			updateKeywordsText();
		}
	});

	// Validar URL canônica quando mudar
	$effect(() => {
		if (formData.canonical_url) {
			validateCanonicalUrl(formData.canonical_url);
		}
	});

	// Funções para gestão de tags - sincronizada com aba Basic
	function addTag() {
		if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
			formData.tags = [...formData.tags, newTag.trim()];
			formData.tags_input = formData.tags.join(', '); // Sincronizar com aba Basic
			newTag = '';
		}
	}

	function removeTag(tag: string) {
		formData.tags = formData.tags.filter((t: string) => t !== tag);
		formData.tags_input = formData.tags.join(', '); // Sincronizar com aba Basic
	}

	function addSuggestedTag(tag: string) {
		if (!formData.tags.includes(tag)) {
			formData.tags = [...formData.tags, tag];
			formData.tags_input = formData.tags.join(', '); // Sincronizar com aba Basic
		}
	}

	// Funções para meta keywords
	function addKeyword() {
		if (newKeyword.trim() && !formData.meta_keywords.includes(newKeyword.trim())) {
			formData.meta_keywords = [...formData.meta_keywords, newKeyword.trim()];
			newKeyword = '';
			updateKeywordsText();
		}
	}

	function addSuggestedKeyword(keyword: string) {
		if (!formData.meta_keywords.includes(keyword)) {
			formData.meta_keywords = [...formData.meta_keywords, keyword];
			updateKeywordsText();
		}
	}

	function removeKeyword(keyword: string) {
		formData.meta_keywords = formData.meta_keywords.filter((k: string) => k !== keyword);
		updateKeywordsText();
	}

	function updateKeywordsText() {
		metaKeywordsText = formData.meta_keywords.join(', ');
	}

	function handleKeywordsTextChange() {
		formData.meta_keywords = metaKeywordsText
			.split(',')
			.map(k => k.trim())
			.filter(k => k.length > 0);
	}

	// Função para gerar slug automático - sincronizada com aba Basic
	function generateSlugFromTitle() {
		if (formData.meta_title) {
			const newSlug = formData.meta_title
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.replace(/[^a-z0-9\s-]/g, '')
				.trim()
				.replace(/\s+/g, '-')
				.replace(/-+/g, '-')
				.substring(0, 100);
			
			// Só atualizar se não tiver slug ainda ou se for diferente
			if (!formData.slug || formData.slug !== newSlug) {
				formData.slug = newSlug;
			}
		}
	}

	// Função para preview da URL - usar domínio mais genérico
	function getFullUrl(): string {
		const baseUrl = 'https://www.marketplace-gdg.com.br/produto/';
		return baseUrl + (formData.slug || 'produto-exemplo');
	}

	// Verificar limites de caracteres
	function getTitleStatus(length: number): { color: string; text: string } {
		if (length === 0) return { color: 'text-gray-500', text: 'Não preenchido' };
		if (length <= 60) return { color: 'text-green-600', text: 'Ideal' };
		if (length <= 70) return { color: 'text-yellow-600', text: 'Aceitável' };
		return { color: 'text-red-600', text: 'Muito longo' };
	}

	function getDescriptionStatus(length: number): { color: string; text: string } {
		if (length === 0) return { color: 'text-gray-500', text: 'Não preenchido' };
		if (length <= 160) return { color: 'text-green-600', text: 'Ideal' };
		if (length <= 180) return { color: 'text-yellow-600', text: 'Aceitável' };
		return { color: 'text-red-600', text: 'Muito longo' };
	}

	// Estados reativos
	let titleStatus = $derived(getTitleStatus((formData.meta_title || '').length));
	let descriptionStatus = $derived(getDescriptionStatus((formData.meta_description || '').length));
	let fullUrl = $derived(getFullUrl());
	let categorySuggestedKeywords = $derived(getCategorySuggestedKeywords());

	// Auto-completar campos OG quando meta campos mudarem
	$effect(() => {
		if (formData.meta_title && !formData.og_title) {
			formData.og_title = formData.meta_title;
		}
		if (formData.meta_description && !formData.og_description) {
			formData.og_description = formData.meta_description;
		}
	});

	// Auto-gerar canonical URL
	$effect(() => {
		if (formData.slug && !formData.canonical_url) {
			formData.canonical_url = `https://www.marketplace-gdg.com.br/produto/${formData.slug}`;
		}
	});
</script>

<div class="space-y-8">
	<!-- SUGESTÕES IA EM LOTE (quando modo revisão ativado) -->
	{#if isAIReviewMode && aiSuggestions.length > 0}
		<div class="bg-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-lg p-6">
			<h3 class="text-lg font-semibold text-[#00BFB3] mb-4 flex items-center gap-2">
				<ModernIcon name="search" size="md" />
				Sugestões IA para SEO e Buscadores
				<span class="px-2 py-1 bg-[#00BFB3] text-white rounded-full text-sm">
					{aiSuggestions.length}
				</span>
			</h3>
			
			<div class="space-y-4">
				{#each aiSuggestions as suggestion}
					<AISuggestionCard {suggestion} {formData} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- META TAGS PRINCIPAIS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="edit" size="md" /> Meta Tags Essenciais
		</h4>

		<div class="space-y-6">
			<!-- Meta Título -->
			<div>
				<div class="flex justify-between items-center mb-2">
					<label class="block text-sm font-medium text-gray-700">
						Meta Título *
					</label>
					<span class="text-xs {titleStatus.color}">
						{(formData.meta_title || '').length}/60 caracteres - {titleStatus.text}
					</span>
				</div>
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={formData.meta_title}
						oninput={generateSlugFromTitle}
						class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="Título otimizado para Google (50-60 caracteres)"
						maxlength="70"
						required
					/>
					<button
						type="button"
						onclick={() => enrichField('metaTitle')}
						disabled={aiLoading.metaTitle || !formData.name}
						class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
						title="Otimizar título para SEO com IA"
					>
						{#if aiLoading.metaTitle}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size="xs" />
						{/if}
						IA
					</button>
				</div>
				<p class="text-xs text-gray-500 mt-1">Título que aparece nos resultados do Google</p>
			</div>

			<!-- Meta Descrição -->
			<div>
				<div class="flex justify-between items-center mb-2">
					<label class="block text-sm font-medium text-gray-700">
						Meta Descrição *
					</label>
					<span class="text-xs {descriptionStatus.color}">
						{(formData.meta_description || '').length}/160 caracteres - {descriptionStatus.text}
					</span>
				</div>
				<div class="flex gap-2">
					<textarea
						bind:value={formData.meta_description}
						rows="3"
						class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors resize-none"
						placeholder="Descrição atrativa para aparecer no Google (140-160 caracteres)"
						maxlength="180"
						required
					></textarea>
					<button
						type="button"
						onclick={() => enrichField('metaDescription')}
						disabled={aiLoading.metaDescription || !formData.name}
						class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
						title="Otimizar descrição para SEO com IA"
					>
						{#if aiLoading.metaDescription}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size="xs" />
						{/if}
						IA
					</button>
				</div>
				<p class="text-xs text-gray-500 mt-1">Descrição que aparece abaixo do título no Google</p>
			</div>
		</div>
	</div>

	<!-- TAGS E KEYWORDS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="sku" size="md" /> Tags e Palavras-chave
		</h4>

		<!-- Tags do Produto -->
		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Tags do Produto
				</label>
				<div class="flex gap-2 mb-3">
					<input
						type="text"
						bind:value={newTag}
						onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), addTag())}
						class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="Digite uma tag e pressione Enter"
					/>
					<button
						type="button"
						onclick={addTag}
						class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors"
					>
						Adicionar
					</button>
				</div>

				<!-- Tags Atuais -->
				{#if formData.tags.length > 0}
					<div class="flex flex-wrap gap-2 mb-4">
						{#each formData.tags as tag}
							<span class="inline-flex items-center gap-1 px-3 py-1 bg-[#00BFB3] text-white text-sm rounded-full">
								{tag}
								<button
									type="button"
									onclick={() => removeTag(tag)}
									class="ml-1 hover:bg-[#00A89D] rounded-full p-0.5 transition-colors"
								>
									✕
								</button>
							</span>
						{/each}
					</div>
				{/if}

				<!-- Tags Sugeridas -->
				<div>
					<p class="text-sm text-gray-600 mb-2">Tags sugeridas:</p>
					<div class="flex flex-wrap gap-2">
						{#each suggestedTags.filter(tag => !formData.tags.includes(tag)) as tag}
							<button
								type="button"
								onclick={() => addSuggestedTag(tag)}
								class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
							>
								+ {tag}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Meta Keywords -->
			<div>
				<div class="flex items-center justify-between mb-2">
					<label class="block text-sm font-medium text-gray-700">
						Meta Keywords (SEO)
					</label>
					<button
						type="button"
						onclick={() => enrichField('keywords')}
						disabled={aiLoading.keywords || !formData.name}
						class="px-3 py-1 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-1 text-sm disabled:opacity-50"
						title="Gerar keywords inteligentes com IA"
					>
						{#if aiLoading.keywords}
							<div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size="xs" />
						{/if}
						IA
					</button>
				</div>
				
				<div class="flex gap-2 mb-3">
					<input
						type="text"
						bind:value={newKeyword}
						onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
						class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="Digite uma palavra-chave e pressione Enter"
					/>
					<button
						type="button"
						onclick={addKeyword}
						class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors"
					>
						Adicionar
					</button>
				</div>

				<!-- Keywords Baseadas na Categoria -->
				{#if categorySuggestedKeywords.length > 0}
					<div class="mb-4">
						<p class="text-sm text-gray-600 mb-2">Keywords sugeridas para "{formData.category_name}":</p>
						<div class="flex flex-wrap gap-2">
							{#each categorySuggestedKeywords as keyword}
								<button
									type="button"
									onclick={() => addSuggestedKeyword(keyword)}
									class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded-full transition-colors"
								>
									+ {keyword}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Keywords Atuais -->
				{#if formData.meta_keywords.length > 0}
					<div class="flex flex-wrap gap-2 mb-4">
						{#each formData.meta_keywords as keyword}
							<span class="inline-flex items-center gap-1 px-3 py-1 bg-[#00BFB3] text-white text-sm rounded-full">
								{keyword}
								<button
									type="button"
									onclick={() => removeKeyword(keyword)}
									class="ml-1 hover:bg-[#00A89D] rounded-full p-0.5 transition-colors"
								>
									✕
								</button>
							</span>
						{/each}
					</div>
				{/if}

				<!-- Campo texto para edição em massa -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Keywords como texto (separadas por vírgula)
					</label>
					<textarea
						bind:value={metaKeywordsText}
						oninput={handleKeywordsTextChange}
						rows="3"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors resize-none"
						placeholder="palavra1, palavra2, palavra3"
					></textarea>
					<p class="text-xs text-gray-500 mt-1">Edite as keywords diretamente como texto separado por vírgulas</p>
				</div>
			</div>
		</div>
	</div>

	<!-- PREVIEW DO GOOGLE E REDES SOCIAIS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="search" size="md" /> Preview em Buscadores e Redes Sociais
		</h4>

		<!-- Simulação do Google -->
		<div class="mb-6">
			<h5 class="font-medium text-gray-800 mb-3 flex items-center gap-2">
				<div class="w-5 h-5 bg-blue-500 rounded-sm"></div>
				Google
			</h5>
			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-sm text-gray-600">
						<div class="w-4 h-4 bg-[#00BFB3] rounded-sm"></div>
						<span>www.marketplace-gdg.com.br › produto › {formData.slug || 'produto-exemplo'}</span>
					</div>
					<h3 class="text-xl text-[#00BFB3] hover:underline cursor-pointer">
						{formData.meta_title || formData.name || 'Título do Produto'}
					</h3>
					<p class="text-sm text-gray-700 leading-relaxed">
						{formData.meta_description || formData.short_description || 'Descrição do produto que aparecerá nos resultados de busca do Google...'}
					</p>
				</div>
			</div>
		</div>

		<!-- Simulação do Facebook -->
		<div class="mb-6">
			<h5 class="font-medium text-gray-800 mb-3 flex items-center gap-2">
				<div class="w-5 h-5 bg-blue-600 rounded-sm"></div>
				Facebook
			</h5>
			<div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
				{#if formData.og_image}
					<div class="h-32 bg-gray-300 flex items-center justify-center">
						<img src={formData.og_image} alt="Preview" class="h-full w-full object-cover" />
					</div>
				{:else}
					<div class="h-32 bg-gray-300 flex items-center justify-center">
						<span class="text-gray-500 text-sm">Imagem OG</span>
					</div>
				{/if}
				<div class="p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide">marketplace-gdg.com.br</p>
					<h3 class="font-semibold text-gray-900 mt-1">
						{formData.og_title || formData.meta_title || formData.name || 'Título do Produto'}
					</h3>
					<p class="text-sm text-gray-600 mt-1">
						{formData.og_description || formData.meta_description || formData.short_description || 'Descrição que aparece quando compartilhado no Facebook...'}
					</p>
				</div>
			</div>
		</div>

		<!-- Simulação do WhatsApp -->
		<div class="mb-6">
			<h5 class="font-medium text-gray-800 mb-3 flex items-center gap-2">
				<div class="w-5 h-5 bg-green-500 rounded-sm"></div>
				WhatsApp
			</h5>
			<div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden max-w-sm">
				{#if formData.og_image}
					<div class="h-40 bg-gray-300 flex items-center justify-center">
						<img src={formData.og_image} alt="Preview" class="h-full w-full object-cover" />
					</div>
				{:else}
					<div class="h-40 bg-gray-300 flex items-center justify-center">
						<span class="text-gray-500 text-sm">Imagem OG</span>
					</div>
				{/if}
				<div class="p-3 bg-white">
					<h3 class="font-semibold text-gray-900 text-sm">
						{formData.og_title || formData.meta_title || formData.name || 'Título do Produto'}
					</h3>
					<p class="text-xs text-gray-600 mt-1">
						{(formData.og_description || formData.meta_description || formData.short_description || 'Descrição que aparece quando compartilhado no WhatsApp...').substring(0, 80)}...
					</p>
					<p class="text-xs text-gray-400 mt-2">marketplace-gdg.com.br</p>
				</div>
			</div>
		</div>

		<!-- Score SEO -->
		<div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-600 mb-1">Score do Título</p>
					<p class="text-2xl font-bold text-[#00BFB3]">{titleStatus.text === 'Ideal' ? '100' : titleStatus.text === 'Aceitável' ? '85' : '70'}%</p>
				</div>
			</div>
			<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-600 mb-1">Score da Descrição</p>
					<p class="text-2xl font-bold text-[#00BFB3]">{descriptionStatus.text === 'Ideal' ? '100' : descriptionStatus.text === 'Aceitável' ? '85' : '70'}%</p>
				</div>
			</div>
			<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-600 mb-1">Score Geral</p>
					<p class="text-2xl font-bold text-[#00BFB3]">{Math.round(((titleStatus.text === 'Ideal' ? 30 : titleStatus.text === 'Aceitável' ? 25 : 20) + (descriptionStatus.text === 'Ideal' ? 30 : descriptionStatus.text === 'Aceitável' ? 25 : 20) + (formData.slug ? 15 : 0) + (formData.og_title ? 15 : 0) + (formData.meta_keywords.length > 3 ? 10 : 0)))}%</p>
				</div>
			</div>
		</div>
	</div>

	<!-- URL E ESTRUTURA -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="url" size="md" /> URL e Estrutura
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Slug da URL
				</label>
				<input
					type="text"
					bind:value={formData.slug}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors font-mono text-sm"
					placeholder="produto-incrivel-2024"
				/>
				<p class="text-xs text-gray-500 mt-1">URL amigável (gerada automaticamente)</p>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
					URL Canônica
					{#if canonicalUrlValid === true}
						<span class="text-green-600">
							<ModernIcon name="check" size="sm" />
						</span>
					{:else if canonicalUrlValid === false}
						<span class="text-red-600">
							<ModernIcon name="warning" size="sm" />
						</span>
					{/if}
				</label>
				<input
					type="url"
					bind:value={formData.canonical_url}
					oninput={() => validateCanonicalUrl(formData.canonical_url)}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors font-mono text-sm {canonicalUrlValid === false ? 'border-red-300' : canonicalUrlValid === true ? 'border-green-300' : ''}"
					placeholder="https://www.marketplace-gdg.com.br/produto/slug"
				/>
				{#if canonicalUrlValid === false}
					<p class="text-xs text-red-600 mt-1">URL inválida. Verifique o formato.</p>
				{:else if canonicalUrlValid === true}
					<p class="text-xs text-green-600 mt-1">URL válida</p>
				{:else}
					<p class="text-xs text-gray-500 mt-1">URL principal do produto (opcional)</p>
				{/if}
			</div>
		</div>

		<!-- Preview da URL -->
		<div class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
			<p class="text-sm font-medium text-gray-700 mb-1">URL Final:</p>
			<p class="text-sm text-[#00BFB3] font-mono">
				https://www.marketplace-gdg.com.br/produto/{formData.slug || 'produto-exemplo'}
			</p>
		</div>
	</div>

	<!-- CONFIGURAÇÕES AVANÇADAS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="Settings" size="md" /> Configurações Avançadas de SEO
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Robots Meta
				</label>
				<select
					bind:value={formData.robots_meta}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				>
					<option value="index,follow">index,follow (recomendado)</option>
					<option value="noindex,follow">noindex,follow</option>
					<option value="index,nofollow">index,nofollow</option>
					<option value="noindex,nofollow">noindex,nofollow</option>
				</select>
				<p class="text-xs text-gray-500 mt-1">Como os buscadores devem tratar esta página</p>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Tipo de Schema
				</label>
				<select
					bind:value={formData.schema_type}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				>
					<option value="Product">Product (recomendado)</option>
					<option value="CreativeWork">CreativeWork</option>
					<option value="Thing">Thing</option>
				</select>
				<p class="text-xs text-gray-500 mt-1">Tipo de dados estruturados</p>
			</div>
		</div>

		<!-- Open Graph -->
		<div class="mt-6 space-y-4">
			<h5 class="font-medium text-gray-900">Open Graph (Redes Sociais)</h5>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						OG: Título
					</label>
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={formData.og_title}
							class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
							placeholder="Título para redes sociais"
						/>
						<button
							type="button"
							onclick={() => enrichField('ogTitle')}
							disabled={aiLoading.ogTitle || !formData.name}
							class="px-3 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
							title="Otimizar título OG com IA"
						>
							{#if aiLoading.ogTitle}
								<div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							{:else}
								<ModernIcon name="robot" size="xs" />
							{/if}
						</button>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						OG: Descrição
					</label>
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={formData.og_description}
							class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
							placeholder="Descrição para redes sociais"
						/>
						<button
							type="button"
							onclick={() => enrichField('ogDescription')}
							disabled={aiLoading.ogDescription || !formData.name}
							class="px-3 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
							title="Otimizar descrição OG com IA"
						>
							{#if aiLoading.ogDescription}
								<div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							{:else}
								<ModernIcon name="robot" size="xs" />
							{/if}
						</button>
					</div>
				</div>
				
				<div class="md:col-span-2">
					<label class="block text-sm font-medium text-gray-700 mb-2">
						OG: Imagem
					</label>
					<input
						type="url"
						bind:value={formData.og_image}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="https://exemplo.com/imagem-social.jpg"
					/>
					<p class="text-xs text-gray-500 mt-1">Imagem que aparece quando compartilhado nas redes sociais (1200x630px recomendado)</p>
				</div>
			</div>
			
			<!-- Configurações SEO Adicionais -->
			<div class="mt-6 space-y-4">
				<h5 class="font-medium text-gray-900">Configurações de Indexação</h5>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label class="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={formData.seo_index}
								class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
							/>
							<div>
								<span class="text-sm font-medium text-gray-900">Permitir Indexação</span>
								<p class="text-xs text-gray-500">Aparecer nos resultados de busca</p>
							</div>
						</label>
					</div>
					
					<div>
						<label class="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={formData.seo_follow}
								class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
							/>
							<div>
								<span class="text-sm font-medium text-gray-900">Seguir Links</span>
								<p class="text-xs text-gray-500">Buscadores podem seguir links desta página</p>
							</div>
						</label>
					</div>
				</div>
			</div>
		</div>
	</div>
</div> 