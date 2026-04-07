import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, BarChart3, ClipboardList, ChevronDown, ChevronRight, List } from 'lucide-react';

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/templates', icon: FileText, label: 'Plantillas' },
  { to: '/admin/forms', icon: ClipboardList, label: 'Formularios' },
  { to: '/admin/users', icon: Users, label: 'Usuarios' },
];

const reportsSubMenu = [
  { to: '/admin/reports', icon: LayoutDashboard, label: 'Resumen' },
  { to: '/admin/reports/details', icon: List, label: 'Detalles' },
];

export default function Sidebar() {
  const [reportsOpen, setReportsOpen] = useState(true);
  const location = useLocation();
  const isReportsActive = location.pathname.startsWith('/admin/reports');

  return (
    <aside className="w-60 bg-white border-r border-gray-200 min-h-[calc(100vh-3.5rem)] hidden lg:block">
      <nav className="p-4 space-y-1">
        {adminLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5 mr-3" />
            {label}
          </NavLink>
        ))}

        {/* Reportes con submenú */}
        <div>
          <button
            onClick={() => setReportsOpen(!reportsOpen)}
            className={`flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isReportsActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-5 h-5 mr-3" />
            <span className="flex-1 text-left">Reportes</span>
            {reportsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {reportsOpen && (
            <div className="ml-6 mt-1 space-y-1">
              {reportsSubMenu.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin/reports'}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
