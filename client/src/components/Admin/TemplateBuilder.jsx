import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import templateService from '../../services/templateService';
import api from '../../services/api';
import FieldRenderer from '../Common/FieldRenderer';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical, Eye, EyeOff,
  Type, AlignLeft, Hash, Calendar, List, CheckSquare, Upload,
  FileUp, X, FileText, Loader2
} from 'lucide-react';

const FIELD_TYPES = [
  { value: 'texto', label: 'Texto corto', icon: Type },
  { value: 'texto_largo', label: 'Texto largo', icon: AlignLeft },
  { value: 'numero', label: 'Número', icon: Hash },
  { value: 'fecha', label: 'Fecha', icon: Calendar },
  { value: 'seleccion_unica', label: 'Selección única', icon: List },
  { value: 'seleccion_multiple', label: 'Selección múltiple', icon: CheckSquare },
  { value: 'archivo', label: 'Carga de archivo', icon: Upload },
];

const emptyField = (order) => ({
  etiqueta: '',
  tipo: 'texto',
  requerido: false,
  opciones: [],
  orden: order,
  placeholder: '',
});

export default function TemplateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [campos, setCampos] = useState([emptyField(0)]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddField, setShowAddField] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [uploadingFile, setUploadingFile] = useState(null);

  useEffect(() => {
    if (isEditing) loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    try {
      const data = await templateService.getById(id);
      setNombre(data.nombre);
      setDescripcion(data.descripcion || '');
      setCampos(data.campos?.length > 0 ? data.campos : [emptyField(0)]);
    } catch (err) {
      alert('Error cargando plantilla');
      navigate('/admin/templates');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (index, key, value) => {
    setCampos((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      if (key === 'tipo' && (value === 'texto' || value === 'texto_largo' || value === 'numero' || value === 'fecha' || value === 'archivo')) {
        updated[index].opciones = [];
      }
      return updated;
    });
  };

  const handleUploadTemplateFile = async (fieldIndex, file) => {
    setUploadingFile(fieldIndex);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/upload-template', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateField(fieldIndex, 'placeholder', response.data.url);
    } catch (err) {
      alert('Error subiendo archivo: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingFile(null);
    }
  };

  const addOption = (fieldIndex) => {
    setCampos((prev) => {
      const updated = [...prev];
      const opciones = [...(updated[fieldIndex].opciones || []), ''];
      updated[fieldIndex] = { ...updated[fieldIndex], opciones };
      return updated;
    });
  };

  const updateOption = (fieldIndex, optIndex, value) => {
    setCampos((prev) => {
      const updated = [...prev];
      const opciones = [...updated[fieldIndex].opciones];
      opciones[optIndex] = value;
      updated[fieldIndex] = { ...updated[fieldIndex], opciones };
      return updated;
    });
  };

  const removeOption = (fieldIndex, optIndex) => {
    setCampos((prev) => {
      const updated = [...prev];
      const opciones = updated[fieldIndex].opciones.filter((_, i) => i !== optIndex);
      updated[fieldIndex] = { ...updated[fieldIndex], opciones };
      return updated;
    });
  };

  const addField = (tipo, insertIndex) => {
    const newField = emptyField(insertIndex + 1);
    newField.tipo = tipo;
    setCampos((prev) => {
      const updated = [...prev];
      updated.splice(insertIndex + 1, 0, newField);
      return updated.map((f, i) => ({ ...f, orden: i }));
    });
    setShowAddField(null);
  };

  const removeField = (index) => {
    if (campos.length <= 1) return;
    setCampos((prev) => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, orden: i })));
  };

  const moveField = (from, to) => {
    if (to < 0 || to >= campos.length) return;
    setCampos((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated.map((f, i) => ({ ...f, orden: i }));
    });
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      alert('El nombre de la plantilla es requerido');
      return;
    }

    const validCampos = campos.filter((c) => c.etiqueta.trim());
    if (validCampos.length === 0) {
      alert('Agrega al menos un campo con etiqueta');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        campos: validCampos.map((c, i) => ({
          ...c,
          orden: i,
          opciones: c.tipo === 'seleccion_unica' || c.tipo === 'seleccion_multiple'
            ? c.opciones.filter((o) => o.trim())
            : [],
        })),
      };

      if (isEditing) {
        await templateService.update(id, payload);
      } else {
        await templateService.create(payload);
      }

      navigate('/admin/templates');
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const previewValues = {};
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={() => navigate('/admin/templates')} className="text-gray-400 hover:text-gray-600 mr-3">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowPreview(!showPreview)} className="btn-secondary flex items-center">
            {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showPreview ? 'Editar' : 'Preview'}
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Info de la plantilla */}
      <div className="card mb-6">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre de la plantilla *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Evaluación Mensual"
              className="input text-lg"
              disabled={showPreview}
            />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción opcional de la plantilla..."
              rows={2}
              className="input"
              disabled={showPreview}
            />
          </div>
        </div>
      </div>

      {/* Campos */}
      {showPreview ? (
        <div>
          <div className="bg-white border border-[#e2e8f0] rounded-t-lg">
            <div className="px-8 pt-8 pb-4">
              <h2 className="text-[24px] font-bold text-[#232856] leading-tight">{nombre}</h2>
              {descripcion && <p className="text-[#64748b] mt-2 text-[15px]">{descripcion}</p>}
            </div>
          </div>
          <div className="bg-white border border-[#e2e8f0] border-t-0 rounded-b-lg">
            <div className="px-8 py-6">
              <DynamicForm campos={campos.filter((c) => c.etiqueta.trim())} values={previewValues} disabled />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {campos.map((campo, index) => (
            <div key={index} className="card relative group">
              {/* Controles superiores */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <GripVertical className="w-5 h-5 text-gray-300" />
                  <span className="text-sm font-medium text-gray-500">Campo {index + 1}</span>
                  <span className="badge-gray">{FIELD_TYPES.find((t) => t.value === campo.tipo)?.label}</span>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveField(index, index - 1)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Mover arriba"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveField(index, index + 1)}
                    disabled={index === campos.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Mover abajo"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeField(index)}
                    disabled={campos.length <= 1}
                    className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="label">Etiqueta *</label>
                  <input
                    type="text"
                    value={campo.etiqueta}
                    onChange={(e) => updateField(index, 'etiqueta', e.target.value)}
                    placeholder="Ej: Nombre de la empresa"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Tipo de campo</label>
                  <select
                    value={campo.tipo}
                    onChange={(e) => updateField(index, 'tipo', e.target.value)}
                    className="input"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-end mb-3">
                <label className="flex items-center space-x-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={campo.requerido}
                    onChange={(e) => updateField(index, 'requerido', e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Campo requerido</span>
                </label>
              </div>

              {/* Subir documento descargable para campos tipo archivo */}
              {campo.tipo === 'archivo' && (
                <div className="border-t border-gray-100 pt-3 mb-1">
                  <label className="label">Documento descargable (opcional)</label>
                  <p className="text-xs text-gray-400 mb-2">
                    Sube un archivo para que los usuarios lo descarguen como plantilla antes de responder.
                  </p>
                  {campo.placeholder && campo.placeholder.startsWith('/') ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center min-w-0">
                        <FileText className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                        <span className="text-sm text-blue-700 truncate">{campo.placeholder.split('/').pop()}</span>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <a
                          href={campo.placeholder}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
                        >
                          Ver
                        </a>
                        <button
                          type="button"
                          onClick={() => updateField(index, 'placeholder', '')}
                          className="text-gray-400 hover:text-red-500 p-1"
                          title="Quitar documento"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                      {uploadingFile === index ? (
                        <div className="flex items-center space-x-2 text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm font-medium">Subiendo...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-gray-500">
                          <FileUp className="w-4 h-4" />
                          <span className="text-sm font-medium">Subir documento</span>
                        </div>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleUploadTemplateFile(index, file);
                          e.target.value = '';
                        }}
                        disabled={uploadingFile === index}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Opciones para selección */}
              {(campo.tipo === 'seleccion_unica' || campo.tipo === 'seleccion_multiple') && (
                <div className="border-t border-gray-100 pt-3">
                  <label className="label">Opciones</label>
                  <div className="space-y-2">
                    {(campo.opciones || []).map((opcion, optIdx) => (
                      <div key={optIdx} className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400 w-6">{optIdx + 1}.</span>
                        <input
                          type="text"
                          value={opcion}
                          onChange={(e) => updateOption(index, optIdx, e.target.value)}
                          placeholder={`Opción ${optIdx + 1}`}
                          className="input flex-1"
                        />
                        <button
                          onClick={() => removeOption(index, optIdx)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(index)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      + Agregar opción
                    </button>
                  </div>
                </div>
              )}

              {/* Botón agregar campo debajo */}
              <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-100">
                <div className="relative">
                  <button
                    onClick={() => setShowAddField(showAddField === index ? null : index)}
                    className="text-sm text-gray-400 hover:text-primary-600 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar campo aquí
                  </button>
                  {showAddField === index && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10 w-48">
                      {FIELD_TYPES.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => addField(t.value, index)}
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                        >
                          <t.icon className="w-4 h-4 mr-2 text-gray-400" />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente preview interno
function DynamicForm({ campos, values, disabled }) {
  return (
    <div className="divide-y divide-[#f1f5f9]">
      {campos.map((campo, index) => (
        <div key={campo.id || index} className="py-6 first:pt-0">
          <div className="flex gap-4">
            <div className="flex-shrink-0 pt-1">
              <div className="w-7 h-7 rounded-full bg-[#f1f5f9] text-[#64748b] flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-3">
                <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                  Pregunta {index + 1} de {campos.length}
                </span>
                {campo.requerido && (
                  <span className="text-[#D71E1F] ml-1 text-xs">*</span>
                )}
              </div>
              <FieldRenderer campo={campo} value={values?.[campo.id]} disabled={disabled} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
