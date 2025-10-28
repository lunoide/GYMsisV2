import { RateLimitService } from '../services/security/rateLimitService';
import type { RateLimitConfig } from '../services/security/rateLimitService';

/**
 * Middleware de rate limiting que puede ser aplicado a cualquier función
 */
export class RateLimitMiddleware {
  /**
   * Aplica rate limiting a una función asíncrona
   * @param identifier - Identificador único (email, IP, etc.)
   * @param config - Configuración de rate limiting
   * @param operation - Nombre de la operación para logging
   * @param fn - Función a ejecutar
   * @returns Resultado de la función o error de rate limiting
   */
  static async withRateLimit<T>(
    identifier: string,
    config: RateLimitConfig,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Verificar rate limiting
    const rateLimitResult = RateLimitService.checkRateLimit(identifier, config, operation);
    
    if (!rateLimitResult.allowed) {
      const retryAfterMinutes = Math.ceil(rateLimitResult.retryAfter! / 60);
      throw new Error(`RATE_LIMIT_EXCEEDED:${retryAfterMinutes}`);
    }

    try {
      // Ejecutar la función
      const result = await fn();
      
      // Registrar intento exitoso
      RateLimitService.recordAttempt(identifier, config, true, operation);
      
      return result;
    } catch (error) {
      // Registrar intento fallido
      RateLimitService.recordAttempt(identifier, config, false, operation);
      
      // Re-lanzar el error original
      throw error;
    }
  }

  /**
   * Decorator para aplicar rate limiting a métodos de clase
   * @param config - Configuración de rate limiting
   * @param operation - Nombre de la operación
   * @param getIdentifier - Función para obtener el identificador del primer parámetro
   */
  static rateLimited(
    config: RateLimitConfig,
    operation: string,
    getIdentifier: (args: any[]) => string
  ) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const identifier = getIdentifier(args);
        
        return RateLimitMiddleware.withRateLimit(
          identifier,
          config,
          operation,
          () => method.apply(this, args)
        );
      };
    };
  }

  /**
   * Middleware específico para operaciones de autenticación
   */
  static async withAuthRateLimit<T>(
    email: string,
    operation: 'login' | 'register' | 'password_change',
    fn: () => Promise<T>
  ): Promise<T> {
    const configs = {
      login: RateLimitService.CONFIGS.LOGIN,
      register: RateLimitService.CONFIGS.REGISTRATION,
      password_change: RateLimitService.CONFIGS.PASSWORD_CHANGE
    };

    return this.withRateLimit(email, configs[operation], operation, fn);
  }

  /**
   * Middleware para operaciones de API general
   */
  static async withApiRateLimit<T>(
    identifier: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.withRateLimit(
      identifier,
      RateLimitService.CONFIGS.API_GENERAL,
      'api_call',
      fn
    );
  }

  /**
   * Middleware para operaciones sensibles
   */
  static async withSensitiveOperationRateLimit<T>(
    identifier: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.withRateLimit(
      identifier,
      RateLimitService.CONFIGS.SENSITIVE_OPERATIONS,
      operation,
      fn
    );
  }

  /**
   * Verifica si una operación está permitida sin ejecutarla
   */
  static checkOperationAllowed(
    identifier: string,
    config: RateLimitConfig,
    operation: string
  ): { allowed: boolean; retryAfter?: number; message?: string } {
    const result = RateLimitService.checkRateLimit(identifier, config, operation);
    
    if (!result.allowed) {
      const retryAfterMinutes = Math.ceil(result.retryAfter! / 60);
      return {
        allowed: false,
        retryAfter: result.retryAfter,
        message: `Demasiados intentos de ${operation}. Intenta nuevamente en ${retryAfterMinutes} minutos.`
      };
    }

    return { allowed: true };
  }

  /**
   * Resetea el rate limiting para un identificador específico
   */
  static resetRateLimit(
    identifier: string,
    config: RateLimitConfig,
    operation: string
  ): void {
    RateLimitService.resetRateLimit(identifier, config, operation);
  }
}

/**
 * Tipos de error específicos para rate limiting
 */
export class RateLimitError extends Error {
  public readonly retryAfter: number;
  public readonly operation: string;

  constructor(message: string, retryAfter: number, operation: string) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.operation = operation;
  }
}

/**
 * Utilidades para manejar errores de rate limiting
 */
export class RateLimitErrorHandler {
  /**
   * Convierte un error de rate limiting en un mensaje amigable
   */
  static getErrorMessage(error: Error): string {
    if (error.message.startsWith('RATE_LIMIT_EXCEEDED:')) {
      const minutes = error.message.split(':')[1];
      return `Demasiados intentos. Intenta nuevamente en ${minutes} minutos.`;
    }

    return error.message;
  }

  /**
   * Verifica si un error es de rate limiting
   */
  static isRateLimitError(error: Error): boolean {
    return error.message.startsWith('RATE_LIMIT_EXCEEDED:') || error instanceof RateLimitError;
  }

  /**
   * Extrae el tiempo de reintento de un error de rate limiting
   */
  static getRetryAfter(error: Error): number | null {
    if (error instanceof RateLimitError) {
      return error.retryAfter;
    }

    if (error.message.startsWith('RATE_LIMIT_EXCEEDED:')) {
      const minutes = parseInt(error.message.split(':')[1]);
      return minutes * 60; // Convertir a segundos
    }

    return null;
  }
}