<script lang="ts">
	import ModernIcon from '../shared/ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';
	import { goto } from '$app/navigation';
	
	let { 
		show = $bindable(false), 
		productId = '', 
		productName = '', 
		productSku = '' 
	} = $props();
	
	let duplicating = false;
	let duplicateName = '';
	let duplicateSku = '';
	let duplicateSlug = '';
	
	// Opções de duplicação
	let includeImages = true;
	let includeVariants = true;
	let includeCategories = true;
	let includeAttributes = true;
	let includeSpecifications = true;
	let includeSeo = false;
	let resetStock = true;
	let setAsDraft = true;
	
	// Quando abrir modal, gerar valores padrão
	$effect(() => {
		if (show && productName) {
			const timestamp = Date.now();
			duplicateName = `${productName} - Cópia`;
			duplicateSku = `${productSku}-COPY-${timestamp}`;
			duplicateSlug = `${productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-copy-${timestamp}`;
		}
	});
	
	// Executar duplicação
	async function performDuplication() {
		if (!duplicateName.trim() || !duplicateSku.trim()) {
			toast.error('Nome e SKU são obrigatórios');
			return;
		}
		
		duplicating = true;
		
		try {
			const response = await fetch(`/api/products/${productId}/duplicate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${localStorage.getItem('access_token')}`
				},
				body: JSON.stringify({
					name: duplicateName.trim(),
					sku: duplicateSku.trim(),
					slug: duplicateSlug.trim(),
					options: {
						includeImages,
						includeVariants,
						includeCategories,
						includeAttributes,
						includeSpecifications,
						includeSeo,
						resetStock,
						setAsDraft
					}
				})
			});
			
			const result = await response.json();
			
			if (response.ok && result.success) {
				toast.success(`Produto "${duplicateName}" duplicado com sucesso!`);
				show = false;
				goto(`/produtos/${result.data.id}`);
			} else {
				toast.error(result.error || 'Erro ao duplicar produto');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao duplicar produto');
		} finally {
			duplicating = false;
		}
	}
	
	// Cancelar e fechar modal
	function cancel() {
		show = false;
		duplicateName = '';
		duplicateSku = '';
		duplicateSlug = '';
	}
</script>

