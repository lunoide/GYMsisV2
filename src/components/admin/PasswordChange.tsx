import React, { useState } from 'react';
import { Modal, Button } from '../ui';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { Eye, EyeOff, Lock, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { RateLimitService } from '../../services/security/rateLimitService';
import { logger } from '../../utils/logger';
interface PasswordChangeProps {
  isOpen: boolean;
  onClose: () => void;
}
const PasswordChange: React.FC<PasswordChangeProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra mayúscula');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra minúscula');
    }
    if (!/\d/.test(password)) {
      errors.push('La contraseña debe contener al menos un número');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('La contraseña debe contener al menos un carácter especial');
    }
    return errors;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccess(false);
    // Validaciones
    const validationErrors: string[] = [];
    if (!formData.currentPassword) {
      validationErrors.push('La contraseña actual es requerida');
    }
    if (!formData.newPassword) {
      validationErrors.push('La nueva contraseña es requerida');
    } else {
      const passwordErrors = validatePassword(formData.newPassword);
      validationErrors.push(...passwordErrors);
    }
    if (formData.newPassword !== formData.confirmPassword) {
      validationErrors.push('Las contraseñas no coinciden');
    }
    if (formData.currentPassword === formData.newPassword) {
      validationErrors.push('La nueva contraseña debe ser diferente a la actual');
    }
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    const user = auth.currentUser;
    if (!user || !user.email) {
      setErrors(['Usuario no autenticado']);
      return;
    }
    // Verificar rateing antes del intento de cambio de contraseña
    const rateLimitResult = RateLimitService.checkRateLimit(
      user.email,
      RateLimitService.CONFIGS.PASSWORD_CHANGE,
      'password_change'
    );
    if (!rateLimitResult.allowed) {
      setErrors([`Demasiados intentos de cambio de contraseña. Intenta nuevamente en ${Math.ceil(rateLimitResult.retryAfter! / 60)} minutos.`]);
      return;
    }
    setIsLoading(true);
    try {
      // Reautenticar al usuario
      const credential = EmailAuthProvider.credential(user.email, formData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      // Actualizar la contraseña
      await updatePassword(user, formData.newPassword);
      // Registrar intento exitoso de cambio de contraseña
      RateLimitService.recordAttempt(user.email, RateLimitService.CONFIGS.PASSWORD_CHANGE, true, 'password_change');
      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      // Cerrar el modal después de 2 segundos
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (error: any) {
      logger.error('Error changing password:', error);
      // Registrar intento fallido de cambio de contraseña
      RateLimitService.recordAttempt(user.email, RateLimitService.CONFIGS.PASSWORD_CHANGE, false, 'password_change');
      let errorMessage = 'Error al cambiar la contraseña';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'La contraseña actual es incorrecta';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La nueva contraseña es muy débil';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Por seguridad, necesitas iniciar sesión nuevamente';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Intenta más tarde';
      }
      setErrors([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };
    let score = 0;
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password),
      password.length >= 12
    ];
    score = checks.filter(Boolean).length;
    if (score <= 2) return { strength: score, label: 'Débil', color: 'bg-red-500' };
    if (score <= 4) return { strength: score, label: 'Media', color: 'bg-yellow-500' };
    return { strength: score, label: 'Fuerte', color: 'bg-green-500' };
  };
  const passwordStrength = getPasswordStrength(formData.newPassword);
  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrors([]);
    setSuccess(false);
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    onClose();
  };
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cambio de Contraseña" size="md">
      <div className="space-y-6">
        {/* Header con información de seguridad */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Seguridad de la Contraseña</h4>
              <p className="text-sm text-blue-700 mt-1">
                Por tu seguridad, asegúrate de usar una contraseña fuerte y única.
              </p>
            </div>
          </div>
        </div>
        {/* Mensajes de error */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-red-900">Errores encontrados:</h4>
                <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        {/* Mensaje de éxito */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-green-900">¡Contraseña actualizada!</h4>
                <p className="text-sm text-green-700">Tu contraseña ha sido cambiada exitosamente.</p>
              </div>
            </div>
          </div>
        )}
        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña Actual *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingresa tu contraseña actual"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={isLoading}
              >
                {showPasswords.current ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>
          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Contraseña *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingresa tu nueva contraseña"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={isLoading}
              >
                {showPasswords.new ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {/* Indicador de fortaleza de contraseña */}
            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Fortaleza de la contraseña:</span>
                  <span className={`font-medium ${
                    passwordStrength.label === 'Fuerte' ? 'text-green-600' :
                    passwordStrength.label === 'Media' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.strength / 6) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Nueva Contraseña *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirma tu nueva contraseña"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={isLoading}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">Las contraseñas no coinciden</p>
            )}
          </div>
          {/* Requisitos de contraseña */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Requisitos de la contraseña:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  formData.newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Al menos 8 caracteres
              </li>
              <li className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  /[A-Z]/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Una letra mayúscula
              </li>
              <li className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  /[a-z]/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Una letra minúscula
              </li>
              <li className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  /\d/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Un número
              </li>
              <li className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                Un carácter especial (!@#$%^&*(),.?":{}|&lt;&gt;)
              </li>
            </ul>
          </div>
          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              disabled={isLoading || success}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
export default PasswordChange;