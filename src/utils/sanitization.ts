/**
 * Utilidades de sanitización de datos para prevenir ataques XSS
 * Proporciona funciones para limpiar y validar datos de entrada del usuario
 */
// Patrones de caracteres peligrosos para XSS
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
  /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
  /onclick\s*=/gi,
  /onmouseover\s*=/gi,
  /onfocus\s*=/gi,
  /onblur\s*=/gi,
  /onchange\s*=/gi,
  /onsubmit\s*=/gi,
  /onkeydown\s*=/gi,
  /onkeyup\s*=/gi,
  /onkeypress\s*=/gi,
  /onmousedown\s*=/gi,
  /onmouseup\s*=/gi,
  /onmousemove\s*=/gi,
  /onmouseout\s*=/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,
  /@import/gi,
  /eval\s*\(/gi,
  /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi,
];
// Caracteres HTML que necesitan ser escapados
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'};
/**
 * Escapa caracteres HTML peligrosos
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  return text.replace(/[&<>"'`=\/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}
/**
 * Desescapa caracteres HTML
 */
export function unescapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  const reverseMap: Record<string, string> = {};
  Object.entries(HTML_ESCAPE_MAP).forEach(([key, value]) => {
    reverseMap[value] = key;
  });
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;|&#x60;|&#x3D;/g, 
    (entity) => reverseMap[entity] || entity);
}
/**
 * Sanitiza texto removiendo patrones XSS peligrosos
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  let sanitized = input;
  // Remover patrones XSS conocidos
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  // Escapar caracteres HTML restantes
  sanitized = escapeHtml(sanitized);
  return sanitized.trim();
}
/**
 * Sanitiza texto pero preserva algunos tags HTML seguros
 */
export function sanitizeHtml(input: string, allowedTags: string[] = ['b', 'i', 'em', 'strong', 'p', 'br']): string {
  if (typeof input !== 'string') {
    return '';
  }
  let sanitized = input;
  // Remover patrones XSS peligrosos
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  // Remover todos los tags HTML excepto los permitidos
  const allowedTagsRegex = new RegExp(`<(?!\/?(?:${allowedTags.join('|')})\s*\/?>)[^>]+>`, 'gi');
  sanitized = sanitized.replace(allowedTagsRegex, '');
  // Escapar atributos en tags permitidos
  allowedTags.forEach(tag => {
    const tagRegex = new RegExp(`<${tag}[^>]*>`, 'gi');
    sanitized = sanitized.replace(tagRegex, `<${tag}>`);
  });
  return sanitized.trim();
}
/**
 * Sanitiza URLs para prevenir javascript: y data: URLs maliciosos
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }
  const trimmedUrl = url.trim().toLowerCase();
  // Bloquear protocolos peligrosos
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
  for (const protocol of dangerousProtocols) {
    if (trimmedUrl.startsWith(protocol)) {
      return '';
    }
  }
  // Permitir solo HTTP, HTTPS, mailto, tel, y URLs relativas
  const allowedProtocols = /^(https?:\/\/|mailto:|tel:|\/|\.\/|\.\.\/)/i;
  if (trimmedUrl.startsWith('http') || trimmedUrl.startsWith('mailto') || trimmedUrl.startsWith('tel')) {
    return allowedProtocols.test(url) ? url : '';
  }
  // URLs relativas son generalmente seguras
  if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./') || trimmedUrl.startsWith('../')) {
    return url;
  }
  // Si no tiene protocolo, asumir que es relativa
  if (!trimmedUrl.includes('://')) {
    return url;
  }
  return '';
}
/**
 * Sanitiza nombres de archivos
 */
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== 'string') {
    return '';
  }
  // Remover caracteres peligrosos para nombres de archivo
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .trim()
    .substring(0, 255); // Limitar longitud
}
/**
 * Sanitiza números
 */
export function sanitizeNumber(input: any): number | null {
  if (typeof input === 'number' && !isNaN(input) && isFinite(input)) {
    return input;
  }
  if (typeof input === 'string') {
    const parsed = parseFloat(input);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}
/**
 * Sanitiza emails
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
}
/**
 * Sanitiza entrada de email permitiendo escritura parcial
 * Esta función es más permisiva para permitir que el usuario escriba
 */
export function sanitizeEmailInput(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }
  // Solo remover caracteres peligrosos pero permitir escritura parcial
  let sanitized = email.trim();
  // Remover caracteres XSS peligrosos pero mantener caracteres válidos de email
  sanitized = sanitized.replace(/[<>'"]/g, '');
  // Verificar si contiene patrones XSS
  if (containsXSS(sanitized)) {
    return '';
  }
  return sanitized;
}
/**
 * Sanitiza teléfonos
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }
  // Remover todo excepto números, +, -, (, ), y espacios
  return phone.replace(/[^\d+\-() ]/g, '').trim();
}
/**
 * Sanitiza objetos recursivamente
 */
export function sanitizeObject<T>(obj: T, options: {
  sanitizeStrings?: boolean;
  sanitizeUrls?: boolean;
  allowedHtmlTags?: string[];
} = {}): T {
  const {
    sanitizeStrings = true,
    sanitizeUrls = false,
    allowedHtmlTags = ['b', 'i', 'em', 'strong']
  } = options;
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey =(key);
      if (typeof value === 'string') {
        if (sanitizeUrls && (key.toLowerCase().includes('url') || key.toLowerCase().includes('link'))) {
          sanitized[sanitizedKey] = sanitizeUrl(value);
        } else if (sanitizeStrings) {
          sanitized[sanitizedKey] = sanitizeHtml(value, allowedHtmlTags);
        } else {
          sanitized[sanitizedKey] = value;
        }
      } else if (typeof value === 'object') {
        sanitized[sanitizedKey] = sanitizeObject(value, options);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }
    return sanitized;
  }
  return obj;
}
/**
 * Valida si una cadena contiene contenido potencialmente peligroso
 */
export function containsXSS(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}
/**
 * Configuración de sanitización por defecto para diferentes tipos de campos
 */
export const SANITIZATION_CONFIGS = {
  // Para nombres, títulos, etc.
  text: {
    sanitizeStrings: true,
    sanitizeUrls: false,
    allowedHtmlTags: []
  },
  // Para descripciones, comentarios, etc.
  richText: {
    sanitizeStrings: true,
    sanitizeUrls: false,
    allowedHtmlTags: ['b', 'i', 'em', 'strong', 'p', 'br']
  },
  // Para contenido que puede incluir enlaces
  content: {
    sanitizeStrings: true,
    sanitizeUrls: true,
    allowedHtmlTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'a']
  },
  // Para datos que no deben contener HTML
  plain: {
    sanitizeStrings: true,
    sanitizeUrls: false,
    allowedHtmlTags: []
  }
};