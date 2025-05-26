# Header

## Cabeçalho Principal

```css
.header {
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 4rem;
  padding: 0 1.5rem;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: var(--font-bold);
  color: var(--text-color);
}

.logo img {
  height: 2rem;
  margin-right: 0.75rem;
}

/* Navegação */
.nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-link {
  color: var(--gray600);
  text-decoration: none;
  font-weight: var(--font-medium);
  padding: 0.5rem 0;
  position: relative;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--cyan500);
}

.nav-link.active {
  color: var(--cyan500);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--cyan500);
}

/* Ícones de ação */
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.action-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  color: var(--gray600);
  transition: background-color 0.2s, color 0.2s;
  cursor: pointer;
}

.action-icon:hover {
  background-color: var(--gray50);
  color: var(--cyan500);
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  background-color: var(--cyan500);
  color: white;
  font-size: 0.625rem;
  font-weight: var(--font-bold);
  border-radius: 0.625rem;
  border: 2px solid white;
}

/* Menu mobile */
.mobile-menu-button {
  display: none;
  background: none;
  border: none;
  color: var(--gray600);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
}

/* Responsivo */
@media (max-width: 1024px) {
  .mobile-menu-button {
    display: block;
  }
  
  .nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: white;
    flex-direction: column;
    padding: 1rem 0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  .nav.active {
    display: flex;
  }
  
  .nav-link {
    padding: 0.75rem 1.5rem;
    width: 100%;
  }
  
  .nav-link.active::after {
    display: none;
  }
}
```

## Exemplo de Uso

```html
<header class="header">
  <div class="container">
    <div class="header-container">
      <!-- Logo -->
      <a href="/" class="logo">
        <img src="/logo.svg" alt="Logo">
        Marketplace
      </a>
      
      <!-- Menu Mobile -->
      <button class="mobile-menu-button" id="mobileMenuButton">
        ☰
      </button>
      
      <!-- Navegação -->
      <nav class="nav" id="mainNav">
        <a href="/produtos" class="nav-link active">Produtos</a>
        <a href="/categorias" class="nav-link">Categorias</a>
        <a href="/sobre" class="nav-link">Sobre</a>
        <a href="/contato" class="nav-link">Contato</a>
      </nav>
      
      <!-- Ações -->
      <div class="header-actions">
        <button class="action-icon" aria-label="Buscar">
          <i class="icon-search"></i>
        </button>
        <button class="action-icon" aria-label="Favoritos">
          <i class="icon-heart"></i>
          <span class="badge">3</span>
        </button>
        <button class="action-icon" aria-label="Carrinho">
          <i class="icon-shopping-cart"></i>
          <span class="badge">5</span>
        </button>
        <button class="action-icon" aria-label="Conta">
          <i class="icon-user"></i>
        </button>
      </div>
    </div>
  </div>
</header>

<script>
  // Toggle menu mobile
  const mobileMenuButton = document.getElementById('mobileMenuButton');
  const mainNav = document.getElementById('mainNav');
  
  mobileMenuButton.addEventListener('click', () => {
    mainNav.classList.toggle('active');
  });
</script>
```
