import React, { useState } from 'react';
import { cn } from '../../utils/helpers';
import Header from './Header';
import Sidebar from './Sidebar';
import type { HeaderProps } from './Header';
import type { SidebarProps } from './Sidebar';
export interface LayoutProps {
  children: React.ReactNode;
  headerProps?: Omit<HeaderProps, 'className'>;
  sidebarProps?: Omit<SidebarProps, 'className' | 'isCollapsed' | 'onToggle'>;
  showSidebar?: boolean;
  className?: string;
}
const Layout: React.FC<LayoutProps> = ({
  children,
  headerProps,
  sidebarProps,
  showSidebar = true,
  className
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Header */}
      <Header {...headerProps} />
      <div className="flex">
        {/* Sidebar */}
        {showSidebar && sidebarProps && (
          <Sidebar
            {...sidebarProps}
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
            className="fixed top-16 left-0 h-[calc(100vh-4rem)] overflow-y-auto"
          />
        )}
        {/* Main Content */}
        <main className={cn(
          'flex-1 transition-all duration-300',
          showSidebar && sidebarProps
            ? isSidebarCollapsed 
              ? 'ml-16' 
              : 'ml-64'
            : 'ml-0'
        )}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
export default Layout;