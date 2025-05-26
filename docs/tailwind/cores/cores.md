# Cores - Referência Tailwind

## Cores de Texto

```css
.text-white        /* #FFFFFF */
.text-black        /* #000000 */
.text-black800     /* #312627 */
.text-gray300      /* #666666 */
.text-gray600      /* #323232 */
.text-cyan500      /* #00BFB3 */
.text-cyan600      /* #017F77 */
.text-cyan700      /* #2D8289 */
.text-pink300      /* #F17179 */
.text-red400       /* #ff4a4a */
.text-red800       /* #842029 */
.text-orange400    /* #e47004 */
```

## Cores de Fundo

```css
.bg-white          /* #FFFFFF */
.bg-black          /* #000000 */
.bg-gray50         /* #F4F4F4 */
.bg-gray150        /* #F6F6F6 */
.bg-cyan50         /* #EEFDFF */
.bg-cyan100        /* #DFF9F7 */
.bg-cyan500        /* #00BFB3 */
.bg-cyan600        /* #017F77 */
.bg-red50          /* #f8d7da */
.bg-red100         /* #f5c2c7 */
.bg-black-loading  /* rgba(0, 0, 0, 0.54) */
```

## Cores de Borda

```css
.border-gray800    /* rgba(0, 0, 0, 0.03) */
.border-gray850    /* rgba(0, 0, 0, 0.2) */
.border-cyan200    /* #B3ECE9 */
.border-cyan500    /* #00BFB3 */
.border-red100     /* #f5c2c7 */
```

## Opacidade

```css
.opacity-0         /* opacity: 0 */
.opacity-25        /* opacity: 0.25 */
.opacity-50        /* opacity: 0.5 */
.opacity-75        /* opacity: 0.75 */
.opacity-100       /* opacity: 1 */
```

## Uso com Hover, Focus e Outros Estados

```html
<!-- Exemplo de uso com hover -->
<button class="bg-cyan500 hover:bg-cyan600">
  Botão
</button>

<!-- Exemplo de uso com focus -->
<input class="border border-gray300 focus:border-cyan500">

<!-- Exemplo de uso com opacidade em hover -->
<div class="opacity-75 hover:opacity-100">
  Conteúdo que fica mais visível ao passar o mouse
</div>
```

## Personalização de Cores

Você pode estender ou modificar as cores padrão do Tailwind no arquivo `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        cyan: {
          50: '#EEFDFF',
          100: '#DFF9F7',
          200: '#B3ECE9',
          500: '#00BFB3',
          600: '#017F77',
          700: '#2D8289',
        },
        // Outras cores personalizadas
      }
    }
  }
}
```

## Dicas de Uso

1. **Consistência**: Use as cores do tema para manter a consistência visual
2. **Acessibilidade**: Garanta contraste adequado entre texto e fundo
3. **Semântica**: Use cores de forma semântica (ex: vermelho para erros, verde para sucesso)
4. **Responsividade**: Use variantes como `md:`, `lg:` para cores diferentes em diferentes tamanhos de tela
