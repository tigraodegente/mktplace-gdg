import type { BannerSlide } from '../types/banner';

export interface SmartBanner extends BannerSlide {
  countdownText?: string;
  countdownEndTime?: string;
  displayDurationMinutes?: number;
  autoRotate?: boolean;
  clicks?: number;
  isActive?: boolean;
  hasActiveCountdown?: boolean;
}

export interface SmartBannerState {
  currentBanner: SmartBanner | null;
  nextBanner: SmartBanner | null;
  timeUntilNext: number; // seconds
  countdownTimeLeft: number; // seconds
  isRotating: boolean;
  activeBanners: SmartBanner[]; // Lista completa de banners ativos
  currentIndex: number; // Índice atual no array de banners ativos
  totalActiveBanners: number; // Total de banners ativos
}

/**
 * Serviço inteligente de banners com contadores individuais
 * Gerencia rotação automática e contadores por banner
 */
class SmartBannerService {
  private static instance: SmartBannerService;
  private banners: SmartBanner[] = [];
  private currentIndex: number = 0;
  private rotationTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private autoRotationTimer: NodeJS.Timeout | null = null; // Timer para rotação automática
  private subscribers: Array<(state: SmartBannerState) => void> = [];
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  private readonly AUTO_ROTATION_INTERVAL = 5000; // 5 segundos

  static getInstance(): SmartBannerService {
    if (!SmartBannerService.instance) {
      SmartBannerService.instance = new SmartBannerService();
    }
    return SmartBannerService.instance;
  }

  /**
   * Carrega banners inteligentes da API
   */
  async loadBanners(): Promise<void> {
    try {
      const response = await fetch('/api/banners/smart?position=home');
      if (!response.ok) throw new Error('Erro ao carregar banners');
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      this.banners = result.data || [];
      this.currentIndex = 0;
      
      console.log('📦 loadBanners: totalLoaded =', this.banners.length);
      
      // Iniciar rotação automática
      this.startAutoRotation();
      
      // Iniciar timers
      this.startRotationTimer();
      this.startCountdownTimer();
      
      this.notifySubscribers();
    } catch (error) {
      console.error('Erro no SmartBannerService:', error);
      throw error;
    }
  }

  /**
   * Verifica se o banner tem countdown válido
   */
  private hasValidCountdown(banner: any): boolean {
    if (!banner.countdownEndTime || !banner.countdownText) {
      return false;
    }
    const endTime = new Date(banner.countdownEndTime);
    return endTime.getTime() > Date.now();
  }

  /**
   * Verifica se o banner deve estar ativo
   */
  private isBannerActive(banner: any): boolean {
    // A API já retorna apenas banners ativos no período correto
    return banner.isActive !== false;
  }

  /**
   * Inicia rotação automática dos banners
   */
  private startAutoRotation(): void {
    this.stopAutoRotation(); // Para qualquer rotação anterior
    
    const activeBanners = this.getActiveBanners();
    if (activeBanners.length <= 1) return; // Não roda se tem só 1 banner

    this.autoRotationTimer = setInterval(() => {
      this.goToNextBanner();
    }, this.AUTO_ROTATION_INTERVAL);
  }

  private stopAutoRotation(): void {
    if (this.autoRotationTimer) {
      clearInterval(this.autoRotationTimer);
      this.autoRotationTimer = null;
    }
  }

  private goToNextBanner(): void {
    const activeBanners = this.getActiveBanners();
    if (activeBanners.length <= 1) return;
    
    this.currentIndex = (this.currentIndex + 1) % activeBanners.length;
    this.notifySubscribers();
  }

