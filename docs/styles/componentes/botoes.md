# Botões

## Variantes de Botões

### Botão primário
```css
.btn-primary {
  background-color: var(--cyan500);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: var(--font-medium);
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: var(--cyan600);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Botão secundário
```css
.btn-secondary {
  background-color: var(--gray50);
  color: var(--gray300);
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: var(--font-medium);
  transition: background-color 0.2s;
}

.btn-secondary:hover {
  background-color: var(--gray150);
}
```

### Botão outline
```css
.btn-outline {
  background-color: transparent;
  color: var(--cyan500);
  border: 1px solid var(--cyan500);
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: var(--font-medium);
  transition: background-color 0.2s, color 0.2s;
}

.btn-outline:hover {
  background-color: var(--cyan50);
}
```

### Botão de texto
```css
.btn-text {
  background-color: transparent;
  color: var(--cyan500);
  padding: 0.5rem;
  font-weight: var(--font-medium);
  transition: color 0.2s;
}

.btn-text:hover {
  color: var(--cyan600);
  text-decoration: underline;
}
```

### Botão de perigo
```css
.btn-danger {
  background-color: var(--red400);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: var(--font-medium);
  transition: background-color 0.2s;
}

.btn-danger:hover {
  background-color: var(--red800);
}
```

## Tamanhos de Botões

### Botão pequeno
```css
.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: var(--text-sm);
}
```

### Botão médio (padrão)
```css
.btn-md {
  padding: 0.5rem 1rem;
  font-size: var(--text-base);
}
```

### Botão grande
```css
.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: var(--text-lg);
}
```
