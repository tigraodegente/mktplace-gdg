# Schema do Banco de Dados

Este diretório contém os arquivos de schema e migrações do banco de dados.

## Estrutura

- `/tables/` - Definições de tabelas e estruturas
- `/migrations/` - Scripts de migração e atualizações

## Como usar

### Criar novo banco
```bash
# Execute os scripts em ordem
cat tables/*.sql | psql $DATABASE_URL
```

### Aplicar migrações
```bash
# Execute as migrações em ordem cronológica
for file in migrations/*.sql; do
  psql $DATABASE_URL -f "$file"
done
```

## Convenções

- Use nomes descritivos para arquivos
- Inclua timestamp em migrações: `YYYYMMDD_description.sql`
- Sempre inclua rollback em migrações complexas
