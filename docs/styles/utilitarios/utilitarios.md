# Utilitários

## Animações

### Transições suaves
```css
.transition {
  transition: all 0.3s ease;
}

.transition-fast {
  transition: all 0.15s ease;
}

.transition-slow {
  transition: all 0.5s ease;
}
```

### Animações de entrada/saída
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes slideInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideOutDown {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(20px);
    opacity: 0;
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease forwards;
}

.animate-fade-out {
  animation: fadeOut 0.3s ease forwards;
}

.animate-slide-in-up {
  animation: slideInUp 0.3s ease forwards;
}

.animate-slide-out-down {
  animation: slideOutDown 0.3s ease forwards;
}
```

## Responsividade

### Breakpoints
```css
/* Pequeno (sm) - 640px */
@media (min-width: 640px) { /* ... */ }

/* Médio (md) - 768px */
@media (min-width: 768px) { /* ... */ }

/* Grande (lg) - 1024px */
@media (min-width: 1024px) { /* ... */ }

/* Extra grande (xl) - 1280px */
@media (min-width: 1280px) { /* ... */ }

/* Extra extra grande (2xl) - 1536px */
@media (min-width: 1536px) { /* ... */ }
```

### Classes utilitárias para responsividade
```css
/* Ocultar elementos */
.hidden { display: none; }

/* Visível apenas em telas pequenas */
.sm\:hidden { display: none; }

/* Visível apenas em telas médias */
.md\:hidden { display: none; }

/* Visível apenas em telas grandes */
.lg\:hidden { display: none; }

/* Exemplo de uso no HTML:
   <div class="hidden md:block">Visível apenas em telas médias para cima</div>
*/

/* Container responsivo */
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .container {
    max-width: 640px;
  }
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
  }
}

@media (min-width: 1280px) {
  .container {
    max-width: 1280px;
  }
}
```

## Acessibilidade

### Esconder conteúdo visualmente
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Exemplo de uso:
   <button>
     <span class="sr-only">Fechar menu</span>
     <i class="icon-close"></i>
   </button>
*/
```

### Foco visível
```css
.focus-visible:focus {
  outline: 2px solid var(--cyan500);
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(0, 191, 179, 0.5);
}

/* Aplicar a todos os elementos interativos */
a:focus,
button:focus,
input:focus,
select:focus,
textarea:focus,
[tabindex="0"]:focus {
  @extend .focus-visible;
}
```

### Alto contraste
```css
@media (prefers-contrast: more) {
  * {
    color: black !important;
    background-color: white !important;
    text-shadow: none !important;
  }
  
  a {
    text-decoration: underline !important;
  }
  
  button,
  input,
  select,
  textarea {
    border: 2px solid black !important;
  }
}
```

## Helpers

### Limpar floats
```css
.clearfix::after {
  content: "";
  display: table;
  clear: both;
}
```

### Texto truncado
```css
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Número de linhas */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

### Posicionamento
```css
.absolute-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.absolute-center-x {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.absolute-center-y {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}
```

### Cursor
```css
.cursor-pointer {
  cursor: pointer;
}

.cursor-not-allowed {
  cursor: not-allowed;
  opacity: 0.6;
}

.cursor-move {
  cursor: move;
}

.cursor-text {
  cursor: text;
}

.cursor-wait {
  cursor: wait;
}
```

### Seleção de texto
```css
.select-none {
  user-select: none;
}

.select-text {
  user-select: text;
}

.select-all {
  user-select: all;
}

/* Desabilitar seleção */
.no-select {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
```

### Visibilidade
```css
.visible {
  visibility: visible;
}

.invisible {
  visibility: hidden;
}

.opacity-0 {
  opacity: 0;
}

.opacity-25 {
  opacity: 0.25;
}

.opacity-50 {
  opacity: 0.5;
}

.opacity-75 {
  opacity: 0.75;
}

.opacity-100 {
  opacity: 1;
}
```
