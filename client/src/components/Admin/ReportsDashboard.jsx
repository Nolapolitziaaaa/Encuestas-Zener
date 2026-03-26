import { useState, useEffect } from 'react';
import reportService from '../../services/reportService';
import formService from '../../services/formService';
import StatsCard from '../Common/StatsCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, CheckCircle, Clock, BarChart3, Search, Download, UserCheck, UserX, ClipboardList, RotateCcw } from 'lucide-react';

const COLORS = ['#7095B4', '#22c55e', '#FFD600', '#D71E1F', '#8b5cf6', '#06b6d4'];

export default function ReportsDashboard() {
  const [summary, setSummary] = useState(null);
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [formUsers, setFormUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingForm, setLoadingForm] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filteredForms, setFilteredForms] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryData, formsData] = await Promise.all([
        reportService.summary(),
        formService.list(),
      ]);
      setSummary(summaryData);
      setForms(formsData.forms || []);
      setFilteredForms(formsData.forms || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchInput(value);
    const q = value.toLowerCase();
    if (!q) {
      setFilteredForms(forms);
    } else {
      setFilteredForms(forms.filter(f => f.titulo?.toLowerCase().includes(q)));
    }
  };

  const handleSelectForm = async (formId) => {
    setSelectedForm(formId);
    if (!formId) {
      setFormUsers(null);
      return;
    }
    setLoadingForm(true);
    try {
      const data = await reportService.formUserStatus(formId);
      setFormUsers(data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoadingForm(false);
    }
  };

  const handleExport = (formId, formTitulo) => {
    reportService.exportForm(formId, 'xlsx').then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formTitulo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  };

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // ---- DATOS GENERALES (sin formulario seleccionado) ----
  const estadoData = [
    { name: 'Pendientes', value: parseInt(summary.formularios_pendientes) || 0 },
    { name: 'Completados', value: parseInt(summary.formularios_completados) || 0 },
    { name: 'Vencidos', value: parseInt(summary.formularios_vencidos) || 0 },
  ].filter((d) => d.value > 0);

  const usuarioData = (summary.por_usuario || []).map((s) => ({
    name: s.titulo.length > 20 ? s.titulo.substring(0, 20) + '...' : s.titulo,
    completados: parseInt(s.completados),
    pendientes: parseInt(s.total_asignados) - parseInt(s.completados),
    porcentaje: s.total_asignados > 0 ? Math.round((parseInt(s.completados) / parseInt(s.total_asignados)) * 100) : 0,
  }));

  const tasaCompletitud = Math.round(
    (parseInt(summary.asignaciones_completadas) / Math.max(parseInt(summary.total_asignaciones), 1)) * 100
  );

  // ---- DATOS DEL FORMULARIO SELECCIONADO ----
  const selectedFormData = forms.find(f => String(f.id) === String(selectedForm));
  const pct = formUsers ? formUsers.porcentaje : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Resumen</h1>
        <p className="text-gray-600">
          {selectedForm
            ? selectedFormData?.titulo || 'Formulario seleccionado'
            : 'Estado general de formularios y respuestas'}
        </p>
      </div>

      {/* Selector de formulario */}
      <div className="card mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Seleccionar formulario:</label>
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchInput && setFilteredForms(forms.filter(f => f.titulo?.toLowerCase().includes(searchInput.toLowerCase())))}
              onBlur={() => setTimeout(() => setFilteredForms(forms), 200)}
              placeholder="Escribe para buscar..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-full"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setFilteredForms(forms); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10">
                &times;
              </button>
            )}
            {/* Sugerencias desplegables */}
            {searchInput && filteredForms.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                {filteredForms.map(f => (
                  <button
                    key={f.id}
                    onMouseDown={() => { handleSelectForm(f.id); setSearchInput(''); setFilteredForms(forms); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 hover:text-primary-700 transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between"
                  >
                    <span className="font-medium truncate">{f.titulo}</span>
                    <span className="text-xs text-gray-400 ml-3 whitespace-nowrap">ID: {f.id}</span>
                  </button>
                ))}
              </div>
            )}
            {searchInput && filteredForms.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
                <p className="text-sm text-gray-400 text-center">No se encontraron formularios</p>
              </div>
            )}
          </div>
          {selectedForm && (
            <button
              onClick={() => handleSelectForm('')}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" /> General
            </button>
          )}
        </div>
        {/* Tag del formulario seleccionado */}
        {selectedForm && selectedFormData && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">Seleccionado:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
              <ClipboardList className="w-3.5 h-3.5" />
              {selectedFormData.titulo}
              <button onClick={() => handleSelectForm('')} className="ml-1 text-primary-400 hover:text-primary-700">&times;</button>
            </span>
          </div>
        )}
      </div>

      {/* ============ DASHBOARD GENERAL ============ */}
      {!selectedForm && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatsCard label="Usuarios" value={summary.total_proveedores} icon={Users} color="blue" />
            <StatsCard label="Formularios" value={summary.total_formularios} icon={BarChart3} color="purple" />
            <StatsCard label="Completados" value={summary.asignaciones_completadas} icon={CheckCircle} color="green" subtext={`${tasaCompletitud}% tasa`} />
            <StatsCard label="Pendientes" value={summary.asignaciones_pendientes} icon={Clock} color="yellow" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Formularios</h3>
              {estadoData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={estadoData} cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} dataKey="value">
                      {estadoData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-500 text-center py-8">Sin datos</p>}
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Formularios por Usuarios</h3>
              {usuarioData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={usuarioData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completados" fill="#22c55e" name="Completados" />
                    <Bar dataKey="pendientes" fill="#FFD600" name="Pendientes" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-500 text-center py-8">Sin datos</p>}
            </div>
          </div>

          {/* Tabla general */}
          {(summary.por_usuario || []).length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Formularios por Usuarios</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-gray-600 font-medium">Formulario</th>
                      <th className="text-center py-3 px-4 text-gray-600 font-medium">Asignados</th>
                      <th className="text-center py-3 px-4 text-gray-600 font-medium">Completados</th>
                      <th className="text-center py-3 px-4 text-gray-600 font-medium">% Respuesta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.por_usuario.map((item, idx) => {
                      const p = item.total_asignados > 0 ? Math.round((item.completados / item.total_asignados) * 100) : 0;
                      return (
                        <tr
                          key={idx}
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleSelectForm(item.formulario_id || '')}
                        >
                          <td className="py-3 px-4 font-medium text-primary-700 hover:underline">{item.titulo}</td>
                          <td className="py-3 px-4 text-center">{item.total_asignados}</td>
                          <td className="py-3 px-4 text-center text-green-600 font-medium">{item.completados}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div className={`h-2 rounded-full ${p >= 80 ? 'bg-green-500' : p >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${p}%` }} />
                              </div>
                              <span className={`text-xs font-semibold ${p >= 80 ? 'text-green-600' : p >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{p}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ DASHBOARD FORMULARIO SELECCIONADO ============ */}
      {selectedForm && (
        <>
          {loadingForm ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : formUsers ? (
            <>
              {/* Stats del formulario */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatsCard label="Asignados" value={formUsers.total_asignados} icon={Users} color="blue" />
                <StatsCard label="Respondidos" value={formUsers.completados} icon={CheckCircle} color="green" />
                <StatsCard label="Pendientes" value={formUsers.pendientes} icon={Clock} color="yellow" />
                <StatsCard label="% Respuesta" value={`${pct}%`} icon={BarChart3}
                  color={pct >= 80 ? 'green' : pct >= 50 ? 'yellow' : 'red'}
                />
              </div>

              {/* Barra de progreso principal */}
              <div className="card mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {formUsers.completados} de {formUsers.total_asignados} usuarios han respondido
                  </h3>
                  <span className={`text-2xl font-bold px-3 py-1 rounded-lg ${
                    pct >= 80 ? 'bg-green-100 text-green-700' :
                    pct >= 50 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {pct}%
                  </span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${
                      pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{formUsers.completados} respondidos</span>
                  <span>{formUsers.pendientes} pendientes</span>
                </div>

                {/* Gráfico pie */}
                {formUsers.total_asignados > 0 && (
                  <div className="mt-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Respondidos', value: formUsers.completados },
                            { name: 'Pendientes', value: formUsers.pendientes },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={40}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          <Cell fill="#22c55e" />
                          <Cell fill="#FFD600" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Tabla de usuarios */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Detalle de Usuarios</h3>
                  {formUsers.completados > 0 && selectedFormData && (
                    <button
                      onClick={() => handleExport(selectedForm, selectedFormData.titulo)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      <Download className="w-4 h-4" /> Exportar Excel
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-4 text-gray-600 font-medium">#</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-medium">Usuario</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-medium">RUT</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-medium">Email</th>
                        <th className="text-center py-3 px-4 text-gray-600 font-medium">Estado</th>
                        <th className="text-right py-3 px-4 text-gray-600 font-medium">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formUsers.usuarios.map((u, idx) => (
                        <tr key={u.usuario_id} className={`border-b border-gray-50 ${u.respondido ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}>
                          <td className="py-3 px-4 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                u.respondido ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                              }`}>
                                {u.nombre?.[0]}{u.apellido?.[0]}
                              </div>
                              <span className="font-medium text-gray-900">{u.nombre} {u.apellido}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs">{u.rut}</td>
                          <td className="py-3 px-4 text-gray-500 text-xs">{u.email}</td>
                          <td className="py-3 px-4 text-center">
                            {u.respondido ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                                <UserCheck className="w-3.5 h-3.5" /> Respondido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                                <UserX className="w-3.5 h-3.5" /> Pendiente
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-400 text-xs">
                            {u.fecha_respuesta
                              ? new Date(u.fecha_respuesta).toLocaleDateString('es-CL')
                              : u.fecha_envio
                                ? new Date(u.fecha_envio).toLocaleDateString('es-CL')
                                : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <p className="text-gray-400 text-center py-8">No hay datos de usuarios para este formulario</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
