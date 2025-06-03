import { toast } from '$lib/stores/toast';

interface ApiOptions extends RequestInit {
	showError?: boolean;
	showSuccess?: boolean;
	successMessage?: string;
}

class ApiService {
	private baseURL = '/api';
	
	private async request<T = any>(
		endpoint: string, 
		options: ApiOptions = {}
	): Promise<T> {
		const {
			showError = true,
			showSuccess = false,
			successMessage,
			...fetchOptions
		} = options;
		
		try {
			const response = await fetch(`${this.baseURL}${endpoint}`, {
				headers: {
					'Content-Type': 'application/json',
					...fetchOptions.headers
				},
				...fetchOptions
			});
			
			const data = await response.json();
			
			if (!response.ok) {
				throw new Error(data.error || data.message || 'Erro na requisição');
			}
			
			if (showSuccess && successMessage) {
				toast.success(successMessage);
			}
			
			return data;
		} catch (error) {
			if (showError) {
				const message = error instanceof Error ? error.message : 'Erro desconhecido';
				toast.error('Erro', message);
			}
			throw error;
		}
	}
	
	// GET
	async get<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
		return this.request<T>(endpoint, { ...options, method: 'GET' });
	}
	
	// POST
	async post<T = any>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
		return this.request<T>(endpoint, {
			...options,
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined
		});
	}
	
	// PUT
	async put<T = any>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
		return this.request<T>(endpoint, {
			...options,
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined
		});
	}
	
	// PATCH
	async patch<T = any>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
		return this.request<T>(endpoint, {
			...options,
			method: 'PATCH',
			body: data ? JSON.stringify(data) : undefined
		});
	}
	
	// DELETE
	async delete<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
		return this.request<T>(endpoint, { ...options, method: 'DELETE' });
	}
}

export const api = new ApiService(); 