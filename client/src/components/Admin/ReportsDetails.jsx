import { useState, useEffect } from 'react';
import reportService from '../../services/reportService';
import templateService from '../../services/templateService';
import formService from '../../services/formService';
import StatsCard from '../Common/StatsCard';
import Modal from '../Common/Modal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Download, Eye, FileSpreadsheet, CheckCircle, Clock, AlertTriangle,
  Search, ChevronDown, ChevronRight, UserCheck, TrendingUp
} from 'lucide-react';

const TABS = [
  { key: 'usuarios', label: 'Por Usuario', icon: UserCheck },
  { key: 'encuestas', label: 'Encuestas', icon: FileSpreadsheet },
];

export default function ReportsDetails() {
  const [activeTab, setActiveTab] = useState('usuarios');

  // User report state
  const [usuarios, setUsuarios] = useState([]);
  const [userFilterForm, setUserFilterForm] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [userDetailData, setUserDetailData] = useState(null);

  // Survey report state
  const [surveys, setSurveys] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [surveyStatus, setSurveyStatus] = useState('');
  const [surveyTemplate, setSurveyTemplate] = useState('');
  const [surveySearch, setSurveySearch] = useState('');
  const [showDetail, setShowDetail] = useState(null);
  const [detail, setDetail] = useState(null);
  const [responses, setResponses] = useState(null);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [expandedRespUser, setExpandedRespUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadUsers(), 300);
    return () => clearTimeout(timer);
  }, [userFilterForm, userSearch]);

  useEffect(() => {
    const timer = setTimeout(() => loadSurveys(), 300);
    return () => clearTimeout(timer);
  }, [surveyStatus, surveyTemplate, surveySearch]);

  const loadData = async () => {
    try {
      const [formsRes, templatesRes, usersRes, surveysRes] = await Promise.all([
        formService.list(),
        templateService.list({ activa: 'true' }),
        reportService.reportByUser({}),
        reportService.reportSurveys({}),
      ]);
      setForms(formsRes.forms || []);
      setTemplates(templatesRes.templates || []);
      setUsuarios(usersRes.usuarios || []);
      setSurveys(surveysRes.formularios || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const params = {};
      if (userFilterForm) params.form_id = userFilterForm;
      if (userSearch) params.search = userSearch;
      const data = await reportService.reportByUser(params);
      setUsuarios(data.usuarios || []);
    } catch (err) { console.error(err); }
  };

  const loadSurveys = async () => {
    try {
      const params = {};
      if (surveyStatus) params.estado = surveyStatus;
      if (surveyTemplate) params.plantilla_id = surveyTemplate;
      if (surveySearch) params.search = surveySearch;
      const data = await reportService.reportSurveys(params);
      setSurveys(data.formularios || []);
    } catch (err) { console.error(err); }
  };

  const handleExpandUser = async (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      setUserDetailData(null);
      return;
    }
    setExpandedUser(userId);
    try {
      const data = await reportService.userDetail(userId);
      setUserDetailData(data.asignaciones || []);
    } catch (err) { console.error(err); }
  };

  const loadDetail = async (id) => {
    setShowDetail(id);
    setDetail(null);
    setResponses(null);
    try {
      const data = await reportService.formDetail(id);
      setDetail(data);
    } catch (err) { alert('Error cargando detalle'); }
  };

  const loadResponses = async (id) => {
    setLoadingResponses(true);
    try {
      const data = await reportService.formResponses(id);
      setResponses(data);
    } catch (err) { alert('Error cargando respuestas'); }
    finally { setLoadingResponses(false); }
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
    } catch (err) { alert('Error exportando'); }
  };

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

  const totalAsignados = surveys.reduce((s, f) => s + parseInt(f.total_asignados || 0), 0);
  const totalCompletados = surveys.reduce((s, f) => s + parseInt(f.completados || 0), 0);
  const avgCompletitud = totalAsignados > 0 ? Math.round((totalCompletados / totalAsignados) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Detalles de Reportes</h1>
        <p className="text-gray-600">Reportes por usuario y encuestas</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 mb-6 border-b border-gray-200 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-[#7095B4] text-[#232856]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: POR USUARIO */}
      {activeTab === 'usuarios' && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar por nombre, RUT o email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="input pl-9 pr-4 w-full" />
            </div>
            <select value={userFilterForm} onChange={(e) => setUserFilterForm(e.target.value)} className="input w-auto">
              <option value="">Todos los formularios</option>
              {forms.map((f) => <option key={f.id} value={f.id}>{f.titulo}</option>)}
            </select>
          </div>

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
                    <th className="text-right py-3 px-4 text-gray-600 font-medium">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">Sin resultados</td></tr>
                  ) : usuarios.map((u) => (
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
                            <div className="h-full bg-[#7095B4] rounded-full transition-all" style={{ width: `${u.porcentaje_completado || 0}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-[#7095B4]">{u.porcentaje_completado || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleExpandUser(u.usuario_id)} className="btn-secondary text-xs py-1 px-2 flex items-center ml-auto">
                          {expandedUser === u.usuario_id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {expandedUser && userDetailData && (
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
                    {userDetailData.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-6 text-gray-400">Sin asignaciones</td></tr>
                    ) : userDetailData.map((a) => {
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
                            {a.fecha_respuesta ? new Date(a.fecha_respuesta).toLocaleDateString('es-CL') : new Date(a.fecha_envio).toLocaleDateString('es-CL')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: ENCUESTAS */}
      {activeTab === 'encuestas' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <StatsCard label="Formularios" value={surveys.length} icon={FileSpreadsheet} color="blue" />
            <StatsCard label="Completados" value={totalCompletados} icon={CheckCircle} color="green" subtext={`${avgCompletitud}% tasa`} />
            <StatsCard label="En progreso" value={surveys.reduce((s, f) => s + parseInt(f.en_progreso || 0), 0)} icon={Clock} color="yellow" />
            <StatsCard label="Vencidos" value={surveys.reduce((s, f) => s + parseInt(f.vencidos || 0), 0)} icon={AlertTriangle} color="red" />
          </div>

          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-[#7095B4]" />
              Respuestas por Formulario
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={surveys.slice(0, 10).map((f) => ({
                name: f.titulo.length > 18 ? f.titulo.substring(0, 18) + '...' : f.titulo,
                completados: parseInt(f.completados || 0),
                'En progreso': parseInt(f.en_progreso || 0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completados" fill="#22c55e" name="Completados" />
                <Bar dataKey="En progreso" fill="#FFD600" name="En progreso" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar formulario..." value={surveySearch} onChange={(e) => setSurveySearch(e.target.value)} className="input pl-9 pr-4 w-full" />
            </div>
            <select value={surveyStatus} onChange={(e) => setSurveyStatus(e.target.value)} className="input w-auto">
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="completado">Completado</option>
              <option value="vencido">Vencido</option>
            </select>
            <select value={surveyTemplate} onChange={(e) => setSurveyTemplate(e.target.value)} className="input w-auto">
              <option value="">Todas las plantillas</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>

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
        </div>
      )}

      {/* MODAL DETALLE */}
      <Modal isOpen={!!showDetail} onClose={() => { setShowDetail(null); setDetail(null); setResponses(null); }} title={detail?.formulario?.titulo || 'Detalle'} size="full">
        {detail && (
          <div>
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

            {detail.estadisticas_campo?.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Distribucion de Respuestas</h4>
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
                    const isExpanded = expandedRespUser === resp.usuario_id;
                    return (
                      <div key={resp.respuesta_id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedRespUser(isExpanded ? null : resp.usuario_id)}
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
