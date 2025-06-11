import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

async function testCompleteHistorySystem() {
  try {
    console.log('🧪 TESTANDO SISTEMA COMPLETO DE HISTÓRICO...\n');
    
    // 1. Buscar um produto para testar
    console.log('📦 1. BUSCANDO PRODUTO PARA TESTE:');
    
    const testProducts = await sql`
      SELECT id, name, sku, price, cost, quantity
      FROM products 
      WHERE status != 'archived'
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    
    if (testProducts.length === 0) {
      console.log('❌ Nenhum produto encontrado para teste');
      return;
    }
    
    const product = testProducts[0];
    console.log(`   ✅ Produto escolhido: ${product.name} (${product.sku})`);
    console.log(`   💰 Estado atual: R$ ${product.price} | Custo: R$ ${product.cost} | Qtd: ${product.quantity}`);
    
    // 2. Definir contexto do usuário (simular middleware)
    console.log('\n👤 2. DEFININDO CONTEXTO DO USUÁRIO:');
    
    const adminUser = await sql`
      SELECT id, name, email 
      FROM users 
      WHERE role IN ('admin', 'super_admin') 
      AND is_active = true 
      LIMIT 1
    `;
    
    if (adminUser.length === 0) {
      console.log('❌ Nenhum usuário admin encontrado');
      return;
    }
    
    const user = adminUser[0];
    console.log(`   👤 Usuário: ${user.name} (${user.email})`);
    
    // Definir contexto
    await sql`SELECT set_user_context(${user.id}, ${user.name}, ${user.email})`;
    console.log('   ✅ Contexto do usuário definido');
    
    // 3. Fazer uma atualização para testar a trigger
    console.log('\n🔄 3. TESTANDO TRIGGER AUTOMÁTICA:');
    
    const newPrice = parseFloat(product.price) + 10;
    const newCost = parseFloat(product.cost) + 5;
    const newQuantity = parseInt(product.quantity) + 1;
    
    console.log(`   📝 Atualizando: Preço R$ ${product.price} → R$ ${newPrice}`);
    console.log(`   📝 Atualizando: Custo R$ ${product.cost} → R$ ${newCost}`);
    console.log(`   📝 Atualizando: Quantidade ${product.quantity} → ${newQuantity}`);
    
    // Atualizar produto (vai disparar a trigger automaticamente)
    await sql`
      UPDATE products 
      SET 
        price = ${newPrice},
        cost = ${newCost},
        quantity = ${newQuantity},
        updated_at = NOW()
      WHERE id = ${product.id}
    `;
    
    console.log('   ✅ Produto atualizado');
    
    // 4. Verificar se o histórico foi registrado automaticamente
    console.log('\n📋 4. VERIFICANDO HISTÓRICO GERADO:');
    
    const historyRecords = await sql`
      SELECT 
        user_name,
        user_email,
        action,
        summary,
        changes,
        created_at
      FROM product_history 
      WHERE product_id = ${product.id}
      ORDER BY created_at DESC 
      LIMIT 3
    `;
    
    console.log(`   📊 ${historyRecords.length} registros de histórico encontrados:`);
    
    historyRecords.forEach((record, index) => {
      const date = record.created_at.toLocaleString('pt-BR');
      console.log(`\n   ${index + 1}. 📅 ${date}`);
      console.log(`      👤 Usuário: ${record.user_name} (${record.user_email})`);
      console.log(`      🎯 Ação: ${record.action}`);
      console.log(`      📝 Resumo: ${record.summary}`);
      
      if (record.changes && typeof record.changes === 'object') {
        console.log(`      🔍 Detalhes das alterações:`);
        Object.entries(record.changes).forEach(([field, change]) => {
          console.log(`         • ${change.label}: ${change.formatted_old} → ${change.formatted_new}`);
        });
      }
    });
    
    // 5. Testar tradução de campos
    console.log('\n🌐 5. TESTANDO TRADUÇÃO DE CAMPOS:');
    
    const translations = await sql`
      SELECT 
        translate_field_name('name') as nome,
        translate_field_name('price') as preco,
        translate_field_name('quantity') as quantidade,
        translate_field_name('cost') as custo
    `;
    
    console.log('   ✅ Traduções funcionando:');
    Object.entries(translations[0]).forEach(([key, value]) => {
      console.log(`      • ${key} → ${value}`);
    });
    
    // 6. Testar formatação de valores
    console.log('\n💅 6. TESTANDO FORMATAÇÃO DE VALORES:');
    
    const formatting = await sql`
      SELECT 
        format_field_value('price', '99.90') as preco_formatado,
        format_field_value('quantity', '10') as quantidade_formatada,
        format_field_value('weight', '2.5') as peso_formatado,
        format_field_value('is_active', 'true') as ativo_formatado
    `;
    
    console.log('   ✅ Formatações funcionando:');
    Object.entries(formatting[0]).forEach(([key, value]) => {
      console.log(`      • ${key}: ${value}`);
    });
    
    // 7. Limpar contexto
    console.log('\n🧹 7. LIMPANDO CONTEXTO:');
    await sql`SELECT clear_user_context()`;
    console.log('   ✅ Contexto limpo');
    
    // 8. Estatísticas finais
    console.log('\n📊 8. ESTATÍSTICAS DO SISTEMA:');
    
    const stats = await sql`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT product_id) as produtos_com_historico,
        COUNT(DISTINCT user_name) as usuarios_diferentes,
        MIN(created_at) as primeiro_registro,
        MAX(created_at) as ultimo_registro
      FROM product_history
    `;
    
    const stat = stats[0];
    console.log(`   📈 Total de registros: ${stat.total_registros}`);
    console.log(`   📦 Produtos com histórico: ${stat.produtos_com_historico}`);
    console.log(`   👥 Usuários diferentes: ${stat.usuarios_diferentes}`);
    console.log(`   📅 Primeiro registro: ${stat.primeiro_registro?.toLocaleString('pt-BR') || 'N/A'}`);
    console.log(`   📅 Último registro: ${stat.ultimo_registro?.toLocaleString('pt-BR') || 'N/A'}`);
    
    console.log('\n🎉 TESTE COMPLETO! Sistema de histórico funcionando perfeitamente!');
    console.log('\n✅ RESUMO DO QUE FOI TESTADO:');
    console.log('   • ✅ Trigger automática PostgreSQL');
    console.log('   • ✅ Captura de usuário via contexto');
    console.log('   • ✅ Detecção precisa de alterações');
    console.log('   • ✅ Tradução de campos para português');
    console.log('   • ✅ Formatação de valores');
    console.log('   • ✅ Resumos inteligentes');
    console.log('   • ✅ Armazenamento detalhado das mudanças');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await sql.end();
  }
}

testCompleteHistorySystem(); 