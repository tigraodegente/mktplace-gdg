# 🚀 Guia de Migração do Banco de Dados - Marketplace

## ⚠️ IMPORTANTE: Faça backup antes de começar!

### Passo 1: Backup do Banco
```bash
pg_dump "postgresql://DB_USER:DB_PASSWORD@DB_HOST/DB_NAME?sslmode=require" > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 📋 Executando a Migração

### Opção 1: Via Interface do Xata

1. Acesse o [Xata Dashboard](https://app.xata.io)
2. Vá para seu banco de dados `mktplace-gdg`
3. Clique em "SQL Editor" ou "Query"
4. Execute cada passo do arquivo `execute-migration-step-by-step.sql` individualmente

### Opção 2: Via psql (Terminal)

```bash
# Conectar ao banco
psql "postgresql://DB_USER:DB_PASSWORD@DB_HOST/DB_NAME?sslmode=require"

# Executar o script completo
\i /Users/guga/apps/mktplace-gdg/scripts/execute-migration-step-by-step.sql

# Ou executar passo a passo copiando e colando cada seção
```

## 🔍 Verificando a Migração

Após executar todos os passos, rode o script de verificação:

```sql
-- No SQL Editor do Xata ou psql
\i /Users/guga/apps/mktplace-gdg/scripts/verify-migration.sql
```

### Resultados Esperados:

1. **Tabelas Criadas**: 6 de 6
2. **Colunas Adicionadas**: 5 de 5
3. **Contagem de Registros**:
   - brands: 158
   - categories: 3
   - products: 11563
   - product_images: 1097
   - suppliers: 173

## 🔄 Migrando Fornecedores para Vendedores

Após verificar que tudo está OK, execute:

```sql
-- Migrar fornecedores existentes para vendedores
SELECT migrate_suppliers_to_sellers();
```

⚠️ **Nota**: Esta função só está no arquivo `migration-safe-marketplace.sql`. Se não executou, copie a função de lá primeiro.

## 🛠️ Troubleshooting

### Se algo der errado:

1. **Restaurar backup**:
```bash
psql "postgresql://..." < backup_YYYYMMDD_HHMMSS.sql
```

2. **Verificar erros específicos**:
```sql
-- Ver últimas mensagens de erro
SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction';
```

3. **Limpar transações pendentes**:
```sql
-- Cancelar transações travadas
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle in transaction' 
AND query_start < NOW() - INTERVAL '5 minutes';
```

## ✅ Checklist Pós-Migração

- [ ] Todas as tabelas foram criadas
- [ ] Nenhum dado foi perdido
- [ ] Usuário admin foi criado
- [ ] Colunas novas foram adicionadas
- [ ] Aplicação continua funcionando
- [ ] Testes passando

## 📝 Próximos Passos

1. **Atualizar Models TypeScript**:
   ```bash
   cd /Users/guga/apps/mktplace-gdg
   # Atualizar os arquivos em packages/shared-types/src/models/
   ```

2. **Atualizar Cliente Xata**:
   ```bash
   cd packages/xata-client
   npx xata pull main
   ```

3. **Testar Aplicação**:
   ```bash
   pnpm dev
   ```

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs do Xata
2. Execute o script de verificação
3. Consulte a documentação do Xata sobre migrações

---

**Lembre-se**: Esta migração é segura e não remove dados existentes! 