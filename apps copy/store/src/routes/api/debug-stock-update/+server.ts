import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const db = getDatabase(platform);
    
    // 1. Verificar estrutura da tabela products
    const productColumns = await db.query`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'products' 
      AND column_name IN ('id', 'quantity', 'updated_at')
      ORDER BY ordinal_position
    `;
    
    // 2. Verificar estrutura da tabela stock_movements
    const stockMovementColumns = await db.query`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'stock_movements'
      ORDER BY ordinal_position
    `;
    
    // 3. Buscar um produto para teste
    const testProduct = await db.query`
      SELECT id, name, quantity 
      FROM products 
      WHERE is_active = true AND quantity > 0 
      LIMIT 1
    `;
    
    let updateTestResults: Record<string, any> = {
      simpleUpdate: null,
      updateWithoutTransaction: null,
      manualQuery: null,
      stockMovementTest: null
    };
    
    if (testProduct.length > 0) {
      const product = testProduct[0];
      const testQuantity = product.quantity - 1;
      
      // Teste 1: UPDATE simples dentro de transação
      try {
        await db.transaction(async (sql) => {
          await sql`
            UPDATE products 
            SET quantity = ${testQuantity}
            WHERE id = ${product.id}
          `;
          throw new Error('Rollback intencional');
        });
      } catch (error: any) {
        if (error.message === 'Rollback intencional') {
          updateTestResults.simpleUpdate = { success: true, message: 'UPDATE funcionou dentro de transação' };
        } else {
          updateTestResults.simpleUpdate = { success: false, error: error.message };
        }
      }
      
      // Teste 2: UPDATE sem transação
      try {
        // Fazer UPDATE e depois reverter
        await db.query`
          UPDATE products 
          SET quantity = ${testQuantity}
          WHERE id = ${product.id}
        `;
        
        // Reverter imediatamente
        await db.query`
          UPDATE products 
          SET quantity = ${product.quantity}
          WHERE id = ${product.id}
        `;
        
        updateTestResults.updateWithoutTransaction = { success: true, message: 'UPDATE funcionou sem transação' };
      } catch (error: any) {
        updateTestResults.updateWithoutTransaction = { success: false, error: error.message };
      }
      
      // Teste 3: Query manual com diferentes sintaxes
      try {
        const rawQuery = `UPDATE products SET quantity = ${testQuantity} WHERE id = '${product.id}'`;
        updateTestResults.manualQuery = { 
          success: true, 
          message: 'Query manual construída com sucesso',
          query: rawQuery 
        };
      } catch (error: any) {
        updateTestResults.manualQuery = { success: false, error: error.message };
      }
      
      // Teste 4: Inserir movimento de estoque
      try {
        await db.transaction(async (sql) => {
          // Buscar um user_id válido
          const users = await sql`SELECT id FROM users LIMIT 1`;
          const userId = users[0]?.id || '00000000-0000-0000-0000-000000000000';
          
          await sql`
            INSERT INTO stock_movements (
              product_id,
              type,
              quantity,
              reason,
              reference_id,
              notes,
              created_by
            ) VALUES (
              ${product.id},
              'out',
              1,
              'Teste',
              ${product.id},
              'Teste de debug',
              ${userId}
            )
          `;
          throw new Error('Rollback intencional');
        });
      } catch (error: any) {
        if (error.message === 'Rollback intencional') {
          updateTestResults.stockMovementTest = { success: true, message: 'INSERT em stock_movements funcionou' };
        } else {
          updateTestResults.stockMovementTest = { success: false, error: error.message };
        }
      }
    }
    
    // 4. Verificar versão do PostgreSQL
    const versionResult = await db.query`SELECT version()`;
    
    // Verificar se é produção baseado na URL do banco
    const databaseUrl = process.env.DATABASE_URL || '';
    const isProduction = !databaseUrl.includes('localhost');
    
    return json({
      success: true,
      data: {
        database: {
          version: versionResult[0]?.version || 'Unknown',
          isProduction
        },
        tables: {
          products: {
            columns: productColumns,
            sampleProduct: testProduct[0] || null
          },
          stock_movements: {
            columns: stockMovementColumns
          }
        },
        tests: updateTestResults,
        recommendations: [
          productColumns.find((col: any) => col.column_name === 'updated_at') 
            ? 'Campo updated_at existe na tabela products' 
            : 'Campo updated_at NÃO existe na tabela products - pode causar erro no UPDATE',
          updateTestResults.simpleUpdate?.success 
            ? 'UPDATE simples funciona corretamente' 
            : 'UPDATE simples está falhando - verificar sintaxe SQL'
        ]
      }
    });
    
  } catch (error: any) {
    return json({
      success: false,
      error: {
        message: error.message || 'Erro desconhecido',
        stack: error.stack
      }
    }, { status: 500 });
  }
}; 