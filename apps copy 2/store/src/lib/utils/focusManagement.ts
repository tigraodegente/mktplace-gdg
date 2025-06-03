// Focus Management para Acessibilidade (A11Y)

/**
 * Trap focus dentro de um elemento (para modais, menus, etc.)
 */
export function trapFocus(node: HTMLElement) {
  const focusableElements = getFocusableElements(node);
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift + Tab (indo para trás)
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        // Tab (indo para frente)
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    }
    
    // ESC para fechar modais
    if (e.key === 'Escape') {
      const closeButton = node.querySelector('[data-close]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    }
  }
  
  // Adicionar listener e focar primeiro elemento
  node.addEventListener('keydown', handleKeydown);
  firstElement?.focus();
  
  return {
    destroy() {
      node.removeEventListener('keydown', handleKeydown);
    }
  };
}

/**
 * Gerenciador de focus para SPAs - restaura focus após navegação
 */
export class FocusManager {
  private static instance: FocusManager;
  private focusStack: HTMLElement[] = [];
  private skipLinks: HTMLElement[] = [];
  
  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }
  
  /**
   * Salva o elemento com focus atual
   */
  saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
    }
  }
  
  /**
   * Restaura o último focus salvo
   */
  restoreFocus(): void {
    const lastFocused = this.focusStack.pop();
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
    } else {
      // Se não conseguir restaurar, foca no primeiro elemento focável
      this.focusMainContent();
    }
  }
  
  /**
   * Foca no conteúdo principal (main ou h1)
   */
  focusMainContent(): void {
    const mainElement = document.querySelector('main') as HTMLElement;
    const h1Element = document.querySelector('h1') as HTMLElement;
    const skipToMain = document.querySelector('#main-content') as HTMLElement;
    
    if (skipToMain) {
      skipToMain.focus();
    } else if (mainElement) {
      mainElement.setAttribute('tabindex', '-1');
      mainElement.focus();
    } else if (h1Element) {
      h1Element.setAttribute('tabindex', '-1');
      h1Element.focus();
    }
  }
  
  /**
   * Cria skip links para navegação
   */
  createSkipLinks(): void {
    if (this.skipLinks.length > 0) return; // Já criados
    
    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.className = 'skip-links';
    skipLinksContainer.setAttribute('aria-label', 'Links de navegação rápida');
    
    const skipLinks = [
      { href: '#main-content', text: 'Pular para o conteúdo principal' },
      { href: '#primary-navigation', text: 'Pular para a navegação' },
      { href: '#search', text: 'Pular para a busca' },
      { href: '#footer', text: 'Pular para o rodapé' }
    ];
    
    skipLinks.forEach(link => {
      const skipLink = document.createElement('a');
      skipLink.href = link.href;
      skipLink.textContent = link.text;
      skipLink.className = 'skip-link';
      
      skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.href) as HTMLElement;
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus();
        }
      });
      
      skipLinksContainer.appendChild(skipLink);
      this.skipLinks.push(skipLink);
    });
    
    document.body.insertBefore(skipLinksContainer, document.body.firstChild);
  }
  
  /**
   * Gerencia focus em listas (arrow keys)
   */
  handleListNavigation(list: HTMLElement, orientation: 'horizontal' | 'vertical' = 'vertical'): void {
    const items = Array.from(list.querySelectorAll('[role="option"], [role="menuitem"], [role="tab"], button, a')) as HTMLElement[];
    
    list.addEventListener('keydown', (e) => {
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      let nextIndex = currentIndex;
      
      switch (e.key) {
        case 'ArrowDown':
          if (orientation === 'vertical') {
            nextIndex = currentIndex + 1;
            e.preventDefault();
          }
          break;
          
        case 'ArrowUp':
          if (orientation === 'vertical') {
            nextIndex = currentIndex - 1;
            e.preventDefault();
          }
          break;
          
        case 'ArrowRight':
          if (orientation === 'horizontal') {
            nextIndex = currentIndex + 1;
            e.preventDefault();
          }
          break;
          
        case 'ArrowLeft':
          if (orientation === 'horizontal') {
            nextIndex = currentIndex - 1;
            e.preventDefault();
          }
          break;
          
        case 'Home':
          nextIndex = 0;
          e.preventDefault();
          break;
          
        case 'End':
          nextIndex = items.length - 1;
          e.preventDefault();
          break;
      }
      
      // Wrap around
      if (nextIndex < 0) nextIndex = items.length - 1;
      if (nextIndex >= items.length) nextIndex = 0;
      
      if (nextIndex !== currentIndex && items[nextIndex]) {
        items[nextIndex].focus();
      }
    });
  }
}

/**
 * Encontra todos os elementos focáveis em um container
 */
export function getFocusableElements(container: HTMLElement): NodeListOf<HTMLElement> {
  return container.querySelectorAll(`
    button:not([disabled]),
    [href]:not([disabled]),
    input:not([disabled]),
    select:not([disabled]),
    textarea:not([disabled]),
    [tabindex]:not([tabindex="-1"]):not([disabled]),
    details:not([disabled]),
    summary:not([disabled])
  `);
}

/**
 * Verifica se um elemento está visível para acessibilidade
 */
export function isVisible(element: HTMLElement): boolean {
  return !!(
    element.offsetWidth ||
    element.offsetHeight ||
    element.getClientRects().length
  ) && window.getComputedStyle(element).visibility !== 'hidden';
}

/**
 * Anuncia uma mensagem para screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remover após anúncio
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Hook para usar focus management em componentes Svelte
 */
export function useFocusManagement() {
  const manager = FocusManager.getInstance();
  
  return {
    saveFocus: () => manager.saveFocus(),
    restoreFocus: () => manager.restoreFocus(),
    focusMainContent: () => manager.focusMainContent(),
    createSkipLinks: () => manager.createSkipLinks(),
    announceToScreenReader: announceToScreenReader,
    trapFocus: trapFocus
  };
}

/**
 * Auto-inicializar focus management no load da página
 */
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const manager = FocusManager.getInstance();
    manager.createSkipLinks();
  });
  
  // Gerenciar focus em mudanças de rota (SPA)
  window.addEventListener('popstate', () => {
    const manager = FocusManager.getInstance();
    manager.focusMainContent();
  });
} 