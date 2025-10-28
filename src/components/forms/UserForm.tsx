import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { AuthService } from '../../services/auth';
import type { RegisterData } from '../../types/auth.types';
import { useSanitizedForm } from '../../hooks/useSanitization';
import {sanitizeEmail, sanitizeEmailInput, sanitizePhone, containsXSS } from '../../utils/sanitization';
export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}
export interface UserFormProps {
  initialData?: Partial<UserFormData>;
  onSubmit?: (data: UserFormData) => Promise<void>;
  onSuccess?: () => void;
  isLoading?: boolean;
  error?: string;
  isEdit?: boolean;
  className?: string;
}
const UserForm: React.FC<UserFormProps> = ({
  initialData,
  onSubmit,
  onSuccess,
  isLoading: externalLoading = false,
  error: externalError,
  isEdit = false,
  className
}) => {
  const initialFormData: UserFormData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    ...initialData
  };
  const {
    data: formData,
    errors: sanitizationErrors,
    updateField,
    updateData,
    isFormValid: isSanitizationValid,
    getSanitizedData
  } = useSanitizedForm(initialFormData, 'text');
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof UserFormData | 'emergencyContact.name' | 'emergencyContact.phone' | 'emergencyContact.relationship', string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  // Combinar errores de sanitización y validación
  const errors = { ...validationErrors, ...sanitizationErrors };
  useEffect(() => {
    if (initialData) {
      updateData({
        ...initialData,
        emergencyContact: {
          ...formData.emergencyContact,
          ...initialData.emergencyContact
        }
      });
    }
  }, [initialData, updateData]);
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UserFormData | 'emergencyContact.name' | 'emergencyContact.phone' | 'emergencyContact.relationship', string>> = {};
    // Validaciones básicas con sanitización
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    } else if (containsXSS(formData.firstName)) {
      newErrors.firstName = 'El nombre contiene caracteres no permitidos';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    } else if (containsXSS(formData.lastName)) {
      newErrors.lastName = 'El apellido contiene caracteres no permitidos';
    }
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    } else if (containsXSS(formData.email)) {
      newErrors.email = 'El email contiene caracteres no permitidos';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono no es válido';
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'La fecha de nacimiento es requerida';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 16) {
        newErrors.dateOfBirth = 'Debes tener al menos 16 años';
      }
    }
    // Validaciones de contraseña (solo para registro)
    if (!isEdit) {
      if (!formData.password) {
        newErrors.password = 'La contraseña es requerida';
      } else if (formData.password.length < 6) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirma la contraseña';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }
    // Validaciones de contacto de emergencia con sanitización
    if (!formData.emergencyContact.name.trim()) {
      newErrors['emergencyContact.name'] = 'El nombre del contacto de emergencia es requerido';
    } else if (containsXSS(formData.emergencyContact.name)) {
      newErrors['emergencyContact.name'] = 'El nombre del contacto contiene caracteres no permitidos';
    }
    if (!formData.emergencyContact.phone.trim()) {
      newErrors['emergencyContact.phone'] = 'El teléfono del contacto de emergencia es requerido';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.emergencyContact.phone)) {
      newErrors['emergencyContact.phone'] = 'El teléfono del contacto de emergencia no es válido';
    }
    if (!formData.emergencyContact.relationship.trim()) {
      newErrors['emergencyContact.relationship'] = 'La relación del contacto de emergencia es requerida';
    } else if (containsXSS(formData.emergencyContact.relationship)) {
      newErrors['emergencyContact.relationship'] = 'La relación contiene caracteres no permitidos';
    }
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0 && isSanitizationValid;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      // Obtener datos sanitizados
      const sanitizedData = getSanitizedData();
      if (onSubmit) {
        // Aplicar sanitización final al email antes de enviar
        const finalData = {
          ...sanitizedData,
          email: sanitizeEmail(sanitizedData.email)
        };
        await onSubmit(finalData);
      } else {
        // Usar AuthService por defecto para registro
        const registerData: RegisterData = {
          email: sanitizeEmail(sanitizedData.email), // Sanitización final para validación completa
          password: sanitizedData.password,
          firstName: sanitizedData.firstName,
          lastName: sanitizedData.lastName,
          dateOfBirth: new Date(sanitizedData.dateOfBirth),
          emergencyContact: sanitizedData.emergencyContact
        };
        await AuthService.register(registerData);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar el formulario';
      setSubmitError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  const handleInputChange = (field: keyof UserFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    let value = e.target.value;
    // Aplicar sanitización específica según el tipo de campo
    if (field === 'email') {
      value = sanitizeEmailInput(value);
    } else if (field === 'phone') {
      value = sanitizePhone(value);
    } else if (typeof value === 'string') {
      value =(value);
    }
    updateField(field, value);
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };
  const handleEmergencyContactChange = (field: keyof UserFormData['emergencyContact']) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value = e.target.value;
    // Aplicar sanitización
    if (field === 'phone') {
      value = sanitizePhone(value);
    } else {
      value =(value);
    }
    updateField('emergencyContact', {
      ...formData.emergencyContact,
      [field]: value
    });
    // Limpiar error del campo cuando el usuario empiece a escribir
    const errorKey = `emergencyContact.${field}` as const;
    if (validationErrors[errorKey]) {
      setValidationErrors(prev => ({
        ...prev,
        [errorKey]: undefined
      }));
    }
  };
  const loading = isLoading || externalLoading;
  const displayError = submitError || externalError;
  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4 sm:space-y-6">
        {/* Error general */}
        {displayError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {displayError}
          </div>
        )}
        {/* Información personal */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Información Personal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={formData.firstName}
              onChange={handleInputChange('firstName')}
              error={errors.firstName}
              placeholder="Tu nombre"
              required
            />
            <Input
              label="Apellido"
              value={formData.lastName}
              onChange={handleInputChange('lastName')}
              error={errors.lastName}
              placeholder="Tu apellido"
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={errors.email}
            placeholder="tu@email.com"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              error={errors.phone}
              placeholder="+56 9 1234 5678"
              required
            />
            <Input
              label="Fecha de Nacimiento"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleInputChange('dateOfBirth')}
              error={errors.dateOfBirth}
              required
            />
          </div>
        </div>
        {/* Contraseñas (solo para registro) */}
        {!isEdit && (
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Seguridad</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contraseña"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                error={errors.password}
                placeholder="Mínimo 6 caracteres"
                required
              />
              <Input
                label="Confirmar Contraseña"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                error={errors.confirmPassword}
                placeholder="Repite la contraseña"
                required
              />
            </div>
          </div>
        )}
        {/* Contacto de emergencia */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Contacto de Emergencia</h3>
          <Input
            label="Nombre del Contacto"
            value={formData.emergencyContact.name}
            onChange={handleEmergencyContactChange('name')}
            error={errors['emergencyContact.name']}
            placeholder="Nombre completo"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Teléfono del Contacto"
              type="tel"
              value={formData.emergencyContact.phone}
              onChange={handleEmergencyContactChange('phone')}
              error={errors['emergencyContact.phone']}
              placeholder="+56 9 1234 5678"
              required
            />
            <Input
              label="Relación"
              value={formData.emergencyContact.relationship}
              onChange={handleEmergencyContactChange('relationship')}
              error={errors['emergencyContact.relationship']}
              placeholder="Ej: Madre, Padre, Hermano/a"
              required
            />
          </div>
        </div>
        {/* Botón de envío */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={loading}
          >
            {isEdit ? 'Actualizar Perfil' : 'Registrarse'}
          </Button>
        </div>
      </div>
    </form>
  );
};
export default UserForm;