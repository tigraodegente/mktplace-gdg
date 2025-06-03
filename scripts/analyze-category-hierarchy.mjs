#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function analyzeCategoryHierarchy() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 ANALISANDO CATEGORIAS PARA SUGERIR HIERARQUIA\n')
    
    // Buscar todas as categorias com contagem de produtos
    const categoriesResult = await connector.queryNeon(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        COUNT(DISTINCT pc.product_id) as product_count
      FROM categories c
      LEFT JOIN product_categories pc ON c.id = pc.category_id
      GROUP BY c.id, c.name, c.slug
      ORDER BY c.name
    `)
    
    // Agrupar categorias por padrões
    const categoryGroups = {
      'Almofadas': [],
      'Quarto de Bebê': [],
      'Decoração': [],
      'Enxoval': [],
      'Roupas e Acessórios': [],
      'Organização': [],
      'Segurança': [],
      'Maternidade': [],
      'Alimentação e Higiene': [],
      'Brinquedos': [],
      'Móveis': [],
      'Têxtil': []
    }
    
    // Categorizar baseado em palavras-chave
    categoriesResult.rows.forEach(cat => {
      const name = cat.name.toLowerCase()
      const info = `${cat.name} (${cat.product_count} produtos)`
      
      // Almofadas
      if (name.includes('almofada')) {
        categoryGroups['Almofadas'].push(info)
      }
      // Quarto de Bebê
      else if (name.includes('quarto de bebê') || name.includes('berço') || name.includes('mini berço')) {
        categoryGroups['Quarto de Bebê'].push(info)
      }
      // Decoração
      else if (name.includes('quadro') || name.includes('adesivo') || name.includes('papel de parede') || 
               name.includes('decorativ') || name.includes('enfeite') || name.includes('objeto') ||
               name.includes('varal') || name.includes('móbile') || name.includes('abajur')) {
        categoryGroups['Decoração'].push(info)
      }
      // Enxoval
      else if (name.includes('lençol') || name.includes('fronha') || name.includes('edredom') || 
               name.includes('manta') || name.includes('cobertor') || name.includes('kit berço') ||
               name.includes('kit cama') || name.includes('jogo de')) {
        categoryGroups['Enxoval'].push(info)
      }
      // Roupas e Acessórios
      else if (name.includes('roupinha') || name.includes('roupão') || name.includes('roupa') || 
               name.includes('macacão') || name.includes('vestido') || name.includes('conjunto') ||
               name.includes('babador') || name.includes('toalha')) {
        categoryGroups['Roupas e Acessórios'].push(info)
      }
      // Organização
      else if (name.includes('organizador') || name.includes('cesto') || name.includes('porta') || 
               name.includes('pote') || name.includes('lixeira') || name.includes('cabide') ||
               name.includes('prateleira')) {
        categoryGroups['Organização'].push(info)
      }
      // Segurança
      else if (name.includes('protetor') || name.includes('segurança') || name.includes('mosquiteiro') ||
               name.includes('grade')) {
        categoryGroups['Segurança'].push(info)
      }
      // Maternidade
      else if (name.includes('maternidade') || name.includes('bolsa') || name.includes('mala') ||
               name.includes('saquinho')) {
        categoryGroups['Maternidade'].push(info)
      }
      // Alimentação e Higiene
      else if (name.includes('alimenta') || name.includes('mamadeira') || name.includes('chupeta') ||
               name.includes('fralda') || name.includes('trocador') || name.includes('banheira') ||
               name.includes('banho') || name.includes('higiene')) {
        categoryGroups['Alimentação e Higiene'].push(info)
      }
      // Brinquedos
      else if (name.includes('brinquedo') || name.includes('pelúcia') || name.includes('ursinho') ||
               name.includes('boneca') || name.includes('tapete de atividade') || name.includes('naninha')) {
        categoryGroups['Brinquedos'].push(info)
      }
      // Móveis
      else if (name.includes('mesa') || name.includes('cadeira') || name.includes('berço') ||
               name.includes('troninho') || name.includes('assento')) {
        categoryGroups['Móveis'].push(info)
      }
      // Têxtil
      else if (name.includes('cortina') || name.includes('tapete') || name.includes('saia berço') ||
               name.includes('dossel')) {
        categoryGroups['Têxtil'].push(info)
      }
    })
    
    // Mostrar sugestão de hierarquia
    console.log('📋 SUGESTÃO DE HIERARQUIA:\n')
    console.log('══════════════════════════════════════════\n')
    
    Object.entries(categoryGroups).forEach(([mainCategory, subcategories]) => {
      if (subcategories.length > 0) {
        console.log(`📁 ${mainCategory.toUpperCase()}`)
        subcategories.forEach(sub => {
          console.log(`   └─ ${sub}`)
        })
        console.log('')
      }
    })
    
    // Categorias não classificadas
    const classifiedCategories = new Set()
    Object.values(categoryGroups).flat().forEach(cat => {
      const name = cat.split(' (')[0]
      classifiedCategories.add(name)
    })
    
    const unclassified = categoriesResult.rows.filter(cat => 
      !classifiedCategories.has(cat.name)
    )
    
    if (unclassified.length > 0) {
      console.log('❓ CATEGORIAS NÃO CLASSIFICADAS:\n')
      unclassified.forEach(cat => {
        console.log(`   - ${cat.name} (${cat.product_count} produtos)`)
      })
    }
    
    // Estatísticas
    console.log('\n📊 ESTATÍSTICAS:\n')
    console.log(`Total de categorias: ${categoriesResult.rows.length}`)
    console.log(`Categorias com produtos: ${categoriesResult.rows.filter(c => c.product_count > 0).length}`)
    console.log(`Categorias vazias: ${categoriesResult.rows.filter(c => c.product_count === 0).length}`)
    
    // Sugestões específicas
    console.log('\n💡 SUGESTÕES ESPECÍFICAS:\n')
    console.log('1. Criar categoria principal "ALMOFADAS" com subcategorias:')
    console.log('   - Almofada Quarto de Bebê')
    console.log('   - Almofadas Decorativas')
    console.log('   - Almofada Amamentação')
    console.log('')
    console.log('2. Criar categoria principal "DECORAÇÃO" com subcategorias:')
    console.log('   - Quadros e Painéis')
    console.log('   - Adesivos de Parede')
    console.log('   - Papel de Parede')
    console.log('   - Objetos Decorativos')
    console.log('')
    console.log('3. Criar categoria principal "ORGANIZAÇÃO" com subcategorias:')
    console.log('   - Cestos e Organizadores')
    console.log('   - Porta Objetos')
    console.log('   - Prateleiras')
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await connector.disconnect()
  }
}

analyzeCategoryHierarchy() 