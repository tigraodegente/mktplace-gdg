# CategorySection Component

Componente completo de seção de categorias para o marketplace GDG, desenvolvido em SvelteKit 5 com TypeScript.

## ✨ Funcionalidades

### 🎯 **Core Features**
- **5 categorias** com 4 produtos cada (20 produtos no total)
- **Sistema de tabs** para navegação entre categorias
- **Grid responsivo** de produtos
- **Loading states** com skeleton animations
- **Slider visual** que indica categoria ativa/posição do scroll

### 📱 **Mobile Experience**
- **Scroll horizontal livre** nas tabs e produtos
- **Slider sincronizado** com posição do scroll
- **Touch-friendly** interface
- **Navegação por swipe** natural
- **Layout otimizado** para dispositivos móveis

### 💻 **Desktop Experience**
- **Grid layout** tradicional (2 cols → 4 cols)
- **Setas de navegação** entre categorias
- **Slider baseado na tab ativa**
- **Hover effects** nos cards e elementos
- **Layout centralizado** e responsivo

## 🎨 **Design System**

### **Cores Principais**
```css
--color-primary: #2A86A4        /* Azul principal */
--color-primary-light: #DFF7FF  /* Azul claro (fundo cards) */
--color-secondary: #6EB0C6      /* Azul slider */
```

### **Typography**
- **Font-family:** Lato
- **Títulos:** 17px, weight 700
- **Descrições:** 12px, weight 300
- **Preços:** 13px, weight 600/800

### **Spacing System**
```css
--spacing-xs: 8px    --spacing-lg: 20px
--spacing-sm: 12px   --spacing-xl: 24px
--spacing-md: 16px   --spacing-2xl: 32px
```

## 📋 **Estrutura dos Dados**

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

## 🔧 **Props do Componente**

```typescript
interface CategorySectionProps {
  title?: string;     // Padrão: "Compre por categoria"
  class?: string;     // Classes CSS adicionais
}
```

## 🎪 **Uso do Componente**

```svelte
<script>
  import CategorySection from '$lib/components/category/CategorySection.svelte';
</script>

<!-- Uso básico -->
<CategorySection />

<!-- Com título customizado -->
<CategorySection title="Nossas Categorias" />

<!-- Com classes adicionais -->
<CategorySection class="my-custom-class" />
```

## 🏗️ **Arquitetura Técnica**

### **Estado Reativo (Svelte 5)**
```javascript
let activeTab = $state('moveis');
let isLoading = $state(true);
let isMobile = $state(false);
let sliderPosition = $state(0);
let currentItems = $derived(/* categoria ativa */);
```

### **Slider Inteligente**
- **Mobile:** Posição baseada no scroll horizontal (`scrollLeft / scrollWidth`)
- **Desktop:** Posição baseada na tab ativa
- **Transições:** Rápida no mobile (0.1s), suave no desktop (0.3s)
- **Sincronização:** Real-time com eventos de scroll

### **Responsividade**
- **Mobile:** `< 768px` - Layout horizontal com scroll + slider sincronizado
- **Tablet:** `768px - 1023px` - Grid 2 colunas + slider por tab
- **Desktop:** `≥ 1024px` - Grid 4 colunas + navegação

### **Performance**
- **Lazy loading** de imagens
- **Skeleton loading** durante carregamento
- **CSS transitions** otimizadas
- **Scroll behavior** nativo do browser
- **Event listeners** com cleanup automático

## 🎯 **Funcionalidades Específicas**

### **Navegação**
1. **Clique nas tabs** - Troca categoria
2. **Setas (desktop)** - Navegação circular
3. **Scroll livre (mobile)** - Slider acompanha posição
4. **Resize detection** - Adapta comportamento automaticamente

### **Visual Feedback**
- **Hover effects** em cards e botões
- **Active states** em tabs
- **Loading animations** suaves
- **Smooth transitions** entre estados
- **Slider responsivo** seguindo interação

### **Acessibilidade**
- **ARIA roles** (tablist, tab)
- **aria-selected** para tabs ativas
- **Semantic HTML** estruturado
- **Keyboard navigation** suportada

## 🔄 **Estados do Componente**

### **Loading State**
```svelte
{#if isLoading}
  <!-- Skeleton cards com animação -->
{:else}
  <!-- Conteúdo real -->
{/if}
```

