# Espaçamento - Referência Tailwind

## Padding

### Padding em Todas as Direções

```css
.p-0       /* padding: 0 */
.p-px      /* padding: 1px */
.p-0.5     /* padding: 0.125rem */
.p-1       /* padding: 0.25rem */
.p-1.5     /* padding: 0.375rem */
.p-2       /* padding: 0.5rem */
.p-2.5     /* padding: 0.625rem */
.p-3       /* padding: 0.75rem */
.p-3.5     /* padding: 0.875rem */
.p-4       /* padding: 1rem */
.p-5       /* padding: 1.25rem */
.p-6       /* padding: 1.5rem */
.p-7       /* padding: 1.75rem */
.p-8       /* padding: 2rem */
.p-9       /* padding: 2.25rem */
.p-10      /* padding: 2.5rem */
.p-11      /* padding: 2.75rem */
.p-12      /* padding: 3rem */
.p-14      /* padding: 3.5rem */
.p-16      /* padding: 4rem */
.p-20      /* padding: 5rem */
.p-24      /* padding: 6rem */
.p-28      /* padding: 7rem */
.p-32      /* padding: 8rem */
.p-36      /* padding: 9rem */
.p-40      /* padding: 10rem */
.p-44      /* padding: 11rem */
.p-48      /* padding: 12rem */
.p-52      /* padding: 13rem */
.p-56      /* padding: 14rem */
.p-60      /* padding: 15rem */
.p-64      /* padding: 16rem */
.p-72      /* padding: 18rem */
.p-80      /* padding: 20rem */
.p-96      /* padding: 24rem */
```

### Padding Horizontal e Vertical

```css
.px-0      /* padding-left: 0; padding-right: 0 */
.py-0      /* padding-top: 0; padding-bottom: 0 */
.px-1      /* padding-left: 0.25rem; padding-right: 0.25rem */
.py-1      /* padding-top: 0.25rem; padding-bottom: 0.25rem */
/* ... e assim por diante com os mesmos valores de p-* ... */
```

### Padding Individual por Lado

```css
.pt-0      /* padding-top: 0 */
.pr-0      /* padding-right: 0 */
.pb-0      /* padding-bottom: 0 */
.pl-0      /* padding-left: 0 */
.pt-1      /* padding-top: 0.25rem */
.pr-1      /* padding-right: 0.25rem */
.pb-1      /* padding-bottom: 0.25rem */
.pl-1      /* padding-left: 0.25rem */
/* ... e assim por diante com os mesmos valores de p-* ... */
```

## Margin

### Margin em Todas as Direções

```css
.m-0       /* margin: 0 */
.m-px      /* margin: 1px */
.m-0.5     /* margin: 0.125rem */
.m-1       /* margin: 0.25rem */
/* ... seguindo o mesmo padrão de p-* até m-96 ... */
```

### Margin Horizontal e Vertical

```css
.mx-0      /* margin-left: 0; margin-right: 0 */
.my-0      /* margin-top: 0; margin-bottom: 0 */
.mx-1      /* margin-left: 0.25rem; margin-right: 0.25rem */
.my-1      /* margin-top: 0.25rem; margin-bottom: 0.25rem */
/* ... e assim por diante com os mesmos valores de m-* ... */
```

### Margin Individual por Lado

```css
.mt-0      /* margin-top: 0 */
.mr-0      /* margin-right: 0 */
.mb-0      /* margin-bottom: 0 */
.ml-0      /* margin-left: 0 */
.mt-1      /* margin-top: 0.25rem */
.mr-1      /* margin-right: 0.25rem */
.mb-1      /* margin-bottom: 0.25rem */
.ml-1      /* margin-left: 0.25rem */
/* ... e assim por diante com os mesmos valores de m-* ... */
```

### Margin Negativa

```css
.-m-1      /* margin: -0.25rem */
.-mx-1     /* margin-left: -0.25rem; margin-right: -0.25rem */
.-my-1     /* margin-top: -0.25rem; margin-bottom: -0.25rem */
.-mt-1     /* margin-top: -0.25rem */
.-mr-1     /* margin-right: -0.25rem */
.-mb-1     /* margin-bottom: -0.25rem */
.-ml-1     /* margin-left: -0.25rem */
/* ... e assim por diante com os mesmos valores de m-* ... */
```

## Espaçamento entre Elementos

### Gap

```css
.gap-0     /* gap: 0 */
.gap-px    /* gap: 1px */
.gap-0.5   /* gap: 0.125rem */
.gap-1     /* gap: 0.25rem */
/* ... seguindo o mesmo padrão até gap-96 ... */
```

### Gap em Linha e Coluna

```css
.gap-x-0   /* column-gap: 0 */
.gap-y-0   /* row-gap: 0 */
.gap-x-1   /* column-gap: 0.25rem */
.gap-y-1   /* row-gap: 0.25rem */
/* ... e assim por diante com os mesmos valores de gap-* ... */
```

