import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimitMiddleware, RateLimitError, RateLimitErrorHandler } from '../../middleware/rateLimitMiddleware';
import { RateLimitService } from '../../services/security/rateLimitService';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('RateLimitMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.clear.mockClear();
    vi.useFakeTimers();
    
    // Limpiar cualquier dato persistente
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('rate_limit_')) {
        localStorage.removeItem(key);
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('withRateLimit', () => {
    it('debería ejecutar la función si está dentro del límite', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await RateLimitMiddleware.withRateLimit(
        'test1@example.com',
        RateLimitService.CONFIGS.LOGIN,
        'test_operation',
        mockFn
      );

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('debería lanzar error si excede el límite', async () => {
      const identifier = 'test2@example.com';
      const config = RateLimitService.CONFIGS.LOGIN;

      // Exceder el límite
      for (let i = 0; i < config.maxAttempts; i++) {
        RateLimitService.recordAttempt(identifier, config, false, 'test_operation');
      }

      const mockFn = vi.fn().mockResolvedValue('success');

      await expect(
        RateLimitMiddleware.withRateLimit(identifier, config, 'test_operation', mockFn)
      ).rejects.toThrow('RATE_LIMIT_EXCEEDED');

      expect(mockFn).not.toHaveBeenCalled();
    });

    it('debería registrar intento exitoso', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const identifier = 'test3@example.com';
      
      await RateLimitMiddleware.withRateLimit(
        identifier,
        RateLimitService.CONFIGS.LOGIN,
        'test_operation',
        mockFn
      );

      // Verificar que la función se ejecutó
      expect(mockFn).toHaveBeenCalledOnce();
      
      // Verificar que no hay entrada en el rate limit (porque fue exitoso)
      const status = RateLimitService.getRateLimitStatus(identifier, RateLimitService.CONFIGS.LOGIN, 'test_operation');
      expect(status).toBeNull();
    });

    it('debería registrar intento fallido y re-lanzar error', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Function error'));
      const identifier = 'test4@example.com';
      
      await expect(
        RateLimitMiddleware.withRateLimit(
          identifier,
          RateLimitService.CONFIGS.LOGIN,
          'test_operation',
          mockFn
        )
      ).rejects.toThrow('Function error');

      // Verificar que se registró el intento fallido
      const status = RateLimitService.getRateLimitStatus(identifier, RateLimitService.CONFIGS.LOGIN, 'test_operation');
      expect(status).toBeTruthy();
      expect(status!.attempts).toBe(1);
    });
  });

  describe('withAuthRateLimit', () => {
    it('debería usar la configuración correcta para login', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await RateLimitMiddleware.withAuthRateLimit(
        'test@example.com',
        'login',
        mockFn
      );

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('debería usar la configuración correcta para register', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await RateLimitMiddleware.withAuthRateLimit(
        'test@example.com',
        'register',
        mockFn
      );

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('debería usar la configuración correcta para password_change', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await RateLimitMiddleware.withAuthRateLimit(
        'test@example.com',
        'password_change',
        mockFn
      );

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledOnce();
    });
  });

  describe('withApiRateLimit', () => {
    it('debería aplicar rate limiting para API general', async () => {
      const mockFn = vi.fn().mockResolvedValue('api_result');
      
      const result = await RateLimitMiddleware.withApiRateLimit(
        'user123',
        mockFn
      );

      expect(result).toBe('api_result');
      expect(mockFn).toHaveBeenCalledOnce();
    });
  });

  describe('withSensitiveOperationRateLimit', () => {
    it('debería aplicar rate limiting para operaciones sensibles', async () => {
      const mockFn = vi.fn().mockResolvedValue('sensitive_result');
      
      const result = await RateLimitMiddleware.withSensitiveOperationRateLimit(
        'admin@example.com',
        'delete_user',
        mockFn
      );

      expect(result).toBe('sensitive_result');
      expect(mockFn).toHaveBeenCalledOnce();
    });
  });

  describe('checkOperationAllowed', () => {
    it('debería retornar allowed: true si está dentro del límite', () => {
      const result = RateLimitMiddleware.checkOperationAllowed(
        'test@example.com',
        RateLimitService.CONFIGS.LOGIN,
        'login'
      );

      expect(result.allowed).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('debería retornar allowed: false con mensaje si excede el límite', () => {
      const identifier = 'test@example.com';
      const config = RateLimitService.CONFIGS.LOGIN;

      // Exceder el límite
      for (let i = 0; i < config.maxAttempts; i++) {
        RateLimitService.recordAttempt(identifier, config, false, 'login');
      }

      const result = RateLimitMiddleware.checkOperationAllowed(
        identifier,
        config,
        'login'
      );

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Demasiados intentos');
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('resetRateLimit', () => {
    it('debería resetear el rate limiting', () => {
      const identifier = 'test@example.com';
      const config = RateLimitService.CONFIGS.LOGIN;

      // Exceder el límite
      for (let i = 0; i < config.maxAttempts; i++) {
        RateLimitService.recordAttempt(identifier, config, false, 'login');
      }

      // Verificar que está bloqueado
      let result = RateLimitMiddleware.checkOperationAllowed(identifier, config, 'login');
      expect(result.allowed).toBe(false);

      // Resetear
      RateLimitMiddleware.resetRateLimit(identifier, config, 'login');

      // Verificar que ahora está permitido
      result = RateLimitMiddleware.checkOperationAllowed(identifier, config, 'login');
      expect(result.allowed).toBe(true);
    });
  });
});

describe('RateLimitError', () => {
  it('debería crear una instancia correcta', () => {
    const error = new RateLimitError('Test message', 300, 'login');
    
    expect(error.message).toBe('Test message');
    expect(error.name).toBe('RateLimitError');
    expect(error.retryAfter).toBe(300);
    expect(error.operation).toBe('login');
  });
});

describe('RateLimitErrorHandler', () => {
  describe('getErrorMessage', () => {
    it('debería convertir error de rate limit en mensaje amigable', () => {
      const error = new Error('RATE_LIMIT_EXCEEDED:5');
      const message = RateLimitErrorHandler.getErrorMessage(error);
      
      expect(message).toBe('Demasiados intentos. Intenta nuevamente en 5 minutos.');
    });

    it('debería retornar el mensaje original para otros errores', () => {
      const error = new Error('Other error');
      const message = RateLimitErrorHandler.getErrorMessage(error);
      
      expect(message).toBe('Other error');
    });
  });

  describe('isRateLimitError', () => {
    it('debería identificar errores de rate limit por mensaje', () => {
      const error = new Error('RATE_LIMIT_EXCEEDED:5');
      expect(RateLimitErrorHandler.isRateLimitError(error)).toBe(true);
    });

    it('debería identificar instancias de RateLimitError', () => {
      const error = new RateLimitError('Test', 300, 'login');
      expect(RateLimitErrorHandler.isRateLimitError(error)).toBe(true);
    });

    it('debería retornar false para otros errores', () => {
      const error = new Error('Other error');
      expect(RateLimitErrorHandler.isRateLimitError(error)).toBe(false);
    });
  });

  describe('getRetryAfter', () => {
    it('debería extraer retryAfter de RateLimitError', () => {
      const error = new RateLimitError('Test', 300, 'login');
      const retryAfter = RateLimitErrorHandler.getRetryAfter(error);
      
      expect(retryAfter).toBe(300);
    });

    it('debería extraer retryAfter de mensaje de error', () => {
      const error = new Error('RATE_LIMIT_EXCEEDED:5');
      const retryAfter = RateLimitErrorHandler.getRetryAfter(error);
      
      expect(retryAfter).toBe(300); // 5 minutos * 60 segundos
    });

    it('debería retornar null para otros errores', () => {
      const error = new Error('Other error');
      const retryAfter = RateLimitErrorHandler.getRetryAfter(error);
      
      expect(retryAfter).toBeNull();
    });
  });
});