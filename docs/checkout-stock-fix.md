# Correção do Controle de Estoque no Checkout

## 📋 Resumo do Problema

1. **Erro em Produção**: O UPDATE de estoque estava causando erro `syntax error at end of input` apenas em produção (Cloudflare/Neon)
2. **Solução Temporária**: O controle de estoque foi desabilitado no commit `4ed38b5`
3. **Impacto**: Pedidos estavam sendo criados sem atualizar o estoque dos produtos

## 🔧 Solução Implementada

### 1. Reabilitação do Controle de Estoque

Arquivo: `apps/store/src/routes/api/checkout/create-order/+server.ts`

**Mudanças principais:**
- Removido o campo `updated_at` do UPDATE (não compatível com Cloudflare)
- Simplificado o UPDATE para usar apenas o campo `quantity`
- Adicionado registro de movimentos de estoque para rastreabilidade
- Melhorado tratamento de erros com logs detalhados

```typescript
// UPDATE simples e compatível
await sql`
  UPDATE products 
  SET quantity = ${newQuantity}
  WHERE id = ${item.productId}
`;

// Registro do movimento de estoque
await sql`
  INSERT INTO stock_movements (
    product_id, type, quantity, reason, 
    reference_id, notes, created_by
  ) VALUES (
    ${item.productId}, 'out', ${item.quantity}, 
    'Venda', ${order.id}, 
    ${`Pedido ${order.order_number}`}, 
    ${authResult.user!.id}
  )
`;
```

### 2. Scripts de Teste

#### Teste Local
```bash
# Executar teste de atualização de estoque
node scripts/test-stock-update.mjs
```

#### Teste em Produção
```bash
# Acessar endpoint de debug (temporário)
curl https://seu-dominio.com/api/debug-stock-update
```

## 🧪 Como Testar

### 1. Teste Manual do Checkout

1. Adicione um produto ao carrinho
2. Anote o estoque atual do produto
3. Complete o checkout até o final
4. Verifique se:
   - O pedido foi criado com sucesso
   - O estoque foi reduzido corretamente
   - Foi criado um registro em `stock_movements`

### 2. Verificação no Banco de Dados

```sql
-- Verificar último pedido criado
SELECT * FROM orders 
ORDER BY created_at DESC 
LIMIT 1;

-- Verificar movimentos de estoque do pedido
SELECT * FROM stock_movements 
WHERE reference_id = 'ID_DO_PEDIDO'
ORDER BY created_at DESC;

-- Verificar estoque do produto
SELECT id, name, quantity 
FROM products 
WHERE id = 'ID_DO_PRODUTO';
```

## ⚠️ Pontos de Atenção

1. **Transações**: O UPDATE de estoque está dentro da transação do pedido
2. **Rollback**: Se houver erro após o UPDATE, a transação inteira é revertida
3. **Logs**: Erros de estoque são logados mas não impedem a criação do pedido
4. **Movimentos**: Tabela `stock_movements` registra histórico completo

## 🚀 Deploy

1. **Commit as mudanças**:
```bash
git add -A
git commit -m "fix(store): reabilita controle de estoque com sintaxe compatível Cloudflare"
git push origin main
```

2. **Monitorar logs em produção** após o deploy

3. **Remover endpoint de debug** após confirmar que está funcionando:
```bash
rm apps/store/src/routes/api/debug-stock-update/+server.ts
```

## 📊 Monitoramento

Após o deploy, monitorar:
- Logs de erro relacionados a "CREATE-ORDER"
- Registros na tabela `stock_movements`
- Discrepâncias entre pedidos e estoque

## 🔄 Rollback (se necessário)

Se houver problemas em produção, comentar novamente o código de atualização de estoque:

```typescript
// Atualizar estoque - TEMPORARIAMENTE DESABILITADO
/*
try {
  // código de atualização...
} catch (stockError) {
  // ...
}
*/
``` 