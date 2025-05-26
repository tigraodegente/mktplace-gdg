# Tipografia - Referência Tailwind

## Tamanho de Fonte

```css
.text-xs           /* 0.75rem (12px) */
.text-sm           /* 0.875rem (14px) */
.text-base         /* 1rem (16px) */
.text-lg           /* 1.125rem (18px) */
.text-xl           /* 1.25rem (20px) */
.text-2xl          /* 1.5rem (24px) */
.text-3xl          /* 1.875rem (30px) */
.text-4xl          /* 2.25rem (36px) */
.text-5xl          /* 3rem (48px) */
.text-6xl          /* 3.75rem (60px) */
.text-7xl          /* 4.5rem (72px) */
.text-8xl          /* 6rem (96px) */
.text-9xl          /* 8rem (128px) */
```

## Peso da Fonte

```css
.font-thin         /* font-weight: 100 */
.font-extralight   /* font-weight: 200 */
.font-light        /* font-weight: 300 */
.font-normal       /* font-weight: 400 */
.font-medium       /* font-weight: 500 */
.font-semibold     /* font-weight: 600 */
.font-bold         /* font-weight: 700 */
.font-extrabold    /* font-weight: 800 */
.font-black        /* font-weight: 900 */
```

## Estilo de Texto

### Transformação de Texto
```css
.uppercase         /* text-transform: uppercase */
.lowercase         /* text-transform: lowercase */
.capitalize        /* text-transform: capitalize */
.normal-case       /* text-transform: none */
```

### Decoração de Texto
```css
.underline         /* text-decoration: underline */
.line-through      /* text-decoration: line-through */
.no-underline      /* text-decoration: none */
```

### Alinhamento de Texto
```css
.text-left         /* text-align: left */
.text-center       /* text-align: center */
.text-right        /* text-align: right */
.text-justify      /* text-align: justify */
```

### Altura de Linha
```css
.leading-none       /* line-height: 1 */
.leading-tight     /* line-height: 1.25 */
.leading-snug      /* line-height: 1.375 */
.leading-normal    /* line-height: 1.5 */
.leading-relaxed   /* line-height: 1.625 */
.leading-loose     /* line-height: 2 */
```

### Espaçamento entre Letras
```css
.tracking-tighter  /* letter-spacing: -0.05em */
.tracking-tight   /* letter-spacing: -0.025em */
.tracking-normal  /* letter-spacing: 0 */
.tracking-wide    /* letter-spacing: 0.025em */
.tracking-wider   /* letter-spacing: 0.05em */
.tracking-widest  /* letter-spacing: 0.1em */
```

### Truncamento de Texto
```css
.truncate          /* overflow: hidden; text-overflow: ellipsis; white-space: nowrap */
.overflow-ellipsis /* text-overflow: ellipsis */
.overflow-clip     /* text-overflow: clip */
```

### Limitação de Linhas
```css
.line-clamp-1      /* display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden */
.line-clamp-2      /* ... -webkit-line-clamp: 2; ... */
.line-clamp-3      /* ... -webkit-line-clamp: 3; ... */
.line-clamp-4      /* ... -webkit-line-clamp: 4; ... */
.line-clamp-5      /* ... -webkit-line-clamp: 5; ... */
.line-clamp-6      /* ... -webkit-line-clamp: 6; ... */
.line-clamp-none   /* -webkit-line-clamp: unset */
```

## Exemplos de Uso

### Cabeçalhos
```html
<h1 class="text-4xl font-bold">Título Principal</h1>
<h2 class="text-3xl font-semibold">Subtítulo</h2>
<h3 class="text-2xl font-medium">Seção</h3>
```

### Parágrafos
```html
<p class="text-base leading-relaxed">
  Este é um parágrafo com espaçamento de linha confortável.
</p>

<p class="text-sm text-gray-600">
  Texto secundário em um tamanho menor.
</p>
```

### Listas
```html
<ul class="list-disc list-inside space-y-2">
  <li>Item da lista com marcador</li>
  <li>Outro item da lista</li>
</ul>

<ol class="list-decimal list-inside space-y-2">
  <li>Primeiro item</li>
  <li>Segundo item</li>
</ol>
```

### Citações
```html
<blockquote class="border-l-4 border-cyan-500 pl-4 italic">
  <p class="text-gray-700">
    Uma citação importante que merece destaque no conteúdo.
  </p>
  <footer class="text-sm text-gray-500 mt-2">— Autor da Citação</footer>
</blockquote>
```

### Código
```html
<pre class="bg-gray-100 p-4 rounded-md overflow-x-auto">
  <code class="text-sm font-mono text-gray-800">
    // Código de exemplo
    function helloWorld() {
      console.log('Olá, mundo!');
    }
  </code>
</pre>
```

## Personalização

Você pode personalizar as configurações de tipografia no arquivo `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        // ... outros tamanhos
      },
      lineHeight: {
        'tight': 1.25,
        'relaxed': 1.625,
        // ... outras alturas de linha
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        mono: ['Menlo', 'monospace'],
        // ... outras famílias de fonte
      },
    }
  }
}
```
