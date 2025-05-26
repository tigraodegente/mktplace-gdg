# Layout e Grid

## Containers

### Container principal
```css
.container {
  width: 100%;
  max-width: 1360px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .container {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 768px) {
  .container {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}
```

## Grid System

### Grid de 12 colunas
```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1.5rem;
}
```

### Grid responsivo para produtos
```css
.product-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1.5rem;
}

@media (min-width: 640px) {
  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .product-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
```

## Espaçamento

```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

## Flexbox Helpers

### Flex row
```css
.flex-row {
  display: flex;
  flex-direction: row;
}
```

### Flex column
```css
.flex-col {
  display: flex;
  flex-direction: column;
}
```

### Centralizar conteúdo
```css
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Espaço entre itens
```css
.flex-between {
  display: flex;
  justify-content: space-between;
}
```
