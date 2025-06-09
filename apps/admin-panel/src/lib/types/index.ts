// Tipos base
export interface BaseEntity {
	id: string;
	created_at: string;
	updated_at: string;
}

// Produto
export interface Product extends BaseEntity {
	name: string;
	slug: string;
	sku: string;
	barcode?: string;
	model?: string;
	description: string;
	short_description?: string;
	
	// Preços
	price: number;
	original_price?: number;
	cost?: number;
	currency: string;
	
	// Estoque
	quantity: number;
	stock_location?: string;
	track_inventory: boolean;
	allow_backorder: boolean;
	
	// Relacionamentos
	category_id?: string;
	brand_id?: string;
	seller_id?: string;
	
	// Status
	status: 'draft' | 'active' | 'inactive';
	is_active: boolean;
	featured: boolean;
	condition: 'new' | 'used' | 'refurbished';
	
	// Dimensões
	weight?: number;
	height?: number;
	width?: number;
	length?: number;
	
	// SEO
	meta_title?: string;
	meta_description?: string;
	meta_keywords?: string[];
	
	// Arrays
	images?: string[];
	tags?: string[];
}

// Categoria (campos conforme retornados pela API)
export interface Category extends BaseEntity {
	name: string;
	slug: string;
	description?: string;
	parentId?: string;
	imageUrl?: string;
	isActive: boolean;
	position: number;
	subcategoryCount?: number;
	productCount?: number;
}

// Marca
export interface Brand extends BaseEntity {
	name: string;
	slug: string;
	description?: string;
	logo_url?: string;
	website_url?: string;
	is_active: boolean;
}

// Vendedor
export interface Seller extends BaseEntity {
	user_id: string;
	store_name: string;
	store_slug: string;
	company_name: string;
	tax_id: string;
	description?: string;
	logo_url?: string;
	banner_url?: string;
	phone?: string;
	email: string;
	website_url?: string;
	address?: string;
	commission_rate: number;
	status: 'pending' | 'active' | 'inactive' | 'suspended';
	is_verified: boolean;
}

// Usuário
export interface User extends BaseEntity {
	name: string;
	email: string;
	phone?: string;
	role: 'customer' | 'vendor' | 'admin';
	is_active: boolean;
	email_verified: boolean;
	seller_id?: string;
	avatar_url?: string;
}

// Pedido
export interface Order extends BaseEntity {
	order_number: string;
	user_id: string;
	status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
	payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
	subtotal: number;
	discount: number;
	shipping: number;
	tax: number;
	total: number;
	items: OrderItem[];
}

export interface OrderItem {
	id: string;
	product_id: string;
	seller_id: string;
	quantity: number;
	price: number;
	total: number;
}

// Respostas da API
export interface ApiResponse<T> {
	success: boolean;
	data: T;
	error?: string;
	message?: string;
}

export interface PaginatedResponse<T> {
	success: boolean;
	data: {
		items: T[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	};
} 