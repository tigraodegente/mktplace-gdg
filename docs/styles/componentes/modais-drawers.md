# Modais e Drawers

## Modal

### Estrutura Básica
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, visibility 0.3s;
}

.modal-overlay.show {
  opacity: 1;
  visibility: visible;
}

.modal {
  background-color: white;
  border-radius: 0.5rem;
  width: 100%;
  max-width: 32rem;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  transform: translateY(20px);
  transition: transform 0.3s;
}

.modal-overlay.show .modal {
  transform: translateY(0);
}

/* Cabeçalho do modal */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--gray800);
}

.modal-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-color);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--gray400);
  cursor: pointer;
  padding: 0.25rem;
  margin-left: 0.5rem;
  line-height: 1;
}

/* Corpo do modal */
.modal-body {
  padding: 1.5rem;
}

/* Rodapé do modal */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--gray800);
}
```

### Tamanhos de Modal

#### Modal pequeno
```css
.modal-sm {
  max-width: 24rem;
}
```

#### Modal médio (padrão)
```css
.modal-md {
  max-width: 32rem;
}
```

#### Modal grande
```css
.modal-lg {
  max-width: 48rem;
}
```

## Drawer

### Drawer lateral
```css
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, visibility 0.3s;
}

.drawer-overlay.show {
  opacity: 1;
  visibility: visible;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 28rem;
  background-color: white;
  box-shadow: -4px 0 6px -1px rgba(0, 0, 0, 0.1), -2px 0 4px -1px rgba(0, 0, 0, 0.06);
  transform: translateX(100%);
  transition: transform 0.3s;
  display: flex;
  flex-direction: column;
  z-index: 1001;
}

.drawer-overlay.show .drawer {
  transform: translateX(0);
}

/* Cabeçalho do drawer */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--gray800);
}

.drawer-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-color);
  margin: 0;
}

.drawer-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--gray400);
  cursor: pointer;
  padding: 0.25rem;
  margin-left: 0.5rem;
  line-height: 1;
}

/* Corpo do drawer */
.drawer-body {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

/* Rodapé do drawer */
.drawer-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--gray800);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
```

### Posições do Drawer

#### Drawer à direita (padrão)
```css
.drawer-right {
  right: 0;
  left: auto;
  transform: translateX(100%);
}

.drawer-overlay.show .drawer-right {
  transform: translateX(0);
}
```

#### Drawer à esquerda
```css
.drawer-left {
  left: 0;
  right: auto;
  transform: translateX(-100%);
}

.drawer-overlay.show .drawer-left {
  transform: translateX(0);
}
```

#### Drawer na parte superior
```css
.drawer-top {
  top: 0;
  right: 0;
  left: 0;
  bottom: auto;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 90vh;
  transform: translateY(-100%);
}

.drawer-overlay.show .drawer-top {
  transform: translateY(0);
}
```

#### Drawer na parte inferior
```css
.drawer-bottom {
  top: auto;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 90vh;
  transform: translateY(100%);
}

.drawer-overlay.show .drawer-bottom {
  transform: translateY(0);
}
```
