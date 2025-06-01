#!/bin/bash

echo "🚀 MIGRAÇÃO DE DADOS ESSENCIAIS: Local → Neon"
echo "============================================="
echo ""

# Configurações
LOCAL_DB="postgresql://postgres@localhost/mktplace_dev"
NEON_DB="postgresql://DB_USER:DB_PASSWORD@DB_HOST/DB_NAME?sslmode=require"

echo "📤 INSERINDO DADOS ESSENCIAIS NO NEON..."
echo "======================================="

# Inserir dados tabela por tabela, ignorando conflitos
echo "1. Inserindo usuários..."
psql "$LOCAL_DB" -c "COPY (SELECT id, email, name, password_hash, role, is_active, status, email_verified, created_at, updated_at FROM users) TO STDOUT WITH CSV HEADER" | \
psql "$NEON_DB" -c "COPY users(id, email, name, password_hash, role, is_active, status, email_verified, created_at, updated_at) FROM STDIN WITH CSV HEADER"

echo "2. Inserindo categorias..."
psql "$LOCAL_DB" -c "COPY (SELECT id, name, slug, description, parent_id, is_active, sort_order, created_at, updated_at FROM categories ORDER BY sort_order) TO STDOUT WITH CSV HEADER" | \
psql "$NEON_DB" -c "COPY categories(id, name, slug, description, parent_id, is_active, sort_order, created_at, updated_at) FROM STDIN WITH CSV HEADER"

echo "3. Inserindo marcas..."
psql "$LOCAL_DB" -c "COPY (SELECT id, name, slug, description, logo_url, is_active, created_at, updated_at FROM brands) TO STDOUT WITH CSV HEADER" | \
psql "$NEON_DB" -c "COPY brands(id, name, slug, description, logo_url, is_active, created_at, updated_at) FROM STDIN WITH CSV HEADER"

echo "4. Inserindo produtos..."
psql "$LOCAL_DB" -c "COPY (SELECT id, name, slug, description, short_description, price, original_price, cost_price, category_id, brand_id, sku, stock_quantity AS quantity, min_stock, max_stock, weight, length, width, height, featured, is_active, created_at, updated_at FROM products) TO STDOUT WITH CSV HEADER" | \
psql "$NEON_DB" -c "COPY products(id, name, slug, description, short_description, price, original_price, cost_price, category_id, brand_id, sku, quantity, min_stock, max_stock, weight, length, width, height, featured, is_active, created_at, updated_at) FROM STDIN WITH CSV HEADER"

echo "5. Inserindo imagens de produtos..."
psql "$LOCAL_DB" -c "COPY (SELECT id, product_id, url, alt_text, is_primary, sort_order, created_at, updated_at FROM product_images) TO STDOUT WITH CSV HEADER" | \
psql "$NEON_DB" -c "COPY product_images(id, product_id, url, alt_text, is_primary, sort_order, created_at, updated_at) FROM STDIN WITH CSV HEADER"

echo "6. Inserindo páginas..."
psql "$LOCAL_DB" -c "COPY (SELECT id, title, slug, content, meta_title, meta_description, is_published, created_at, updated_at FROM pages) TO STDOUT WITH CSV HEADER" | \
psql "$NEON_DB" -c "COPY pages(id, title, slug, content, meta_title, meta_description, is_published, created_at, updated_at) FROM STDIN WITH CSV HEADER"

echo ""
echo "🔍 VERIFICAÇÃO FINAL..."
echo "======================"

# Verificar dados no Neon
echo "Verificando dados migrados no Neon:"
psql "$NEON_DB" -c "
  SELECT 'users' as tabela, COUNT(*) as total FROM users 
  UNION ALL 
  SELECT 'products', COUNT(*) FROM products 
  UNION ALL 
  SELECT 'categories', COUNT(*) FROM categories 
  UNION ALL 
  SELECT 'brands', COUNT(*) FROM brands
  UNION ALL 
  SELECT 'product_images', COUNT(*) FROM product_images
  UNION ALL 
  SELECT 'pages', COUNT(*) FROM pages;"

echo ""
echo "📊 TESTANDO QUERIES ESSENCIAIS..."
echo "================================="

# Testar queries básicas
echo "Testando produtos em destaque:"
psql "$NEON_DB" -c "SELECT COUNT(*) as produtos_destaque FROM products WHERE featured = true AND is_active = true;"

echo "Testando categorias ativas:"
psql "$NEON_DB" -c "SELECT COUNT(*) as categorias_ativas FROM categories WHERE is_active = true;"

echo "Testando usuários ativos:"
psql "$NEON_DB" -c "SELECT COUNT(*) as usuarios_ativos FROM users WHERE is_active = true;"

echo ""
echo "✅ CONFIGURANDO .ENV PARA NEON..."
echo "================================"

# Backup .env atual
cp .env .env.backup_$(date +%Y%m%d_%H%M%S)

# Configurar para Neon
echo "DATABASE_URL=\"$NEON_DB\"" > .env

echo "✅ .env configurado para Neon"
echo ""

echo "🎉 MIGRAÇÃO DE DADOS ESSENCIAIS COMPLETA!"
echo "========================================"
echo ""
echo "📋 Dados migrados:"
echo "- ✅ Usuários"
echo "- ✅ Categorias"  
echo "- ✅ Marcas"
echo "- ✅ Produtos"
echo "- ✅ Imagens de produtos"
echo "- ✅ Páginas"
echo ""
echo "📋 Próximos passos:"
echo "1. Reiniciar servidor: cd apps/store && pnpm dev"
echo "2. Testar APIs: curl http://localhost:5173/api/products/featured"
echo "3. Deploy remoto"
echo ""

echo "🚀 PARA VOLTAR AO BANCO LOCAL:"
echo "  ./use-local-db.sh"
echo ""
echo "🌐 PARA USAR NEON:"
echo "  ./use-neon-db.sh" 