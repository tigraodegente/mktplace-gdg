# Formulários

## Inputs

### Input padrão
```css
.input {
  appearance: none;
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--gray800);
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-size: var(--text-sm);
  line-height: 1.5;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.input:focus {
  outline: none;
  border-color: var(--cyan500);
  box-shadow: 0 0 0 3px rgba(0, 191, 179, 0.2);
}

.input::placeholder {
  color: var(--gray300);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Input com erro
```css
.input-error {
  border-color: var(--red400);
}

.input-error:focus {
  box-shadow: 0 0 0 3px rgba(255, 74, 74, 0.2);
}
```

## Labels e Mensagens

### Label
```css
.label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--gray600);
  margin-bottom: 0.25rem;
}
```

### Mensagem de erro
```css
.error-message {
  margin-top: 0.25rem;
  font-size: var(--text-sm);
  color: var(--red400);
}
```

### Texto de ajuda
```css
.help-text {
  margin-top: 0.25rem;
  font-size: var(--text-sm);
  color: var(--gray300);
}
```

## Checkboxes e Radios

### Checkbox
```css
.checkbox {
  height: 1rem;
  width: 1rem;
  color: var(--cyan500);
  border-radius: 0.25rem;
  border: 1px solid var(--gray800);
}

.checkbox:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 191, 179, 0.2);
}
```

### Radio
```css
.radio {
  height: 1rem;
  width: 1rem;
  color: var(--cyan500);
  border-radius: 50%;
  border: 1px solid var(--gray800);
}

.radio:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 191, 179, 0.2);
}
```

## Select

### Select padrão
```css
.select {
  appearance: none;
  display: block;
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 0.75rem;
  border: 1px solid var(--gray800);
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-size: var(--text-sm);
  line-height: 1.5;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
}

.select:focus {
  outline: none;
  border-color: var(--cyan500);
  box-shadow: 0 0 0 3px rgba(0, 191, 179, 0.2);
}
```
