import { getXataClient } from '$lib/db/xata';
import type { Product, Category, Brand, Seller } from '$lib/types/products.types';

export interface ProductsFilter {
	search?: string;
	categoryId?: string;
	brandId?: string;
	sellerId?: string;
	status?: string;
	minPrice?: number;
	maxPrice?: number;
	minStock?: number;
	maxStock?: number;
	featured?: boolean;
	hasStock?: boolean;
}

export interface ProductsSort {
	field: 'name' | 'price' | 'quantity' | 'created_at' | 'sales_count' | 'view_count';
	direction: 'asc' | 'desc';
}

export interface ProductsResponse {
	products: Product[];
	totalCount: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface ProductStats {
	total: number;
	active: number;
	inactive: number;
	draft: number;
	lowStock: number;
	outOfStock: number;
	featured: number;
	totalValue: number;
}

class ProductsService {
	private xata = getXataClient();

	async getProducts(
		page = 1,
		pageSize = 10,
		filters: ProductsFilter = {},
		sort: ProductsSort = { field: 'created_at', direction: 'desc' }
	): Promise<ProductsResponse> {
		// Construir query base
		let query = this.xata.db.products.filter({});

		// Aplicar filtros
		if (filters.search) {
			query = query.filter({
				$any: [
					{ name: { $contains: filters.search } },
					{ sku: { $contains: filters.search } },
					{ description: { $contains: filters.search } }
				]
			});
		}

		if (filters.categoryId) {
			query = query.filter({ category_id: filters.categoryId });
		}

		if (filters.brandId) {
			query = query.filter({ brand_id: filters.brandId });
		}

		if (filters.sellerId) {
			query = query.filter({ seller_id: filters.sellerId });
		}

		if (filters.status) {
			query = query.filter({ status: filters.status });
		}

		if (filters.minPrice !== undefined) {
			query = query.filter({ price: { $ge: filters.minPrice } });
		}

		if (filters.maxPrice !== undefined) {
			query = query.filter({ price: { $le: filters.maxPrice } });
		}

		if (filters.minStock !== undefined) {
			query = query.filter({ quantity: { $ge: filters.minStock } });
		}

		if (filters.maxStock !== undefined) {
			query = query.filter({ quantity: { $le: filters.maxStock } });
		}

		if (filters.featured !== undefined) {
			query = query.filter({ featured: filters.featured });
		}

		if (filters.hasStock === true) {
			query = query.filter({ quantity: { $gt: 0 } });
		} else if (filters.hasStock === false) {
			query = query.filter({ quantity: 0 });
		}

		// Obter contagem total
		const totalCount = await query.aggregate({ count: '*' });

		// Aplicar ordenação e paginação
		const products = await query
			.sort(sort.field, sort.direction)
			.getPaginated({
				pagination: {
					size: pageSize,
					offset: (page - 1) * pageSize
				},
				columns: [
					'id',
					'sku',
					'name',
					'slug',
					'description',
					'short_description',
					'price',
					'original_price',
					'cost',
					'quantity',
					'status',
					'featured',
					'view_count',
					'sales_count',
					'rating_average',
					'rating_count',
					'brand_id',
					'category_id',
					'seller_id',
					'created_at',
					'updated_at'
				]
			});

		// Buscar relacionamentos
		const brandIds = [...new Set(products.records.filter((p: any) => p.brand_id).map((p: any) => p.brand_id!))];
		const categoryIds = [...new Set(products.records.filter((p: any) => p.category_id).map((p: any) => p.category_id!))];
		const sellerIds = [...new Set(products.records.filter((p: any) => p.seller_id).map((p: any) => p.seller_id!))];

		const [brands, categories, sellers] = await Promise.all([
			brandIds.length > 0 ? this.xata.db.brands.filter({ id: { $any: brandIds } }).getMany() : [],
			categoryIds.length > 0 ? this.xata.db.categories.filter({ id: { $any: categoryIds } }).getMany() : [],
			sellerIds.length > 0 ? this.xata.db.sellers.filter({ id: { $any: sellerIds } }).getMany() : []
		]);

		// Mapear relacionamentos
		const brandsMap = new Map(brands.map((b: any) => [b.id, b]));
		const categoriesMap = new Map(categories.map((c: any) => [c.id, c]));
		const sellersMap = new Map(sellers.map((s: any) => [s.id, s]));

		// Enriquecer produtos com relacionamentos
		const enrichedProducts = products.records.map((product: any) => ({
			...product,
			brand: product.brand_id ? brandsMap.get(product.brand_id) : null,
			category: product.category_id ? categoriesMap.get(product.category_id) : null,
			seller: product.seller_id ? sellersMap.get(product.seller_id) : null
		}));

		return {
			products: enrichedProducts as Product[],
			totalCount: totalCount.aggs.count || 0,
			page,
			pageSize,
			totalPages: Math.ceil((totalCount.aggs.count || 0) / pageSize)
		};
	}

