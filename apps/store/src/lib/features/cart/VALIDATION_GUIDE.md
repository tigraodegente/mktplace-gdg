# 🧪 Guia de Validação do Cart Store

## 🚀 Novo Store Ativado

O novo cart store está **ATIVO** para validação. Você verá o indicador: 
```
🆕 NEW v2.0 (Testing Mode)
```

## 🔍 Validação Automática (✅ PRESERVA SEU CARRINHO)

**IMPORTANTE**: Os testes agora **PRESERVAM** seus produtos no carrinho!

Abra o console do navegador (`F12`) e aguarde 5 segundos. Você verá:

```
🧪 VALIDAÇÃO COMPLETA DO CART STORE
💾 Fazendo backup do carrinho do usuário...
🛒 Testando com carrinho atual do usuário...
🧹 Testando operações com carrinho limpo...
♻️ Restaurando carrinho do usuário...

📊 RESUMO DOS TESTES:
✅ Aprovados: X/Y (Z%)
🎉 TODOS OS TESTES PASSARAM!
💚 Carrinho do usuário foi preservado durante os testes.
```

## 📝 Teste Completo Recomendado

### ✅ **1. Teste Com Carrinho Vazio**
- [ ] Acesse `http://localhost:5173`
- [ ] Abra console (`F12`)
- [ ] Aguarde 5 segundos
- [ ] Verifique se todos os testes passam

### ✅ **2. Teste Com Carrinho Preenchido**
- [ ] **Adicione produtos**: Vá em produtos e adicione ao carrinho
- [ ] **Aguarde testes**: Os testes executarão automaticamente
- [ ] **Verifique preservação**: Seus produtos devem continuar no carrinho
- [ ] **Verifique console**: Deve mostrar testes com carrinho existente

### ✅ **3. Funcionalidades Durante Teste**
- [ ] **Adicionar produto**: Durante/após testes, adicione mais produtos
- [ ] **Alterar quantidade**: Teste modificar quantidades
- [ ] **Calcular frete**: Inserir CEP e verificar funcionamento
- [ ] **Aplicar cupom**: Teste cupons como `BEMVINDO10`

## 📊 O Que os Testes Validam

### 🛒 **Com Carrinho Existente**
- ✅ Estrutura dos dados preservada
- ✅ Cálculos corretos com produtos reais
- ✅ Adicionar produtos ao carrinho preenchido
- ✅ Todos os grupos de vendedores funcionando

### 🧹 **Com Carrinho Limpo**
- ✅ Operações básicas (add, remove, update)
- ✅ Agrupamento por vendedor
- ✅ Cálculos de totais
- ✅ Persistência em localStorage
- ✅ Sistema de cupons
- ✅ Casos extremos

### 💾 **Backup e Restauração**
- ✅ Backup automático antes dos testes
- ✅ Restauração completa após testes
- ✅ Produtos, quantidades e cupons preservados

## 🎯 Cenários de Teste Específicos

### **Cenário 1: Usuário Novo (Carrinho Vazio)**
```
1. Abrir site limpo
2. Console mostra: "Carrinho usuário vazio - OK"
3. Testes executam normalmente
4. Carrinho continua vazio
```

### **Cenário 2: Usuário Com Produtos**
```
1. Adicionar 2-3 produtos diferentes
2. Console mostra: "X grupos salvos"
3. Testes executam preservando dados
4. Console mostra: "X grupos restaurados"
5. Produtos continuam no carrinho
```

### **Cenário 3: Usuário Com Cupom Aplicado**
```
1. Adicionar produtos + aplicar cupom
2. Testes executam
3. Cupom é preservado e reaplicado
4. Desconto mantido após testes
```

## 🚨 Indicadores de Problema

### ❌ **Se Algo Estiver Errado**
- Console mostra testes falhando
- Produtos desaparecem do carrinho
- Cálculos incorretos
- Erros JavaScript no console

