# Navegação

## Menu Principal

### Menu horizontal
```css
.main-menu {
  display: flex;
  gap: 1.5rem;
}

.main-menu-item {
  font-weight: var(--font-medium);
  color: white;
  transition: color 0.2s;
  text-decoration: none;
  padding: 0.5rem 0;
  position: relative;
}

.main-menu-item:hover {
  color: var(--cyan500);
}

/* Indicador de item ativo */
.main-menu-item.active {
  color: var(--cyan500);
}

.main-menu-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--cyan500);
}
```

## Dropdown

### Dropdown básico
```css
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-toggle {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 50;
  min-width: 200px;
  margin-top: 0.5rem;
  background-color: white;
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
}

.dropdown-menu.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  text-align: left;
  color: var(--gray600);
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s;
}

.dropdown-item:hover {
  background-color: var(--gray50);
  color: var(--cyan500);
}

.dropdown-divider {
  height: 1px;
  background-color: var(--gray800);
  margin: 0.25rem 0;
}
```

## Breadcrumbs

### Navegação por migalhas
```css
.breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: var(--text-sm);
  color: var(--gray400);
}

.breadcrumb-item {
  display: flex;
  align-items: center;
}

.breadcrumb-item a {
  color: var(--gray400);
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb-item a:hover {
  color: var(--cyan500);
}

.breadcrumb-separator {
  margin: 0 0.5rem;
  color: var(--gray300);
}

.breadcrumb-item:last-child .breadcrumb-separator {
  display: none;
}

.breadcrumb-item.active {
  color: var(--gray600);
  font-weight: var(--font-medium);
}
```

## Paginação

### Navegação por páginas
```css
.pagination {
  display: flex;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.page-item {
  display: flex;
}

.page-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.375rem;
  color: var(--gray600);
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s;
}

.page-link:hover {
  background-color: var(--gray50);
  color: var(--cyan500);
}

.page-item.active .page-link {
  background-color: var(--cyan500);
  color: white;
  font-weight: var(--font-medium);
}

.page-item.disabled .page-link {
  color: var(--gray300);
  pointer-events: none;
  cursor: not-allowed;
}
```
