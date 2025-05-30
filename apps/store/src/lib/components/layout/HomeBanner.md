# HomeBanner Component

Componente de banner principal para a home page com carrossel de imagens seguindo os padrões do projeto.

## Características

- **Dimensões responsivas**: 767x767px no mobile, 1115x560px no desktop
- **Carrossel funcional** com auto-play, navegação por setas e indicadores
- **Suporte a touch/swipe** no mobile
- **Acessibilidade completa** com ARIA labels e navegação por teclado
- **Loading state** com spinner
- **TypeScript tipado** seguindo padrões do projeto

## Uso Básico

```svelte
<script>
  import HomeBanner from '$lib/components/layout/HomeBanner.svelte';
  
  const slides = [
    {
      id: '1',
      image: '/images/banner1.jpg',
      imageAlt: 'Descrição da imagem',
      title: 'Título do Banner',
      subtitle: 'Subtítulo explicativo',
      ctaText: 'BOTÃO CTA',
      ctaLink: '/destino',
      mobileImage: '/images/banner1-mobile.jpg' // Opcional
    }
    // ... mais slides
  ];
</script>

<HomeBanner {slides} />
```

## Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `slides` | `BannerSlide[]` | `[]` | Array de slides do banner |
| `autoPlay` | `boolean` | `true` | Auto-reprodução do carrossel |
| `autoPlayInterval` | `number` | `5000` | Intervalo em ms entre slides |
| `showIndicators` | `boolean` | `true` | Mostrar indicadores de slide |
| `showArrows` | `boolean` | `true` | Mostrar setas de navegação |
| `class` | `string` | `''` | Classes CSS adicionais |

## Interface BannerSlide

```typescript
interface BannerSlide {
  id: string;                    // ID único do slide
  image: string;                 // URL da imagem principal
  imageAlt: string;              // Texto alternativo da imagem
  title?: string;                // Título do slide (opcional)
  subtitle?: string;             // Subtítulo do slide (opcional)
  ctaText?: string;              // Texto do botão CTA (opcional)
  ctaLink?: string;              // Link do botão CTA (opcional)
  mobileImage?: string;          // Imagem específica para mobile (opcional)
}
```

## Funcionalidades

### Auto-play
- Pausa automaticamente ao hover/touch
- Retoma após interação
- Configurable via `autoPlayInterval`

### Navegação
- **Setas**: Clique para navegar
- **Indicadores**: Clique para ir direto ao slide
- **Teclado**: ← → para navegar
- **Touch**: Swipe no mobile

### Responsividade
- Mobile: altura 767px (quadrado)
- Desktop: 1115x560px (retangular)
- Imagens diferentes por breakpoint (opcional)

## Exemplo Completo

```svelte
<HomeBanner 
  slides={bannerSlides}
  autoPlay={true}
  autoPlayInterval={4000}
  showIndicators={true}
  showArrows={true}
  class="mb-8 shadow-lg"
/>
```

## Integração com APIs

Para carregar slides dinamicamente:

```svelte
<script>
  import { onMount } from 'svelte';
  
  let slides = $state([]);
  
  onMount(async () => {
    const response = await fetch('/api/banners');
    const data = await response.json();
    slides = data.slides;
  });
</script>

<HomeBanner {slides} />
```

## Otimizações Implementadas

- **Lazy loading** para imagens não visíveis
- **Eager loading** para primeiro slide
- **Preconnect** para domínios de imagem
- **Loading state** com spinner
- **Error handling** gracioso 