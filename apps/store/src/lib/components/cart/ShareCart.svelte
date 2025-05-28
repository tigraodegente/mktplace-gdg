<script lang="ts">
	import { fade, scale, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { CartItem } from '$lib/types/cart';
	import { 
		generateCartLink, 
		generateShortLink, 
		copyToClipboard, 
		generateQRCodeUrl 
	} from '$lib/services/cartLinkService';
	
	interface ShareCartProps {
		items: CartItem[];
		isOpen: boolean;
		onClose: () => void;
	}
	
	let { items, isOpen = $bindable(false), onClose }: ShareCartProps = $props();
	
	// Estados
	let cartLink = $state('');
	let shortLink = $state('');
	let qrCodeUrl = $state('');
	let loading = $state(false);
	let copied = $state(false);
	let error = $state('');
	let activeTab = $state<'link' | 'qr'>('link');
	
	// Gerar links quando abrir
	$effect(() => {
		if (isOpen && items.length > 0) {
			generateLinks();
		}
	});
	
	async function generateLinks() {
		loading = true;
		error = '';
		
		try {
			// Gerar link completo
			cartLink = generateCartLink(items);
			
			// Gerar QR Code
			qrCodeUrl = generateQRCodeUrl(cartLink);
			
			// Gerar link curto (simulado)
			shortLink = await generateShortLink(cartLink);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erro ao gerar link';
		} finally {
			loading = false;
		}
	}
	
	async function handleCopy(text: string) {
		const success = await copyToClipboard(text);
		if (success) {
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		}
	}
	
	function shareViaWhatsApp() {
		const text = `Olha só o que separei para comprar: ${shortLink || cartLink}`;
		const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
		window.open(url, '_blank');
	}
	
	function shareViaEmail() {
		const subject = 'Meu carrinho de compras';
		const body = `Olá!\n\nSeparei alguns produtos que gostei:\n${shortLink || cartLink}\n\nDê uma olhada!`;
		const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
		window.location.href = url;
	}
	
	// Prevenir propagação de eventos
	function handleModalClick(e: MouseEvent) {
		e.stopPropagation();
	}
</script>

{#if isOpen}
	<!-- Overlay -->
	<button 
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 cursor-default"
		transition:fade={{ duration: 200 }}
		onclick={onClose}
		aria-label="Fechar modal de compartilhamento"
		type="button"
	></button>
	
	<!-- Modal -->
	<div 
		class="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 w-full sm:max-w-md sm:mx-4 max-h-[90vh] overflow-hidden flex flex-col"
		transition:scale={{ duration: 300, easing: cubicOut }}
		onclick={handleModalClick}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="share-modal-title"
		tabindex="-1"
	>
		<!-- Header -->
		<div class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] p-4 sm:p-6 rounded-t-2xl sm:rounded-t-2xl flex-shrink-0">
			<!-- Indicador de arraste no mobile -->
			<div class="w-12 h-1 bg-white/30 rounded-full mx-auto mb-3 sm:hidden"></div>
			
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 sm:gap-3">
					<div class="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-lg">
						<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-2.684-4.026m-9.032 0a3 3 0 002.684 4.026m9.032 0l-2.684-4.026M12 9a3 3 0 100-6 3 3 0 000 6z" />
						</svg>
					</div>
					<div>
						<h3 id="share-modal-title" class="text-lg sm:text-xl font-bold text-white">Compartilhar Carrinho</h3>
						<p class="text-white/80 text-xs sm:text-sm">{items.length} {items.length === 1 ? 'item' : 'itens'} selecionados</p>
					</div>
				</div>
				<button 
					onclick={onClose}
					class="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
					aria-label="Fechar modal"
					type="button"
				>
					<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
		
		<!-- Tabs -->
		<div class="flex border-b border-gray-200 flex-shrink-0" role="tablist">
			<button 
				onclick={() => activeTab = 'link'}
				class="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium transition-all duration-200 {activeTab === 'link' ? 'text-[#00BFB3] border-b-2 border-[#00BFB3]' : 'text-gray-600 hover:text-gray-900'}"
				role="tab"
				aria-selected={activeTab === 'link'}
				aria-controls="tab-panel-link"
				type="button"
			>
				<svg class="w-4 h-4 sm:w-5 sm:h-5 inline mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
				</svg>
				Link
			</button>
			<button 
				onclick={() => activeTab = 'qr'}
				class="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium transition-all duration-200 {activeTab === 'qr' ? 'text-[#00BFB3] border-b-2 border-[#00BFB3]' : 'text-gray-600 hover:text-gray-900'}"
				role="tab"
				aria-selected={activeTab === 'qr'}
				aria-controls="tab-panel-qr"
				type="button"
			>
				<svg class="w-4 h-4 sm:w-5 sm:h-5 inline mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h8m-4 0v8m-4 0h2M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m10-16h2a2 2 0 012 2v2m-2 12v2a2 2 0 01-2 2h-2" />
				</svg>
				QR Code
			</button>
		</div>
		
		<!-- Content -->
		<div class="p-4 sm:p-6 flex-1 overflow-y-auto">
			{#if loading}
				<div class="flex items-center justify-center py-12">
					<svg class="animate-spin h-8 w-8 text-[#00BFB3]" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				</div>
			{:else if error}
				<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
					{error}
				</div>
			{:else}
				{#if activeTab === 'link'}
					<div id="tab-panel-link" class="space-y-4" role="tabpanel" transition:fade={{ duration: 200 }}>
						<!-- Link curto -->
						{#if shortLink}
							<div>
								<label for="short-link" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Link curto</label>
								<div class="flex gap-1.5 sm:gap-2">
									<input 
										id="short-link"
										type="text" 
										value={shortLink}
										readonly
										class="flex-1 px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs sm:text-sm"
									/>
									<button 
										onclick={() => handleCopy(shortLink)}
										class="px-3 sm:px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
										type="button"
									>
										{#if copied}
											<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
											<span class="hidden sm:inline">Copiado!</span>
											<span class="sm:hidden">OK!</span>
										{:else}
											<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
											</svg>
											<span class="hidden sm:inline">Copiar</span>
										{/if}
									</button>
								</div>
							</div>
						{/if}
						
						<!-- Link completo -->
						<div>
							<label for="full-link" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Link completo</label>
							<div class="flex gap-1.5 sm:gap-2">
								<input 
									id="full-link"
									type="text" 
									value={cartLink}
									readonly
									class="flex-1 px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs sm:text-sm text-gray-600"
								/>
								<button 
									onclick={() => handleCopy(cartLink)}
									class="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
									aria-label="Copiar link completo"
									type="button"
								>
									<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
									</svg>
								</button>
							</div>
						</div>
						
						<!-- Compartilhar via -->
						<div class="pt-3 sm:pt-4 border-t border-gray-200">
							<p class="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Compartilhar via:</p>
							<div class="flex gap-2 sm:gap-3">
								<button 
									onclick={shareViaWhatsApp}
									class="flex-1 py-2.5 sm:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
									type="button"
								>
									<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
									</svg>
									WhatsApp
								</button>
								<button 
									onclick={shareViaEmail}
									class="flex-1 py-2.5 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
									type="button"
								>
									<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
									<span class="hidden sm:inline">E-mail</span>
									<span class="sm:hidden">Email</span>
								</button>
							</div>
						</div>
					</div>
				{:else}
					<!-- QR Code Tab -->
					<div id="tab-panel-qr" class="text-center space-y-3 sm:space-y-4" role="tabpanel" transition:fade={{ duration: 200 }}>
						<div class="bg-gray-50 rounded-xl p-4 sm:p-6 inline-block">
							{#if qrCodeUrl}
								<img 
									src={qrCodeUrl} 
									alt="QR Code do carrinho"
									class="w-32 h-32 sm:w-48 sm:h-48"
									loading="eager"
								/>
							{:else}
								<div class="w-32 h-32 sm:w-48 sm:h-48 bg-gray-200 animate-pulse rounded"></div>
							{/if}
						</div>
						<p class="text-xs sm:text-sm text-gray-600">
							Escaneie o código QR para acessar o carrinho
						</p>
						<button 
							onclick={() => window.open(qrCodeUrl, '_blank')}
							class="text-[#00BFB3] hover:text-[#00A89D] text-xs sm:text-sm font-medium"
							type="button"
						>
							Baixar QR Code
						</button>
					</div>
				{/if}
			{/if}
		</div>
		
		<!-- Footer -->
		<div class="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 rounded-b-2xl flex-shrink-0">
			<p class="text-[10px] sm:text-xs text-gray-500 text-center flex items-center justify-center gap-1">
				<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Link válido por 7 dias
			</p>
		</div>
	</div>
{/if}

<style>
	/* Animação suave para o modal */
	:global(.share-modal-enter) {
		opacity: 0;
		transform: scale(0.9);
	}
	
	:global(.share-modal-enter-active) {
		opacity: 1;
		transform: scale(1);
		transition: all 0.3s ease-out;
	}
</style> 