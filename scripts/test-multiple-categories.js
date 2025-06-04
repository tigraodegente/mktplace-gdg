import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5173'; // URL do admin panel

async function testMultipleCategories() {
  console.log('🧪 Testando implementação de múltiplas categorias...\n');

  try {
    // 1. Buscar um produto existente
    console.log('1️⃣ Buscando produtos...');
    const listResponse = await fetch(`${API_BASE}/api/products?limit=1`);
    const listData = await listResponse.json();
    
    if (!listData.success || !listData.data.products.length) {
      console.error('❌ Não foi possível buscar produtos');
      return;
    }

    const productId = listData.data.products[0].id;
    console.log(`✅ Produto encontrado: ${productId}`);

    // 2. Buscar detalhes do produto
    console.log('\n2️⃣ Buscando detalhes do produto...');
    const detailsResponse = await fetch(`${API_BASE}/api/products/${productId}`);
    const detailsData = await detailsResponse.json();
    
    if (!detailsData.success) {
      console.error('❌ Erro ao buscar detalhes do produto');
      return;
    }

    const product = detailsData.data;
    console.log(`✅ Nome: ${product.name}`);
    console.log(`📂 Categorias atuais:`, product.categories || []);
    console.log(`🗃️ IDs das categorias:`, product.category_ids || []);

    // 3. Buscar categorias disponíveis
    console.log('\n3️⃣ Buscando categorias disponíveis...');
    const categoriesResponse = await fetch(`${API_BASE}/api/categories`);
    const categoriesData = await categoriesResponse.json();
    
    const availableCategories = categoriesData.data?.categories || categoriesData;
    console.log(`✅ ${availableCategories.length} categorias disponíveis`);

    // 4. Selecionar 3 categorias aleatórias
    const selectedCategories = availableCategories
      .filter(c => c.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(c => c.id);

    console.log('\n4️⃣ Atualizando produto com múltiplas categorias...');
    console.log(`🎯 Categorias selecionadas:`, selectedCategories);

    // 5. Atualizar produto
    const updateResponse = await fetch(`${API_BASE}/api/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...product,
        category_ids: selectedCategories,
        primary_category_id: selectedCategories[0]
      })
    });

    const updateData = await updateResponse.json();
    
    if (!updateData.success) {
      console.error('❌ Erro ao atualizar produto:', updateData.error);
      return;
    }

    console.log('✅ Produto atualizado com sucesso!');

    // 6. Verificar atualização
    console.log('\n5️⃣ Verificando atualização...');
    const verifyResponse = await fetch(`${API_BASE}/api/products/${productId}`);
    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      const updatedProduct = verifyData.data;
      console.log('✅ Categorias após atualização:', updatedProduct.categories || []);
      console.log('🗃️ IDs das categorias:', updatedProduct.category_ids || []);
      
      if (updatedProduct.category_ids?.length === selectedCategories.length) {
        console.log('\n🎉 SUCESSO! Múltiplas categorias funcionando corretamente!');
      } else {
        console.log('\n⚠️ AVISO: Número de categorias não corresponde ao esperado');
      }
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar teste
testMultipleCategories(); 