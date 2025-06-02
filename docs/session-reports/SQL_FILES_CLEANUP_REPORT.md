# Relatório de Limpeza de Arquivos SQL

**Data**: Sun Jun  1 21:13:54 -03 2025
**Total de arquivos movidos**:        2

## Arquivos Organizados

### Schema e Tabelas (1 arquivos)
Movidos para `schema/tables/`:
- fix_appmax_schema.sql

### Migrações (0 arquivos)
Nenhum arquivo nesta categoria.

### Testes (1 arquivos)
Movidos para `sql-backup/tests/`:
- test_appmax_integration.sql

### Outros (0 arquivos)
Nenhum arquivo nesta categoria.

## Próximos Passos

1. Revisar arquivos em `sql-backup/` e remover desnecessários
2. Consolidar schemas duplicados em `schema/tables/`
3. Ordenar migrações cronologicamente em `schema/migrations/`
4. Atualizar scripts de deploy para usar nova estrutura

## Reverter (se necessário)

Para reverter esta organização:
```bash
# Mover todos os arquivos de volta para o root
mv schema/tables/*.sql ./
mv schema/migrations/*.sql ./
mv sql-backup/tests/*.sql ./
mv sql-backup/misc/*.sql ./
```
