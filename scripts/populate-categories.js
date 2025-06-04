import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

// URL de desenvolvimento do Neon
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const categories = [
  // Eletrônicos - Categoria principal
  {
    name: 'Eletrônicos',
    slug: 'eletronicos',
    description: 'Produtos eletrônicos e gadgets',
    parent_id: null,
    position: 1,
    children: [
      {
        name: 'Smartphones',
        slug: 'smartphones',
        description: 'Celulares e smartphones',
        position: 1,
        children: [
          { name: 'iPhone', slug: 'iphone', position: 1 },
          { name: 'Samsung', slug: 'samsung', position: 2 },
          { name: 'Xiaomi', slug: 'xiaomi', position: 3 }
        ]
      },
      {
        name: 'Notebooks',
        slug: 'notebooks',
        description: 'Notebooks e laptops',
        position: 2,
        children: [
          { name: 'Notebooks Gaming', slug: 'notebooks-gaming', position: 1 },
          { name: 'Notebooks Trabalho', slug: 'notebooks-trabalho', position: 2 },
          { name: 'Ultrabooks', slug: 'ultrabooks', position: 3 }
        ]
      },
      {
        name: 'Tablets',
        slug: 'tablets',
        description: 'Tablets e e-readers',
        position: 3
      },
      {
        name: 'Acessórios',
        slug: 'acessorios-eletronicos',
        description: 'Acessórios para eletrônicos',
        position: 4,
        children: [
          { name: 'Capas e Películas', slug: 'capas-peliculas', position: 1 },
          { name: 'Fones de Ouvido', slug: 'fones-ouvido', position: 2 },
          { name: 'Carregadores', slug: 'carregadores', position: 3 }
        ]
      }
    ]
  },
  // Casa e Decoração
  {
    name: 'Casa e Decoração',
    slug: 'casa-decoracao',
    description: 'Produtos para casa e decoração',
    parent_id: null,
    position: 2,
    children: [
      {
        name: 'Móveis',
        slug: 'moveis',
        description: 'Móveis para todos os ambientes',
        position: 1,
        children: [
          { name: 'Sala de Estar', slug: 'moveis-sala', position: 1 },
          { name: 'Quarto', slug: 'moveis-quarto', position: 2 },
          { name: 'Cozinha', slug: 'moveis-cozinha', position: 3 },
          { name: 'Escritório', slug: 'moveis-escritorio', position: 4 }
        ]
      },
      {
        name: 'Decoração',
        slug: 'decoracao',
        description: 'Itens decorativos',
        position: 2,
        children: [
          { name: 'Quadros', slug: 'quadros', position: 1 },
          { name: 'Vasos', slug: 'vasos', position: 2 },
          { name: 'Almofadas', slug: 'almofadas', position: 3 },
          { name: 'Tapetes', slug: 'tapetes', position: 4 }
        ]
      },
      {
        name: 'Organização',
        slug: 'organizacao',
        description: 'Produtos para organização',
        position: 3,
        children: [
          { name: 'Cestos e Caixas', slug: 'cestos-caixas', position: 1 },
          { name: 'Prateleiras', slug: 'prateleiras', position: 2 },
          { name: 'Organizadores', slug: 'organizadores', position: 3 }
        ]
      }
    ]
  },
  // Moda
  {
    name: 'Moda',
    slug: 'moda',
    description: 'Roupas e acessórios',
    parent_id: null,
    position: 3,
    children: [
      {
        name: 'Roupas Femininas',
        slug: 'roupas-femininas',
        position: 1,
        children: [
          { name: 'Vestidos', slug: 'vestidos', position: 1 },
          { name: 'Blusas', slug: 'blusas', position: 2 },
          { name: 'Calças', slug: 'calcas-femininas', position: 3 }
        ]
      },
      {
        name: 'Roupas Masculinas',
        slug: 'roupas-masculinas',
        position: 2,
        children: [
          { name: 'Camisas', slug: 'camisas', position: 1 },
          { name: 'Calças', slug: 'calcas-masculinas', position: 2 },
          { name: 'Bermudas', slug: 'bermudas', position: 3 }
        ]
      },
      {
        name: 'Calçados',
        slug: 'calcados',
        position: 3,
        children: [
          { name: 'Tênis', slug: 'tenis', position: 1 },
          { name: 'Sapatos', slug: 'sapatos', position: 2 },
          { name: 'Sandálias', slug: 'sandalias', position: 3 }
        ]
      }
    ]
  }
];

async function insertCategory(client, category, parentId = null) {
  const { rows } = await client.query(
    `INSERT INTO categories (name, slug, description, parent_id, position, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id`,
    [category.name, category.slug, category.description || null, parentId, category.position]
  );
  
  const categoryId = rows[0].id;
  
  // Inserir subcategorias recursivamente
  if (category.children && category.children.length > 0) {
    for (const child of category.children) {
      await insertCategory(client, child, categoryId);
    }
  }
  
  return categoryId;
}

async function populateCategories() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { 
      rejectUnauthorized: false 
    }
  });

  try {
    await client.connect();
    console.log('🔌 Conectado ao banco de dados');
    
    // Verificar se já existem categorias
    const { rows: existing } = await client.query('SELECT COUNT(*) as count FROM categories');
    if (existing[0].count > 0) {
      console.log('⚠️  Já existem categorias no banco. Pulando...');
      return;
    }
    
    console.log('📦 Inserindo categorias...');
    
    // Inserir cada categoria principal e suas subcategorias
    for (const category of categories) {
      await insertCategory(client, category);
      console.log(`✅ Categoria '${category.name}' e suas subcategorias inseridas`);
    }
    
    // Mostrar estatísticas
    const { rows: stats } = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE parent_id IS NULL) as principais,
        COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as subcategorias
      FROM categories
    `);
    
    console.log('\n📊 Estatísticas:');
    console.log(`   Total de categorias: ${stats[0].total}`);
    console.log(`   Categorias principais: ${stats[0].principais}`);
    console.log(`   Subcategorias: ${stats[0].subcategorias}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
    console.log('\n✨ Finalizado!');
  }
}

populateCategories(); 