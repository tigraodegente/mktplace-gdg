# Layout - Referência Tailwind

## Display

```css
.block             /* display: block */
.inline-block      /* display: inline-block */
.inline            /* display: inline */
.flex              /* display: flex */
.inline-flex       /* display: inline-flex */
.grid             /* display: grid */
.inline-grid      /* display: inline-grid */
.table            /* display: table */
.table-row         /* display: table-row */
.table-cell        /* display: table-cell */
.hidden           /* display: none */
```

## Position

```css
.static           /* position: static */
.fixed            /* position: fixed */
.absolute         /* position: absolute */
.relative         /* position: relative */
.sticky           /* position: sticky */
```

## Top / Right / Bottom / Left

```css
.inset-0           /* top: 0; right: 0; bottom: 0; left: 0 */
.inset-x-0         /* left: 0; right: 0 */
.inset-y-0         /* top: 0; bottom: 0 */
.top-0             /* top: 0 */
.right-0           /* right: 0 */
.bottom-0          /* bottom: 0 */
.left-0            /* left: 0 */
```

## Z-Index

```css
.z-0              /* z-index: 0 */
.z-10             /* z-index: 10 */
.z-20             /* z-index: 20 */
.z-30             /* z-index: 30 */
.z-40             /* z-index: 40 */
.z-50             /* z-index: 50 */
.z-auto           /* z-index: auto */
```

## Visibility

```css
.visible          /* visibility: visible */
.invisible        /* visibility: hidden */
```

## Overflow

```css
.overflow-auto     /* overflow: auto */
.overflow-hidden   /* overflow: hidden */
.overflow-visible  /* overflow: visible */
.overflow-scroll   /* overflow: scroll */
.overflow-x-auto   /* overflow-x: auto */
.overflow-y-auto   /* overflow-y: auto */
.overflow-x-hidden /* overflow-x: hidden */
.overflow-y-hidden /* overflow-y: hidden */
```

## Object Fit

```css
.object-contain    /* object-fit: contain */
.object-cover      /* object-fit: cover */
.object-fill       /* object-fit: fill */
.object-none       /* object-fit: none */
.object-scale-down /* object-fit: scale-down */
```

## Object Position

```css
.object-bottom      /* object-position: bottom */
.object-center      /* object-position: center */
.object-left        /* object-position: left */
.object-left-bottom /* object-position: left bottom */
.object-left-top    /* object-position: left top */
.object-right       /* object-position: right */
.object-right-bottom /* object-position: right bottom */
.object-right-top    /* object-position: right top */
.object-top         /* object-position: top */
```

## Floats

```css
.float-right       /* float: right */
.float-left        /* float: left */
.float-none        /* float: none */
.clear-left        /* clear: left */
.clear-right       /* clear: right */
.clear-both        /* clear: both */
.clear-none        /* clear: none */
```

## Clear

```css
.clear-left        /* clear: left */
.clear-right       /* clear: right */
.clear-both        /* clear: both */
.clear-none        /* clear: none */
```

## Isolation

```css
.isolate           /* isolation: isolate */
.isolation-auto    /* isolation: auto */
```

## Object Position

```css
.object-bottom      /* object-position: bottom */
.object-center      /* object-position: center */
.object-left        /* object-position: left */
.object-left-bottom /* object-position: left bottom */
.object-left-top    /* object-position: left top */
.object-right       /* object-position: right */
.object-right-bottom /* object-position: right bottom */
.object-right-top    /* object-position: right top */
.object-top         /* object-position: top */
```

## Overscroll Behavior

```css
.overscroll-auto      /* overscroll-behavior: auto */
.overscroll-contain  /* overscroll-behavior: contain */
.overscroll-none     /* overscroll-behavior: none */
.overscroll-y-auto   /* overscroll-behavior-y: auto */
.overscroll-y-contain /* overscroll-behavior-y: contain */
.overscroll-y-none   /* overscroll-behavior-y: none */
.overscroll-x-auto   /* overscroll-behavior-x: auto */
.overscroll-x-contain /* overscroll-behavior-x: contain */
.overscroll-x-none   /* overscroll-behavior-x: none */
```

## Position Utilities

### Position Relative + Absolute Center

```html
<div class="relative h-64 bg-gray-100">
  <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
    <!-- Conteúdo centralizado -->
  </div>
</div>
```

### Sticky Header

```html
<header class="sticky top-0 z-50 bg-white shadow-md">
  <!-- Conteúdo do cabeçalho -->
</header>
```

