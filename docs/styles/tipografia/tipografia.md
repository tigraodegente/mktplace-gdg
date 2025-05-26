# Tipografia

## Família de Fontes

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
```

## Tamanhos de Fonte

```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

## Pesos de Fonte

```css
--font-thin: 100;
--font-extralight: 200;
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
--font-black: 900;
```

## Estilos de Texto

### Títulos

#### H1 - Título principal
```css
h1, .h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  line-height: 1.2;
  color: var(--text-color);
  margin-bottom: 1rem;
}
```

#### H2 - Subtítulo
```css
h2, .h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: 1.3;
  color: var(--text-color);
  margin-bottom: 0.75rem;
}
```

#### H3 - Título de seção
```css
h3, .h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  line-height: 1.4;
  color: var(--text-color);
  margin-bottom: 0.5rem;
}
```

#### H4 - Subtítulo de seção
```css
h4, .h4 {
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  line-height: 1.4;
  color: var(--text-color);
  margin-bottom: 0.5rem;
}
```

### Texto de Corpo

#### Texto padrão
```css
p, .text {
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: 1.5;
  color: var(--gray300);
}
```

#### Texto pequeno
```css
.text-small {
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--gray300);
}
```

#### Texto muito pequeno
```css
.text-xs {
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--gray300);
}
```
