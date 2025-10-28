import { useState, useEffect } from 'react';
import { Navbar, Footer } from './layout';
import { Home, ProductCatalog } from '../pages/public';
import RewardsPage from '../pages/public/RewardsPage';
import PlansPage from '../pages/public/PlansPage';
import AboutPage from '../pages/public/AboutPage';
import { Modal } from './ui';
import { LoginForm, UserForm } from './forms';
import { MemberDashboard, AdminDashboard, VendorDashboard, TrainerDashboard } from './dashboard';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../config/roles.config';
import { runAuthDiagnostic, checkTrainerPermissions, makeCurrentUserAdmin, getCurrentUserInfo } from '../utils/authDiagnostic';
import { logger } from '../utils/logger';
const AppContent = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const { user, profile, logout } = useAuth();
  // Ajustar currentPage inicial para usuarios autenticados
  const [hasInitialized, setHasInitialized] = useState(false);
  // Efecto para establecer la página inicial correcta
  useEffect(() => {
    if (!hasInitialized && user && currentPage === 'home') {
      setCurrentPage('dashboard');
      setHasInitialized(true);
    } else if (!hasInitialized && !user) {
      setHasInitialized(true);
    }
  }, [user, hasInitialized, currentPage]);
  // Diagnóstico temporal de autenticación
  useEffect(() => {
    if (user) {
      logger.log('🔍 Ejecutando diagnóstico de autenticación...');
      runAuthDiagnostic();
      checkTrainerPermissions();
      // Hacer las funciones disponibles globalmente para debugging
      (window as any).runAuthDiagnostic = runAuthDiagnostic;
      (window as any).checkTrainerPermissions = checkTrainerPermissions;
      (window as any).makeCurrentUserAdmin = makeCurrentUserAdmin;
      (window as any).getCurrentUserInfo = getCurrentUserInfo;
      logger.log('🛠️ Funciones de diagnóstico disponibles:');
      logger.log('- runAuthDiagnostic()');
      logger.log('- checkTrainerPermissions()');
      logger.log('- getCurrentUserInfo()');
      logger.log('- makeCurrentUserAdmin()');
    }
  }, [user]);
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      logger.error('Error al cerrar sesión:', error);
    }
  };
  const handleLoginClick = () => {
    setShowLoginModal(true);
  };
  const handleSignupClick = () => {
    setShowSignupModal(true);
  };
  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar - mostrar siempre */}
      <Navbar 
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
        onNavigate={handleNavigate}
        user={profile}
        onLogout={handleLogout}
      />
      {/* Main Content */}
      <main className={user ? "min-h-screen" : "flex-1"}>
        {/* Navegación basada en currentPage - disponible para todos los usuarios */}
        {currentPage === 'products' ? (
          <ProductCatalog />
        ) : currentPage === 'rewards' ? (
          <RewardsPage />
        ) : currentPage === 'plans' ? (
          <PlansPage />
        ) : currentPage === 'about' ? (
          <AboutPage />
        ) : currentPage === 'home' ? (
          <Home />
        ) : user ? (
          // Usuario autenticado - mostrar dashboard según rol (cuando currentPage es 'dashboard' o por defecto)
          user.role === UserRole.ADMIN ? (
            <AdminDashboard />
          ) : user.role === UserRole.MEMBER ? (
            <MemberDashboard />
          ) : user.role === UserRole.VENDOR ? (
            <VendorDashboard />
          ) : user.role === UserRole.TRAINER ? (
            <TrainerDashboard />
          ) : (
            // Para otros roles no definidos
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Rol no reconocido
                </h2>
                <p className="text-gray-600">
                  El rol {user.role} no está configurado en el sistema.
                </p>
              </div>
            </div>
          )
        ) : (
          // Usuario no autenticado - mostrar página de inicio por defecto
          <Home />
        )}
      </main>
      {/* Footer - solo mostrar si el usuario no está autenticado */}
      {!user && <Footer />}
      {/* Login Modal */}
      <Modal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Iniciar Sesión"
        size="md"
      >
        <LoginForm 
          onSuccess={() => {
            setShowLoginModal(false);
            // El AuthContext se actualizará automáticamente
          }}
        />
      </Modal>
      {/* Signup Modal */}
      <Modal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        title="Registrarse"
        size="lg"
      >
        <UserForm
          onSuccess={() => {
            setShowSignupModal(false);
            alert('¡Registro exitoso! Revisa tu email para verificar tu cuenta.');
          }}
        />
      </Modal>
    </div>
  );
};
export default AppContent;