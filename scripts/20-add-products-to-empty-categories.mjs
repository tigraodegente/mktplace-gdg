import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Client } = pg;

async function addProductsToEmptyCategories() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // Buscar categorias vazias
    const emptyCategories = await client.query(`
      SELECT c.id, c.name, c.slug
      FROM categories c
      WHERE c.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM products p 
        WHERE p.category_id = c.id 
        AND p.is_active = true
      )
    `);

    console.log(`📁 Categorias vazias encontradas: ${emptyCategories.rows.length}`);
    
    // Buscar marcas e vendedores para usar
    const brands = await client.query('SELECT id FROM brands WHERE is_active = true LIMIT 5');
    const sellers = await client.query('SELECT id FROM sellers WHERE is_active = true LIMIT 5');

    // Produtos para categoria "Casa"
    const casaProducts = [
      {
        name: 'Aspirador de Pó Vertical 1200W',
        description: 'Aspirador de pó vertical potente com filtro HEPA',
        price: 299.90,
        original_price: 399.90,
        sku: 'ASP-001'
      },
      {
        name: 'Conjunto de Panelas Antiaderente 5 Peças',
        description: 'Conjunto completo de panelas com revestimento antiaderente',
        price: 189.90,
        original_price: 249.90,
        sku: 'PAN-001'
      },
      {
        name: 'Ventilador de Torre 40cm com Controle',
        description: 'Ventilador de torre silencioso com controle remoto',
        price: 349.90,
        sku: 'VEN-001'
      },
      {
        name: 'Jogo de Cama Queen 200 Fios',
        description: 'Jogo de cama 100% algodão, 200 fios',
        price: 149.90,
        original_price: 199.90,
        sku: 'CAM-001'
      },
      {
        name: 'Organizador de Armário Modular',
        description: 'Sistema modular para organização de armários',
        price: 79.90,
        sku: 'ORG-001'
      }
    ];

    // Produtos para "Acessórios para Celular"
    const acessoriosProducts = [
      {
        name: 'Carregador Turbo USB-C 20W',
        description: 'Carregador rápido USB-C com tecnologia Power Delivery',
        price: 49.90,
        original_price: 69.90,
        sku: 'CAR-001'
      },
      {
        name: 'Capa Premium para iPhone 15',
        description: 'Capa protetora premium com proteção militar',
        price: 39.90,
        sku: 'CAP-001'
      },
      {
        name: 'Película de Vidro 3D Full Cover',
        description: 'Película de vidro temperado com cobertura total',
        price: 29.90,
        original_price: 39.90,
        sku: 'PEL-001'
      },
      {
        name: 'Power Bank 10000mAh com Display',
        description: 'Bateria portátil com display LED e carregamento rápido',
        price: 89.90,
        sku: 'PWR-001'
      },
      {
        name: 'Suporte Veicular Magnético 360°',
        description: 'Suporte magnético para carro com rotação 360 graus',
        price: 34.90,
        original_price: 49.90,
        sku: 'SUP-001'
      }
    ];

    // Inserir produtos
    for (const category of emptyCategories.rows) {
      console.log(`\n📦 Adicionando produtos para: ${category.name}`);
      
      let productsToAdd = [];
      if (category.slug === 'casa') {
        productsToAdd = casaProducts;
      } else if (category.slug === 'acessorios-celular') {
        productsToAdd = acessoriosProducts;
      } else {
        // Produtos genéricos para outras categorias vazias
        productsToAdd = [
          {
            name: `Produto Exemplo 1 - ${category.name}`,
            description: `Descrição do produto de ${category.name}`,
            price: 99.90,
            sku: `${category.slug.toUpperCase()}-001`
          },
          {
            name: `Produto Exemplo 2 - ${category.name}`,
            description: `Descrição do produto de ${category.name}`,
            price: 149.90,
            original_price: 199.90,
            sku: `${category.slug.toUpperCase()}-002`
          }
        ];
      }

      for (let i = 0; i < productsToAdd.length; i++) {
        const product = productsToAdd[i];
        const brandId = brands.rows[i % brands.rows.length].id;
        const sellerId = sellers.rows[i % sellers.rows.length].id;

        const slug = product.name.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const insertQuery = `
          INSERT INTO products (
            name, slug, description, price, original_price, sku,
            category_id, brand_id, seller_id,
            quantity, is_active, featured,
            rating_average, rating_count, sales_count,
            condition, delivery_days, has_free_shipping,
            seller_state, seller_city,
            tags, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9,
            $10, $11, $12,
            $13, $14, $15,
            $16, $17, $18,
            $19, $20,
            $21, NOW(), NOW()
          )
        `;

        const values = [
          product.name,
          slug,
          product.description,
          product.price,
          product.original_price || null,
          product.sku,
          category.id,
          brandId,
          sellerId,
          Math.floor(Math.random() * 50) + 10, // quantity
          true, // is_active
          i === 0, // featured (primeiro produto)
          3 + Math.random() * 2, // rating 3-5
          Math.floor(Math.random() * 100) + 10, // rating_count
          Math.floor(Math.random() * 200), // sales_count
          'new', // condition
          Math.floor(Math.random() * 5) + 1, // delivery_days
          Math.random() > 0.3, // has_free_shipping (70% chance)
          ['SP', 'RJ', 'MG', 'RS', 'PR'][Math.floor(Math.random() * 5)],
          ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre', 'Curitiba'][Math.floor(Math.random() * 5)],
          category.slug === 'casa' 
            ? ['decoração', 'utilidades', 'organização']
            : category.slug === 'acessorios-celular'
            ? ['smartphone', 'proteção', 'carregamento']
            : ['novo', 'qualidade']
        ];

        await client.query(insertQuery, values);
        console.log(`  ✅ ${product.name}`);
      }
    }

    console.log('\n✅ Produtos adicionados com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

addProductsToEmptyCategories(); 