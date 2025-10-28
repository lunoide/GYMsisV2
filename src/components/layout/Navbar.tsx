import { useState } from 'react';
import { Button } from '../ui';
import { cn } from '../../utils/helpers';
import type { UserProfile } from '../../services/auth';
export interface NavbarProps {
  className?: string;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  onNavigate?: (page: string) => void;
  user?: UserProfile | null;
  onLogout?: () => void;
}
const Navbar = ({ className, onLoginClick, onSignupClick, onNavigate, user, onLogout }: NavbarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navItems = [
    { label: 'Inicio', href: '#inicio', page: 'home' },
    { label: 'Productos', href: '#productos', page: 'products' },
    { label: 'Canje de puntos', href: '#canje', page: 'rewards' },
    { label: 'Planes', href: '#planes', page: 'plans' },
    { label: 'Nosotros', href: '#nosotros', page: 'about' }
  ];
  // Agregar enlace al dashboard si el usuario está autenticado
  const allNavItems = user 
    ? [{ label: 'Dashboard', href: '#dashboard', page: 'dashboard' }, ...navItems]
    : navItems;
  return (
    <nav className={cn(
      'bg-white shadow-lg sticky top-0 z-50',
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-800">
                GYMsis
              </span>
            </div>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {allNavItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => onNavigate?.(item.page)}
                  className="text-gray-600 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              // Usuario autenticado
              <div className="flex items-center space-x-4">
                <span className="text-gray-700 text-sm">
                  Hola, {user.firstName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                >
                  Cerrar Sesión
                </Button>
              </div>
            ) : (
              // Usuario no autenticado
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoginClick}
                >
                  Iniciar Sesión
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onSignupClick}
                >
                  Registrarse
                </Button>
              </>
            )}
          </div>
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Abrir menú principal</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            {allNavItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  onNavigate?.(item.page);
                  setIsMenuOpen(false);
                }}
                className="text-gray-600 hover:text-blue-600 block px-3 py-2 text-base font-medium w-full text-left"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex flex-col space-y-2 px-3">
                {user ? (
                  // Usuario autenticado - móvil
                  <>
                    <div className="px-3 py-2 text-gray-700 text-sm">
                      Hola, {user.firstName}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onLogout?.();
                        setIsMenuOpen(false);
                      }}
                      className="justify-start"
                    >
                      Cerrar Sesión
                    </Button>
                  </>
                ) : (
                  // Usuario no autenticado - móvil
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onLoginClick?.();
                        setIsMenuOpen(false);
                      }}
                      className="justify-start"
                    >
                      Iniciar Sesión
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onSignupClick?.();
                        setIsMenuOpen(false);
                      }}
                      className="justify-start"
                    >
                      Registrarse
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
export default Navbar;