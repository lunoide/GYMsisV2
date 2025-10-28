import { useState, useCallback, useMemo } from 'react';
import {sanitizeHtml,
  sanitizeUrl,
  sanitizeEmail,
  sanitizePhone,
  sanitizeFileName,
  sanitizeNumber,
  sanitizeObject,
  containsXSS,
  SANITIZATION_CONFIGS
} from '../utils/sanitization';
/**
 * Hook para sanitizar valores de input en tiempo real
 */
export function useSanitizedInput(initialValue: string = '', type: 'text' | 'email' | 'phone' | 'url' | 'filename' = 'text') {
  const [value, setValue] = useState(initialValue);
  const [rawValue, setRawValue] = useState(initialValue);
  const sanitize = useCallback((input: string) => {
    switch (type) {
      case 'email':
        return sanitizeEmail(input);
      case 'phone':
        return sanitizePhone(input);
      case 'url':
        return sanitizeUrl(input);
      case 'filename':
        return sanitizeFileName(input);
      default:
        return(input);
    }
  }, [type]);
  const handleChange = useCallback((newValue: string) => {
    setRawValue(newValue);
    const sanitized = sanitize(newValue);
    setValue(sanitized);
  }, [sanitize]);
  const isValid = useMemo(() => {
    if (type === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    return !containsXSS(rawValue);
  }, [value, rawValue, type]);
  const hasXSS = useMemo(() => containsXSS(rawValue), [rawValue]);
  return {
    value,
    rawValue,
    setValue: handleChange,
    isValid,
    hasXSS,
    sanitize
  };
}
/**
 * Hook para sanitizar objetos de formulario
 */
export function useSanitizedForm<T extends Record<string, any>>(
  initialData: T,
  config: keyof typeof SANITIZATION_CONFIGS = 'text'
) {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const sanitizeData = useCallback((formData: T) => {
    const sanitized = sanitizeObject(formData, SANITIZATION_CONFIGS[config]);
    return sanitized;
  }, [config]);
  const validateField = useCallback((key: string, value: any) => {
    const newErrors = { ...errors };
    if (typeof value === 'string' && containsXSS(value)) {
      newErrors[key] = 'Este campo contiene contenido potencialmente peligroso';
    } else {
      delete newErrors[key];
    }
    setErrors(newErrors);
    return !newErrors[key];
  }, [errors]);
  const updateField = useCallback((key: keyof T, value: any) => {
    const isValid = validateField(key as string, value);
    if (isValid) {
      const sanitizedValue = typeof value === 'string' ?(value) : value;
      setData(prev => ({
        ...prev,
        [key]: sanitizedValue
      }));
    }
  }, [validateField]);
  const updateData = useCallback((newData: Partial<T>) => {
    const sanitized = sanitizeData({ ...data, ...newData });
    setData(sanitized);
  }, [data, sanitizeData]);
  const resetForm = useCallback(() => {
    setData(initialData);
    setErrors({});
  }, [initialData]);
  const isFormValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);
  const getSanitizedData = useCallback(() => {
    return sanitizeData(data);
  }, [data, sanitizeData]);
  return {
    data,
    errors,
    updateField,
    updateData,
    resetForm,
    isFormValid,
    getSanitizedData,
    validateField
  };
}
/**
 * Hook para sanitizar contenido HTML de manera segura
 */
export function useSanitizedHtml(
  content: string,
  allowedTags: string[] = ['b', 'i', 'em', 'strong', 'p', 'br']
) {
  const sanitizedContent = useMemo(() => {
    return sanitizeHtml(content, allowedTags);
  }, [content, allowedTags]);
  const hasUnsafeContent = useMemo(() => {
    return containsXSS(content);
  }, [content]);
  const originalLength = content.length;
  const sanitizedLength = sanitizedContent.length;
  const wasModified = originalLength !== sanitizedLength;
  return {
    sanitizedContent,
    hasUnsafeContent,
    wasModified,
    originalLength,
    sanitizedLength
  };
}
/**
 * Hook para validar URLs de manera segura
 */
export function useSanitizedUrl(url: string) {
  const sanitizedUrl = useMemo(() => {
    return sanitizeUrl(url);
  }, [url]);
  const isValid = useMemo(() => {
    return sanitizedUrl.length > 0;
  }, [sanitizedUrl]);
  const isSafe = useMemo(() => {
    return !containsXSS(url) && isValid;
  }, [url, isValid]);
  return {
    sanitizedUrl,
    isValid,
    isSafe,
    originalUrl: url
  };
}
/**
 * Hook para sanitizar arrays de datos
 */
export function useSanitizedArray<T>(
  items: T[],
  config: keyof typeof SANITIZATION_CONFIGS = 'text'
) {
  const sanitizedItems = useMemo(() => {
    return items.map(item => sanitizeObject(item, SANITIZATION_CONFIGS[config]));
  }, [items, config]);
  const hasUnsafeItems = useMemo(() => {
    return items.some(item => {
      if (typeof item === 'string') {
        return containsXSS(item);
      }
      if (typeof item === 'object' && item !== null) {
        return Object.values(item).some(value => 
          typeof value === 'string' && containsXSS(value)
        );
      }
      return false;
    });
  }, [items]);
  return {
    sanitizedItems,
    hasUnsafeItems,
    originalCount: items.length,
    sanitizedCount: sanitizedItems.length
  };
}
/**
 * Hook para sanitización en tiempo real con debounce
 */
export function useDebouncedSanitization(
  value: string,
  delay: number = 300,
  type: 'text' | 'html' | 'url' = 'text'
) {
  const [sanitizedValue, setSanitizedValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const sanitize = useCallback((input: string) => {
    switch (type) {
      case 'html':
        return sanitizeHtml(input);
      case 'url':
        return sanitizeUrl(input);
      default:
        return(input);
    }
  }, [type]);
  // Debounce effect
  useState(() => {
    setIsProcessing(true);
    const timer = setTimeout(() => {
      const sanitized = sanitize(value);
      setSanitizedValue(sanitized);
      setIsProcessing(false);
    }, delay);
    return () => {
      clearTimeout(timer);
      setIsProcessing(false);
    };
  });
  const hasXSS = useMemo(() => containsXSS(value), [value]);
  return {
    sanitizedValue,
    isProcessing,
    hasXSS,
    originalValue: value
  };
}
/**
 * Hook para configuración de sanitización personalizada
 */
export function useCustomSanitization(customConfig: {
  sanitizeStrings?: boolean;
  sanitizeUrls?: boolean;
  allowedHtmlTags?: string[];
}) {
  const sanitizeWithConfig = useCallback((data: any) => {
    return sanitizeObject(data, customConfig);
  }, [customConfig]);
  const validateWithConfig = useCallback((data: any) => {
    if (typeof data === 'string') {
      return !containsXSS(data);
    }
    if (typeof data === 'object' && data !== null) {
      return !Object.values(data).some(value => 
        typeof value === 'string' && containsXSS(value)
      );
    }
    return true;
  }, []);
  return {
    sanitize: sanitizeWithConfig,
    validate: validateWithConfig,
    config: customConfig
  };
}