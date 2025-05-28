-- Script Orquestrador de Migração de Produtos
-- Data: 28/05/2025
-- Autor: Cascade AI Assistant

\echo '🚀 Iniciando processo de migração de produtos...'

-- 1. Criar tabelas temporárias para armazenar IDs
CREATE TEMP TABLE temp_migration_ids (
  id TEXT,
  type TEXT
);

-- 2. Executar scripts na ordem correta
\echo '\n📋 Executando migração de categorias...'
\i 01_categories.sql

\echo '\n🏷️  Executando migração de marcas...'
\i 02_brands.sql

\echo '\n⚙️  Executando migração de opções de produtos...'
\i 03_product_options.sql

\echo '\n👕 Executando migração de produtos...'
\i 04_products.sql

\echo '\n🔄 Desativando produtos antigos...'
\i 05_deactivate_old_products.sql

-- 3. Verificar resultados
\echo '\n✅ Migração concluída com sucesso!'
\echo '\n📊 Resumo da migração:'
SELECT type, COUNT(*) as total FROM temp_migration_ids GROUP BY type ORDER BY type;

-- 4. Limpar tabela temporária
DROP TABLE IF EXISTS temp_migration_ids;

\echo '\n✨ Processo de migração finalizado!'
