// Schema.org utilities para SEO avançado
export interface SchemaData {
  name: string;
  url: string;
  description: string;
  logo: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface ProductSchemaData {
  name: string;
  description: string;
  image: string[];
  sku: string;
  brand: string;
  price: number;
  currency: string;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  rating?: number;
  reviewCount?: number;
  seller?: string;
}

// Website Schema
export function generateWebsiteSchema(data: SchemaData) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": data.name,
    "url": data.url,
    "description": data.description,
    "logo": data.logo,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${data.url}/busca?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    },
    "sameAs": [
      "https://facebook.com/marketplace-gdg",
      "https://instagram.com/marketplace-gdg",
      "https://youtube.com/marketplace-gdg",
      "https://twitter.com/marketplace-gdg"
    ],
    "publisher": {
      "@type": "Organization",
      "name": data.name,
      "logo": {
        "@type": "ImageObject",
        "url": data.logo
      }
    }
  };
}

// Organization Schema
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Marketplace Grão de Gente",
    "alternateName": "GDG Marketplace",
    "url": "https://marketplace-gdg.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://marketplace-gdg.com/logo-512.png",
      "width": 512,
      "height": 512
    },
    "description": "O melhor marketplace brasileiro para produtos infantis de qualidade",
    "foundingDate": "2010",
    "legalName": "Grão de Gente Comércio de Produtos Infantis LTDA",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Rua das Crianças, 123",
      "addressLocality": "Varginha",
      "addressRegion": "MG",
      "postalCode": "37000-000",
      "addressCountry": "BR"
    },
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": "+55-35-3333-3333",
        "contactType": "customer service",
        "areaServed": "BR",
        "availableLanguage": "Portuguese",
        "hoursAvailable": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "08:00",
          "closes": "18:00"
        }
      },
      {
        "@type": "ContactPoint",
        "telephone": "+55-35-9999-9999",
        "contactType": "sales",
        "areaServed": "BR",
        "availableLanguage": "Portuguese"
      }
    ],
    "sameAs": [
      "https://facebook.com/marketplace-gdg",
      "https://instagram.com/marketplace-gdg",
      "https://youtube.com/marketplace-gdg"
    ],
    "taxID": "12.345.678/0001-99",
    "vatID": "BR123456780",
    "paymentAccepted": ["Credit Card", "Debit Card", "Bank Transfer", "PIX"],
    "priceRange": "R$10 - R$2000"
  };
}

// Breadcrumb Schema
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": {
        "@type": "WebPage",
        "@id": item.url
      }
    }))
  };
}

// Product Schema
export function generateProductSchema(product: ProductSchemaData) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "image": product.image,
    "sku": product.sku,
    "mpn": product.sku,
    "brand": {
      "@type": "Brand",
      "name": product.brand
    },
    "offers": {
      "@type": "Offer",
      "url": `https://marketplace-gdg.com/produto/${product.sku}`,
      "priceCurrency": product.currency,
      "price": product.price.toString(),
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "availability": `https://schema.org/${product.availability}`,
      "seller": {
        "@type": "Organization",
        "name": product.seller || "Marketplace GDG"
      },
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "BR",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 7
      },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": "15.90",
          "currency": "BRL"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "businessDays": {
            "@type": "QuantitativeValue",
            "minValue": 3,
            "maxValue": 10
          }
        }
      }
    },
    ...(product.rating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": product.rating.toString(),
        "reviewCount": product.reviewCount?.toString() || "1",
        "bestRating": "5",
        "worstRating": "1"
      }
    })
  };
}

// FAQ Schema
export function generateFAQSchema(faqs: Array<{question: string, answer: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

// Local Business Schema (se tiver loja física)
export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "Marketplace Grão de Gente - Loja Física",
    "url": "https://marketplace-gdg.com",
    "telephone": "+55-35-3333-3333",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Rua das Crianças, 123",
      "addressLocality": "Varginha",
      "addressRegion": "MG",
      "postalCode": "37000-000",
      "addressCountry": "BR"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": -21.5555,
      "longitude": -45.4333
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "08:00",
        "closes": "18:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Saturday",
        "opens": "08:00",
        "closes": "12:00"
      }
    ],
    "priceRange": "R$10 - R$2000",
    "paymentAccepted": ["Credit Card", "Debit Card", "Cash", "PIX"]
  };
}

// E-commerce Site Schema
export function generateEcommerceSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "name": "Marketplace Grão de Gente",
    "url": "https://marketplace-gdg.com",
    "description": "Marketplace especializado em produtos infantis de qualidade",
    "currenciesAccepted": "BRL",
    "paymentAccepted": ["Credit Card", "Debit Card", "Bank Transfer", "PIX"],
    "priceRange": "R$10 - R$2000",
    "areaServed": {
      "@type": "Country",
      "name": "Brazil"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Catálogo de Produtos Infantis",
      "itemListElement": [
        {
          "@type": "OfferCatalog",
          "name": "Brinquedos",
          "itemListElement": []
        },
        {
          "@type": "OfferCatalog", 
          "name": "Roupas Infantis",
          "itemListElement": []
        }
      ]
    }
  };
}

// Utility para combinar múltiplos schemas
export function combineSchemas(...schemas: any[]) {
  return {
    "@context": "https://schema.org",
    "@graph": schemas
  };
}

// Utility para serializar schema como JSON-LD
export function serializeSchema(schema: any): string {
  return JSON.stringify(schema, null, 0);
} 