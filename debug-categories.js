// 🧪 DEBUG CATEGORIAS - Execute no console do browser
// Copie e cole este código inteiro no console (F12) do admin panel

(function() {
    console.log('🧪 INICIANDO DEBUG DE CATEGORIAS');
    
    // 1. Verificar autenticação
    const token = localStorage.getItem('access_token');
    console.log('🔐 Token disponível:', token ? `${token.substring(0, 20)}...` : 'NENHUM');
    
    if (!token) {
        console.error('❌ Sem token de autenticação! Faça login primeiro.');
        return;
    }
    
    // 2. Função para testar a API
    async function testarAPI() {
        try {
            console.log('📡 Fazendo requisição para /api/categories...');
            
            const response = await fetch('/api/categories', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 Status da resposta:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📦 Dados brutos da API:', result);
            
            if (result.success && result.data?.categories) {
                const categories = result.data.categories;
                console.log('✅ Total de categorias:', categories.length);
                
                if (categories.length > 0) {
                    const firstCat = categories[0];
                    console.log('🔍 Primeira categoria:', firstCat);
                    console.log('🔍 Campos disponíveis:', Object.keys(firstCat));
                    
                    // Verificar campo parentId
                    console.log('🔍 Campo pai verificação:');
                    console.log('  - parentId:', firstCat.parentId);
                    console.log('  - parent_id:', firstCat.parent_id);
                }
                
                // Analisar categorias raiz (IGUAL AO CÓDIGO DO COMPONENTE)
                const rootCategories = categories.filter(cat => !cat.parentId);
                console.log('🌳 Categorias raiz (sem parentId):', rootCategories.length);
                
                if (rootCategories.length === 0) {
                    console.warn('⚠️ PROBLEMA IDENTIFICADO: Nenhuma categoria raiz!');
                    console.log('🔍 Verificando primeiras 5 categorias:');
                    categories.slice(0, 5).forEach((cat, i) => {
                        console.log(`  ${i+1}. "${cat.name}" - parentId: ${cat.parentId || 'null'}, parent_id: ${cat.parent_id || 'null'}`);
                    });
                    
                    // Tentar com parent_id null
                    const rootWithParent_id = categories.filter(cat => !cat.parent_id);
                    console.log('🌳 Categorias raiz (sem parent_id):', rootWithParent_id.length);
                    
                    if (rootWithParent_id.length > 0) {
                        console.log('💡 SOLUÇÃO: Usar parent_id ao invés de parentId!');
                        console.log('✅ Primeiras categorias raiz encontradas:');
                        rootWithParent_id.slice(0, 3).forEach((cat, i) => {
                            console.log(`  ${i+1}. ${cat.name} (ID: ${cat.id})`);
                        });
                    }
                } else {
                    console.log('✅ Categorias raiz encontradas! Dropdown deve funcionar.');
                    rootCategories.slice(0, 3).forEach((cat, i) => {
                        console.log(`  ${i+1}. ${cat.name} (ID: ${cat.id})`);
                    });
                }
                
                // Criar mapa de subcategorias
                const subcategoriesMap = {};
                categories.forEach(cat => {
                    if (cat.parentId) {
                        if (!subcategoriesMap[cat.parentId]) subcategoriesMap[cat.parentId] = [];
                        subcategoriesMap[cat.parentId].push(cat);
                    }
                });
                
                console.log('🗺️ Subcategorias encontradas:', Object.keys(subcategoriesMap).length, 'pais com filhos');
                
                // RESULTADO FINAL
                console.log('🎯 RESUMO FINAL:');
                console.log(`  ✅ Total: ${categories.length} categorias`);
                console.log(`  🌳 Raiz: ${rootCategories.length} categorias`);
                console.log(`  🌿 Subcategorias: ${Object.keys(subcategoriesMap).length} grupos`);
                
                if (rootCategories.length > 0) {
                    console.log('✅ SUCESSO: O dropdown deveria funcionar!');
                } else {
                    console.log('❌ PROBLEMA: Sem categorias raiz = dropdown vazio');
                }
                
            } else {
                console.error('❌ Estrutura de resposta inválida:', result);
            }
            
        } catch (error) {
            console.error('❌ Erro na requisição:', error);
        }
    }
    
    // 3. Executar teste
    testarAPI();
    
})();

console.log('🔧 Script carregado e executado automaticamente!'); 