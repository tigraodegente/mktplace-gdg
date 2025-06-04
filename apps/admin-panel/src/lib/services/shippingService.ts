import { api } from './api';

export interface ShippingCarrier {
	id: string;
	name: string;
	description?: string;
	type: 'correios' | 'frenet' | 'custom';
	api_endpoint?: string;
	api_credentials?: any;
	is_active: boolean;
	settings?: any;
	created_at: string;
	updated_at: string;
	sellers_count?: number;
}

export interface ShippingZone {
	id: string;
	name: string;
	description?: string;
	states: string[] | string;
	postal_codes?: string[];
	is_active: boolean;
	created_at: string;
	updated_at: string;
	rates_count?: number;
	sellers_count?: number;
}

export interface ShippingRate {
	id: string;
	carrier_id: string;
	zone_id: string;
	weight_from: number;
	weight_to: number;
	price: number;
	delivery_time_min: number;
	delivery_time_max: number;
	created_at: string;
	updated_at: string;
	carrier_name?: string;
	carrier_type?: string;
	zone_name?: string;
	zone_states?: string[] | string;
}

export interface SellerShippingConfig {
	id: string;
	seller_id: string;
	carrier_id: string;
	markup_percentage: number;
	free_shipping_threshold?: number;
	handling_time_days: number;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	seller_name?: string;
	seller_email?: string;
	carrier_name?: string;
	carrier_type?: string;
	carrier_active?: boolean;
	available_rates?: number;
}

export interface ShippingStats {
	totalCarriers?: number;
	activeCarriers?: number;
	correiosCount?: number;
	frenetCount?: number;
	totalZones?: number;
	activeZones?: number;
	spZones?: number;
	rjZones?: number;
	totalRates?: number;
	uniqueCarriers?: number;
	uniqueZones?: number;
	avgPrice?: number;
	minPrice?: number;
	maxPrice?: number;
	avgDeliveryTime?: number;
	totalConfigs?: number;
	activeConfigs?: number;
	uniqueSellers?: number;
	avgMarkup?: number;
	avgFreeThreshold?: number;
	avgHandlingTime?: number;
}

export interface ApiResponse<T> {
	success: boolean;
	data: T;
	message?: string;
	source?: string;
}

export interface PaginatedResponse<T> {
	items: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	stats: ShippingStats;
	filters?: {
		carriers?: Array<{ id: string; name: string }>;
		zones?: Array<{ id: string; name: string }>;
		sellers?: Array<{ id: string; name: string; email: string }>;
	};
}

class ShippingService {
	// ===== TRANSPORTADORAS =====
	
	async getCarriers(params?: {
		page?: number;
		limit?: number;
		search?: string;
		status?: 'active' | 'inactive';
		apiType?: string;
		sortBy?: string;
		sortOrder?: 'asc' | 'desc';
	}): Promise<ApiResponse<PaginatedResponse<ShippingCarrier>>> {
		const searchParams = new URLSearchParams();
		
		if (params?.page) searchParams.set('page', params.page.toString());
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.search) searchParams.set('search', params.search);
		if (params?.status) searchParams.set('status', params.status);
		if (params?.apiType) searchParams.set('apiType', params.apiType);
		if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
		if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
		
		const url = `/shipping/carriers${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
		return api.get(url);
	}
	
	async createCarrier(data: Partial<ShippingCarrier>): Promise<ApiResponse<{ carrier: ShippingCarrier }>> {
		return api.post('/shipping/carriers', data);
	}
	
	async updateCarrier(id: string, data: Partial<ShippingCarrier>): Promise<ApiResponse<{ carrier: ShippingCarrier }>> {
		return api.put('/shipping/carriers', { id, ...data });
	}
	
	async deleteCarriers(ids: string[]): Promise<ApiResponse<{ deletedCarriers: ShippingCarrier[] }>> {
		return api.post('/shipping/carriers/delete', { ids });
	}
	
	// ===== ZONAS DE ENTREGA =====
	
	async getZones(params?: {
		page?: number;
		limit?: number;
		search?: string;
		state?: string;
		isActive?: boolean;
		sortBy?: string;
		sortOrder?: 'asc' | 'desc';
	}): Promise<ApiResponse<PaginatedResponse<ShippingZone>>> {
		const searchParams = new URLSearchParams();
		
		if (params?.page) searchParams.set('page', params.page.toString());
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.search) searchParams.set('search', params.search);
		if (params?.state) searchParams.set('state', params.state);
		if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());
		if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
		if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
		
		const url = `/shipping/zones${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
		return api.get(url);
	}
	
	async createZone(data: Partial<ShippingZone>): Promise<ApiResponse<{ zone: ShippingZone }>> {
		return api.post('/shipping/zones', data);
	}
	
