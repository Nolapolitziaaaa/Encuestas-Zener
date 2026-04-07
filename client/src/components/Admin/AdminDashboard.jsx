import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import reportService from '../../services/reportService';
import StatsCard from '../Common/StatsCard';
import {
  Users, FileText, ClipboardList, CheckCircle,
  Clock, AlertTriangle, Mail, BarChart3, ChevronRight
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await reportService.summary();
      setStats(data);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen general del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard label="Proveedores" value={stats.total_proveedores} icon={Users} color="blue" />
        <StatsCard label="Plantillas Activas" value={stats.plantillas_activas} icon={FileText} color="green" />
        <StatsCard label="Formularios" value={stats.total_formularios} icon={ClipboardList} color="purple" />
        <StatsCard label="Respuestas" value={stats.asignaciones_completadas} icon={CheckCircle} color="green" subtext={`de ${stats.total_asignaciones} asignaciones`} />
      </div>

      {/* Acciones rápidas */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link to="/admin/templates/new" className="flex items-center p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
            <FileText className="w-5 h-5 text-primary-600 mr-3" />
            <span className="text-sm font-medium text-primary-900">Nueva Plantilla</span>
          </Link>
          <Link to="/admin/invitations" className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <Mail className="w-5 h-5 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-blue-900">Invitar Usuario</span>
          </Link>
          <Link to="/admin/forms" className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <ClipboardList className="w-5 h-5 text-purple-600 mr-3" />
            <span className="text-sm font-medium text-purple-900">Crear Formulario</span>
          </Link>
          <Link to="/admin/reports" className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <BarChart3 className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-sm font-medium text-green-900">Ver Resumen</span>
          </Link>
        </div>
      </div>

      {/* Formularios por usuarios */}
      {stats.por_usuario?.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Formularios por Usuarios</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-gray-600 font-medium">Formulario</th>
                  <th className="text-center py-3 px-2 text-gray-600 font-medium">Asignados</th>
                  <th className="text-center py-3 px-2 text-gray-600 font-medium">Completados</th>
                  <th className="text-center py-3 px-2 text-gray-600 font-medium">% Respuesta</th>
                </tr>
              </thead>
              <tbody>
                {stats.por_usuario.map((item, idx) => {
                  const pct = item.total_asignados > 0 ? Math.round((item.completados / item.total_asignados) * 100) : 0;
                  return (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium text-gray-900">{item.titulo}</td>
                      <td className="py-3 px-2 text-center">{item.total_asignados}</td>
                      <td className="py-3 px-2 text-center text-green-600">{item.completados}</td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {pct}%
                          </span>
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
    </div>
  );
}
