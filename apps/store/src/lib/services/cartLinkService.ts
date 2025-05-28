import type { CartItem } from '$lib/types/cart';

/**
 * Serviço para gerar e gerenciar links de carrinho compartilháveis
 */

// Interface para dados do link
interface CartLinkData {
	items: Array<{
		productId: string;
		quantity: number;
		selectedColor?: string;
		selectedSize?: string;
	}>;
	timestamp: number;
	version: string;
}

// Gerar ID único para o link
function generateLinkId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 9);
	return `${timestamp}-${random}`;
}

// Comprimir dados do carrinho para URL (corrigido)
function compressCartData(items: CartItem[]): string {
	const data: CartLinkData = {
		items: items.map(item => ({
			productId: item.product.id,
			quantity: item.quantity,
			selectedColor: item.selectedColor,
			selectedSize: item.selectedSize
		})),
		timestamp: Date.now(),
		version: '1.0'
	};
	
	// Converter para base64 URL-safe
	const jsonString = JSON.stringify(data);
	// Usar encodeURIComponent depois do btoa para garantir URL válida
	const base64 = btoa(unescape(encodeURIComponent(jsonString)));
	// Tornar URL-safe
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Descomprimir dados do carrinho da URL (corrigido)
export function decompressCartData(compressed: string): CartLinkData | null {
	try {
		// Reverter URL-safe para base64 normal
		let base64 = compressed.replace(/-/g, '+').replace(/_/g, '/');
		// Adicionar padding se necessário
		while (base64.length % 4) {
			base64 += '=';
		}
		
		const jsonString = decodeURIComponent(escape(atob(base64)));
		const data = JSON.parse(jsonString) as CartLinkData;
		
		// Verificar se não expirou
		const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
		if (Date.now() - data.timestamp > sevenDaysInMs) {
			console.warn('Link expirado');
			return null;
		}
		
		return data;
	} catch (error) {
		console.error('Erro ao descomprimir dados do carrinho:', error);
		return null;
	}
}

// Gerar link do carrinho
export function generateCartLink(items: CartItem[]): string {
	const data: CartLinkData = {
		items: items.map(item => ({
			productId: item.product.id,
			quantity: item.quantity,
			selectedColor: item.selectedColor,
			selectedSize: item.selectedSize
		})),
		timestamp: Date.now(),
		version: '1.0'
	};
	
	// Codificar dados em base64
	const encoded = btoa(JSON.stringify(data));
	
	// Gerar URL
	const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://marketplace.com';
	return `${baseUrl}/cart/shared?data=${encoded}`;
}

// Gerar link curto (simulado - em produção usaria um serviço real)
export async function generateShortLink(longUrl: string): Promise<string> {
	// Simular delay de API
	await new Promise(resolve => setTimeout(resolve, 500));
	
	// Em produção, isso chamaria uma API de encurtamento
	const shortId = Math.random().toString(36).substring(2, 8);
	return `https://mkt.link/${shortId}`;
}

// Copiar para clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			return true;
		} else {
			// Fallback para browsers antigos
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.left = '-999999px';
			textArea.style.top = '-999999px';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			
			const successful = document.execCommand('copy');
			document.body.removeChild(textArea);
			
			return successful;
		}
	} catch (error) {
		console.error('Erro ao copiar:', error);
		return false;
	}
}

// Interface para histórico de links
interface CartLinkHistoryItem {
	id: string;
	createdAt: number;
	itemCount: number;
	compressed: string;
}

// Obter histórico de links gerados
export function getCartLinkHistory(): CartLinkHistoryItem[] {
	try {
		const history = localStorage.getItem('cartLinkHistory');
		return history ? JSON.parse(history) : [];
	} catch {
		return [];
	}
}

// Formatar data para exibição
export function formatLinkDate(timestamp: number): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);
	
	if (minutes < 1) return 'Agora mesmo';
	if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} atrás`;
	if (hours < 24) return `${hours} ${hours === 1 ? 'hora' : 'horas'} atrás`;
	if (days < 7) return `${days} ${days === 1 ? 'dia' : 'dias'} atrás`;
	
	return date.toLocaleDateString('pt-BR');
}

// Gerar URL do QR Code
export function generateQRCodeUrl(data: string): string {
	const size = 200;
	const encodedData = encodeURIComponent(data);
	
	// Usando API do Google Charts (em produção, usar uma solução própria)
	return `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodedData}&choe=UTF-8`;
}

// Decodificar link compartilhado
export function decodeCartLink(encodedData: string): CartLinkData | null {
	try {
		const decoded = atob(encodedData);
		const data = JSON.parse(decoded) as CartLinkData;
		
		// Validar versão
		if (data.version !== '1.0') {
			console.warn('Versão do link incompatível');
			return null;
		}
		
		// Validar timestamp (links válidos por 7 dias)
		const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
		if (Date.now() - data.timestamp > sevenDaysInMs) {
			console.warn('Link expirado');
			return null;
		}
		
		return data;
	} catch (error) {
		console.error('Erro ao decodificar link:', error);
		return null;
	}
}

// Validar se um link é válido
export function isValidCartLink(url: string): boolean {
	try {
		const urlObj = new URL(url);
		return urlObj.pathname === '/cart/shared' && urlObj.searchParams.has('data');
	} catch {
		return false;
	}
} 