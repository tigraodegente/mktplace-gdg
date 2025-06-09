import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testProductPage() {
    console.log('🧪 Testando página de produto...\n');
    
    try {
        // Testar diferentes produtos
        const testProducts = [
            'almofada-amamentacao-azul-bebe-150943',
            'almofada-amamentacao-rose-150938'
        ];
        
        for (const slug of testProducts) {
            console.log(`🔍 Testando: ${slug}`);
            
            try {
                const command = `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/produto/${slug}`;
                const { stdout } = await execAsync(command);
                const statusCode = stdout.trim();
                
                console.log(`   Status: ${statusCode}`);
                
                if (statusCode === '200') {
                    console.log('   ✅ Sucesso - página carregou sem erros');
                } else if (statusCode === '500') {
                    console.log('   ❌ Erro interno - ainda há problemas');
                } else if (statusCode === '404') {
                    console.log('   ⚠️  404 - produto não encontrado');
                } else {
                    console.log(`   ⚠️  Status: ${statusCode}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Servidor não está executando ou erro: ${error.message}`);
                console.log('   💡 Execute: npm run dev');
                break;
            }
            
            console.log('');
        }
        
        console.log('🎯 Teste concluído!');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

testProductPage(); 