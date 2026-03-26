import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Search, UserCheck, UserX, Users } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    loadUsers();
  }, [roleFilter, search]);

  const loadUsers = async () => {
    try {
      const params = {};
      if (roleFilter !== 'all') params.rol = roleFilter;
      if (search) params.search = search;
      const response = await api.get('/users', { params });
      setUsers(response.data.users || response.data || []);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/users/${user.id}/toggle-active`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, activo: !u.activo } : u))
      );
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-600">Gestiona los usuarios del sistema</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="input pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          {['all', 'usuario', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === r ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {r === 'all' ? 'Todos' : r === 'admin' ? 'Admins' : 'Usuarios'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {users.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay usuarios</p>
        </div>
      ) : (
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Nombre</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">RUT</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Email</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Rol</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Estado</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Último acceso</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!user.activo ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {user.nombre} {user.apellido}
                  </td>
                  <td className="py-3 px-4 text-gray-500">{user.rut}</td>
                  <td className="py-3 px-4 text-gray-500">{user.email}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={user.rol === 'admin' ? 'badge-blue' : 'badge-gray'}>
                      {user.rol}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={user.activo ? 'badge-green' : 'badge-red'}>
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500">
                    {user.ultimo_acceso
                      ? new Date(user.ultimo_acceso).toLocaleDateString('es-CL')
                      : 'Nunca'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => toggleActive(user)}
                      className={`p-1 rounded ${user.activo ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-green-400 hover:text-green-600 hover:bg-green-50'}`}
                      title={user.activo ? 'Desactivar' : 'Activar'}
                    >
                      {user.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
