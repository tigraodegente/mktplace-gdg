<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { UnifiedShippingQuote } from '$lib/services/unifiedShippingService.types';
	import type { CartItem } from '$lib/types/cart';
	import { formatCurrency } from '$lib/utils';
	import { validatePostalCode, formatPostalCode } from '$lib/utils/shipping';
	import { fade, scale, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { CART_CONSTANTS } from './constants';
	import SellerShippingOptions from './SellerShippingOptions.svelte';
	import { flip } from 'svelte/animate';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	
	interface ShippingCalculatorProps {
		zipCode: string;
		cartItems: CartItem[];
		onCalculate: (zip: string, quotes: UnifiedShippingQuote[]) => void;
		onAddressSelect?: (address: any) => void;
		onRemoveAddress?: (id: string) => void;
		savedAddresses?: Array<{
			id: string;
			zipCode: string;
			street: string;
			number: string;
			complement?: string;
			neighborhood: string;
			city: string;
			state: string;
			isDefault?: boolean;
		}>;
	}
	
	let { 
		zipCode = '', 
		cartItems, 
		onCalculate, 
		onAddressSelect,
		onRemoveAddress,
		savedAddresses = []
	}: ShippingCalculatorProps = $props();
	
	let localZipCode = $state(zipCode || '');
	let calculating = $state(false);
	let recentZipCodes = $state<string[]>([]);
	let shippingQuotes = $state<UnifiedShippingQuote[]>([]);
	let hasCalculated = $state(false);
	let error = $state('');
	let showSavedAddresses = $state(false);
	let addressDetails = $state<any>(null);
	let showRemoveModal = $state(false);
	let addressToRemove = $state<string | null>(null);
	
	// Carregar CEPs recentes do localStorage
	function loadRecentZipCodes() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('recentZipCodes');
			if (stored) {
				try {
					recentZipCodes = JSON.parse(stored).slice(0, 3);
				} catch (e) {
					recentZipCodes = [];
				}
			}
		}
	}
	
	// Salvar CEP nos recentes
	function saveRecentZipCode(zip: string) {
		if (typeof window !== 'undefined') {
			const filtered = recentZipCodes.filter(z => z !== zip);
			const newRecents = [zip, ...filtered].slice(0, 3);
			recentZipCodes = newRecents;
			localStorage.setItem('recentZipCodes', JSON.stringify(newRecents));
		}
	}
	
	// Remover CEP dos recentes
	function removeRecentZipCode(zip: string) {
		recentZipCodes = recentZipCodes.filter(z => z !== zip);
		if (typeof window !== 'undefined') {
			localStorage.setItem('recentZipCodes', JSON.stringify(recentZipCodes));
		}
	}
	
	// Executar cálculo de frete
	async function handleCalculate() {
		const cleanZip = localZipCode.replace(/\D/g, '');
		
		if (!validatePostalCode(cleanZip)) {
			return;
		}

		if (!cartItems || cartItems.length === 0) {
			console.warn('Carrinho vazio - não é possível calcular frete');
			return;
		}

		calculating = true;
		
		try {
			// Converter CartItem para o formato esperado pela API
			const items = cartItems.map(item => ({
				product: item.product,
				product_id: item.product.id,
				quantity: item.quantity,
				sellerId: item.sellerId,
				sellerName: item.sellerName,
				weight: (item.product as any).weight || 300,
				price: item.product.price,
				category_id: (item.product as any).category_id,
				height: (item.product as any).height,
				width: (item.product as any).width,
				length: (item.product as any).length,
				selectedColor: item.selectedColor,
				selectedSize: item.selectedSize
			}));

			const response = await fetch('/api/shipping/calculate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					postalCode: cleanZip,
					items
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const result = await response.json();
			
			if (result.success) {
				shippingQuotes = result.data.quotes;
				hasCalculated = true;
				
				// Salvar CEP nos recentes
				saveRecentZipCode(localZipCode);
				
				// Chamar callback do componente pai
				onCalculate(cleanZip, result.data.quotes);
			} else {
				throw new Error(result.error?.message || 'Erro ao calcular frete');
			}
			
		} catch (error) {
			console.error('Erro ao calcular frete:', error);
			shippingQuotes = [];
			hasCalculated = true;
		} finally {
			calculating = false;
		}
	}
	
	// Usar CEP recente
	function useRecentZipCode(zip: string) {
		localZipCode = zip;
		handleCalculate();
	}
	
	// Limpar resultados
	function clearResults() {
		shippingQuotes = [];
		hasCalculated = false;
	}
	
	// Formatar CEP durante a digitação
	function formatZipInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const numbersOnly = target.value.replace(/\D/g, '');
		if (numbersOnly.length <= 8) {
			localZipCode = formatPostalCode(numbersOnly);
		}
	}
	
	// Inicializar
	$effect(() => {
		loadRecentZipCodes();
	});
	
	function selectAddress(address: any) {
		localZipCode = formatPostalCode(address.zipCode);
		addressDetails = {
			street: address.street,
			neighborhood: address.neighborhood,
			city: address.city,
			state: address.state
		};
		showSavedAddresses = false;
		if (onAddressSelect) {
			onAddressSelect(address);
		}
		onCalculate(address.zipCode, []);
	}
	
	function confirmRemoveAddress(id: string) {
		addressToRemove = id;
		showRemoveModal = true;
	}
	
	function removeAddress() {
		if (addressToRemove && onRemoveAddress) {
			onRemoveAddress(addressToRemove);
			showRemoveModal = false;
			addressToRemove = null;
		}
	}
