import React from 'react';
import { MenuIcon, LogOutIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface MainHeaderProps {
  onMenuClick?: () => void;
}

export function MainHeader({
  onMenuClick
}: MainHeaderProps) {
  const { logoutUser, user, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to login even if logout fails
      navigate('/login');
    }
  };

  const getUserInitials = () => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'A'; // Default to 'A' for Admin
  };

  const getUserDisplayName = () => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase() + user.username.slice(1);
    }
    return 'Admin User';
  };

  const getUserRole = () => {
    if (user?.role) {
      return user.role.charAt(0).toUpperCase() + user.role.slice(1);
    }
    return 'System Administrator';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-full mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onMenuClick && (
              <button onClick={onMenuClick} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MenuIcon className="w-6 h-6 text-gray-700" />
              </button>
            )}
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Franciscan Columbarium Logo" 
                className="h-12 w-auto object-contain"
              />
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-xl font-bold text-gray-900">
                  Franciscan Columbarium
                </h1>
                <p className="text-xs text-gray-600">Management System</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
              <p className="text-xs text-gray-500">{getUserRole()}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-[#7d1f1f] to-[#5a1616] rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
              {getUserInitials()}
            </div>
            <button 
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Logout"
            >
              <LogOutIcon className="w-4 h-4" />
              <span className="hidden md:inline">{loading ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}