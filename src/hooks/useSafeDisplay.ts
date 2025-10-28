import { useMemo } from 'react';
import {sanitizeHtml, sanitizeUrl, containsXSS } from '../utils/sanitization';
/**
 * Hook para sanitizar contenido que se muestra en componentes
 * Previene XSS en texto, HTML y URLs mostrados al usuario
 */
export const useSafeDisplay = () => {
  return useMemo(() => ({
    /**
     * Sanitiza texto plano para mostrar de forma segura
     */
    safeText: (text: string | null | undefined): string => {
      if (!text) return '';
      return(text);
    },
    /**
     * Sanitiza HTML para mostrar de forma segura
     */
    safeHtml: (html: string | null | undefined): string => {
      if (!html) return '';
      return sanitizeHtml(html);
    },
    /**
     * Sanitiza URL para mostrar de forma segura
     */
    safeUrl: (url: string | null | undefined): string => {
      if (!url) return '';
      return sanitizeUrl(url);
    },
    /**
     * Sanitiza nombre completo combinando firstName y lastName
     */
    safeFullName: (firstName: string | null | undefined, lastName: string | null | undefined): string => {
      const first = firstName ?(firstName) : '';
      const last = lastName ?(lastName) : '';
      return `${first} ${last}`.trim();
    },
    /**
     * Sanitiza email para mostrar
     */
    safeEmail: (email: string | null | undefined): string => {
      if (!email) return '';
      return(email);
    },
    /**
     * Sanitiza teléfono para mostrar
     */
    safePhone: (phone: string | null | undefined): string => {
      if (!phone) return '';
      return(phone);
    },
    /**
     * Verifica si el contenido contiene XSS antes de mostrarlo
     */
    isContentSafe: (content: string | null | undefined): boolean => {
      if (!content) return true;
      return !containsXSS(content);
    },
    /**
     * Sanitiza un objeto completo de usuario para mostrar
     */
    safeUserDisplay: (user: any) => {
      if (!user) return null;
      return {
        ...user,
        firstName:(user.firstName || ''),
        lastName:(user.lastName || ''),
        email:(user.email || ''),
        phone:(user.phone || ''),
        fullName: (() => {
          const first = user.firstName ?(user.firstName) : '';
          const last = user.lastName ?(user.lastName) : '';
          return `${first} ${last}`.trim();
        })(),
        emergencyContact: user.emergencyContact ? {
          name:(user.emergencyContact.name || ''),
          phone:(user.emergencyContact.phone || ''),
          relationship:(user.emergencyContact.relationship || '')
        } : null
      };
    },
    /**
     * Sanitiza contenido de notificaciones
     */
    safeNotification: (notification: any) => {
      if (!notification) return null;
      return {
        ...notification,
        message:(notification.message || ''),
        title:(notification.title || ''),
        description:(notification.description || '')
      };
    },
    /**
     * Sanitiza contenido de comentarios o descripciones
     */
    safeDescription: (description: string | null | undefined, allowHtml: boolean = false): string => {
      if (!description) return '';
      if (allowHtml) {
        return sanitizeHtml(description);
      }
      return(description);
    }
  }), []);
};
export default useSafeDisplay;