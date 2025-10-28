import React, { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { AuthService } from '../../services/auth';
import type { LoginData } from '../../services/auth';
import { useSanitizedForm } from '../../hooks/useSanitization';
import { sanitizeEmail, sanitizeEmailInput, containsXSS } from '../../utils/sanitization';
export interface LoginFormData {
  email: string;
  password: string;
}
export interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}
const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  className
}) => {
  const initialFormData: LoginFormData = {
    email: '',
    password: ''
  };
  const {
    data: formData,
    errors: sanitizationErrors,
    updateField,
    isFormValid: isSanitizationValid,
    getSanitizedData
  } = useSanitizedForm(initialFormData, 'text');
  const [validationErrors, setValidationErrors] = useState<Partial<LoginFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  // Combinar errores de sanitización y validación
  const errors = { ...validationErrors, ...sanitizationErrors };
  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    } else if (containsXSS(formData.email)) {
      newErrors.email = 'El email contiene caracteres no permitidos';
    }
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0 && isSanitizationValid;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      // Obtener datos sanitizados y aplicar sanitización final al email
      const sanitizedData = getSanitizedData();
      const loginData: LoginData = {
        email: sanitizeEmail(sanitizedData.email), // Sanitización final para validación completa
        password: sanitizedData.password
      };
      await AuthService.login(loginData);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value = e.target.value;
    // Aplicar sanitización específica según el tipo de campo
    if (field === 'email') {
      value = sanitizeEmailInput(value); // Usar la función más permisiva para entrada
    }
    updateField(field, value);
    // Clear error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };
  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          error={errors.email}
          placeholder="tu@email.com"
          disabled={isLoading}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          }
        />
        <Input
          label="Contraseña"
          type="password"
          value={formData.password}
          onChange={handleInputChange('password')}
          error={errors.password}
          placeholder="••••••••"
          disabled={isLoading}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </Button>
      </div>
    </form>
  );
};
export default LoginForm;