import React, { useState } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const PrintReportPanel = ({ onClose, activities, evaluations }) => {
  const [reportType, setReportType] = useState('actividades');
  const [section, setSection] = useState('todas');
  const [nivel, setNivel] = useState('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Get available niveles based on selected section
  const getNivelesOptions = () => {
    if (section === 'Middle') {
      return [
        { value: 'todos', label: 'Todos los Niveles' },
        { value: '5', label: '5° Básico' },
        { value: '6', label: '6° Básico' },
        { value: '7', label: '7° Básico' },
        { value: '8', label: '8° Básico' }
      ];
    } else if (section === 'Senior') {
      return [
        { value: 'todos', label: 'Todos los Niveles' },
        { value: 'I', label: 'I Medio' },
        { value: 'II', label: 'II Medio' },
        { value: 'III', label: 'III Medio' },
        { value: 'IV', label: 'IV Medio' }
      ];
    }
    return [{ value: 'todos', label: 'Todos los Niveles' }];
  };

  const filterDataByDateRange = (data, from, to) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    const filtered = {};
    
    Object.keys(data).forEach(dateKey => {
      const currentDate = new Date(dateKey);
      if (currentDate >= fromDate && currentDate <= toDate) {
        filtered[dateKey] = data[dateKey];
      }
    });
    
    return filtered;
  };

  const filterByNivel = (items, selectedNivel) => {
    if (selectedNivel === 'todos') return items;
    
    return items.filter(item => {
      if (reportType === 'evaluaciones' && item.curso) {
        // For evaluations, check the curso field
        if (section === 'Middle') {
          return item.curso.includes(`${selectedNivel}°`);
        } else if (section === 'Senior') {
          return item.curso.includes(`${selectedNivel} EM`);
        }
      }
      // For activities, we don't filter by nivel
      return true;
    });
  };

  const sortEvaluationsByYearLevel = (evaluations) => {
    if (!evaluations || evaluations.length === 0) return [];
    
    return [...evaluations].sort((a, b) => {
      const getYearLevel = (curso) => {
        if (curso.includes('5°')) return 5;
        if (curso.includes('6°')) return 6;
        if (curso.includes('7°')) return 7;
        if (curso.includes('8°')) return 8;
        if (curso.includes('I EM')) return 1;
        if (curso.includes('II EM')) return 2;
        if (curso.includes('III EM')) return 3;
        if (curso.includes('IV EM')) return 4;
        return 0;
      };
      
      const levelA = getYearLevel(a.curso);
      const levelB = getYearLevel(b.curso);
      
      if (levelA !== levelB) {
        return levelA - levelB;
      }
      
      const getSectionOrder = (curso) => {
        if (curso.includes(' A') && !curso.includes('AB')) return 1;
        if (curso.includes(' B')) return 2;
        if (curso.includes('AB')) return 3;
        return 4;
      };
      
      return getSectionOrder(a.curso) - getSectionOrder(b.curso);
    });
  };

  const sortActivitiesByTime = (activities) => {
    if (!activities || activities.length === 0) return [];
    
    return [...activities].sort((a, b) => {
      if (a.hora === 'TODO EL DIA' && b.hora !== 'TODO EL DIA') return -1;
      if (a.hora !== 'TODO EL DIA' && b.hora === 'TODO EL DIA') return 1;
      
      if (a.hora === 'TODO EL DIA' && b.hora === 'TODO EL DIA') {
        return 0;
      }
      
      const timeA = a.hora ? a.hora.split(':').map(Number) : [99, 99];
      const timeB = b.hora ? b.hora.split(':').map(Number) : [99, 99];
      
      const minutesA = timeA[0] * 60 + (timeA[1] || 0);
      const minutesB = timeB[0] * 60 + (timeB[1] || 0);
      
      return minutesA - minutesB;
    });
  };

  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  const handlePrint = () => {
    if (!dateFrom || !dateTo) {
      alert('Por favor selecciona un rango de fechas');
      return;
    }

    const data = reportType === 'actividades' ? activities : evaluations;
    const filteredData = filterDataByDateRange(data, dateFrom, dateTo);
    
    // Generate print content
    const printWindow = window.open('', '_blank');
    const sectionName = section === 'todas' ? 'Todas las Secciones' : 
                        section === 'Junior' ? 'Junior School' :
                        section === 'Middle' ? 'Middle School' : 'Senior School';
    
    const reportTitle = reportType === 'actividades' ? 'Actividades' : 'Evaluaciones';
    
    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte ${reportTitle} - ${sectionName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          h1 {
            text-align: center;
            color: #4F46E5;
            border-bottom: 3px solid #4F46E5;
            padding-bottom: 10px;
          }
          h2 {
            color: #6366F1;
            margin-top: 30px;
            border-bottom: 2px solid #E0E7FF;
            padding-bottom: 5px;
          }
          h3 {
            color: #818CF8;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          .date-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 10px;
          }
          .junior-badge { background-color: #D1FAE5; color: #065F46; }
          .middle-badge { background-color: #FEF3C7; color: #92400E; }
          .senior-badge { background-color: #FCE7F3; color: #9F1239; }
          .item {
            margin: 8px 0;
            padding: 10px;
            background-color: #F9FAFB;
            border-left: 4px solid #6366F1;
            border-radius: 4px;
          }
          .activity-item {
            border-left-color: #10B981;
          }
          .evaluation-item {
            border-left-color: #F59E0B;
          }
          .important {
            color: #DC2626;
            font-weight: bold;
          }
          .meta-info {
            font-size: 11px;
            color: #6B7280;
            margin-top: 4px;
          }
          .print-info {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 12px;
            color: #9CA3AF;
          }
          @media print {
            body { margin: 15px; }
            .date-section { page-break-inside: avoid; }
            h2 { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>Registro Escolar 2026 - Reporte de ${reportTitle}</h1>
        <p style="text-align: center; color: #6B7280; margin-bottom: 30px;">
          <strong>Sección:</strong> ${sectionName} | 
          <strong>Período:</strong> ${formatDateForDisplay(dateFrom)} - ${formatDateForDisplay(dateTo)}
        </p>
    `;

    // Sort dates
    const sortedDates = Object.keys(filteredData).sort();
    
    if (sortedDates.length === 0) {
      printContent += `
        <p style="text-align: center; color: #9CA3AF; margin: 50px 0;">
          No se encontraron ${reportTitle.toLowerCase()} en el rango de fechas seleccionado.
        </p>
      `;
    } else {
      sortedDates.forEach(dateKey => {
        const dateData = filteredData[dateKey];
        const sectionsToShow = section === 'todas' ? ['Junior', 'Middle', 'Senior'] : [section];
        
        let hasContentForDate = false;
        let dateContent = `<div class="date-section"><h2>📅 ${formatDateForDisplay(dateKey)}</h2>`;
        
        sectionsToShow.forEach(sec => {
          if (dateData[sec] && dateData[sec].length > 0) {
            hasContentForDate = true;
            const badgeClass = sec === 'Junior' ? 'junior-badge' : sec === 'Middle' ? 'middle-badge' : 'senior-badge';
            dateContent += `<h3>${sec} School <span class="section-badge ${badgeClass}">${sec}</span></h3>`;
            
            if (reportType === 'actividades') {
              const sortedActivities = sortActivitiesByTime(dateData[sec]);
              sortedActivities.forEach(activity => {
                const importantClass = activity.importante ? 'important' : '';
                const timeText = activity.hora === 'TODO EL DIA' ? '[TODO EL DÍA]' : `[${activity.hora}]`;
                dateContent += `
                  <div class="item activity-item ${importantClass}">
                    <strong>${timeText}</strong> ${activity.actividad}
                    ${activity.lugar ? `<br/><span class="meta-info">📍 Lugar: ${activity.lugar}</span>` : ''}
                    ${activity.responsable ? `<br/><span class="meta-info">👤 Responsable: ${activity.responsable}</span>` : ''}
                  </div>
                `;
              });
            } else {
              const sortedEvaluations = sortEvaluationsByYearLevel(dateData[sec]);
              sortedEvaluations.forEach(evaluation => {
                dateContent += `
                  <div class="item evaluation-item">
                    <strong>${evaluation.curso}:</strong> ${evaluation.asignatura}
                    ${evaluation.tema ? `<br/><span class="meta-info">📝 Tema: ${evaluation.tema}</span>` : ''}
                  </div>
                `;
              });
            }
          }
        });
        
        dateContent += '</div>';
        
        if (hasContentForDate) {
          printContent += dateContent;
        }
      });
    }

    printContent += `
        <div class="print-info">
          Generado el ${new Date().toLocaleString('es-CL')} | Registro Escolar Web - Redland School
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-2xl font-bold">📄 Generar Reporte para Impresión</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Reporte
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="actividades">Actividades</option>
                <option value="evaluaciones">Evaluaciones</option>
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sección
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="todas">Todas las Secciones</option>
                <option value="Junior">Junior School</option>
                <option value="Middle">Middle School</option>
                <option value="Senior">Senior School</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  min="2026-02-23"
                  max="2027-01-05"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min="2026-02-23"
                  max="2027-01-05"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Información del Reporte:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Se generará un documento optimizado para impresión</li>
                    <li>Las actividades se ordenarán por hora</li>
                    <li>Las evaluaciones se ordenarán por nivel de año</li>
                    <li>Puedes guardar como PDF usando "Guardar como PDF" al imprimir</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Generar e Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintReportPanel;
