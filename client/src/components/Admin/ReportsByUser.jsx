import { useState, useEffect } from 'react';
import reportService from '../../services/reportService';
import formService from '../../services/formService';
import StatsCard from '../Common/StatsCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, CheckCircle, Clock, AlertTriangle, Search, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';

export default function ReportsByUser() {
  const [usuarios, setUsuarios] = useState([]);
  const [forms, setForms] = useState([]);
  const [filterForm, setFilterForm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadUsers(), 300);
    return () => clearTimeout(timer);
  }, [filterForm, searchTerm]);

  const loadData = async () => {
    try {
      const [usersRes, formsRes] = await Promise.all([
        reportService.reportByUser({}),
        formService.list(),
      ]);
      setUsuarios(usersRes.usuarios || []);
      setForms(formsRes.forms || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const params = {};
      if (filterForm) params.form_id = filterForm;
      if (searchTerm) params.search = searchTerm;
      const data = await reportService.reportByUser(params);
      setUsuarios(data.usuarios || []);
    } catch (err) {
      console.error('Error filtrando:', err);
    }
  };

  const handleExpandUser = async (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      setUserDetail(null);
      return;
    }
    setExpandedUser(userId);
    try {
      const data = await reportService.userDetail(userId);
      setUserDetail(data.asignaciones || []);
    } catch (err) {
      console.error('Error cargando detalle:', err);
    }
  };

  const totalCompletados = usuarios.reduce((sum, u) => sum + parseInt(u.completados || 0), 0);
  const totalAsignaciones = usuarios.reduce((sum, u) => sum + parseInt(u.total_asignaciones || 0), 0);
  const avgCompletitud = totalAsignaciones > 0 ? Math.round((totalCompletados / totalAsignaciones) * 100) : 0;

  const chartData = usuarios
    .filter((u) => parseInt(u.total_asignaciones) > 0)
    .slice(0, 10)
    .map((u) => ({
      name: `${u.nombre} ${u.apellido}`.split(' ').map((n) => n[0]).join(''),
      completados: parseInt(u.completados || 0),
      pendientes: parseInt(u.pendientes || 0),
    }));

  const statusBadge = (estado) => {
    switch (estado) {
      case 'completado': return 'badge-green';
      case 'vencido': return 'badge-red';
      case 'en_progreso': return 'badge-blue';
      default: return 'badge-yellow';
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
        <h1 className="text-2xl font-bold text-gray-900">Reporte por Usuario</h1>
        <p className="text-gray-600">Avance de completitud por cada usuario</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatsCard label="Total Usuarios" value={usuarios.length} icon={Users} color="blue" />
        <StatsCard label="Completados" value={totalCompletados} icon={CheckCircle} color="green" subtext={`${avgCompletitud}% promedio`} />
        <StatsCard label="Pendientes" value={totalAsignaciones - totalCompletados} icon={Clock} color="yellow" />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-[#7095B4]" />
            Top Usuarios por Completitud
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completados" fill="#22c55e" name="Completados" />
              <Bar dataKey="pendientes" fill="#FFD600" name="Pendientes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUT o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 pr-4 w-full"
          />
        </div>
        <select
          value={filterForm}
          onChange={(e) => setFilterForm(e.target.value)}
          className="input w-auto"
        >
          <option value="">Todos los formularios</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>{f.titulo}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Usuario</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Total</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Completados</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Pendientes</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Vencidos</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">% Avance</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Sin resultados</td></tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.usuario_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {u.nombre?.[0]}{u.apellido?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.nombre} {u.apellido}</p>
                          <p className="text-xs text-gray-400">{u.rut} &middot; {u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">{u.total_asignaciones}</td>
                    <td className="py-3 px-4 text-center text-green-600 font-medium">{u.completados}</td>
                    <td className="py-3 px-4 text-center text-yellow-600">{u.pendientes}</td>
                    <td className="py-3 px-4 text-center text-red-500">{u.vencidos}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#7095B4] rounded-full transition-all"
                            style={{ width: `${u.porcentaje_completado || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[#7095B4]">{u.porcentaje_completado || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleExpandUser(u.usuario_id)}
                        className="btn-secondary text-xs py-1 px-2 flex items-center ml-auto"
                      >
                        {expandedUser === u.usuario_id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User detail expansion */}
      {expandedUser && userDetail && (
        <div className="card mt-4">
          <h4 className="font-semibold text-gray-900 mb-3">Detalle de Formularios</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">Formulario</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">Plantilla</th>
                  <th className="text-center py-2 px-3 text-gray-600 font-medium">Estado</th>
                  <th className="text-center py-2 px-3 text-gray-600 font-medium">Progreso</th>
                  <th className="text-right py-2 px-3 text-gray-600 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {userDetail.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-gray-400">Sin asignaciones</td></tr>
                ) : (
                  userDetail.map((a) => {
                    const total = a.total_campos || 1;
                    const responded = a.campos_respondidos || 0;
                    const pct = Math.round((responded / total) * 100);
                    return (
                      <tr key={a.asignacion_id} className="border-b border-gray-50">
                        <td className="py-2.5 px-3 font-medium text-gray-900">{a.formulario_titulo}</td>
                        <td className="py-2.5 px-3 text-gray-500">{a.plantilla_nombre}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={statusBadge(a.estado)}>{a.estado === 'en_progreso' ? 'En progreso' : a.estado}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-[#7095B4] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-500">
                          {a.fecha_respuesta
                            ? new Date(a.fecha_respuesta).toLocaleDateString('es-CL')
                            : new Date(a.fecha_envio).toLocaleDateString('es-CL')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
