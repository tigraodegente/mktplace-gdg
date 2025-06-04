import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5173'; // URL do admin panel

async function testProductFields() {
  console.log('🧪 Testando sincronização completa de campos...\n');

  try {
    // 1. Criar produto com TODOS os campos
    console.log('1️⃣ Criando produto com todos os campos...');
    
    const testProduct = {
      // Campos básicos
      name: 'Produto Teste Completo',
      slug: 'produto-teste-completo',
      sku: 'TEST-COMPLETE-001',
      barcode: '7891234567890',
      model: 'MODEL-2024',
      condition: 'new',
      description: 'Descrição completa do produto de teste',
      short_description: 'Descrição curta',
      
      // Preços
      price: 299.99,
      original_price: 399.99,
      cost: 150.00,
      
      // Estoque
      quantity: 100,
      stock_location: 'A1-B2-C3',
      track_inventory: true,
      allow_backorder: false,
      low_stock_alert: 10,
      
      // Status
      status: 'active',
      is_active: true,
      featured: true,
      
      // Categorias
      category_ids: [], // Será preenchido depois
      brand_id: null, // Será preenchido depois
      seller_id: null, // Será preenchido depois
      
      // Tags
      tags: ['teste', 'completo', 'novo'],
      
      // Dimensões
      weight: 1.5,
      height: 30,
      width: 20,
      length: 10,
      
      // SEO
      meta_title: 'Produto Teste - Melhor Preço',
      meta_description: 'Compre o produto teste com todas as funcionalidades',
      meta_keywords: ['teste', 'produto', 'completo'],
      
      // Novos campos
      has_free_shipping: true,
      delivery_days: 5,
      seller_state: 'SP',
      seller_city: 'São Paulo',
      is_digital: false,
      requires_shipping: true,
      tax_class: 'standard',
      ncm_code: '1234.56.78',
      gtin: '7891234567890',
      origin: '0',
      manufacturing_country: 'BR',
      care_instructions: 'Manter em local seco e arejado',
      manual_link: 'https://exemplo.com/manual.pdf',
      allow_reviews: true,
      age_restricted: false,
      is_customizable: true,
      internal_notes: 'Produto criado para teste de campos',
      warranty_period: '12 meses',
      
      // Campos JSONB
      attributes: {
        'Cor': ['Azul', 'Verde', 'Vermelho'],
        'Tamanho': ['P', 'M', 'G'],
        'Voltagem': ['110V', '220V', 'Bivolt']
      },
      specifications: {
        'Peso': '1.5kg',
        'Dimensões': '30x20x10cm',
        'Material': 'Plástico ABS',
        'Garantia': '12 meses',
        'custom_fields': {
          'Campo Extra 1': 'Valor 1',
          'Campo Extra 2': 'Valor 2'
        }
      },
      
      // Relacionamentos
      related_products: [],
      upsell_products: [],
      download_files: [
        { name: 'Manual.pdf', url: 'https://exemplo.com/manual.pdf' },
        { name: 'Guia Rápido.pdf', url: 'https://exemplo.com/guia.pdf' }
      ]
    };
    
    // Buscar categorias, marcas e vendedores
    const [catRes, brandRes, sellerRes] = await Promise.all([
      fetch(`${API_BASE}/api/categories`),
      fetch(`${API_BASE}/api/brands`),
      fetch(`${API_BASE}/api/sellers`)
    ]);
    
    const categories = await catRes.json();
    const brands = await brandRes.json();
    const sellers = await sellerRes.json();
    
    // Preencher IDs
    if (categories.data?.categories?.length > 0) {
      testProduct.category_ids = categories.data.categories.slice(0, 3).map(c => c.id);
      testProduct.primary_category_id = testProduct.category_ids[0];
    }
    
    if (brands.data?.brands?.length > 0) {
      testProduct.brand_id = brands.data.brands[0].id;
    }
    
    if (sellers.data?.sellers?.length > 0) {
      testProduct.seller_id = sellers.data.sellers[0].id;
    }
    
    // Criar produto
    const createResponse = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProduct)
    });
    
    const createResult = await createResponse.json();
    
    if (!createResult.success) {
      console.error('❌ Erro ao criar produto:', createResult.error);
      return;
    }
    
    const productId = createResult.data.id;
    console.log(`✅ Produto criado com ID: ${productId}`);
    
    // 2. Buscar produto criado
    console.log('\n2️⃣ Verificando campos salvos...');
    const getResponse = await fetch(`${API_BASE}/api/products/${productId}`);
    const getResult = await getResponse.json();
    
    if (!getResult.success) {
      console.error('❌ Erro ao buscar produto');
      return;
    }
    
    const savedProduct = getResult.data;
    
    // 3. Verificar campos
    console.log('\n3️⃣ Verificação de campos:\n');
    
    const fieldsToCheck = [
      // Campos básicos
      'name', 'slug', 'sku', 'barcode', 'model', 'condition',
      'description', 'short_description',
      
      // Preços
      'price', 'original_price', 'cost',
      
      // Estoque
      'quantity', 'stock_location', 'track_inventory', 'allow_backorder', 'low_stock_alert',
      
      // Status
      'status', 'is_active', 'featured',
      
      // Dimensões
      'weight', 'height', 'width', 'length',
      
      // SEO
      'meta_title', 'meta_description', 'meta_keywords',
      
      // Novos campos
      'has_free_shipping', 'delivery_days', 'seller_state', 'seller_city',
      'is_digital', 'requires_shipping', 'tax_class', 'ncm_code', 'gtin',
      'origin', 'manufacturing_country', 'care_instructions', 'manual_link',
      'allow_reviews', 'age_restricted', 'is_customizable', 'internal_notes',
      'warranty_period',
      
      // JSONB
      'attributes', 'specifications'
    ];
    
    let successCount = 0;
    let failureCount = 0;
    
    fieldsToCheck.forEach(field => {
      const expected = testProduct[field];
      const saved = savedProduct[field];
      
      // Comparação especial para números
      let isEqual = false;
      if (typeof expected === 'number' && typeof saved === 'string') {
        isEqual = expected === parseFloat(saved);
      } else if (typeof expected === 'object' && typeof saved === 'object') {
        isEqual = JSON.stringify(expected) === JSON.stringify(saved);
      } else {
        isEqual = expected === saved;
      }
      
      if (isEqual) {
        console.log(`✅ ${field}: OK`);
        successCount++;
      } else {
        console.log(`❌ ${field}: FALHOU`);
        console.log(`   Esperado: ${JSON.stringify(expected)}`);
        console.log(`   Salvo: ${JSON.stringify(saved)}`);
        failureCount++;
      }
    });
    
    // Verificar relacionamentos
    console.log('\n4️⃣ Verificando relacionamentos:');
    
    if (savedProduct.categories && Array.isArray(savedProduct.categories)) {
      console.log(`✅ Categorias: ${savedProduct.categories.length} salvas`);
    } else {
      console.log('❌ Categorias: não encontradas');
    }
    
    if (savedProduct.download_files && Array.isArray(savedProduct.download_files)) {
      console.log(`✅ Downloads: ${savedProduct.download_files.length} salvos`);
    } else {
      console.log('❌ Downloads: não encontrados');
    }
    
    // Resumo
    console.log('\n📊 RESUMO DO TESTE:');
    console.log(`✅ Campos corretos: ${successCount}`);
    console.log(`❌ Campos com problema: ${failureCount}`);
    console.log(`📈 Taxa de sucesso: ${((successCount / fieldsToCheck.length) * 100).toFixed(1)}%`);
    
    if (failureCount === 0) {
      console.log('\n🎉 SUCESSO TOTAL! Todos os campos estão sincronizados!');
    } else {
      console.log('\n⚠️ Alguns campos precisam de ajuste');
    }
    
    // 5. Limpar - deletar produto de teste
    console.log('\n5️⃣ Limpando produto de teste...');
    await fetch(`${API_BASE}/api/products/${productId}`, { method: 'DELETE' });
    console.log('✅ Produto de teste removido');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Aguardar um pouco para o servidor iniciar
setTimeout(() => {
  testProductFields();
}, 3000); 