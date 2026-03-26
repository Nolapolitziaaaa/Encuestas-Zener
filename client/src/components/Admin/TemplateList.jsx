import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import templateService from '../../services/templateService';
import Modal from '../Common/Modal';
import { Plus, Edit, Trash2, Eye, ToggleLeft, ToggleRight } from 'lucide-react';

export default function TemplateList() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templateService.list();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Error cargando plantillas:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (template) => {
    try {
      await templateService.update(template.id, { activa: !template.activa });
      loadTemplates();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await templateService.remove(showDelete.id);
      setTemplates((prev) => prev.filter((t) => t.id !== showDelete.id));
      setShowDelete(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Plantillas</h1>
          <p className="text-gray-600">Gestiona las plantillas de formulario</p>
        </div>
        <Link to="/admin/templates/new" className="btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Nueva Plantilla
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No hay plantillas creadas</p>
          <Link to="/admin/templates/new" className="btn-primary inline-flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Crear Primera Plantilla
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-lg">{template.nombre}</h3>
                <span className={template.activa ? 'badge-green' : 'badge-gray'}>
                  {template.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              {template.descripcion && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{template.descripcion}</p>
              )}

              <div className="flex items-center text-sm text-gray-500 mb-4 space-x-4">
                <span>{template.total_campos} campos</span>
                <span>{template.total_formularios} formularios</span>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                <Link
                  to={`/admin/templates/${template.id}/edit`}
                  className="btn-secondary text-sm py-1.5 px-3 flex items-center"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Link>
                <button
                  onClick={() => toggleActive(template)}
                  className="btn-secondary text-sm py-1.5 px-3 flex items-center"
                  title={template.activa ? 'Desactivar' : 'Activar'}
                >
                  {template.activa ? (
                    <ToggleRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => setShowDelete(template)}
                  className="btn-secondary text-sm py-1.5 px-3 text-red-600 hover:bg-red-50 flex items-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Eliminar Plantilla"
      >
        <p className="text-gray-600 mb-4">
          ¿Estás seguro de eliminar la plantilla <strong>{showDelete?.nombre}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex space-x-3">
          <button onClick={() => setShowDelete(null)} className="flex-1 btn-secondary">
            Cancelar
          </button>
          <button onClick={handleDelete} className="flex-1 btn-danger">
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}
