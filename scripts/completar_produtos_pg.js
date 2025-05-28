const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL // Configure sua string de conexão aqui se necessário
});

async function main() {
  await client.connect();

  // 1. Criar seller demo se não existir
  await client.query(`
    INSERT INTO sellers (user_id, company_name, slug, description, logo_url, is_active, created_at, updated_at)
    VALUES (
      'rec_5f5670ba946147828f231b0ceba2603e',
      'Loja Demo',
      'loja-demo',
      'Seller de demonstração',
      'https://dummyimage.com/300x300/ccc/000.png&text=Loja+Demo',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (slug) DO NOTHING;
  `);

  // 2. Buscar seller e categoria
  const { rows: [seller] } = await client.query(`SELECT id FROM sellers WHERE slug = 'loja-demo' LIMIT 1`);
  const { rows: [categoria] } = await client.query(`SELECT id FROM categories WHERE slug = 'produtos' LIMIT 1`);
  let { rows: [subcategoria] } = await client.query(`SELECT id FROM categories WHERE slug = 'utilidades-domesticas' LIMIT 1`);
  if (!subcategoria) {
    await client.query(`
      INSERT INTO categories (name, slug, parent_id, is_active, created_at, updated_at)
      VALUES ('Utilidades Domésticas', 'utilidades-domesticas', $1, true, NOW(), NOW())
    `, [categoria.id]);
    subcategoria = (await client.query(`SELECT id FROM categories WHERE slug = 'utilidades-domesticas' LIMIT 1`)).rows[0];
  }

  // 3. Buscar produtos do dia
  const { rows: produtos } = await client.query(`
    SELECT * FROM products WHERE DATE(created_at) = '2025-05-28'
  `);

  for (const produto of produtos) {
    // 4. Atualizar produto
    await client.query(`
      UPDATE products
      SET
        seller_id = $1,
        category_id = $2,
        cost = price * 0.5,
        weight = 0.5,
        height = 5,
        width = 30,
        length = 40,
        meta_title = name || ' | Loja Demo',
        meta_description = description,
        meta_keywords = ARRAY['produto', 'marketplace', name],
        tags = ARRAY['novo', 'destaque'],
        attributes = '{"cor": "azul", "material": "algodão"}',
        specifications = '{"garantia": "12 meses"}'
      WHERE id = $3
    `, [seller.id, categoria.id, produto.id]);

    // 5. Relacionar categoria principal e subcategoria
    await client.query(`
      INSERT INTO product_categories (product_id, category_id, is_primary, created_at)
      VALUES ($1, $2, true, NOW())
      ON CONFLICT DO NOTHING
    `, [produto.id, categoria.id]);
    await client.query(`
      INSERT INTO product_categories (product_id, category_id, is_primary, created_at)
      VALUES ($1, $2, false, NOW())
      ON CONFLICT DO NOTHING
    `, [produto.id, subcategoria.id]);

    // 6. Imagem principal
    await client.query(`
      INSERT INTO product_images (product_id, image_url, alt_text, is_primary, created_at, updated_at)
      VALUES ($1, $2, $3, true, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [produto.id, `https://dummyimage.com/600x600/eee/000.png&text=${encodeURIComponent(produto.name)}`, produto.name]);

    // 7. Variações
    if (/camiseta|calça/i.test(produto.name)) {
      for (const tamanho of ['P', 'M', 'G']) {
        await client.query(`
          INSERT INTO product_variants (product_id, sku, name, price, quantity, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 10, true, NOW(), NOW())
          ON CONFLICT DO NOTHING
        `, [produto.id, `${produto.sku}-${tamanho}`, `${produto.name} - Tamanho ${tamanho}`, produto.price]);
      }
    }
  }

  await client.end();
  console.log('Produtos completados com sucesso!');
}

main().catch(console.error);
