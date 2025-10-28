import React from 'react';
import { AlertTriangle, Clock, Shield } from 'lucide-react';
interface RateLimitMessageProps {
  /** Tiempo en minutos hasta que se pueda intentar nuevamente */
  retryAfterMinutes: number;
  /** Tipo de operación que fueada */
  operation?: string;
  /** Estilo del mensaje */
  variant?: 'error' | 'warning' | 'info';
  /** Clase CSS adicional */
  className?: string;
  /** Mostrar icono */
  showIcon?: boolean;
  /** Mensaje personalizado (opcional) */
  customMessage?: string;
}
const RateLimitMessage: React.FC<RateLimitMessageProps> = ({
  retryAfterMinutes,
  operation = 'esta operación',
  variant = 'error',
  className = '',
  showIcon = true,
  customMessage
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };
  const getIcon = () => {
    switch (variant) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Shield className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };
  const formatTimeMessage = (minutes: number): string => {
    if (minutes < 1) {
      return 'unos segundos';
    } else if (minutes === 1) {
      return '1 minuto';
    } else if (minutes < 60) {
      return `${minutes} minutos`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (hours === 1 && remainingMinutes === 0) {
        return '1 hora';
      } else if (remainingMinutes === 0) {
        return `${hours} horas`;
      } else {
        return `${hours} hora${hours > 1 ? 's' : ''} y ${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''}`;
      }
    }
  };
  const getDefaultMessage = (): string => {
    const timeText = formatTimeMessage(retryAfterMinutes);
    switch (operation) {
      case 'login':
        return `Demasiados intentos de inicio de sesión. Por tu seguridad, intenta nuevamente en ${timeText}.`;
      case 'register':
      case 'registro':
        return `Demasiados intentos de registro. Intenta nuevamente en ${timeText}.`;
      case 'password_change':
      case 'cambio de contraseña':
        return `Demasiados intentos de cambio de contraseña. Por tu seguridad, intenta nuevamente en ${timeText}.`;
      default:
        return `Demasiados intentos de ${operation}. Por tu seguridad, intenta nuevamente en ${timeText}.`;
    }
  };
  const message = customMessage || getDefaultMessage();
  return (
    <div className={`rounded-md border p-4 ${getVariantStyles()} ${className}`}>
      <div className="flex">
        {showIcon && (
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
        )}
        <div className={showIcon ? 'ml-3' : ''}>
          <div className="text-sm font-medium">
            {message}
          </div>
          {retryAfterMinutes > 5 && (
            <div className="mt-2 text-xs opacity-75">
              Esta medida de seguridad protege tu cuenta contra accesos no autorizados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
/**
 * Hook para manejar mensajes de rateing
 */
export const useRateLimitMessage = () => {
  const parseRateLimitError = (error: Error): { isRateLimit: boolean; retryAfterMinutes: number; operation?: string } => {
    if (error.message.startsWith('RATE_LIMIT_EXCEEDED:')) {
      const minutes = parseInt(error.message.split(':')[1]) || 5;
      return {
        isRateLimit: true,
        retryAfterMinutes: minutes
      };
    }
    // Buscar patrones comunes en mensajes de error
    const rateLimitPatterns = [
      /demasiados intentos.*?(\d+)\s*minutos?/i,
      /too many.*?(\d+)\s*minutes?/i,
      /rate.*?(\d+)\s*minutos?/i
    ];
    for (const pattern of rateLimitPatterns) {
      const match = error.message.match(pattern);
      if (match) {
        return {
          isRateLimit: true,
          retryAfterMinutes: parseInt(match[1]) || 5
        };
      }
    }
    return {
      isRateLimit: false,
      retryAfterMinutes: 0
    };
  };
  const createRateLimitMessage = (
    error: Error,
    operation?: string,
    variant: 'error' | 'warning' | 'info' = 'error'
  ): React.ReactElement | null => {
    const { isRateLimit, retryAfterMinutes } = parseRateLimitError(error);
    if (!isRateLimit) {
      return null;
    }
    return (
      <RateLimitMessage
        retryAfterMinutes={retryAfterMinutes}
        operation={operation}
        variant={variant}
      />
    );
  };
  return {
    parseRateLimitError,
    createRateLimitMessage
  };
};
/**
 * Componente de countdown para mostrar tiempo restante
 */
interface RateLimitCountdownProps {
  /** Tiempo inicial en segundos */
  initialSeconds: number;
  /** Callback cuando el countdown termina */
  onComplete?: () => void;
  /** Mostrar solo minutos y segundos */
  showOnlyMinutesAndSeconds?: boolean;
}
export const RateLimitCountdown: React.FC<RateLimitCountdownProps> = ({
  initialSeconds,
  onComplete,
  showOnlyMinutesAndSeconds = true
}) => {
  const [secondsLeft, setSecondsLeft] = React.useState(initialSeconds);
  React.useEffect(() => {
    if (secondsLeft <= 0) {
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, onComplete]);
  const formatTime = (seconds: number): string => {
    if (showOnlyMinutesAndSeconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  if (secondsLeft <= 0) {
    return null;
  }
  return (
    <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
      <Clock className="h-4 w-4" />
      <span>Tiempo restante: {formatTime(secondsLeft)}</span>
    </div>
  );
};
export default RateLimitMessage;