# 🚀 Comandos SQL para Executar AGORA

## 1. Criar Índices de Performance (EXECUTAR PRIMEIRO)

Este script cria todos os índices necessários para melhorar a performance das queries:

```bash
psql $DATABASE_URL < scripts/create-indexes.sql
```

**O que faz:**
- Cria índices para busca por slug, SKU, categoria, marca
- Índices compostos para listagens otimizadas
- Índice de busca textual em português
- Índices para foreign keys

## 2. Gerar Lista de Vendedores para Reset de Senha

Este script lista todos os vendedores que precisam resetar senha e cria tokens:

```bash
psql $DATABASE_URL < scripts/reset-seller-passwords.sql
```

**O que faz:**
- Lista vendedores com emails temporários
- Cria tabela `password_reset_tokens`
- Gera tokens de reset válidos por 48h
- Retorna lista com links de reset

## 3. Verificar Integridade dos Dados (OPCIONAL)

Se quiser verificar que tudo está correto:

```bash
psql $DATABASE_URL < scripts/check-data-integrity.sql
```

## Comandos Úteis do PostgreSQL

### Conectar ao banco via psql:
```bash
psql $DATABASE_URL
```

### Verificar índices criados:
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### Contar vendedores que precisam de reset:
```sql
SELECT COUNT(*) 
FROM users u 
JOIN sellers s ON s.user_id = u.id 
WHERE u.email LIKE '%@temp.marketplace.com';
```

### Exportar lista de vendedores para CSV:
```sql
\copy (
  SELECT 
    s.name as vendedor,
    s.email as email_vendedor,
    s.phone as telefone,
    'https://marketplace.com/reset-senha?token=' || prt.token as link_reset
  FROM password_reset_tokens prt
  JOIN users u ON prt.user_id = u.id
  JOIN sellers s ON s.user_id = u.id
  WHERE prt.used = false 
    AND prt.expires_at > CURRENT_TIMESTAMP
  ORDER BY s.name
) TO '/tmp/vendedores_reset.csv' WITH CSV HEADER;
```

## ⚠️ IMPORTANTE

1. **Faça backup antes** (embora o Xata faça automaticamente)
2. **Execute os scripts na ordem** indicada
3. **Salve a saída** do script de reset de senhas
4. **Monitore o tempo** de execução dos índices (pode levar alguns minutos)

## Próximos Passos Após Execução

1. ✅ Verificar que todos os índices foram criados
2. ✅ Exportar lista de vendedores com tokens
3. ✅ Enviar emails/WhatsApp para vendedores
4. ✅ Monitorar quantos resetaram a senha 