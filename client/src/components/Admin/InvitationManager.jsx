import { useState, useEffect } from 'react';
import invitationService from '../../services/invitationService';
import Modal from '../Common/Modal';
import {
  Plus, Trash2, Mail, Search, Send, UserPlus
} from 'lucide-react';

export default function InvitationManager() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Single invitation
  const [newInv, setNewInv] = useState({ nombre: '', apellido: '', rut: '', email: '' });

  // Bulk invitations
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
      setNewInv({ nombre: '', apellido: '', rut: '', email: '' });
      loadInvitations();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleBulk = async () => {
    const lines = bulkText.trim().split('\n').filter((l) => l.trim());
    const invitations = lines.map((line) => {
      const parts = line.split(',').map((s) => s.trim());
      return {
        nombre: parts[0] || '',
        apellido: '',
        rut: parts[1] || '',
        email: parts[2] || '',
      };
    }).filter((inv) => inv.nombre && inv.email && inv.rut);

    if (invitations.length === 0) {
      alert('No se encontraron invitaciones válidas');
      return;
    }

    try {
      const result = await invitationService.createBulk(invitations);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invitaciones</h1>
          <p className="text-gray-600">Invita usuarios al sistema</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowBulk(true)} className="btn-secondary flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Invitación Masiva
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Invitación
          </button>
        </div>
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

      {/* Lista */}
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
                  <td className="py-3 px-4 text-center">
                    <span className={inv.estado === 'pendiente' ? 'badge-yellow' : 'badge-green'}>
                      {inv.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500">
                    {new Date(inv.fecha_invitacion).toLocaleDateString('es-CL')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {inv.estado === 'pendiente' && (
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Individual */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Invitación">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre completo *</label>
            <input type="text" value={newInv.nombre} onChange={(e) => setNewInv((p) => ({ ...p, nombre: e.target.value }))} className="input" placeholder="Ej: Angelo Sanhueza" />
          </div>
          <div>
            <label className="label">RUT *</label>
            <input type="text" value={newInv.rut} onChange={(e) => setNewInv((p) => ({ ...p, rut: e.target.value }))} className="input" placeholder="12345678-9" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" value={newInv.email} onChange={(e) => setNewInv((p) => ({ ...p, email: e.target.value }))} className="input" placeholder="correo@ejemplo.com" />
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

      {/* Modal Masivo */}
      <Modal isOpen={showBulk} onClose={() => { setShowBulk(false); setBulkResult(null); }} title="Invitación Masiva" size="lg">
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            Ingresa una invitación por línea en formato: <strong>Nombre completo, RUT, Email</strong>
          </div>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Angelo Sanhueza, 16725598-1, angelo@empresa.cl\nPedro Juan, 12345678-5, pedro@empresa.cl`}
            rows={8}
            className="input font-mono text-sm"
          />

          {bulkResult && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-800">
                {bulkResult.created} invitaciones enviadas, {bulkResult.skipped} omitidas
              </p>
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
    </div>
  );
}
