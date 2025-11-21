import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { getActivityLogs } from '../services/activityLogService';

const ActivityLogPage = () => {
  const { token, user, isEditor } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    entity: '',
    dateFrom: '',
    dateTo: '',
    seccion: ''
  });

  // Load logs
  const loadLogs = useCallback(async () => {
    if (!token || !isEditor) return;
    
    setLoading(true);
    try {
      const data = await getActivityLogs(token, filters);
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error loading logs:', error);
      alert('Error al cargar logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [token, isEditor, filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  // Format action for display
  const formatAction = (action) => {
    const actionMap = {
      'create': { text: 'Crear', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      'update': { text: 'Actualizar', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      'delete': { text: 'Eliminar', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
    };
    const actionData = actionMap[action] || { text: action, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' };
    return actionData;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (logs.length === 0) {
      alert('No hay logs para exportar');
      return;
    }

    const headers = ['Timestamp', 'Usuario', 'Acción', 'Entidad', 'ID Entidad', 'Sección (Antes)', 'Sección (Después)'];
    const rows = logs.map(log => {
      const beforeSeccion = log.before?.seccion || '';
      const afterSeccion = log.after?.seccion || '';
      return [
        formatTimestamp(log.timestamp),
        log.user,
        log.action,
        log.entity,
        log.entity_id,
        beforeSeccion,
        afterSeccion
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isEditor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] dark:bg-[#0F1425]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Acceso Denegado</h1>
          <p className="text-gray-600 dark:text-gray-300">Solo los editores pueden acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F7FA] dark:bg-[#0F1425] min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-[#121C39] rounded-lg shadow-md p-4 sm:p-6 mb-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">
                📋 Gestión de Actividad (Auditoría)
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Historial completo de todas las acciones realizadas en el sistema
              </p>
            </div>
            <button
              onClick={exportToCSV}
              className="bg-[#1A2346] dark:bg-[#121C39] text-white px-4 py-2 rounded-lg hover:bg-[#121C39] dark:hover:bg-[#0F1425] text-sm font-medium shadow-sm hover:shadow-md transition-all whitespace-nowrap"
            >
              📥 Exportar CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#121C39] rounded-lg shadow-md p-4 sm:p-6 mb-4 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Filtros</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* User filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Usuario
              </label>
              <input
                type="text"
                value={filters.user}
                onChange={(e) => setFilters({...filters, user: e.target.value})}
                placeholder="correo@redland.cl"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A]"
              />
            </div>

            {/* Action filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Acción
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({...filters, action: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A]"
              >
                <option value="">Todas las acciones</option>
                <option value="create">Crear</option>
                <option value="update">Actualizar</option>
                <option value="delete">Eliminar</option>
              </select>
            </div>

            {/* Entity filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Entidad
              </label>
              <select
                value={filters.entity}
                onChange={(e) => setFilters({...filters, entity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A]"
              >
                <option value="">Todas las entidades</option>
                <option value="activity">Actividad</option>
                <option value="evaluation">Evaluación</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha Desde
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A]"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A]"
              />
            </div>

            {/* Sección filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sección
              </label>
              <select
                value={filters.seccion}
                onChange={(e) => setFilters({...filters, seccion: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A]"
              >
                <option value="">Todas las secciones</option>
                <option value="Junior">Junior</option>
                <option value="Middle">Middle</option>
                <option value="Senior">Senior</option>
              </select>
            </div>
          </div>

          {/* Clear filters button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setFilters({
                user: '',
                action: '',
                entity: '',
                dateFrom: '',
                dateTo: '',
                seccion: ''
              })}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-[#121C39] rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Registros de Auditoría ({logs.length})
          </h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2346] dark:border-[#C5203A]"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Cargando logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-[#0F1425] rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-300">No se encontraron registros con los filtros seleccionados</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full border-collapse text-xs sm:text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#121C39] border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Timestamp</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Usuario</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Acción</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Entidad</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">ID</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Antes</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Después</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log) => {
                    const actionData = formatAction(log.action);
                    const beforeSeccion = log.before?.seccion || '-';
                    const afterSeccion = log.after?.seccion || '-';
                    
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#0F1425] transition-colors">
                        <td className="px-3 sm:px-4 py-3 text-xs text-gray-900 dark:text-gray-200 whitespace-nowrap">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs text-gray-900 dark:text-gray-200">
                          {log.user}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs">
                          <span className={`inline-flex px-2 py-1 rounded-full font-medium ${actionData.color}`}>
                            {actionData.text}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs text-gray-900 dark:text-gray-200 capitalize">
                          {log.entity === 'activity' ? 'Actividad' : 'Evaluación'}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs text-gray-600 dark:text-gray-400 font-mono">
                          {log.entity_id.substring(0, 8)}...
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={JSON.stringify(log.before, null, 2)}>
                          {log.before ? (
                            <div className="space-y-0.5">
                              {log.before.seccion && <div>Sección: {log.before.seccion}</div>}
                              {log.before.actividad && <div>Act: {log.before.actividad.substring(0, 30)}...</div>}
                              {log.before.asignatura && <div>Asig: {log.before.asignatura}</div>}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={JSON.stringify(log.after, null, 2)}>
                          {log.after ? (
                            <div className="space-y-0.5">
                              {log.after.seccion && <div>Sección: {log.after.seccion}</div>}
                              {log.after.actividad && <div>Act: {log.after.actividad.substring(0, 30)}...</div>}
                              {log.after.asignatura && <div>Asig: {log.after.asignatura}</div>}
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;

