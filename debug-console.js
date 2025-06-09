// 🧪 COPY & PASTE NO CONSOLE (F12) DO ADMIN PANEL

fetch('/api/categories')
.then(r => r.json())
.then(data => {
    console.log('📦 RESULTADO:');
    
    if (!data.success || !data.data?.categories) {
        console.error('❌ API não retornou categorias:', data);
        return;
    }
    
    const cats = data.data.categories;
    const rootCats = cats.filter(c => !c.parentId);
    
    console.log(`✅ Total: ${cats.length} | Raiz: ${rootCats.length}`);
    
    if (rootCats.length === 0) {
        console.warn('⚠️ PROBLEMA: Nenhuma categoria raiz!');
        
        // Testar com parent_id
        const rootWithParent_id = cats.filter(c => !c.parent_id);
        console.log(`🔍 Com parent_id: ${rootWithParent_id.length}`);
        
        if (rootWithParent_id.length > 0) {
            console.log('💡 SOLUÇÃO: Trocar parentId por parent_id no componente');
        }
        
        // Mostrar primeiras categorias
        console.log('🔍 Primeiras categorias:', cats.slice(0, 3));
    } else {
        console.log('✅ SUCESSO: Dropdown deveria funcionar!');
        console.log('🌳 Categorias raiz:', rootCats.slice(0, 3).map(c => c.name));
    }
})
.catch(e => console.error('❌ Erro:', e)); 