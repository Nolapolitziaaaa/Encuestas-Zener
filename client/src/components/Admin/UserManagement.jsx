import { useState, useEffect } from 'react';
import api from '../../services/api';
import invitationService from '../../services/invitationService';
import Modal from '../Common/Modal';
import {
  Search, UserCheck, UserX, Users, KeyRound, Plus, Trash2,
  Mail, Send, UserPlus, CheckCircle, AlertTriangle, Pencil, Download
} from 'lucide-react';

const TABS = [
  { key: 'users', label: 'Usuarios' },
  { key: 'invitations', label: 'Invitaciones' },
];

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-600">Gestiona usuarios e invitaciones del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'invitations' && <InvitationsTab />}
    </div>
  );
}

/* ─── Tab: Usuarios ─── */
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [resetStatus, setResetStatus] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const handleExportExcel = async () => {
    try {
      const response = await api.get('/users/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'usuarios.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

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

  const handleResetPassword = async (user) => {
    if (!confirm(`¿Enviar correo de restablecimiento a ${user.email}?`)) return;
    try {
      await api.post(`/auth/reset-password/${user.id}`);
      setResetStatus({ userId: user.id, ok: true });
      setTimeout(() => setResetStatus(null), 4000);
    } catch (err) {
      setResetStatus({ userId: user.id, ok: false, error: err.response?.data?.error || err.message });
      setTimeout(() => setResetStatus(null), 4000);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser.nombre) {
      alert('El nombre es requerido');
      return;
    }
    try {
      const { id, ...data } = editingUser;
      const result = await api.put(`/users/${id}`, data);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...result.data } : u))
      );
      setEditingUser(null);
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
    <>
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
        <button
          onClick={handleExportExcel}
          className="btn-secondary flex items-center text-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Descargar Excel
        </button>
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
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Empresa</th>
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
                  <td className="py-3 px-4 text-gray-500">{user.empresa || '-'}</td>
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
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 rounded text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="p-1.5 rounded text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Restablecer contraseña"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(user)}
                        className={`p-1.5 rounded ${user.activo ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-green-400 hover:text-green-600 hover:bg-green-50'} transition-colors`}
                        title={user.activo ? 'Desactivar' : 'Activar'}
                      >
                        {user.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Editar Usuario */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Editar Usuario">
        {editingUser && (
          <div className="space-y-4">
            <div>
              <label className="label">RUT</label>
              <input type="text" value={editingUser.rut || ''} onChange={(e) => setEditingUser((p) => ({ ...p, rut: e.target.value }))} className="input" placeholder="12345678-9" />
            </div>
            <div>
              <label className="label">Nombre *</label>
              <input type="text" value={editingUser.nombre} onChange={(e) => setEditingUser((p) => ({ ...p, nombre: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input type="text" value={editingUser.apellido} onChange={(e) => setEditingUser((p) => ({ ...p, apellido: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={editingUser.email} onChange={(e) => setEditingUser((p) => ({ ...p, email: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Empresa</label>
              <input type="text" value={editingUser.empresa || ''} onChange={(e) => setEditingUser((p) => ({ ...p, empresa: e.target.value }))} className="input" />
            </div>
            <div className="flex space-x-3 pt-2">
              <button onClick={() => setEditingUser(null)} className="flex-1 btn-secondary">Cancelar</button>
              <button onClick={handleEditUser} className="flex-1 btn-primary">Guardar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset status toast */}
      {resetStatus && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-lg shadow-lg flex items-center gap-3 z-50 ${
          resetStatus.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {resetStatus.ok ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-medium">
            {resetStatus.ok ? 'Correo enviado' : resetStatus.error}
          </span>
        </div>
      )}
    </>
  );
}

/* ─── Tab: Invitaciones ─── */
function InvitationsTab() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingInv, setEditingInv] = useState(null);

  const [newInv, setNewInv] = useState({
    nombre: '', apellido: '', rut: '', email: '', rol: 'usuario', empresa: ''
  });

  const [bulkText, setBulkText] = useState('');
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => {
    loadInvitations();
  }, [statusFilter, search]);

  const loadInvitations = async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.estado = statusFilter;
      if (search) params.search = search;
      const data = await invitationService.list(params);
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error('Error cargando invitaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newInv.nombre || !newInv.rut || !newInv.email) {
      alert('Nombre, RUT y email son requeridos');
      return;
    }
    try {
      await invitationService.create(newInv);
      setShowCreate(false);
      setNewInv({ nombre: '', apellido: '', rut: '', email: '', rol: 'usuario', empresa: '' });
      loadInvitations();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleBulk = async () => {
    const lines = bulkText.trim().split('\n').filter((l) => l.trim());
    const parsed = lines.map((line) => {
      const parts = line.split(',').map((s) => s.trim());
      return {
        nombre: parts[0] || '',
        rut: parts[1] || '',
        email: parts[2] || '',
        empresa: parts[3] || '',
      };
    }).filter((inv) => inv.nombre && inv.email && inv.rut && inv.empresa);

    if (parsed.length === 0) {
      alert('No se encontraron invitaciones válidas. Formato: Nombre, RUT, Email, Empresa');
      return;
    }

    try {
      const result = await invitationService.createBulk(parsed);
      setBulkResult(result);
      loadInvitations();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta invitación?')) return;
    try {
      await invitationService.remove(id);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEditInv = async () => {
    if (!editingInv.nombre) {
      alert('El nombre es requerido');
      return;
    }
    try {
      const result = await invitationService.update(editingInv.id, {
        nombre: editingInv.nombre,
        apellido: editingInv.apellido,
        email: editingInv.email,
        empresa: editingInv.empresa,
      });
      setInvitations((prev) =>
        prev.map((i) => (i.id === editingInv.id ? { ...i, ...result } : i))
      );
      setEditingInv(null);
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
    <>
      {/* Header + botones */}
      <div className="flex items-center justify-end mb-4 gap-3">
        <button onClick={() => setShowBulk(true)} className="btn-secondary flex items-center">
          <UserPlus className="w-5 h-5 mr-2" />
          Invitación Masiva
        </button>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Nueva Invitación
        </button>
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUT o email..."
            className="input pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          {['all', 'pendiente', 'registrada'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'pendiente' ? 'Pendientes' : 'Registrados'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {invitations.length === 0 ? (
        <div className="card text-center py-12">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay invitaciones</p>
        </div>
      ) : (
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Nombre</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">RUT</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Email</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Empresa</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Rol</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Estado</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Fecha</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {inv.nombre} {inv.apellido}
                  </td>
                  <td className="py-3 px-4 text-gray-500">{inv.rut}</td>
                  <td className="py-3 px-4 text-gray-500">{inv.email}</td>
                  <td className="py-3 px-4 text-gray-500">{inv.empresa || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={inv.rol === 'admin' ? 'badge-blue' : 'badge-gray'}>
                      {inv.rol === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={inv.estado === 'pendiente' ? 'badge-yellow' : 'badge-green'}>
                      {inv.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500">
                    {new Date(inv.fecha_invitacion).toLocaleDateString('es-CL')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingInv(inv)}
                        className="p-1.5 rounded text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {inv.estado === 'pendiente' && (
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Invitación Individual */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Invitación">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input type="text" value={newInv.nombre} onChange={(e) => setNewInv((p) => ({ ...p, nombre: e.target.value }))} className="input" placeholder="Ej: Juan" />
          </div>
          <div>
            <label className="label">Apellido</label>
            <input type="text" value={newInv.apellido} onChange={(e) => setNewInv((p) => ({ ...p, apellido: e.target.value }))} className="input" placeholder="Opcional" />
          </div>
          <div>
            <label className="label">RUT *</label>
            <input type="text" value={newInv.rut} onChange={(e) => setNewInv((p) => ({ ...p, rut: e.target.value }))} className="input" placeholder="12345678-9" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" value={newInv.email} onChange={(e) => setNewInv((p) => ({ ...p, email: e.target.value }))} className="input" placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <label className="label">Empresa</label>
            <input type="text" value={newInv.empresa} onChange={(e) => setNewInv((p) => ({ ...p, empresa: e.target.value }))} className="input" placeholder="Nombre de la empresa" />
          </div>
          <div>
            <label className="label">Rol</label>
            <select
              value={newInv.rol}
              onChange={(e) => setNewInv((p) => ({ ...p, rol: e.target.value }))}
              className="input"
            >
              <option value="usuario">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="flex space-x-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 btn-secondary">Cancelar</button>
            <button onClick={handleCreate} className="flex-1 btn-primary flex items-center justify-center">
              <Send className="w-4 h-4 mr-2" />
              Invitar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Invitación */}
      <Modal isOpen={!!editingInv} onClose={() => setEditingInv(null)} title="Editar Invitación">
        {editingInv && (
          <div className="space-y-4">
            <div>
              <label className="label">Nombre *</label>
              <input type="text" value={editingInv.nombre} onChange={(e) => setEditingInv((p) => ({ ...p, nombre: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input type="text" value={editingInv.apellido} onChange={(e) => setEditingInv((p) => ({ ...p, apellido: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={editingInv.email} onChange={(e) => setEditingInv((p) => ({ ...p, email: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Empresa</label>
              <input type="text" value={editingInv.empresa || ''} onChange={(e) => setEditingInv((p) => ({ ...p, empresa: e.target.value }))} className="input" />
            </div>
            <div className="flex space-x-3 pt-2">
              <button onClick={() => setEditingInv(null)} className="flex-1 btn-secondary">Cancelar</button>
              <button onClick={handleEditInv} className="flex-1 btn-primary">Guardar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Invitación Masiva */}
      <Modal isOpen={showBulk} onClose={() => { setShowBulk(false); setBulkResult(null); }} title="Invitación Masiva" size="lg">
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            Ingresa una invitación por línea en formato: <strong>Nombre, RUT, Email, Empresa</strong> (todos los campos son requeridos)
          </div>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Juan Pérez, 12345678-5, juan@empresa.cl, Empresa A\nMaría López, 87654321-0, maria@empresa.cl, Empresa B`}
            rows={8}
            className="input font-mono text-sm"
          />

          {bulkResult && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-800">
                {bulkResult.created} invitaciones enviadas, {bulkResult.skipped} omitidas
              </p>
              {bulkResult.errors && bulkResult.errors.length > 0 && (
                <ul className="mt-2 text-xs text-red-600 list-disc list-inside">
                  {bulkResult.errors.map((e, i) => (
                    <li key={i}>{e.email}: {e.error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <button onClick={() => { setShowBulk(false); setBulkResult(null); }} className="flex-1 btn-secondary">Cerrar</button>
            <button onClick={handleBulk} className="flex-1 btn-primary flex items-center justify-center">
              <Send className="w-4 h-4 mr-2" />
              Enviar Todas
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
