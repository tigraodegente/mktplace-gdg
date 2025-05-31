# 🚨 DADOS MOCK PARA REMOVER - MARKETPLACE GDG

## **📊 STATUS ATUAL**

**✅ Removidos:** Página principal, ProductCard, APIs principais  
**❌ Pendentes:** 8 APIs com mock extenso + 4 páginas com dados simulados  

---

## **🎯 APIS COM DADOS MOCK PARA IMPLEMENTAR**

### **1. API NOTIFICAÇÕES**
**Arquivo:** `apps/store/src/routes/api/notifications/+server.ts`
**Status:** 🔴 Mock completo como fallback
**Dados Mock:**
```typescript
const mockNotifications = [
  { id: '1', title: 'Pedido confirmado', message: '...', type: 'success' },
  { id: '2', title: 'Produto enviado', message: '...', type: 'info' },
  // + 8 notificações mock
];
```

**Implementação Necessária:**
- Conectar com tabela `notifications` do banco
- Sistema real de notificações push
- Filtros por usuário e status
- Paginação adequada

---

### **2. API DEVOLUÇÕES**
**Arquivo:** `apps/store/src/routes/api/returns/+server.ts`
**Status:** 🔴 Mock expandido
**Dados Mock:**
```typescript
const mockReturns = [
  { id: '1', order_id: 'ORD-001', status: 'pending', reason: 'Produto com defeito' },
  // + 15 devoluções mock
];
```

**Implementação Necessária:**
- Conectar com tabela `returns` do banco
- Workflow completo de devoluções
- Integração com sistema de pagamentos
- Rastreamento de status

---

### **3. API RASTREAMENTO**
**Arquivo:** `apps/store/src/routes/api/orders/[id]/tracking/+server.ts`
**Status:** 🔴 Mock como fallback
**Dados Mock:**
```typescript
const mockTrackingData = {
  events: [
    { date: '2024-01-15', status: 'Pedido confirmado', location: 'São Paulo, SP' },
    // + 5 eventos mock
  ]
};
```

**Implementação Necessária:**
- API real dos Correios/transportadoras
- Webhooks para atualizações automáticas
- Histórico persistente no banco

---

### **4. API SUPORTE**
**Arquivo:** `apps/store/src/routes/api/support/tickets/+server.ts`
**Status:** 🔴 Mock expandido
**Dados Mock:**
```typescript
const mockTickets = [
  { id: '1', subject: 'Problema com pagamento', category: 'payment', status: 'open' },
  // + 12 tickets mock
];
```

**Implementação Necessária:**
- Sistema completo de tickets
- Categorização automática
- Chat em tempo real
- Escalation rules

---

### **5. API CHAT**
**Arquivo:** `apps/store/src/routes/api/chat/conversations/+server.ts`
**Status:** 🔴 Mock para fallback
**Dados Mock:**
```typescript
const mockConversations = [
  { id: '1', participant_name: 'Ana Silva', last_message: 'Olá!', unread_count: 2 },
  // + 6 conversas mock
];
```

**Implementação Necessária:**
- WebSocket real-time messaging
- Persistência adequada no banco
- Sistema de typing indicators
- Upload de arquivos

---

### **6. API MENSAGENS**
**Arquivo:** `apps/store/src/routes/api/chat/conversations/[id]/messages/+server.ts`
**Status:** 🔴 Mock extenso
**Dados Mock:**
```typescript
const mockMessages = [
  { id: '1', content: 'Olá! Como posso ajudar?', sender_type: 'support' },
  // + 20 mensagens mock
];
```

**Implementação Necessária:**
- Mensagens persistentes
- Media attachments
- Message reactions
- Read receipts

---

### **7. API PAGAMENTOS**
**Arquivo:** `apps/store/src/routes/api/payments/process/+server.ts`
**Status:** 🟡 Parcialmente mock
**Dados Mock:**
```typescript
cardToken: data?.cardToken || 'mock_card_token',
pdfUrl: `https://mockapi.com/boleto/${barcodeNumber}.pdf`,
```

**Implementação Necessária:**
- Gateway real (PagSeguro, Stripe, etc.)
- Validação de cartões real
- Geração real de boletos
- Webhooks de confirmação

---

## **📱 PÁGINAS COM DADOS SIMULADOS**

### **8. PÁGINA PRODUTO**
**Arquivo:** `apps/store/src/routes/produto/[slug]/+page.svelte`
**Status:** 🟡 Reviews e Q&A mock
**Dados Mock:**
- Avaliações simuladas
- Perguntas e respostas mock
- Variações de produtos simuladas

### **9. CARRINHO COMPARTILHADO**
**Arquivo:** `apps/store/src/routes/cart/shared/[id]/+page.svelte`
**Status:** 🔴 Produtos mockados
**Dados Mock:**
```typescript
const mockProducts = {
  'prod-1': { name: 'Kit Berço', price: 299.99 },
  'prod-2': { name: 'Lençol Infantil', price: 149.99 }
};
```

### **10. PÁGINA DEVOLUÇÕES**
**Arquivo:** `apps/store/src/routes/devolucoes/+page.svelte`
**Status:** 🟡 Items mock para formulário

### **11. PÁGINA SUPORTE**
**Arquivo:** `apps/store/src/routes/suporte/+page.svelte`
**Status:** 🟡 FAQ mock

---

## **🛠️ PLANO DE IMPLEMENTAÇÃO PRIORITÁRIO**

### **ALTA PRIORIDADE (1-2 semanas)**
1. **API Pagamentos** - Crítico para funcionamento
2. **API Notificações** - UX essencial
3. **Página Produto** - Reviews reais importantes

### **MÉDIA PRIORIDADE (2-4 semanas)**
4. **API Rastreamento** - Experiência pós-venda
5. **API Devoluções** - Processo de negócio
6. **Carrinho Compartilhado** - Funcionalidade social

### **BAIXA PRIORIDADE (1-2 meses)**
7. **API Suporte** - Pode usar sistema externo temporariamente
8. **API Chat** - Pode usar widget terceirizado inicialmente

---

## **💻 COMANDOS PARA IDENTIFICAR MOCKS**

### **Encontrar todos os mocks:**
```bash
grep -r "mock\|Mock" apps/store/src/routes/api/ | grep -v node_modules
```

### **Encontrar console.logs:**
```bash
grep -r "console\.log" apps/store/src/ | wc -l
```

### **Encontrar TODOs críticos:**
```bash
grep -r "TODO\|FIXME" apps/store/src/ | grep -i "critical\|important\|urgent"
```

---

## **📋 CHECKLIST DE REMOÇÃO**

### **Para cada API mock:**
- [ ] Analisar estrutura de dados necessária
- [ ] Criar/verificar tabelas no banco
- [ ] Implementar queries reais
- [ ] Testar cenários de erro
- [ ] Remover código mock
- [ ] Atualizar documentação

### **Para cada página com dados simulados:**
- [ ] Identificar fonte de dados real
- [ ] Implementar fetch de dados real
- [ ] Tratar estados de loading/erro
- [ ] Remover dados hardcoded
- [ ] Testar fluxo completo

---

## **🎯 OBJETIVO FINAL**

**Meta:** Zero dados mock em produção  
**Timeline:** 1-2 meses para implementação completa  
**Benefício:** Marketplace 100% funcional e confiável  

**Status Atual:** ~80% real, ~20% mock  
**Meta:** 100% real, 0% mock 