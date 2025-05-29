# Limpeza de Colunas Redundantes no Banco de Dados

## Análise de Redundâncias

### 1. Colunas JSONB Redundantes na tabela `products`

#### `attributes` (JSONB)
- **Status**: ❌ REDUNDANTE - Dados duplicados das tabelas de variações
- **Problemas**:
  - Escape triplo nos valores (ex: `"65\\\""``)
  - Dados não normalizados
  - Duplica informações de `product_options` e `product_option_values`
- **Exemplo de redundância**:
  ```json
  // Em attributes:
  {"tamanho": "65\"", "cor": "Preto"}
  
  // Já existe em product_options/values:
  Tamanho -> 65"
  Cor -> Preto
  ```

#### `specifications` (JSONB)
- **Status**: ⚠️ PARCIALMENTE REDUNDANTE
- **Análise**: Contém dados técnicos que poderiam estar em `product_options`
- **Exemplo**:
  ```json
  {"peso": "220g", "dimensoes": "164.3 x 75.8 x 9.2mm"}
  ```

#### `featuring` (JSONB)
- **Status**: ❓ VERIFICAR USO
- **Análise**: Precisa verificar se está sendo usado

### 2. Dados Estruturados Corretos

#### Tabelas que DEVEM ser usadas:
1. **`product_options`** - Tipos de opções (Cor, Tamanho, etc.)
2. **`product_option_values`** - Valores das opções
3. **`product_variants`** - Variações com preço/estoque próprios
4. **`variant_option_values`** - Liga variantes aos valores

## Plano de Migração e Limpeza

### Fase 1: Auditoria (FAZER AGORA)
```sql
-- 1. Verificar se há dados em attributes que NÃO estão em product_options
SELECT DISTINCT 
    jsonb_object_keys(attributes::jsonb) as attribute_key
FROM products
WHERE attributes IS NOT NULL
EXCEPT
SELECT DISTINCT name 
FROM product_options;

-- 2. Verificar uso de specifications
SELECT COUNT(*) as products_with_specs,
       COUNT(DISTINCT jsonb_object_keys(specifications::jsonb)) as unique_spec_keys
FROM products
WHERE specifications IS NOT NULL;

-- 3. Verificar uso de featuring
SELECT COUNT(*) as products_with_featuring
FROM products
WHERE featuring IS NOT NULL;
```

### Fase 2: Migração de Dados (SE NECESSÁRIO)
```sql
-- Script para migrar dados únicos de attributes para product_options
-- EXECUTAR APENAS APÓS AUDITORIA!
```

### Fase 3: Deprecação
1. **Imediato**: Parar de escrever nessas colunas
2. **30 dias**: Adicionar comentário de deprecação
3. **60 dias**: Renomear colunas para `_deprecated_attributes`
4. **90 dias**: Remover colunas

### Fase 4: Remoção Final
```sql
-- BACKUP PRIMEIRO!
ALTER TABLE products DROP COLUMN attributes;
ALTER TABLE products DROP COLUMN specifications;
ALTER TABLE products DROP COLUMN featuring; -- se não usado
```

## Impacto no Código

### APIs que precisam ser atualizadas:
1. ❌ Parar de ler/escrever em `attributes`
2. ❌ Parar de ler/escrever em `specifications`
3. ✅ Usar apenas `product_options` e relacionadas

### Componentes afetados:
- [ ] API de produtos
- [ ] Admin panel - formulário de produtos
- [ ] Seller panel - formulário de produtos
- [ ] Importação de produtos

## Cronograma Recomendado

| Fase | Ação | Prazo | Responsável |
|------|------|-------|-------------|
| 1 | Auditoria completa | Imediato | DevOps |
| 2 | Parar novos writes | 1 semana | Backend |
| 3 | Migrar dados únicos | 2 semanas | Backend |
| 4 | Deprecar colunas | 1 mês | DevOps |
| 5 | Remover colunas | 3 meses | DevOps |

## Comandos de Verificação

```bash
# Verificar tamanho das colunas JSONB
psql -c "
SELECT 
    pg_column_size(attributes) as attr_size,
    pg_column_size(specifications) as spec_size,
    pg_column_size(featuring) as feat_size
FROM products;
"

# Estimar economia de espaço
psql -c "
SELECT 
    pg_size_pretty(SUM(pg_column_size(attributes))) as total_attr_size,
    pg_size_pretty(SUM(pg_column_size(specifications))) as total_spec_size
FROM products;
"
```

## Notas Importantes

1. **SEMPRE FAZER BACKUP** antes de remover colunas
2. **Verificar dependências** em views, functions, triggers
3. **Comunicar equipe** sobre mudanças
4. **Monitorar erros** após cada fase

## Status Atual

- [ ] Auditoria completa
- [ ] Backup dos dados
- [ ] Migração iniciada
- [ ] Código atualizado
- [ ] Colunas removidas

---

**Última atualização**: [DATA]
**Responsável**: [NOME] 