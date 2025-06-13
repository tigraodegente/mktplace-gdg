# 🧪 Guia de Validação do Cart Store

## 🚀 Novo Store Ativado

O novo cart store está **ATIVO** para validação. Você verá o indicador: 
```
🆕 NEW v2.0 (Testing Mode)
```

## 🔍 Validação Automática

Abra o console do navegador (`F12`) e aguarde 3 segundos. Você verá:

```
🧪 VALIDAÇÃO COMPLETA DO CART STORE
📝 Testando operações básicas...
👥 Testando agrupamento por seller...
💰 Testando cálculos de totais...
💾 Testando persistência...
🎫 Testando sistema de cupons...
🧩 Testando casos extremos...

📊 RESUMO DOS TESTES:
✅ Aprovados: X/Y (Z%)
🎉 TODOS OS TESTES PASSARAM!
```

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