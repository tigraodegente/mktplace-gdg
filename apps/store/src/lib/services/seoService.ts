interface SEOData {
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  structured_data?: any;
}

interface CategorySEOTemplate {
  title_template: string;
  description_template: string;
  keywords_base: string[];
  og_image?: string;
}

/**
 * Serviço de SEO dinâmico para marketplace
 * Gera meta tags otimizadas baseadas em contexto
 */
class SEOService {
  private static instance: SEOService;
  private categoryTemplates: Map<string, CategorySEOTemplate> = new Map();
  
  static getInstance(): SEOService {
    if (!SEOService.instance) {
      SEOService.instance = new SEOService();
      SEOService.instance.initializeTemplates();
    }
    return SEOService.instance;
  }
  
  private initializeTemplates() {
    // Templates SEO por categoria
    this.categoryTemplates.set('almofadas', {
      title_template: 'Almofadas {filters} - {count} produtos | Grão de Gente',
      description_template: 'Encontre {count} almofadas {filters} na Grão de Gente. Almofadas decorativas, de amamentação e muito mais. Frete grátis e entrega rápida.',
      keywords_base: ['almofadas', 'almofadas decorativas', 'almofadas bebê', 'almofadas amamentação'],
      og_image: '/images/seo/almofadas-og.jpg'
    });
    
    this.categoryTemplates.set('decoracao', {
      title_template: 'Decoração {filters} - {count} produtos | Grão de Gente',
      description_template: 'Descubra {count} itens de decoração {filters} para deixar sua casa mais bonita. Qualidade e estilo na Grão de Gente.',
      keywords_base: ['decoração', 'decoração infantil', 'decoração quarto bebê', 'enfeites'],
      og_image: '/images/seo/decoracao-og.jpg'
    });
    
    this.categoryTemplates.set('quarto-de-bebe', {
      title_template: 'Quarto de Bebê {filters} - {count} produtos | Grão de Gente',
      description_template: 'Complete o quarto do bebê com {count} produtos {filters}. Móveis, decoração e acessórios com segurança e qualidade.',
      keywords_base: ['quarto de bebê', 'móveis bebê', 'decoração quarto bebê', 'berço'],
      og_image: '/images/seo/quarto-bebe-og.jpg'
    });
    
    // Template padrão
    this.categoryTemplates.set('default', {
      title_template: '{category} {filters} - {count} produtos | Grão de Gente',
      description_template: 'Encontre {count} produtos de {category} {filters} na Grão de Gente. Qualidade, segurança e as melhores marcas para sua família.',
      keywords_base: ['produtos infantis', 'bebê', 'criança', 'maternidade'],
      og_image: '/images/seo/default-og.jpg'
    });
  }
  
  /**
   * Gerar SEO para página de busca/categoria
   */
  generateSearchPageSEO(params: {
    category?: string;
    query?: string;
    filters?: Record<string, any>;
    totalCount?: number;
    currentPage?: number;
    baseUrl?: string;
  }): SEOData {
    const {
      category = '',
      query = '',
      filters = {},
      totalCount = 0,
      currentPage = 1,
      baseUrl = 'https://graodegente.com'
    } = params;
    
    // Determinar template a usar
    const templateKey = category || 'default';
    const template = this.categoryTemplates.get(templateKey) || this.categoryTemplates.get('default')!;
    
    // Gerar strings dos filtros para SEO
    const filterStrings = this.buildFilterStrings(filters);
    const categoryName = this.formatCategoryName(category);
    
    // Construir título
    let title = template.title_template
      .replace('{category}', categoryName)
      .replace('{filters}', filterStrings.title)
      .replace('{count}', totalCount.toLocaleString('pt-BR'));
    
    // Adicionar query se houver busca
    if (query) {
      title = `${query} - ${title}`;
    }
    
    // Adicionar página se não for a primeira
    if (currentPage > 1) {
      title += ` - Página ${currentPage}`;
    }
    
    // Construir descrição
    let description = template.description_template
      .replace('{category}', categoryName.toLowerCase())
      .replace('{filters}', filterStrings.description)
      .replace('{count}', totalCount.toLocaleString('pt-BR'));
    
    if (query) {
      description = `Resultados para "${query}": ${description}`;
    }
    
    // Construir keywords
    const keywords = [
      ...template.keywords_base,
      categoryName,
      ...filterStrings.keywords,
      query
    ].filter(Boolean);
    
    // URL canônica
    const canonical = this.buildCanonicalUrl(baseUrl, { category, query, filters, currentPage });
    
    // Open Graph
    const ogTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
    const ogDescription = description.length > 155 ? description.substring(0, 152) + '...' : description;
    
    // Structured Data (JSON-LD)
    const structured_data = this.generateStructuredData({
      category: categoryName,
      query,
      totalCount,
      filters,
      canonical
    });
    
    return {
      title: this.truncateTitle(title),
      description: this.truncateDescription(description),
      keywords,
      canonical,
      ogTitle,
      ogDescription,
      ogImage: template.og_image,
      structured_data
    };
  }
  
