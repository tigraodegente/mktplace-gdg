// Tipos base das entidades
export interface Product {
	id: string;
	sku: string;
	name: string;
	slug: string;
	description?: string | null;
	short_description?: string | null;
	price: number;
	original_price?: number | null;
	cost?: number | null;
	quantity: number;
	status: 'active' | 'inactive' | 'draft';
	featured?: boolean;
	view_count?: number;
	sales_count?: number;
	rating_average?: number | null;
	rating_count?: number;
	brand_id?: string | null;
	category_id?: string | null;
	seller_id?: string | null;
	// Campos SEO
	meta_title?: string;
	meta_description?: string;
	meta_keywords?: string[];
	tags?: string[];
	canonical_url?: string;
	robots_meta?: string;
	schema_type?: string;
	og_title?: string;
	og_description?: string;
	og_image?: string;
	seo_index?: boolean;
	seo_follow?: boolean;
	created_at: Date | string;
	updated_at: Date | string;
	// Relacionamentos
	brand?: Brand | null;
	category?: Category | null;
	seller?: Seller | null;
}

export interface Category {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	is_active: boolean;
	parent_id?: string | null;
	created_at: Date | string;
	updated_at: Date | string;
	// Relacionamentos
	parent?: Category | null;
	children?: Category[];
}

export interface Brand {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	logo?: string | null;
	is_active: boolean;
	created_at: Date | string;
	updated_at: Date | string;
}

export interface Seller {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	is_active: boolean;
	created_at: Date | string;
	updated_at: Date | string;
}

// Tipos para formulários
export interface ProductFormData {
	name: string;
	sku: string;
	slug: string;
	description?: string;
	short_description?: string;
	price: number;
	original_price?: number;
	cost?: number;
	quantity: number;
	status: 'active' | 'inactive' | 'draft';
	featured: boolean;
	brand_id?: string;
	category_id?: string;
	seller_id?: string;
	// Campos SEO
	meta_title?: string;
	meta_description?: string;
	meta_keywords?: string[];
	tags?: string[];
	canonical_url?: string;
	robots_meta?: string;
	schema_type?: string;
	og_title?: string;
	og_description?: string;
	og_image?: string;
	seo_index?: boolean;
	seo_follow?: boolean;
	// Campos avançados
	requires_shipping?: boolean;
	is_digital?: boolean;
	tax_class?: string;
	warranty_period?: string;
	manufacturing_country?: string;
	product_condition?: 'new' | 'used' | 'refurbished';
	custom_fields?: Record<string, any>;
	related_products?: string[];
	upsell_products?: string[];
	download_files?: { name: string; url: string }[];
}

// Tipos para a grid
export interface GridColumn {
	key: string;
	label: string;
	sortable?: boolean;
	width?: string;
	align?: 'left' | 'center' | 'right';
	component?: any;
	formatter?: (value: any, row: any) => string;
	className?: string;
	headerClassName?: string;
}

// Tipos para filtros
export interface Filter {
	id: string;
	label: string;
	type: 'select' | 'date' | 'daterange' | 'number' | 'checkbox' | 'text';
	value: any;
	options?: FilterOption[];
	placeholder?: string;
	min?: number;
	max?: number;
	className?: string;
}

export interface FilterOption {
	value: string | number;
	label: string;
	icon?: string;
} 