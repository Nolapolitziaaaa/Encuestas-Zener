import api from './api';

const login = async (rut, password) => {
  const response = await api.post('/auth/login', { rut, password });
  const { user, accessToken, refreshToken } = response.data;

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));

  return user;
};

const register = async (token, password) => {
  const response = await api.post('/auth/register', { token, password });
  const { user, accessToken, refreshToken } = response.data;

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));

  return user;
};

const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (e) {
    // ignore
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

const getMe = async () => {
  const response = await api.get('/auth/me');
  const user = response.data;
  localStorage.setItem('user', JSON.stringify(user));
  return user;
};

const verifyInvite = async (token) => {
  const response = await api.get(`/auth/verify-invite/${token}`);
  return response.data;
};

const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/auth/change-password', { currentPassword, newPassword });
  return response.data;
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

const isAuthenticated = () => {
  return !!localStorage.getItem('accessToken');
};

export const authService = {
  login,
  register,
  logout,
  getMe,
  verifyInvite,
  changePassword,
  getStoredUser,
  isAuthenticated,
};
