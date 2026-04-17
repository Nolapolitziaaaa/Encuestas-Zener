import { useState, useEffect, useRef } from 'react';
import formService from '../../services/formService';
import templateService from '../../services/templateService';
import reportService from '../../services/reportService';
import api from '../../services/api';
import Modal from '../Common/Modal';
import {
  Plus, Trash2, Eye, Send, Filter, Calendar, Users, CheckCircle, Clock,
  Search, X, UserPlus, Check, Download, Loader2
} from 'lucide-react';

export default function FormManager() {
  const [forms, setForms] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [downloadingFiles, setDownloadingFiles] = useState(null);
  const [filter, setFilter] = useState('all');

  // Form creation state
  const [newForm, setNewForm] = useState({
    plantilla_id: '',
    proveedor_ids: [],
    fecha_limite: '',
  });

  // User selector state
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadData = async () => {
    try {
      const [formsRes, templatesRes, providersRes] = await Promise.all([
        formService.list(),
        templateService.list({ activa: 'true' }),
        api.get('/users', { params: { rol: 'usuario', limit: 100 } }),
      ]);
      setForms(formsRes.forms || []);
      setTemplates(templatesRes.templates || []);
      setProviders(providersRes.data?.users || providersRes.users || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newForm.plantilla_id || newForm.proveedor_ids.length === 0) {
      alert('Completa todos los campos requeridos');
      return;
    }

    try {
      await formService.create({
        ...newForm,
        plantilla_id: parseInt(newForm.plantilla_id),
        proveedor_ids: newForm.proveedor_ids.map(Number),
        fecha_limite: newForm.fecha_limite || null,
      });
      setShowCreate(false);
      setNewForm({ plantilla_id: '', proveedor_ids: [], fecha_limite: '' });
      setUserSearch('');
      loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este formulario?')) return;
    try {
      await formService.remove(id);
      setForms((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const addUser = (id) => {
    if (!newForm.proveedor_ids.includes(id)) {
      setNewForm((prev) => ({ ...prev, proveedor_ids: [...prev.proveedor_ids, id] }));
    }
    setUserSearch('');
    setShowUserDropdown(false);
  };

  const removeUser = (id) => {
    setNewForm((prev) => ({
      ...prev,
      proveedor_ids: prev.proveedor_ids.filter((p) => p !== id),
    }));
  };

  const selectAllUsers = () => {
    const availableIds = filteredDropdownUsers.map((p) => p.id);
    const newIds = availableIds.filter((id) => !newForm.proveedor_ids.includes(id));
    setNewForm((prev) => ({ ...prev, proveedor_ids: [...prev.proveedor_ids, ...newIds] }));
  };

  const clearAllUsers = () => {
    setNewForm((prev) => ({ ...prev, proveedor_ids: [] }));
  };

  const selectedUsers = providers.filter((p) => newForm.proveedor_ids.includes(p.id));

  const filteredDropdownUsers = providers.filter((p) => {
    if (!userSearch) return !newForm.proveedor_ids.includes(p.id);
    const term = userSearch.toLowerCase();
    return (
      !newForm.proveedor_ids.includes(p.id) &&
      (p.nombre?.toLowerCase().includes(term) ||
        p.apellido?.toLowerCase().includes(term) ||
        p.rut?.includes(term) ||
        p.email?.toLowerCase().includes(term))
    );
  });

  const handleDownloadFiles = async (id, titulo) => {
    setDownloadingFiles(id);
    try {
      const blob = await reportService.downloadFormFiles(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${titulo || 'formulario'}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      alert(msg.includes('404') || msg.includes('No hay archivos') ? 'Este formulario no tiene archivos para descargar.' : 'Error descargando archivos: ' + msg);
    } finally {
      setDownloadingFiles(null);
    }
  };

  const loadDetail = async (id) => {
    try {
      const data = await formService.getById(id);
      setShowDetail(data);
    } catch (err) {
      alert('Error cargando detalle');
    }
  };

  const filteredForms = filter === 'all'
    ? forms
    : forms.filter((f) => f.estado === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statusBadge = (estado) => {
    switch (estado) {
      case 'pendiente': return 'badge-yellow';
      case 'completado': return 'badge-green';
      case 'vencido': return 'badge-red';
      default: return 'badge-gray';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Formularios</h1>
          <p className="text-gray-600">Gestiona los formularios enviados a usuarios</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Formulario
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center space-x-2 mb-4">
        {[
          { value: 'all', label: 'Todos' },
          { value: 'pendiente', label: 'Pendientes' },
          { value: 'completado', label: 'Completados' },
          { value: 'vencido', label: 'Vencidos' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filteredForms.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No hay formularios</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredForms.map((form) => (
            <div key={form.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold text-gray-900">{form.titulo}</h3>
                    <span className={statusBadge(form.estado)}>{form.estado}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Plantilla: {form.plantilla_nombre} &middot; Creado por: {form.creador_nombre}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <span className="flex items-center text-gray-500">
                      <Users className="w-4 h-4 mr-1" />
                      {form.total_completados}/{form.total_asignados} completados
                    </span>
                    {form.fecha_limite && (
                      <span className="flex items-center text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(form.fecha_limite).toLocaleDateString('es-CL')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => loadDetail(form.id)}
                    className="btn-secondary text-sm py-1.5 px-3 flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Detalle
                  </button>
                  {form.total_completados > 0 && (
                    <button
                      onClick={() => handleDownloadFiles(form.id, form.titulo)}
                      disabled={downloadingFiles === form.id}
                      className="btn-secondary text-sm py-1.5 px-3 text-green-700 hover:bg-green-50 flex items-center disabled:opacity-50"
                      title="Descargar archivos de todas las empresas"
                    >
                      {downloadingFiles === form.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-1" />
                      )}
                      Archivos
                    </button>
                  )}
                  {form.estado === 'pendiente' && (
                    <button
                      onClick={() => handleDelete(form.id)}
                      className="btn-secondary text-sm py-1.5 px-3 text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setUserSearch(''); }} title="Nuevo Formulario" size="lg">
        <div className="space-y-4">
          <div>
            <label className="label">Plantilla *</label>
            <select
              value={newForm.plantilla_id}
              onChange={(e) => setNewForm((prev) => ({ ...prev, plantilla_id: e.target.value }))}
              className="input"
            >
              <option value="">Seleccionar plantilla...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre} ({t.total_campos} campos)</option>
              ))}
            </select>
            {newForm.plantilla_id && (() => {
              const t = templates.find((t) => t.id === parseInt(newForm.plantilla_id));
              if (!t) return null;
              return (
                <div className="mt-2 p-3 bg-[#f0f5fa] rounded-lg border border-[#bfd3e5]">
                  <p className="text-xs font-medium text-[#7095B4] uppercase tracking-wide mb-1">Plantilla seleccionada</p>
                  <p className="text-sm font-semibold text-[#232856]">{t.nombre}</p>
                  {t.descripcion && <p className="text-sm text-[#475569] mt-1">{t.descripcion}</p>}
                  <p className="text-xs text-[#94a3b8] mt-1">{t.total_campos} campo(s) definido(s)</p>
                </div>
              );
            })()}
          </div>
          <div>
            <label className="label">Fecha límite</label>
            <input
              type="date"
              value={newForm.fecha_limite}
              onChange={(e) => setNewForm((prev) => ({ ...prev, fecha_limite: e.target.value }))}
              className="input"
            />
          </div>

          {/* Selector de usuarios mejorado */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">
                Usuarios * ({selectedUsers.length} seleccionados)
              </label>
              <div className="flex items-center gap-2">
                {selectedUsers.length > 0 && selectedUsers.length < providers.length && (
                  <button
                    type="button"
                    onClick={selectAllUsers}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                  >
                    Seleccionar todos
                  </button>
                )}
                {selectedUsers.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllUsers}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Chips de usuarios seleccionados */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium"
                  >
                    {u.nombre} {u.apellido}
                    <button
                      type="button"
                      onClick={() => removeUser(u.id)}
                      className="text-primary-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Buscador + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="Buscar por nombre, RUT o email..."
                  className="input pl-9 pr-9 w-full"
                />
                {userSearch && (
                  <button
                    type="button"
                    onClick={() => { setUserSearch(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showUserDropdown && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredDropdownUsers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">
                      {userSearch ? 'Sin resultados' : 'Todos los usuarios están seleccionados'}
                    </div>
                  ) : (
                    filteredDropdownUsers.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addUser(p.id)}
                        className="w-full flex items-center px-4 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                          {p.nombre?.[0]}{p.apellido?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-900 font-medium">{p.nombre} {p.apellido}</span>
                          <span className="text-xs text-gray-400 ml-2">{p.rut}</span>
                        </div>
                        <UserPlus className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedUsers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1.5">
                Busca y selecciona al menos un usuario
              </p>
            )}
          </div>

          <div className="flex space-x-3 pt-2">
            <button onClick={() => { setShowCreate(false); setUserSearch(''); }} className="flex-1 btn-secondary">Cancelar</button>
            <button onClick={handleCreate} className="flex-1 btn-primary flex items-center justify-center">
              <Send className="w-4 h-4 mr-2" />
              Crear y Enviar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Detalle */}
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail?.titulo || 'Detalle'} size="lg">
        {showDetail && (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Plantilla: {showDetail.plantilla_nombre}</p>
              {showDetail.descripcion && <p className="text-gray-600 mt-1">{showDetail.descripcion}</p>}
            </div>

            <h4 className="font-semibold text-gray-900 mb-3">Asignaciones ({showDetail.asignaciones?.length || 0})</h4>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-gray-600">Usuario</th>
                    <th className="text-left py-2 px-2 text-gray-600">RUT</th>
                    <th className="text-center py-2 px-2 text-gray-600">Estado</th>
                    <th className="text-right py-2 px-2 text-gray-600">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {showDetail.asignaciones?.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100">
                      <td className="py-2 px-2">{a.nombre} {a.apellido}</td>
                      <td className="py-2 px-2 text-gray-500">{a.rut}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={statusBadge(a.estado)}>{a.estado}</span>
                      </td>
                      <td className="py-2 px-2 text-right text-gray-500">
                        {a.fecha_respuesta
                          ? new Date(a.fecha_respuesta).toLocaleDateString('es-CL')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
