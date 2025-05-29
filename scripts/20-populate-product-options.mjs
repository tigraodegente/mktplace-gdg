#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function populateProductOptions() {
  const client = await pool.connect();
  
  try {
    console.log('🎨 Populando opções de produtos (cor, tamanho, volt)...\n');
    
    // Definir opções por categoria
    const productOptions = {
      // TVs
      'tv-samsung-55': {
        options: {
          'Tamanho': ['55"', '65"', '75"'],
          'Cor': ['Preto']
        }
      },
      'tv-lg-oled-65': {
        options: {
          'Tamanho': ['55"', '65"', '77"'],
          'Cor': ['Preto', 'Prata']
        }
      },
      'tv-sony-bravia-55': {
        options: {
          'Tamanho': ['55"', '65"'],
          'Cor': ['Preto']
        }
      },
      
      // Smartphones
      'iphone-15-pro-max': {
        options: {
          'Cor': ['Titânio Natural', 'Titânio Azul', 'Titânio Branco', 'Titânio Preto'],
          'Armazenamento': ['256GB', '512GB', '1TB']
        }
      },
      'samsung-galaxy-s24-ultra': {
        options: {
          'Cor': ['Preto', 'Cinza', 'Violeta', 'Amarelo'],
          'Armazenamento': ['256GB', '512GB', '1TB']
        }
      },
      'xiaomi-14-pro': {
        options: {
          'Cor': ['Preto', 'Branco', 'Verde'],
          'Armazenamento': ['256GB', '512GB']
        }
      },
      
      // Notebooks
      'macbook-pro-16': {
        options: {
          'Cor': ['Cinza Espacial', 'Prateado'],
          'Armazenamento': ['512GB SSD', '1TB SSD', '2TB SSD']
        }
      },
      'dell-xps-15': {
        options: {
          'Cor': ['Prata', 'Preto'],
          'Armazenamento': ['512GB SSD', '1TB SSD']
        }
      },
      
      // Geladeiras
      'geladeira-brastemp-frost-free': {
        options: {
          'Cor': ['Inox', 'Branco'],
          'Volt': ['110V', '220V']
        }
      },
      'geladeira-electrolux-inverter': {
        options: {
          'Cor': ['Inox', 'Preto'],
          'Volt': ['110V', '220V']
        }
      },
      
      // Ar Condicionado
      'ar-condicionado-lg-dual-inverter': {
        options: {
          'Cor': ['Branco'],
          'Volt': ['110V', '220V']
        }
      },
      
      // Micro-ondas
      'micro-ondas-panasonic': {
        options: {
          'Cor': ['Branco', 'Inox'],
          'Volt': ['110V', '220V']
        }
      },
      
      // Fogão
      'fogao-consul-5-bocas': {
        options: {
          'Cor': ['Inox', 'Branco', 'Preto']
        }
      },
      
      // Máquina de Lavar
      'maquina-lavar-lg-vivace': {
        options: {
          'Cor': ['Branco', 'Prata'],
          'Volt': ['110V', '220V']
        }
      },
      
      // Cafeteira
      'cafeteira-nespresso-vertuo': {
        options: {
          'Cor': ['Preto', 'Vermelho', 'Prata']
        }
      },
      
      // Aspirador
      'aspirador-dyson-v15': {
        options: {
          'Cor': ['Azul', 'Dourado']
        }
      },
      
      // Fone de Ouvido
      'airpods-pro-2': {
        options: {
          'Cor': ['Branco']
        }
      },
      'sony-wh-1000xm5': {
        options: {
          'Cor': ['Preto', 'Prata', 'Azul']
        }
      },
      
      // Smartwatch
      'apple-watch-series-9': {
        options: {
          'Tamanho': ['41mm', '45mm'],
          'Cor': ['Meia-noite', 'Estelar', 'Prateado', 'Rosa', 'Vermelho']
        }
      },
      'galaxy-watch-6': {
        options: {
          'Tamanho': ['40mm', '44mm'],
          'Cor': ['Preto', 'Prata', 'Dourado']
        }
      },
      
      // Tablet
      'ipad-pro-12-9': {
        options: {
          'Cor': ['Cinza Espacial', 'Prateado'],
          'Armazenamento': ['128GB', '256GB', '512GB', '1TB']
        }
      },
      
      // Console
      'playstation-5': {
        options: {
          'Versão': ['Com Leitor', 'Digital']
        }
      },
      'xbox-series-x': {
        options: {
          'Cor': ['Preto']
        }
      },
      
      // Câmera
      'canon-eos-r6': {
        options: {
          'Kit': ['Apenas Corpo', 'Com Lente 24-105mm']
        }
      },
      
      // Impressora
      'impressora-hp-smart-tank': {
        options: {
          'Cor': ['Preto']
        }
      },
      
      // Monitor
      'monitor-dell-ultrasharp': {
        options: {
          'Tamanho': ['27"', '32"']
        }
      },
      
      // Teclado
      'teclado-mecanico-razer': {
        options: {
          'Cor': ['Preto', 'Branco'],
          'Switch': ['Red', 'Blue', 'Brown']
        }
      },
      
      // Mouse
      'mouse-logitech-mx-master': {
        options: {
          'Cor': ['Grafite', 'Cinza Claro', 'Rosa']
        }
      },
      
      // Cadeira
      'cadeira-gamer-dxracer': {
        options: {
          'Cor': ['Preto/Vermelho', 'Preto/Azul', 'Preto/Verde']
        }
      },
      
      // Ventilador
      'ventilador-arno-turbo': {
        options: {
          'Cor': ['Preto', 'Branco'],
          'Volt': ['110V', '220V']
        }
      },
      
      // Liquidificador
      'liquidificador-oster': {
        options: {
          'Cor': ['Vermelho', 'Preto', 'Prata'],
          'Volt': ['110V', '220V']
        }
      },
      
      // Batedeira
      'batedeira-kitchenaid': {
        options: {
          'Cor': ['Vermelho', 'Preto', 'Branco', 'Rosa', 'Azul']
        }
      },
      
      // Fritadeira
      'air-fryer-mondial': {
        options: {
          'Cor': ['Preto', 'Vermelho'],
          'Volt': ['110V', '220V']
        }
      }
    };
    
    // Buscar produtos
    const products = await client.query(`
      SELECT id, slug, name, price 
      FROM products 
      WHERE slug = ANY($1)
    `, [Object.keys(productOptions)]);
    
    console.log(`📦 Encontrados ${products.rows.length} produtos para adicionar opções\n`);
    
    for (const product of products.rows) {
      const options = productOptions[product.slug];
      if (!options) continue;
      
      console.log(`\n🛍️ Produto: ${product.name}`);
      
      // Criar opções e valores
      for (const [optionName, values] of Object.entries(options.options)) {
        // Criar a opção
        const optionResult = await client.query(`
          INSERT INTO product_options (product_id, name, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
          ON CONFLICT (product_id, name) DO UPDATE SET updated_at = NOW()
          RETURNING id
        `, [product.id, optionName]);
        
        const optionId = optionResult.rows[0].id;
        console.log(`  ✅ Opção criada: ${optionName}`);
        
        // Criar valores da opção
        const valueIds = [];
        for (const value of values) {
          const valueResult = await client.query(`
            INSERT INTO product_option_values (option_id, value, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
            ON CONFLICT (option_id, value) DO UPDATE SET updated_at = NOW()
            RETURNING id
          `, [optionId, value]);
          
          valueIds.push({ value, id: valueResult.rows[0].id });
        }
        console.log(`  ✅ ${valueIds.length} valores criados`);
        
        // Criar variantes se não existirem
        if (optionName === Object.keys(options.options)[0]) {
          // Primeira opção - criar variantes base
          for (const valueInfo of valueIds) {
            // Calcular preço da variante (pequena variação)
            const priceVariation = (Math.random() * 0.1 - 0.05) * product.price; // ±5%
            const variantPrice = Math.round((product.price + priceVariation) * 100) / 100;
            
            // Gerar SKU único
            const variantSku = `${product.slug}-${valueInfo.value.toLowerCase().replace(/\s+/g, '-')}`;
            
            const variantResult = await client.query(`
              INSERT INTO product_variants (
                product_id, sku, price, quantity, 
                is_active, created_at, updated_at
              )
              VALUES ($1, $2, $3, $4, true, NOW(), NOW())
              ON CONFLICT (sku) DO UPDATE SET 
                price = EXCLUDED.price,
                updated_at = NOW()
              RETURNING id
            `, [
              product.id,
              variantSku,
              variantPrice,
              Math.floor(Math.random() * 50) + 10 // Estoque entre 10-60
            ]);
            
            const variantId = variantResult.rows[0].id;
            
            // Associar valor à variante
            await client.query(`
              INSERT INTO variant_option_values (variant_id, option_value_id)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `, [variantId, valueInfo.id]);
          }
        }
      }
      
      // Se houver múltiplas opções, criar combinações
      const optionEntries = Object.entries(options.options);
      if (optionEntries.length > 1) {
        console.log(`  🔄 Criando combinações de variantes...`);
        
        // Buscar todas as variantes existentes
        const existingVariants = await client.query(`
          SELECT pv.id, pv.sku
          FROM product_variants pv
          WHERE pv.product_id = $1
        `, [product.id]);
        
        // Para cada variante existente, adicionar valores das outras opções
        for (const variant of existingVariants.rows) {
          // Buscar opções já associadas
          const associatedOptions = await client.query(`
            SELECT po.name, pov.value
            FROM variant_option_values vov
            JOIN product_option_values pov ON pov.id = vov.option_value_id
            JOIN product_options po ON po.id = pov.option_id
            WHERE vov.variant_id = $1
          `, [variant.id]);
          
          // Adicionar valores das opções faltantes
          for (const [optionName, values] of optionEntries) {
            const hasOption = associatedOptions.rows.some(ao => ao.name === optionName);
            
            if (!hasOption && values.length > 0) {
              // Pegar o primeiro valor como padrão
              const defaultValue = values[0];
              
              // Buscar o ID do valor
              const valueResult = await client.query(`
                SELECT pov.id
                FROM product_option_values pov
                JOIN product_options po ON po.id = pov.option_id
                WHERE po.product_id = $1 AND po.name = $2 AND pov.value = $3
              `, [product.id, optionName, defaultValue]);
              
              if (valueResult.rows.length > 0) {
                await client.query(`
                  INSERT INTO variant_option_values (variant_id, option_value_id)
                  VALUES ($1, $2)
                  ON CONFLICT DO NOTHING
                `, [variant.id, valueResult.rows[0].id]);
              }
            }
          }
        }
      }
    }
    
    console.log('\n✅ Opções de produtos populadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar
populateProductOptions()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar script:', error);
    process.exit(1);
  }); 