  /**
   * Obtém o estado atual do sistema
   */
  getCurrentState(): SmartBannerState {
    const activeBanners = this.getActiveBanners();
    const currentBanner = activeBanners[this.currentIndex] || null;
    const nextBanner = activeBanners[(this.currentIndex + 1) % activeBanners.length] || null;

    let countdownTimeLeft = 0;
    if (currentBanner?.hasActiveCountdown && currentBanner.countdownEndTime) {
      const endTime = new Date(currentBanner.countdownEndTime);
      countdownTimeLeft = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000));
    }

    let timeUntilNext = 0;
    if (currentBanner?.displayDurationMinutes) {
      timeUntilNext = currentBanner.displayDurationMinutes * 60;
    }

    const state = {
      currentBanner,
      nextBanner,
      timeUntilNext,
      countdownTimeLeft,
      isRotating: this.rotationTimer !== null,
      activeBanners,
      currentIndex: this.currentIndex,
      totalActiveBanners: activeBanners.length
    };

    // console.log('📋 getCurrentState:', currentBanner?.title || 'null', 'index:', this.currentIndex);

    return state;
  }

  /**
   * Registra listener para mudanças de estado
   */
  subscribe(callback: (state: SmartBannerState) => void): () => void {
    this.subscribers.push(callback);
    return () => this.subscribers.splice(this.subscribers.indexOf(callback), 1);
  }

  /**
   * Notifica todos os listeners
   */
  private notifySubscribers(): void {
    const state = this.getCurrentState();
    this.subscribers.forEach(callback => callback(state));
  }

  /**
   * Força rotação manual para um banner específico
   */
  goToBanner(index: number): void {
    const activeBanners = this.getActiveBanners();
    console.log('🎯 goToBanner called:', { 
      index, 
      activeBannersLength: activeBanners.length, 
      currentIndex: this.currentIndex 
    });
    
    if (index >= 0 && index < activeBanners.length) {
      this.currentIndex = index;
      console.log('✅ Banner changed to index:', index);
      
      // Reiniciar auto-rotação quando usuário navega manualmente
      this.startAutoRotation();
      
      this.notifySubscribers();
    } else {
      console.warn('❌ Invalid banner index:', { index, activeBannersLength: activeBanners.length });
    }
  }

  /**
   * Registra clique em banner
   */
  async trackClick(bannerId: string): Promise<void> {
    try {
      await fetch('/api/banners/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerId })
      });
      
      // Atualizar contador local
      const banner = this.banners.find(b => b.id === bannerId);
      if (banner) {
        banner.clicks = (banner.clicks || 0) + 1;
      }
    } catch (error) {
      console.warn('Erro ao registrar clique:', error);
    }
  }

  /**
   * Banners de fallback
   */
  private getFallbackBanners(): SmartBanner[] {
    return [
      {
        id: 'fallback-1',
        title: 'Ofertas Especiais',
        subtitle: 'Produtos com desconto limitado',
        image: 'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/banner-principal-1.jpg',
        link: '/promocoes',
        countdownText: '⚡ Oferta termina em:',
        countdownEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h
        displayDurationMinutes: 60,
        autoRotate: true,
        isActive: true,
        hasActiveCountdown: true
      },
      {
        id: 'fallback-2',
        title: 'Frete Grátis',
        subtitle: 'Em compras acima de R$ 99',
        image: 'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/banner-principal-2.jpg',
        link: '/frete-gratis',
        countdownText: '🚚 Promoção de frete termina em:',
        countdownEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
        displayDurationMinutes: 120,
        autoRotate: true,
        isActive: true,
        hasActiveCountdown: true
      }
    ];
  }

  /**
   * Pausa a rotação automática
   */
  pause(): void {
    this.stopAutoRotation();
    this.stopRotationTimer();
    this.stopCountdownTimer();
  }

  /**
   * Retoma a rotação automática
   */
  resume(): void {
    this.startAutoRotation();
    this.startRotationTimer();
    this.startCountdownTimer();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopRotationTimer();
    this.stopCountdownTimer();
    this.stopAutoRotation(); // Parar rotação automática
    this.subscribers = [];
    this.cache.clear();
  }

  private getActiveBanners(): SmartBanner[] {
    const activeBanners = this.banners.filter(b => b.isActive);
    // console.log('🔍 getActiveBanners: total =', this.banners.length, 'ativos =', activeBanners.length);
    return activeBanners;
  }

  private startRotationTimer(): void {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
    }

    const activeBanners = this.getActiveBanners();
    
    if (activeBanners.length === 0) {
      return;
    }

    this.currentIndex = this.currentIndex % activeBanners.length;
    const currentBanner = activeBanners[this.currentIndex];
    
    // Calcular tempo até próxima rotação  
    const displayDuration = (currentBanner.displayDurationMinutes || 60) * 60 * 1000;
    
    this.rotationTimer = setTimeout(() => {
      this.goToNextBanner();
    }, displayDuration);

    this.notifySubscribers();
  }

  private stopRotationTimer(): void {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  private startCountdownTimer(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
    }

    const activeBanners = this.getActiveBanners();
    
    if (activeBanners.length === 0) {
      return;
    }

    const currentBanner = activeBanners[this.currentIndex];
    
    if (currentBanner?.hasActiveCountdown && currentBanner.countdownEndTime) {
      const endTime = new Date(currentBanner.countdownEndTime);
      const timeLeft = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000));
      
      this.countdownTimer = setTimeout(() => {
        this.goToNextBanner();
      }, timeLeft * 1000);
    }

    this.notifySubscribers();
  }

  private stopCountdownTimer(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}

// Export singleton
export const smartBannerService = SmartBannerService.getInstance(); 