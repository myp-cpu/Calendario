import React, { useState, useRef } from 'react';
import { BACKEND_URL } from './config';
import { parseJsonOnce } from '@/services/authService';
import jsPDF from 'jspdf';
import LogoRedland from '@/logo/imalogotipo-blanco_sinfondo_2.png';

const PrintReportPanel = ({ onClose, activities, evaluations }) => {
  const [reportType, setReportType] = useState('actividades');
  const [section, setSection] = useState('todas');
  const [nivel, setNivel] = useState('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const reportRef = useRef(null);

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

  // Función para formatear array de cursos en múltiples líneas para PDF/HTML
  // Convierte ["5° A", "5° AB", "5° B", "6° A", "6° AB", "6° B", "7° AB", "8° AB"]
  // a "5° A, 5° AB, 5° B<br>6° A, 6° AB, 6° B<br>7° AB, 8° AB"
  const formatCursosMultiline = (cursos) => {
    if (!cursos || !Array.isArray(cursos) || cursos.length === 0) {
      return '';
    }
    
    if (cursos.length === 1) {
      return cursos[0];
    }
    
    // Normalizar formatos de cursos
    const normalizeCurso = (curso) => {
      const middleMatch = curso.match(/^(\d+)[°]?\s*([AB])$/i);
      if (middleMatch) {
        return `${middleMatch[1]}° ${middleMatch[2]}`;
      }
      const seniorMatch = curso.match(/^([IVX]+)\s*([AB])$/i);
      if (seniorMatch) {
        return `${seniorMatch[1]} EM ${seniorMatch[2]}`;
      }
      return curso;
    };
    
    const normalizedCursos = cursos.map(normalizeCurso);
    
    // Agrupar cursos por nivel
    const cursosByLevel = {};
    normalizedCursos.forEach(curso => {
      const middleMatch = curso.match(/^(\d+)[°]/);
      const seniorMatch = curso.match(/^([IVX]+)\s+EM/i);
      
      let level;
      if (middleMatch) {
        level = `M${middleMatch[1]}`;
      } else if (seniorMatch) {
        level = `S${seniorMatch[1]}`;
      } else {
        level = curso;
      }
      
      if (!cursosByLevel[level]) {
        cursosByLevel[level] = [];
      }
      cursosByLevel[level].push(curso);
    });
    
    // Formatear cada grupo por nivel
    const lines = [];
    Object.keys(cursosByLevel).sort().forEach(level => {
      const cursosInLevel = cursosByLevel[level];
      const formatted = [];
      
      // Agrupar A y B del mismo nivel
      const hasA = cursosInLevel.some(c => /[°\s]A$/.test(c) && !/[°\s]AB$/.test(c));
      const hasB = cursosInLevel.some(c => /[°\s]B$/.test(c) && !/[°\s]AB$/.test(c));
      const hasAB = cursosInLevel.some(c => /[°\s]AB$/.test(c));
      
      if (hasA && hasB && !hasAB && cursosInLevel.length === 2) {
        // Mismo nivel con A y B -> mostrar como "6° AB"
        const firstCurso = cursosInLevel[0];
        const middleMatch = firstCurso.match(/^(\d+)[°]/);
        const seniorMatch = firstCurso.match(/^([IVX]+)\s+EM/i);
        
        if (middleMatch) {
          formatted.push(`${middleMatch[1]}° AB`);
        } else if (seniorMatch) {
          formatted.push(`${seniorMatch[1]} EM AB`);
        }
      } else {
        // Agregar todos los cursos del nivel, manteniendo AB si existe
        cursosInLevel.forEach(curso => {
          if (!formatted.includes(curso)) {
            formatted.push(curso);
          }
        });
      }
      
      if (formatted.length > 0) {
        lines.push(formatted.join(', '));
      }
    });
    
    // Unir líneas con <br> para HTML
    return lines.join('<br>');
  };

  // Función para formatear array de cursos para display (una línea)
  // Convierte ["6A", "6B"] a "6° AB" o ["6A", "8B", "I EM A"] a "6° A, 8° B, I EM A"
  const formatCursosForDisplay = (cursos) => {
    if (!cursos || !Array.isArray(cursos) || cursos.length === 0) {
      // Compatibilidad con datos antiguos
      return '';
    }
    
    if (cursos.length === 1) {
      return cursos[0];
    }
    
    // Normalizar formatos de cursos (pueden venir como "6A", "6° A", "6 A", etc.)
    const normalizeCurso = (curso) => {
      // Middle: "6A" -> "6° A", "6B" -> "6° B"
      const middleMatch = curso.match(/^(\d+)[°]?\s*([AB])$/i);
      if (middleMatch) {
        return `${middleMatch[1]}° ${middleMatch[2]}`;
      }
      // Senior: "IA" -> "I EM A", "IIB" -> "II EM B"
      const seniorMatch = curso.match(/^([IVX]+)\s*([AB])$/i);
      if (seniorMatch) {
        return `${seniorMatch[1]} EM ${seniorMatch[2]}`;
      }
      // Si ya tiene formato correcto, devolverlo tal cual
      return curso;
    };
    
    const normalizedCursos = cursos.map(normalizeCurso);
    
    // Agrupar cursos por nivel
    const cursosByLevel = {};
    normalizedCursos.forEach(curso => {
      // Extraer el nivel del curso
      // Middle: "6° A" -> nivel "6"
      // Senior: "I EM A" -> nivel "I"
      const middleMatch = curso.match(/^(\d+)[°]/);
      const seniorMatch = curso.match(/^([IVX]+)\s+EM/i);
      
      let level;
      if (middleMatch) {
        level = `M${middleMatch[1]}`; // Prefijo M para Middle
      } else if (seniorMatch) {
        level = `S${seniorMatch[1]}`; // Prefijo S para Senior
      } else {
        level = curso; // Si no se puede extraer, usar el curso completo como nivel
      }
      
      if (!cursosByLevel[level]) {
        cursosByLevel[level] = [];
      }
      cursosByLevel[level].push(curso);
    });
    
    // Formatear cada grupo
    const formatted = Object.keys(cursosByLevel).map(level => {
      const cursosInLevel = cursosByLevel[level];
      if (cursosInLevel.length === 1) {
        return cursosInLevel[0];
      }
      
      // Verificar si son del mismo nivel y solo difieren en A/B
      const hasA = cursosInLevel.some(c => /[°\s]A$/.test(c) && !/[°\s]AB$/.test(c));
      const hasB = cursosInLevel.some(c => /[°\s]B$/.test(c) && !/[°\s]AB$/.test(c));
      
      if (hasA && hasB && cursosInLevel.length === 2) {
        // Mismo nivel con A y B -> mostrar como "6° AB" o "I EM AB"
        const firstCurso = cursosInLevel[0];
        const middleMatch = firstCurso.match(/^(\d+)[°]/);
        const seniorMatch = firstCurso.match(/^([IVX]+)\s+EM/i);
        
        if (middleMatch) {
          return `${middleMatch[1]}° AB`;
        } else if (seniorMatch) {
          return `${seniorMatch[1]} EM AB`;
        }
      }
      
      // Si no se puede agrupar, mostrar lista separada por comas
      return cursosInLevel.join(', ');
    });
    
    return formatted.join(', ');
  };

  const filterByNivel = (items, selectedNivel) => {
    if (selectedNivel === 'todos') return items;
    
    return items.filter(item => {
      // Trabajar con cursos como array (nuevo formato)
      let cursosToCheck = [];
      if (item.cursos && Array.isArray(item.cursos) && item.cursos.length > 0) {
        cursosToCheck = item.cursos;
      } else if (item.curso) {
        // Compatibilidad con datos antiguos
        cursosToCheck = [item.curso];
      } else {
        return true;
      }
      
      // Verificar si algún curso coincide con el nivel seleccionado
      return cursosToCheck.some(curso => {
        if (section === 'Middle') {
          return curso.includes(`${selectedNivel}°`);
        } else if (section === 'Senior') {
          return curso.includes(`${selectedNivel} EM`);
        }
        return false;
      });
    });
  };

  const sortEvaluationsByYearLevel = (evaluations) => {
    if (!evaluations || evaluations.length === 0) return [];
    
    return [...evaluations].sort((a, b) => {
      const getYearLevel = (cursos) => {
        // Obtener el primer curso para determinar el nivel
        let cursoToCheck = '';
        if (Array.isArray(cursos) && cursos.length > 0) {
          cursoToCheck = cursos[0];
        } else if (typeof cursos === 'string') {
          cursoToCheck = cursos;
        }
        
        if (cursoToCheck.includes('5°')) return 5;
        if (cursoToCheck.includes('6°')) return 6;
        if (cursoToCheck.includes('7°')) return 7;
        if (cursoToCheck.includes('8°')) return 8;
        if (cursoToCheck.includes('I EM')) return 1;
        if (cursoToCheck.includes('II EM')) return 2;
        if (cursoToCheck.includes('III EM')) return 3;
        if (cursoToCheck.includes('IV EM')) return 4;
        return 0;
      };
      
      // Obtener cursos de cada evaluación (compatibilidad con formato antiguo)
      const cursosA = Array.isArray(a.cursos) ? a.cursos : (a.curso ? [a.curso] : []);
      const cursosB = Array.isArray(b.cursos) ? b.cursos : (b.curso ? [b.curso] : []);
      
      const levelA = getYearLevel(cursosA);
      const levelB = getYearLevel(cursosB);
      
      if (levelA !== levelB) {
        return levelA - levelB;
      }
      
      const getSectionOrder = (cursos) => {
        const cursoToCheck = Array.isArray(cursos) && cursos.length > 0 ? cursos[0] : (typeof cursos === 'string' ? cursos : '');
        if (cursoToCheck.includes(' A') && !cursoToCheck.includes('AB')) return 1;
        if (cursoToCheck.includes(' B')) return 2;
        if (cursoToCheck.includes('AB')) return 3;
        return 4;
      };
      
      return getSectionOrder(cursosA) - getSectionOrder(cursosB);
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

  const formatDateShort = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper function to consolidate duplicate activities (from "Todos" section)
  const consolidateDuplicateActivities = (rows) => {
    const activityMap = new Map();
    
    rows.forEach(row => {
      const key = `${row.date}|${row.time}|${row.activity}|${row.responsable}|${row.lugar}`;
      
      if (!activityMap.has(key)) {
        activityMap.set(key, []);
      }
      activityMap.get(key).push(row);
    });
    
    const consolidatedRows = [];
    activityMap.forEach((group, key) => {
      if (group.length === 3) {
        const sections = group.map(r => r.section).sort();
        if (sections[0] === 'Junior' && sections[1] === 'Middle' && sections[2] === 'Senior') {
          consolidatedRows.push({
            ...group[0],
            section: 'Todos'
          });
          return;
        }
      }
      consolidatedRows.push(...group);
    });
    
    return consolidatedRows.sort((a, b) => {
      if (a.time === 'TODO EL DÍA' && b.time !== 'TODO EL DÍA') return -1;
      if (a.time !== 'TODO EL DÍA' && b.time === 'TODO EL DÍA') return 1;
      if (a.time === 'TODO EL DÍA' && b.time === 'TODO EL DÍA') return 0;
      
      const timeA = a.time ? a.time.split(':').map(Number) : [99, 99];
      const timeB = b.time ? b.time.split(':').map(Number) : [99, 99];
      const minutesA = timeA[0] * 60 + (timeA[1] || 0);
      const minutesB = timeB[0] * 60 + (timeB[1] || 0);
      return minutesA - minutesB;
    });
  };

  // Function to escape HTML entities
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Export full report HTML with ALL styles inline (identical to jsPDF output)
  const exportFullReportHTML = () => {
    const sectionName = section === 'todas' ? 'Todas las Secciones' : 
                        section === 'Junior' ? 'Junior School' :
                        section === 'Middle' ? 'Middle School' : 'Senior School';
    
    // Corporate colors (exact values from jsPDF)
    const navyBlue = '#1A2346';
    const redCorporate = '#C5203A';
    const white = '#FFFFFF';
    const grayLight = '#F7F7F7';
    const grayDark = '#646464';
    const black = '#000000';
    
    // Start HTML document
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reporte - ${escapeHtml(sectionName)}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 0;
      color: ${black};
    }
    .course-cell {
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: normal;
      max-width: 120px;
      hyphens: auto;
    }
  </style>
</head>
<body>
  <!-- Header with corporate design -->
  <div style="background-color: ${navyBlue}; color: ${white}; padding: 14.65mm 10mm; text-align: center; width: 100%; box-sizing: border-box;">
    <h1 style="margin: 0; font-size: 20pt; font-weight: bold; color: ${white}; font-family: Arial, Helvetica, sans-serif;">REDLAND SCHOOL</h1>
    <p style="margin: 3mm 0 0 0; font-size: 12pt; color: ${white}; font-family: Arial, Helvetica, sans-serif;">Registro de Actividades y Evaluaciones</p>
  </div>
  
  <!-- Content area -->
  <div style="padding: 10mm; font-family: Arial, Helvetica, sans-serif;">
    <!-- Main Title -->
    <div style="font-size: 18pt; font-weight: bold; color: ${redCorporate}; text-align: center; margin: 10mm 0 5mm 0; font-family: Arial, Helvetica, sans-serif;">`;

    // Main title based on report type
    if (reportType === 'ambos') {
      html += `Reporte de Actividades y Evaluaciones – Sección: ${escapeHtml(sectionName)}`;
    } else if (reportType === 'actividades') {
      html += `Reporte de Actividades – Sección: ${escapeHtml(sectionName)}`;
    } else {
      html += `Reporte de Evaluaciones – Sección: ${escapeHtml(sectionName)}`;
    }

    html += `</div>
    <!-- Subtitle -->
    <div style="font-size: 11pt; color: ${grayDark}; text-align: center; margin-bottom: 10mm; font-family: Arial, Helvetica, sans-serif;">Del ${escapeHtml(formatDateForDisplay(dateFrom))} al ${escapeHtml(formatDateForDisplay(dateTo))}</div>`;

    // Process Activities with inline styles
    const processActivitiesHTML = () => {
      const filteredActivities = filterDataByDateRange(activities, dateFrom, dateTo);
      const sortedDates = Object.keys(filteredActivities).sort();
      const sectionsToShow = section === 'todas' ? ['Junior', 'Middle', 'Senior'] : [section];

      if (sortedDates.length === 0) return '';

      let activitiesHTML = `<div style="font-size: 14pt; font-weight: bold; color: ${redCorporate}; margin: 8mm 0 4mm 0; font-family: Arial, Helvetica, sans-serif;">ACTIVIDADES</div>`;
      let isFirstDate = true;

      sortedDates.forEach(dateKey => {
        const dateData = filteredActivities[dateKey];
        const rows = [];

        sectionsToShow.forEach(sec => {
          if (dateData[sec] && dateData[sec].length > 0) {
            let itemsToShow = filterByNivel(dateData[sec], nivel);
            
            if (itemsToShow.length > 0) {
              const sortedActivities = sortActivitiesByTime(itemsToShow);
              sortedActivities.forEach(activity => {
                const timeText = activity.hora === 'TODO EL DIA' ? 'TODO EL DÍA' : activity.hora || '';
                let cursoText = '';
                if (activity.cursos && Array.isArray(activity.cursos) && activity.cursos.length > 0) {
                  cursoText = activity.cursos[0];
                } else if (activity.curso) {
                  cursoText = activity.curso;
                }
                rows.push({
                  date: formatDateShort(dateKey),
                  time: timeText,
                  activity: activity.actividad,
                  responsable: activity.responsable || '',
                  lugar: activity.lugar || '',
                  section: sec,
                  curso: cursoText,
                  importante: activity.importante || false
                });
              });
            }
          }
        });

        if (rows.length === 0) {
          return;
        }

        const consolidatedRows = consolidateDuplicateActivities(rows);

        if (isFirstDate) {
          activitiesHTML += `<div style="font-size: 10pt; font-weight: bold; color: ${black}; margin: 5mm 0 3mm 0; font-family: Arial, Helvetica, sans-serif;">${escapeHtml(formatDateForDisplay(dateKey))}</div>`;
          activitiesHTML += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 5mm; font-size: 8pt; font-family: Arial, Helvetica, sans-serif;">
            <thead>
              <tr>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Fecha</th>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Hora</th>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Actividad</th>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Responsable</th>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Lugar</th>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Sección</th>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Curso</th>
              </tr>
            </thead>
            <tbody>`;
          isFirstDate = false;
        } else {
          activitiesHTML += `<div style="font-size: 10pt; font-weight: bold; color: ${black}; margin: 5mm 0 3mm 0; font-family: Arial, Helvetica, sans-serif;">${escapeHtml(formatDateForDisplay(dateKey))}</div>`;
        }

        consolidatedRows.forEach((row, index) => {
          const rowBgColor = index % 2 === 0 ? white : grayLight;
          const importantStyle = row.importante ? `color: ${redCorporate}; font-weight: bold;` : `color: ${black}; font-weight: normal;`;
          activitiesHTML += `<tr style="background-color: ${rowBgColor}; border: 0.1mm solid ${grayDark};">
            <td style="padding: 1.89mm; vertical-align: top; font-size: 8pt; color: ${black}; font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark};">${escapeHtml(row.date)}</td>
            <td style="padding: 1.89mm; vertical-align: top; font-size: 8pt; ${importantStyle} font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark};">${escapeHtml(row.time)}</td>
            <td style="padding: 1.89mm; vertical-align: top; font-size: 8pt; ${importantStyle} font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark};">${escapeHtml(row.activity)}</td>
            <td style="padding: 1.89mm; vertical-align: top; font-size: 8pt; color: ${black}; font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark};">${escapeHtml(row.responsable)}</td>
            <td style="padding: 1.89mm; vertical-align: top; font-size: 8pt; color: ${black}; font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark};">${escapeHtml(row.lugar)}</td>
            <td style="padding: 1.89mm; vertical-align: top; font-size: 8pt; color: ${black}; font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark};">${escapeHtml(row.section)}</td>
            <td class="course-cell" style="padding: 1.89mm; vertical-align: top; font-size: 8pt; color: ${black}; font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark}; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; max-width: 120px; line-height: 1.2;">${row.curso || '-'}</td>
          </tr>`;
        });
      });

      if (!isFirstDate) {
        activitiesHTML += '</tbody></table>';
      }

      return activitiesHTML;
    };

    // Process Evaluations with inline styles
    const processEvaluationsHTML = () => {
      const filteredEvaluations = filterDataByDateRange(evaluations, dateFrom, dateTo);
      const sortedDates = Object.keys(filteredEvaluations).sort();
      const sectionsToShow = section === 'todas' ? ['Junior', 'Middle', 'Senior'] : [section];

      if (sortedDates.length === 0) return '';

      let evaluationsHTML = `<div style="font-size: 14pt; font-weight: bold; color: ${redCorporate}; margin: 8mm 0 4mm 0; font-family: Arial, Helvetica, sans-serif;">EVALUACIONES</div>`;
      let isFirstDate = true;

      sortedDates.forEach(dateKey => {
        const dateData = filteredEvaluations[dateKey];
        const rows = [];

        sectionsToShow.forEach(sec => {
          if (dateData[sec] && dateData[sec].length > 0) {
            let itemsToShow = filterByNivel(dateData[sec], nivel);
            
            if (itemsToShow.length > 0) {
              const sortedEvaluations = sortEvaluationsByYearLevel(itemsToShow);
              sortedEvaluations.forEach(evaluation => {
                // Obtener cursos como array (compatibilidad con formato antiguo)
                let cursosArray = [];
                if (evaluation.cursos && Array.isArray(evaluation.cursos) && evaluation.cursos.length > 0) {
                  cursosArray = evaluation.cursos;
                } else if (evaluation.curso) {
                  // Compatibilidad con datos antiguos
                  cursosArray = [evaluation.curso];
                }
                
                rows.push({
                  date: formatDateShort(dateKey),
                  asignatura: evaluation.asignatura || '',
                  tema: evaluation.tema || '',
                  hora: evaluation.hora || evaluation.hour || '',
                  curso: formatCursosMultiline(cursosArray), // Usar formato multilínea para PDF
                  section: sec
                });
              });
            }
          }
        });

        if (rows.length === 0) {
          return;
        }

        if (isFirstDate) {
          evaluationsHTML += `<div style="font-size: 10pt; font-weight: bold; color: ${black}; margin: 5mm 0 3mm 0; font-family: Arial, Helvetica, sans-serif;">${escapeHtml(formatDateForDisplay(dateKey))}</div>`;
          evaluationsHTML += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 5mm; font-size: 8pt; font-family: Arial, Helvetica, sans-serif;">
            <thead>
              <tr>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Fecha</th>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Asignatura</th>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Tema/Criterio</th>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Hora</th>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Curso</th>
                <th style="background-color: ${redCorporate}; color: ${white}; padding: 2.83mm 1.89mm; text-align: left; font-weight: bold; font-size: 9pt; border: 0.1mm solid ${grayDark}; font-family: Arial, Helvetica, sans-serif;">Sección</th>
              </tr>
            </thead>
            <tbody>`;
          isFirstDate = false;
        } else {
          evaluationsHTML += `<div style="font-size: 10pt; font-weight: bold; color: ${black}; margin: 5mm 0 3mm 0; font-family: Arial, Helvetica, sans-serif;">${escapeHtml(formatDateForDisplay(dateKey))}</div>`;
        }

        rows.forEach((row, index) => {
          const rowBgColor = index % 2 === 0 ? white : grayLight;
          evaluationsHTML += `<tr style="background-color: ${rowBgColor}; border: 0.1mm solid ${grayDark};">
            <td style="padding: 1.89mm; vertical-align: top; font-size: 8pt; color: ${black}; font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark};">${escapeHtml(row.date)}</td>
            <td style="padding: 1.89mm; vertical-align: top; font-size: 8pt; color: ${black}; font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark};">${escapeHtml(row.asignatura)}</td>
            <td style="padding: 1.89mm; vertical-align: top; font-size: 8pt; color: ${grayDark}; font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark};">${escapeHtml(row.tema)}</td>
            <td style="padding: 1.89mm; vertical-align: top; font-size: 8pt; color: ${black}; font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark};">${escapeHtml(row.hora || '')}</td>
            <td class="course-cell" style="padding: 1.89mm; vertical-align: top; font-size: 8pt; font-weight: bold; color: ${black}; font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark}; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; max-width: 120px; line-height: 1.2;">${row.curso}</td>
            <td style="padding: 1.89mm; vertical-align: top; font-size: 8pt; color: ${black}; font-family: Arial, Helvetica, sans-serif; border: 0.1mm solid ${grayDark};">${escapeHtml(row.section)}</td>
          </tr>`;
        });
      });

      if (!isFirstDate) {
        evaluationsHTML += '</tbody></table>';
      }

      return evaluationsHTML;
    };

    // Add content based on report type
    if (reportType === 'ambos') {
      html += processActivitiesHTML();
      html += processEvaluationsHTML();
    } else if (reportType === 'actividades') {
      html += processActivitiesHTML();
    } else {
      html += processEvaluationsHTML();
    }

    // Footer
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    html += `
    <div style="text-align: center; margin-top: 20mm; padding-top: 5mm; border-top: 0.5mm solid ${grayDark}; font-size: 8pt; color: ${grayDark}; font-family: Arial, Helvetica, sans-serif;">
      Generado el ${dateStr} ${timeStr} | Registro Escolar Web | Redland School
    </div>
  </div>
</body>
</html>`;

    return html;
  };

  const generateReportHTML = () => {
    // Keep old function for backward compatibility, but use new export function
    return exportFullReportHTML();
  };
  
  // Alias for backward compatibility
  const generateFullReportHTML = () => {
    return exportFullReportHTML();
  };

  const handlePrint = async () => {
    if (!dateFrom || !dateTo) {
      alert('Por favor selecciona un rango de fechas');
      return;
    }

    // Create PDF document (A4 portrait)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Corporate colors (RGB for jsPDF)
    const navyBlue = [26, 35, 70]; // #1A2346
    const redCorporate = [197, 32, 58]; // #C5203A
    const black = [0, 0, 0]; // #000000
    const white = [255, 255, 255]; // #FFFFFF
    const grayLight = [247, 247, 247]; // #F7F7F7
    const grayDark = [100, 100, 100]; // For subtitles

    // Margins
    const marginLeft = 10;
    const marginRight = 10;
    const marginBottom = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - marginLeft - marginRight;

    // Header height: 110px ≈ 39mm
    const headerHeight = 39;
    let yPosition = 0;

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredHeight) => {
      if (yPosition + requiredHeight > pageHeight - marginBottom) {
        pdf.addPage();
        // Add header to new page
        pdf.setFillColor(...navyBlue);
        pdf.rect(0, 0, pageWidth, headerHeight, 'F');
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...white);
        pdf.text('REDLAND SCHOOL', pageWidth / 2, headerHeight / 2 - 3, { align: 'center' });
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Registro de Actividades y Evaluaciones', pageWidth / 2, headerHeight / 2 + 6, { align: 'center' });
        yPosition = headerHeight + 10;
        return true;
      }
      return false;
    };

    // Add corporate header on first page
    const addCorporateHeader = () => {
      // Navy blue rectangle background
      pdf.setFillColor(...navyBlue);
      pdf.rect(0, 0, pageWidth, headerHeight, 'F');

      // Load and add logo
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise((resolve) => {
          img.onload = () => {
            try {
              const logoHeight = 22; // ~60px in mm
              const logoWidth = (img.width / img.height) * logoHeight;
              
              // Convert image to canvas to get base64
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              const imgData = canvas.toDataURL('image/png');
              
              // Logo position: left side, centered vertically in header
              const logoY = (headerHeight - logoHeight) / 2;
              pdf.addImage(imgData, 'PNG', marginLeft, logoY, logoWidth, logoHeight);
              
              // Text in center of header
              pdf.setFontSize(20);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(...white);
              pdf.text('REDLAND SCHOOL', pageWidth / 2, headerHeight / 2 - 3, { align: 'center' });
              
              pdf.setFontSize(12);
              pdf.setFont('helvetica', 'normal');
              pdf.text('Registro de Actividades y Evaluaciones', pageWidth / 2, headerHeight / 2 + 6, { align: 'center' });
              
              resolve();
            } catch (err) {
              console.error('Error processing logo:', err);
              // Continue without logo
              pdf.setFontSize(20);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(...white);
              pdf.text('REDLAND SCHOOL', pageWidth / 2, headerHeight / 2 - 3, { align: 'center' });
              
              pdf.setFontSize(12);
              pdf.setFont('helvetica', 'normal');
              pdf.text('Registro de Actividades y Evaluaciones', pageWidth / 2, headerHeight / 2 + 6, { align: 'center' });
              resolve();
            }
          };
          img.onerror = () => {
            // Continue without logo
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...white);
            pdf.text('REDLAND SCHOOL', pageWidth / 2, headerHeight / 2 - 3, { align: 'center' });
            
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Registro de Actividades y Evaluaciones', pageWidth / 2, headerHeight / 2 + 6, { align: 'center' });
            resolve();
          };
          img.src = LogoRedland;
        });
      } catch (error) {
        console.error('Error loading logo:', error);
        // Continue without logo
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...white);
        pdf.text('REDLAND SCHOOL', pageWidth / 2, headerHeight / 2 - 3, { align: 'center' });
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Registro de Actividades y Evaluaciones', pageWidth / 2, headerHeight / 2 + 6, { align: 'center' });
        return Promise.resolve();
      }
    };

    // Add header to first page
    await addCorporateHeader();
    yPosition = headerHeight + 10; // Start content after header with margin

    // Get section name
    const sectionName = section === 'todas' ? 'Todas las Secciones' : 
                        section === 'Junior' ? 'Junior School' :
                        section === 'Middle' ? 'Middle School' : 'Senior School';

    // Main title with auto-wrap
    let mainTitle = '';
    if (reportType === 'ambos') {
      mainTitle = `Reporte de Actividades y Evaluaciones – Sección: ${sectionName}`;
    } else if (reportType === 'actividades') {
      mainTitle = `Reporte de Actividades – Sección: ${sectionName}`;
    } else {
      mainTitle = `Reporte de Evaluaciones – Sección: ${sectionName}`;
    }

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...redCorporate);
    
    // Split text to fit content width (max 2 lines)
    const titleLines = pdf.splitTextToSize(mainTitle, contentWidth);
    const maxLines = Math.min(titleLines.length, 2); // Limit to 2 lines max
    const titleToShow = titleLines.slice(0, maxLines);
    
    titleToShow.forEach((line, index) => {
      pdf.text(line, pageWidth / 2, yPosition + (index * 7), { align: 'center' });
    });
    yPosition += maxLines * 7 + 3;

    // Subtitle with date range - centered
    const subtitleText = `Del ${formatDateForDisplay(dateFrom)} al ${formatDateForDisplay(dateTo)}`;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayDark);
    pdf.text(subtitleText, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Process data based on report type
    const processActivities = () => {
      const filteredActivities = filterDataByDateRange(activities, dateFrom, dateTo);
      const sortedDates = Object.keys(filteredActivities).sort();
      const sectionsToShow = section === 'todas' ? ['Junior', 'Middle', 'Senior'] : [section];

      if (sortedDates.length === 0) return;

      // Table configuration for activities
      const colWidths = [25, 20, 50, 30, 25, 20, 20]; // Fecha, Hora, Actividad, Responsable, Lugar, Sección, Curso
      const totalWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = (pageWidth - totalWidth) / 2;

      // Add section title for activities
      checkPageBreak(15);
      yPosition += 5;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...redCorporate);
      pdf.text('ACTIVIDADES', marginLeft, yPosition);
      yPosition += 8;

      // Add table header for activities
      const addActivitiesTableHeader = () => {
        checkPageBreak(8);
        
        // Header background
        pdf.setFillColor(...redCorporate);
        pdf.rect(startX, yPosition - 4, totalWidth, 7, 'F');
        
        // Header text
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...white);
        
        let xPos = startX;
        const headers = ['Fecha', 'Hora', 'Actividad', 'Responsable', 'Lugar', 'Sección', 'Curso'];
        headers.forEach((header, i) => {
          pdf.text(header, xPos + 2, yPosition);
          xPos += colWidths[i];
        });
        
        yPosition += 8;
      };

      // Helper function to consolidate duplicate activities (from "Todos" section)
      const consolidateDuplicateActivities = (rows) => {
        // Create a map to group activities by their key fields
        const activityMap = new Map();
        
        rows.forEach(row => {
          // Create a unique key based on date, time, activity, responsable, and lugar
          const key = `${row.date}|${row.time}|${row.activity}|${row.responsable}|${row.lugar}`;
          
          if (!activityMap.has(key)) {
            activityMap.set(key, []);
          }
          activityMap.get(key).push(row);
        });
        
        // Process each group
        const consolidatedRows = [];
        activityMap.forEach((group, key) => {
          // If we have exactly 3 activities with the same key but different sections (Junior, Middle, Senior)
          if (group.length === 3) {
            const sections = group.map(r => r.section).sort();
            // Check if they are the three expected sections
            if (sections[0] === 'Junior' && sections[1] === 'Middle' && sections[2] === 'Senior') {
              // Consolidate into one row with "Todos" as section
              consolidatedRows.push({
                ...group[0],
                section: 'Todos'
              });
              return; // Skip adding individual rows
            }
          }
          
          // Otherwise, add all rows as they are
          consolidatedRows.push(...group);
        });
        
        // Sort consolidated rows by time (maintaining the original order)
        return consolidatedRows.sort((a, b) => {
          // Keep the same sorting logic as sortActivitiesByTime
          if (a.time === 'TODO EL DÍA' && b.time !== 'TODO EL DÍA') return -1;
          if (a.time !== 'TODO EL DÍA' && b.time === 'TODO EL DÍA') return 1;
          if (a.time === 'TODO EL DÍA' && b.time === 'TODO EL DÍA') return 0;
          
          const timeA = a.time ? a.time.split(':').map(Number) : [99, 99];
          const timeB = b.time ? b.time.split(':').map(Number) : [99, 99];
          const minutesA = timeA[0] * 60 + (timeA[1] || 0);
          const minutesB = timeB[0] * 60 + (timeB[1] || 0);
          return minutesA - minutesB;
        });
      };

      let isFirstDate = true;
      sortedDates.forEach(dateKey => {
        const dateData = filteredActivities[dateKey];
        const rows = [];

        sectionsToShow.forEach(sec => {
          if (dateData[sec] && dateData[sec].length > 0) {
            let itemsToShow = filterByNivel(dateData[sec], nivel);
            
            if (itemsToShow.length > 0) {
              const sortedActivities = sortActivitiesByTime(itemsToShow);
              sortedActivities.forEach(activity => {
                const timeText = activity.hora === 'TODO EL DIA' ? 'TODO EL DÍA' : activity.hora || '';
                // Get curso display text - support both cursos array and legacy curso field
                let cursoText = '';
                if (activity.cursos && Array.isArray(activity.cursos) && activity.cursos.length > 0) {
                  // If single course, show it. If multiple, show first one or join them
                  if (activity.cursos.length === 1) {
                    cursoText = activity.cursos[0];
                  } else {
                    // Multiple courses - show first one (or could join with comma)
                    cursoText = activity.cursos[0];
                  }
                } else if (activity.curso) {
                  // Legacy support for single curso field
                  cursoText = activity.curso;
                }
                rows.push({
                  date: formatDateShort(dateKey),
                  time: timeText,
                  activity: activity.actividad,
                  responsable: activity.responsable || '',
                  lugar: activity.lugar || '',
                  section: sec,
                  curso: cursoText,
                  importante: activity.importante || false
                });
              });
            }
          }
        });

        if (rows.length === 0) return;

        // Consolidate duplicate activities (from "Todos" section)
        const consolidatedRows = consolidateDuplicateActivities(rows);

        // Add date header
        if (!isFirstDate) {
          checkPageBreak(10);
          yPosition += 5;
        }
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...black);
        pdf.text(formatDateForDisplay(dateKey), marginLeft, yPosition);
        yPosition += 6;

        // Add table header for first date
        if (isFirstDate) {
          addActivitiesTableHeader();
          isFirstDate = false;
        }

        // Add rows (using consolidated rows)
        consolidatedRows.forEach((row, index) => {
          let rowHeight = 6;
          const activityLines = pdf.splitTextToSize(row.activity, colWidths[2] - 4);
          rowHeight = Math.max(6, activityLines.length * 3 + 2);

          checkPageBreak(rowHeight + 3);

          // Row background (alternating)
          if (index % 2 === 0) {
            pdf.setFillColor(...white);
          } else {
            pdf.setFillColor(...grayLight);
          }
          pdf.rect(startX, yPosition - 4, totalWidth, rowHeight, 'F');

          // Row border
          pdf.setDrawColor(...grayDark);
          pdf.setLineWidth(0.1);
          pdf.rect(startX, yPosition - 4, totalWidth, rowHeight, 'S');

          // Add cells
          let xPos = startX;
          
          // Date
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          pdf.text(row.date, xPos + 2, yPosition);
          xPos += colWidths[0];

          // Time
          pdf.setFontSize(8);
          pdf.setTextColor(...(row.importante ? redCorporate : black));
          pdf.setFont('helvetica', row.importante ? 'bold' : 'normal');
          pdf.text(row.time, xPos + 2, yPosition);
          xPos += colWidths[1];

          // Activity
          pdf.setFontSize(8);
          pdf.setFont('helvetica', row.importante ? 'bold' : 'normal');
          pdf.setTextColor(...(row.importante ? redCorporate : black));
          activityLines.forEach((line, i) => {
            pdf.text(line, xPos + 2, yPosition + (i * 3));
          });
          xPos += colWidths[2];

          // Responsable
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          pdf.text(row.responsable, xPos + 2, yPosition);
          xPos += colWidths[3];

          // Lugar
          pdf.text(row.lugar, xPos + 2, yPosition);
          xPos += colWidths[4];

          // Sección
          pdf.text(row.section, xPos + 2, yPosition);
          xPos += colWidths[5];

          // Curso
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          pdf.text(row.curso || '-', xPos + 2, yPosition);

          yPosition += rowHeight;
        });

        yPosition += 3;
      });
    };

    const processEvaluations = () => {
      const filteredEvaluations = filterDataByDateRange(evaluations, dateFrom, dateTo);
      const sortedDates = Object.keys(filteredEvaluations).sort();
      const sectionsToShow = section === 'todas' ? ['Junior', 'Middle', 'Senior'] : [section];

      if (sortedDates.length === 0) return;

      // Table configuration for evaluations
      const colWidths = [25, 35, 35, 18, 25, 20]; // Fecha, Asignatura, Tema/Criterio, Hora, Curso, Sección
      const totalWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = (pageWidth - totalWidth) / 2;

      // Add section title for evaluations
      checkPageBreak(15);
      yPosition += 8;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...redCorporate);
      pdf.text('EVALUACIONES', marginLeft, yPosition);
      yPosition += 8;

      // Add table header for evaluations
      const addEvaluationsTableHeader = () => {
        checkPageBreak(8);
        
        // Header background
        pdf.setFillColor(...redCorporate);
        pdf.rect(startX, yPosition - 4, totalWidth, 7, 'F');
        
        // Header text
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...white);
        
        let xPos = startX;
        const headers = ['Fecha', 'Asignatura', 'Tema/Criterio', 'Hora', 'Curso', 'Sección'];
        headers.forEach((header, i) => {
          pdf.text(header, xPos + 2, yPosition);
          xPos += colWidths[i];
        });
        
        yPosition += 8;
      };

      let isFirstDate = true;
      sortedDates.forEach(dateKey => {
        const dateData = filteredEvaluations[dateKey];
        const rows = [];

        sectionsToShow.forEach(sec => {
          if (dateData[sec] && dateData[sec].length > 0) {
            let itemsToShow = filterByNivel(dateData[sec], nivel);
            
            if (itemsToShow.length > 0) {
              const sortedEvaluations = sortEvaluationsByYearLevel(itemsToShow);
              sortedEvaluations.forEach(evaluation => {
                // Obtener cursos como array (compatibilidad con formato antiguo)
                let cursosArray = [];
                if (evaluation.cursos && Array.isArray(evaluation.cursos) && evaluation.cursos.length > 0) {
                  cursosArray = evaluation.cursos;
                } else if (evaluation.curso) {
                  // Compatibilidad con datos antiguos
                  cursosArray = [evaluation.curso];
                }
                
                rows.push({
                  date: formatDateShort(dateKey),
                  asignatura: evaluation.asignatura || '',
                  tema: evaluation.tema || '',
                  hora: evaluation.hora || evaluation.hour || '', // Support both 'hora' and legacy 'hour'
                  curso: formatCursosForDisplay(cursosArray),
                  section: sec
                });
              });
            }
          }
        });

        if (rows.length === 0) return;

        // Add date header
        if (!isFirstDate) {
          checkPageBreak(10);
          yPosition += 5;
        }
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...black);
        pdf.text(formatDateForDisplay(dateKey), marginLeft, yPosition);
        yPosition += 6;

        // Add table header for first date
        if (isFirstDate) {
          addEvaluationsTableHeader();
          isFirstDate = false;
        }

        // Add rows
        rows.forEach((row, index) => {
          let rowHeight = 6;
          const asignaturaLines = pdf.splitTextToSize(row.asignatura, colWidths[1] - 4);
          const temaLines = pdf.splitTextToSize(row.tema, colWidths[2] - 4);
          rowHeight = Math.max(6, Math.max(asignaturaLines.length, temaLines.length) * 3 + 2);

          checkPageBreak(rowHeight + 3);

          // Row background (alternating)
          if (index % 2 === 0) {
            pdf.setFillColor(...white);
          } else {
            pdf.setFillColor(...grayLight);
          }
          pdf.rect(startX, yPosition - 4, totalWidth, rowHeight, 'F');

          // Row border
          pdf.setDrawColor(...grayDark);
          pdf.setLineWidth(0.1);
          pdf.rect(startX, yPosition - 4, totalWidth, rowHeight, 'S');

          // Add cells
          let xPos = startX;
          
          // Date
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          pdf.text(row.date, xPos + 2, yPosition);
          xPos += colWidths[0];

          // Asignatura
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          asignaturaLines.forEach((line, i) => {
            pdf.text(line, xPos + 2, yPosition + (i * 3));
          });
          xPos += colWidths[1];

          // Tema/Criterio
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...grayDark);
          temaLines.forEach((line, i) => {
            pdf.text(line, xPos + 2, yPosition + (i * 3));
          });
          xPos += colWidths[2];

          // Hora
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          pdf.text(row.hora || '', xPos + 2, yPosition);
          xPos += colWidths[3];

          // Curso
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text(row.curso, xPos + 2, yPosition);
          xPos += colWidths[4];

          // Sección
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          pdf.text(row.section, xPos + 2, yPosition);

          yPosition += rowHeight;
        });

        yPosition += 3;
      });
    };

    // Process based on report type
    if (reportType === 'ambos') {
      processActivities();
      processEvaluations();
    } else if (reportType === 'actividades') {
      processActivities();
    } else {
      processEvaluations();
    }

    // Footer on last page
    const pageCount = pdf.internal.pages.length - 1;
    pdf.setPage(pageCount);
    yPosition = pageHeight - marginBottom;
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayDark);
    pdf.text(`Generado el ${dateStr} ${timeStr} | Registro Escolar Web | Redland School`, 
      pageWidth / 2, yPosition, { align: 'center' });

    // Save PDF
    const reportTitle = reportType === 'ambos' ? 'Ambos' : 
                        reportType === 'actividades' ? 'Actividades' : 'Evaluaciones';
    const fileName = `Reporte_${reportTitle}_${sectionName.replace(/\s+/g, '_')}_${dateFrom}_${dateTo}.pdf`;
    pdf.save(fileName);
  };

  // Get official report HTML - same HTML used for browser PDF
  const getOfficialReportHTML = () => {
    // Use the same HTML generator that creates the perfect PDF
    // This HTML has ALL inline styles and is identical to what Chrome would print
    return exportFullReportHTML();
  };

  // Generate PDF using the SAME method as handlePrint
  // This ensures the PDF is EXACTLY the same as the one downloaded from browser
  const generatePDFBlob = async () => {
    if (!dateFrom || !dateTo) {
      throw new Error('Por favor selecciona un rango de fechas');
    }

    // Use the EXACT same PDF generation logic as handlePrint
    // Create PDF document (A4 portrait)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Corporate colors (RGB for jsPDF) - SAME as handlePrint
    const navyBlue = [26, 35, 70]; // #1A2346
    const redCorporate = [197, 32, 58]; // #C5203A
    const black = [0, 0, 0]; // #000000
    const white = [255, 255, 255]; // #FFFFFF
    const grayLight = [247, 247, 247]; // #F7F7F7
    const grayDark = [100, 100, 100]; // For subtitles

    // Margins - SAME as handlePrint
    const marginLeft = 10;
    const marginRight = 10;
    const marginBottom = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - marginLeft - marginRight;

    // Header height: 110px ≈ 39mm - SAME as handlePrint
    const headerHeight = 39;
    let yPosition = 0;

    // Helper function to add a new page if needed - SAME as handlePrint
    const checkPageBreak = (requiredHeight) => {
      if (yPosition + requiredHeight > pageHeight - marginBottom) {
        pdf.addPage();
        // Add header to new page
        pdf.setFillColor(...navyBlue);
        pdf.rect(0, 0, pageWidth, headerHeight, 'F');
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...white);
        pdf.text('REDLAND SCHOOL', pageWidth / 2, headerHeight / 2 - 3, { align: 'center' });
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Registro de Actividades y Evaluaciones', pageWidth / 2, headerHeight / 2 + 6, { align: 'center' });
        yPosition = headerHeight + 10;
        return true;
      }
      return false;
    };

    // Add corporate header on first page - SAME as handlePrint
    const addCorporateHeader = () => {
      // Navy blue rectangle background
      pdf.setFillColor(...navyBlue);
      pdf.rect(0, 0, pageWidth, headerHeight, 'F');

      // Load and add logo
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise((resolve) => {
          img.onload = () => {
            try {
              const logoHeight = 22; // ~60px in mm
              const logoWidth = (img.width / img.height) * logoHeight;
              
              // Convert image to canvas to get base64
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              const imgData = canvas.toDataURL('image/png');
              
              // Logo position: left side, centered vertically in header
              const logoY = (headerHeight - logoHeight) / 2;
              pdf.addImage(imgData, 'PNG', marginLeft, logoY, logoWidth, logoHeight);
              
              // Text in center of header
              pdf.setFontSize(20);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(...white);
              pdf.text('REDLAND SCHOOL', pageWidth / 2, headerHeight / 2 - 3, { align: 'center' });
              pdf.setFontSize(12);
              pdf.setFont('helvetica', 'normal');
              pdf.text('Registro de Actividades y Evaluaciones', pageWidth / 2, headerHeight / 2 + 6, { align: 'center' });
              resolve();
            } catch (err) {
              console.error('Error processing logo:', err);
              // Continue without logo
              pdf.setFontSize(20);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(...white);
              pdf.text('REDLAND SCHOOL', pageWidth / 2, headerHeight / 2 - 3, { align: 'center' });
              pdf.setFontSize(12);
              pdf.setFont('helvetica', 'normal');
              pdf.text('Registro de Actividades y Evaluaciones', pageWidth / 2, headerHeight / 2 + 6, { align: 'center' });
              resolve();
            }
          };
          img.onerror = () => {
            // Continue without logo
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...white);
            pdf.text('REDLAND SCHOOL', pageWidth / 2, headerHeight / 2 - 3, { align: 'center' });
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Registro de Actividades y Evaluaciones', pageWidth / 2, headerHeight / 2 + 6, { align: 'center' });
            resolve();
          };
          img.src = LogoRedland;
        });
      } catch (error) {
        console.error('Error loading logo:', error);
        // Continue without logo
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...white);
        pdf.text('REDLAND SCHOOL', pageWidth / 2, headerHeight / 2 - 3, { align: 'center' });
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Registro de Actividades y Evaluaciones', pageWidth / 2, headerHeight / 2 + 6, { align: 'center' });
        return Promise.resolve();
      }
    };

    // Add header to first page
    await addCorporateHeader();
    yPosition = headerHeight + 10; // Start content after header with margin

    // Get section name
    const sectionName = section === 'todas' ? 'Todas las Secciones' : 
                        section === 'Junior' ? 'Junior School' :
                        section === 'Middle' ? 'Middle School' : 'Senior School';

    // Main title with auto-wrap - SAME as handlePrint
    let mainTitle = '';
    if (reportType === 'ambos') {
      mainTitle = `Reporte de Actividades y Evaluaciones – Sección: ${sectionName}`;
    } else if (reportType === 'actividades') {
      mainTitle = `Reporte de Actividades – Sección: ${sectionName}`;
    } else {
      mainTitle = `Reporte de Evaluaciones – Sección: ${sectionName}`;
    }

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...redCorporate);
    
    // Split text to fit content width (max 2 lines)
    const titleLines = pdf.splitTextToSize(mainTitle, contentWidth);
    const maxLines = Math.min(titleLines.length, 2); // Limit to 2 lines max
    const titleToShow = titleLines.slice(0, maxLines);
    
    titleToShow.forEach((line, index) => {
      pdf.text(line, pageWidth / 2, yPosition + (index * 7), { align: 'center' });
    });
    yPosition += maxLines * 7 + 3;

    // Subtitle with date range - centered - SAME as handlePrint
    const subtitleText = `Del ${formatDateForDisplay(dateFrom)} al ${formatDateForDisplay(dateTo)}`;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayDark);
    pdf.text(subtitleText, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Process data based on report type - SAME logic as handlePrint
    const processActivities = () => {
      const filteredActivities = filterDataByDateRange(activities, dateFrom, dateTo);
      const sortedDates = Object.keys(filteredActivities).sort();
      const sectionsToShow = section === 'todas' ? ['Junior', 'Middle', 'Senior'] : [section];

      if (sortedDates.length === 0) return;

      // Table configuration for activities - SAME as handlePrint
      const colWidths = [25, 20, 50, 30, 25, 20, 20]; // Fecha, Hora, Actividad, Responsable, Lugar, Sección, Curso
      const totalWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = (pageWidth - totalWidth) / 2;

      // Add section title for activities
      checkPageBreak(15);
      yPosition += 5;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...redCorporate);
      pdf.text('ACTIVIDADES', marginLeft, yPosition);
      yPosition += 8;

      // Add table header for activities - SAME as handlePrint
      const addActivitiesTableHeader = () => {
        checkPageBreak(8);
        
        // Header background
        pdf.setFillColor(...redCorporate);
        pdf.rect(startX, yPosition - 4, totalWidth, 7, 'F');
        
        // Header text
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...white);
        
        let xPos = startX;
        const headers = ['Fecha', 'Hora', 'Actividad', 'Responsable', 'Lugar', 'Sección', 'Curso'];
        headers.forEach((header, i) => {
          pdf.text(header, xPos + 2, yPosition);
          xPos += colWidths[i];
        });
        
        yPosition += 8;
      };

      // Helper function to consolidate duplicate activities - SAME as handlePrint
      const consolidateDuplicateActivities = (rows) => {
        const activityMap = new Map();
        
        rows.forEach(row => {
          const key = `${row.date}|${row.time}|${row.activity}|${row.responsable}|${row.lugar}`;
          
          if (!activityMap.has(key)) {
            activityMap.set(key, []);
          }
          activityMap.get(key).push(row);
        });
        
        const consolidatedRows = [];
        activityMap.forEach((group, key) => {
          if (group.length === 3) {
            const sections = group.map(r => r.section).sort();
            if (sections[0] === 'Junior' && sections[1] === 'Middle' && sections[2] === 'Senior') {
              consolidatedRows.push({
                ...group[0],
                section: 'Todos'
              });
              return;
            }
          }
          consolidatedRows.push(...group);
        });
        
        return consolidatedRows.sort((a, b) => {
          if (a.time === 'TODO EL DÍA' && b.time !== 'TODO EL DÍA') return -1;
          if (a.time !== 'TODO EL DÍA' && b.time === 'TODO EL DÍA') return 1;
          if (a.time === 'TODO EL DÍA' && b.time === 'TODO EL DÍA') return 0;
          
          const timeA = a.time ? a.time.split(':').map(Number) : [99, 99];
          const timeB = b.time ? b.time.split(':').map(Number) : [99, 99];
          const minutesA = timeA[0] * 60 + (timeA[1] || 0);
          const minutesB = timeB[0] * 60 + (timeB[1] || 0);
          return minutesA - minutesB;
        });
      };

      let isFirstDate = true;
      sortedDates.forEach(dateKey => {
        const dateData = filteredActivities[dateKey];
        const rows = [];

        sectionsToShow.forEach(sec => {
          if (dateData[sec] && dateData[sec].length > 0) {
            let itemsToShow = filterByNivel(dateData[sec], nivel);
            
            if (itemsToShow.length > 0) {
              const sortedActivities = sortActivitiesByTime(itemsToShow);
              sortedActivities.forEach(activity => {
                const timeText = activity.hora === 'TODO EL DIA' ? 'TODO EL DÍA' : activity.hora || '';
                let cursoText = '';
                if (activity.cursos && Array.isArray(activity.cursos) && activity.cursos.length > 0) {
                  cursoText = activity.cursos[0];
                } else if (activity.curso) {
                  cursoText = activity.curso;
                }
                rows.push({
                  date: formatDateShort(dateKey),
                  time: timeText,
                  activity: activity.actividad,
                  responsable: activity.responsable || '',
                  lugar: activity.lugar || '',
                  section: sec,
                  curso: cursoText,
                  importante: activity.importante || false
                });
              });
            }
          }
        });

        if (rows.length === 0) return;

        const consolidatedRows = consolidateDuplicateActivities(rows);

        // Add date header
        if (!isFirstDate) {
          checkPageBreak(10);
          yPosition += 5;
        }
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...black);
        pdf.text(formatDateForDisplay(dateKey), marginLeft, yPosition);
        yPosition += 6;

        // Add table header for first date
        if (isFirstDate) {
          addActivitiesTableHeader();
          isFirstDate = false;
        }

        // Add rows - SAME as handlePrint
        consolidatedRows.forEach((row, index) => {
          let rowHeight = 6;
          const activityLines = pdf.splitTextToSize(row.activity, colWidths[2] - 4);
          rowHeight = Math.max(6, activityLines.length * 3 + 2);

          checkPageBreak(rowHeight + 3);

          // Row background (alternating)
          if (index % 2 === 0) {
            pdf.setFillColor(...white);
          } else {
            pdf.setFillColor(...grayLight);
          }
          pdf.rect(startX, yPosition - 4, totalWidth, rowHeight, 'F');

          // Row border
          pdf.setDrawColor(...grayDark);
          pdf.setLineWidth(0.1);
          pdf.rect(startX, yPosition - 4, totalWidth, rowHeight, 'S');

          // Add cells
          let xPos = startX;
          
          // Date
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          pdf.text(row.date, xPos + 2, yPosition);
          xPos += colWidths[0];

          // Time
          pdf.setFontSize(8);
          pdf.setTextColor(...(row.importante ? redCorporate : black));
          pdf.setFont('helvetica', row.importante ? 'bold' : 'normal');
          pdf.text(row.time, xPos + 2, yPosition);
          xPos += colWidths[1];

          // Activity
          pdf.setFontSize(8);
          pdf.setFont('helvetica', row.importante ? 'bold' : 'normal');
          pdf.setTextColor(...(row.importante ? redCorporate : black));
          activityLines.forEach((line, i) => {
            pdf.text(line, xPos + 2, yPosition + (i * 3));
          });
          xPos += colWidths[2];

          // Responsable
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          pdf.text(row.responsable, xPos + 2, yPosition);
          xPos += colWidths[3];

          // Lugar
          pdf.text(row.lugar, xPos + 2, yPosition);
          xPos += colWidths[4];

          // Sección
          pdf.text(row.section, xPos + 2, yPosition);
          xPos += colWidths[5];

          // Curso
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          pdf.text(row.curso || '-', xPos + 2, yPosition);

          yPosition += rowHeight;
        });

        yPosition += 3;
      });
    };

    const processEvaluations = () => {
      const filteredEvaluations = filterDataByDateRange(evaluations, dateFrom, dateTo);
      const sortedDates = Object.keys(filteredEvaluations).sort();
      const sectionsToShow = section === 'todas' ? ['Junior', 'Middle', 'Senior'] : [section];

      if (sortedDates.length === 0) return;

      // Table configuration for evaluations - SAME as handlePrint
      const colWidths = [25, 35, 35, 18, 25, 20]; // Fecha, Asignatura, Tema/Criterio, Hora, Curso, Sección
      const totalWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = (pageWidth - totalWidth) / 2;

      // Add section title for evaluations
      checkPageBreak(15);
      yPosition += 8;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...redCorporate);
      pdf.text('EVALUACIONES', marginLeft, yPosition);
      yPosition += 8;

      // Add table header for evaluations - SAME as handlePrint
      const addEvaluationsTableHeader = () => {
        checkPageBreak(8);
        
        // Header background
        pdf.setFillColor(...redCorporate);
        pdf.rect(startX, yPosition - 4, totalWidth, 7, 'F');
        
        // Header text
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...white);
        
        let xPos = startX;
        const headers = ['Fecha', 'Asignatura', 'Tema/Criterio', 'Hora', 'Curso', 'Sección'];
        headers.forEach((header, i) => {
          pdf.text(header, xPos + 2, yPosition);
          xPos += colWidths[i];
        });
        
        yPosition += 8;
      };

      let isFirstDate = true;
      sortedDates.forEach(dateKey => {
        const dateData = filteredEvaluations[dateKey];
        const rows = [];

        sectionsToShow.forEach(sec => {
          if (dateData[sec] && dateData[sec].length > 0) {
            let itemsToShow = filterByNivel(dateData[sec], nivel);
            
            if (itemsToShow.length > 0) {
              const sortedEvaluations = sortEvaluationsByYearLevel(itemsToShow);
              sortedEvaluations.forEach(evaluation => {
                // Obtener cursos como array (compatibilidad con formato antiguo)
                let cursosArray = [];
                if (evaluation.cursos && Array.isArray(evaluation.cursos) && evaluation.cursos.length > 0) {
                  cursosArray = evaluation.cursos;
                } else if (evaluation.curso) {
                  // Compatibilidad con datos antiguos
                  cursosArray = [evaluation.curso];
                }
                
                rows.push({
                  date: formatDateShort(dateKey),
                  asignatura: evaluation.asignatura || '',
                  tema: evaluation.tema || '',
                  hora: evaluation.hora || evaluation.hour || '',
                  curso: formatCursosMultiline(cursosArray), // Usar formato multilínea para PDF
                  section: sec
                });
              });
            }
          }
        });

        if (rows.length === 0) return;

        // Add date header
        if (!isFirstDate) {
          checkPageBreak(10);
          yPosition += 5;
        }
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...black);
        pdf.text(formatDateForDisplay(dateKey), marginLeft, yPosition);
        yPosition += 6;

        // Add table header for first date
        if (isFirstDate) {
          addEvaluationsTableHeader();
          isFirstDate = false;
        }

        // Add rows - SAME as handlePrint
        rows.forEach((row, index) => {
          let rowHeight = 6;
          const asignaturaLines = pdf.splitTextToSize(row.asignatura, colWidths[1] - 4);
          const temaLines = pdf.splitTextToSize(row.tema, colWidths[2] - 4);
          rowHeight = Math.max(6, Math.max(asignaturaLines.length, temaLines.length) * 3 + 2);

          checkPageBreak(rowHeight + 3);

          // Row background (alternating)
          if (index % 2 === 0) {
            pdf.setFillColor(...white);
          } else {
            pdf.setFillColor(...grayLight);
          }
          pdf.rect(startX, yPosition - 4, totalWidth, rowHeight, 'F');

          // Row border
          pdf.setDrawColor(...grayDark);
          pdf.setLineWidth(0.1);
          pdf.rect(startX, yPosition - 4, totalWidth, rowHeight, 'S');

          // Add cells
          let xPos = startX;
          
          // Date
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          pdf.text(row.date, xPos + 2, yPosition);
          xPos += colWidths[0];

          // Asignatura
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          asignaturaLines.forEach((line, i) => {
            pdf.text(line, xPos + 2, yPosition + (i * 3));
          });
          xPos += colWidths[1];

          // Tema/Criterio
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...grayDark);
          temaLines.forEach((line, i) => {
            pdf.text(line, xPos + 2, yPosition + (i * 3));
          });
          xPos += colWidths[2];

          // Hora
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          pdf.text(row.hora || '', xPos + 2, yPosition);
          xPos += colWidths[3];

          // Curso
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text(row.curso, xPos + 2, yPosition);
          xPos += colWidths[4];

          // Sección
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          pdf.text(row.section, xPos + 2, yPosition);

          yPosition += rowHeight;
        });

        yPosition += 3;
      });
    };

    // Process based on report type - SAME as handlePrint
    if (reportType === 'ambos') {
      processActivities();
      processEvaluations();
    } else if (reportType === 'actividades') {
      processActivities();
    } else {
      processEvaluations();
    }

    // Footer on last page - SAME as handlePrint
    const pageCount = pdf.internal.pages.length - 1;
    pdf.setPage(pageCount);
    yPosition = pageHeight - marginBottom;
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayDark);
    pdf.text(`Generado el ${dateStr} ${timeStr} | Registro Escolar Web | Redland School`, 
      pageWidth / 2, yPosition, { align: 'center' });

    // Return PDF as blob instead of saving
    const pdfBlob = pdf.output('blob');
    return pdfBlob;
  };

  const handleSendEmail = async () => {
    if (!dateFrom || !dateTo) {
      alert('Por favor selecciona un rango de fechas');
      return;
    }

    if (!emailTo || !emailTo.includes('@')) {
      alert('Por favor ingresa un correo electrónico válido');
      return;
    }

    setSendingEmail(true);

    try {
      // Generate PDF using EXACT same method as handlePrint
      // This ensures the PDF is IDENTICAL to the one downloaded from browser
      const pdfBlob = await generatePDFBlob();
      
      const sectionName = section === 'todas' ? 'Todas las Secciones' : 
                          section === 'Junior' ? 'Junior School' :
                          section === 'Middle' ? 'Middle School' : 'Senior School';
      
      const nivelName = nivel === 'todos' ? 'Todos los Niveles' : 
                        (section === 'Middle' ? `${nivel}° Básico` : 
                         section === 'Senior' ? `${nivel} Medio` : 'Todos los Niveles');
      
      const reportTitle = reportType === 'actividades' ? 'Actividades' : 
                          reportType === 'evaluaciones' ? 'Evaluaciones' : 'Ambos';
      
      // Generate filename
      const reportTypeName = reportType === 'actividades' ? 'Actividades' : 
                             reportType === 'evaluaciones' ? 'Evaluaciones' : 'Ambos';
      const sectionNameClean = sectionName.replace(/\s+/g, '_');
      const filename = `Reporte_${reportTypeName}_${sectionNameClean}_${dateFrom}_${dateTo}.pdf`;

      // Create FormData and send PDF as file
      const formData = new FormData();
      formData.append('pdf', pdfBlob, filename);
      formData.append('to', emailTo);
      formData.append('subject', `Reporte ${reportTitle} - ${sectionName} - ${nivelName}`);
      formData.append('reportType', reportType === 'actividades' ? 'actividades' : reportType === 'evaluaciones' ? 'evaluaciones' : 'ambos');
      formData.append('section', sectionName);
      formData.append('nivel', nivelName);
      formData.append('dateFrom', dateFrom);
      formData.append('dateTo', dateTo);

      // Send PDF file to backend
      const response = await fetch(`${BACKEND_URL}/api/send-report-email`, {
        method: 'POST',
        body: formData // Send as FormData, not JSON
      });

      const data = await parseJsonOnce(response);
      if (response.ok) {
        alert('✅ Reporte enviado exitosamente a ' + emailTo);
        setEmailTo('');
      } else {
        alert('❌ Error al enviar email: ' + (data.detail || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('❌ Error al enviar email. Por favor intenta nuevamente.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1A1F2E] rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="bg-[#1A2346] dark:bg-[#121C39] text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Reporte
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#0F1425] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] transition-colors"
              >
                <option value="actividades">Actividades</option>
                <option value="evaluaciones">Evaluaciones</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sección
              </label>
              <select
                value={section}
                onChange={(e) => {
                  setSection(e.target.value);
                  setNivel('todos'); // Reset nivel when section changes
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#0F1425] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] transition-colors"
              >
                <option value="todas">Todas las Secciones</option>
                <option value="Junior">Junior School</option>
                <option value="Middle">Middle School</option>
                <option value="Senior">Senior School</option>
              </select>
            </div>

            {/* Nivel - Only shown when Middle or Senior is selected */}
            {(section === 'Middle' || section === 'Senior') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nivel
                </label>
                <select
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#0F1425] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] transition-colors"
                >
                  {getNivelesOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  min="2026-02-23"
                  max="2027-01-05"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#0F1425] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min="2026-02-23"
                  max="2027-01-05"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#0F1425] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] transition-colors"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enviar por Email (Opcional)
              </label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="destinatario@redland.cl"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#0F1425] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si ingresas un email, se enviará el reporte automáticamente
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-300 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Información del Reporte:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>El reporte se genera en PDF institucional con el encabezado oficial del colegio.</li>
                    <li>Incluye actividades y evaluaciones dentro del rango de fechas seleccionado.</li>
                    <li>Las actividades muestran sección, curso, ubicación, hora y responsable.</li>
                    <li>Las evaluaciones muestran sección, curso, asignatura, tema y fecha.</li>
                    <li>La opción "Todos" reúne Junior, Middle y Senior en un solo documento.</li>
                    <li>El PDF respeta el estilo corporativo del colegio.</li>
                    <li>Incluye pie de página con fecha de generación y marca institucional.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-[#0F1425] px-6 py-4 flex justify-between items-center rounded-b-lg border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-sm"
          >
            Cancelar
          </button>
          
          <div className="flex space-x-3">
            {emailTo && (
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="px-6 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {sendingEmail ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Enviar por Email
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-[#C5203A] dark:bg-[#C5203A] text-white rounded-lg hover:bg-[#A01A2E] dark:hover:bg-[#A01A2E] transition-colors font-medium flex items-center shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {emailTo ? 'Ver e Imprimir' : 'Generar e Imprimir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintReportPanel;
