import { useState, useEffect } from 'react';
import reportService from '../../services/reportService';
import templateService from '../../services/templateService';
import formService from '../../services/formService';
import StatsCard from '../Common/StatsCard';
import Modal from '../Common/Modal';
import mammoth from 'mammoth';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Download, Eye, FileSpreadsheet, CheckCircle, Clock, AlertTriangle,
  FileText, Search, X, Loader2, ChevronDown, ChevronRight
} from 'lucide-react';

const COLORS = ['#7095B4', '#22c55e', '#FFD600', '#D71E1F', '#8b5cf6', '#06b6d4'];

export default function ReportsSurveys() {
  const [surveys, setSurveys] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetail, setShowDetail] = useState(null);
  const [detail, setDetail] = useState(null);
  const [responses, setResponses] = useState(null);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadSurveys(), 300);
    return () => clearTimeout(timer);
  }, [filterStatus, filterTemplate, searchTerm]);

  const loadData = async () => {
    try {
      const [surveysRes, templatesRes] = await Promise.all([
        reportService.reportSurveys({}),
        templateService.list({ activa: 'true' }),
      ]);
      setSurveys(surveysRes.formularios || []);
      setTemplates(templatesRes.templates || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSurveys = async () => {
    try {
      const params = {};
      if (filterStatus) params.estado = filterStatus;
      if (filterTemplate) params.plantilla_id = filterTemplate;
      if (searchTerm) params.search = searchTerm;
      const data = await reportService.reportSurveys(params);
      setSurveys(data.formularios || []);
    } catch (err) {
      console.error('Error filtrando:', err);
    }
  };

  const loadDetail = async (id) => {
    setShowDetail(id);
    setDetail(null);
    setResponses(null);
    try {
      const data = await reportService.formDetail(id);
      setDetail(data);
    } catch (err) {
      alert('Error cargando detalle');
    }
  };

  const loadResponses = async (id) => {
    setLoadingResponses(true);
    try {
      const data = await reportService.formResponses(id);
      setResponses(data);
    } catch (err) {
      alert('Error cargando respuestas');
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleViewDetail = async (id) => {
    await loadDetail(id);
    loadResponses(id);
  };

  const handleExport = async (id, format) => {
    try {
      const blob = await reportService.exportForm(id, format);
      const form = surveys.find((f) => f.id === id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form?.titulo || 'formulario'}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error exportando');
    }
  };

  const totalAsignados = surveys.reduce((s, f) => s + parseInt(f.total_asignados || 0), 0);
  const totalCompletados = surveys.reduce((s, f) => s + parseInt(f.completados || 0), 0);
  const avgCompletitud = totalAsignados > 0 ? Math.round((totalCompletados / totalAsignados) * 100) : 0;

  const estadoData = [
    { name: 'Pendientes', value: surveys.filter((f) => f.estado === 'pendiente').length },
    { name: 'Completados', value: surveys.filter((f) => f.estado === 'completado').length },
    { name: 'Vencidos', value: surveys.filter((f) => f.estado === 'vencido').length },
  ].filter((d) => d.value > 0);

  const chartData = surveys.slice(0, 10).map((f) => ({
    name: f.titulo.length > 18 ? f.titulo.substring(0, 18) + '...' : f.titulo,
    completados: parseInt(f.completados || 0),
    'En progreso': parseInt(f.en_progreso || 0),
  }));

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
        <h1 className="text-2xl font-bold text-gray-900">Reporte Encuestas</h1>
        <p className="text-gray-600">Estado y respuestas por formulario</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatsCard label="Formularios" value={surveys.length} icon={FileSpreadsheet} color="blue" />
        <StatsCard label="Completados" value={totalCompletados} icon={CheckCircle} color="green" subtext={`${avgCompletitud}% tasa`} />
        <StatsCard label="En progreso" value={surveys.reduce((s, f) => s + parseInt(f.en_progreso || 0), 0)} icon={Clock} color="yellow" />
        <StatsCard label="Vencidos" value={surveys.reduce((s, f) => s + parseInt(f.vencidos || 0), 0)} icon={AlertTriangle} color="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Respuestas por Formulario</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completados" fill="#22c55e" name="Completados" />
                <Bar dataKey="En progreso" fill="#FFD600" name="En progreso" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center py-8">Sin datos</p>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar formulario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 pr-4 w-full"
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-auto">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="completado">Completado</option>
          <option value="vencido">Vencido</option>
        </select>
        <select value={filterTemplate} onChange={(e) => setFilterTemplate(e.target.value)} className="input w-auto">
          <option value="">Todas las plantillas</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Formulario</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Plantilla</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Asignados</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">Completados</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">En progreso</th>
                <th className="text-center py-3 px-4 text-gray-600 font-medium">% Avance</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {surveys.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Sin resultados</td></tr>
              ) : surveys.map((f) => (
                <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{f.titulo}</td>
                  <td className="py-3 px-4 text-gray-500">{f.plantilla_nombre}</td>
                  <td className="py-3 px-4 text-center">{f.total_asignados}</td>
                  <td className="py-3 px-4 text-center text-green-600 font-medium">{f.completados}</td>
                  <td className="py-3 px-4 text-center text-yellow-600">{f.en_progreso}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#7095B4] rounded-full" style={{ width: `${f.porcentaje_completado || 0}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-[#7095B4]">{f.porcentaje_completado || 0}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => handleViewDetail(f.id)} className="btn-secondary text-xs py-1 px-2 flex items-center">
                        <Eye className="w-3.5 h-3.5 mr-1" />Ver
                      </button>
                      <button onClick={() => handleExport(f.id, 'xlsx')} className="btn-secondary text-xs py-1 px-2 text-green-600 hover:bg-green-50 flex items-center" title="Excel">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleExport(f.id, 'csv')} className="btn-secondary text-xs py-1 px-2 text-[#7095B4] hover:bg-[#f0f5fa] flex items-center" title="CSV">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!showDetail} onClose={() => { setShowDetail(null); setDetail(null); setResponses(null); }} title={detail?.formulario?.titulo || 'Detalle'} size="full">
        {detail && (
          <div>
            {/* Completitud */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Tasa de Completitud</span>
                <span className="text-lg font-bold text-[#7095B4]">{detail.completitud?.porcentaje_completado || 0}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#7095B4] rounded-full transition-all" style={{ width: `${detail.completitud?.porcentaje_completado || 0}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{detail.completitud?.completados || 0} completados</span>
                <span>{detail.completitud?.pendientes || 0} pendientes</span>
                <span>{detail.completitud?.vencidos || 0} vencidos</span>
              </div>
            </div>

            {/* Distribution charts */}
            {detail.estadisticas_campo?.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Distribución de Respuestas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detail.estadisticas_campo.map((stat) => (
                    <div key={stat.campo_id} className="p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-700 mb-2">{stat.etiqueta}</h5>
                      <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={stat.distribucion}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="valor_texto" tick={{ fontSize: 10 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="total" fill="#7095B4" name="Respuestas" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Responses */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-3">
                Respuestas Recibidas
                {responses && <span className="ml-2 text-sm font-normal text-gray-400">({responses.respuestas.length})</span>}
              </h4>

              {!responses && !loadingResponses && (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm mb-3">Presiona "Cargar Respuestas" para ver los detalles</p>
                  <button onClick={() => loadResponses(showDetail)} className="btn-primary text-sm px-4 py-2">Cargar Respuestas</button>
                </div>
              )}

              {responses && responses.respuestas.length === 0 && <p className="text-gray-500 text-sm text-center py-6">No hay respuestas</p>}

              {responses && responses.respuestas.length > 0 && (
                <div className="space-y-3">
                  {responses.respuestas.map((resp) => {
                    const isExpanded = expandedUser === resp.usuario_id;
                    return (
                      <div key={resp.respuesta_id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedUser(isExpanded ? null : resp.usuario_id)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                              {resp.nombre?.[0]}{resp.apellido?.[0]}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium text-gray-900">{resp.nombre} {resp.apellido}</p>
                              <p className="text-xs text-gray-500">{resp.rut} &middot; {resp.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-xs text-gray-400">{new Date(resp.fecha_envio).toLocaleDateString('es-CL')}</span>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 py-3 border-t border-gray-100">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-100">
                                  <th className="text-left py-2 px-2 text-gray-500 font-medium text-xs uppercase">#</th>
                                  <th className="text-left py-2 px-2 text-gray-500 font-medium text-xs uppercase">Campo</th>
                                  <th className="text-left py-2 px-2 text-gray-500 font-medium text-xs uppercase">Respuesta</th>
                                </tr>
                              </thead>
                              <tbody>
                                {responses.campos.map((campo, idx) => {
                                  const val = resp.valores?.[campo.id];
                                  return (
                                    <tr key={campo.id} className="border-b border-gray-50">
                                      <td className="py-2.5 px-2 text-gray-400 text-xs">{idx + 1}</td>
                                      <td className="py-2.5 px-2"><span className="text-gray-700 text-xs">{campo.etiqueta}</span></td>
                                      <td className="py-2.5 px-2">
                                        {val?.display ? (
                                          <span className="text-xs text-gray-600">
                                            {Array.isArray(val.display) ? val.display.join(', ') : val.display}
                                          </span>
                                        ) : <span className="text-xs text-gray-300 italic">Sin respuesta</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Fields */}
            <h4 className="font-semibold text-gray-900 mb-3">Campos del Formulario</h4>
            <div className="space-y-2">
              {detail.campos?.map((campo, idx) => (
                <div key={campo.id} className="flex items-center text-sm">
                  <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold mr-2">{idx + 1}</span>
                  <span className="font-medium text-gray-700">{campo.etiqueta}</span>
                  <span className="badge-gray ml-2">{campo.tipo}</span>
                  {campo.requerido && <span className="text-[#D71E1F] ml-1">*</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
