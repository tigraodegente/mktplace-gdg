import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.develop' });
const sql = postgres(process.env.DATABASE_URL);
const [produto] = await sql`SELECT sku, name, category_id, short_description, meta_description, attributes, specifications, updated_at FROM products WHERE sku = '120963'`;
console.log('SKU:', produto.sku);
console.log('Nome:', produto.name);
console.log('Category ID:', produto.category_id || '❌ NULL');
console.log('Short Description:', produto.short_description ? '✅ ' + produto.short_description.length + ' chars' : '❌ Vazio');
console.log('Meta Description:', produto.meta_description ? '✅ ' + produto.meta_description.length + ' chars' : '❌ Vazio');
// Parse JSON fields se necessário
let attributesObj = produto.attributes;
if (typeof produto.attributes === 'string') {
    try { attributesObj = JSON.parse(produto.attributes); } catch (e) { attributesObj = null; }
}
let specificationsObj = produto.specifications;
if (typeof produto.specifications === 'string') {
    try { specificationsObj = JSON.parse(produto.specifications); } catch (e) { specificationsObj = null; }
}

const attributesCount = attributesObj && typeof attributesObj === 'object' ? Object.keys(attributesObj).length : 0;
const specificationsCount = specificationsObj && typeof specificationsObj === 'object' ? Object.keys(specificationsObj).length : 0;

console.log('Attributes:', attributesCount > 0 ? '✅ ' + attributesCount + ' attrs' : '❌ Vazio');
console.log('Specifications:', specificationsCount > 0 ? '✅ ' + specificationsCount + ' specs' : '❌ Vazio');
console.log('Atualizado:', produto.updated_at);
await sql.end(); 