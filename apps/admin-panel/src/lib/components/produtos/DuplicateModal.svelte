<script lang="ts">
	import ModernIcon from '../shared/ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	
	let { 
		show = $bindable(false), 
		productId = '', 
		productName = '', 
		productSku = '' 
	} = $props();
	
	let duplicating = false;
	let duplicateName = $state('');
	let duplicateSku = $state('');
	
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
		}
	});
	
	// Executar duplicação
	async function performDuplication() {
		if (!duplicateName.trim()) {
			toast.error('Nome do produto é obrigatório');
			return;
		}
		
		let finalSku = duplicateSku.trim();
		if (!finalSku) {
			const timestamp = Date.now();
			finalSku = `${productSku}-COPY-${timestamp}`;
		}
		
		duplicating = true;
		
		try {
			// Obter token do authStore
			const token = localStorage.getItem('access_token');
			
			console.log('🔐 DEBUG AUTH - Token existe?', !!token);
			console.log('🔐 DEBUG AUTH - Token primeiros 20 chars:', token ? token.substring(0, 20) : 'N/A');
			
			if (!token) {
				toast.error('Sessão expirada. Faça login novamente.');
				goto('/login');
				return;
			}
			
			const requestBody = {
				name: duplicateName.trim(),
				sku: finalSku,
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
			};
			
			console.log('📤 DEBUG REQUEST - URL:', `/api/products/${productId}/duplicate`);
			console.log('📤 DEBUG REQUEST - Headers:', {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token ? token.substring(0, 20) : 'N/A'}...`
			});
			console.log('📤 DEBUG REQUEST - Body:', requestBody);
			
			const response = await fetch(`/api/products/${productId}/duplicate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify(requestBody)
			});
			
			console.log('📥 DEBUG RESPONSE - Status:', response.status);
			console.log('📥 DEBUG RESPONSE - Status Text:', response.statusText);
			console.log('📥 DEBUG RESPONSE - Headers:', Object.fromEntries(response.headers.entries()));
			
			const result = await response.json();
			console.log('📥 DEBUG RESPONSE - Body:', result);
			
			if (response.ok && result.success) {
				toast.success(`Produto "${duplicateName}" duplicado com sucesso!`);
				show = false;
				goto(`/produtos/${result.data.id}`);
			} else {
				console.error('❌ DEBUG - Erro na resposta:', result);
				toast.error(result.error || 'Erro ao duplicar produto');
			}
		} catch (error) {
			console.error('❌ DEBUG - Erro de rede:', error);
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
	}
</script>

{#if show}
	<!-- Modal Overlay -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
		<div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
			
			<!-- Header Verde Chapado -->
			<div class="bg-cyan-500 text-white p-6">
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
						onclick={() => cancel()}
						class="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 backdrop-blur-sm"
					>
						<ModernIcon name="X" size="md" />
					</button>
				</div>
			</div>
			
			<!-- Content -->
			<div class="p-6">
				
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
								class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
								placeholder="Digite o nome do novo produto"
							/>
						</div>
						
						<!-- SKU -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								SKU (Opcional - será gerado automaticamente)
							</label>
							<input
								type="text"
								bind:value={duplicateSku}
								class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
								placeholder="Deixe em branco para gerar automaticamente"
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
					
					<div class="grid grid-cols-2 gap-4">
						<label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
							<input type="checkbox" bind:checked={includeImages} class="rounded text-cyan-600 focus:ring-cyan-500" />
							<span class="text-sm text-gray-700">Imagens</span>
						</label>
						
						<label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
							<input type="checkbox" bind:checked={includeVariants} class="rounded text-cyan-600 focus:ring-cyan-500" />
							<span class="text-sm text-gray-700">Variações</span>
						</label>
						
						<label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
							<input type="checkbox" bind:checked={includeCategories} class="rounded text-cyan-600 focus:ring-cyan-500" />
							<span class="text-sm text-gray-700">Categorias</span>
						</label>
						
						<label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
							<input type="checkbox" bind:checked={includeAttributes} class="rounded text-cyan-600 focus:ring-cyan-500" />
							<span class="text-sm text-gray-700">Atributos</span>
						</label>
						
						<label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
							<input type="checkbox" bind:checked={includeSpecifications} class="rounded text-cyan-600 focus:ring-cyan-500" />
							<span class="text-sm text-gray-700">Especificações</span>
						</label>
						
						<label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
							<input type="checkbox" bind:checked={includeSeo} class="rounded text-cyan-600 focus:ring-cyan-500" />
							<span class="text-sm text-gray-700">SEO</span>
						</label>
					</div>
				</div>
				
				<!-- Configurações de Segurança -->
				<div class="mb-6">
					<h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<ModernIcon name="Shield" size="sm" />
						Configurações de Segurança
					</h4>
					
					<div class="space-y-3">
						<label class="flex items-start gap-3 p-4 border border-orange-200 bg-orange-50 rounded-lg cursor-pointer">
							<input type="checkbox" bind:checked={resetStock} class="mt-1 rounded text-orange-600 focus:ring-orange-500" />
							<div>
								<span class="text-sm font-medium text-orange-800">Zerar Estoque</span>
								<p class="text-xs text-orange-700">Recomendado: O produto duplicado começará com estoque zerado.</p>
							</div>
						</label>
						
						<label class="flex items-start gap-3 p-4 border border-[#00BFB3]/30 bg-[#00BFB3]/5 rounded-lg cursor-pointer">
							<input type="checkbox" bind:checked={setAsDraft} class="mt-1 rounded text-[#00BFB3] focus:ring-[#00BFB3]" />
							<div>
								<span class="text-sm font-medium text-[#00BFB3]">Definir como Rascunho</span>
								<p class="text-xs text-gray-600">Recomendado: O produto duplicado não ficará visível na loja.</p>
							</div>
						</label>
					</div>
				</div>
			</div>
			
			<!-- Footer -->
			<div class="p-6 border-t bg-gray-50/50">
				<div class="flex items-center justify-end gap-3">
					<button
						onclick={() => cancel()}
						disabled={duplicating}
						class="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
					>
						Cancelar
					</button>
					
					<button
						onclick={() => performDuplication()}
						disabled={duplicating || !duplicateName.trim()}
						class="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
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