import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Bell, Check, CheckCheck, MessageSquare } from 'lucide-react';
import notificationService from '../../services/notificationService';
// notifications-v2

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  return `hace ${diffDays}d`;
}

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notificaciones, setNotificaciones] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Poll unread count every 30s
  useEffect(() => {
    if (!isAdmin) return;

    const fetchCount = () => {
      notificationService.unreadCount()
        .then((data) => setUnreadCount(data.count))
        .catch(() => {});
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = async () => {
    if (!showDropdown) {
      try {
        const data = await notificationService.list({ limit: 10 }).then((r) => r);
        setNotificaciones(data.notificaciones || []);
      } catch {
        // silently fail
      }
    }
    setShowDropdown((prev) => !prev);
  };

  const handleMarkRead = async (notif) => {
    try {
      await notificationService.markRead(notif.id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  const handleNotifClick = (notif) => {
    handleMarkRead(notif);
    setShowDropdown(false);
    if (notif.formulario_id) {
      navigate(`/admin/reports/details?viewResponse=${notif.formulario_id}&t=${Date.now()}`);
    }
  };

  return (
    <nav className="bg-primary-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 font-bold text-lg">
              <img src="/logo.png" alt="Zener" className="w-7 h-7" />
              <span>Encuestas Zener Chile</span>
            </Link>
            {isAdmin && (
              <div className="hidden md:flex items-center space-x-1">
                <Link to="/admin" className="px-3 py-1.5 rounded-md text-sm text-primary-100 hover:bg-primary-800 hover:text-white transition-colors">
                  Panel Admin
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <>
                {/* Bell notification */}
                {isAdmin && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={toggleDropdown}
                      className="relative text-primary-200 hover:text-white transition-colors p-1"
                      title="Notificaciones"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {showDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                          <span className="text-sm font-semibold text-gray-700">Notificaciones</span>
                          {/* v2 */}
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 font-medium"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              Marcar todas
                            </button>
                          )}
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                          {notificaciones.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-400 text-sm">
                              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              Sin notificaciones
                            </div>
                          ) : (
                            notificaciones.map((notif) => (
                              <button
                                key={notif.id}
                                onClick={() => handleNotifClick(notif)}
                                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                                  !notif.leida ? 'bg-blue-50/50' : ''
                                }`}
                              >
                                {!notif.leida && (
                                  <span className="mt-1.5 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                                {notif.leida && (
                                  <span className="mt-1.5 w-2 h-2 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">
                                    {notif.proveedor_nombre}
                                    {notif.proveedor_empresa && (
                                      <span className="text-gray-500 font-normal"> &mdash; {notif.proveedor_empresa}</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {notif.mensaje}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {timeAgo(notif.created_at)}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <span className="text-sm text-primary-200 hidden sm:block">
                  {user.nombre} {user.apellido}
                </span>
                <span className="badge bg-primary-700 text-primary-100 text-xs">
                  {isAdmin ? 'Admin' : 'Usuario'}
                </span>
                <button
                  onClick={logout}
                  className="text-primary-200 hover:text-white transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
