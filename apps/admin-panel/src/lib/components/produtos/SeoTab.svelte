<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';
	
	let { formData = $bindable() } = $props();

	// Estados de loading para IA
	let aiLoading = $state({
		metaTitle: false,
		metaDescription: false
	});

	// Função de enriquecimento com IA
	async function enrichField(field: string) {
		const fieldMap = {
			metaTitle: 'meta_title',
			metaDescription: 'meta_description'
		};
		
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
				// Aplicar o resultado ao campo específico
				if (field === 'metaTitle') {
					formData.meta_title = result.data;
				} else if (field === 'metaDescription') {
					formData.meta_description = result.data;
				}
				
				toast.success(`${field === 'metaTitle' ? 'Meta título' : 'Meta descrição'} otimizado com IA!`);
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

	// Inicializar campos SEO se não existirem
	if (!formData.meta_title) formData.meta_title = '';
	if (!formData.meta_description) formData.meta_description = '';
	if (!formData.robots_meta) formData.robots_meta = 'index,follow';
	if (!formData.canonical_url) formData.canonical_url = '';
	if (!formData.schema_type) formData.schema_type = 'Product';
	if (!formData.og_title) formData.og_title = '';
	if (!formData.og_description) formData.og_description = '';

	// Função para gerar slug automático
	function generateSlugFromTitle() {
		if (formData.meta_title) {
			formData.slug = formData.meta_title
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.replace(/[^a-z0-9\s-]/g, '')
				.trim()
				.replace(/\s+/g, '-')
				.replace(/-+/g, '-')
				.substring(0, 100);
		}
	}

	// Função para preview da URL
	function getFullUrl(): string {
		const baseUrl = 'https://loja.com/produto/';
		return baseUrl + (formData.slug || 'nome-do-produto');
	}

	// Verificar limites de caracteres
	function getTitleStatus(length: number): { color: string; text: string } {
		if (length === 0) return { color: 'text-slate-500', text: 'Não preenchido' };
		if (length <= 60) return { color: 'text-green-600', text: 'Ideal' };
		if (length <= 70) return { color: 'text-amber-600', text: 'Aceitável' };
		return { color: 'text-red-600', text: 'Muito longo' };
	}

	function getDescriptionStatus(length: number): { color: string; text: string } {
		if (length === 0) return { color: 'text-slate-500', text: 'Não preenchido' };
		if (length <= 160) return { color: 'text-green-600', text: 'Ideal' };
		if (length <= 180) return { color: 'text-amber-600', text: 'Aceitável' };
		return { color: 'text-red-600', text: 'Muito longo' };
	}

	// Estados reativos
	let titleStatus = $derived(getTitleStatus((formData.meta_title || '').length));
	let descriptionStatus = $derived(getDescriptionStatus((formData.meta_description || '').length));
	let fullUrl = $derived(getFullUrl());
</script>

<div class="space-y-8">
	<div class="mb-6">
		<h3 class="text-xl font-semibold text-slate-900 mb-2">Otimização SEO</h3>
		<p class="text-slate-600">Meta dados e otimização para mecanismos de busca</p>
	</div>

	<!-- META TAGS BÁSICAS -->
	<div class="bg-gradient-to-r from-[#00BFB3]/10 to-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
			</svg>
			Meta Tags Essenciais
		</h4>

		<div class="space-y-6">
			<!-- Meta Título -->
			<div>
				<div class="flex justify-between items-center mb-2">
					<label class="block text-sm font-medium text-slate-700">
						📝 Meta Título *
					</label>
					<span class="text-xs {titleStatus.color}">
						{(formData.meta_title || '').length}/60 caracteres
					</span>
				</div>
				<div class="flex gap-2">
				<input
					type="text"
					bind:value={formData.meta_title}
						oninput={generateSlugFromTitle}
						class="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Título otimizado para Google (50-60 caracteres)"
					maxlength="60"
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
							<ModernIcon name="robot" size={20} color="white" />
							<span class="text-sm font-medium">IA</span>
						{/if}
					</button>
				</div>
				<p class="text-xs text-slate-500 mt-1">Título que aparece nos resultados do Google</p>
			</div>

			<!-- Meta Descrição -->
			<div>
				<div class="flex justify-between items-center mb-2">
					<label class="block text-sm font-medium text-slate-700">
						📄 Meta Descrição *
					</label>
					<span class="text-xs {descriptionStatus.color}">
						{(formData.meta_description || '').length}/160 caracteres
					</span>
				</div>
				<div class="flex gap-2">
				<textarea
					bind:value={formData.meta_description}
						oninput={() => descriptionStatus = getDescriptionStatus(formData.meta_description.length)}
					rows="3"
						class="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors resize-none"
					placeholder="Descrição atrativa para aparecer no Google (140-160 caracteres)"
					maxlength="160"
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
							<ModernIcon name="robot" size={20} color="white" />
							<span class="text-sm font-medium">IA</span>
						{/if}
					</button>
				</div>
				<p class="text-xs text-slate-500 mt-1">Descrição que aparece abaixo do título no Google</p>
			</div>
		</div>
	</div>

	<!-- PREVIEW DO GOOGLE -->
	<div class="bg-gradient-to-r from-[#00BFB3]/8 to-[#00BFB3]/12 border border-[#00BFB3]/25 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
			</svg>
			Preview no Google
		</h4>

		<!-- Simulação do Google -->
		<div class="bg-white rounded-lg p-4 border border-[#00BFB3]/30">
			<div class="space-y-2">
				<div class="flex items-center gap-2 text-sm text-slate-600">
					<div class="w-4 h-4 bg-[#00BFB3] rounded-sm"></div>
					<span>www.sualoja.com.br › produto › {formData.slug || 'produto-exemplo'}</span>
				</div>
				<h3 class="text-xl text-[#00BFB3] hover:underline cursor-pointer">
					{formData.meta_title || formData.name || 'Título do Produto'}
				</h3>
				<p class="text-sm text-slate-700 leading-relaxed">
					{formData.meta_description || formData.short_description || 'Descrição do produto que aparecerá nos resultados de busca do Google...'}
				</p>
			</div>
		</div>

		<!-- Score SEO -->
		<div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="bg-white rounded-lg p-3 border border-[#00BFB3]/30">
				<div class="text-center">
					<p class="text-sm text-slate-600 mb-1">Score do Título</p>
					<p class="text-2xl font-bold text-[#00BFB3]">{titleStatus.text === 'Ideal' ? '100' : '80'}%</p>
				</div>
			</div>
			<div class="bg-white rounded-lg p-3 border border-[#00BFB3]/30">
				<div class="text-center">
					<p class="text-sm text-slate-600 mb-1">Score da Descrição</p>
					<p class="text-2xl font-bold text-[#00BFB3]">{descriptionStatus.text === 'Ideal' ? '100' : '80'}%</p>
				</div>
			</div>
			<div class="bg-white rounded-lg p-3 border border-[#00BFB3]/30">
				<div class="text-center">
					<p class="text-sm text-slate-600 mb-1">Score Geral</p>
					<p class="text-2xl font-bold text-[#00BFB3]">{Math.round(((titleStatus.text === 'Ideal' ? 40 : 0) + (descriptionStatus.text === 'Ideal' ? 40 : 0) + (formData.slug ? 20 : 0)))}%</p>
				</div>
			</div>
		</div>
	</div>

	<!-- URL E ESTRUTURA -->
	<div class="bg-gradient-to-r from-[#00BFB3]/6 to-[#00BFB3]/10 border border-[#00BFB3]/20 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
			</svg>
			URL e Estrutura
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Slug da URL -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					🔗 Slug da URL
				</label>
				<input
					type="text"
					bind:value={formData.slug}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors font-mono text-sm"
					placeholder="produto-incrivel-2024"
				/>
				<p class="text-xs text-slate-500 mt-1">URL amigável (gerada automaticamente)</p>
			</div>

			<!-- URL Canônica -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					🌐 URL Canônica
				</label>
				<input
					type="url"
					bind:value={formData.canonical_url}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors font-mono text-sm"
					placeholder="https://www.sualoja.com.br/produto/slug"
				/>
				<p class="text-xs text-slate-500 mt-1">URL principal do produto (opcional)</p>
			</div>
		</div>

		<!-- Preview da URL -->
		<div class="mt-4 p-3 bg-[#00BFB3]/10 border border-[#00BFB3]/30 rounded-lg">
			<p class="text-sm font-medium text-slate-700 mb-1">URL Final:</p>
			<p class="text-sm text-[#00BFB3] font-mono">
				https://www.sualoja.com.br/produto/{formData.slug || 'produto-exemplo'}
			</p>
		</div>
	</div>

	<!-- CONFIGURAÇÕES AVANÇADAS -->
	<div class="bg-gradient-to-r from-[#00BFB3]/4 to-[#00BFB3]/8 border border-[#00BFB3]/15 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			Configurações Avançadas de SEO
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Robots Meta -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					�� Robots Meta
				</label>
				<select
					bind:value={formData.robots_meta}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				>
					<option value="index,follow">index,follow (recomendado)</option>
					<option value="noindex,follow">noindex,follow</option>
					<option value="index,nofollow">index,nofollow</option>
					<option value="noindex,nofollow">noindex,nofollow</option>
				</select>
				<p class="text-xs text-slate-500 mt-1">Como os buscadores devem tratar esta página</p>
			</div>

			<!-- Schema Type -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					📊 Tipo de Schema
				</label>
				<select
					bind:value={formData.schema_type}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				>
					<option value="Product">Product (recomendado)</option>
					<option value="CreativeWork">CreativeWork</option>
					<option value="Thing">Thing</option>
				</select>
				<p class="text-xs text-slate-500 mt-1">Tipo de dados estruturados</p>
			</div>
		</div>

		<!-- Open Graph -->
		<div class="mt-6 space-y-4">
			<h5 class="font-medium text-slate-900">Open Graph (Redes Sociais)</h5>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-2">
						📱 OG: Título
					</label>
					<input
						type="text"
						bind:value={formData.og_title}
						class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="Título para redes sociais"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-slate-700 mb-2">
						📝 OG: Descrição
					</label>
					<input
						type="text"
						bind:value={formData.og_description}
						class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="Descrição para redes sociais"
					/>
				</div>
			</div>
		</div>
	</div>
</div> 