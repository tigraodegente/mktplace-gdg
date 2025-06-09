#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function limparMarcasGraoDeGente() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🏷️ LIMPANDO MARCAS - MANTENDO APENAS "GRÃO DE GENTE"\n')
    
    // Conectar ao Neon
    await connector.connectNeon()
    
    // Verificar estado atual das marcas (campo brand)
    const marcasAtuais = await connector.queryNeon(`
      SELECT 
        brand,
        COUNT(*) as total_produtos
      FROM products 
      WHERE brand IS NOT NULL AND brand != ''
      GROUP BY brand
      ORDER BY total_produtos DESC
    `)
    
    console.log('📊 MARCAS ATUAIS (campo brand):')
    marcasAtuais.rows.forEach((marca, i) => {
      const status = marca.brand.toLowerCase().includes('grão de gente') ? '👑 MANTER' : '🗑️ CONVERTER'
      console.log(`   ${i + 1}. ${marca.brand}: ${marca.total_produtos} produtos ${status}`)
    })
    
    // Verificar produtos sem marca
    const estatisticas = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total_produtos,
        COUNT(brand) as produtos_com_marca,
        COUNT(*) - COUNT(brand) as produtos_sem_marca
      FROM products
    `)
    
    console.log('\n📈 ESTATÍSTICAS ATUAIS:')
    console.log(`   Total de produtos: ${estatisticas.rows[0].total_produtos}`)
    console.log(`   Com marca: ${estatisticas.rows[0].produtos_com_marca}`)
    console.log(`   Sem marca: ${estatisticas.rows[0].produtos_sem_marca}`)
    
    // Verificar tabela brands (não usada)
    const brandsTabela = await connector.queryNeon(`
      SELECT id, name, slug FROM brands ORDER BY name
    `)
    
    console.log(`\n🏷️ MARCAS NA TABELA BRANDS (${brandsTabela.rows.length} registros):`)
    brandsTabela.rows.forEach((brand, i) => {
      console.log(`   ${i + 1}. ${brand.name} (${brand.slug})`)
    })
    
    console.log('\n🔄 INICIANDO LIMPEZA...\n')
    
    // 1. Atualizar todos os produtos para marca "Grão de Gente"
    console.log('1️⃣ Atualizando campo "brand" de todos os produtos...')
    
    const updateResult = await connector.queryNeon(`
      UPDATE products 
      SET brand = 'Grão de Gente', updated_at = NOW()
      WHERE brand IS NULL OR brand != 'Grão de Gente'
    `)
    
    console.log(`   ✅ ${updateResult.rowCount} produtos atualizados\n`)
    
    // 2. Limpar tabela brands e manter apenas "Grão de Gente"
    console.log('2️⃣ Limpando tabela brands...')
    
    // Verificar se "Grão de Gente" já existe na tabela brands
    const graoDeGenteExiste = await connector.queryNeon(`
      SELECT id FROM brands WHERE name = 'Grão de Gente'
    `)
    
    let graoDeGenteId
    
    if (graoDeGenteExiste.rows.length === 0) {
      console.log('   📝 Criando marca "Grão de Gente" na tabela brands...')
      const novaMarca = await connector.queryNeon(`
        INSERT INTO brands (name, slug, description, is_active, created_at, updated_at)
        VALUES ('Grão de Gente', 'grao-de-gente', 'Produtos para bebês e decoração infantil', true, NOW(), NOW())
        RETURNING id
      `)
      graoDeGenteId = novaMarca.rows[0].id
      console.log(`   ✅ Marca criada com ID: ${graoDeGenteId}`)
    } else {
      graoDeGenteId = graoDeGenteExiste.rows[0].id
      console.log(`   ✅ Marca "Grão de Gente" já existe (ID: ${graoDeGenteId})`)
    }
    
    // Remover outras marcas da tabela brands
    console.log('   🗑️ Removendo outras marcas da tabela brands...')
    const deleteResult = await connector.queryNeon(`
      DELETE FROM brands WHERE id != $1
    `, [graoDeGenteId])
    
    console.log(`   ✅ ${deleteResult.rowCount} marcas removidas da tabela\n`)
    
    // 3. Atualizar brand_id dos produtos (opcional, para usar relação)
    console.log('3️⃣ Atualizando brand_id dos produtos...')
    
    const updateBrandIdResult = await connector.queryNeon(`
      UPDATE products 
      SET brand_id = $1, updated_at = NOW()
      WHERE brand_id IS NULL OR brand_id != $1
    `, [graoDeGenteId])
    
    console.log(`   ✅ ${updateBrandIdResult.rowCount} produtos com brand_id atualizado\n`)
    
    // Verificar resultado final
    console.log('📊 RESULTADO FINAL:\n')
    
    // Verificar marcas no campo brand
    const marcasFinais = await connector.queryNeon(`
      SELECT 
        brand,
        COUNT(*) as total_produtos
      FROM products 
      WHERE brand IS NOT NULL AND brand != ''
      GROUP BY brand
      ORDER BY total_produtos DESC
    `)
    
    console.log('🏷️ MARCAS FINAIS (campo brand):')
    marcasFinais.rows.forEach((marca, i) => {
      console.log(`   ${i + 1}. ${marca.brand}: ${marca.total_produtos} produtos`)
    })
    
    // Verificar tabela brands final
    const brandsFinais = await connector.queryNeon(`
      SELECT 
        b.id, 
        b.name, 
        b.slug,
        COUNT(p.id) as produtos_vinculados
      FROM brands b
      LEFT JOIN products p ON b.id = p.brand_id
      GROUP BY b.id, b.name, b.slug
      ORDER BY b.name
    `)
    
    console.log('\n🏷️ TABELA BRANDS FINAL:')
    brandsFinais.rows.forEach((brand, i) => {
      console.log(`   ${i + 1}. ${brand.name} (${brand.slug})`)
      console.log(`      ID: ${brand.id}`)
      console.log(`      Produtos vinculados: ${brand.produtos_vinculados}`)
    })
    
    // Estatísticas finais
    const estatisticasFinais = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total_produtos,
        COUNT(brand) as produtos_com_marca,
        COUNT(brand_id) as produtos_com_brand_id
      FROM products
    `)
    
    console.log('\n📈 ESTATÍSTICAS FINAIS:')
    console.log(`   Total de produtos: ${estatisticasFinais.rows[0].total_produtos}`)
    console.log(`   Com marca (brand): ${estatisticasFinais.rows[0].produtos_com_marca}`)
    console.log(`   Com brand_id: ${estatisticasFinais.rows[0].produtos_com_brand_id}`)
    
    console.log('\n🎉 LIMPEZA DE MARCAS CONCLUÍDA!')
    console.log('✅ Todos os produtos agora pertencem à marca "Grão de Gente"')
    console.log('✅ Tabela brands contém apenas "Grão de Gente"')
    
  } catch (error) {
    console.error('❌ Erro na limpeza de marcas:', error.message)
    throw error
  } finally {
    await connector.disconnect()
  }
}

// Executar
limparMarcasGraoDeGente()
  .then(() => {
    console.log('\n🚀 Script finalizado com sucesso!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Script falhou:', error)
    process.exit(1)
  }) 