import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.develop' });

async function debugMongoStructure() {
    console.log('🔍 ANALISANDO ESTRUTURA DO MONGODB\n');
    
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await mongoClient.connect();
        const mongodb = mongoClient.db('graodegente');
        const produtosCollection = mongodb.collection('produtos');
        
        console.log('✅ Conectado ao MongoDB');
        
        // 1. Contar total de documentos
        const total = await produtosCollection.countDocuments();
        console.log(`📦 Total de produtos no MongoDB: ${total}`);
        
        // 2. Analisar estrutura de alguns documentos
        console.log('\n🔍 Analisando estrutura dos documentos...');
        
        const samples = await produtosCollection.find({}).limit(5).toArray();
        
        if (samples.length > 0) {
            console.log('\n📋 CAMPOS ENCONTRADOS NO PRIMEIRO DOCUMENTO:');
            const firstDoc = samples[0];
            Object.keys(firstDoc).forEach((key, idx) => {
                const value = firstDoc[key];
                const type = Array.isArray(value) ? 'array' : typeof value;
                const preview = Array.isArray(value) ? `[${value.length} items]` : 
                              typeof value === 'string' ? `"${value.substring(0, 50)}..."` :
                              typeof value === 'object' ? 'object' : value;
                console.log(`   ${idx + 1}. ${key}: ${type} = ${preview}`);
            });
            
            // 3. Verificar se existe campo de categoria
            console.log('\n🔍 PROCURANDO CAMPOS RELACIONADOS A CATEGORIAS:');
            const categoryFields = Object.keys(firstDoc).filter(key => 
                key.toLowerCase().includes('categ') || 
                key.toLowerCase().includes('tipo') ||
                key.toLowerCase().includes('class')
            );
            
            if (categoryFields.length > 0) {
                console.log('✅ Campos possíveis encontrados:');
                categoryFields.forEach(field => {
                    console.log(`   - ${field}: ${firstDoc[field]}`);
                });
            } else {
                console.log('❌ Nenhum campo óbvio de categoria encontrado');
            }
            
            // 4. Verificar campos específicos que podem ser categorias
            const possibleCategoryFields = ['category', 'categories', 'tipo', 'classe', 'grupo', 'secao'];
            
            console.log('\n🔍 VERIFICANDO CAMPOS ESPECÍFICOS:');
            for (const field of possibleCategoryFields) {
                const count = await produtosCollection.countDocuments({ [field]: { $exists: true, $ne: null } });
                if (count > 0) {
                    const sample = await produtosCollection.findOne({ [field]: { $exists: true, $ne: null } });
                    console.log(`   ✅ ${field}: ${count} documentos têm este campo`);
                    console.log(`      Exemplo: ${JSON.stringify(sample[field])}`);
                } else {
                    console.log(`   ❌ ${field}: não encontrado`);
                }
            }
            
            // 5. Mostrar exemplo completo de um documento
            console.log('\n📄 EXEMPLO COMPLETO DE UM DOCUMENTO:');
            console.log(JSON.stringify(firstDoc, null, 2));
            
        } else {
            console.log('❌ Nenhum documento encontrado na collection');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await mongoClient.close();
    }
}

debugMongoStructure(); 