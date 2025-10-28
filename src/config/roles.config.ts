// Configuración de roles del sistema

export enum UserRole {
  ADMIN = 'admin',
  VENDOR = 'vendor',
  TRAINER = 'trainer',
  MEMBER = 'member'
}

export interface RoleConfig {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  defaultRoute: string;
}

export const ROLES_CONFIG: Record<UserRole, RoleConfig> = {
  [UserRole.ADMIN]: {
    name: 'admin',
    displayName: 'Administrador',
    description: 'Acceso completo al sistema',
    permissions: [
      'manage_users',
      'manage_memberships',
      'manage_products',
      'view_analytics',
      'manage_trainers',
      'manage_vendors',
      'system_settings'
    ],
    defaultRoute: '/admin/dashboard'
  },
  [UserRole.VENDOR]: {
    name: 'vendor',
    displayName: 'Proveedor',
    description: 'Gestión de productos y órdenes',
    permissions: [
      'manage_own_products',
      'view_own_orders',
      'manage_inventory',
      'view_sales_analytics'
    ],
    defaultRoute: '/vendor/dashboard'
  },
  [UserRole.TRAINER]: {
    name: 'trainer',
    displayName: 'Entrenador',
    description: 'Gestión de clientes y rutinas',
    permissions: [
      'view_assigned_members',
      'create_routines',
      'track_progress',
      'schedule_sessions',
      'view_member_analytics'
    ],
    defaultRoute: '/trainer/dashboard'
  },
  [UserRole.MEMBER]: {
    name: 'member',
    displayName: 'Miembro',
    description: 'Acceso a servicios del gimnasio',
    permissions: [
      'view_own_profile',
      'view_routines',
      'track_progress',
      'book_sessions',
      'purchase_products',
      'view_membership'
    ],
    defaultRoute: '/member/dashboard'
  }
};

export const DEFAULT_ROLE = UserRole.MEMBER;

// Utilidades para trabajar con roles
export const getRoleConfig = (role: UserRole): RoleConfig => {
  return ROLES_CONFIG[role];
};

export const hasPermission = (userRole: UserRole, permission: string): boolean => {
  const roleConfig = getRoleConfig(userRole);
  return roleConfig.permissions.includes(permission);
};

export const isValidRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

export const getRoleDisplayName = (role: UserRole): string => {
  return getRoleConfig(role).displayName;
};