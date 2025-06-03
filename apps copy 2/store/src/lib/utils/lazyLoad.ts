export function lazyLoad(node: HTMLImageElement, options: {
  rootMargin?: string;
  threshold?: number;
} = {}) {
  if (!('IntersectionObserver' in window)) {
    // Fallback para browsers antigos
    const src = node.dataset.src;
    if (src) {
      node.src = src;
      node.removeAttribute('data-src');
    }
    return { destroy() {} };
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: options.rootMargin || '50px',
    threshold: options.threshold || 0.1
  });
  
  observer.observe(node);
  
  return {
    destroy() {
      observer.unobserve(node);
    }
  };
}

export function lazyLoadMultiple(selector: string = 'img[data-src]') {
  const images = document.querySelectorAll(selector);
  
  images.forEach(img => {
    lazyLoad(img as HTMLImageElement);
  });
}
