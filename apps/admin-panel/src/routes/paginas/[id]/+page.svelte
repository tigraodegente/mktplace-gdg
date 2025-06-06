<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { api } from '$lib/services/api';
	import { toast } from '$lib/stores/toast';
	
	let loading = $state(false);
	let loadingPage = $state(true);
	let pageId = $state('');
	let formData = $state({
		title: '',
		slug: '',
		content: '',
		excerpt: '',
		metaTitle: '',
		metaDescription: '',
		isPublished: true,
		featuredImage: '',
		template: 'default'
	});
	
	// Carregar dados da página
	async function loadPage() {
		if (!pageId) return;
		
		loadingPage = true;
		try {
			const response = await api.get(`/pages/${pageId}`);
			
			if (response.success && response.data) {
				const pageData = response.data;
				formData = {
					title: pageData.title || '',
					slug: pageData.slug || '',
					content: pageData.content || '',
					excerpt: pageData.excerpt || '',
					metaTitle: pageData.metaTitle || '',
					metaDescription: pageData.metaDescription || '',
					isPublished: pageData.isPublished !== false,
					featuredImage: pageData.featuredImage || '',
					template: pageData.template || 'default'
				};
			} else {
				toast.error('Página não encontrada');
				goto('/paginas');
			}
		} catch (error) {
			console.error('Erro ao carregar página:', error);
			toast.error('Erro ao carregar página');
			goto('/paginas');
		} finally {
			loadingPage = false;
		}
	}
	
	// Validar formulário
	function isFormValid() {
		return formData.title.trim() && formData.slug.trim();
	}
	
	// Atualizar página
	async function handleSave() {
		if (!isFormValid()) {
			toast.error('Título e slug são obrigatórios');
			return;
		}
		
		loading = true;
		try {
			// Se não tem metaTitle, usar o title
			if (!formData.metaTitle) {
				formData.metaTitle = formData.title;
			}
			
			const response = await api.put('/pages', {
				id: pageId,
				...formData
			});
			
			if (response.success) {
				toast.success('Página atualizada com sucesso!');
				goto('/paginas');
			} else {
				toast.error(response.error || 'Erro ao atualizar página');
			}
		} catch (error) {
			console.error('Erro ao salvar página:', error);
			toast.error('Erro interno do servidor');
		} finally {
			loading = false;
		}
	}
	
	// Verificar autenticação simples
	function checkAuth() {
		if (typeof window === 'undefined') return;
		
		const token = localStorage.getItem('access_token');
		if (!token) {
			goto('/login');
		}
	}
	
	onMount(() => {
		checkAuth();
		
		// Obter ID da página da URL
		const unsubscribe = page.subscribe(($page) => {
			const id = $page.params.id;
			if (id && id !== pageId) {
				pageId = id;
				loadPage();
			}
		});
		
		return unsubscribe;
	});
</script>

{#if loadingPage}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-gray-600">Carregando página...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<div class="bg-white border-b">
			<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Editar Página</h1>
						<p class="text-gray-600 mt-1">Editando: {formData.title}</p>
					</div>
					<div class="flex gap-3">
						<button
							type="button"
							onclick={() => goto('/paginas')}
							class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
						>
							Cancelar
						</button>
						<button
							type="button"
							onclick={handleSave}
							disabled={loading || !isFormValid()}
							class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{#if loading}
								<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							{/if}
							{loading ? 'Salvando...' : 'Atualizar'}
						</button>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Content -->
		<div class="max-w-4xl mx-auto p-6 space-y-6">
			
			<!-- Informações Básicas -->
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					
					<!-- Título -->
					<div class="space-y-2">
						<label class="block text-sm font-medium text-gray-700">Título *</label>
						<input
							type="text"
							bind:value={formData.title}
							placeholder="Título da página"
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
						/>
					</div>
					
					<!-- Slug -->
					<div class="space-y-2">
						<label class="block text-sm font-medium text-gray-700">Slug (URL) *</label>
						<input
							type="text"
							bind:value={formData.slug}
							placeholder="url-da-pagina"
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
						/>
						<p class="text-xs text-gray-500">A URL será: /{formData.slug}</p>
					</div>
					
					<!-- Template -->
					<div class="space-y-2">
						<label class="block text-sm font-medium text-gray-700">Template</label>
						<select 
							bind:value={formData.template}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
						>
							<option value="default">Padrão</option>
							<option value="landing">Landing Page</option>
							<option value="blog">Blog Post</option>
						</select>
					</div>
					
					<!-- Status -->
					<div class="space-y-2">
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								bind:checked={formData.isPublished}
								class="rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
							/>
							<span class="text-sm font-medium text-gray-700">Página publicada</span>
						</label>
					</div>
					
				</div>
			</div>
			
			<!-- Conteúdo -->
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Conteúdo</h3>
				
				<!-- Excerpt -->
				<div class="space-y-2 mb-6">
					<label class="block text-sm font-medium text-gray-700">Resumo</label>
					<textarea
						bind:value={formData.excerpt}
						placeholder="Breve descrição da página"
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
					></textarea>
				</div>
				
				<!-- Conteúdo Principal -->
				<div class="space-y-2">
					<label class="block text-sm font-medium text-gray-700">Conteúdo Principal</label>
					<textarea
						bind:value={formData.content}
						placeholder="Conteúdo da página em HTML ou Markdown"
						rows="15"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent font-mono text-sm"
					></textarea>
				</div>
				
			</div>
			
			<!-- SEO -->
			<div class="bg-white rounded-lg border border-gray-200 p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">SEO & Meta Tags</h3>
				<div class="space-y-6">
					
					<!-- Meta Title -->
					<div class="space-y-2">
						<label class="block text-sm font-medium text-gray-700">Meta Title</label>
						<input
							type="text"
							bind:value={formData.metaTitle}
							placeholder="Título para SEO (deixe vazio para usar o título da página)"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
						/>
					</div>
					
					<!-- Meta Description -->
					<div class="space-y-2">
						<label class="block text-sm font-medium text-gray-700">Meta Description</label>
						<textarea
							bind:value={formData.metaDescription}
							placeholder="Descrição para motores de busca"
							rows="3"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
						></textarea>
					</div>
					
					<!-- Featured Image -->
					<div class="space-y-2">
						<label class="block text-sm font-medium text-gray-700">Imagem Destacada (URL)</label>
						<input
							type="url"
							bind:value={formData.featuredImage}
							placeholder="https://exemplo.com/imagem.jpg"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
						/>
					</div>
					
				</div>
			</div>
			
		</div>
	</div>
{/if}

<svelte:head>
	<title>Editar Página - Admin</title>
	<meta name="description" content="Editar página existente" />
</svelte:head> 