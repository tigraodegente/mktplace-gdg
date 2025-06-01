# HomeBanner Component (Reorganizado)

Componente de banner principal reorganizado seguindo as melhores práticas do projeto, com estrutura limpa e alta manutenibilidade.

## 🚀 Melhorias Implementadas

### ✨ Estrutura de Código
- **Organização por seções**: Código dividido em seções claras (TYPES, PROPS, STATE, etc.)
- **CSS Custom Properties**: Design tokens centralizados para fácil manutenção
- **Comentários estruturados**: Seções bem documentadas para navegação rápida
- **Imports organizados**: Dependências claramente definidas

### 🎨 Design System
- **Variáveis CSS**: Cores, espaçamentos e transições padronizadas
- **Responsividade aprimorada**: Breakpoints intermediários para tablets
- **Acessibilidade**: ARIA labels e navegação por teclado
- **Performance**: Lazy loading e otimizações de rendering

## 📁 Estrutura do Código

```typescript
// =============================================================================
// TYPES - Interfaces TypeScript
// =============================================================================

// =============================================================================  
// PROPS - Propriedades do componente
// =============================================================================

// =============================================================================
// STATE - Estado reativo do Svelte 5
// =============================================================================

// =============================================================================
// VARIABLES - Variáveis não reativas
// =============================================================================

// =============================================================================
// DERIVED - Estados derivados
// =============================================================================

// =============================================================================
// FUNCTIONS - Funções do componente
// =============================================================================

// =============================================================================
// LIFECYCLE - Ciclo de vida do componente
// =============================================================================
```

## 🎨 CSS Custom Properties

### Cores
```css
--color-primary: #00BFB3
--color-background: #f0f0f0
--color-placeholder: #666
--color-indicator: #000
--color-loading-bg: white
--color-loading-border: #f3f3f3
```

### Espaçamentos
```css
--spacing-xs: 8px
--spacing-sm: 16px
--spacing-md: 20px
--spacing-lg: 24px
--spacing-xl: 32px
--spacing-2xl: 48px
```

### Dimensões
```css
--container-max-width: 1440px
--banner-max-width: 1200px
--banner-height-desktop: 640px
--banner-padding-top: 48px
```

### Transições
```css
--transition-fast: 300ms ease
--transition-slide: 700ms cubic-bezier(0.4, 0, 0.2, 1)
```

## 📱 Responsividade

### Mobile (até 767px)
- Aspect ratio: 1:1 (quadrado)
- Border radius: 0
- Min height: 300px
- Setas: ocultas

### Tablet Pequeno (768px - 899px)
- Aspect ratio: 4:3
- Border radius: 16px
- Min height: 400px
- Setas: visíveis dentro do banner

### Tablet Médio (900px - 1023px)
- Aspect ratio: 3:2
- Border radius: 24px
- Min height: 450px
- Setas: visíveis com mais espaço

### Desktop (1024px+)
- Dimensões fixas: 1200px × 640px
- Border radius: 32px
- Setas: posicionadas fora do banner
- Countdown: cantos inferiores curvados

## 🔧 Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `slides` | `BannerSlide[]` | `[...]` | Array de slides do banner |
| `autoPlay` | `boolean` | `true` | Auto-reprodução do carrossel |
| `autoPlayInterval` | `number` | `5000` | Intervalo em ms entre slides |
| `showIndicators` | `boolean` | `true` | Mostrar indicadores de slide |
| `showArrows` | `boolean` | `true` | Mostrar setas de navegação |
| `hasCountdown` | `boolean` | `false` | Banner integrado com countdown |
| `class` | `string` | `''` | Classes CSS adicionais |

## 📝 Interface BannerSlide

```typescript
interface BannerSlide {
  id: string;                    // ID único do slide
  image: string;                 // URL da imagem
  imageAlt: string;              // Texto alternativo
  mobileImage?: string;          // Imagem específica para mobile (opcional)
  link?: string;                 // Link de destino (opcional)
}
```

## 🚀 Uso Básico

```svelte
<script>
  import HomeBanner from '$lib/components/layout/HomeBanner.svelte';
  
  const slides = [
    {
      id: '1',
      image: '/images/banner1.jpg',
      imageAlt: 'Ofertas Especiais',
      link: '/promocoes'
    },
    {
      id: '2',
      image: '/images/banner2.jpg', 
      imageAlt: 'Novidades',
      link: '/novidades'
    }
  ];
</script>

<HomeBanner 
  {slides}
  autoPlay={true}
  autoPlayInterval={4000}
  showIndicators={true}
  showArrows={true}
  hasCountdown={false}
  class="custom-banner"
/>
```

## 🎯 Funcionalidades

### Auto-play Inteligente
- Pausa automaticamente ao hover/touch
- Retoma após interação
- Configurável via props

### Navegação Completa
- **Setas**: Clique para navegar
- **Indicadores**: Clique direto no slide
- **Teclado**: ← → para navegar
- **Touch**: Swipe no mobile

### Estados de Carregamento
- Loading spinner enquanto carrega
- Placeholders para imagens
- Estados de erro gracioso

### Performance
- Lazy loading para imagens não visíveis
- Eager loading para primeiro slide
- Preload de imagens adjacentes
- Will-change para otimização de GPU

## 🔧 Customização

### Personalizar Cores
```css
.custom-banner {
  --color-primary: #your-color;
  --color-background: #your-bg;
}
```

### Personalizar Espaçamentos
```css
.custom-banner {
  --spacing-sm: 20px;
  --spacing-lg: 30px;
}
```

### Personalizar Transições
```css
.custom-banner {
  --transition-slide: 500ms ease-in-out;
}
```

## 🧪 Integração com APIs

```svelte
<script>
  import { onMount } from 'svelte';
  
  let slides = $state([]);
  let isLoading = $state(true);
  
  onMount(async () => {
    try {
      const response = await fetch('/api/banners');
      const data = await response.json();
      slides = data.slides;
    } catch (error) {
      console.error('Erro ao carregar banners:', error);
    } finally {
      isLoading = false;
    }
  });
</script>

{#if isLoading}
  <div class="loading">Carregando banners...</div>
{:else}
  <HomeBanner {slides} />
{/if}
```

## ♿ Acessibilidade

- **ARIA Labels**: Botões e navegação devidamente rotulados
- **Aria Live**: Mudanças anunciadas para screen readers
- **Navegação por teclado**: Suporte completo
- **Foco visual**: Indicadores claros de foco
- **Semântica HTML**: Estrutura apropriada

## 🔧 Manutenção

### Adicionando Novos Breakpoints
1. Defina as variáveis CSS no `:root`
2. Adicione media queries na seção apropriada
3. Teste em dispositivos reais

### Modificando Transições
1. Ajuste `--transition-slide` para animações dos slides
2. Ajuste `--transition-fast` para elementos menores
3. Use `cubic-bezier()` para curvas customizadas

### Debugging
- Use DevTools para inspecionar CSS custom properties
- Console warnings para imagens com erro
- Estado loading visível durante desenvolvimento

## 📋 Checklist de Deploy

- [ ] Imagens otimizadas (WebP quando possível)
- [ ] Alt texts descritivos
- [ ] Links válidos
- [ ] Teste em dispositivos reais
- [ ] Validação de acessibilidade
- [ ] Performance verificada
- [ ] SEO otimizado 