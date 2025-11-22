import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getActivityLogs } from '../services/activityLogService';
import jsPDF from 'jspdf';
import LogoRedland from '../logo/imalogotipo-blanco_sinfondo_2.png';

const ActivityLogPage = () => {
  const navigate = useNavigate();
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

  // Format user state for display (ANTES/DESPUÉS columns)
  const formatUserState = (data, action, entity) => {
    // Only format for user entities
    if (entity !== 'user') return null;
    
    // If data is null and action is delete, show "Usuario eliminado"
    if (data === null || data === undefined) {
      if (action === 'delete') {
        return 'Usuario eliminado';
      }
      return '—';
    }
    
    // If action is create, before should be "—"
    if (action === 'create' && data === null) {
      return '—';
    }
    
    // Format user data object
    const parts = [];
    if (data.email) parts.push(`Email: ${data.email}`);
    if (data.role !== undefined) {
      const roleLabel = data.role === 'editor' ? 'Editor' : data.role === 'viewer' ? 'Viewer' : data.role;
      parts.push(`Rol: ${roleLabel}`);
    }
    if (data.is_active !== undefined) {
      parts.push(`Activo: ${data.is_active ? 'Sí' : 'No'}`);
    }
    
    return parts.length > 0 ? parts.join('\n') : '—';
  };

  // Format entity label for display
  const formatEntityLabel = (entity) => {
    const entityMap = {
      'activity': 'Actividad',
      'evaluation': 'Evaluación',
      'user': 'Usuario'
    };
    return entityMap[entity] || entity;
  };

  // Export to PDF with institutional format (same as PrintReportPanel)
  const exportToPDF = async () => {
    if (logs.length === 0) {
      alert('No hay logs para exportar');
      return;
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Corporate colors (same as PrintReportPanel)
    const navyBlue = [26, 35, 70]; // #1A2346
    const redCorporate = [197, 32, 58]; // #C5203A
    const white = [255, 255, 255];
    const black = [0, 0, 0];
    const grayLight = [247, 247, 247]; // #F7F7F7
    const grayDark = [100, 100, 100];

    // Margins
    const marginLeft = 10;
    const marginRight = 10;
    const marginBottom = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const headerHeight = 39;
    let yPosition = 0;

    // Helper function to add new page with header
    const addPageWithHeader = () => {
      pdf.addPage();
      pdf.setFillColor(...navyBlue);
      pdf.rect(0, 0, pageWidth, headerHeight, 'F');
      
      // Logo (async, will be added if available)
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const logoHeight = 22;
          const logoWidth = (img.width / img.height) * logoHeight;
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imgData = canvas.toDataURL('image/png');
          const logoY = (headerHeight - logoHeight) / 2;
          pdf.addImage(imgData, 'PNG', marginLeft, logoY, logoWidth, logoHeight);
        } catch (err) {
          console.error('Error adding logo:', err);
        }
      };
      img.src = LogoRedland;
      
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...white);
      pdf.text('REDLAND SCHOOL', pageWidth / 2, headerHeight / 2 - 3, { align: 'center' });
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Registro de Actividades y Evaluaciones', pageWidth / 2, headerHeight / 2 + 6, { align: 'center' });
    };

    // Add corporate header on first page
    pdf.setFillColor(...navyBlue);
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');

    // Load logo and add to header (async)
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve) => {
        img.onload = () => {
          try {
            const logoHeight = 22;
            const logoWidth = (img.width / img.height) * logoHeight;
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imgData = canvas.toDataURL('image/png');
            const logoY = (headerHeight - logoHeight) / 2;
            pdf.addImage(imgData, 'PNG', marginLeft, logoY, logoWidth, logoHeight);
          } catch (err) {
            console.error('Error processing logo:', err);
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = LogoRedland;
      });
    } catch (error) {
      console.error('Error loading logo:', error);
    }

    // Title and subtitle in header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...white);
    pdf.text('REDLAND SCHOOL', pageWidth / 2, headerHeight / 2 - 3, { align: 'center' });
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Registro de Actividades y Evaluaciones', pageWidth / 2, headerHeight / 2 + 6, { align: 'center' });

    yPosition = headerHeight + 10;

    // Title: Reporte de Auditoría
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...black);
    pdf.text('Reporte de Auditoría – Gestión de Actividad', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Subtitle
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayDark);
    pdf.text('Historial de modificaciones del sistema', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Report date (formatted as "Día Mes Año")
    const now = new Date();
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const reportDate = `${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
    pdf.setFontSize(10);
    pdf.setTextColor(...black);
    pdf.text(`Fecha del reporte: ${reportDate}`, marginLeft, yPosition);
    yPosition += 7;

    // Filters applied
    const activeFilters = [];
    if (filters.user) activeFilters.push(`Usuario: ${filters.user}`);
    if (filters.action) activeFilters.push(`Acción: ${filters.action}`);
    if (filters.entity) activeFilters.push(`Entidad: ${filters.entity}`);
    if (filters.dateFrom) activeFilters.push(`Desde: ${filters.dateFrom}`);
    if (filters.dateTo) activeFilters.push(`Hasta: ${filters.dateTo}`);
    if (filters.seccion) activeFilters.push(`Sección: ${filters.seccion}`);

    if (activeFilters.length > 0) {
      pdf.setFontSize(9);
      pdf.setTextColor(...black);
      pdf.text('Filtros aplicados:', marginLeft, yPosition);
      yPosition += 5;
      activeFilters.forEach(filter => {
        pdf.text(`  • ${filter}`, marginLeft + 2, yPosition);
        yPosition += 4;
      });
      yPosition += 3;
    }

    // Table setup
    const tableStartX = marginLeft;
    const tableWidth = pageWidth - marginLeft - marginRight;
    const colWidths = {
      timestamp: 35,
      user: 30,
      action: 20,
      entity: 20,
      entityId: 18,
      before: 30,
      after: 30
    };
    const rowHeight = 7;

    // Check if page break needed before table
    if (yPosition + 8 + rowHeight > pageHeight - marginBottom) {
      addPageWithHeader();
      yPosition = headerHeight + 10;
    }

    // Table header
    pdf.setFillColor(...redCorporate);
    pdf.rect(tableStartX, yPosition, tableWidth, 8, 'F');
    pdf.setTextColor(...white);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    
    let xPos = tableStartX;
    pdf.text('Fecha/Hora', xPos + 2, yPosition + 5);
    xPos += colWidths.timestamp;
    pdf.text('Usuario', xPos + 2, yPosition + 5);
    xPos += colWidths.user;
    pdf.text('Acción', xPos + 2, yPosition + 5);
    xPos += colWidths.action;
    pdf.text('Entidad', xPos + 2, yPosition + 5);
    xPos += colWidths.entity;
    pdf.text('ID', xPos + 2, yPosition + 5);
    xPos += colWidths.entityId;
    pdf.text('Antes', xPos + 2, yPosition + 5);
    xPos += colWidths.before;
    pdf.text('Después', xPos + 2, yPosition + 5);

    yPosition += 8;

    // Table rows
    logs.forEach((log, index) => {
      // Check if new page needed
      if (yPosition + rowHeight > pageHeight - marginBottom) {
        addPageWithHeader();
        yPosition = headerHeight + 10;
        
        // Redraw table header on new page
        pdf.setFillColor(...redCorporate);
        pdf.rect(tableStartX, yPosition, tableWidth, 8, 'F');
        pdf.setTextColor(...white);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        xPos = tableStartX;
        pdf.text('Fecha/Hora', xPos + 2, yPosition + 5);
        xPos += colWidths.timestamp;
        pdf.text('Usuario', xPos + 2, yPosition + 5);
        xPos += colWidths.user;
        pdf.text('Acción', xPos + 2, yPosition + 5);
        xPos += colWidths.action;
        pdf.text('Entidad', xPos + 2, yPosition + 5);
        xPos += colWidths.entity;
        pdf.text('ID', xPos + 2, yPosition + 5);
        xPos += colWidths.entityId;
        pdf.text('Antes', xPos + 2, yPosition + 5);
        xPos += colWidths.before;
        pdf.text('Después', xPos + 2, yPosition + 5);
        yPosition += 8;
      }

      // Row background (alternate colors like institutional report)
      if (index % 2 === 0) {
        pdf.setFillColor(...grayLight);
        pdf.rect(tableStartX, yPosition, tableWidth, rowHeight, 'F');
      }

      // Row content
      pdf.setTextColor(...black);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');

      xPos = tableStartX;
      pdf.text(formatTimestamp(log.timestamp).substring(0, 18), xPos + 1, yPosition + 4.5, { maxWidth: colWidths.timestamp - 2 });
      xPos += colWidths.timestamp;
      pdf.text((log.user || '').substring(0, 22), xPos + 1, yPosition + 4.5, { maxWidth: colWidths.user - 2 });
      xPos += colWidths.user;
      
      const actionText = log.action === 'create' ? 'Crear' : log.action === 'update' ? 'Actualizar' : log.action === 'delete' ? 'Eliminar' : log.action;
      pdf.text(actionText, xPos + 1, yPosition + 4.5, { maxWidth: colWidths.action - 2 });
      xPos += colWidths.action;
      
      const entityText = log.entity === 'activity' ? 'Actividad' : log.entity === 'evaluation' ? 'Evaluación' : log.entity === 'user' ? 'Usuario' : log.entity;
      pdf.text(entityText, xPos + 1, yPosition + 4.5, { maxWidth: colWidths.entity - 2 });
      xPos += colWidths.entity;
      
      pdf.text((log.entity_id || '').substring(0, 10), xPos + 1, yPosition + 4.5, { maxWidth: colWidths.entityId - 2 });
      xPos += colWidths.entityId;
      
      // Format BEFORE text based on entity type
      let beforeText = '-';
      if (log.entity === 'user') {
        const userState = formatUserState(log.before, log.action, log.entity);
        beforeText = userState || '-';
      } else {
        beforeText = log.before?.seccion || (log.before?.actividad ? 'Act: ' + log.before.actividad.substring(0, 15) : '') || (log.before?.asignatura ? 'Asig: ' + log.before.asignatura : '') || '-';
      }
      pdf.text(String(beforeText).substring(0, 25), xPos + 1, yPosition + 4.5, { maxWidth: colWidths.before - 2 });
      xPos += colWidths.before;
      
      // Format AFTER text based on entity type
      let afterText = '-';
      if (log.entity === 'user') {
        const userState = formatUserState(log.after, log.action, log.entity);
        afterText = userState || '-';
      } else {
        afterText = log.after?.seccion || (log.after?.actividad ? 'Act: ' + log.after.actividad.substring(0, 15) : '') || (log.after?.asignatura ? 'Asig: ' + log.after.asignatura : '') || '-';
      }
      pdf.text(String(afterText).substring(0, 25), xPos + 1, yPosition + 4.5, { maxWidth: colWidths.after - 2 });

      yPosition += rowHeight + 6;  // Espacio adicional entre registros para mejor legibilidad
    });

    // Footer on all pages
    const totalPages = pdf.internal.pages.length - 1;
    const footerDate = `${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(...grayDark);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generado el ${footerDate} | Registro Escolar Web | Redland School`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    // Save PDF
    const fileName = `auditoria_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
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
            <button
              onClick={() => navigate('/')}
              className="bg-[#1A2346] dark:bg-[#121C39] text-white px-3 py-2 rounded-lg hover:bg-[#121C39] dark:hover:bg-[#0F1425] text-sm font-medium shadow-sm hover:shadow-md transition-all whitespace-nowrap"
              title="Volver al calendario"
            >
              Volver al calendario
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Gestión de Actividad
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                Historial completo de todas las acciones realizadas en el sistema
              </p>
            </div>
            <button
              onClick={exportToPDF}
              className="bg-[#1A2346] dark:bg-[#121C39] text-white px-4 py-2 rounded-lg hover:bg-[#121C39] dark:hover:bg-[#0F1425] text-sm font-medium shadow-sm hover:shadow-md transition-all whitespace-nowrap"
            >
              Exportar PDF
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
                <option value="user">Usuario</option>
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
                          {formatEntityLabel(log.entity)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs text-gray-600 dark:text-gray-400 font-mono">
                          {log.entity_id.substring(0, 8)}...
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[150px]" title={JSON.stringify(log.before, null, 2)}>
                          {log.entity === 'user' ? (
                            <div className="whitespace-pre-line space-y-0.5">
                              {formatUserState(log.before, log.action, log.entity)}
                            </div>
                          ) : log.before ? (
                            <div className="space-y-0.5">
                              {log.before.seccion && <div>Sección: {log.before.seccion}</div>}
                              {log.before.actividad && <div>Act: {log.before.actividad.substring(0, 30)}...</div>}
                              {log.before.asignatura && <div>Asig: {log.before.asignatura}</div>}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[150px]" title={JSON.stringify(log.after, null, 2)}>
                          {log.entity === 'user' ? (
                            <div className="whitespace-pre-line space-y-0.5">
                              {formatUserState(log.after, log.action, log.entity)}
                            </div>
                          ) : log.after ? (
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