## Espaçamento entre Letras (Letter Spacing)

```css
.tracking-tighter   /* letter-spacing: -0.05em */
.tracking-tight    /* letter-spacing: -0.025em */
.tracking-normal   /* letter-spacing: 0 */
.tracking-wide     /* letter-spacing: 0.025em */
.tracking-wider    /* letter-spacing: 0.05em */
.tracking-widest   /* letter-spacing: 0.1em */
```

## Espaçamento entre Linhas (Line Height)

```css
.leading-none     /* line-height: 1 */
.leading-tight   /* line-height: 1.25 */
.leading-snug    /* line-height: 1.375 */
.leading-normal  /* line-height: 1.5 */
.leading-relaxed /* line-height: 1.625 */
.leading-loose   /* line-height: 2 */
```

## Espaçamento de Texto (Text Indent)

```css
.indent-0    /* text-indent: 0 */
.indent-px   /* text-indent: 1px */
.indent-0.5  /* text-indent: 0.125rem */
.indent-1    /* text-indent: 0.25rem */
/* ... seguindo o mesmo padrão até indent-96 ... */
```

## Exemplos Práticos

### Cartão com Espaçamento Interno

```html
<div class="p-6 bg-white rounded-lg shadow-md">
  <h2 class="text-xl font-semibold mb-4">Título do Cartão</h2>
  <p class="text-gray-600 mb-4">
    Conteúdo do cartão com espaçamento adequado para melhor legibilidade.
  </p>
  <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    Botão
  </button>
</div>
```

### Grade de Imagens com Espaçamento

```html
<div class="grid grid-cols-3 gap-4">
  <img src="imagem1.jpg" alt="" class="w-full h-32 object-cover rounded">
  <img src="imagem2.jpg" alt="" class="w-full h-32 object-cover rounded">
  <img src="imagem3.jpg" alt="" class="w-full h-32 object-cover rounded">
  <img src="imagem4.jpg" alt="" class="w-full h-32 object-cover rounded">
  <img src="imagem5.jpg" alt="" class="w-full h-32 object-cover rounded">
  <img src="imagem6.jpg" alt="" class="w-full h-32 object-cover rounded">
</div>
```

### Formulário com Espaçamento Adequado

```html
<form class="max-w-md mx-auto p-6 bg-gray-50 rounded-lg">
  <div class="mb-4">
    <label class="block text-gray-700 text-sm font-bold mb-2" for="nome">
      Nome
    </label>
    <input 
      id="nome" 
      type="text" 
      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
  </div>
  
  <div class="mb-6">
    <label class="block text-gray-700 text-sm font-bold mb-2" for="email">
      E-mail
    </label>
    <input 
      id="email" 
      type="email" 
      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
  </div>
  
  <div class="flex items-center justify-between">
    <button 
      type="button" 
      class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
    >
      Cancelar
    </button>
    <button 
      type="submit" 
      class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Enviar
    </button>
  </div>
</form>
```

### Layout de Grade com Espaçamento Responsivo

```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 p-4 md:p-6 lg:p-8">
  <!-- Item 1 -->
  <div class="p-4 bg-white rounded-lg shadow">
    <h3 class="text-lg font-medium mb-2">Item 1</h3>
    <p class="text-gray-600">Conteúdo do item 1</p>
  </div>
  
  <!-- Item 2 -->
  <div class="p-4 bg-white rounded-lg shadow">
    <h3 class="text-lg font-medium mb-2">Item 2</h3>
    <p class="text-gray-600">Conteúdo do item 2</p>
  </div>
  
  <!-- Item 3 -->
  <div class="p-4 bg-white rounded-lg shadow">
    <h3 class="text-lg font-medium mb-2">Item 3</h3>
    <p class="text-gray-600">Conteúdo do item 3</p>
  </div>
  
  <!-- Item 4 -->
  <div class="p-4 bg-white rounded-lg shadow">
    <h3 class="text-lg font-medium mb-2">Item 4</h3>
    <p class="text-gray-600">Conteúdo do item 4</p>
  </div>
</div>
```

## Personalização

Você pode personalizar os valores de espaçamento no arquivo `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      spacing: {
        '128': '32rem',
        '144': '36rem',
        // Adicione valores personalizados
      },
      margin: {
        // Personalize margens específicas
        '18': '4.5rem',
      },
      padding: {
        // Personalize paddings específicos
        '18': '4.5rem',
      },
      gap: {
        // Personalize gaps específicos
        '18': '4.5rem',
      },
      lineHeight: {
        // Personalize alturas de linha
        '11': '2.75rem',
        '12': '3rem',
      },
      letterSpacing: {
        // Personalize espaçamento entre letras
        'extra-wide': '.25em',
      },
      textIndent: {
        // Personalize recuo de texto
        '1/2': '50%',
        'full': '100%',
      },
    },
  },
}
```
