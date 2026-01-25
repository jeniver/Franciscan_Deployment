import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockIcon, UserIcon, AlertCircleIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';

export function LoginPage() {
  const navigate = useNavigate();
  const { loginUser, loading, error, clearAuthError, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/niche');
    }
  }, [isAuthenticated, navigate]);

  // Clear error when user starts typing
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearAuthError();
      }, 5000); // Auto-clear error after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [error, clearAuthError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    try {
      const action = await loginUser(username.trim(), password);
      if (action?.type?.endsWith('/fulfilled')) {
        navigate('/niche');
      }
    } catch (err) {
      // Error is handled by the auth slice
      console.error('Login error:', err);
    }
  };

  const handleInputChange = (field: 'username' | 'password', value: string) => {
    if (error) clearAuthError(); // Clear error when user starts typing
    
    if (field === 'username') {
      setUsername(value);
    } else {
      setPassword(value);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600">
              Sign in to access the Columbarium Management System
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div className="text-red-700 text-sm">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Input
                label="Username"
                type="text"
                value={username}
                onChange={e => handleInputChange('username', e.target.value)}
                icon={<UserIcon className="w-5 h-5 text-gray-400" />}
                placeholder="Enter your username"
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <div>
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => handleInputChange('password', e.target.value)}
                icon={<LockIcon className="w-5 h-5 text-gray-400" />}
                placeholder="Enter your password"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full"
              disabled={loading || !username.trim() || !password.trim()}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Franciscan Columbarium Management System
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Default credentials: admin / admin123
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}