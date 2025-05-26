# Cartões

## Cartão padrão

```css
.card {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
```

## Partes do Cartão

### Cabeçalho do cartão
```css
.card-header {
  padding: 1rem;
  border-bottom: 1px solid var(--gray800);
}
```

### Corpo do cartão
```css
.card-body {
  padding: 1rem;
}
```

### Rodapé do cartão
```css
.card-footer {
  padding: 1rem;
  border-top: 1px solid var(--gray800);
}
```

## Variações

### Cartão com hover
```css
.card-hover {
  transition: transform 0.2s, box-shadow 0.2s;
}

.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### Cartão sem sombra
```css
.card-flat {
  box-shadow: none;
  border: 1px solid var(--gray800);
}
```

### Cartão com imagem
```css
.card-with-image {
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 160px;
  object-fit: cover;
}
```

## Exemplo de Uso

```html
<div class="card card-hover">
  <div class="card-header">
    <h3>Título do Cartão</h3>
  </div>
  <div class="card-body">
    <p>Conteúdo do cartão vai aqui.</p>
  </div>
  <div class="card-footer">
    <button class="btn btn-primary">Ação</button>
  </div>
</div>
```