### ✅ **Se Tudo Estiver Certo**
- `Aprovados: X/Y (90%+)`
- `Carrinho do usuário foi preservado`
- Produtos continuam visíveis
- Site funciona normalmente

## 🔄 Rollback de Emergência

Se houver problemas críticos:

```typescript
// Editar: cartStore.bridge.ts
const USE_NEW_STORE = false; // Voltar para store antigo
```

## 📈 Timing dos Testes

- **0-5s**: Página carregando
- **5s**: Testes iniciam automaticamente
- **5-10s**: Execução dos testes
- **10s+**: Testes concluídos, site normal

---

**Status**: 🟢 TESTES PRESERVAM CARRINHO DO USUÁRIO  
**Próximo**: Validação completa → Refatoração estrutural

## 💡 Dicas de Validação

1. **Teste em abas diferentes**: Carrinho deve sincronizar
2. **Recarregue a página**: Dados devem persistir
3. **Adicione vários produtos**: Teste com cenários reais
4. **Use cupons reais**: Teste integração completa

## 📝 Checklist de Validação Manual

### ✅ 1. Navegação e Carregamento
- [ ] Site carrega normalmente
- [ ] Indicador "NEW v2.0" aparece no canto inferior direito
- [ ] Console mostra testes automáticos passando
- [ ] Nenhum erro de JavaScript no console

### ✅ 2. Funcionalidades do Carrinho
- [ ] **Adicionar produto**: Ir em qualquer produto → "Adicionar ao Carrinho"
- [ ] **Ver carrinho**: Clicar no ícone do carrinho no header
- [ ] **Alterar quantidade**: Na página do carrinho, usar +/- para alterar quantidade
- [ ] **Remover produto**: Clicar em "Remover" no carrinho
- [ ] **Múltiplos vendedores**: Adicionar produtos de vendedores diferentes

### ✅ 3. Cálculos e Totais
- [ ] **Subtotal**: Soma correta dos produtos
- [ ] **Agrupamento**: Produtos separados por vendedor
- [ ] **Totais por vendedor**: Cálculos corretos em cada grupo
- [ ] **Total geral**: Soma correta de todos os grupos

### ✅ 4. Persistência
- [ ] **Recarregar página**: Carrinho mantém produtos após reload
- [ ] **LocalStorage**: Verificar se dados estão salvos (F12 → Application → LocalStorage)
- [ ] **Múltiplas abas**: Carrinho sincronizado entre abas

### ✅ 5. Frete e Cupons
- [ ] **Calculadora de frete**: Inserir CEP e calcular frete
- [ ] **Seleção de frete**: Escolher diferentes opções de frete
- [ ] **Aplicar cupom**: Testar cupons como `BEMVINDO10`, `FRETEGRATIS`
- [ ] **Remover cupom**: Clicar em remover cupom aplicado

### ✅ 6. Checkout (Navegação)
- [ ] **Botão finalizar**: Clicar em "Finalizar Compra" 
- [ ] **Fluxo de checkout**: Seguir passos de autenticação/endereço/pagamento
- [ ] **Manter dados**: Dados do carrinho preservados durante checkout

## 🐛 Reportar Problemas

Se encontrar qualquer comportamento diferente:

1. **Abrir console** (`F12`)
2. **Reproduzir o problema**
3. **Copiar logs de erro**
4. **Anotar o que era esperado vs o que aconteceu**

## 🔄 Voltar para Store Antigo

Se necessário, alterar em `cartStore.bridge.ts`:
```typescript
const USE_NEW_STORE = false; // Voltar para implementação antiga
```

## 📊 Métricas de Sucesso

- ✅ **100% dos testes automáticos passando**
- ✅ **Todas as funcionalidades manuais funcionando**  
- ✅ **Nenhum erro no console**
- ✅ **Performance igual ou melhor**
- ✅ **Dados persistidos corretamente**

---

**Status**: 🟢 PRONTO PARA VALIDAÇÃO
**Próximo**: Após validação completa → Refatoração estrutural 