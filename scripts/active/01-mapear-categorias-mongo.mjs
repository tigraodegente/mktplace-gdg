import { MongoClient } from 'mongodb';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Carregar configurações do ambiente de desenvolvimento
dotenv.config({ path: '.env.develop' });

const sql = postgres(process.env.DATABASE_URL);

async function mapearCategoriasMongoParaNeon() {
    console.log('🔍 INICIANDO MAPEAMENTO DE CATEGORIAS MongoDB → Neon\n');
    
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    
    try {
        // 1. Conectar ao MongoDB
        await mongoClient.connect();
        const mongodb = mongoClient.db('graodegente');
        const produtosCollection = mongodb.collection('produtos');
        
        console.log('✅ Conectado ao MongoDB');
        
        // 2. Analisar categorias únicas no MongoDB
        console.log('📊 Analisando categorias no MongoDB...');
        
        const categoriasMongo = await produtosCollection.aggregate([
            { $match: { categories: { $exists: true, $ne: null } } },
            { $unwind: '$categories' },
            { $group: { 
                _id: '$categories', 
                count: { $sum: 1 },
                exemplos: { $push: { sku: '$productid', nome: '$productname' } }
            }},
            { $sort: { count: -1 } },
            { $limit: 20 } // Top 20 categorias
        ]).toArray();
        
        console.log(`\n📦 CATEGORIAS NO MONGODB (Top 20):`);
        categoriasMongo.forEach((cat, idx) => {
            console.log(`   ${idx + 1}. "${cat._id}" (${cat.count} produtos)`);
        });
        
        // 3. Verificar categorias no Neon
        console.log('\n📊 Verificando categorias no Neon...');
        
        const categoriasNeon = await sql`
            SELECT id, name, slug, parent_id, is_active
            FROM categories 
            WHERE is_active = true
            ORDER BY name ASC
        `;
        
        console.log(`\n🎯 CATEGORIAS NO NEON (${categoriasNeon.length}):`);
        categoriasNeon.forEach((cat, idx) => {
            console.log(`   ${idx + 1}. "${cat.name}" (ID: ${cat.id})`);
        });
        
        // 4. Criar mapeamento MongoDB → Neon
        console.log('\n🔗 CRIANDO MAPEAMENTO...');
        
        const mapeamento = {};
        let mapeadosCount = 0;
        let naoMapeadosCount = 0;
        
        for (const catMongo of categoriasMongo) {
            const nomeMongo = catMongo._id.toLowerCase().trim();
            
            // Tentar encontrar categoria correspondente no Neon
            const catNeon = categoriasNeon.find(cat => {
                const nomeNeon = cat.name.toLowerCase().trim();
                return nomeNeon === nomeMongo || 
                       nomeNeon.includes(nomeMongo) || 
                       nomeMongo.includes(nomeNeon) ||
                       cat.slug === nomeMongo.replace(/\s+/g, '-');
            });
            
            if (catNeon) {
                mapeamento[catMongo._id] = {
                    neon_id: catNeon.id,
                    neon_name: catNeon.name,
                    mongo_count: catMongo.count
                };
                mapeadosCount++;
                console.log(`   ✅ "${catMongo._id}" → "${catNeon.name}" (${catMongo.count} produtos)`);
            } else {
                mapeamento[catMongo._id] = {
                    neon_id: null,
                    neon_name: null,
                    mongo_count: catMongo.count,
                    precisa_criar: true
                };
                naoMapeadosCount++;
                console.log(`   ❌ "${catMongo._id}" → NÃO ENCONTRADA (${catMongo.count} produtos)`);
            }
        }
        
        console.log(`\n📊 RESULTADO DO MAPEAMENTO:`);
        console.log(`   ✅ Mapeadas: ${mapeadosCount} categorias`);
        console.log(`   ❌ Não mapeadas: ${naoMapeadosCount} categorias`);
        
        // 5. Contar produtos que têm categorias mapeadas no MongoDB
        console.log('\n🔍 Estimando produtos que podem ser atualizados...');
        
        let produtosAtualizaveis = 0;
        
        for (const [categoriaMongo, dados] of Object.entries(mapeamento)) {
            if (dados.neon_id) {
                produtosAtualizaveis += dados.mongo_count;
                console.log(`   📦 ${categoriaMongo}: ${dados.mongo_count} produtos (mapeada para "${dados.neon_name}")`);
            }
        }
        
        console.log(`\n📊 PRODUTOS ESTIMADOS PARA ATUALIZAÇÃO: ${produtosAtualizaveis}`);
        
        // 6. Verificar produtos sem category_id no Neon
        const produtosSemCategoryId = await sql`
            SELECT COUNT(*) as count 
            FROM products 
            WHERE category_id IS NULL
        `;
        
        console.log(`📦 Produtos sem category_id no Neon: ${produtosSemCategoryId[0].count}`);
        
        // 7. Salvar mapeamento para uso posterior
        console.log('\n💾 Salvando mapeamento...');
        
        const fs = await import('fs/promises');
        await fs.writeFile(
            'mapeamento-categorias.json', 
            JSON.stringify(mapeamento, null, 2)
        );
        
        console.log('✅ Mapeamento salvo em: mapeamento-categorias.json');
        
        // 8. Próximos passos
        console.log('\n🎯 PRÓXIMOS PASSOS:');
        console.log('   1. Revisar mapeamento-categorias.json');
        console.log('   2. Criar categorias que não existem no Neon (se necessário)');
        console.log('   3. Executar script de atualização dos produtos');
        console.log(`   4. Atualizar ${produtosAtualizaveis} produtos com category_id`);
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await mongoClient.close();
        await sql.end();
    }
}

mapearCategoriasMongoParaNeon(); 