### Full-Screen Overlay

```html
<div class="fixed inset-0 bg-black bg-opacity-50 z-40">
  <!-- Conteúdo do overlay -->
</div>
```

### Aspect Ratio

```html
<!-- Container 16:9 -->
<div class="aspect-w-16 aspect-h-9">
  <iframe src="..." class="w-full h-full"></iframe>
</div>

<!-- Container 1:1 -->
<div class="aspect-w-1 aspect-h-1">
  <img src="..." class="w-full h-full object-cover" />
</div>
```

## Container

O Tailwind inclui um componente de container que centraliza o conteúdo e define uma largura máxima para diferentes tamanhos de tela:

```html
<div class="container mx-auto px-4">
  <!-- Conteúdo centralizado com padding lateral responsivo -->
</div>
```

O container tem as seguintes larguras máximas por padrão:

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

Você pode personalizar essas configurações no arquivo `tailwind.config.js`:

```js
module.exports = {
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
}
```

## Box Sizing

```css
.box-border        /* box-sizing: border-box */
.box-content       /* box-sizing: content-box */
```

## Display

### Table Layout

```css
.table-auto        /* table-layout: auto */
.table-fixed       /* table-layout: fixed */
```

### Caption Side

```css
.caption-top       /* caption-side: top */
.caption-bottom    /* caption-side: bottom */
```

## Breakpoints

Tailwind usa prefixos de responsividade para aplicar estilos em diferentes tamanhos de tela:

```html
<!-- Exemplo de uso de breakpoints -->
<div class="w-full md:w-1/2 lg:w-1/3 xl:w-1/4">
  <!-- Ocupa largura total em mobile, metade em tablets, 1/3 em laptops e 1/4 em desktops grandes -->
</div>
```

Os breakpoints padrão são:

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Box Decoration Break

```css
.decoration-slice  /* box-decoration-break: slice */
.decoration-clone  /* box-decoration-break: clone */
```

## Box Shadow

```css
.shadow-sm         /* box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) */
.shadow            /* box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) */
.shadow-md         /* box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) */
.shadow-lg         /* box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) */
.shadow-xl         /* box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) */
.shadow-2xl        /* box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) */
.shadow-inner      /* box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06) */
.shadow-none       /* box-shadow: none */
```

## Mix Blend Mode

```css
.mix-blend-normal    /* mix-blend-mode: normal */
.mix-blend-multiply  /* mix-blend-mode: multiply */
.mix-blend-screen    /* mix-blend-mode: screen */
.mix-blend-overlay   /* mix-blend-mode: overlay */
.mix-blend-darken    /* mix-blend-mode: darken */
.mix-blend-lighten   /* mix-blend-mode: lighten */
.mix-blend-color-dodge /* mix-blend-mode: color-dodge */
.mix-blend-color-burn  /* mix-blend-mode: color-burn */
.mix-blend-hard-light  /* mix-blend-mode: hard-light */
.mix-blend-soft-light  /* mix-blend-mode: soft-light */
.mix-blend-difference  /* mix-blend-mode: difference */
.mix-blend-exclusion   /* mix-blend-mode: exclusion */
.mix-blend-hue         /* mix-blend-mode: hue */
.mix-blend-saturation  /* mix-blend-mode: saturation */
.mix-blend-color       /* mix-blend-mode: color */
.mix-blend-luminosity  /* mix-blend-mode: luminosity */
```

## Background Blend Mode

```css
.bg-blend-normal    /* background-blend-mode: normal */
.bg-blend-multiply  /* background-blend-mode: multiply */
.bg-blend-screen    /* background-blend-mode: screen */
.bg-blend-overlay   /* background-blend-mode: overlay */
.bg-blend-darken    /* background-blend-mode: darken */
.bg-blend-lighten   /* background-blend-mode: lighten */
.bg-blend-color-dodge /* background-blend-mode: color-dodge */
.bg-blend-color-burn  /* background-blend-mode: color-burn */
.bg-blend-hard-light  /* background-blend-mode: hard-light */
.bg-blend-soft-light  /* background-blend-mode: soft-light */
.bg-blend-difference  /* background-blend-mode: difference */
.bg-blend-exclusion   /* background-blend-mode: exclusion */
.bg-blend-hue         /* background-blend-mode: hue */
.bg-blend-saturation  /* background-blend-mode: saturation */
.bg-blend-color       /* background-blend-mode: color */
.bg-blend-luminosity  /* background-blend-mode: luminosity */
```
