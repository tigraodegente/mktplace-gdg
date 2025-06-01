# CategorySection Component

Um componente avançado de navegação por categorias com carousel responsivo, scroll snap, e detecção automática de cards ativos.

## ✨ Características

### 🎯 Funcionalidades Principais
- **Navegação por tabs** com 5 categorias de produtos
- **Carousel responsivo** no desktop com setas de navegação
- **Scroll snap** no mobile para navegação card por card
- **Detecção automática** do card ativo durante scroll
- **Reset automático** do scroll ao trocar categoria
- **Progress slider** visual no desktop
- **Loading states** com skeleton animation
- **Suporte completo a teclado** (Arrow Left/Right)

### 📱 Comportamento Responsivo
- **Mobile (≤767px)**: Scroll snap horizontal + hover automático
- **Tablet (768px-1023px)**: Scroll livre + hover automático
- **Desktop (≥1024px)**: Carousel com setas + navegação manual

### ♿ Acessibilidade
- Navegação por teclado completa
- ARIA labels e roles apropriados
- Semântica HTML correta
- Suporte a screen readers
- Focus management adequado

## 🚀 Uso Básico

```svelte
<script>
  import CategorySection from '$lib/components/category/CategorySection.svelte';
</script>

<CategorySection />
```

## ⚙️ Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `title` | `string` | `'Compre por categoria'` | Título da seção |
| `class` | `string` | `''` | Classes CSS adicionais |

### Exemplo com Props Customizadas

```svelte
<CategorySection 
  title="Escolha sua categoria favorita"
  class="my-custom-class"
/>
```

## 🎨 Customização CSS

### CSS Custom Properties

O componente usa CSS Custom Properties para fácil customização:

```css
.category {
  /* Cores */
  --color-primary: #2A86A4;
  --color-primary-light: #DFF7FF;
  --color-secondary: #6EB0C6;
  
  /* Espaçamentos */
  --spacing-xs: 8px;
  --spacing-md: 16px;
  --spacing-xl: 24px;
  
  /* Tipografia */
  --font-family: 'Lato', sans-serif;
  --font-size-title-desktop: 36px;
  
  /* Transições */
  --transition-base: 300ms ease;
}
```

### Classes CSS Disponíveis

```css
/* Container principal */
.category
.category__container

/* Header */
.category__header
.category__title

/* Navegação de tabs */
.category__tabs
.category__tab
.category__tab--active

/* Cards */
.category__card
.category__card--active
.category__card-image
.category__card-body
.category__card-title
.category__card-description
.category__card-price
.category__card-button

/* Navegação */
.category__navigation
.category__nav-button
.category__slider
```

## 📊 Estados do Componente

### Estados Internos
- `activeTab`: Categoria ativa atual
- `currentItemIndex`: Índice do card ativo
- `isLoading`: Estado de carregamento
- `isTransitioning`: Estado de transição
- `isMobile`/`isTablet`: Estados de viewport

### Estados Visuais
- **Loading**: Skeleton animation nos cards
- **Active Card**: Card destacado com borda e elevação
- **Hover**: Efeito de elevação nos cards
- **Transitioning**: Proteção contra cliques durante animações

## 🔄 Eventos e Interações

### Desktop
- **Setas de navegação**: Navegação manual entre cards
- **Keyboard**: Arrow Left/Right para navegação
- **Progress slider**: Indicador visual da posição
- **Hover**: Efeitos visuais nos cards

### Mobile/Tablet
- **Scroll snap**: Navegação automática card por card
- **Intersection Observer**: Detecção automática do card ativo
- **Touch gestures**: Scroll horizontal suave
- **Reset automático**: Volta ao primeiro card ao trocar categoria

## 🛠️ Dados das Categorias

As categorias são carregadas do arquivo `categoryData.ts`:

```typescript
interface CategoryItem {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  slug: string;
}

interface CategoryGroup {
  id: string;
  name: string;
  items: CategoryItem[];
}
```

### Categorias Disponíveis
1. **Enxoval e acessórios** - 8 produtos
2. **Móveis** - 8 produtos  
3. **Combos** - 8 produtos
4. **Infantil** - 8 produtos
5. **Moda** - 8 produtos

## ⚡ Performance

### Otimizações Implementadas
- **Lazy loading**: Imagens carregadas conforme necessário
- **Intersection Observer**: Detecção eficiente de visibilidade
- **Debounced resize**: Evita cálculos excessivos
- **Will-change**: Otimização GPU para animações
- **Transform**: Animações otimizadas para performance

### Loading Strategy
- **Primeiros 4 cards**: `loading="eager"`
- **Cards restantes**: `loading="lazy"`
- **Skeleton animation**: Feedback visual durante carregamento

## 🔧 Configuração Técnica

### Breakpoints
```typescript
const BREAKPOINTS = {
  mobile: 768,    // ≤767px
  tablet: 1024,   // 768px-1023px  
  desktop: 1440   // ≥1024px
};
```

### Configuração do Carousel
```typescript
const SLIDER_CONFIG = {
  thumbPercentage: 12.5,      // 1/8 dos produtos
  transitionDuration: '0.3s'  // Duração das transições
};
```

### Intersection Observer
```typescript
// Threshold de 60% para detecção de card ativo
intersectionObserver = new IntersectionObserver(
  (entries) => {
    // Atualiza currentItemIndex automaticamente
  },
  { threshold: [0.6] }
);
```

## 🧪 Debugging

### Estados Úteis para Debug
```javascript
// No console do navegador
console.log({
  activeTab,
  currentItemIndex,
  isMobile,
  isTablet,
  isLoading,
  isTransitioning
});
```

### Logs Automáticos
O componente não possui logs por padrão para produção, mas pode ser facilmente adicionado para debugging.

## 📝 Changelog

### v2.0.0 (Refatoração Completa)
- ✅ Refatoração completa seguindo padrões do projeto
- ✅ CSS Custom Properties organizadas
- ✅ TypeScript com interfaces melhoradas
- ✅ Responsividade granular
- ✅ Acessibilidade completa
- ✅ Scroll snap no mobile
- ✅ Intersection Observer
- ✅ Reset automático do scroll
- ✅ Correção do hover cortado
- ✅ Performance otimizada

## 🤝 Contribuição

Para modificar o componente:

1. **Dados**: Edite `categoryData.ts` para alterar categorias/produtos
2. **Estilos**: Use CSS Custom Properties para customização
3. **Comportamento**: Modifique funções específicas conforme necessário
4. **Responsividade**: Ajuste breakpoints se necessário

## 📋 Checklist de Qualidade

- ✅ TypeScript strict mode
- ✅ Acessibilidade WCAG 2.1
- ✅ Performance otimizada
- ✅ Responsivo em todos dispositivos
- ✅ Loading states
- ✅ Error handling
- ✅ Keyboard navigation
- ✅ Touch gestures
- ✅ Cross-browser compatible
- ✅ Documentação completa

---

**Componente finalizado e pronto para produção! 🎉** 