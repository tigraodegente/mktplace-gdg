import { writable, derived, get } from 'svelte/store';
import { isAuthenticated, user } from '$lib/stores/auth';

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
	let currentUserId: string | null = null;
	
	// Observar mudanças no usuário e autenticação
	user.subscribe(($user) => {
		if ($user?.id && $user.id !== currentUserId) {
			currentUserId = $user.id;
			loadAddresses($user.id);
		} else if (!$user) {
			currentUserId = null;
			set([]);
		}
	});
	
	function getStorageKey(userId: string): string {
		return `user_addresses_${userId}`;
	}
	
	function loadAddresses(userId: string) {
		try {
			const saved = localStorage.getItem(getStorageKey(userId));
			if (saved) {
				const addresses = JSON.parse(saved);
				// Converter strings de data para objetos Date
				addresses.forEach((addr: SavedAddress) => {
					addr.createdAt = new Date(addr.createdAt);
					addr.updatedAt = new Date(addr.updatedAt);
				});
				set(addresses);
			} else {
				// Dados mock apenas para demonstração inicial
				const mockAddresses: SavedAddress[] = [
					{
						id: '1',
						name: 'Casa',
						zipCode: '01310100',
						street: 'Av. Paulista',
						number: '1578',
						neighborhood: 'Bela Vista',
						city: 'São Paulo',
						state: 'SP',
						isDefault: true,
						createdAt: new Date('2024-01-01'),
						updatedAt: new Date('2024-01-01')
					}
				];
				set(mockAddresses);
				saveToLocalStorage(mockAddresses, userId);
			}
		} catch (error) {
			console.error('Erro ao carregar endereços:', error);
			set([]);
		}
	}
	
	function saveToLocalStorage(addresses: SavedAddress[], userId?: string) {
		try {
			const id = userId || currentUserId;
			if (!id) return;
			
			localStorage.setItem(getStorageKey(id), JSON.stringify(addresses));
		} catch (error) {
			console.error('Erro ao salvar endereços:', error);
		}
	}
	
	return {
		subscribe,
		
		add: async (address: Omit<SavedAddress, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedAddress> => {
			// Validar endereço
			const errors = validateAddress(address);
			if (errors.length > 0) {
				throw new Error(`Erro de validação: ${errors.join(', ')}`);
			}
			
			const newAddress: SavedAddress = {
				...address,
				id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			
			return new Promise((resolve) => {
				update(addresses => {
					// Se for o primeiro endereço ou marcado como padrão, desmarcar outros
					if (addresses.length === 0 || address.isDefault) {
						addresses = addresses.map(addr => ({ ...addr, isDefault: false }));
						newAddress.isDefault = true;
					}
					
					const updated = [...addresses, newAddress];
					saveToLocalStorage(updated);
					
					// Simular delay de API
					setTimeout(() => resolve(newAddress), 300);
					
					return updated;
				});
			});
		},
		
		remove: (id: string): boolean => {
			let removed = false;
			
			update(addresses => {
				const filtered = addresses.filter(addr => addr.id !== id);
				removed = filtered.length < addresses.length;
				
				if (removed) {
					// Se removeu o endereço padrão e ainda há endereços, marcar o primeiro como padrão
					if (filtered.length > 0 && !filtered.some(addr => addr.isDefault)) {
						filtered[0].isDefault = true;
						filtered[0].updatedAt = new Date();
					}
					
					saveToLocalStorage(filtered);
				}
				
				return filtered;
			});
			
			return removed;
		},
		
		update: (id: string, updates: Partial<SavedAddress>): boolean => {
			let updated = false;
			
			update(addresses => {
				const newAddresses = addresses.map(addr => {
					if (addr.id === id) {
						updated = true;
						
						// Se está marcando como padrão, desmarcar outros
						if (updates.isDefault) {
							addresses.forEach(a => {
								if (a.id !== id) {
									a.isDefault = false;
									a.updatedAt = new Date();
								}
							});
						}
						
						return { 
							...addr, 
							...updates, 
							updatedAt: new Date() 
						};
					}
					return addr;
				});
				
				if (updated) {
					saveToLocalStorage(newAddresses);
				}
				
				return newAddresses;
			});
			
			return updated;
		},
		
		setDefault: (id: string): boolean => {
			let found = false;
			
			update(addresses => {
				const updated = addresses.map(addr => {
					if (addr.id === id) {
						found = true;
					}
					
					return {
						...addr,
						isDefault: addr.id === id,
						updatedAt: addr.id === id || addr.isDefault ? new Date() : addr.updatedAt
					};
				});
				
				if (found) {
					saveToLocalStorage(updated);
				}
				
				return updated;
			});
			
			return found;
		},
		
		findByZipCode: (zipCode: string): SavedAddress | undefined => {
			const currentStore = get(addressStore);
			return currentStore.find(addr => addr.zipCode === zipCode.replace(/\D/g, ''));
		},
		
		getById: (id: string): SavedAddress | undefined => {
			const currentStore = get(addressStore);
			return currentStore.find(addr => addr.id === id);
		},
		
		clear: () => {
			set([]);
			if (currentUserId) {
				localStorage.removeItem(getStorageKey(currentUserId));
			}
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