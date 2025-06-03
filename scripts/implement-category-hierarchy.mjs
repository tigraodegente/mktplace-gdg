#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import ora from 'ora'

async function implementCategoryHierarchy() {
  const connector = new DatabaseConnector({ forceConnection: true })
  const spinner = ora()
  
  try {
    await connector.connectNeon()
    
    console.log('🔧 IMPLEMENTANDO HIERARQUIA DE CATEGORIAS\n')
    
    // Definir estrutura hierárquica
    const hierarchy = {
      'Almofadas': {
        slug: 'almofadas',
        subcategories: [
          'Almofada Quarto de Bebê',
          'Almofadas Decorativas (filtro)',
          'Almofada Amamentação'
        ]
      },
      'Decoração': {
        slug: 'decoracao',
        subcategories: [
          'Quadros e Painéis',
          'Adesivo Parede Quarto de Bebê',
          'Papel de Parede',
          'Objetos Decorativos',
          'Abajur',
          'Varal Decorativo',
          'Enfeites Puxador',
          'Quadros Bastidores Quarto de Bebê',
          'Móbile Quarto de Bebê'
        ]
      },
      'Quarto de Bebê': {
        slug: 'quarto-de-bebe',
        subcategories: [
          'Cortina Quarto de Bebê',
          'Cortinas Quarto de Bebê',
          'Dossel Berço',
          'Farmacinha Quarto de Bebê',
          'Fronha Berço Bebê',
          'Kit Acessórios Quarto de Bebê',
          'Kit Berço',
          'Kit Mini Berço + Berço',
          'Lençol de Berço',
          'Lixeiras Quarto de Bebê',
          'Organizador de Berço',
          'Porta Fraldas Quarto de Bebê',
          'Potes Quarto de Bebê',
          'Prateleiras Quarto de Bebê',
          'Saia Berço',
          'Saia Berço ',
          'Tapete Quarto de Bebê',
          'Tapetes Redondos Quarto de Bebê ',
          'Mosquiteiro Bebê',
          'Rolinho Protetor'
        ]
      },
      'Enxoval': {
        slug: 'enxoval',
        subcategories: [
          'Lençol',
          'Lençol ',
          'Edredom',
          'Edredons',
          'Kit Cama Babá',
          'Manta e Cobertor',
          'Cobertor',
          'Sacos de Dormir'
        ]
      },
      'Roupas e Acessórios': {
        slug: 'roupas-e-acessorios',
        subcategories: [
          'Roupinhas',
          'Babador Bebê',
          'Conjuntos',
          'Vestido',
          'Toalha Bebê',
          'Roupões Infantis',
          'Cabide Roupinha Bebê',
          'Fantasia'
        ]
      },
      'Organização': {
        slug: 'organizacao',
        subcategories: [
          'Cestos Organizadores',
          'Cestas',
          'Porta Bebê',
          'Porta Maternidade'
        ]
      },
      'Maternidade': {
        slug: 'maternidade',
        subcategories: [
          'Bolsa Maternidade',
          'Bolsa Infantil',
          'Kit Bolsas Maternidade',
          'Saquinhos Maternidade',
          'Lembrancinha Maternidade'
        ]
      },
      'Alimentação e Higiene': {
        slug: 'alimentacao-e-higiene',
        subcategories: [
          'Alimentação',
          'Mamadeiras',
          'Chupeta',
          'Trocador',
          'Fralda e Cueiro',
          'Acessórios para Banho',
          'Cuidados da Mamãe e do Bebê',
          'Cuidados do Bebê'
        ]
      },
      'Brinquedos': {
        slug: 'brinquedos',
        subcategories: [
          'Brinquedos',
          'Pelúcia',
          'Ursinhos',
          'Ursinhos e Pelúcias',
          'Bonecas e Bonecos',
          'Tapete de Atividades',
          'Naninhas e Chocalhos'
        ]
      },
      'Móveis e Acessórios': {
        slug: 'moveis-e-acessorios',
        subcategories: [
          'Capas Carrinho Cadeira Bebê',
          'Mesas e Cadeiras',
          'Troninhos e Assentos',
          'Cadeirinha de Carro',
          'Carrinho de Bebê',
          'Bebê Conforto',
          'Kit Montessoriano',
          'Cabanas e Tendas'
        ]
      },
      'Segurança': {
        slug: 'seguranca',
        subcategories: [
          'Acessórios de Segurança',
          'Colchões e Protetores',
          'Ninho para Bebê'
        ]
      },
      'Outros': {
        slug: 'outros',
        subcategories: [
          'Presentes',
          'Quarto Infantil',
          'Espelhos',
          'Joia',
          'Tapete Mesversário'
        ]
      }
    }
    
    // Buscar categorias existentes
    spinner.start('Carregando categorias existentes...')
    const existingCategoriesResult = await connector.queryNeon(`
      SELECT id, name, slug, parent_id
      FROM categories
    `)
    
    const existingCategories = new Map()
    existingCategoriesResult.rows.forEach(cat => {
      existingCategories.set(cat.name, cat)
    })
    spinner.succeed(`${existingCategories.size} categorias carregadas`)
    
    // Implementar hierarquia
    console.log('\n📝 Criando/Atualizando categorias...\n')
    
    for (const [parentName, parentData] of Object.entries(hierarchy)) {
      let parentId
      
      // Verificar se a categoria pai já existe
      const existingParent = existingCategories.get(parentName)
      
      if (existingParent) {
        parentId = existingParent.id
        console.log(`✅ Categoria principal já existe: ${parentName}`)
      } else {
        // Criar categoria pai
        spinner.start(`Criando categoria principal: ${parentName}`)
        const result = await connector.queryNeon(
          `INSERT INTO categories (name, slug, is_active, parent_id, created_at)
           VALUES ($1, $2, true, NULL, NOW())
           RETURNING id`,
          [parentName, parentData.slug]
        )
        parentId = result.rows[0].id
        spinner.succeed(`Criada: ${parentName}`)
      }
      
      // Atualizar subcategorias
      for (const subName of parentData.subcategories) {
        const existingSub = existingCategories.get(subName)
        
        if (existingSub) {
          // Atualizar parent_id se necessário
          if (existingSub.parent_id !== parentId) {
            await connector.queryNeon(
              `UPDATE categories 
               SET parent_id = $1, updated_at = NOW()
               WHERE id = $2`,
              [parentId, existingSub.id]
            )
            console.log(`   └─ ${subName} movida para ${parentName}`)
          } else {
            console.log(`   └─ ${subName} já está correta`)
          }
        } else {
          console.log(`   ⚠️  Subcategoria não encontrada: ${subName}`)
        }
      }
    }
    
    // Verificar resultados
    console.log('\n📊 VERIFICANDO RESULTADO...\n')
    
    const hierarchyResult = await connector.queryNeon(`
      WITH RECURSIVE category_tree AS (
        -- Categorias raiz
        SELECT 
          id, name, slug, parent_id, 
          0 as level,
          name::text as path
        FROM categories
        WHERE parent_id IS NULL
        
        UNION ALL
        
        -- Subcategorias
        SELECT 
          c.id, c.name, c.slug, c.parent_id,
          ct.level + 1,
          ct.path || ' > ' || c.name
        FROM categories c
        JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT 
        ct.*,
        COUNT(DISTINCT pc.product_id) as product_count
      FROM category_tree ct
      LEFT JOIN product_categories pc ON ct.id = pc.category_id
      GROUP BY ct.id, ct.name, ct.slug, ct.parent_id, ct.level, ct.path
      ORDER BY ct.path
    `)
    
    console.log('📁 HIERARQUIA FINAL:\n')
    
    let lastLevel = -1
    hierarchyResult.rows.forEach(cat => {
      const indent = '  '.repeat(cat.level)
      const icon = cat.level === 0 ? '📁' : '└─'
      
      if (cat.level === 0 && lastLevel >= 0) {
        console.log('') // Linha em branco entre categorias principais
      }
      
      console.log(`${indent}${icon} ${cat.name} (${cat.product_count} produtos)`)
      lastLevel = cat.level
    })
    
    // Estatísticas finais
    const statsResult = await connector.queryNeon(`
      SELECT 
        COUNT(*) FILTER (WHERE parent_id IS NULL) as main_categories,
        COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as subcategories,
        COUNT(*) as total
      FROM categories
    `)
    
    const stats = statsResult.rows[0]
    console.log('\n📈 ESTATÍSTICAS FINAIS:\n')
    console.log(`   Categorias principais: ${stats.main_categories}`)
    console.log(`   Subcategorias: ${stats.subcategories}`)
    console.log(`   Total: ${stats.total}`)
    
    // Verificar categorias órfãs (sem pai definido na hierarquia)
    const orphansResult = await connector.queryNeon(`
      SELECT name, slug
      FROM categories
      WHERE parent_id IS NULL
      AND name NOT IN (${Object.keys(hierarchy).map((_, i) => `$${i + 1}`).join(',')})
    `, Object.keys(hierarchy))
    
    if (orphansResult.rows.length > 0) {
      console.log('\n⚠️  CATEGORIAS ÓRFÃS (sem categoria pai definida):')
      orphansResult.rows.forEach(cat => {
        console.log(`   - ${cat.name} (${cat.slug})`)
      })
    }
    
    console.log('\n✅ HIERARQUIA IMPLEMENTADA COM SUCESSO!')
    
  } catch (error) {
    spinner.fail('Erro durante o processo')
    console.error('❌ Erro:', error)
  } finally {
    await connector.disconnect()
  }
}

// Executar
console.log('🚀 Implementando hierarquia de categorias...\n')
implementCategoryHierarchy() 