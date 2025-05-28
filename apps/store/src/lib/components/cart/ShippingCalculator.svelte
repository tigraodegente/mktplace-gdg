<script lang="ts">
	import { formatCurrency } from '@mktplace/utils';
	import { fade, scale, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { CART_CONSTANTS } from './constants';
	
	interface ShippingCalculatorProps {
		zipCode: string;
		onCalculate: (zipCode: string) => void;
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
		onCalculate, 
		onAddressSelect,
		onRemoveAddress,
		savedAddresses = []
	}: ShippingCalculatorProps = $props();
	
	let localZipCode = $state(zipCode);
	let calculating = $state(false);
	let error = $state('');
	let showSavedAddresses = $state(false);
	let addressDetails = $state<any>(null);
	let showRemoveModal = $state(false);
	let addressToRemove = $state<string | null>(null);
	
	// Máscara de CEP
	function formatZipCode(value: string) {
		const numbers = value.replace(/\D/g, '');
		if (numbers.length <= 5) {
			return numbers;
		}
		return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
	}
	
	function handleZipCodeInput(e: Event) {
		const input = e.target as HTMLInputElement;
		localZipCode = formatZipCode(input.value);
	}
	
	async function handleCalculate() {
		const cleanZip = localZipCode.replace(/\D/g, '');
		
		if (cleanZip.length !== 8) {
			error = CART_CONSTANTS.MESSAGES.INVALID_ZIP;
			return;
		}
		
		error = '';
		calculating = true;
		addressDetails = null;
		
		try {
			// Buscar endereço via ViaCEP
			const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
			const data = await response.json();
			
			if (data.erro) {
				error = CART_CONSTANTS.MESSAGES.ZIP_NOT_FOUND;
				return;
			}
			
			addressDetails = {
				street: data.logradouro,
				neighborhood: data.bairro,
				city: data.localidade,
				state: data.uf
			};
			
			// Simular delay de cálculo
			await new Promise(resolve => setTimeout(resolve, 800));
			
			onCalculate(cleanZip);
		} catch (err) {
			error = 'Erro ao buscar CEP';
		} finally {
			calculating = false;
		}
	}
	
	function selectAddress(address: any) {
		localZipCode = formatZipCode(address.zipCode);
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
		onCalculate(address.zipCode);
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
								CEP: {formatZipCode(address.zipCode)}
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
	
	<!-- Campo de CEP -->
	<form onsubmit={(e) => {
		e.preventDefault();
		handleCalculate();
	}} class="flex gap-1.5 sm:gap-2">
		<div class="relative flex-1">
			<input 
				type="text"
				placeholder="00000-000"
				value={localZipCode}
				oninput={handleZipCodeInput}
				maxlength="9"
				class="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent pl-7 sm:pl-8"
			/>
			<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
		</div>
		<button 
			type="submit"
			disabled={calculating || localZipCode.replace(/\D/g, '').length !== 8}
			class="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#00BFB3] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2"
		>
			{#if calculating}
				<div class="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
			{/if}
			Calcular
		</button>
	</form>
	
	<!-- Link não sei meu CEP -->
	<div class="mt-2 text-left">
		<a 
			href="https://buscacepinter.correios.com.br/app/endereco/index.php" 
			target="_blank"
			rel="noopener noreferrer"
			class="text-xs text-[#00BFB3] hover:text-[#00A89D] hover:underline inline-flex items-center gap-1"
		>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			Não sei meu CEP
		</a>
	</div>
	
	{#if error}
		<p class="text-xs text-red-600 mt-2 flex items-center gap-1" transition:fade={{ duration: 200 }}>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			{error}
		</p>
	{/if}
	
	{#if addressDetails}
		<div class="mt-1.5 sm:mt-2 p-1.5 sm:p-2 bg-white border border-gray-200 rounded text-[10px] sm:text-xs text-gray-600" transition:scale={{ duration: 200, easing: cubicOut }}>
			<p class="font-medium text-gray-900 truncate">{addressDetails.street}</p>
			<p class="truncate">{addressDetails.neighborhood} • {addressDetails.city}/{addressDetails.state}</p>
		</div>
	{/if}
</div>

<!-- Modal de Confirmação -->
{#if showRemoveModal}
	<div 
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
		onclick={() => showRemoveModal = false}
		onkeydown={(e) => e.key === 'Escape' && (showRemoveModal = false)}
		role="dialog"
		aria-modal="true"
		aria-labelledby="remove-address-modal-title"
		tabindex="-1"
	>
		<div 
			class="bg-white rounded-xl shadow-2xl max-w-sm w-full p-4 sm:p-6 mx-4"
			transition:scale={{ duration: 300, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
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