import { writable, derived, get } from 'svelte/store';
import { isAuthenticated, user } from '$lib/stores/authStore';

export interface SavedAddress {
	id: string;
	name: string;
	zipCode: string;
	street: string;
	number: string;
	complement?: string;
	neighborhood: string;
	city: string;
	state: string;
	type?: 'shipping' | 'billing';
	phone?: string;
	isDefault?: boolean;
	createdAt: Date;
	updatedAt: Date;
}

// Validações
export function validateAddress(address: Partial<SavedAddress>): string[] {
	const errors: string[] = [];
	
	if (!address.name?.trim()) errors.push('Nome é obrigatório');
	if (!address.zipCode || !/^\d{8}$/.test(address.zipCode)) errors.push('CEP inválido');
	if (!address.street?.trim()) errors.push('Rua é obrigatória');
	if (!address.number?.trim()) errors.push('Número é obrigatório');
	if (!address.neighborhood?.trim()) errors.push('Bairro é obrigatório');
	if (!address.city?.trim()) errors.push('Cidade é obrigatória');
	if (!address.state || !/^[A-Z]{2}$/.test(address.state)) errors.push('Estado inválido');
	
	return errors;
}

// Store para endereços salvos
function createAddressStore() {
	const { subscribe, set, update } = writable<SavedAddress[]>([]);
	let isLoading = writable(false);
	let currentUserId: string | null = null;
	
	// Observar mudanças no usuário e autenticação
	user.subscribe(($user) => {
		if ($user?.id && $user.id !== currentUserId) {
			currentUserId = $user.id;
			loadAddresses();
		} else if (!$user) {
			currentUserId = null;
			set([]);
		}
	});
	
	// Carregar endereços da API
	async function loadAddresses() {
		if (!currentUserId) return;
		
		isLoading.set(true);
		
		try {
			const response = await fetch('/api/addresses', {
				credentials: 'include'
			});
			
			if (!response.ok) {
				if (response.status === 401) {
					// Usuário não autenticado, limpar store
					set([]);
					return;
				}
				throw new Error('Erro ao carregar endereços');
			}
			
			const result = await response.json();
			
			if (result.success) {
				// Converter strings de data para objetos Date
				const addresses = result.data.map((addr: any) => ({
					...addr,
					createdAt: new Date(addr.createdAt),
					updatedAt: new Date(addr.updatedAt)
				}));
				set(addresses);
			} else {
				console.error('Erro da API:', result.error);
				set([]);
			}
		} catch (error) {
			console.error('Erro ao carregar endereços:', error);
			set([]);
		} finally {
			isLoading.set(false);
		}
	}
	
	return {
		subscribe,
		isLoading: { subscribe: isLoading.subscribe },
		
		// Recarregar endereços
		reload: loadAddresses,
		
		// Adicionar novo endereço
		add: async (address: Omit<SavedAddress, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedAddress> => {
			// Validar endereço
			const errors = validateAddress(address);
			if (errors.length > 0) {
				throw new Error(`Erro de validação: ${errors.join(', ')}`);
			}
			
			isLoading.set(true);
			
			try {
				const response = await fetch('/api/addresses', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include',
					body: JSON.stringify({
						...address,
						zipCode: address.zipCode.replace(/\D/g, ''), // Limpar formatação
						state: address.state.toUpperCase()
					})
				});
				
				const result = await response.json();
				
				if (!response.ok || !result.success) {
					throw new Error(result.error?.message || 'Erro ao salvar endereço');
				}
				
				const newAddress = {
					...result.data,
					createdAt: new Date(result.data.createdAt),
					updatedAt: new Date(result.data.updatedAt)
				};
				
				// Atualizar store local
				update(addresses => [...addresses, newAddress]);
				
				return newAddress;
			} catch (error) {
				throw error;
			} finally {
				isLoading.set(false);
			}
		},
		
		// Remover endereço
		remove: async (id: string): Promise<boolean> => {
			isLoading.set(true);
			
			try {
				const response = await fetch(`/api/addresses/${id}`, {
					method: 'DELETE',
					credentials: 'include'
				});
				
				const result = await response.json();
				
				if (!response.ok || !result.success) {
					throw new Error(result.error?.message || 'Erro ao remover endereço');
				}
				
				// Atualizar store local
				update(addresses => addresses.filter(addr => addr.id !== id));
				
				return true;
			} catch (error) {
				console.error('Erro ao remover endereço:', error);
				return false;
			} finally {
				isLoading.set(false);
			}
		},
		
		// Atualizar endereço
		update: async (id: string, updates: Partial<SavedAddress>): Promise<boolean> => {
			isLoading.set(true);
			
			try {
				// Limpar zipCode se fornecido
				if (updates.zipCode) {
					updates.zipCode = updates.zipCode.replace(/\D/g, '');
				}
				
				// Converter state para maiúsculo se fornecido
				if (updates.state) {
					updates.state = updates.state.toUpperCase();
				}
				
				const response = await fetch(`/api/addresses/${id}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include',
					body: JSON.stringify(updates)
				});
				
				const result = await response.json();
				
				if (!response.ok || !result.success) {
					throw new Error(result.error?.message || 'Erro ao atualizar endereço');
				}
				
				const updatedAddress = {
					...result.data,
					createdAt: new Date(result.data.createdAt),
					updatedAt: new Date(result.data.updatedAt)
				};
				
				// Atualizar store local
				update(addresses => addresses.map(addr => 
					addr.id === id ? updatedAddress : addr
				));
				
				return true;
			} catch (error) {
				console.error('Erro ao atualizar endereço:', error);
				return false;
			} finally {
				isLoading.set(false);
			}
		},
		
		// Marcar como padrão
		setDefault: async (id: string): Promise<boolean> => {
			return await addressStore.update(id, { isDefault: true });
		},
		
		// Buscar por CEP
		findByZipCode: (zipCode: string): SavedAddress | undefined => {
			const currentStore = get(addressStore);
			return currentStore.find(addr => addr.zipCode === zipCode.replace(/\D/g, ''));
		},
		
		// Buscar por ID
		getById: (id: string): SavedAddress | undefined => {
			const currentStore = get(addressStore);
			return currentStore.find(addr => addr.id === id);
		},
		
		// Limpar store
		clear: () => {
			set([]);
		}
	};
}

export const addressStore = createAddressStore();

// Store derivado para endereço padrão
export const defaultAddress = derived(
	addressStore,
	$addresses => $addresses.find(addr => addr.isDefault)
);

// Store derivado para contagem
export const addressCount = derived(
	addressStore,
	$addresses => $addresses.length
);

// Store derivado para loading
export const addressLoading = derived(
	addressStore.isLoading,
	$loading => $loading
);

// Interface para resposta da API ViaCEP
interface ViaCEPResponse {
	cep: string;
	logradouro: string;
	complemento: string;
	bairro: string;
	localidade: string;
	uf: string;
	erro?: boolean;
}

// Cache para CEPs consultados
const cepCache = new Map<string, ViaCEPResponse>();

// Função auxiliar para buscar dados de CEP (usando ViaCEP)
export async function fetchAddressFromZipCode(zipCode: string): Promise<Partial<SavedAddress> | null> {
	try {
		const cleanZip = zipCode.replace(/\D/g, '');
		
		// Verificar cache primeiro
		if (cepCache.has(cleanZip)) {
			const cached = cepCache.get(cleanZip)!;
			if (!cached.erro) {
				return {
					zipCode: cleanZip,
					street: cached.logradouro,
					neighborhood: cached.bairro,
					city: cached.localidade,
					state: cached.uf
				};
			}
			return null;
		}
		
		// Validar formato do CEP
		if (!/^\d{8}$/.test(cleanZip)) {
			throw new Error('CEP inválido');
		}
		
		const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`, {
			signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
		});
		
		if (!response.ok) {
			throw new Error(`Erro HTTP: ${response.status}`);
		}
		
		const data: ViaCEPResponse = await response.json();
		
		// Cachear resposta
		cepCache.set(cleanZip, data);
		
		// Limitar tamanho do cache
		if (cepCache.size > 100) {
			const firstKey = cepCache.keys().next().value;
			if (firstKey !== undefined) {
				cepCache.delete(firstKey);
			}
		}
		
		if (data.erro) {
			return null;
		}
		
		return {
			zipCode: cleanZip,
			street: data.logradouro || '',
			neighborhood: data.bairro || '',
			city: data.localidade || '',
			state: data.uf || ''
		};
	} catch (error) {
		console.error('Erro ao buscar CEP:', error);
		
		// Se for erro de rede, tentar buscar do cache offline
		if (error instanceof TypeError && error.message.includes('fetch')) {
			const cached = cepCache.get(zipCode.replace(/\D/g, ''));
			if (cached && !cached.erro) {
				return {
					zipCode: zipCode.replace(/\D/g, ''),
					street: cached.logradouro,
					neighborhood: cached.bairro,
					city: cached.localidade,
					state: cached.uf
				};
			}
		}
		
		return null;
	}
}

// Função para formatar endereço completo
export function formatFullAddress(address: SavedAddress): string {
	const parts = [
		address.street,
		address.number,
		address.complement,
		address.neighborhood,
		`${address.city}/${address.state}`,
		`CEP: ${address.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2')}`
	].filter(Boolean);
	
	return parts.join(', ');
}

// Função para obter label amigável do endereço
export function getAddressLabel(address: SavedAddress): string {
	return `${address.name} - ${address.street}, ${address.number}`;
} 