  /**
   * Gerar SEO para página de produto
   */
  generateProductPageSEO(product: {
    name: string;
    description?: string;
    price: number;
    category_name?: string;
    brand_name?: string;
    images?: string[];
    rating?: number;
    reviews_count?: number;
    slug: string;
  }, baseUrl: string = 'https://graodegente.com'): SEOData {
    const {
      name,
      description = '',
      price,
      category_name = '',
      brand_name = '',
      images = [],
      rating = 0,
      reviews_count = 0,
      slug
    } = product;
    
    const priceFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
    
    // Título otimizado
    const title = `${name} ${brand_name ? `- ${brand_name}` : ''} por ${priceFormatted} | Grão de Gente`;
    
    // Descrição otimizada
    const descriptionMeta = description 
      ? `${description.substring(0, 100)}... Compre ${name} por ${priceFormatted} na Grão de Gente. ${reviews_count > 0 ? `${reviews_count} avaliações` : 'Produto de qualidade'}.`
      : `Compre ${name} por ${priceFormatted} na Grão de Gente. ${category_name} de qualidade com frete grátis e entrega rápida.`;
    
    // Keywords
    const keywords = [
      name.toLowerCase(),
      category_name.toLowerCase(),
      brand_name.toLowerCase(),
      'comprar',
      'preço',
      'frete grátis'
    ].filter(Boolean);
    
    const canonical = `${baseUrl}/produto/${slug}`;
    
    // Structured Data para produto
    const structured_data = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": name,
      "description": description,
      "image": images,
      "brand": {
        "@type": "Brand",
        "name": brand_name || "Grão de Gente"
      },
      "offers": {
        "@type": "Offer",
        "price": price,
        "priceCurrency": "BRL",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "Grão de Gente"
        }
      },
      ...(rating > 0 && reviews_count > 0 && {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": rating,
          "reviewCount": reviews_count
        }
      })
    };
    
    return {
      title: this.truncateTitle(title),
      description: this.truncateDescription(descriptionMeta),
      keywords,
      canonical,
      ogTitle: name,
      ogDescription: `${name} por ${priceFormatted} na Grão de Gente`,
      ogImage: images[0],
      structured_data
    };
  }
  
  private buildFilterStrings(filters: Record<string, any>) {
    const activeFilters = [];
    const keywords = [];
    
    if (filters.marca?.length) {
      activeFilters.push(`da marca ${filters.marca.join(', ')}`);
      keywords.push(...filters.marca.map((m: string) => m.toLowerCase()));
    }
    
    if (filters.preco_min || filters.preco_max) {
      const min = filters.preco_min ? `R$ ${filters.preco_min}` : '';
      const max = filters.preco_max ? `R$ ${filters.preco_max}` : '';
      if (min && max) {
        activeFilters.push(`entre ${min} e ${max}`);
      } else if (min) {
        activeFilters.push(`a partir de ${min}`);
      } else if (max) {
        activeFilters.push(`até ${max}`);
      }
    }
    
    if (filters.promocao) {
      activeFilters.push('em promoção');
      keywords.push('promoção', 'desconto', 'oferta');
    }
    
    if (filters.frete_gratis) {
      activeFilters.push('com frete grátis');
      keywords.push('frete grátis');
    }
    
    return {
      title: activeFilters.length ? ` ${activeFilters.join(' ')}` : '',
      description: activeFilters.length ? ` ${activeFilters.join(', ')}` : '',
      keywords
    };
  }
  
  private formatCategoryName(category: string): string {
    if (!category) return '';
    
    const categoryMap: Record<string, string> = {
      'almofadas': 'Almofadas',
      'decoracao': 'Decoração',
      'quarto-de-bebe': 'Quarto de Bebê',
      'brinquedos': 'Brinquedos',
      'roupinhas': 'Roupinhas'
    };
    
    return categoryMap[category] || category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  private buildCanonicalUrl(baseUrl: string, params: any): string {
    const { category, query, filters, currentPage } = params;
    
    let url = `${baseUrl}/busca`;
    const searchParams = new URLSearchParams();
    
    if (query) searchParams.set('q', query);
    if (category) searchParams.set('categoria', category);
    
    // Adicionar filtros importantes para canonical
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'pagina') {
        searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
      }
    });
    
    if (currentPage > 1) searchParams.set('pagina', String(currentPage));
    
    const query_string = searchParams.toString();
    return query_string ? `${url}?${query_string}` : url;
  }
  
  private generateStructuredData(params: any) {
    const { category, query, totalCount, canonical } = params;
    
    return {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      "url": canonical,
      "name": `${query || category} - Resultados de Busca`,
      "description": `${totalCount} produtos encontrados`,
      "provider": {
        "@type": "Organization",
        "name": "Grão de Gente",
        "url": "https://graodegente.com"
      }
    };
  }
  
  private truncateTitle(title: string, maxLength: number = 60): string {
    return title.length > maxLength ? title.substring(0, maxLength - 3) + '...' : title;
  }
  
  private truncateDescription(description: string, maxLength: number = 155): string {
    return description.length > maxLength ? description.substring(0, maxLength - 3) + '...' : description;
  }
}

// Export singleton
export const seoService = SEOService.getInstance();

// Export types
export type { SEOData, CategorySEOTemplate }; 