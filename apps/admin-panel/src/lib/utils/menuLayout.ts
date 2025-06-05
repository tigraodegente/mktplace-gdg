/**
 * Utilitário para controlar o layout do menu principal
 */
export function updateMainContentLayout(isMenuOpen: boolean, isMobile: boolean): void {
  const mainElement = document.querySelector('main');
  if (!mainElement) return;
  
  // Remove todas as classes relacionadas ao menu
  mainElement.classList.remove('main-content', 'menu-open', 'menu-closed');
  
  // Adiciona as classes apropriadas
  mainElement.classList.add('main-content');
  
  if (isMenuOpen && !isMobile) {
    mainElement.classList.add('menu-open');
  } else {
    mainElement.classList.add('menu-closed');
  }
}

/**
 * Observa mudanças na tela para ajustar o layout automaticamente
 */
export function setupLayoutObserver(callback: (isMobile: boolean) => void): () => void {
  let resizeTimeout: number | undefined;
  
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      const isMobile = window.innerWidth < 1024;
      callback(isMobile);
    }, 100);
  };
  
  window.addEventListener('resize', handleResize);
  
  // Cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    clearTimeout(resizeTimeout);
  };
} 