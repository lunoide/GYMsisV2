import React from 'react';
import { cn } from '../../utils/helpers';
export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  badge?: string | number;
  children?: SidebarItem[];
}
export interface SidebarProps {
  items: SidebarItem[];
  isCollapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}
const Sidebar: React.FC<SidebarProps> = ({
  items,
  isCollapsed = false,
  onToggle,
  className
}) => {
  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const paddingLeft = level > 0 ? `pl-${8 + level * 4}` : 'pl-4';
    return (
      <div key={item.id}>
        <button
          onClick={item.onClick}
          className={cn(
            'w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
            paddingLeft,
            item.isActive
              ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <span className="flex-shrink-0 w-5 h-5">
            {item.icon}
          </span>
          {!isCollapsed && (
            <>
              <span className="ml-3 flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <svg
                  className="ml-2 w-4 h-4 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </>
          )}
        </button>
        {/* Render children if not collapsed */}
        {hasChildren && !isCollapsed && (
          <div className="mt-1">
            {item.children!.map(child => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className={cn(
      'bg-white border-r border-gray-200 transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64',
      className
    )}>
      {/* Toggle Button */}
      {onToggle && (
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg
              className={cn(
                'w-5 h-5 transition-transform',
                isCollapsed ? 'rotate-180' : ''
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      )}
      {/* Navigation Items */}
      <nav className="p-4 space-y-1">
        {items.map(item => renderSidebarItem(item))}
      </nav>
    </div>
  );
};
export default Sidebar;