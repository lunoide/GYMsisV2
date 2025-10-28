/**
 * Servicio de Rate Limiting
 * Protege contra ataques de fuerza bruta y spam
 */
export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
  keyGenerator?: (identifier: string) => string;
}
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}
export interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}
export class RateLimitService {
  private static storage = new Map<string, RateLimitEntry>();
  // Configuraciones predefinidas para diferentes operaciones
  static readonly CONFIGS = {
    LOGIN: {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutos
      blockDurationMs: 30 * 60 * 1000, // 30 minutos de bloqueo
    },
    REGISTRATION: {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000, // 1 hora
      blockDurationMs: 2 * 60 * 60 * 1000, // 2 horas de bloqueo
    },
    PASSWORD_CHANGE: {
      maxAttempts: 3,
      windowMs: 10 * 60 * 1000, // 10 minutos
      blockDurationMs: 60 * 60 * 1000, // 1 hora de bloqueo
    },
    API_GENERAL: {
      maxAttempts: 100,
      windowMs: 60 * 1000, // 1 minuto
      blockDurationMs: 5 * 60 * 1000, // 5 minutos de bloqueo
    },
    SENSITIVE_OPERATIONS: {
      maxAttempts: 2,
      windowMs: 5 * 60 * 1000, // 5 minutos
      blockDurationMs: 15 * 60 * 1000, // 15 minutos de bloqueo
    }
  };
  /**
   * Verifica si una operación está permitida según el rate*/
  static checkRateLimit(
    identifier: string, 
    config: RateLimitConfig,
    operation: string = 'default'
  ): RateLimitResult {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : `${operation}:${identifier}`;
    const now = Date.now();
    // Limpiar entradas expiradas
    this.cleanExpiredEntries();
    let entry = this.storage.get(key);
    // Si no existe entrada, crear una nueva
    if (!entry) {
      entry = {
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now
      };
    }
    // Verificar si está bloqueado
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockedUntil,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000)
      };
    }
    // Verificar si la ventana de tiempo ha expirado
    if (now - entry.firstAttempt > config.windowMs) {
      // Resetear contador
      entry = {
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now
      };
    }
    // Verificar si se excedió el límite
    if (entry.attempts >= config.maxAttempts) {
      entry.blockedUntil = now + config.blockDurationMs;
      this.storage.set(key, entry);
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockedUntil,
        retryAfter: Math.ceil(config.blockDurationMs / 1000)
      };
    }
    // Operación permitida
    const remaining = config.maxAttempts - entry.attempts - 1;
    const resetTime = entry.firstAttempt + config.windowMs;
    return {
      allowed: true,
      remaining,
      resetTime
    };
  }
  /**
   * Registra un intento (exitoso o fallido)
   */
  static recordAttempt(
    identifier: string,
    config: RateLimitConfig,
    success: boolean = false,
    operation: string = 'default'
  ): void {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : `${operation}:${identifier}`;
    const now = Date.now();
    let entry = this.storage.get(key);
    if (!entry) {
      entry = {
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now
      };
    }
    // Si la operación fue exitosa, resetear contador
    if (success) {
      this.storage.delete(key);
      return;
    }
    // Incrementar contador de intentos fallidos
    entry.attempts += 1;
    entry.lastAttempt = now;
    this.storage.set(key, entry);
  }
  /**
   * Obtiene información del estado actual del rate*/
  static getRateLimitStatus(
    identifier: string,
    config: RateLimitConfig,
    operation: string = 'default'
  ): RateLimitEntry | null {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : `${operation}:${identifier}`;
    return this.storage.get(key) || null;
  }
  /**
   * Resetea el ratepara un identificador específico
   */
  static resetRateLimit(
    identifier: string,
    config: RateLimitConfig,
    operation: string = 'default'
  ): void {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : `${operation}:${identifier}`;
    this.storage.delete(key);
  }
  /**
   * Limpia entradas expiradas del storage
   */
  private static cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      // Eliminar entradas que ya no están bloqueadas y han expirado
      if (entry.blockedUntil && now > entry.blockedUntil) {
        this.storage.delete(key);
      }
    }
  }
  /**
   * Obtiene estadísticas del rateing
   */
  static getStatistics(): {
    totalEntries: number;
    blockedEntries: number;
    activeEntries: number;
  } {
    const now = Date.now();
    let blockedEntries = 0;
    let activeEntries = 0;
    for (const entry of this.storage.values()) {
      if (entry.blockedUntil && now < entry.blockedUntil) {
        blockedEntries++;
      } else if (entry.attempts > 0) {
        activeEntries++;
      }
    }
    return {
      totalEntries: this.storage.size,
      blockedEntries,
      activeEntries
    };
  }
  /**
   * Limpia todo el storage (usar con cuidado)
   */
  static clearAll(): void {
    this.storage.clear();
  }
  /**
   * Genera una clave basada en IP y User Agent (para navegadores)
   */
  static generateBrowserKey(identifier: string): string {
    // En un entorno real, podrías usar IP + User Agent
    // Por ahora usamos solo el identificador
    return `browser:${identifier}`;
  }
  /**
   * Genera una clave basada en email para operaciones de autenticación
   */
  static generateEmailKey(email: string): string {
    return `email:${email.toLowerCase()}`;
  }
  /**
   * Genera una clave basada en UID de usuario
   */
  static generateUserKey(uid: string): string {
    return `user:${uid}`;
  }
}
/**
 * Decorador para aplicar rateing a métodos
 */
export function RateLimit(config: RateLimitConfig, operation?: string) {
  return function (_target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      // Extraer identificador del primer argumento (asumiendo que es email o uid)
      const identifier = args[0]?.email || args[0]?.uid || args[0] || 'anonymous';
      const rateLimitResult = RateLimitService.checkRateLimit(
        identifier,
        config,
        operation || propertyName
      );
      if (!rateLimitResult.allowed) {
        const error = new Error(`Rateexceeded. Try again in ${rateLimitResult.retryAfter} seconds.`);
        (error as any).code = 'RATE_LIMIT_EXCEEDED';
        (error as any).retryAfter = rateLimitResult.retryAfter;
        throw error;
      }
      try {
        const result = await method.apply(this, args);
        // Registrar intento exitoso
        RateLimitService.recordAttempt(identifier, config, true, operation || propertyName);
        return result;
      } catch (error) {
        // Registrar intento fallido
        RateLimitService.recordAttempt(identifier, config, false, operation || propertyName);
        throw error;
      }
    };
  };
}
export default RateLimitService;