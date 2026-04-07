import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { ClipboardList, Eye, EyeOff, Mail } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!rut || !password) {
      setError('RUT y contraseña son requeridos');
      return;
    }

    setLoading(true);
    try {
      const user = await login(rut, password);
      if (user.rol === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.error || err.message || 'Error de conexión al servidor';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail) {
      setForgotError('El email es requerido');
      return;
    }
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSent(true);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Error al enviar correo');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <img src="/logo.png" alt="Zener" className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white">Encuestas Zener Chile</h1>
          <p className="text-primary-200 mt-2">Sistema de Evaluación</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar Sesión</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">RUT</label>
              <input
                type="text"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder="12345678-9"
                className="input"
                autoFocus
              />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setShowForgot(true); setForgotSent(false); setForgotError(''); setForgotEmail(''); }}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        <p className="text-center text-primary-300 text-sm mt-6">
          Zener Chile &copy; {new Date().getFullYear()}
        </p>
      </div>

      {showForgot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            {!forgotSent ? (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-3">
                    <Mail className="w-6 h-6 text-primary-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Restablecer Contraseña</h2>
                  <p className="text-gray-500 text-sm mt-1">Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña</p>
                </div>

                {forgotError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {forgotError}
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="input"
                      autoFocus
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowForgot(false)}
                      className="flex-1 btn-secondary"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 btn-primary"
                    >
                      {forgotLoading ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Correo Enviado</h2>
                <p className="text-gray-500 text-sm mt-2">Si el email está registrado en el sistema, recibirás un correo con instrucciones para restablecer tu contraseña.</p>
                <button
                  onClick={() => setShowForgot(false)}
                  className="btn-primary mt-6 px-8"
                >
                  Volver al Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
