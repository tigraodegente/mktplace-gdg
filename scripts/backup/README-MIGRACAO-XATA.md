# Guia de Migração para Xata ORM

Este guia explica como migrar o banco de dados existente para uma estrutura compatível com o Xata ORM.

## ⚠️ IMPORTANTE

O Xata tem limitações no SQL suportado. Por isso, os scripts foram divididos em partes que devem ser executadas separadamente.

## 📋 Pré-requisitos

1. Acesso ao SQL Editor do Xata
2. Backup do banco de dados (recomendado)
3. Tempo suficiente para executar a migração completa

## 🚀 Processo de Migração

### Passo 1: Renomear Tabelas Existentes

Execute cada comando `ALTER TABLE` individualmente no SQL Editor do Xata:

```sql
ALTER TABLE products RENAME TO products_old;
ALTER TABLE categories RENAME TO categories_old;
ALTER TABLE brands RENAME TO brands_old;
-- ... continue com todas as tabelas
```

**Nota**: Se alguma tabela já foi renomeada, pule para a próxima.

### Passo 2: Criar Novas Tabelas

Execute o script de criação de tabelas do arquivo `migrate-to-xata-complete.sql`, seção por seção:

1. Primeiro crie a tabela `users` (necessária para foreign keys)
2. Depois crie `brands`, `categories` e `sellers`
3. Em seguida `products` e `product_images`
4. Continue com as demais tabelas respeitando as dependências

### Passo 3: Migrar Dados - Parte 1

Execute os INSERTs do arquivo `migrate-to-xata-complete.sql` na seguinte ordem:

1. `users`
2. `brands`
3. `categories`
4. `sellers`
5. `products`
6. `product_images`

### Passo 4: Migrar Dados - Parte 2

Execute os INSERTs do arquivo `migrate-data-remaining-tables.sql` para as tabelas restantes:

1. `addresses`
2. `orders`
3. `order_items`
4. E assim por diante...

### Passo 5: Criar Índices

Execute todos os comandos `CREATE INDEX` do arquivo `migrate-to-xata-complete.sql`.

### Passo 6: Verificar Migração

Execute o script `verify-xata-migration.sql` para verificar:

- Estrutura das tabelas
- Contagem de registros
- Integridade dos dados
- Relacionamentos

## 🔍 Verificações Importantes

### Verificar Contagem de Registros

```sql
SELECT 'products' as tabela, COUNT(*) as quantidade FROM products
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
-- ... continue para todas as tabelas
```

### Verificar Colunas Xata

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name IN ('xata_id', 'xata_version', 'xata_createdat', 'xata_updatedat')
ORDER BY table_name;
```

## 🧹 Limpeza (APENAS após confirmar sucesso)

Após verificar que tudo está funcionando corretamente:

```sql
DROP TABLE IF EXISTS products_old CASCADE;
DROP TABLE IF EXISTS categories_old CASCADE;
-- ... continue para todas as tabelas _old
```

## ⚠️ Troubleshooting

### Erro: "table already exists"
- A tabela já foi criada. Pule para a próxima.

### Erro: "foreign key constraint"
- Certifique-se de criar/migrar as tabelas na ordem correta.

### Erro: "duplicate key value"
- Alguns dados já foram migrados. O `ON CONFLICT DO NOTHING` deve prevenir erros.

### Erro: "unsupported statement"
- O Xata não suporta algumas funcionalidades SQL. Execute comandos mais simples individualmente.

## 📊 Tabelas Incluídas na Migração

Total de 29 tabelas:

- abandoned_carts
- addresses
- brands
- cart_items
- categories
- coupon_usage
- coupons
- notification_preferences
- notifications
- order_items
- orders
- payment_methods
- payment_transactions
- product_analytics
- product_images
- product_option_values
- product_options
- product_price_history
- product_reviews
- product_variants
- products
- sellers
- shipping_methods
- shipping_zones
- system_settings
- user_sessions
- users
- variant_option_values
- wishlists

## 🎯 Resultado Esperado

Após a migração completa:

1. Todas as tabelas terão estrutura compatível com Xata ORM
2. Todos os dados serão preservados
3. As colunas especiais do Xata estarão presentes:
   - `xata_id`: Identificador único do Xata
   - `xata_version`: Controle de versão
   - `xata_createdat`: Data de criação no Xata
   - `xata_updatedat`: Data de atualização no Xata
   - `xata`: Metadados JSON

## 💡 Dicas

1. Execute em horário de baixo tráfego
2. Faça backup antes de iniciar
3. Execute uma tabela por vez se encontrar problemas
4. Monitore o progresso com as queries de verificação
5. Mantenha as tabelas _old até ter certeza do sucesso 