{#if show}
	<!-- Modal Overlay -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
		<div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
			
			<!-- Header -->
			<div class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] text-white p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
							<ModernIcon name="Copy" size="lg" />
						</div>
						<div>
							<h3 class="text-xl font-bold">Duplicar Produto</h3>
							<p class="text-white/80 text-sm">Configure as opções para a duplicação</p>
						</div>
					</div>
					
					<button
						on:click={cancel}
						class="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 backdrop-blur-sm"
					>
						<ModernIcon name="X" size="md" />
					</button>
				</div>
			</div>
			
			<!-- Content -->
			<div class="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
				
				<!-- Informações Básicas -->
				<div class="mb-6">
					<h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<ModernIcon name="Edit" size="sm" />
						Informações do Novo Produto
					</h4>
					
					<div class="space-y-4">
						<!-- Nome -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Nome do Produto *
							</label>
							<input
								type="text"
								bind:value={duplicateName}
								class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all duration-200"
								placeholder="Digite o nome do novo produto"
							/>
						</div>
						
						<!-- SKU -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								SKU *
							</label>
							<input
								type="text"
								bind:value={duplicateSku}
								class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all duration-200"
								placeholder="Digite o SKU único"
							/>
						</div>
						
						<!-- Slug -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Slug (URL)
							</label>
							<input
								type="text"
								bind:value={duplicateSlug}
								class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all duration-200"
								placeholder="slug-do-produto"
							/>
						</div>
					</div>
				</div>
				
				<!-- Opções de Duplicação -->
				<div class="mb-6">
					<h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<ModernIcon name="Settings" size="sm" />
						O que Duplicar?
					</h4>
					
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<!-- Imagens -->
						<label class="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
							<input
								type="checkbox"
								bind:checked={includeImages}
								class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
							/>
							<div class="flex items-center gap-2">
								<ModernIcon name="image" size="sm" />
								<span class="text-sm font-medium text-gray-700">Imagens</span>
							</div>
						</label>
						
						<!-- Variações -->
						<label class="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
							<input
								type="checkbox"
								bind:checked={includeVariants}
								class="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
							/>
							<div class="flex items-center gap-2">
								<ModernIcon name="Layers" size="sm" />
								<span class="text-sm font-medium text-gray-700">Variações</span>
							</div>
						</label>
						
						<!-- Categorias -->
						<label class="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
							<input
								type="checkbox"
								bind:checked={includeCategories}
								class="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
							/>
							<div class="flex items-center gap-2">
								<ModernIcon name="category" size="sm" />
								<span class="text-sm font-medium text-gray-700">Categorias</span>
							</div>
						</label>
						
						<!-- Atributos -->
						<label class="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
							<input
								type="checkbox"
								bind:checked={includeAttributes}
								class="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
							/>
							<div class="flex items-center gap-2">
								<ModernIcon name="filter" size="sm" />
								<span class="text-sm font-medium text-gray-700">Atributos</span>
							</div>
						</label>
						
						<!-- Especificações -->
						<label class="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
							<input
								type="checkbox"
								bind:checked={includeSpecifications}
								class="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
							/>
							<div class="flex items-center gap-2">
								<ModernIcon name="FileText" size="sm" />
								<span class="text-sm font-medium text-gray-700">Especificações</span>
							</div>
						</label>
						
						<!-- SEO -->
						<label class="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
							<input
								type="checkbox"
								bind:checked={includeSeo}
								class="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
							/>
							<div class="flex items-center gap-2">
								<ModernIcon name="search" size="sm" />
								<span class="text-sm font-medium text-gray-700">SEO</span>
							</div>
						</label>
					</div>
				</div>
				
				<!-- Configurações de Segurança -->
				<div class="mb-6">
					<h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<ModernIcon name="shield" size="sm" />
						Configurações de Segurança
					</h4>
					
					<div class="space-y-3">
						<!-- Zerar Estoque -->
						<label class="flex items-start gap-3 p-4 border border-orange-200 bg-orange-50 rounded-xl cursor-pointer">
							<input
								type="checkbox"
								bind:checked={resetStock}
								class="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-0.5"
							/>
							<div>
								<div class="flex items-center gap-2 mb-1">
									<ModernIcon name="AlertTriangle" size="xs" />
									<span class="text-sm font-medium text-orange-800">Zerar Estoque</span>
								</div>
								<p class="text-xs text-orange-700">
									Recomendado: O produto duplicado começará com estoque zerado para evitar vendas acidentais.
								</p>
							</div>
						</label>
						
						<!-- Definir como Rascunho -->
						<label class="flex items-start gap-3 p-4 border border-blue-200 bg-blue-50 rounded-xl cursor-pointer">
							<input
								type="checkbox"
								bind:checked={setAsDraft}
								class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
							/>
							<div>
								<div class="flex items-center gap-2 mb-1">
									<ModernIcon name="draft" size="xs" />
									<span class="text-sm font-medium text-blue-800">Definir como Rascunho</span>
								</div>
								<p class="text-xs text-blue-700">
									Recomendado: O produto duplicado não ficará visível na loja até ser publicado manualmente.
								</p>
							</div>
						</label>
					</div>
				</div>
			</div>
			
			<!-- Footer -->
			<div class="p-6 border-t bg-gray-50/50">
				<div class="flex items-center justify-end gap-3">
					<button
						on:click={cancel}
						disabled={duplicating}
						class="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
					>
						Cancelar
					</button>
					
					<button
						on:click={performDuplication}
						disabled={duplicating || !duplicateName.trim() || !duplicateSku.trim()}
						class="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
					>
						{#if duplicating}
							<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							Duplicando...
						{:else}
							<ModernIcon name="Copy" size="sm" />
							Duplicar Produto
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if} 