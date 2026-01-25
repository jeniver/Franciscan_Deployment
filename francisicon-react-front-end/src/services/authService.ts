import api from './api';

// Vite exposes env vars via import.meta.env.VITE_*
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3000';

const COOKIE_NAME_ACCESS = 'fc_access_token';
const COOKIE_NAME_REFRESH = 'fc_refresh_token';

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name: string) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

const login = async (username: string, password: string) => {
  try {
    const url = `${API_BASE}/api/login/login`;
    const { data } = await api.post(url, { username, password });

    // Handle the response from your backend login API
    // Your API returns: { success: true, message: "Login successful", data: { user: {...}, token: "..." } }
    if (data?.success && data?.data?.token) {
      setCookie(COOKIE_NAME_ACCESS, data.data.token);
    }
    
    // Note: Your API doesn't seem to return refresh_token, so we'll skip that for now
    // if (data?.data?.refresh_token) {
    //   setCookie(COOKIE_NAME_REFRESH, data.data.refresh_token);
    // }

    // Return user data - map from your actual API response structure
    return { 
      user: data.data.user ? {
        id: data.data.user.userId,
        username: data.data.user.userName,
        email: data.data.user.email || '',
        role: data.data.user.roleId?.toString() || 'user',
        employeeId: data.data.user.employeeId,
        roleId: data.data.user.roleId,
        active: data.data.user.active,
        isLocked: data.data.user.isLocked,
        failedLoginAttempts: data.data.user.failedLoginAttempts,
        lastLoginDate: data.data.user.lastLoginDate,
        createdDate: data.data.user.createdDate,
        modifiedDate: data.data.user.modifiedDate,
        churchId: data.data.user.churchId
      } : {
        id: 1,
        username: username,
        email: '',
        role: 'user'
      }
    };
  } catch (error: any) {
    // Handle different error types from your backend
    if (error.response?.status === 401) {
      throw new Error('Invalid username or password');
    } else if (error.response?.status === 429) {
      throw new Error('Too many login attempts. Please try again later.');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Login failed. Please try again.');
    }
  }
};

const getAccessToken = () => getCookie(COOKIE_NAME_ACCESS);
const getRefreshToken = () => getCookie(COOKIE_NAME_REFRESH);

const clearTokens = () => {
  deleteCookie(COOKIE_NAME_ACCESS);
  deleteCookie(COOKIE_NAME_REFRESH);
};

// Check if user is authenticated by verifying token exists and is not expired
const isAuthenticated = () => {
  const token = getAccessToken();
  if (!token) return false;
  
  try {
    // Decode JWT token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch {
    return false;
  }
};

// Refresh access token using refresh token
// Note: Your API doesn't seem to support token refresh, so we'll just clear tokens on 401
const refreshAccessToken = async () => {
  // Since your API doesn't provide refresh tokens, we'll just throw an error
  // This will trigger the interceptor to redirect to login
  clearTokens();
  throw new Error('Token refresh not supported - please login again');
};

// Logout user
const logout = async () => {
  try {
    // Since your API doesn't provide refresh tokens, we'll just clear local tokens
    // You might want to call a logout endpoint if your API supports it
    // await api.post(`${API_BASE}/api/login/logout`);
  } catch (error) {
    // Continue with logout even if server call fails
    console.warn('Logout server call failed:', error);
  } finally {
    clearTokens();
  }
};

export default {
  login,
  logout,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  isAuthenticated,
  clearTokens,
};