	async getProductStats(filters: ProductsFilter = {}): Promise<ProductStats> {
		// Query base com filtros
		let baseQuery = this.xata.db.products.filter({});

		// Aplicar filtros básicos
		if (filters.categoryId) {
			baseQuery = baseQuery.filter({ category_id: filters.categoryId });
		}
		if (filters.brandId) {
			baseQuery = baseQuery.filter({ brand_id: filters.brandId });
		}
		if (filters.sellerId) {
			baseQuery = baseQuery.filter({ seller_id: filters.sellerId });
		}

		// Executar agregações em paralelo
		const [
			total,
			active,
			inactive,
			draft,
			lowStock,
			outOfStock,
			featured,
			totalValue
		] = await Promise.all([
			// Total de produtos
			baseQuery.aggregate({ count: '*' }),
			// Produtos ativos
			baseQuery.filter({ status: 'active' }).aggregate({ count: '*' }),
			// Produtos inativos
			baseQuery.filter({ status: 'inactive' }).aggregate({ count: '*' }),
			// Produtos em rascunho
			baseQuery.filter({ status: 'draft' }).aggregate({ count: '*' }),
			// Estoque baixo (entre 1 e 10)
			baseQuery.filter({ 
				$all: [
					{ quantity: { $gt: 0 } },
					{ quantity: { $le: 10 } }
				]
			}).aggregate({ count: '*' }),
			// Sem estoque
			baseQuery.filter({ quantity: 0 }).aggregate({ count: '*' }),
			// Produtos em destaque
			baseQuery.filter({ featured: true }).aggregate({ count: '*' }),
			// Valor total do estoque
			baseQuery.aggregate({ 
				totalValue: { 
					$sum: { 
						$multiply: ['price', 'quantity'] 
					} 
				} 
			})
		]);

		return {
			total: total.aggs.count || 0,
			active: active.aggs.count || 0,
			inactive: inactive.aggs.count || 0,
			draft: draft.aggs.count || 0,
			lowStock: lowStock.aggs.count || 0,
			outOfStock: outOfStock.aggs.count || 0,
			featured: featured.aggs.count || 0,
			totalValue: totalValue.aggs.totalValue || 0
		};
	}

	async getCategories(): Promise<Category[]> {
		const categories = await this.xata.db.categories
			.filter({ is_active: true })
			.sort('name', 'asc')
			.getMany();
		
		return categories as Category[];
	}

	async getBrands(): Promise<Brand[]> {
		const brands = await this.xata.db.brands
			.filter({ is_active: true })
			.sort('name', 'asc')
			.getMany();
		
		return brands as Brand[];
	}

	async getSellers(): Promise<Seller[]> {
		const sellers = await this.xata.db.sellers
			.filter({ is_active: true })
			.sort('name', 'asc')
			.getMany();
		
		return sellers as Seller[];
	}

	async getProduct(id: string): Promise<Product | null> {
		const product = await this.xata.db.products
			.filter({ id })
			.getFirst();

		if (!product) return null;

		// Buscar relacionamentos
		const [brand, category, seller] = await Promise.all([
			product.brand_id ? this.xata.db.brands.filter({ id: product.brand_id }).getFirst() : null,
			product.category_id ? this.xata.db.categories.filter({ id: product.category_id }).getFirst() : null,
			product.seller_id ? this.xata.db.sellers.filter({ id: product.seller_id }).getFirst() : null
		]);

		return {
			...product,
			brand,
			category,
			seller
		} as Product;
	}

	async createProduct(data: Partial<Product>): Promise<Product> {
		const product = await this.xata.db.products.create({
			...data,
			created_at: new Date(),
			updated_at: new Date()
		});

		return this.getProduct(product.id) as Promise<Product>;
	}

	async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
		await this.xata.db.products.update(id, {
			...data,
			updated_at: new Date()
		});

		return this.getProduct(id) as Promise<Product>;
	}

	async deleteProduct(id: string): Promise<void> {
		await this.xata.db.products.delete(id);
	}

	async updateStock(id: string, quantity: number): Promise<void> {
		await this.xata.db.products.update(id, {
			quantity,
			updated_at: new Date()
		});
	}

	async toggleFeatured(id: string): Promise<void> {
		const product = await this.xata.db.products.filter({ id }).getFirst();
		if (product) {
			await this.xata.db.products.update(id, {
				featured: !product.featured,
				updated_at: new Date()
			});
		}
	}
}

export const productsService = new ProductsService(); 