### **Responsive State**
```javascript
// Detecta mobile/desktop automaticamente
function checkMobile() {
  isMobile = window.innerWidth < 768;
  updateSliderPosition();
}
```

### **Slider Position**
```javascript
// Mobile: baseado no scroll
const scrollPercentage = scrollLeft / scrollWidth;

// Desktop: baseado na tab ativa  
const activeIndex = getActiveIndex();
```

## 🎨 **Customização CSS**

O componente usa **CSS Custom Properties** para fácil customização:

```css
.category-section {
  --color-primary: #yourcolor;
  --spacing-md: 20px;
  --radius-md: 16px;
}
```

## 📱 **Breakpoints**

| Dispositivo | Largura | Layout | Navegação | Slider |
|-------------|---------|---------|-----------|--------|
| Mobile | < 768px | Scroll horizontal | Swipe | Segue scroll |
| Tablet | 768px - 1023px | Grid 2 cols | Tabs + Setas | Por tab ativa |
| Desktop | ≥ 1024px | Grid 4 cols | Tabs + Setas | Por tab ativa |

## 🎛️ **Comportamento do Slider**

### **Mobile (< 768px)**
- **Posição:** Calculada em tempo real baseada no `scrollLeft`
- **Transição:** `0.1s ease` para fluidez
- **Sincronização:** Event listener no scroll das tabs
- **Algoritmo:** `scrollPercentage * availableSpace`

### **Desktop (≥ 768px)**
- **Posição:** Baseada no índice da tab ativa
- **Transição:** `0.3s ease` para suavidade
- **Sincronização:** Mudança de tab ativa
- **Algoritmo:** `(activeIndex / totalTabs) * availableSpace`

### **Configuração**
```javascript
const SLIDER_CONFIG = {
  thumbPercentage: 24.3,  // 260.259px / 1072px * 100
  transitionDuration: '0.3s'
};
```

## ✅ **Checklist de Qualidade**

- ✅ **TypeScript** completo com interfaces
- ✅ **Svelte 5** syntax ($state, $derived)
- ✅ **Responsivo** mobile-first
- ✅ **Acessível** com ARIA
- ✅ **Performante** com lazy loading
- ✅ **Slider inteligente** mobile/desktop
- ✅ **Event listeners** com cleanup
- ✅ **Testado** em diferentes dispositivos
- ✅ **Documentado** completamente
- ✅ **Manutenível** com CSS variables

## 🔧 **Configuração de Desenvolvimento**

### **Dependências**
- SvelteKit 5+
- TypeScript
- Tailwind CSS (para utilitários base)

### **Estrutura de Arquivos**
```
src/lib/components/category/
├── CategorySection.svelte  # Componente principal
├── categoryData.ts         # Dados mockados e tipos
└── README.md              # Esta documentação
```

### **🔧 Event Listeners e Cleanup**

```javascript
onMount(() => {
  // Detecta mobile/desktop
  checkMobile();
  
  // Listener para resize
  window.addEventListener('resize', handleResize);
  
  // Listener para scroll das tabs
  tabsContainer.addEventListener('scroll', handleTabsScroll);
  
  // Cleanup automático
  return () => {
    window.removeEventListener('resize', handleResize);
    tabsContainer.removeEventListener('scroll', handleTabsScroll);
  };
});
```

### **🎯 Algoritmo do Slider**

#### Mobile (Scroll-based)
```javascript
function updateSliderPosition() {
  const scrollLeft = tabsContainer.scrollLeft;
  const scrollWidth = tabsContainer.scrollWidth - tabsContainer.clientWidth;
  const scrollPercentage = scrollLeft / scrollWidth;
  const availablePercentage = 100 - SLIDER_CONFIG.thumbPercentage;
  sliderPosition = scrollPercentage * availablePercentage;
}
```

#### Desktop (Tab-based)
```javascript
function updateSliderPosition() {
  const activeIndex = getActiveIndex();
  const totalTabs = CATEGORY_GROUPS.length;
  const availablePercentage = 100 - SLIDER_CONFIG.thumbPercentage;
  sliderPosition = (activeIndex / (totalTabs - 1)) * availablePercentage;
}
```

---

**Status:** ✅ **Finalizado e Pronto para Produção**

Componente completo com slider inteligente que se adapta ao comportamento mobile/desktop, otimizado e seguindo todas as melhores práticas do ecossistema Svelte/TypeScript. 