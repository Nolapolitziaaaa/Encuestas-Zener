import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User, LayoutDashboard, FileText, ClipboardList, Users, BarChart3, Settings } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();

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
                  <LayoutDashboard className="w-4 h-4 inline mr-1.5" />
                  Panel Admin
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <>
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