	async updateZone(id: string, data: Partial<ShippingZone>): Promise<ApiResponse<{ zone: ShippingZone }>> {
		return api.put('/shipping/zones', { id, ...data });
	}
	
	async deleteZones(ids: string[]): Promise<ApiResponse<{ deletedZones: ShippingZone[] }>> {
		return api.post('/shipping/zones/delete', { ids });
	}
	
	// ===== TABELA DE PREÇOS =====
	
	async getRates(params?: {
		page?: number;
		limit?: number;
		search?: string;
		carrierId?: string;
		zoneId?: string;
		sortBy?: string;
		sortOrder?: 'asc' | 'desc';
	}): Promise<ApiResponse<PaginatedResponse<ShippingRate>>> {
		const searchParams = new URLSearchParams();
		
		if (params?.page) searchParams.set('page', params.page.toString());
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.search) searchParams.set('search', params.search);
		if (params?.carrierId) searchParams.set('carrierId', params.carrierId);
		if (params?.zoneId) searchParams.set('zoneId', params.zoneId);
		if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
		if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
		
		const url = `/shipping/rates${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
		return api.get(url);
	}
	
	async createRate(data: Partial<ShippingRate>): Promise<ApiResponse<{ rate: ShippingRate }>> {
		return api.post('/shipping/rates', data);
	}
	
	async updateRate(id: string, data: Partial<ShippingRate>): Promise<ApiResponse<{ rate: ShippingRate }>> {
		return api.put('/shipping/rates', { id, ...data });
	}
	
	async deleteRates(ids: string[]): Promise<ApiResponse<{ deletedRates: ShippingRate[] }>> {
		return api.post('/shipping/rates/delete', { ids });
	}
	
	// ===== CONFIGURAÇÕES POR SELLER =====
	
	async getSellerConfigs(params?: {
		page?: number;
		limit?: number;
		search?: string;
		sellerId?: string;
		carrierId?: string;
		isActive?: boolean;
		sortBy?: string;
		sortOrder?: 'asc' | 'desc';
	}): Promise<ApiResponse<PaginatedResponse<SellerShippingConfig>>> {
		const searchParams = new URLSearchParams();
		
		if (params?.page) searchParams.set('page', params.page.toString());
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.search) searchParams.set('search', params.search);
		if (params?.sellerId) searchParams.set('sellerId', params.sellerId);
		if (params?.carrierId) searchParams.set('carrierId', params.carrierId);
		if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());
		if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
		if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
		
		const url = `/shipping/seller-configs${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
		return api.get(url);
	}
	
	async createSellerConfig(data: Partial<SellerShippingConfig>): Promise<ApiResponse<{ config: SellerShippingConfig }>> {
		return api.post('/shipping/seller-configs', data);
	}
	
	async updateSellerConfig(id: string, data: Partial<SellerShippingConfig>): Promise<ApiResponse<{ config: SellerShippingConfig }>> {
		return api.put('/shipping/seller-configs', { id, ...data });
	}
	
	async deleteSellerConfigs(ids: string[]): Promise<ApiResponse<{ deletedConfigs: SellerShippingConfig[] }>> {
		return api.post('/shipping/seller-configs/delete', { ids });
	}
	
	// ===== MÉTODOS AUXILIARES =====
	
	async getAllCarriersForSelect(): Promise<Array<{ id: string; name: string; type: string }>> {
		const carriers = await this.getCarriers({ limit: 100, status: 'active' });
		return carriers.data.items.map(carrier => ({
			id: carrier.id,
			name: carrier.name,
			type: carrier.type
		}));
	}
	
	async getAllZonesForSelect(): Promise<Array<{ id: string; name: string; states: string }>> {
		try {
			const response = await this.getZones({ limit: 100, isActive: true });
			if (response.success) {
				return response.data.items.map(zone => ({
					id: zone.id,
					name: zone.name,
					states: Array.isArray(zone.states) ? zone.states.join(', ') : zone.states
				}));
			}
		} catch (error) {
			console.error('Erro ao buscar zonas:', error);
		}
		return [];
	}
	
	async getAllSellersForSelect(): Promise<Array<{ id: string; name: string; email: string }>> {
		try {
			const response = await this.getSellerConfigs({ limit: 100 });
			if (response.success && response.data.filters?.sellers) {
				return response.data.filters.sellers;
			}
		} catch (error) {
			console.error('Erro ao buscar sellers:', error);
		}
		return [];
	}
	
	// Calcular frete para um produto específico
	async calculateShipping(params: {
		sellerId: string;
		weight: number;
		postalCode: string;
		value?: number;
	}): Promise<ApiResponse<Array<{
		carrier: string;
		price: number;
		deliveryTime: string;
		isFree: boolean;
	}>>> {
		return api.post('/shipping/calculate', params);
	}
}

export const shippingService = new ShippingService(); 