# Arquitetura de Componentes - Marketplace GDG

## Decisão Arquitetural: Estratégia de Componentes

**Data**: 27/11/2024  
**Decisão**: Adotar abordagem híbrida para organização de componentes

## 📋 Estratégia Definida

### 1. Componentes Compartilhados (`@mktplace/ui`)

Localização: `packages/ui/src/lib/`

**Critérios para componentes compartilhados:**
- Componentes verdadeiramente genéricos e reutilizáveis
- Sem lógica de negócio específica
- Usados em múltiplas aplicações
- Focados em UI/UX consistente

**Exemplos:**
```
packages/ui/src/lib/
├── Button.svelte       # Botões genéricos
├── Input.svelte        # Campos de formulário
├── Card.svelte         # Container genérico
├── Modal.svelte        # Modais reutilizáveis
├── Alert.svelte        # Mensagens de alerta
├── Spinner.svelte      # Indicadores de loading
├── Badge.svelte        # Tags e labels
└── Dropdown.svelte     # Menus dropdown
```

### 2. Componentes Específicos por Aplicação

**Store (`apps/store/src/lib/components/`)**
```
├── ProductCard.svelte      # Card otimizado para conversão
├── SearchBox.svelte        # Busca com sugestões de produtos
├── CartDrawer.svelte       # Carrinho lateral
├── CheckoutForm.svelte     # Formulário de checkout
├── ProductGallery.svelte   # Galeria de imagens do produto
└── Footer.svelte           # Footer específico da loja
```

**Admin Panel (`apps/admin-panel/src/lib/components/`)**
```
├── StatsCard.svelte        # Cards de métricas
├── DataTable.svelte        # Tabela administrativa
├── AdminProductCard.svelte # Card com ações admin
├── UserTable.svelte        # Gestão de usuários
└── OrdersChart.svelte      # Gráficos de pedidos
```

**Seller Panel (`apps/seller-panel/src/lib/components/`)**
```
├── ProductForm.svelte      # Formulário de produtos
├── SalesChart.svelte       # Gráficos de vendas
├── InventoryTable.svelte   # Gestão de estoque
├── SellerStats.svelte      # Métricas do vendedor
└── OrdersList.svelte       # Lista de pedidos
```

## 🎯 Benefícios desta Abordagem

1. **Flexibilidade**: Cada app pode ter componentes otimizados para seu contexto
2. **Manutenibilidade**: Componentes genéricos centralizados, específicos isolados
3. **Performance**: Cada app carrega apenas o que precisa
4. **Evolução independente**: Apps podem evoluir sem afetar outras

## 📐 Diretrizes de Desenvolvimento

### Quando criar um componente em `@mktplace/ui`:
- [ ] É usado em 2 ou mais aplicações?
- [ ] É puramente visual/presentacional?
- [ ] Não contém lógica de negócio específica?
- [ ] Pode ser facilmente parametrizado via props?

Se respondeu SIM para todas, crie em `@mktplace/ui`.

### Quando manter específico na app:
- [ ] Contém lógica de negócio específica?
- [ ] Tem comportamento único para aquela app?
- [ ] Integra com stores/services específicos?
- [ ] Layout/design muito específico do contexto?

Se respondeu SIM para qualquer uma, mantenha na app.

## 🔄 Processo de Migração

Se um componente específico se tornar genérico:

1. Identifique partes reutilizáveis
2. Extraia lógica específica para props/slots
3. Crie versão genérica em `@mktplace/ui`
4. Refatore apps para usar o componente compartilhado
5. Mantenha retrocompatibilidade

## 📊 Status Atual

### Componentes em `@mktplace/ui`:
- ✅ Button.svelte
- ✅ Input.svelte
- ✅ Card.svelte
- 🔲 Modal.svelte (planejado)
- 🔲 Alert.svelte (planejado)
- 🔲 Spinner.svelte (planejado)

### Componentes específicos identificados:
- **Store**: ProductCard, SearchBox, Footer
- **Admin**: Nenhum ainda
- **Seller**: Nenhum ainda

## 🚀 Próximos Passos

1. Manter ProductCard.svelte específico na store
2. Criar componentes base necessários em @mktplace/ui
3. Desenvolver componentes específicos conforme necessidade
4. Revisar periodicamente para identificar oportunidades de generalização

---

**Nota**: Esta decisão pode ser revisada conforme o projeto evolui e padrões emergem. 