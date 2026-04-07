import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import reportService from '../../services/reportService';
import templateService from '../../services/templateService';
import formService from '../../services/formService';
import StatsCard from '../Common/StatsCard';
import Modal from '../Common/Modal';
import FilePreview from '../Common/FilePreview';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Eye, FileSpreadsheet, CheckCircle, Clock, AlertTriangle,
  Search, ChevronDown, ChevronRight, UserCheck, TrendingUp,
  ShieldCheck, XCircle, FileDown, Building2, Calendar, Download, Filter
} from 'lucide-react';

const TABS = [
  { key: 'usuarios', label: 'Por Usuario', icon: UserCheck },
  { key: 'empresas', label: 'Por Empresa', icon: Building2 },
  { key: 'encuestas', label: 'Encuestas', icon: FileSpreadsheet },
];

const PIE_COLORS = ['#22c55e', '#FFD600', '#ef4444'];

/* ─── Reusable response item (used in Por Usuario tab) ─── */
function ResponseItem({ resp, campos, onValidate, onRejectOpen, onPreview, validating }) {
  const [expanded, setExpanded] = useState(false);

  const vBadge = (estado) => {
    switch (estado) {
      case 'validado': return 'badge-green';
      case 'rechazado': return 'badge-red';
      default: return 'badge-yellow';
    }
  };

  const renderVal = (val) => {
    if (!val) return <span className="text-xs text-gray-300 italic">Sin respuesta</span>;

    // Detectar archivo: por tipo o por URL en cualquier campo
    const fileUrl = val.archivo_url
      || (typeof val.valor_texto === 'string' && val.valor_texto.startsWith('/uploads/') ? val.valor_texto : null);

    if (fileUrl) {
      const filename = fileUrl.split('/').pop() || 'archivo';
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPreview(fileUrl, filename)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#7095B4]/10 text-[#7095B4] hover:bg-[#7095B4]/20 transition-colors"
            title={`Previsualizar: ${filename}`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-gray-600 truncate max-w-[180px]" title={filename}>{filename}</span>
          <a href={fileUrl} download target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-gray-400 hover:text-gray-600"
            title="Descargar">
            <FileDown className="w-3.5 h-3.5" />
          </a>
        </div>
      );
    }

    const display = val.valor_texto || val.valor_numero || val.valor_fecha
      || (val.valor_json ? (Array.isArray(val.valor_json) ? val.valor_json.join(', ') : JSON.stringify(val.valor_json)) : null);
    return display
      ? <span className="text-xs text-gray-600">{display}</span>
      : <span className="text-xs text-gray-300 italic">Sin respuesta</span>;
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
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
          <span className={vBadge(resp.estado_validacion)}>
            {resp.estado_validacion === 'validado' ? 'Validado' : resp.estado_validacion === 'rechazado' ? 'Rechazado' : 'Pendiente'}
          </span>
          <span className="text-xs text-gray-400">{new Date(resp.fecha_envio).toLocaleDateString('es-CL')}</span>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 py-3 border-t border-gray-100">
          {resp.estado_validacion === 'rechazado' && resp.comentario_validacion && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-semibold text-red-700 uppercase mb-1">Motivo de rechazo:</p>
              <p className="text-sm text-red-600">{resp.comentario_validacion}</p>
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-2 text-gray-500 font-medium text-xs uppercase">#</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium text-xs uppercase">Campo</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium text-xs uppercase">Respuesta</th>
              </tr>
            </thead>
            <tbody>
              {campos.map((campo, idx) => {
                const val = resp.valores?.find((v) => v.campo_plantilla_id === campo.id);
                return (
                  <tr key={campo.id} className="border-b border-gray-50">
                    <td className="py-2.5 px-2 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="py-2.5 px-2"><span className="text-gray-700 text-xs">{campo.etiqueta}</span></td>
                    <td className="py-2.5 px-2">{renderVal(val)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
            {(!resp.estado_validacion || resp.estado_validacion === 'pendiente') && (
              <>
                <button
                  onClick={() => onValidate(resp.respuesta_id)}
                  disabled={validating === resp.respuesta_id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {validating === resp.respuesta_id ? 'Validando...' : 'Validar'}
                </button>
                <button
                  onClick={() => onRejectOpen(resp)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Rechazar
                </button>
              </>
            )}
            {resp.estado_validacion === 'validado' && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />Validado
              </span>
            )}
            {resp.estado_validacion === 'rechazado' && (
              <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />Rechazado
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsDetails() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('usuarios');

  // Shared date filters
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // User report state
  const [usuarios, setUsuarios] = useState([]);
  const [userFilterForm, setUserFilterForm] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [userDetailData, setUserDetailData] = useState(null);

  // Company report state
  const [empresas, setEmpresas] = useState([]);
  const [companySearch, setCompanySearch] = useState('');
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [companyDetailData, setCompanyDetailData] = useState(null);
  const [loadingCompanyDetail, setLoadingCompanyDetail] = useState(false);

  // Survey report state
  const [surveys, setSurveys] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [surveyStatus, setSurveyStatus] = useState('');
  const [surveyTemplate, setSurveyTemplate] = useState('');
  const [surveySearch, setSurveySearch] = useState('');
  const [expandedSurvey, setExpandedSurvey] = useState(null);
  const [surveyUsersData, setSurveyUsersData] = useState(null);
  const [loadingSurveyUsers, setLoadingSurveyUsers] = useState(false);

  // Validation state
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [validating, setValidating] = useState(null);

  // User response modal state
  const [userRespModal, setUserRespModal] = useState(null);
  const [userRespData, setUserRespData] = useState(null);
  const [loadingUserResp, setLoadingUserResp] = useState(false);

  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  // Export loading
  const [exportingAll, setExportingAll] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-open response modal from notification link
  useEffect(() => {
    const viewAsignacion = searchParams.get('viewResponse');
    if (viewAsignacion) {
      const timer = setTimeout(() => {
        handleViewUserResponse(parseInt(viewAsignacion));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => loadUsers(), 300);
    return () => clearTimeout(timer);
  }, [userFilterForm, userSearch, fechaDesde, fechaHasta]);

  useEffect(() => {
    const timer = setTimeout(() => loadSurveys(), 300);
    return () => clearTimeout(timer);
  }, [surveyStatus, surveyTemplate, surveySearch, fechaDesde, fechaHasta]);

  useEffect(() => {
    const timer = setTimeout(() => loadCompanies(), 300);
    return () => clearTimeout(timer);
  }, [companySearch, fechaDesde, fechaHasta]);

  const loadData = async () => {
    try {
      const [formsRes, templatesRes, usersRes, surveysRes, companiesRes] = await Promise.all([
        formService.list(),
        templateService.list({ activa: 'true' }),
        reportService.reportByUser({}),
        reportService.reportSurveys({}),
        reportService.reportByCompany({}),
      ]);
      setForms(formsRes.forms || []);
      setTemplates(templatesRes.templates || []);
      setUsuarios(usersRes.usuarios || []);
      setSurveys(surveysRes.formularios || []);
      setEmpresas(companiesRes.empresas || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    }

    // Cargar summary independientemente para que no afecte al resto si falla
    try {
      const summaryRes = await reportService.summary();
      setSummaryData(summaryRes);
    } catch (err) {
      console.error('Error cargando resumen:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const params = {};
      if (userFilterForm) params.form_id = userFilterForm;
      if (userSearch) params.search = userSearch;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
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
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      const data = await reportService.reportSurveys(params);
      setSurveys(data.formularios || []);
    } catch (err) { console.error(err); }
  };

  const loadCompanies = async () => {
    try {
      const params = {};
      if (companySearch) params.search = companySearch;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      const data = await reportService.reportByCompany(params);
      setEmpresas(data.empresas || []);
    } catch (err) { console.error(err); }
  };

  const handleExpandCompany = async (empresa) => {
    if (expandedCompany === empresa) {
      setExpandedCompany(null);
      setCompanyDetailData(null);
      return;
    }
    setExpandedCompany(empresa);
    setCompanyDetailData(null);
    setLoadingCompanyDetail(true);
    try {
      const data = await reportService.companyFormDetail(empresa);
      setCompanyDetailData(data);
    } catch (err) { console.error(err); }
    finally { setLoadingCompanyDetail(false); }
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const params = {};
      if (surveyStatus) params.estado = surveyStatus;
      if (surveyTemplate) params.plantilla_id = surveyTemplate;
      if (surveySearch) params.search = surveySearch;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      const blob = await reportService.exportAll(params, 'xlsx');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reporte_global_encuestas.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error exportando reporte global');
    } finally {
      setExportingAll(false);
    }
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

  const handleViewUserResponse = async (asignacionId) => {
    setUserRespModal(asignacionId);
    setUserRespData(null);
    setLoadingUserResp(true);
    try {
      const data = await reportService.formResponses(asignacionId);
      setUserRespData(data);
    } catch (err) {
      console.error('Error cargando respuesta:', err.response?.data || err.message);
      alert('Error cargando respuesta: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingUserResp(false);
    }
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

  const handleExpandSurvey = async (formId) => {
    if (expandedSurvey === formId) {
      setExpandedSurvey(null);
      setSurveyUsersData(null);
      return;
    }
    setExpandedSurvey(formId);
    setSurveyUsersData(null);
    setLoadingSurveyUsers(true);
    try {
      const data = await reportService.formUserStatus(formId);
      setSurveyUsersData(data);
    } catch (err) { console.error(err); }
    finally { setLoadingSurveyUsers(false); }
  };

  const handleValidate = async (respuestaId) => {
    setValidating(respuestaId);
    try {
      await api.put(`/responses/${respuestaId}/validate`);
      if (userRespModal) {
        const data = await reportService.formResponses(userRespModal);
        setUserRespData(data);
      }
      if (expandedUser) {
        const data = await reportService.userDetail(expandedUser);
        setUserDetailData(data.asignaciones || []);
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setValidating(null);
    }
  };

  const handleRejectOpen = (resp) => {
    setRejectModal(resp);
    setRejectComment('');
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      alert('Debes ingresar un comentario de rechazo');
      return;
    }
    setRejecting(true);
    try {
      await api.put(`/responses/${rejectModal.respuesta_id}/reject`, { comentario: rejectComment });
      setRejectModal(null);
      setRejectComment('');
      if (userRespModal) {
        const data = await reportService.formResponses(userRespModal);
        setUserRespData(data);
      }
      if (expandedUser) {
        const data = await reportService.userDetail(expandedUser);
        setUserDetailData(data.asignaciones || []);
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setRejecting(false);
    }
  };

  const clearDates = () => {
    setFechaDesde('');
    setFechaHasta('');
  };

  const statusBadge = (estado) => {
    switch (estado) {
      case 'completado': return 'badge-green';
      case 'vencido': return 'badge-red';
      case 'en_progreso': return 'badge-blue';
      default: return 'badge-yellow';
    }
  };

  const validationBadge = (estado) => {
    switch (estado) {
      case 'validado': return 'badge-green';
      case 'rechazado': return 'badge-red';
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

  const validadas = parseInt(summaryData?.respuestas_validadas) || 0;
  const pendientesVal = parseInt(summaryData?.respuestas_pendientes_validacion) || 0;
  const rechazadas = parseInt(summaryData?.respuestas_rechazadas) || 0;
  const totalRespuestas = validadas + pendientesVal + rechazadas;

  const pieData = [
    { name: 'Validadas', value: validadas },
    { name: 'Pendientes', value: pendientesVal },
    { name: 'Rechazadas', value: rechazadas },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detalles de Reportes</h1>
          <p className="text-gray-600">Reportes por usuario, empresa y encuestas</p>
        </div>
        <button
          onClick={handleExportAll}
          disabled={exportingAll}
          className="flex items-center gap-2 px-4 py-2 bg-[#232856] text-white rounded-lg text-sm font-medium hover:bg-[#1a1f45] transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exportingAll ? 'Exportando...' : 'Exportar Global (Excel)'}
        </button>
      </div>

      {/* Global Date Filter */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
            <Calendar className="w-4 h-4" />
            <span>Filtrar por fecha:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="input py-1.5 px-3 text-sm"
              placeholder="Desde"
            />
            <span className="text-gray-400 text-sm">a</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="input py-1.5 px-3 text-sm"
              placeholder="Hasta"
            />
          </div>
          {(fechaDesde || fechaHasta) && (
            <button onClick={clearDates} className="text-xs text-[#7095B4] hover:underline flex items-center gap-1">
              <Filter className="w-3 h-3" />Limpiar filtro
            </button>
          )}
        </div>
      </div>

      {/* Validation KPI Cards + Pie Chart */}
      {totalRespuestas > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <StatsCard label="Validadas" value={validadas} icon={ShieldCheck} color="green" />
          <StatsCard label="Pendientes" value={pendientesVal} icon={Clock} color="yellow" />
          <StatsCard label="Rechazadas" value={rechazadas} icon={XCircle} color="red" />
          <div className="card p-4 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-gray-500 font-medium mb-2">Distribucion Validacion</p>
              <ResponsiveContainer width={160} height={100}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [`${val} respuestas`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-3 mt-1">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index] }} />
                    <span className="text-gray-500">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
              <input type="text" placeholder="Buscar por nombre, RUT, email o empresa..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="input pl-9 pr-4 w-full" />
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
                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Empresa</th>
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
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">Sin resultados</td></tr>
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
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{u.empresa || '-'}</span>
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
                      <th className="text-center py-2 px-3 text-gray-600 font-medium">Validacion</th>
                      <th className="text-center py-2 px-3 text-gray-600 font-medium">Progreso</th>
                      <th className="text-right py-2 px-3 text-gray-600 font-medium">Fecha</th>
                      <th className="text-right py-2 px-3 text-gray-600 font-medium">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDetailData.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-6 text-gray-400">Sin asignaciones</td></tr>
                    ) : userDetailData.map((a) => {
                      const total = a.total_campos || 1;
                      const responded = a.campos_respondidos || 0;
                      const pct = Math.round((responded / total) * 100);
                      const hasResponse = a.estado === 'completado' && a.respuesta_id;
                      return (
                        <tr key={a.asignacion_id} className="border-b border-gray-50">
                          <td className="py-2.5 px-3 font-medium text-gray-900">{a.formulario_titulo}</td>
                          <td className="py-2.5 px-3 text-gray-500">{a.plantilla_nombre}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={statusBadge(a.estado)}>{a.estado === 'en_progreso' ? 'En progreso' : a.estado}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {hasResponse ? (
                              <span className={validationBadge(a.estado_validacion)}>
                                {a.estado_validacion === 'validado' ? 'Validado' : a.estado_validacion === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">-</span>
                            )}
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
                          <td className="py-2.5 px-3 text-right">
                            {hasResponse && (
                              <div className="flex items-center justify-end gap-1">
                                {(!a.estado_validacion || a.estado_validacion === 'pendiente') && (
                                  <>
                                    <button
                                      onClick={() => handleValidate(a.respuesta_id)}
                                      disabled={validating === a.respuesta_id}
                                      className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      {validating === a.respuesta_id ? '...' : 'Validar'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        const user = usuarios.find((u) => u.usuario_id === expandedUser);
                                        handleRejectOpen({
                                          respuesta_id: a.respuesta_id,
                                          nombre: user?.nombre || '',
                                          apellido: user?.apellido || '',
                                          email: user?.email || '',
                                        });
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      Rechazar
                                    </button>
                                  </>
                                )}
                                {a.estado_validacion === 'validado' && (
                                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" />Validado
                                  </span>
                                )}
                                <button
                                  onClick={() => handleViewUserResponse(a.formulario_id)}
                                  className="btn-secondary text-xs py-1 px-2 flex items-center"
                                  title="Ver respuesta"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
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

      {/* TAB: POR EMPRESA */}
      {activeTab === 'empresas' && (
        <div>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatsCard label="Empresas" value={empresas.length} icon={Building2} color="blue" />
            <StatsCard label="Aprobados" value={empresas.reduce((s, e) => s + parseInt(e.aprobados || 0), 0)} icon={CheckCircle} color="green" />
            <StatsCard label="Pendientes" value={empresas.reduce((s, e) => s + (parseInt(e.pendientes || 0) + parseInt(e.vencidos || 0)), 0)} icon={Clock} color="yellow" />
            <StatsCard label="Total Proveedores" value={empresas.reduce((s, e) => s + parseInt(e.total_proveedores || 0), 0)} icon={UserCheck} color="purple" />
          </div>

          {/* Filtro */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar empresa..." value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} className="input pl-9 pr-4 w-full" />
            </div>
          </div>

          {/* Tarjetas de empresas */}
          {empresas.length === 0 ? (
            <div className="card py-12 text-center text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No se encontraron empresas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {empresas.map((emp) => {
                const total = parseInt(emp.total_asignaciones || 0);
                const comp = parseInt(emp.completados || 0);
                const ap = parseInt(emp.aprobados || 0);
                const pend = parseInt(emp.pendientes || 0);
                const venc = parseInt(emp.vencidos || 0);
                const sinValidar = comp - ap;
                const noRespondido = pend + venc;
                const pctAp = total > 0 ? Math.round((ap / total) * 100) : 0;
                const pctComp = total > 0 ? Math.round((comp / total) * 100) : 0;
                const isExpanded = expandedCompany === emp.empresa;

                return (
                  <div key={emp.empresa} className="card hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[#7095B4]/10 text-[#7095B4] flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{emp.empresa}</h4>
                          <p className="text-xs text-gray-400">{emp.total_proveedores} proveedor{emp.total_proveedores !== 1 ? 'es' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => reportService.exportCompanyDetail(emp.empresa).then((blob) => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${emp.empresa} - Estado.xlsx`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                          }).catch(() => alert('Error exportando'))}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          title="Descargar Excel"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExpandCompany(emp.empresa)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#7095B4] hover:bg-[#7095B4]/10 transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Barra de progreso principal */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500">{ap} de {total} aprobados</span>
                        <span className={`text-sm font-bold ${pctAp === 100 ? 'text-green-600' : pctAp >= 50 ? 'text-[#7095B4]' : 'text-red-500'}`}>{pctAp}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${pctAp}%` }} />
                        <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${pctComp - pctAp}%` }} />
                      </div>
                    </div>

                    {/* Métricas en fila */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-700">{total}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Asignados</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <p className="text-lg font-bold text-green-600">{ap}</p>
                        <p className="text-[10px] text-green-500 uppercase tracking-wide">Aprobados</p>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded-lg">
                        <p className="text-lg font-bold text-yellow-600">{sinValidar}</p>
                        <p className="text-[10px] text-yellow-500 uppercase tracking-wide">Sin validar</p>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded-lg">
                        <p className="text-lg font-bold text-red-500">{noRespondido}</p>
                        <p className="text-[10px] text-red-400 uppercase tracking-wide">Pendientes</p>
                      </div>
                    </div>

                    {/* Barra visual horizontal */}
                    <div className="flex rounded-full overflow-hidden h-1.5 mb-3">
                      {ap > 0 && <div className="bg-green-500" style={{ width: `${(ap / Math.max(total, 1)) * 100}%` }} />}
                      {sinValidar > 0 && <div className="bg-yellow-400" style={{ width: `${(sinValidar / Math.max(total, 1)) * 100}%` }} />}
                      {noRespondido > 0 && <div className="bg-red-300" style={{ width: `${(noRespondido / Math.max(total, 1)) * 100}%` }} />}
                    </div>

                    {/* Footer info */}
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Aprobados</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Sin validar</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-300" /> Pendientes</span>
                      </div>
                      <span className="font-medium text-gray-500">{emp.porcentaje_aprobados || 0}% aprobado</span>
                    </div>

                    {/* Detalle expandido: formularios por empresa */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        {loadingCompanyDetail ? (
                          <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#7095B4]"></div>
                          </div>
                        ) : companyDetailData ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-3 font-medium">
                              {companyDetailData.formularios.length} evaluacion{companyDetailData.formularios.length !== 1 ? 'es' : ''} asignada{companyDetailData.formularios.length !== 1 ? 's' : ''}
                            </p>
                            {companyDetailData.formularios.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-4">Sin evaluaciones asignadas</p>
                            ) : (
                              <div className="space-y-2">
                                {companyDetailData.formularios.map((f) => {
                                  const fTotal = parseInt(f.total_asignados || 0);
                                  const fAp = parseInt(f.aprobados || 0);
                                  const fComp = parseInt(f.completados || 0);
                                  const fPend = parseInt(f.pendientes || 0);
                                  const fVenc = parseInt(f.vencidos || 0);
                                  const fSinVal = fComp - fAp;
                                  const fPct = fTotal > 0 ? Math.round((fAp / fTotal) * 100) : 0;
                                  const fFechaLimite = f.fecha_limite ? new Date(f.fecha_limite) : null;
                                  const fVencido = fFechaLimite && fFechaLimite < new Date();

                                  return (
                                    <div key={f.formulario_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100/80 transition-colors">
                                      <div className="flex-1 min-w-0 mr-3">
                                        <p className="text-sm font-medium text-gray-800 truncate">{f.titulo}</p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                          <span className="flex items-center gap-1 text-xs text-green-600">
                                            <CheckCircle className="w-3 h-3" />{fAp}
                                          </span>
                                          <span className="flex items-center gap-1 text-xs text-yellow-600">
                                            <Clock className="w-3 h-3" />{fSinVal} sin validar
                                          </span>
                                          <span className="flex items-center gap-1 text-xs text-red-500">
                                            <AlertTriangle className="w-3 h-3" />{fPend + fVenc} pendientes
                                          </span>
                                          {fFechaLimite && (
                                            <span className={`text-xs ${fVencido ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                              {fVencido ? 'Vencido' : fFechaLimite.toLocaleDateString('es-CL')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${fPct}%` }} />
                                        </div>
                                        <span className={`text-xs font-bold w-10 text-right ${fPct === 100 ? 'text-green-600' : 'text-gray-500'}`}>{fPct}%</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: ENCUESTAS */}
      {activeTab === 'encuestas' && (
        <div>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatsCard label="Formularios" value={surveys.length} icon={FileSpreadsheet} color="blue" />
            <StatsCard label="Aprobados" value={surveys.reduce((s, f) => s + parseInt(f.aprobados || 0), 0)} icon={CheckCircle} color="green" />
            <StatsCard label="Pendientes" value={surveys.reduce((s, f) => s + (parseInt(f.total_asignados || 0) - parseInt(f.completados || 0)), 0)} icon={Clock} color="yellow" />
            <StatsCard label="Vencidos" value={surveys.reduce((s, f) => s + parseInt(f.vencidos || 0), 0)} icon={AlertTriangle} color="red" />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
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

          {/* Tarjetas de formularios */}
          {surveys.length === 0 ? (
            <div className="card py-12 text-center text-gray-400">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No se encontraron formularios</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {surveys.map((f) => {
                const total = parseInt(f.total_asignados || 0);
                const comp = parseInt(f.completados || 0);
                const ap = parseInt(f.aprobados || 0);
                const pend = total - comp;
                const sinValidar = comp - ap;
                const pctAp = total > 0 ? Math.round((ap / total) * 100) : 0;
                const pctComp = total > 0 ? Math.round((comp / total) * 100) : 0;
                const isExpanded = expandedSurvey === f.id;
                const fechaLimite = f.fecha_limite ? new Date(f.fecha_limite) : null;
                const vencido = fechaLimite && fechaLimite < new Date();

                return (
                  <div key={f.id} className="card hover:shadow-md transition-shadow">
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0 pr-3">
                        <h4 className="font-semibold text-gray-900 truncate" title={f.titulo}>{f.titulo}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{f.plantilla_nombre}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => reportService.exportFormStatus(f.id).then((blob) => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${f.titulo} - Estado.xlsx`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                          }).catch(() => alert('Error exportando'))}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          title="Descargar Excel"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExpandSurvey(f.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#7095B4] hover:bg-[#7095B4]/10 transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Barra de progreso principal */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500">{ap} de {total} aprobados</span>
                        <span className={`text-sm font-bold ${pctAp === 100 ? 'text-green-600' : pctAp >= 50 ? 'text-[#7095B4]' : 'text-red-500'}`}>{pctAp}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${pctAp}%` }} />
                        <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${pctComp - pctAp}%` }} />
                      </div>
                    </div>

                    {/* Métricas en fila */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-700">{total}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Asignados</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <p className="text-lg font-bold text-green-600">{ap}</p>
                        <p className="text-[10px] text-green-500 uppercase tracking-wide">Aprobados</p>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded-lg">
                        <p className="text-lg font-bold text-yellow-600">{sinValidar}</p>
                        <p className="text-[10px] text-yellow-500 uppercase tracking-wide">Sin validar</p>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded-lg">
                        <p className="text-lg font-bold text-red-500">{pend}</p>
                        <p className="text-[10px] text-red-400 uppercase tracking-wide">Pendientes</p>
                      </div>
                    </div>

                    {/* Barra visual horizontal (mini chart) */}
                    <div className="flex rounded-full overflow-hidden h-1.5 mb-3">
                      {ap > 0 && <div className="bg-green-500" style={{ width: `${(ap / Math.max(total, 1)) * 100}%` }} />}
                      {sinValidar > 0 && <div className="bg-yellow-400" style={{ width: `${(sinValidar / Math.max(total, 1)) * 100}%` }} />}
                      {pend > 0 && <div className="bg-red-300" style={{ width: `${(pend / Math.max(total, 1)) * 100}%` }} />}
                    </div>

                    {/* Footer info */}
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Aprobados</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Sin validar</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-300" /> Pendientes</span>
                      </div>
                      {fechaLimite && (
                        <span className={vencido ? 'text-red-500 font-medium' : ''}>
                          {vencido ? 'Vencido' : `Vence: ${fechaLimite.toLocaleDateString('es-CL')}`}
                        </span>
                      )}
                    </div>

                    {/* Detalle expandido */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        {loadingSurveyUsers ? (
                          <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#7095B4]"></div>
                          </div>
                        ) : surveyUsersData ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                  <th className="text-left py-2 px-2 text-gray-500 font-medium text-xs">Proveedor</th>
                                  <th className="text-left py-2 px-2 text-gray-500 font-medium text-xs">Empresa</th>
                                  <th className="text-center py-2 px-2 text-gray-500 font-medium text-xs">Estado</th>
                                  <th className="text-center py-2 px-2 text-gray-500 font-medium text-xs">Progreso</th>
                                  <th className="text-center py-2 px-2 text-gray-500 font-medium text-xs">Validacion</th>
                                  <th className="text-right py-2 px-2 text-gray-500 font-medium text-xs">Fecha</th>
                                </tr>
                              </thead>
                              <tbody>
                                {surveyUsersData.usuarios?.length === 0 ? (
                                  <tr><td colSpan={6} className="text-center py-4 text-gray-400 text-xs">Sin usuarios asignados</td></tr>
                                ) : surveyUsersData.usuarios.map((u) => (
                                  <tr key={u.asignacion_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="py-2 px-2">
                                      <p className="text-xs font-medium text-gray-900">{u.nombre} {u.apellido}</p>
                                      <p className="text-[11px] text-gray-400">{u.email}</p>
                                    </td>
                                    <td className="py-2 px-2 text-xs text-gray-600">{u.empresa || '-'}</td>
                                    <td className="py-2 px-2 text-center">
                                      {u.estado === 'completado' ? (
                                        <span className="badge-green">Completado</span>
                                      ) : u.estado === 'en_progreso' ? (
                                        <span className="badge-blue">En progreso</span>
                                      ) : u.estado === 'vencido' ? (
                                        <span className="badge-red">Vencido</span>
                                      ) : (
                                        <span className="badge-yellow">Pendiente</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${u.progreso === 100 ? 'bg-green-500' : u.progreso > 0 ? 'bg-yellow-500' : 'bg-gray-300'}`}
                                            style={{ width: `${u.progreso}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-gray-500">{u.campos_respondidos}/{u.total_campos}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                      {u.respondido && u.respuesta_id ? (
                                        u.estado_validacion === 'validado' ? (
                                          <span className="badge-green">Validado</span>
                                        ) : u.estado_validacion === 'rechazado' ? (
                                          <span className="badge-red">Rechazado</span>
                                        ) : (
                                          <span className="badge-yellow">Pendiente</span>
                                        )
                                      ) : (
                                        <span className="text-xs text-gray-300">-</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-2 text-right text-xs text-gray-500">
                                      {u.fecha_respuesta ? new Date(u.fecha_respuesta).toLocaleDateString('es-CL') : new Date(u.fecha_envio).toLocaleDateString('es-CL')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL RESPUESTA DE USUARIO (desde Por Usuario) */}
      <Modal isOpen={!!userRespModal} onClose={() => { setUserRespModal(null); setUserRespData(null); }} title="Respuesta del Usuario" size="full">
        {userRespData && (
          <div>
            {loadingUserResp ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : userRespData.respuestas.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay respuestas para este formulario.</p>
            ) : (
              <div className="space-y-3">
                {userRespData.respuestas.map((resp) => (
                  <ResponseItem key={resp.respuesta_id} resp={resp} campos={userRespData.campos}
                    onValidate={handleValidate} onRejectOpen={handleRejectOpen}
                    onPreview={(url, name) => setFilePreview({ url, filename: name })}
                    validating={validating} />
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL RECHAZO */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Rechazar Respuesta</h3>
              <p className="text-sm text-gray-500 mt-1">
                {rejectModal.nombre} {rejectModal.apellido} &middot; {rejectModal.email}
              </p>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <label className="label">Motivo del rechazo *</label>
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="Explica por que esta respuesta fue rechazada..."
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Se notificara al usuario por email y podra corregir y reenviar su respuesta.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => { setRejectModal(null); setRejectComment(''); }}
                  className="flex-1 btn-secondary"
                  disabled={rejecting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejecting || !rejectComment.trim()}
                  className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-md font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {rejecting ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {filePreview && (
        <FilePreview
          url={filePreview.url}
          filename={filePreview.filename}
          onClose={() => setFilePreview(null)}
        />
      )}
    </div>
  );
}
