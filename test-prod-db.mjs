import postgres from 'postgres';

// URL da PRODUÇÃO (mesma que a API usa)
const PROD_DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

// URL de DESENVOLVIMENTO (que estava usando)
const DEV_DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function compareDatabases() {
  console.log('🔍 Comparando bancos de PRODUÇÃO vs DESENVOLVIMENTO...\n');

  // Testar banco de PRODUÇÃO
  console.log('1️⃣ BANCO DE PRODUÇÃO (ep-dawn-field):');
  const sqlProd = postgres(PROD_DATABASE_URL, { ssl: 'require', max: 1 });
  
  try {
    const prodProducts = await sqlProd`
      SELECT COUNT(*) as total_produtos,
      COUNT(CASE WHEN attributes IS NOT NULL AND attributes != '{}'::jsonb THEN 1 END) as com_attributes
      FROM products WHERE is_active = true
    `;
    console.log(`   📊 Produtos ativos: ${prodProducts[0].total_produtos}`);
    console.log(`   📋 Com attributes: ${prodProducts[0].com_attributes}`);

    if (prodProducts[0].com_attributes > 0) {
      const exampleProd = await sqlProd`
        SELECT name, attributes
        FROM products 
        WHERE is_active = true 
        AND attributes IS NOT NULL 
        AND attributes != '{}'::jsonb
        LIMIT 3
      `;
      
      console.log('   🎯 Exemplos de attributes (PRODUÇÃO):');
      exampleProd.forEach((p, i) => {
        console.log(`     ${i + 1}. ${p.name}: ${JSON.stringify(p.attributes)}`);
      });
    }

  } catch (error) {
    console.log(`   ❌ Erro na PRODUÇÃO: ${error.message}`);
  } finally {
    await sqlProd.end();
  }

  console.log('\n2️⃣ BANCO DE DESENVOLVIMENTO (ep-raspy-meadow):');
  const sqlDev = postgres(DEV_DATABASE_URL, { ssl: 'require', max: 1 });
  
  try {
    const devProducts = await sqlDev`
      SELECT COUNT(*) as total_produtos,
      COUNT(CASE WHEN attributes IS NOT NULL AND attributes != '{}'::jsonb THEN 1 END) as com_attributes
      FROM products WHERE is_active = true
    `;
    console.log(`   📊 Produtos ativos: ${devProducts[0].total_produtos}`);
    console.log(`   📋 Com attributes: ${devProducts[0].com_attributes}`);

    if (devProducts[0].com_attributes > 0) {
      const exampleDev = await sqlDev`
        SELECT name, attributes
        FROM products 
        WHERE is_active = true 
        AND attributes IS NOT NULL 
        AND attributes != '{}'::jsonb
        LIMIT 3
      `;
      
      console.log('   🎯 Exemplos de attributes (DESENVOLVIMENTO):');
      exampleDev.forEach((p, i) => {
        console.log(`     ${i + 1}. ${p.name}: ${JSON.stringify(p.attributes)}`);
      });
    }

  } catch (error) {
    console.log(`   ❌ Erro no DESENVOLVIMENTO: ${error.message}`);
  } finally {
    await sqlDev.end();
  }

  console.log('\n3️⃣ CONCLUSÃO:');
  console.log('Se os dados são diferentes, isso explica por que os filtros dinâmicos não funcionam!');
}

compareDatabases(); 