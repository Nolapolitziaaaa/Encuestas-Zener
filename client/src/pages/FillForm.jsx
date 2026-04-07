import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import formService from '../services/formService';
import DynamicForm, { useFileUpload } from '../components/Common/DynamicForm';
import { ClipboardList, Check, AlertTriangle, ArrowLeft, Clock, Save, XCircle } from 'lucide-react';

export default function FillForm() {
  const { asignacionId } = useParams();
  const navigate = useNavigate();
  const { uploadFile, uploading } = useFileUpload();

  const [formulario, setFormulario] = useState(null);
  const [campos, setCampos] = useState([]);
  const [values, setValues] = useState({});
  const [rechazado, setRechazado] = useState(false);
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadForm();
  }, [asignacionId]);

  const loadForm = async () => {
    try {
      const response = await api.get(`/forms/assignment/${asignacionId}`);
      const data = response.data;

      setFormulario(data);
      setCampos(data.campos || []);

      if (data.rechazado) {
        setRechazado(true);
        setComentarioRechazo(data.comentario_validacion || '');
        if (data.valores_previos && Object.keys(data.valores_previos).length > 0) {
          setValues(data.valores_previos);
        }
      } else {
        try {
          const draft = await formService.loadDraft(asignacionId);
          if (draft.valores && Object.keys(draft.valores).length > 0) {
            setValues(draft.valores);
          }
        } catch (draftErr) {
          // No draft found, start fresh
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar el formulario');
    } finally {
      setLoading(false);
    }
  };

  const buildValores = () => {
    return campos.map((campo) => {
      const value = values[campo.id];
      let valor = { campo_plantilla_id: campo.id };

      if (campo.tipo === 'archivo') {
        valor.archivo_url = value || null;
      } else if (campo.tipo === 'seleccion_multiple') {
        valor.valor_json = value || [];
      } else if (campo.tipo === 'numero') {
        valor.valor_numero = value ? parseFloat(value) : null;
      } else if (campo.tipo === 'fecha') {
        valor.valor_fecha = value || null;
      } else {
        valor.valor_texto = value || null;
      }

      return valor;
    });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const valores = buildValores();
      await formService.saveDraft(asignacionId, valores);
      setLastSaved(new Date());
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const valores = buildValores();
      await api.post(`/responses/${asignacionId}/submit`, { valores });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar la respuesta');
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const handleChange = (campoId, value) => {
    setValues((prev) => ({ ...prev, [campoId]: value }));
  };

  const handleFileUpload = async (campoId, file) => {
    const url = await uploadFile(campoId, file);
    if (url) {
      setValues((prev) => ({ ...prev, [campoId]: url }));
    }
  };

  const answeredCount = campos.filter((c) => {
    const v = values[c.id];
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
  }).length;

  const progressPercent = campos.length > 0 ? Math.round((answeredCount / campos.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7095B4]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-[#D71E1F] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#232856] mb-2">Error</h2>
          <p className="text-[#64748b] mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="bg-[#7095B4] text-white px-6 py-2.5 rounded-md font-medium hover:bg-[#5c80a0] transition-colors">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Header bar */}
      <header className="bg-[#232856] text-white sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/')}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#7095B4] flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-white/80 font-medium hidden sm:inline truncate max-w-xs">
              {formulario?.titulo}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-white/60">{answeredCount}/{campos.length}</span>
            <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7095B4] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[800px] mx-auto px-4 py-8">
        {/* Rejection banner */}
        {rechazado && (
          <div className="bg-red-50 border border-red-200 rounded-lg mb-6 p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Tu respuesta fue rechazada</p>
              {comentarioRechazo && (
                <p className="text-sm text-red-600 mt-1">Motivo: {comentarioRechazo}</p>
              )}
              <p className="text-xs text-red-500 mt-1.5">Por favor corrige los campos necesarios y vuelve a enviar.</p>
            </div>
          </div>
        )}

        {/* Title card */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg mb-0">
          <div className="px-8 pt-8 pb-6">
            <h1 className="text-[24px] font-bold text-[#232856] leading-tight">
              {formulario?.titulo}
            </h1>
            {formulario?.plantilla_nombre && (
              <p className="text-sm text-[#94a3b8] mt-1 font-medium uppercase tracking-wide">
                {formulario.plantilla_nombre}
              </p>
            )}
            {formulario?.plantilla_descripcion && (
              <div className="mt-3 text-[#475569] text-[15px] leading-relaxed whitespace-pre-line">
                {formulario.plantilla_descripcion}
              </div>
            )}
            {formulario?.formulario_fecha_limite && (
              <p className="text-[#94a3b8] text-sm mt-3 flex items-center">
                <Clock className="w-4 h-4 mr-1.5" />
                Fecha límite: {new Date(formulario.formulario_fecha_limite).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Progress bar */}
          <div className="px-8 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-[#64748b] uppercase tracking-wide">Progreso</span>
              <span className="text-xs font-semibold text-[#7095B4]">{progressPercent}%</span>
            </div>
            <div className="h-1 bg-[#e2e8f0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7095B4] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white border border-[#e2e8f0] border-t-0 rounded-b-lg">
          <div className="px-8 py-6">
            <DynamicForm
              campos={campos}
              values={values}
              onChange={handleChange}
              onFileUpload={handleFileUpload}
            />

            {uploading && (
              <div className="mt-4 flex items-center space-x-2 p-3 bg-[#f0f5fa] rounded-md text-sm text-[#7095B4]">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#7095B4] border-t-transparent" />
                <span>Subiendo archivo...</span>
              </div>
            )}

            {/* Save / Submit buttons */}
            <div className="mt-8 pt-6 border-t border-[#e2e8f0] flex items-center justify-between">
              <div className="text-xs text-[#94a3b8]">
                {lastSaved && `Guardado a las ${lastSaved.toLocaleTimeString('es-CL')}`}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || uploading || submitting}
                  className="bg-[#232856] text-white px-6 py-2.5 rounded-md font-medium text-[15px] hover:bg-[#1a1f40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={submitting || uploading || saving}
                  className="bg-[#7095B4] text-white px-6 py-2.5 rounded-md font-medium text-[15px] hover:bg-[#5c80a0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Enviando...' : 'Enviar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-[#94a3b8]">
            Zener Chile &copy; {new Date().getFullYear()} &mdash; Encuestas de Evaluación
          </p>
        </div>
      </main>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-fade-in">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-[#f0f5fa] flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-[#7095B4]" />
              </div>
              <h3 className="text-lg font-semibold text-[#232856] mb-2">¿Confirmar envío?</h3>
              <p className="text-[#64748b] text-sm mb-1">
                Has respondido <span className="font-semibold text-[#232856]">{answeredCount}</span> de <span className="font-semibold text-[#232856]">{campos.length}</span> preguntas.
              </p>
              {answeredCount < campos.length && (
                <p className="text-[#FFD600] text-sm mb-4">
                  Tienes {campos.length - answeredCount} pregunta{campos.length - answeredCount > 1 ? 's' : ''} sin responder.
                </p>
              )}
              {answeredCount >= campos.length && <div className="mb-4" />}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-white text-[#64748b] px-4 py-2.5 rounded-md font-medium border border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors"
                  disabled={submitting}
                >
                  Revisar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-[#7095B4] text-white px-4 py-2.5 rounded-md font-medium hover:bg-[#5c80a0] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
