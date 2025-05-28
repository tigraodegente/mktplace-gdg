# Scripts de Migração de Produtos

Este diretório contém os scripts SQL para migração de produtos para o banco de dados Xata.

## Estrutura dos Scripts

Os scripts devem ser executados na seguinte ordem:

1. `01_categories.sql` - Cria as categorias e subcategorias
2. `02_brands.sql` - Cria as marcas
3. `03_product_options.sql` - Cria as opções de produtos (tamanhos, cores, etc.)
4. `04_products_simple.sql` - Insere os produtos e suas variações
5. `05_deactivate_old_products_simple.sql` - Desativa produtos antigos que não estão na nova importação

## Como Executar

1. Certifique-se de que o arquivo `.env` esteja configurado com as credenciais do banco de dados.
2. Execute os scripts em ordem usando o comando `psql` ou sua ferramenta de banco de dados preferida.

```bash
# Exemplo de execução com psql
psql $DATABASE_URL -f 01_categories.sql
psql $DATABASE_URL -f 02_brands.sql
psql $DATABASE_URL -f 03_product_options.sql
psql $DATABASE_URL -f 04_products_simple.sql
psql $DATABASE_URL -f 05_deactivate_old_products_simple.sql
```

## Estrutura do Banco de Dados

Os scripts assumem a seguinte estrutura de tabelas:

- `products` - Produtos principais
- `product_variants` - Variações de produtos
- `product_categories` - Relacionamento entre produtos e categorias
- `categories` - Categorias e subcategorias
- `brands` - Marcas
- `product_options` e `product_option_values` - Opções de produtos (tamanhos, cores, etc.)
- `migration_tracking` - Rastreamento de itens migrados

## Observações

- Os scripts foram otimizados para funcionar com o Xata, evitando recursos não suportados.
- As operações são executadas em lotes para melhor desempenho.
- Índices são criados para melhorar o desempenho das consultas.
