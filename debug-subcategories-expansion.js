// 🔍 DEBUG ESPECÍFICO - EXPANSÃO DE SUBCATEGORIAS
// Execute no console quando o dropdown estiver aberto

console.log('🔍 DEBUGANDO EXPANSÃO DE SUBCATEGORIAS');

// Simular o que o componente faz
fetch('/api/categories')
.then(r => r.json())
.then(data => {
    if (!data.success) {
        console.error('❌ Erro na API:', data);
        return;
    }
    
    const categories = data.data.categories;
    console.log('📦 Total categorias:', categories.length);
    
    // Replicar a lógica do componente
    const rootCategories = categories.filter(cat => !cat.parentId);
    console.log('🌳 Categorias raiz:', rootCategories.length);
    
    // Criar mapa de subcategorias
    const subcategoriesMap = {};
    categories.forEach(cat => {
        if (cat.parentId) {
            if (!subcategoriesMap[cat.parentId]) subcategoriesMap[cat.parentId] = [];
            subcategoriesMap[cat.parentId].push(cat);
        }
    });
    
    console.log('🗂️ Mapa de subcategorias:', subcategoriesMap);
    console.log('🔑 Chaves do mapa:', Object.keys(subcategoriesMap));
    
    // Verificar categoria específica "Alimentação e Higiene"
    const alimentacao = rootCategories.find(cat => cat.name.includes('Alimentação'));
    if (alimentacao) {
        console.log('🍼 Categoria Alimentação encontrada:');
        console.log('   - ID:', alimentacao.id);
        console.log('   - Nome:', alimentacao.name);
        console.log('   - Subcategory Count (API):', alimentacao.subcategoryCount);
        
        const subcategorias = subcategoriesMap[alimentacao.id];
        console.log('   - Subcategorias mapeadas:', subcategorias?.length || 0);
        
        if (subcategorias && subcategorias.length > 0) {
            console.log('   - Lista de subcategorias:');
            subcategorias.forEach((sub, index) => {
                console.log(`     ${index + 1}. ${sub.name} (ID: ${sub.id})`);
            });
        } else {
            console.log('   ⚠️ PROBLEMA: Subcategorias não foram mapeadas!');
            
            // Verificar se existem subcategorias com este parentId
            const subcatsNoArray = categories.filter(cat => cat.parentId === alimentacao.id);
            console.log('   - Subcategorias encontradas por filtro direto:', subcatsNoArray.length);
            
            if (subcatsNoArray.length > 0) {
                console.log('   - ✅ SOLUÇÃO: Subcategorias existem, problema no mapeamento!');
                subcatsNoArray.forEach((sub, index) => {
                    console.log(`     ${index + 1}. ${sub.name} (Parent: ${sub.parentId})`);
                });
            }
        }
    } else {
        console.log('❌ Categoria Alimentação não encontrada');
    }
    
    console.log('\n💡 RESULTADO:');
    console.log('- Se subcategorias existem mas não são mapeadas = problema no componente');
    console.log('- Se subcategorias não existem = problema na API');
    console.log('- Recarregue a página e tente expandir novamente');
})
.catch(error => {
    console.error('❌ Erro:', error);
}); 