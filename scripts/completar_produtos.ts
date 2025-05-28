import { getXataClient } from '../packages/xata-client/dist/xata';

const xata = getXataClient();

async function completarProdutos() {
  // Buscar produtos inseridos hoje
  const produtos = await xata.db.products.filter({ created_at: { $ge: '2025-05-28T00:00:00Z' } }).getAll();
  if (!produtos.length) {
    console.log('Nenhum produto encontrado para completar.');
    return;
  }

  // Buscar ou criar seller demo
  let seller = await xata.db.sellers.filter({ slug: 'loja-demo' }).getFirst();
  if (!seller) {
    seller = await xata.db.sellers.create({
      user_id: 'rec_5f5670ba946147828f231b0ceba2603e', // admin
      company_name: 'Loja Demo',
      slug: 'loja-demo',
      description: 'Seller de demonstração',
      logo_url: 'https://dummyimage.com/300x300/ccc/000.png&text=Loja+Demo',
      is_active: true
    });
  }

  // Buscar categoria principal e subcategoria
  const categoria = await xata.db.categories.filter({ slug: 'produtos' }).getFirst();
  let subcategoria = await xata.db.categories.filter({ slug: 'utilidades-domesticas' }).getFirst();
  if (!subcategoria) {
    subcategoria = await xata.db.categories.create({
      name: 'Utilidades Domésticas',
      slug: 'utilidades-domesticas',
      parent_id: categoria.id,
      is_active: true
    });
  }

  for (const produto of produtos) {
    // Atualizar produto
    await xata.db.products.update(produto.id, {
      seller_id: seller.id,
      category_id: categoria.id,
      cost: Number(produto.price) * 0.5,
      weight: 0.5,
      height: 5,
      width: 30,
      length: 40,
      meta_title: `${produto.name} | Loja Demo`,
      meta_description: produto.description,
      meta_keywords: ['produto', 'marketplace', produto.name],
      tags: ['novo', 'destaque'],
      attributes: { cor: 'azul', material: 'algodão' },
      specifications: { garantia: '12 meses' }
    });

    // Relacionar categoria principal e subcategoria
    await xata.db.product_categories.createOrUpdate({
      product_id: produto.id,
      category_id: categoria.id,
      is_primary: true
    });
    await xata.db.product_categories.createOrUpdate({
      product_id: produto.id,
      category_id: subcategoria.id,
      is_primary: false
    });

    // Imagem principal
    await xata.db.product_images.createOrUpdate({
      product_id: produto.id,
      image_url: `https://dummyimage.com/600x600/eee/000.png&text=${encodeURIComponent(produto.name)}`,
      alt_text: produto.name,
      is_primary: true
    });

    // Variações (exemplo para camiseta/calça)
    if (/camiseta|calça/i.test(produto.name)) {
      for (const tamanho of ['P', 'M', 'G']) {
        await xata.db.product_variants.createOrUpdate({
          product_id: produto.id,
          sku: `${produto.sku}-${tamanho}`,
          name: `${produto.name} - Tamanho ${tamanho}`,
          price: produto.price,
          quantity: 10,
          is_active: true
        });
      }
    }
  }
  console.log('Produtos completados com sucesso!');
}

completarProdutos().catch(console.error);
