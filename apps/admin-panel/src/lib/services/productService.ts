// ProductService - Conecta com a API de produtos existente
export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  originalPrice?: number;
  cost?: number;
  stock: number;
  category: string;
  categorySlug?: string;
  brand?: string;
  vendor: string;
  image: string;
  status: 'active' | 'inactive' | 'pending' | 'out_of_stock' | 'draft';
  rating?: number;
  reviews: number;
  sales: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  search?: string;
  status?: string;
  category?: string;
  vendor_id?: string;
  page?: number;
  limit?: number;
}

export interface ProductStats {
  total: number;
  active: number;
  pending: number;
  lowStock: number;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: ProductStats;
}

class ProductService {
  private baseUrl = '/api/products';

  async getProducts(filters: ProductFilters = {}): Promise<ProductsResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.vendor_id) params.append('vendor_id', filters.vendor_id);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    const response = await fetch(`${this.baseUrl}?${params}`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao buscar produtos');
    }
    
    return result.data;
  }

  async createProduct(data: any): Promise<{ id: string; message: string }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao criar produto');
    }
    
    return result.data;
  }

  async updateProduct(id: string, data: any): Promise<{ message: string }> {
    const response = await fetch(this.baseUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao atualizar produto');
    }
    
    return result.data;
  }

  async deleteProducts(ids: string[]): Promise<{ message: string }> {
    const response = await fetch(this.baseUrl, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao excluir produtos');
    }
    
    return result.data;
  }

  async getCategories(): Promise<Array<{ value: string; label: string }>> {
    const response = await fetch('/api/categories');
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao buscar categorias');
    }
    
    return result.data.categories.map((cat: any) => ({
      value: cat.slug,
      label: cat.name
    }));
  }

  async duplicateProduct(id: string): Promise<{ id: string; message: string }> {
    // Buscar produto original
    const response = await fetch(`${this.baseUrl}/${id}`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao buscar produto');
    }
    
    const original = result.data;
    
    // Criar cópia com novo SKU
    const newData = {
      ...original,
      name: `${original.name} (Cópia)`,
      sku: `${original.sku}-copy-${Date.now()}`,
      slug: `${original.slug}-copy-${Date.now()}`,
      status: 'draft'
    };
    
    delete newData.id;
    delete newData.createdAt;
    delete newData.updatedAt;
    
    return this.createProduct(newData);
  }
}

export const productService = new ProductService(); 