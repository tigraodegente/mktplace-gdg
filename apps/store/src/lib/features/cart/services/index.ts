/**
 * Cart Services - Exports Centralizados
 * 
 * Ponto único de importação para todos os services do carrinho
 */

// =============================================================================
// PERSISTENCE SERVICE
// =============================================================================

export {
  CartPersistenceService,
  getCartPersistenceService,
  createCartPersistenceService,
  STORAGE_KEYS,
  loadFromStorage,
  saveToStorage,
  migrateStorageData
} from './persistence.service';

export type {
  StorageProvider,
  PersistenceConfig
} from './persistence.service';

// =============================================================================
// SESSION SERVICE
// =============================================================================

export {
  CartSessionService,
  getCartSessionService,
  createCartSessionService,
  getOrCreateSessionId,
  isValidSessionId,
  cleanupExpiredSessions
} from './session.service';

export type {
  SessionConfig,
  SessionInfo
} from './session.service';

// =============================================================================
// COUPON SERVICE
// =============================================================================

export {
  CartCouponService,
  getCartCouponService,
  createCartCouponService,
  validateCoupon,
  isValidCouponCode,
  formatCouponCode,
  getCouponTypeDescription
} from './coupon.service';

export type {
  CouponValidationRequest,
  CouponValidationResponse,
  CouponServiceConfig,
  AuthUser,
  ApiCartItem
} from './coupon.service';

// =============================================================================
// CALCULATION SERVICE
// =============================================================================

export {
  CartCalculationService,
  getCartCalculationService,
  createCartCalculationService,
  calculateDiscount,
  formatCurrency,
  formatPercentage,
  parseCurrency
} from './calculation.service';

export type {
  CalculationConfig,
  DiscountCalculation,
  GroupCalculationResult
} from './calculation.service';

// =============================================================================
// VALIDATION SUITE
// =============================================================================

export {
  validateServices
} from './services-validation';

// =============================================================================
// CONVENIENCE CONSTANTS
// =============================================================================

/**
 * Lista de todos os services disponíveis
 */
export const AVAILABLE_SERVICES = [
  'persistence',
  'session',
  'coupon',
  'calculation'
] as const;

/**
 * Configurações padrão para cada service
 */
export const DEFAULT_SERVICE_CONFIGS = {
  persistence: {},
  session: { sessionIdLength: 32 },
  coupon: { timeout: 10000, debug: false },
  calculation: { maxInstallments: 12, roundingPrecision: 2 }
} as const;

// =============================================================================
// SERVICE VERSIONS INFO
// =============================================================================

export const CART_SERVICES_VERSION = '1.0.0';
export const SUPPORTED_FEATURES = [
  'persistence',
  'session-management',
  'coupon-validation',
  'calculations',
  'error-handling',
  'dependency-injection',
  'testing'
] as const; 