# Flexbox e Grid - Referência Tailwind

## Flexbox

### Direção do Flex Container

```css
.flex-row           /* flex-direction: row */
.flex-row-reverse   /* flex-direction: row-reverse */
.flex-col           /* flex-direction: column */
.flex-col-reverse   /* flex-direction: column-reverse */
```

### Envolvimento de Itens (Wrap)

```css
.flex-wrap          /* flex-wrap: wrap */
.flex-wrap-reverse  /* flex-wrap: wrap-reverse */
.flex-nowrap        /* flex-wrap: nowrap */
```

### Alinhamento no Eixo Principal (Justify Content)

```css
.justify-start      /* justify-content: flex-start */
.justify-end        /* justify-content: flex-end */
.justify-center     /* justify-content: center */
.justify-between    /* justify-content: space-between */
.justify-around     /* justify-content: space-around */
.justify-evenly     /* justify-content: space-evenly */
```

### Alinhamento no Eixo Cruzado (Align Items)

```css
.items-start        /* align-items: flex-start */
.items-end          /* align-items: flex-end */
.items-center       /* align-items: center */
.items-baseline     /* align-items: baseline */
.items-stretch      /* align-items: stretch */
```

### Alinhamento de Conteúdo (Align Content)

```css
.content-start      /* align-content: flex-start */
.content-end        /* align-content: flex-end */
.content-center     /* align-content: center */
.content-between    /* align-content: space-between */
.content-around     /* align-content: space-around */
.content-evenly     /* align-content: space-evenly */
.content-baseline   /* align-content: baseline */
```

### Ordem dos Itens

```css
.order-1           /* order: 1 */
.order-2           /* order: 2 */
.order-3           /* order: 3 */
.order-4           /* order: 4 */
.order-5           /* order: 5 */
.order-6           /* order: 6 */
.order-7           /* order: 7 */
.order-8           /* order: 8 */
.order-9           /* order: 9 */
.order-10          /* order: 10 */
.order-11          /* order: 11 */
.order-12          /* order: 12 */
.order-first       /* order: -9999 */
.order-last        /* order: 9999 */
.order-none        /* order: 0 */
```

### Crescimento (Flex Grow)

```css
.flex-grow-0        /* flex-grow: 0 */
.flex-grow          /* flex-grow: 1 */
```

### Encolhimento (Flex Shrink)

```css
.flex-shrink-0      /* flex-shrink: 0 */
.flex-shrink        /* flex-shrink: 1 */
```

### Tamanho Flexível (Flex Basis)

```css
.basis-0            /* flex-basis: 0px */
.basis-1            /* flex-basis: 0.25rem */
.basis-2            /* flex-basis: 0.5rem */
/* ... até ... */
.basis-96           /* flex-basis: 24rem */
.basis-auto         /* flex-basis: auto */
.basis-px           /* flex-basis: 1px */
.basis-0.5          /* flex-basis: 0.125rem */
.basis-1.5          /* flex-basis: 0.375rem */
.basis-1/2          /* flex-basis: 50% */
.basis-1/3          /* flex-basis: 33.333333% */
.basis-2/3          /* flex-basis: 66.666667% */
.basis-1/4          /* flex-basis: 25% */
.basis-2/4          /* flex-basis: 50% */
.basis-3/4          /* flex-basis: 75% */
.basis-1/5          /* flex-basis: 20% */
.basis-2/5          /* flex-basis: 40% */
.basis-3/5          /* flex-basis: 60% */
.basis-4/5          /* flex-basis: 80% */
.basis-1/6          /* flex-basis: 16.666667% */
.basis-5/6          /* flex-basis: 83.333333% */
.basis-1/12         /* flex-basis: 8.333333% */
.basis-2/12         /* flex-basis: 16.666667% */
.basis-3/12         /* flex-basis: 25% */
.basis-4/12         /* flex-basis: 33.333333% */
.basis-5/12         /* flex-basis: 41.666667% */
.basis-6/12         /* flex-basis: 50% */
.basis-7/12         /* flex-basis: 58.333333% */
.basis-8/12         /* flex-basis: 66.666667% */
.basis-9/12         /* flex-basis: 75% */
.basis-10/12        /* flex-basis: 83.333333% */
.basis-11/12        /* flex-basis: 91.666667% */
.basis-full         /* flex-basis: 100% */
```

### Alinhamento Individual (Align Self)

```css
.self-auto         /* align-self: auto */
.self-start        /* align-self: flex-start */
.self-end          /* align-self: flex-end */
.self-center       /* align-self: center */
.self-stretch      /* align-self: stretch */
.self-baseline     /* align-self: baseline */
```

## Grid

### Grid Template Columns

```css
.grid-cols-1       /* grid-template-columns: repeat(1, minmax(0, 1fr)) */
.grid-cols-2       /* grid-template-columns: repeat(2, minmax(0, 1fr)) */
.grid-cols-3       /* grid-template-columns: repeat(3, minmax(0, 1fr)) */
/* ... até ... */
.grid-cols-12      /* grid-template-columns: repeat(12, minmax(0, 1fr)) */
```

### Grid Column Start / End

```css
.col-auto          /* grid-column: auto */
.col-span-1        /* grid-column: span 1 / span 1 */
.col-span-2        /* grid-column: span 2 / span 2 */
/* ... até ... */
.col-span-12       /* grid-column: span 12 / span 12 */
.col-span-full     /* grid-column: 1 / -1 */
.col-start-1       /* grid-column-start: 1 */
.col-start-2       /* grid-column-start: 2 */
/* ... até ... */
.col-start-13      /* grid-column-start: 13 */
.col-start-auto    /* grid-column-start: auto */
.col-end-1         /* grid-column-end: 1 */
.col-end-2         /* grid-column-end: 2 */
/* ... até ... */
.col-end-13        /* grid-column-end: 13 */
.col-end-auto      /* grid-column-end: auto */
```

