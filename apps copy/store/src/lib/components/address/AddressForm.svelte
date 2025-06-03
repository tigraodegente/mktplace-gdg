<script lang="ts">
	import { onMount } from 'svelte';
	import { addressStore, fetchAddressFromZipCode, validateAddress } from '$lib/services/addressService';
	import type { SavedAddress } from '$lib/services/addressService';
	
	interface AddressFormProps {
		address?: SavedAddress | null;
		type?: 'shipping' | 'billing';
		onSuccess: (address: SavedAddress) => void;
		onCancel: () => void;
	}
	
	let { 
		address = null,
		type = 'shipping',
		onSuccess,
		onCancel
	}: AddressFormProps = $props();
	
	// Estados do formulário
	let formData = $state({
		name: '',
		zipCode: '',
		street: '',
		number: '',
		complement: '',
		neighborhood: '',
		city: '',
		state: '',
		phone: '',
		isDefault: false
	});
	
	let isSubmitting = $state(false);
	let isLoadingCep = $state(false);
	let errors = $state<string[]>([]);
	let cepError = $state('');
	
	// Inicializar formulário se editando
	onMount(() => {
		if (address) {
			formData = {
				name: address.name,
				zipCode: address.zipCode,
				street: address.street,
				number: address.number,
				complement: address.complement || '',
				neighborhood: address.neighborhood,
				city: address.city,
				state: address.state,
				phone: address.phone || '',
				isDefault: address.isDefault || false
			};
		}
	});
	
	// Estados brasileiros
	const brazilianStates = [
		{ code: 'AC', name: 'Acre' },
		{ code: 'AL', name: 'Alagoas' },
		{ code: 'AP', name: 'Amapá' },
		{ code: 'AM', name: 'Amazonas' },
		{ code: 'BA', name: 'Bahia' },
		{ code: 'CE', name: 'Ceará' },
		{ code: 'DF', name: 'Distrito Federal' },
		{ code: 'ES', name: 'Espírito Santo' },
		{ code: 'GO', name: 'Goiás' },
		{ code: 'MA', name: 'Maranhão' },
		{ code: 'MT', name: 'Mato Grosso' },
		{ code: 'MS', name: 'Mato Grosso do Sul' },
		{ code: 'MG', name: 'Minas Gerais' },
		{ code: 'PA', name: 'Pará' },
		{ code: 'PB', name: 'Paraíba' },
		{ code: 'PR', name: 'Paraná' },
		{ code: 'PE', name: 'Pernambuco' },
		{ code: 'PI', name: 'Piauí' },
		{ code: 'RJ', name: 'Rio de Janeiro' },
		{ code: 'RN', name: 'Rio Grande do Norte' },
		{ code: 'RS', name: 'Rio Grande do Sul' },
		{ code: 'RO', name: 'Rondônia' },
		{ code: 'RR', name: 'Roraima' },
		{ code: 'SC', name: 'Santa Catarina' },
		{ code: 'SP', name: 'São Paulo' },
		{ code: 'SE', name: 'Sergipe' },
		{ code: 'TO', name: 'Tocantins' }
	];
	
	// Buscar endereço por CEP
	async function handleCepBlur() {
		const cleanCep = formData.zipCode.replace(/\D/g, '');
		
		if (cleanCep.length !== 8) {
			cepError = '';
			return;
		}
		
		isLoadingCep = true;
		cepError = '';
		
		try {
			const addressData = await fetchAddressFromZipCode(cleanCep);
			
			if (addressData) {
				// Preencher apenas campos vazios
				if (!formData.street) formData.street = addressData.street || '';
				if (!formData.neighborhood) formData.neighborhood = addressData.neighborhood || '';
				if (!formData.city) formData.city = addressData.city || '';
				if (!formData.state) formData.state = addressData.state || '';
			} else {
				cepError = 'CEP não encontrado';
			}
		} catch (error) {
			console.error('Erro ao buscar CEP:', error);
			cepError = 'Erro ao buscar CEP';
		} finally {
			isLoadingCep = false;
		}
	}
	
	// Submeter formulário
	async function handleSubmit() {
		errors = validateAddress({
			...formData,
			zipCode: formData.zipCode.replace(/\D/g, '')
		});
		
		if (errors.length > 0) {
			return;
		}
		
		isSubmitting = true;
		
		try {
			let result: SavedAddress;
			
			if (address) {
				// Editar endereço existente
				const success = await addressStore.update(address.id, {
					...formData,
					type,
					zipCode: formData.zipCode.replace(/\D/g, '')
				});
				
				if (!success) {
					throw new Error('Erro ao atualizar endereço');
				}
				
				// Buscar endereço atualizado
				result = addressStore.getById(address.id)!;
			} else {
				// Criar novo endereço
				result = await addressStore.add({
					...formData,
					type,
					zipCode: formData.zipCode.replace(/\D/g, '')
				});
			}
			
			onSuccess(result);
		} catch (error) {
			console.error('Erro ao salvar endereço:', error);
			errors = [error instanceof Error ? error.message : 'Erro ao salvar endereço'];
		} finally {
			isSubmitting = false;
		}
	}
	
	// Máscara para CEP
	function maskCep(value: string) {
		return value
			.replace(/\D/g, '')
			.replace(/(\d{5})(\d)/, '$1-$2')
			.replace(/(-\d{3})\d+?$/, '$1');
	}
	
	// Máscara para telefone
	function maskPhone(value: string) {
		return value
			.replace(/\D/g, '')
			.replace(/(\d{2})(\d)/, '($1) $2')
			.replace(/(\d{5})(\d)/, '$1-$2')
			.replace(/(-\d{4})\d+?$/, '$1');
	}
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
	<!-- Mensagens de erro -->
	{#if errors.length > 0}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<div class="flex">
				<svg class="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">Corrija os seguintes erros:</h3>
					<ul class="mt-2 text-sm text-red-700 list-disc list-inside">
						{#each errors as error}
							<li>{error}</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Nome/Identificação -->
	<div>
		<label for="name" class="block text-sm font-medium text-gray-700 mb-1">
			Nome do endereço *
		</label>
		<input
			id="name"
			type="text"
			bind:value={formData.name}
			placeholder="Ex: Casa, Trabalho, Mãe..."
			class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
			required
		/>
	</div>
	
	<!-- CEP -->
	<div>
		<label for="zipCode" class="block text-sm font-medium text-gray-700 mb-1">
			CEP *
		</label>
		<div class="relative">
			<input
				id="zipCode"
				type="text"
				bind:value={formData.zipCode}
				oninput={(e) => formData.zipCode = maskCep(e.currentTarget.value)}
				onblur={handleCepBlur}
				placeholder="00000-000"
				maxlength="9"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent pr-10"
				required
			/>
			{#if isLoadingCep}
				<div class="absolute inset-y-0 right-0 flex items-center pr-3">
					<div class="w-5 h-5 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
				</div>
			{/if}
		</div>
		{#if cepError}
			<p class="mt-1 text-sm text-red-600">{cepError}</p>
		{/if}
		<p class="mt-1 text-xs text-gray-500">
			Não sei meu CEP? 
			<a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" class="text-[#00BFB3] hover:underline">
				Consultar nos Correios
			</a>
		</p>
	</div>
	
	<!-- Rua e Número -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="md:col-span-2">
			<label for="street" class="block text-sm font-medium text-gray-700 mb-1">
				Rua/Avenida *
			</label>
			<input
				id="street"
				type="text"
				bind:value={formData.street}
				placeholder="Nome da rua"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
				required
			/>
		</div>
		
		<div>
			<label for="number" class="block text-sm font-medium text-gray-700 mb-1">
				Número *
			</label>
			<input
				id="number"
				type="text"
				bind:value={formData.number}
				placeholder="123"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
				required
			/>
		</div>
	</div>
	
	<!-- Complemento -->
	<div>
		<label for="complement" class="block text-sm font-medium text-gray-700 mb-1">
			Complemento
		</label>
		<input
			id="complement"
			type="text"
			bind:value={formData.complement}
			placeholder="Apto, Bloco, Casa, etc. (opcional)"
			class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
		/>
	</div>
	
	<!-- Bairro -->
	<div>
		<label for="neighborhood" class="block text-sm font-medium text-gray-700 mb-1">
			Bairro *
		</label>
		<input
			id="neighborhood"
			type="text"
			bind:value={formData.neighborhood}
			placeholder="Nome do bairro"
			class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
			required
		/>
	</div>
	
	<!-- Cidade e Estado -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label for="city" class="block text-sm font-medium text-gray-700 mb-1">
				Cidade *
			</label>
			<input
				id="city"
				type="text"
				bind:value={formData.city}
				placeholder="Nome da cidade"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
				required
			/>
		</div>
		
		<div>
			<label for="state" class="block text-sm font-medium text-gray-700 mb-1">
				Estado *
			</label>
			<select
				id="state"
				bind:value={formData.state}
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
				required
			>
				<option value="">Selecione o estado</option>
				{#each brazilianStates as state}
					<option value={state.code}>{state.code} - {state.name}</option>
				{/each}
			</select>
		</div>
	</div>
	
	<!-- Telefone -->
	<div>
		<label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
			Telefone
		</label>
		<input
			id="phone"
			type="text"
			bind:value={formData.phone}
			oninput={(e) => formData.phone = maskPhone(e.currentTarget.value)}
			placeholder="(11) 99999-9999"
			maxlength="15"
			class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
		/>
	</div>
	
	<!-- Marcar como padrão -->
	<div class="flex items-center">
		<input
			id="isDefault"
			type="checkbox"
			bind:checked={formData.isDefault}
			class="w-4 h-4 text-[#00BFB3] bg-gray-50 border-gray-300 rounded focus:ring-[#00BFB3] focus:ring-2"
		/>
		<label for="isDefault" class="ml-2 text-sm text-gray-700">
			Marcar como endereço padrão
		</label>
	</div>
	
	<!-- Botões -->
	<div class="flex items-center gap-3 pt-4">
		<button
			type="submit"
			disabled={isSubmitting}
			class="flex-1 bg-[#00BFB3] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
		>
			{#if isSubmitting}
				<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
				Salvando...
			{:else}
				{address ? 'Atualizar' : 'Salvar'} Endereço
			{/if}
		</button>
		
		<button
			type="button"
			onclick={onCancel}
			class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
		>
			Cancelar
		</button>
	</div>
</form> 