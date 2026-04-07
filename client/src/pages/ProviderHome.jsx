import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import formService from '../services/formService';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import StatsCard from '../components/Common/StatsCard';
import { ClipboardList, CheckCircle, Clock, AlertTriangle, ChevronRight, XCircle } from 'lucide-react';

export default function ProviderHome() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pendingRes, completedRes] = await Promise.all([
        formService.getMyPending(),
        formService.getMyCompleted(),
      ]);
      setPending(pendingRes || []);
      setCompleted(completedRes || []);
      setRejected((completedRes || []).filter((item) => item.estado_validacion === 'rechazado'));
      setCompleted((completedRes || []).filter((item) => item.estado_validacion !== 'rechazado'));
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido, {user?.nombre}
          </h1>
          <p className="text-gray-600 mt-1">
            Revisa tus formularios pendientes y completados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            label="Pendientes"
            value={pending.length}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            label="Completados"
            value={completed.length}
            icon={CheckCircle}
            color="green"
          />
          <StatsCard
            label="Total"
            value={pending.length + completed.length}
            icon={ClipboardList}
            color="blue"
          />
        </div>

        {/* Formularios Pendientes */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
            Formularios Pendientes
          </h2>

          {pending.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No tienes formularios pendientes
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((item) => {
                const isInProgress = item.asignacion_estado === 'en_progreso';
                const totalCampos = item.total_campos || 1;
                const camposRespondidos = item.campos_respondidos || 0;
                const pct = Math.round((camposRespondidos / totalCampos) * 100);

                return (
                  <div
                    key={item.asignacion_id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{item.titulo}</p>
                        {isInProgress && <span className="badge-blue text-xs flex-shrink-0">En progreso</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{item.plantilla_nombre}</p>
                      {item.formulario_fecha_limite && (
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <Clock className="w-4 h-4 mr-1" />
                          Vence: {new Date(item.formulario_fecha_limite).toLocaleDateString('es-CL')}
                        </p>
                      )}
                      {isInProgress && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#7095B4] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{pct}%</span>
                        </div>
                      )}
                    </div>
                    <Link
                      to={`/form/${item.asignacion_id}`}
                      className="btn-primary flex items-center flex-shrink-0 ml-3"
                    >
                      {isInProgress ? 'Continuar' : 'Llenar'}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Formularios Rechazados */}
        {rejected.length > 0 && (
          <div className="card mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              Requieren Correccion
            </h2>
            <div className="space-y-3">
              {rejected.map((item) => (
                <div
                  key={item.asignacion_id}
                  className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{item.titulo}</p>
                      <span className="badge-red text-xs flex-shrink-0">Rechazado</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{item.plantilla_nombre}</p>
                    {item.comentario_validacion && (
                      <p className="text-xs text-red-500 mt-1">Motivo: {item.comentario_validacion}</p>
                    )}
                  </div>
                  <Link
                    to={`/form/${item.asignacion_id}`}
                    className="flex items-center flex-shrink-0 ml-3 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Corregir
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formularios Completados */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            Formularios Completados
          </h2>

          {completed.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aún no has completado ningún formulario
            </p>
          ) : (
            <div className="space-y-3">
              {completed.map((item) => (
                <div
                  key={item.asignacion_id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.titulo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.plantilla_nombre}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Completado: {new Date(item.fecha_respuesta).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                  <span className="badge-green">Completado</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