### Grid Template Rows

```css
.grid-rows-1       /* grid-template-rows: repeat(1, minmax(0, 1fr)) */
.grid-rows-2       /* grid-template-rows: repeat(2, minmax(0, 1fr)) */
.grid-rows-3       /* grid-template-rows: repeat(3, minmax(0, 1fr)) */
.grid-rows-4       /* grid-template-rows: repeat(4, minmax(0, 1fr)) */
.grid-rows-5       /* grid-template-rows: repeat(5, minmax(0, 1fr)) */
.grid-rows-6       /* grid-template-rows: repeat(6, minmax(0, 1fr)) */
.grid-rows-none    /* grid-template-rows: none */
```

### Grid Row Start / End

```css
.row-auto          /* grid-row: auto */
.row-span-1        /* grid-row: span 1 / span 1 */
.row-span-2        /* grid-row: span 2 / span 2 */
/* ... até ... */
.row-span-6        /* grid-row: span 6 / span 6 */
.row-span-full     /* grid-row: 1 / -1 */
.row-start-1       /* grid-row-start: 1 */
.row-start-2       /* grid-row-start: 2 */
/* ... até ... */
.row-start-7       /* grid-row-start: 7 */
.row-start-auto    /* grid-row-start: auto */
.row-end-1         /* grid-row-end: 1 */
.row-end-2         /* grid-row-end: 2 */
/* ... até ... */
.row-end-7         /* grid-row-end: 7 */
.row-end-auto      /* grid-row-end: auto */
```

### Gap

```css
.gap-0             /* gap: 0 */
.gap-px            /* gap: 1px */
.gap-0.5           /* gap: 0.125rem */
.gap-1             /* gap: 0.25rem */
/* ... até ... */
.gap-96            /* gap: 24rem */
```

### Grid Auto Flow

```css
.grid-flow-row        /* grid-auto-flow: row */
.grid-flow-col        /* grid-auto-flow: column */
.grid-flow-row-dense  /* grid-auto-flow: row dense */
.grid-flow-col-dense  /* grid-auto-flow: column dense */
```

### Grid Auto Columns / Rows

```css
.auto-cols-auto     /* grid-auto-columns: auto */
.auto-cols-min      /* grid-auto-columns: min-content */
.auto-cols-max      /* grid-auto-columns: max-content */
.auto-cols-fr       /* grid-auto-columns: minmax(0, 1fr) */

.auto-rows-auto     /* grid-auto-rows: auto */
.auto-rows-min      /* grid-auto-rows: min-content */
.auto-rows-max      /* grid-auto-rows: max-content */
.auto-rows-fr       /* grid-auto-rows: minmax(0, 1fr) */
```

## Exemplos Práticos

### Layout de Cartões em Grid

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Cartão 1 -->
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-xl font-semibold mb-2">Título do Cartão</h3>
    <p class="text-gray-600">Conteúdo do cartão aqui.</p>
  </div>
  
  <!-- Cartão 2 -->
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-xl font-semibold mb-2">Outro Cartão</h3>
    <p class="text-gray-600">Mais conteúdo aqui.</p>
  </div>
  
  <!-- Mais cartões... -->
</div>
```

### Layout de Duas Colunas com Sidebar

```html
<div class="flex flex-col md:flex-row h-screen">
  <!-- Sidebar -->
  <div class="w-full md:w-64 bg-gray-800 text-white p-4">
    <h2 class="text-xl font-bold mb-4">Sidebar</h2>
    <!-- Conteúdo da sidebar -->
  </div>
  
  <!-- Conteúdo Principal -->
  <div class="flex-1 overflow-auto p-6">
    <h1 class="text-2xl font-bold mb-6">Conteúdo Principal</h1>
    <!-- Conteúdo principal aqui -->
  </div>
</div>
```

### Formulário em Grid

```html
<form class="max-w-2xl mx-auto">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="col-span-2">
      <label class="block text-sm font-medium text-gray-700">Nome Completo</label>
      <input type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700">E-mail</label>
      <input type="email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700">Telefone</label>
      <input type="tel" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
    </div>
    
    <div class="col-span-2">
      <label class="block text-sm font-medium text-gray-700">Mensagem</label>
      <textarea rows="4" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></textarea>
    </div>
    
    <div class="col-span-2">
      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
        Enviar Mensagem
      </button>
    </div>
  </div>
</form>
```

### Galeria de Imagens Responsiva

```html
<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-8">Galeria de Fotos</h1>
  
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
    <!-- Item 1 -->
    <div class="aspect-w-1 aspect-h-1">
      <img src="foto1.jpg" alt="Descrição da foto" class="w-full h-full object-cover rounded-lg">
    </div>
    
    <!-- Itens 2-10 -->
    <!-- ... -->
    
    <!-- Mais itens... -->
  </div>
</div>
```

## Personalização

Você pode personalizar as configurações de Flexbox e Grid no arquivo `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      flex: {
        '2': '2 2 0%',
        '3': '3 3 0%',
        // ...
      },
      gridTemplateColumns: {
        // Adicione configurações personalizadas de grid
        '16': 'repeat(16, minmax(0, 1fr))',
      },
      gridColumn: {
        'span-13': 'span 13 / span 13',
        'span-14': 'span 14 / span 14',
        // ...
      },
      gridRow: {
        'span-7': 'span 7 / span 7',
        'span-8': 'span 8 / span 8',
        // ...
      },
      gap: {
        '14': '3.5rem',
        '18': '4.5rem',
        // ...
      },
    }
  }
}
```