</script>

<div class="bg-gray-50 rounded-lg p-3 sm:p-4">
	<div class="flex items-center justify-between mb-2 sm:mb-3">
		<h3 class="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-1.5 sm:gap-2">
			<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
			</svg>
			Calcular Frete
		</h3>
		{#if savedAddresses.length > 0}
			<button 
				onclick={() => showSavedAddresses = !showSavedAddresses}
				class="text-[10px] sm:text-xs text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors"
			>
				{showSavedAddresses ? 'Ocultar' : 'Ver'} endereços
			</button>
		{/if}
	</div>
	
	<!-- Lista de endereços salvos -->
	{#if showSavedAddresses && savedAddresses.length > 0}
		<div class="mb-2 sm:mb-3 space-y-1.5 sm:space-y-2 max-h-36 sm:max-h-48 overflow-y-auto" transition:slide={{ duration: 200, easing: cubicOut }}>
			{#each savedAddresses as address}
				<button 
					class="w-full text-left p-2 sm:p-2.5 border rounded-lg cursor-pointer transition-all hover:border-[#00BFB3] hover:bg-white group {address.isDefault ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-200'}"
					onclick={() => selectAddress(address)}
					type="button"
				>
					<div class="flex items-start justify-between gap-2">
						<div class="flex-1 min-w-0">
							<p class="text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-1.5 sm:gap-2">
								<span class="truncate">{address.street}, {address.number}</span>
								{#if address.isDefault}
									<span class="text-[9px] sm:text-[10px] bg-[#00BFB3]/10 text-[#00BFB3] px-1 sm:px-1.5 py-0.5 rounded flex-shrink-0">
										Padrão
									</span>
								{/if}
							</p>
							<p class="text-[10px] sm:text-xs text-gray-600 mt-0.5 truncate">
								{address.neighborhood} • {address.city}/{address.state}
							</p>
							<p class="text-[10px] sm:text-xs text-gray-500">
								CEP: {formatPostalCode(address.zipCode)}
							</p>
						</div>
						<div 
							onclick={(e) => {
								e.stopPropagation();
								confirmRemoveAddress(address.id);
							}}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.stopPropagation();
									e.preventDefault();
									confirmRemoveAddress(address.id);
								}
							}}
							class="p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-50 rounded cursor-pointer"
							role="button"
							tabindex="0"
							aria-label="Remover endereço"
						>
							<svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}
	
	<!-- CEPs Recentes -->
	{#if recentZipCodes.length > 0 && !hasCalculated}
		<div class="mb-4">
			<h4 class="text-sm font-medium text-gray-700 mb-2">CEPs recentes:</h4>
			<div class="flex flex-wrap gap-2">
				{#each recentZipCodes as zip}
					<div
						onclick={() => useRecentZipCode(zip)}
						class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-200 
							   text-sm text-gray-700 rounded-lg transition-colors group cursor-pointer"
					>
						<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
								  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
								  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						{zip}
						<button
							onclick={(e) => {
								e.stopPropagation();
								removeRecentZipCode(zip);
							}}
							class="opacity-0 group-hover:opacity-100 transition-opacity ml-1 
								   hover:bg-red-100 rounded-full p-0.5"
						>
							<svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
									  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
	
	<!-- Campo de CEP -->
	<form 
		onsubmit={(e) => {
			e.preventDefault();
			handleCalculate();
		}} 
		class="flex gap-2 mb-4"
	>
		<div class="relative flex-1">
			<input 
				type="text"
				placeholder="00000-000"
				bind:value={localZipCode}
				maxlength="9"
				class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg 
					   focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent 
					   pl-10"
				oninput={formatZipInput}
			/>
			<svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" 
				 fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
		</div>
		
		<button 
			type="submit"
			disabled={calculating || !validatePostalCode(localZipCode.replace(/\D/g, ''))}
			class="px-4 py-2.5 bg-[#00BFB3] text-white text-sm font-medium rounded-lg 
				   hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed 
				   flex items-center gap-2 min-w-[100px] justify-center"
		>
			{#if calculating}
				<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
				Calculando...
			{:else}
				Calcular
			{/if}
		</button>
	</form>
	
	<!-- Link "Não sei meu CEP" -->
	<div class="mb-6">
		<a 
			href="https://buscacepinter.correios.com.br/app/endereco/index.php" 
			target="_blank" 
			rel="noopener noreferrer"
			class="text-sm text-[#00BFB3] hover:text-[#00A89D] underline flex items-center gap-1"
		>
			Não sei meu CEP
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
			</svg>
		</a>
	</div>
	
	<!-- Status de cálculo -->
	{#if hasCalculated && shippingQuotes.length > 0}
		<div class="p-3 bg-[#00BFB3]/10 border border-[#00BFB3]/20 rounded-lg">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 text-[#00BFB3]">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span class="text-sm font-medium">Frete calculado com sucesso!</span>
				</div>
				<button
					onclick={clearResults}
					class="text-xs text-[#00BFB3] hover:text-[#00A89D] underline flex items-center gap-1"
				>
					Calcular outro CEP
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</button>
			</div>
			<p class="text-xs text-[#00BFB3] mt-1">
				Veja as opções de entrega abaixo e selecione a melhor para você.
			</p>
		</div>
	{:else if hasCalculated}
		<!-- Estado de erro -->
		<div class="p-3 bg-red-50 border border-red-200 rounded-lg">
			<div class="flex items-center gap-2 text-red-800">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span class="text-sm font-medium">Erro ao calcular frete</span>
			</div>
			<p class="text-xs text-red-700 mt-1">
				Não foi possível calcular o frete para este CEP. Tente novamente ou verifique se o CEP está correto.
			</p>
			<button
				onclick={clearResults}
				class="mt-2 text-xs text-red-700 hover:text-red-800 underline"
			>
				Tentar novamente
			</button>
		</div>
	{/if}
</div>

<!-- Modal de Confirmação -->
{#if showRemoveModal}
	<div 
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="remove-address-modal-title"
		tabindex="-1"
	>
		<div 
			class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 mx-4"
			transition:scale={{ duration: 300, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && (showRemoveModal = false)}
			role="presentation"
		>
			<!-- Ícone -->
			<div class="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
				<svg class="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</div>
			
			<!-- Conteúdo -->
			<h3 id="remove-address-modal-title" class="text-base sm:text-lg font-semibold text-gray-900 text-center mb-2">
				Remover endereço?
			</h3>
			<p class="text-xs sm:text-sm text-gray-600 text-center mb-4 sm:mb-6">
				Tem certeza que deseja remover este endereço salvo?
			</p>
			
			<!-- Ações -->
			<div class="flex gap-2 sm:gap-3">
				<button 
					onclick={() => showRemoveModal = false}
					class="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-50 transition-colors"
				>
					Cancelar
				</button>
				<button 
					onclick={removeAddress}
					class="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-red-700 transition-colors"
				>
					Remover
				</button>
			</div>
		</div>
	</div>
{/if} 