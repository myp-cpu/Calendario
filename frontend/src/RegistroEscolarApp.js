import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import UserManagementPanel from './UserManagementPanel';
import PrintReportPanel from './PrintReportPanel';
import {
  fetchActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  fetchEvaluations,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
} from './services/activitiesService';
import LogoRedland from './logo/imalogotipo-blanco_sinfondo_2.png';

// Week start date
const schoolYearStart = new Date('2026-02-23'); // Week 0 Monday
const schoolYearEnd = new Date('2027-01-05');

// Static course map by section
const COURSE_MAP = {
  Junior: ["Junior A", "Junior B", "Junior AB"],
  Middle: ["5° A", "5° B", "6° A", "6° B", "7° A", "7° B", "8° A", "8° B",
           "5° AB", "6° AB", "7° AB", "8° AB"],
  Senior: ["I EM A", "I EM B", "I EM AB",
           "II EM A", "II EM B", "II EM AB",
           "III EM A", "III EM B", "III EM AB",
           "IV EM A", "IV EM B", "IV EM AB"]
};

// Helper function to get courses for a section
const getCoursesForSection = (seccion) => {
  if (!seccion || seccion === 'ALL') return [];
  return COURSE_MAP[seccion] || [];
};

// Helper function to format cursos array for display
// Converts ["6° A", "6° B"] to "6° AB" or ["6° A", "8° B", "I EM A"] to "6° A, 8° B, I EM A"
const formatCursosForDisplay = (cursos) => {
  if (!cursos || cursos.length === 0) return '';
  if (typeof cursos === 'string') return cursos; // Backward compatibility
  
  // If single course, return as is
  if (cursos.length === 1) return cursos[0];
  
  // Group by level for Middle and Senior
  const middleGroups = {};
  const seniorGroups = {};
  
  cursos.forEach(curso => {
    // Middle: "5° A", "5° B" -> "5° AB" (formato: "5° A", "5° B", "5° AB")
    const middleMatch = curso.match(/^([5-8]°)\s+(A|B|AB)$/);
    if (middleMatch) {
      const level = middleMatch[1]; // "5°", "6°", etc.
      const variant = middleMatch[2]; // "A", "B", o "AB"
      if (!middleGroups[level]) middleGroups[level] = [];
      // Si ya es "AB", no agregar "A" y "B" por separado
      if (variant === 'AB') {
        if (!middleGroups[level].includes('AB')) {
          middleGroups[level] = ['AB']; // Reemplazar todo con AB
        }
      } else {
        // Si ya existe AB, no agregar A o B individuales
        if (!middleGroups[level].includes('AB')) {
          if (!middleGroups[level].includes(variant)) {
            middleGroups[level].push(variant);
          }
        }
      }
    }
    // Senior: "I EM A", "I EM B" -> "I EM AB" (formato: "I EM A", "II EM B", etc.)
    const seniorMatch = curso.match(/^((I|II|III|IV)\s+EM)\s+(A|B|AB)$/);
    if (seniorMatch) {
      const level = seniorMatch[1]; // "I EM", "II EM", etc.
      const variant = seniorMatch[3]; // "A", "B", o "AB"
      if (!seniorGroups[level]) seniorGroups[level] = [];
      // Si ya es "AB", no agregar "A" y "B" por separado
      if (variant === 'AB') {
        if (!seniorGroups[level].includes('AB')) {
          seniorGroups[level] = ['AB']; // Reemplazar todo con AB
        }
      } else {
        // Si ya existe AB, no agregar A o B individuales
        if (!seniorGroups[level].includes('AB')) {
          if (!seniorGroups[level].includes(variant)) {
            seniorGroups[level].push(variant);
          }
        }
      }
    }
  });
  
  // Build formatted string
  const formatted = [];
  
  // Process Middle groups
  Object.keys(middleGroups).sort().forEach(level => {
    const variants = middleGroups[level];
    if (variants.length === 2 && variants.includes('A') && variants.includes('B')) {
      formatted.push(`${level} AB`);
    } else {
      variants.forEach(v => formatted.push(`${level} ${v}`));
    }
  });
  
  // Process Senior groups
  Object.keys(seniorGroups).sort().forEach(level => {
    const variants = seniorGroups[level];
    if (variants.length === 2 && variants.includes('A') && variants.includes('B')) {
      formatted.push(`${level} AB`);
    } else {
      variants.forEach(v => formatted.push(`${level} ${v}`));
    }
  });
  
  // Add courses that don't match patterns (already processed or don't match)
  cursos.forEach(curso => {
    const middleMatch = curso.match(/^([5-8]°)\s+(A|B|AB)$/);
    const seniorMatch = curso.match(/^((I|II|III|IV)\s+EM)\s+(A|B|AB)$/);
    if (!middleMatch && !seniorMatch && !formatted.includes(curso)) {
      formatted.push(curso);
    }
  });
  
  return formatted.join(', ');
};

// Asignaturas por sección (ordenadas alfabéticamente)
const ASIGNATURAS_MIDDLE = [
  "Artes Visuales",
  "Biología",
  "Ciencias Naturales",
  "Diseño",
  "Ed. Física y Salud",
  "English",
  "Francés",
  "Individuo y Sociedades",
  "Lenguaje",
  "Matemática",
  "Música",
  "Otra",
  "Química",
  "Física"
].sort((a, b) => {
  // Ordenar alfabéticamente, pero "Otra" siempre al final
  if (a === "Otra") return 1;
  if (b === "Otra") return -1;
  return a.localeCompare(b, 'es');
});

const ASIGNATURAS_SENIOR = [
  "Artes Visuales",
  "Biología",
  "Ciencias para la Ciudadanía",
  "Diseño",
  "Ed. Física y Salud",
  "English",
  "Filosofía",
  "Francés",
  "Gestión Empresarial",
  "Historia",
  "Lenguaje",
  "Matemática",
  "Música",
  "Otra",
  "Química",
  "Física",
  "Taller Lenguaje",
  "Taller Matemática",
  "ToK"
].sort((a, b) => {
  // Ordenar alfabéticamente, pero "Otra" siempre al final
  if (a === "Otra") return 1;
  if (b === "Otra") return -1;
  return a.localeCompare(b, 'es');
});

// Footer component
const Footer = ({ mode }) => (
  <div style={{
    textAlign: "center",
    color: "#7a7a7a",
    paddingTop: "20px",
    paddingBottom: "20px",
    fontSize: "13px",
    lineHeight: "18px"
  }}>
    <div>Redland School — Calendario Escolar 2026</div>
    <div style={{ marginTop: "4px" }}>
      {mode === "viewer" ? "Vista de solo lectura" : "Vista de edición"}
    </div>
    <div style={{ marginTop: "5px" }}>
      © 2025 Redland School ·{' '}
      <a href="mailto:benjamin0osses@gmail.com" 
         style={{ color: "#7a7a7a", textDecoration: "none", marginLeft: "4px" }}
         onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
         onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
        Desarrollado por B.O
      </a>
    </div>
  </div>
);

const RegistroEscolarApp = ({ autoOpenUserManagement = false }) => {
  const { user, logout, isEditor, token } = useAuth();
  
  // State management
  const [activities, setActivities] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [currentWeek, setCurrentWeek] = useState(0);
  const [activityForm, setActivityForm] = useState({
    seccion: '',
    actividad: '',
    fecha: '',
    fechaFin: '',
    hora: '',
    lugar: '',
    responsable: '',
    importante: false
  });
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [evaluationForm, setEvaluationForm] = useState({
    seccion: '',
    asignatura: '',
    asignaturaManual: '', // Para cuando se selecciona "Otra"
    tema: '',
    cursos: [], // Array de cursos seleccionados
    fecha: '',
    hora: ''
  });
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingEvaluation, setEditingEvaluation] = useState(null);
  const [showUserManagement, setShowUserManagement] = useState(autoOpenUserManagement);
  const [showPrintReport, setShowPrintReport] = useState(false);
  
  // Filter states
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL'); // ALL | ACTIVITIES | EVALUATIONS
  
  // Dark mode state with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Apply dark mode class to document root
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };
  
  useEffect(() => {
    if (autoOpenUserManagement) {
      setShowUserManagement(true);
    }
  }, [autoOpenUserManagement]);

  // Helper function to convert date to YYYY-MM-DD format
  const getDateKey = (date) => {
    // If date is already a string in YYYY-MM-DD format, return it
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    
    // Convert Date object to YYYY-MM-DD without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load activities from backend
  const loadActivities = useCallback(async () => {
    if (!token) return;
    
    try {
      const dateFrom = getDateKey(schoolYearStart);
      const dateTo = getDateKey(schoolYearEnd);
      const activitiesData = await fetchActivities(token, dateFrom, dateTo);
      setActivities(activitiesData || {});
    } catch (error) {
      console.error('Error loading activities:', error);
      alert('Error al cargar actividades: ' + error.message);
    }
  }, [token]);

  // Load evaluations from backend
  const loadEvaluations = useCallback(async () => {
    if (!token) return;
    
    try {
      const dateFrom = getDateKey(schoolYearStart);
      const dateTo = getDateKey(schoolYearEnd);
      const evaluationsData = await fetchEvaluations(token, dateFrom, dateTo);
      setEvaluations(evaluationsData || {});
    } catch (error) {
      console.error('Error loading evaluations:', error);
      alert('Error al cargar evaluaciones: ' + error.message);
    }
  }, [token]);

  // Load activities and evaluations from backend on mount and when token changes
  useEffect(() => {
    if (token && user) {
      loadActivities();
      loadEvaluations();
    }
  }, [token, user, loadActivities, loadEvaluations]);

  // Generate weeks - memoized to avoid recalculation on every render
  const weeks = useMemo(() => {
    const weeksArray = [];
    let currentDate = new Date(schoolYearStart);
    let weekNumber = 0;

    while (currentDate <= schoolYearEnd) {
      const weekDays = [];
      
      // Collect days for this week (Monday to Saturday, plus Sunday if it follows)
      while (currentDate <= schoolYearEnd) {
        const dayOfWeek = currentDate.getDay();
        
        // Add current day
        weekDays.push(new Date(currentDate));
        
        // If this is Saturday, check if we should add Sunday
        if (dayOfWeek === 6) {
          // Peek at the next day without modifying currentDate yet
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 1);
          
          // If next day is Sunday and within range, add it
          if (nextDate <= schoolYearEnd && nextDate.getDay() === 0) {
            weekDays.push(new Date(nextDate));
            // Skip past Sunday when we continue
            currentDate.setDate(currentDate.getDate() + 2);
          } else {
            // Just skip past Saturday
            currentDate.setDate(currentDate.getDate() + 1);
          }
          break; // End of week
        }
        
        // Move to next day (for non-Saturday days)
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (weekDays.length > 0) {
        weeksArray.push({ number: weekNumber, days: weekDays });
        weekNumber++;
      }
    }

    return weeksArray;
  }, []);

  const formatDate = (date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Sort activities by time - all-day activities first, then by time (earliest to latest)
  const sortActivitiesByTime = (activities) => {
    if (!activities || activities.length === 0) return [];
    
    return [...activities].sort((a, b) => {
      // All-day activities come first
      if (a.hora === 'TODO EL DIA' && b.hora !== 'TODO EL DIA') return -1;
      if (a.hora !== 'TODO EL DIA' && b.hora === 'TODO EL DIA') return 1;
      
      // Both are all-day or both have times
      if (a.hora === 'TODO EL DIA' && b.hora === 'TODO EL DIA') {
        return 0; // Keep original order for all-day activities
      }
      
      // Sort by time (convert HH:MM to comparable number)
      const timeA = a.hora ? a.hora.split(':').map(Number) : [99, 99];
      const timeB = b.hora ? b.hora.split(':').map(Number) : [99, 99];
      
      const minutesA = timeA[0] * 60 + (timeA[1] || 0);
      const minutesB = timeB[0] * 60 + (timeB[1] || 0);
      
      return minutesA - minutesB;
    });
  };

  // Sort evaluations by year level (5, 6, 7, 8 for Middle; I, II, III, IV for Senior)
  const sortEvaluationsByYearLevel = (evaluations) => {
    if (!evaluations || evaluations.length === 0) return [];
    
    return [...evaluations].sort((a, b) => {
      // Extract year level from curso (soporta tanto array como string)
      const getYearLevel = (curso) => {
        // Si es array, usar el primer curso
        const cursoStr = Array.isArray(curso) ? (curso[0] || '') : curso;
        
        // For Middle: 5°, 6°, 7°, 8°
        if (cursoStr.includes('5°')) return 5;
        if (cursoStr.includes('6°')) return 6;
        if (cursoStr.includes('7°')) return 7;
        if (cursoStr.includes('8°')) return 8;
        
        // For Senior: I EM, II EM, III EM, IV EM
        if (cursoStr.includes('I EM') && !cursoStr.includes('II EM') && !cursoStr.includes('III EM') && !cursoStr.includes('IV EM')) return 1;
        if (cursoStr.includes('II EM') && !cursoStr.includes('III EM') && !cursoStr.includes('IV EM')) return 2;
        if (cursoStr.includes('III EM') && !cursoStr.includes('IV EM')) return 3;
        if (cursoStr.includes('IV EM')) return 4;
        
        // For Junior or other
        return 0;
      };
      
      // Obtener cursos (soporta tanto array como string para backward compatibility)
      const cursosA = a.cursos || (a.curso ? [a.curso] : []);
      const cursosB = b.cursos || (b.curso ? [b.curso] : []);
      
      const levelA = getYearLevel(cursosA.length > 0 ? cursosA[0] : '');
      const levelB = getYearLevel(cursosB.length > 0 ? cursosB[0] : '');
      
      // Sort by year level first
      if (levelA !== levelB) {
        return levelA - levelB;
      }
      
      // If same year level, sort by section (A before B before AB)
      const getSectionOrder = (cursos) => {
        if (cursos.length === 0) return 4;
        const cursoStr = Array.isArray(cursos) ? (cursos[0] || '') : cursos;
        if (cursoStr.includes(' A') && !cursoStr.includes('AB')) return 1;
        if (cursoStr.includes(' B')) return 2;
        if (cursoStr.includes('AB')) return 3;
        return 4;
      };
      
      return getSectionOrder(cursosA) - getSectionOrder(cursosB);
    });
  };

  // Get available courses based on filterSection
  const availableCourses = useMemo(() => {
    if (filterSection === 'ALL') {
      // Return all courses from all sections
      return [
        ...COURSE_MAP.Junior,
        ...COURSE_MAP.Middle,
        ...COURSE_MAP.Senior
      ];
    } else {
      // Return courses for the selected section
      return COURSE_MAP[filterSection] || [];
    }
  }, [filterSection]);

  // Helper function to check if activity matches filters
  const matchFiltersForActivity = (activity, section) => {
    // Filter by section
    // Note: When user selects "ALL" in form, backend creates 3 separate activities
    // (one for each section), so we just need to match the activity's seccion with the current section
    if (filterSection !== 'ALL' && section !== filterSection) {
      return false;
    }
    
    // Filter by type
    if (filterType === 'EVALUATIONS') {
      return false;
    }
    
    // Filter by course
    if (filterCourse !== 'ALL') {
      // Check if activity has cursos array
      if (activity.cursos && Array.isArray(activity.cursos) && activity.cursos.length > 0) {
        // Activity has specific courses - check if filterCourse is in the array
        if (!activity.cursos.includes(filterCourse)) {
          return false;
        }
      } else if (activity.curso) {
        // Legacy support: check single curso field (for backward compatibility)
        if (activity.curso !== filterCourse) {
          return false;
        }
      }
      // If activity doesn't have cursos or curso, it's a general activity and should be shown
    }
    
    return true;
  };

  // Helper function to check if evaluation matches filters
  const matchFiltersForEvaluation = (evaluation, section) => {
    // Filter by section
    if (filterSection !== 'ALL' && section !== filterSection) {
      return false;
    }
    
    // Filter by type
    if (filterType === 'ACTIVITIES') {
      return false;
    }
    
    // Filter by course (soporta tanto array como string para backward compatibility)
    if (filterCourse !== 'ALL') {
      const cursosArray = evaluation.cursos || (evaluation.curso ? [evaluation.curso] : []);
      if (!cursosArray.includes(filterCourse)) {
        return false;
      }
    }
    
    return true;
  };

  // Activity submission
  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    
    if (!token || !isEditor) {
      alert('No tienes permisos para crear actividades');
      return;
    }

    try {
      const startDate = new Date(activityForm.fecha);
      const endDate = activityForm.fechaFin ? new Date(activityForm.fechaFin) : startDate;

      // Determine cursos array based on seccion and cursoSeleccionado
      let cursosArray = null;
      if (activityForm.seccion !== 'ALL') {
        if (cursoSeleccionado === 'ALL') {
          // All courses for the selected section
          cursosArray = getCoursesForSection(activityForm.seccion);
        } else if (cursoSeleccionado) {
          // Specific course selected
          cursosArray = [cursoSeleccionado];
        }
        // If cursoSeleccionado is empty, cursosArray remains null (no cursos field sent)
      }
      // If seccion is "ALL", cursosArray remains null (no cursos field sent)

      // If it's a multi-day activity (TODO EL DIA with fechaFin)
      if (activityForm.hora === 'TODO EL DIA' && activityForm.fechaFin) {
        let currentDate = new Date(startDate);
        let createdCount = 0;
        let totalCreated = 0;
        while (currentDate <= endDate) {
          const dateKey = getDateKey(currentDate);
          const activityData = {
            seccion: activityForm.seccion,
            actividad: activityForm.actividad,
            fecha: dateKey,
            fechaFin: activityForm.fechaFin,
            hora: activityForm.hora,
            lugar: activityForm.lugar || null,
            responsable: activityForm.responsable || null,
            importante: activityForm.importante || false,
            ...(cursosArray && { cursos: cursosArray })
          };
          const result = await createActivity(token, activityData);
          // If seccion is "ALL", result.created will be 3
          if (result.created) {
            totalCreated += result.created;
          } else {
            totalCreated += 1;
          }
          createdCount++;
          currentDate.setDate(currentDate.getDate() + 1);
        }
        alert(activityForm.seccion === 'ALL' 
          ? `✅ Actividades agregadas exitosamente: ${totalCreated} actividades creadas (${createdCount} días × 3 secciones)` 
          : `✅ Actividades agregadas exitosamente: ${totalCreated} actividades creadas para ${createdCount} días`);
      } else {
        // Single day activity
        const activityData = {
          seccion: activityForm.seccion,
          actividad: activityForm.actividad,
          fecha: activityForm.fecha,
          fechaFin: activityForm.fechaFin || null,
          hora: activityForm.hora,
          lugar: activityForm.lugar || null,
          responsable: activityForm.responsable || null,
          importante: activityForm.importante || false,
          ...(cursosArray && { cursos: cursosArray })
        };
        const result = await createActivity(token, activityData);
        
        // Show appropriate message based on result
        if (result.created && result.created === 3) {
          alert('✅ Actividades agregadas exitosamente: Se crearon 3 actividades (una para cada sección: Junior, Middle, Senior)');
        } else {
          alert('✅ Actividad agregada exitosamente');
        }
      }

      // Reload activities from backend
      await loadActivities();

      setActivityForm({
        seccion: '',
        actividad: '',
        fecha: '',
        fechaFin: '',
        hora: '',
        lugar: '',
        responsable: '',
        importante: false
      });
      setCursoSeleccionado('');
    } catch (error) {
      console.error('Error creating activity:', error);
      alert('Error al crear actividad: ' + error.message);
    }
  };

  // Evaluation submission
  const handleEvaluationSubmit = async (e) => {
    e.preventDefault();
    
    if (!token || !isEditor) {
      alert('No tienes permisos para crear evaluaciones');
      return;
    }

    try {
      // Validar que se haya seleccionado al menos un curso
      if (!evaluationForm.cursos || evaluationForm.cursos.length === 0) {
        alert('Debes seleccionar al menos un curso');
        return;
      }

      // Validar que no se exceda el límite de 3 cursos
      if (evaluationForm.cursos.length > 3) {
        alert('Solo puedes seleccionar hasta 3 cursos por evaluación');
        return;
      }

      // Determinar la asignatura final (si es "Otra", usar asignaturaManual)
      const asignaturaFinal = evaluationForm.asignatura === 'Otra' 
        ? (evaluationForm.asignaturaManual || 'Otra')
        : evaluationForm.asignatura;

      const evaluationData = {
        seccion: evaluationForm.seccion,
        asignatura: asignaturaFinal,
        tema: evaluationForm.tema || null,
        cursos: evaluationForm.cursos, // Array de cursos
        fecha: evaluationForm.fecha,
        hora: evaluationForm.hora || null,
      };

      await createEvaluation(token, evaluationData);

      // Reload evaluations from backend
      await loadEvaluations();

      setEvaluationForm({
        seccion: '',
        asignatura: '',
        asignaturaManual: '',
        tema: '',
        cursos: [],
        fecha: '',
        hora: ''
      });

      alert('Evaluación agregada exitosamente');
    } catch (error) {
      console.error('Error creating evaluation:', error);
      // Mejorar el manejo de errores para mostrar mensajes más claros
      let errorMessage = 'Error al crear evaluación';
      if (error.message) {
        errorMessage += ': ' + error.message;
      } else if (typeof error === 'object') {
        errorMessage += ': ' + JSON.stringify(error);
      } else {
        errorMessage += ': ' + String(error);
      }
      alert(errorMessage);
    }
  };

  // Edit activity function
  const handleEditActivity = (activity, dateKey, section) => {
    setActivityForm({
      ...activity,
      fecha: dateKey
    });
    // Set cursoSeleccionado based on activity.cursos
    if (activity.cursos && activity.cursos.length > 0) {
      // If it has all courses for the section, set to "ALL"
      const sectionCourses = getCoursesForSection(activity.seccion);
      if (activity.cursos.length === sectionCourses.length && 
          activity.cursos.every(c => sectionCourses.includes(c))) {
        setCursoSeleccionado('ALL');
      } else if (activity.cursos.length === 1) {
        // Single course selected
        setCursoSeleccionado(activity.cursos[0]);
      } else {
        // Multiple specific courses (shouldn't happen with current UI, but handle it)
        setCursoSeleccionado('');
      }
    } else {
      setCursoSeleccionado('');
    }
    setEditingActivity({ id: activity.id, dateKey, section });
    
    // Scroll to form
    setTimeout(() => {
      const formElement = document.querySelector('.activity-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Update activity function
  const handleUpdateActivity = async (e) => {
    e.preventDefault();
    
    if (!editingActivity || !token || !isEditor) {
      return;
    }

    try {
      // Determine cursos array based on seccion and cursoSeleccionado
      let cursosArray = null;
      if (activityForm.seccion !== 'ALL') {
        if (cursoSeleccionado === 'ALL') {
          // All courses for the selected section
          cursosArray = getCoursesForSection(activityForm.seccion);
        } else if (cursoSeleccionado) {
          // Specific course selected
          cursosArray = [cursoSeleccionado];
        }
        // If cursoSeleccionado is empty, cursosArray remains null (no cursos field sent)
      }
      // If seccion is "ALL", cursosArray remains null (no cursos field sent)

      const activityData = {
        seccion: activityForm.seccion,
        actividad: activityForm.actividad,
        fecha: activityForm.fecha,
        fechaFin: activityForm.fechaFin || null,
        hora: activityForm.hora,
        lugar: activityForm.lugar || null,
        responsable: activityForm.responsable || null,
        importante: activityForm.importante || false,
        ...(cursosArray && { cursos: cursosArray })
      };

      await updateActivity(token, editingActivity.id, activityData);

      // Reload activities from backend
      await loadActivities();

      setActivityForm({
        seccion: '',
        actividad: '',
        fecha: '',
        fechaFin: '',
        hora: '',
        lugar: '',
        responsable: '',
        importante: false
      });
      setCursoSeleccionado('');
      setEditingActivity(null);
      
      alert('Actividad actualizada exitosamente');
    } catch (error) {
      console.error('Error updating activity:', error);
      alert('Error al actualizar actividad: ' + error.message);
    }
  };

  // Delete activity function
  const handleDeleteActivity = async (activityId, dateKey, section) => {
    if (!token || !isEditor) {
      alert('No tienes permisos para eliminar actividades');
      return;
    }

    if (window.confirm('¿Está seguro de que desea eliminar esta actividad?')) {
      try {
        await deleteActivity(token, activityId);
        
        // Reload activities from backend
        await loadActivities();
        alert('Actividad eliminada exitosamente');
      } catch (error) {
        console.error('Error deleting activity:', error);
        alert('Error al eliminar actividad: ' + error.message);
      }
    }
  };

  // Edit evaluation function
  const handleEditEvaluation = (evaluation, dateKey, section) => {
    // Determinar si la asignatura está en la lista o es manual
    const isMiddle = section === 'Middle';
    const isSenior = section === 'Senior';
    const asignaturasList = isMiddle ? ASIGNATURAS_MIDDLE : (isSenior ? ASIGNATURAS_SENIOR : []);
    const asignaturaEnLista = asignaturasList.includes(evaluation.asignatura);
    
    // Obtener cursos (soporta tanto array como string para backward compatibility)
    const cursosArray = evaluation.cursos || (evaluation.curso ? [evaluation.curso] : []);
    
    setEvaluationForm({
      ...evaluation,
      fecha: dateKey,
      asignatura: asignaturaEnLista ? evaluation.asignatura : 'Otra',
      asignaturaManual: asignaturaEnLista ? '' : evaluation.asignatura,
      cursos: cursosArray // Array de cursos
    });
    setEditingEvaluation({ id: evaluation.id, dateKey, section });
    
    // Scroll to form
    setTimeout(() => {
      const formElement = document.querySelector('.evaluation-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Update evaluation function
  const handleUpdateEvaluation = async (e) => {
    e.preventDefault();
    
    if (!editingEvaluation || !token || !isEditor) {
      return;
    }

    // No permitir actualizar evaluaciones para Junior
    if (evaluationForm.seccion === 'Junior') {
      alert('No se pueden actualizar evaluaciones para Junior School');
      return;
    }

    // Validar que se haya seleccionado al menos un curso
    if (!evaluationForm.cursos || evaluationForm.cursos.length === 0) {
      alert('Por favor seleccione al menos un curso');
      return;
    }

    // Validar que no se exceda el límite de 3 cursos
    if (evaluationForm.cursos.length > 3) {
      alert('Solo puedes seleccionar hasta 3 cursos por evaluación');
      return;
    }

    try {
      // Si se seleccionó "Otra", usar el valor manual
      const asignaturaFinal = evaluationForm.asignatura === 'Otra' 
        ? evaluationForm.asignaturaManual 
        : evaluationForm.asignatura;
      
      const evaluationData = {
        seccion: evaluationForm.seccion,
        asignatura: asignaturaFinal,
        tema: evaluationForm.tema || null,
        cursos: evaluationForm.cursos, // Array de cursos
        fecha: evaluationForm.fecha,
        hora: evaluationForm.hora || null,
      };

      await updateEvaluation(token, editingEvaluation.id, evaluationData);

      // Reload evaluations from backend
      await loadEvaluations();

      setEvaluationForm({
        seccion: '',
        asignatura: '',
        asignaturaManual: '',
        tema: '',
        cursos: [],
        fecha: '',
        hora: ''
      });
      setEditingEvaluation(null);
      
      alert('Evaluación actualizada exitosamente');
    } catch (error) {
      console.error('Error updating evaluation:', error);
      alert('Error al actualizar evaluación: ' + error.message);
    }
  };

  // Delete evaluation function
  const handleDeleteEvaluation = async (evaluationId, dateKey, section) => {
    if (!token || !isEditor) {
      alert('No tienes permisos para eliminar evaluaciones');
      return;
    }

    if (window.confirm('¿Está seguro de que desea eliminar esta evaluación?')) {
      try {
        await deleteEvaluation(token, evaluationId);
        
        // Reload evaluations from backend
        await loadEvaluations();
        alert('Evaluación eliminada exitosamente');
      } catch (error) {
        console.error('Error deleting evaluation:', error);
        alert('Error al eliminar evaluación: ' + error.message);
      }
    }
  };

  // Cancel edit function
  const handleCancelEdit = () => {
    setActivityForm({
      seccion: '',
      actividad: '',
      fecha: '',
      fechaFin: '',
      hora: '',
      lugar: '',
      responsable: '',
      importante: false
    });
    setCursoSeleccionado('');
    setEvaluationForm({
      seccion: '',
      asignatura: '',
      asignaturaManual: '',
      tema: '',
      cursos: [],
      fecha: '',
      hora: ''
    });
    setEditingActivity(null);
    setEditingEvaluation(null);
  };

  const renderActivity = (activity, dateKey, section) => {
    const text = activity.hora === 'TODO EL DIA' 
      ? `[TODO EL DÍA] ${activity.actividad}`
      : `[${activity.hora}] ${activity.actividad}`;
    
    // Get curso display text - support both cursos array and legacy curso field
    let cursoText = null;
    if (activity.cursos && Array.isArray(activity.cursos) && activity.cursos.length > 0) {
      // If it's a single course, show it. If multiple, show first one or join them
      if (activity.cursos.length === 1) {
        cursoText = activity.cursos[0];
      } else {
        // Multiple courses - show first one (or could show "Varios cursos")
        cursoText = activity.cursos[0];
      }
    } else if (activity.curso) {
      // Legacy support for single curso field
      cursoText = activity.curso;
    }
    
    // Unified styling for both Editor and Viewer
    const isViewer = !isEditor;
    
    return (
      <div 
        key={activity.id} 
        className="text-xs mb-2 group transition-all duration-200 hover:scale-[1.03]"
      >
        <div className={`rounded-[12px] px-3 py-2.5 shadow-[0px_2px_6px_rgba(0,0,0,0.12)] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.18)] transition-all duration-200 ${
          activity.importante 
            ? 'bg-[#fff3f4] dark:bg-[#2a1a1c] border-[#C5203A] border-[3px] shadow-[0_0_8px_rgba(197,32,58,0.3)] hover:border-[#C5203A] hover:shadow-[0_0_12px_rgba(197,32,58,0.4)]'
            : 'bg-[#1A2346] dark:bg-[#121C39] border-transparent border-0 hover:border-[#1A2346] hover:border-opacity-30 dark:hover:border-[#C5203A] dark:hover:border-opacity-30'
        }`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {/* Course chip - unified for both Editor and Viewer */}
              {cursoText && (
                <div className="mb-1.5">
                  <span className="inline-block px-2 py-0.5 rounded-[8px] text-[10px] font-medium bg-[#2A3A5C] dark:bg-[#1E2A4A] text-white">
                    {cursoText}
                  </span>
                </div>
              )}
              <div className={`${activity.importante ? 'text-[#C5203A] dark:text-[#ff6b7a] font-bold' : isViewer ? 'text-white' : 'text-white'}`}>
                {text}
              </div>
              {activity.lugar && (
                <div className={`text-xs mt-0.5 ${activity.importante ? 'text-[#C5203A] dark:text-[#ff6b7a]' : 'text-white opacity-90'}`}>
                  ({activity.lugar})
                </div>
              )}
              {activity.responsable && (
                <div className={`text-xs mt-0.5 ${activity.importante ? 'text-[#C5203A] dark:text-[#ff6b7a]' : 'text-white opacity-90'}`}>
                  {activity.responsable}
                </div>
              )}
            </div>
            {isEditor && (
              <div className="opacity-0 group-hover:opacity-100 ml-2 flex space-x-1 flex-shrink-0 transition-opacity">
                <button
                  onClick={() => handleEditActivity(activity, dateKey, section)}
                  className={`text-xs rounded px-1 py-0.5 ${
                    activity.importante 
                      ? 'text-[#C5203A] hover:text-[#A01A2E] bg-[#C5203A] bg-opacity-10 hover:bg-opacity-20' 
                      : 'text-white hover:text-gray-200 bg-white bg-opacity-20 hover:bg-opacity-30'
                  }`}
                  title="Editar actividad"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteActivity(activity.id, dateKey, section)}
                  className={`text-xs rounded px-1 py-0.5 ${
                    activity.importante 
                      ? 'text-[#C5203A] hover:text-[#A01A2E] bg-[#C5203A] bg-opacity-10 hover:bg-opacity-20' 
                      : 'text-white hover:text-red-200 bg-white bg-opacity-20 hover:bg-opacity-30'
                  }`}
                  title="Eliminar actividad"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEvaluation = (evaluation, dateKey, section) => {
    const horaText = evaluation.hora ? `[${evaluation.hora}] ` : '';
    const temaText = evaluation.tema ? ` — ${evaluation.tema}` : '';
    
    // Obtener asignatura (mostrar asignaturaManual si es "Otra")
    const asignaturaDisplay = evaluation.asignatura === "Otra"
      ? (evaluation.asignaturaManual || "Otra")
      : evaluation.asignatura;
    
    // Obtener cursos (soporta tanto array como string para backward compatibility)
    const cursosArray = evaluation.cursos || (evaluation.curso ? [evaluation.curso] : []);
    const cursosDisplay = formatCursosForDisplay(cursosArray);
    
    return (
      <div key={evaluation.id} className="text-xs mb-2 group transition-all duration-200 hover:scale-[1.03]">
        <div className="bg-[#C5203A] dark:bg-[#C5203A] text-white px-3 py-2.5 rounded-[12px] shadow-[0px_2px_6px_rgba(0,0,0,0.12)] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.18)] hover:border-[#C5203A] hover:border-opacity-40 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="flex-1 text-white">
              {/* Course chip - unified for both Editor and Viewer */}
              {cursosDisplay && (
                <div className="mb-1.5">
                  <span className="inline-block px-2 py-0.5 rounded-[8px] text-[10px] font-medium bg-[#2A3A5C] dark:bg-[#1E2A4A] text-white">
                    {cursosDisplay}
                  </span>
                </div>
              )}
              {horaText}{asignaturaDisplay}{temaText}
            </div>
            {isEditor && (
              <div className="opacity-0 group-hover:opacity-100 ml-2 flex space-x-1 flex-shrink-0 transition-opacity">
                <button
                  onClick={() => handleEditEvaluation(evaluation, evaluation.fecha, section)}
                  className="text-white hover:text-gray-200 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 rounded px-1 py-0.5"
                  title="Editar evaluación"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteEvaluation(evaluation.id, evaluation.fecha, section)}
                  className="text-white hover:text-red-200 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 rounded px-1 py-0.5"
                  title="Eliminar evaluación"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#F5F7FA] dark:bg-[#0F1425] transition-colors duration-200 flex flex-col min-h-screen">
      {/* Header with user info and actions */}
      <div className="bg-[#1A2346] dark:bg-[#121C39] border-b border-[#1A2346] dark:border-[#121C39] px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src={LogoRedland} 
              alt="Logo Colegio" 
              className="h-12 w-auto object-contain"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-white">
              <span className="font-medium">{user?.email ?? ''}</span>
              <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                user?.role === 'editor' 
                  ? 'bg-[#C5203A] text-white' 
                  : 'bg-white bg-opacity-20 text-white'
              }`}>
                {user?.role === 'editor' ? 'Editor' : 'Viewer'}
              </span>
            </div>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="text-white hover:text-gray-200 transition-colors p-2 rounded-md hover:bg-white hover:bg-opacity-10"
              title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            
            {isEditor && (
              <>
                <button
                  onClick={() => setShowPrintReport(true)}
                  className="bg-[#1A2346] dark:bg-[#1A2346] text-white px-4 py-2.5 rounded-[12px] hover:bg-[#121C39] dark:hover:bg-[#121C39] text-sm font-medium shadow-[0px_2px_6px_rgba(0,0,0,0.12)] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.18)] transition-all duration-200"
                  title="Imprimir Reporte"
                >
                  Imprimir
                </button>
                <button
                  onClick={() => setShowUserManagement(true)}
                  className="bg-[#1A2346] dark:bg-[#1A2346] text-white px-4 py-2.5 rounded-[12px] hover:bg-[#121C39] dark:hover:bg-[#121C39] text-sm font-medium shadow-[0px_2px_6px_rgba(0,0,0,0.12)] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.18)] transition-all duration-200"
                >
                  Gestionar Usuarios
                </button>
              </>
            )}
            
            <button
              onClick={logout}
              className="text-white hover:text-gray-200 transition-colors p-2 rounded-md hover:bg-white hover:bg-opacity-10"
              title="Cerrar sesión"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="main-content p-4 pb-0">
        <div className="max-w-7xl mx-auto">
          {/* Header Info */}
          <div className="bg-white dark:bg-[#121C39] rounded-[14px] shadow-[0px_2px_8px_rgba(0,0,0,0.08)] dark:shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
              Registro de Actividades y Evaluaciones Escolares 2026
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center">
              Sistema completo para registrar y publicar actividades escolares por secciones
            </p>
            {!isEditor && (
              <div className="mt-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Modo solo lectura:</strong> Estás viendo el registro como <strong>Viewer</strong>. No puedes agregar, editar o eliminar elementos.
                </p>
              </div>
            )}
          </div>

          {/* Activity Form - Only for editors */}
          {isEditor && (
            <div className="bg-white dark:bg-[#121C39] rounded-[14px] shadow-[0px_2px_8px_rgba(0,0,0,0.08)] dark:shadow-lg p-5 mb-4 activity-form border border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center">Registro de Actividades</h2>
              <form onSubmit={editingActivity ? handleUpdateActivity : handleActivitySubmit} className="text-sm">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Row 1: Main fields */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sección</label>
                    <select
                      value={activityForm.seccion}
                      onChange={(e) => {
                        setActivityForm({...activityForm, seccion: e.target.value});
                        // Reset curso when section changes
                        setCursoSeleccionado('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] hover:border-[#1A2346] dark:hover:border-[#C5203A] transition-all duration-150"
                      required
                    >
                      <option value="">Seleccionar</option>
                      <option value="ALL">Todos</option>
                      <option value="Junior">Junior</option>
                      <option value="Middle">Middle</option>
                      <option value="Senior">Senior</option>
                    </select>
                  </div>
                  
                  {/* Curso selector - only shown when section is not "ALL" */}
                  {activityForm.seccion && activityForm.seccion !== 'ALL' && (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Curso
                      </label>
                      <select
                        value={cursoSeleccionado}
                        onChange={(e) => setCursoSeleccionado(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] hover:border-[#1A2346] dark:hover:border-[#C5203A] transition-all duration-150"
                      >
                        <option value="">Seleccionar</option>
                        <option value="ALL">Todos los cursos</option>
                        {getCoursesForSection(activityForm.seccion).map(curso => (
                          <option key={curso} value={curso}>{curso}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actividad</label>
                    <input
                      type="text"
                      value={activityForm.actividad}
                      onChange={(e) => setActivityForm({...activityForm, actividad: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] hover:border-[#1A2346] dark:hover:border-[#C5203A] transition-all duration-150"
                      placeholder="Descripción de la actividad"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fecha {activityForm.hora === 'TODO EL DIA' ? 'Inicio' : ''}
                    </label>
                    <input
                      type="date"
                      value={activityForm.fecha}
                      onChange={(e) => setActivityForm({...activityForm, fecha: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] hover:border-[#1A2346] dark:hover:border-[#C5203A] transition-all duration-150"
                      min="2026-02-23"
                      max="2027-01-05"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                    <select
                      value={activityForm.hora}
                      onChange={(e) => setActivityForm({...activityForm, hora: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] hover:border-[#1A2346] dark:hover:border-[#C5203A] transition-all duration-150"
                    >
                      <option value="">Seleccionar</option>
                      <option value="TODO EL DIA">TODO EL DÍA</option>
                      {Array.from({length: 12}, (_, i) => {
                        const hour = 7 + i;
                        return [0, 15, 30, 45].map(min => (
                          <option key={`${hour}:${min.toString().padStart(2, '0')}`} value={`${hour}:${min.toString().padStart(2, '0')}`}>
                            {`${hour}:${min.toString().padStart(2, '0')}`}
                          </option>
                        ));
                      }).flat()}
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lugar</label>
                    <input
                      type="text"
                      value={activityForm.lugar}
                      onChange={(e) => setActivityForm({...activityForm, lugar: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] hover:border-[#1A2346] dark:hover:border-[#C5203A] transition-all duration-150"
                      placeholder="Ubicación"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsable</label>
                    <input
                      type="text"
                      value={activityForm.responsable}
                      onChange={(e) => setActivityForm({...activityForm, responsable: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] hover:border-[#1A2346] dark:hover:border-[#C5203A] transition-all duration-150"
                      placeholder="Nombre del responsable"
                    />
                  </div>
                  
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <button
                      type="submit"
                      className="bg-[#1A2346] dark:bg-[#1A2346] text-white px-4 py-2.5 rounded-[12px] hover:bg-[#121C39] dark:hover:bg-[#121C39] focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] text-sm font-medium shadow-[0px_2px_6px_rgba(0,0,0,0.12)] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.18)] transition-all duration-200"
                    >
                      {editingActivity ? 'Actualizar' : 'Agregar'} Actividad
                    </button>
                    
                    {editingActivity && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="bg-gray-500 dark:bg-gray-600 text-white px-4 py-2.5 rounded-[12px] hover:bg-gray-600 dark:hover:bg-gray-700 text-sm shadow-[0px_2px_6px_rgba(0,0,0,0.12)] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.18)] transition-all duration-200"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Row 2: Conditional fields */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3">
                  {activityForm.hora === 'TODO EL DIA' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Término</label>
                      <input
                        type="date"
                        value={activityForm.fechaFin}
                        onChange={(e) => setActivityForm({...activityForm, fechaFin: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] hover:border-[#1A2346] dark:hover:border-[#C5203A] transition-all duration-150"
                        min={activityForm.fecha || "2026-02-23"}
                        max="2027-01-05"
                        required={activityForm.hora === 'TODO EL DIA'}
                      />
                    </div>
                  )}
                  
                  <div className="md:col-span-3">
                    <label className="flex items-center text-sm mt-2 text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={activityForm.importante}
                        onChange={(e) => setActivityForm({...activityForm, importante: e.target.checked})}
                        className="mr-2 w-4 h-4 text-[#C5203A] focus:ring-[#C5203A] border-gray-300 rounded"
                      />
                      <span className="font-medium">Importante</span>
                    </label>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Evaluation Form - Only for editors */}
          {isEditor && (
            <div className="bg-white dark:bg-[#121C39] rounded-[14px] shadow-[0px_2px_8px_rgba(0,0,0,0.08)] dark:shadow-lg p-5 mb-4 evaluation-form border border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center">Registro de Evaluaciones</h2>
              <form onSubmit={editingEvaluation ? handleUpdateEvaluation : handleEvaluationSubmit} className="grid grid-cols-1 md:grid-cols-7 gap-3 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sección</label>
                  <select
                    value={evaluationForm.seccion}
                    onChange={(e) => {
                      const nuevaSeccion = e.target.value;
                      setEvaluationForm({
                        ...evaluationForm, 
                        seccion: nuevaSeccion,
                        // Limpiar asignatura cuando cambia la sección
                        asignatura: '',
                        asignaturaManual: '',
                        // Limpiar cursos también
                        cursos: []
                      });
                    }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C5203A] hover:border-[#C5203A] dark:hover:border-[#C5203A] transition-all duration-150"
                    required
                  >
                    <option value="">Seleccionar</option>
                    <option value="Middle">Middle</option>
                    <option value="Senior">Senior</option>
                  </select>
                  {evaluationForm.seccion === 'Junior' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Junior School no tiene evaluaciones
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asignatura</label>
                  {/* Selector de asignaturas solo para Middle y Senior */}
                  {(evaluationForm.seccion === 'Middle' || evaluationForm.seccion === 'Senior') ? (
                    <>
                      <select
                        value={evaluationForm.asignatura}
                        onChange={(e) => setEvaluationForm({
                          ...evaluationForm, 
                          asignatura: e.target.value,
                          asignaturaManual: e.target.value === 'Otra' ? evaluationForm.asignaturaManual : ''
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C5203A] hover:border-[#C5203A] dark:hover:border-[#C5203A] transition-all duration-150"
                        required
                      >
                        <option value="">Seleccionar</option>
                        {evaluationForm.seccion === 'Middle' && ASIGNATURAS_MIDDLE.map(asig => (
                          <option key={asig} value={asig}>{asig}</option>
                        ))}
                        {evaluationForm.seccion === 'Senior' && ASIGNATURAS_SENIOR.map(asig => (
                          <option key={asig} value={asig}>{asig}</option>
                        ))}
                      </select>
                      {/* Input manual cuando se selecciona "Otra" */}
                      {evaluationForm.asignatura === 'Otra' && (
                        <input
                          type="text"
                          value={evaluationForm.asignaturaManual}
                          onChange={(e) => setEvaluationForm({...evaluationForm, asignaturaManual: e.target.value})}
                          className="w-full px-3 py-2 mt-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C5203A] hover:border-[#C5203A] dark:hover:border-[#C5203A] transition-all duration-150"
                          placeholder="Ingrese el nombre de la asignatura"
                          required
                        />
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={evaluationForm.asignatura}
                      onChange={(e) => setEvaluationForm({...evaluationForm, asignatura: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C5203A] hover:border-[#C5203A] dark:hover:border-[#C5203A] transition-all duration-150"
                      placeholder="Matemáticas, Ciencias, etc."
                      disabled={evaluationForm.seccion === 'Junior'}
                    />
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tema/Criterio</label>
                  <input
                    type="text"
                    value={evaluationForm.tema}
                    onChange={(e) => setEvaluationForm({...evaluationForm, tema: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C5203A] hover:border-[#C5203A] dark:hover:border-[#C5203A] transition-all duration-150"
                    placeholder="Tema de la evaluación"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cursos</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-[#1A1F2E]">
                    {evaluationForm.seccion === 'Middle' && (
                      <div className="grid grid-cols-2 gap-2">
                        {getCoursesForSection('Middle').map(curso => (
                          <label key={curso} className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={evaluationForm.cursos.includes(curso)}
                              disabled={!evaluationForm.cursos.includes(curso) && evaluationForm.cursos.length >= 3}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Validar límite de 3 cursos
                                  if (evaluationForm.cursos.length >= 3) {
                                    alert('Solo puedes seleccionar hasta 3 cursos por evaluación');
                                    return;
                                  }
                                  setEvaluationForm({
                                    ...evaluationForm,
                                    cursos: [...evaluationForm.cursos, curso]
                                  });
                                } else {
                                  setEvaluationForm({
                                    ...evaluationForm,
                                    cursos: evaluationForm.cursos.filter(c => c !== curso)
                                  });
                                }
                              }}
                              className="mr-2 w-4 h-4 text-[#C5203A] focus:ring-[#C5203A] border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span>{curso}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {evaluationForm.seccion === 'Senior' && (
                      <div className="grid grid-cols-2 gap-2">
                        {getCoursesForSection('Senior').map(curso => (
                          <label key={curso} className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={evaluationForm.cursos.includes(curso)}
                              disabled={!evaluationForm.cursos.includes(curso) && evaluationForm.cursos.length >= 3}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Validar límite de 3 cursos
                                  if (evaluationForm.cursos.length >= 3) {
                                    alert('Solo puedes seleccionar hasta 3 cursos por evaluación');
                                    return;
                                  }
                                  setEvaluationForm({
                                    ...evaluationForm,
                                    cursos: [...evaluationForm.cursos, curso]
                                  });
                                } else {
                                  setEvaluationForm({
                                    ...evaluationForm,
                                    cursos: evaluationForm.cursos.filter(c => c !== curso)
                                  });
                                }
                              }}
                              className="mr-2 w-4 h-4 text-[#C5203A] focus:ring-[#C5203A] border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span>{curso}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {(!evaluationForm.seccion || evaluationForm.seccion === 'Junior') && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Seleccione una sección primero
                      </p>
                    )}
                  </div>
                  {evaluationForm.cursos.length > 0 && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {evaluationForm.cursos.length} curso(s) seleccionado(s) {evaluationForm.cursos.length >= 3 && <span className="text-[#C5203A] font-semibold">(máximo alcanzado)</span>}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={evaluationForm.fecha}
                    onChange={(e) => setEvaluationForm({...evaluationForm, fecha: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C5203A] hover:border-[#C5203A] dark:hover:border-[#C5203A] transition-all duration-150"
                    min="2026-02-23"
                    max="2027-01-05"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                  <select
                    value={evaluationForm.hora}
                    onChange={(e) => setEvaluationForm({...evaluationForm, hora: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C5203A] hover:border-[#C5203A] dark:hover:border-[#C5203A] transition-all duration-150"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {Array.from({length: 12}, (_, i) => {
                      const hour = 7 + i;
                      return [0, 15, 30, 45].map(min => (
                        <option key={`${hour}:${min.toString().padStart(2, '0')}`} value={`${hour}:${min.toString().padStart(2, '0')}`}>
                          {`${hour}:${min.toString().padStart(2, '0')}`}
                        </option>
                      ));
                    }).flat()}
                  </select>
                </div>
                
                <div className="flex flex-col justify-end">
                  <button
                    type="submit"
                    disabled={evaluationForm.seccion === 'Junior' || !evaluationForm.seccion}
                    className="bg-[#C5203A] dark:bg-[#C5203A] text-white px-4 py-2.5 rounded-[12px] hover:bg-[#A01A2E] dark:hover:bg-[#A01A2E] focus:outline-none focus:ring-2 focus:ring-[#C5203A] shadow-[0px_2px_6px_rgba(0,0,0,0.12)] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.18)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingEvaluation ? 'Actualizar' : 'Agregar'} Evaluación
                  </button>
                  
                  {editingEvaluation && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="mt-1 bg-gray-500 dark:bg-gray-600 text-white px-4 py-2.5 rounded-[12px] hover:bg-gray-600 dark:hover:bg-gray-700 shadow-[0px_2px_6px_rgba(0,0,0,0.12)] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.18)] transition-all duration-200"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white dark:bg-[#121C39] rounded-[14px] shadow-[0px_2px_8px_rgba(0,0,0,0.08)] dark:shadow-lg py-5 mb-4 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 text-center">Filtros del Calendario</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {/* Section Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sección
                </label>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] hover:border-[#1A2346] dark:hover:border-[#C5203A] text-sm transition-all duration-150"
                >
                  <option value="ALL">Todas las secciones</option>
                  <option value="Junior">Junior</option>
                  <option value="Middle">Middle</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>

              {/* Course Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Curso
                </label>
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] hover:border-[#1A2346] dark:hover:border-[#C5203A] text-sm transition-all duration-150"
                >
                  <option value="ALL">Todos los cursos</option>
                  {availableCourses.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A2346] dark:focus:ring-[#C5203A] hover:border-[#1A2346] dark:hover:border-[#C5203A] text-sm transition-all duration-150"
                >
                  <option value="ALL">Todo</option>
                  <option value="ACTIVITIES">Solo actividades</option>
                  <option value="EVALUATIONS">Solo evaluaciones</option>
                </select>
              </div>
            </div>
          </div>

          {/* Viewer Header - Only for Viewer */}
          {!isEditor && (
            <div className="bg-[#1A2346] dark:bg-[#1A2346] mb-6 rounded-t-lg overflow-hidden" style={{ height: '70px' }}>
              <div className="flex items-center justify-between h-full px-6">
                <div className="flex items-center space-x-4">
                  {/* Logo placeholder - replace with actual logo if available */}
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-[#1A2346]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <h2 className="text-white font-semibold text-lg">Calendario Escolar — Vista de Profesor</h2>
                </div>
                <div className="w-10 flex-shrink-0"></div>
              </div>
              <div className="h-[2px] bg-[#C5203A]"></div>
            </div>
          )}

          {/* Calendar Display - Vista de 4 Semanas */}
          <div className="bg-white dark:bg-[#121C39] rounded-[14px] shadow-[0px_2px_8px_rgba(0,0,0,0.08)] dark:shadow-lg p-5 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Calendario Escolar 2026-2027 - Vista de 4 Semanas</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentWeek(Math.max(0, currentWeek - 4))}
                  disabled={currentWeek === 0}
                  className="px-4 py-2 bg-[#1A2346] dark:bg-[#1A2346] text-white rounded-[12px] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-[0px_2px_6px_rgba(0,0,0,0.12)] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.18)] hover:bg-[#121C39] dark:hover:bg-[#121C39] transition-all duration-200"
                >
                  ← 4 Semanas Ant.
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Semanas {currentWeek} - {Math.min(currentWeek + 3, weeks.length - 1)}
                </span>
                <button
                  onClick={() => setCurrentWeek(Math.min(weeks.length - 4, currentWeek + 4))}
                  disabled={currentWeek >= weeks.length - 4}
                  className="px-4 py-2 bg-[#1A2346] dark:bg-[#1A2346] text-white rounded-[12px] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-[0px_2px_6px_rgba(0,0,0,0.12)] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.18)] hover:bg-[#121C39] dark:hover:bg-[#121C39] transition-all duration-200"
                >
                  4 Semanas Sig. →
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 text-xs [&_tbody_tr:not(:last-child)]:border-b [&_tbody_tr:not(:last-child)]:border-b-[rgba(0,0,0,0.06)]">
                <thead>
                  <tr className="bg-[#1A2346] dark:bg-[#121C39] text-white">
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center min-w-12 text-xs font-semibold">SEMANA</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center min-w-20 text-xs font-semibold">FECHA</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center bg-[#C4E6D1] dark:bg-green-900 dark:bg-opacity-30 text-[#1e5d2e] dark:text-green-200 text-xs font-semibold" colSpan="2">JUNIOR SCHOOL</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center bg-[#F5E6A3] dark:bg-yellow-900 dark:bg-opacity-30 text-[#8b6914] dark:text-yellow-200 text-xs font-semibold" colSpan="3">MIDDLE SCHOOL</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center bg-[#F5C2D1] dark:bg-pink-900 dark:bg-opacity-30 text-[#8b1a3d] dark:text-pink-200 text-xs font-semibold" colSpan="3">SENIOR SCHOOL</th>
                  </tr>
                  <tr className="bg-[#1A2346] dark:bg-[#121C39] bg-opacity-95 text-white">
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center text-xs font-medium">N°</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center text-xs font-medium">DÍA</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center bg-[#C4E6D1] dark:bg-green-800 dark:bg-opacity-40 text-[#1e5d2e] dark:text-green-200 min-w-32 text-xs font-medium">ACTIVIDAD</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center bg-[#C4E6D1] dark:bg-green-800 dark:bg-opacity-40 text-[#1e5d2e] dark:text-green-200 min-w-20 text-xs font-medium">RESPONSABLE</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center bg-[#F5E6A3] dark:bg-yellow-800 dark:bg-opacity-40 text-[#8b6914] dark:text-yellow-200 min-w-32 text-xs font-medium">ACTIVIDAD</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center bg-[#F5E6A3] dark:bg-yellow-800 dark:bg-opacity-40 text-[#8b6914] dark:text-yellow-200 min-w-20 text-xs font-medium">RESPONSABLE</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center bg-[#F5E6A3] dark:bg-yellow-900 dark:bg-opacity-30 text-[#8b6914] dark:text-yellow-200 min-w-24 text-xs font-medium">EVALUACIONES</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center bg-[#F5C2D1] dark:bg-pink-800 dark:bg-opacity-40 text-[#8b1a3d] dark:text-pink-200 min-w-32 text-xs font-medium">ACTIVIDAD</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center bg-[#F5C2D1] dark:bg-pink-800 dark:bg-opacity-40 text-[#8b1a3d] dark:text-pink-200 min-w-20 text-xs font-medium">RESPONSABLE</th>
                    <th className="border border-gray-300 dark:border-gray-600 py-1.5 px-2 text-center bg-[#F5C2D1] dark:bg-pink-900 dark:bg-opacity-30 text-[#8b1a3d] dark:text-pink-200 min-w-24 text-xs font-medium">EVALUACIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.slice(currentWeek, currentWeek + 4).map((week, weekIndex) => {
                    const actualWeekIndex = currentWeek + weekIndex;
                    // Alternancia de tonos: semanas pares (0, 2) = base, impares (1, 3) = oscurecido
                    // Para Viewer: diferencia más sutil (4%), para Editor: diferencia más marcada (8%)
                    const isDarkenedWeek = actualWeekIndex % 2 === 1;
                    
                    // Colores base con alternancia - misma lógica para ambos, pero Viewer tiene estilos adicionales en las tarjetas
                    const juniorBase = isDarkenedWeek ? 'bg-green-100 dark:bg-green-900 dark:bg-opacity-15' : 'bg-green-50 dark:bg-green-900 dark:bg-opacity-10';
                    const middleBase = isDarkenedWeek ? 'bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-15' : 'bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-10';
                    const middleEval = isDarkenedWeek ? 'bg-yellow-200 dark:bg-yellow-900 dark:bg-opacity-20' : 'bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-15';
                    const seniorBase = isDarkenedWeek ? 'bg-pink-100 dark:bg-pink-900 dark:bg-opacity-15' : 'bg-pink-50 dark:bg-pink-900 dark:bg-opacity-10';
                    const seniorEval = isDarkenedWeek ? 'bg-pink-200 dark:bg-pink-900 dark:bg-opacity-20' : 'bg-pink-100 dark:bg-pink-900 dark:bg-opacity-15';
                    
                    return week.days.map((date, dayIndex) => {
                      const dateKey = getDateKey(date);
                      const dayActivities = activities[dateKey] || {};
                      const dayEvaluations = evaluations[dateKey] || {};
                      
                      return (
                        <tr key={`${actualWeekIndex}-${dayIndex}`} className="bg-white dark:bg-[#1A1F2E] transition-colors duration-200">
                          {dayIndex === 0 && (
                            <td 
                              className="border border-gray-300 dark:border-gray-600 p-2 text-center font-bold bg-gray-100 dark:bg-[#121C39] text-gray-800 dark:text-white" 
                              rowSpan={week.days.length}
                            >
                              {week.number}
                            </td>
                          )}
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-center font-medium text-gray-800 dark:text-gray-200">
                            {formatDate(date)}
                          </td>
                          
                          {/* Junior Activities & Responsible */}
                          <td className={`border border-gray-300 dark:border-gray-600 p-2 align-top ${juniorBase}`}>
                            {sortActivitiesByTime(dayActivities.Junior || [])
                              .filter(activity => matchFiltersForActivity(activity, 'Junior'))
                              .map(activity => renderActivity(activity, dateKey, 'Junior'))}
                          </td>
                          <td className={`border border-gray-300 dark:border-gray-600 p-2 align-top ${juniorBase}`}>
                            {sortActivitiesByTime(dayActivities.Junior || [])
                              .filter(activity => matchFiltersForActivity(activity, 'Junior'))
                              .map(activity => (
                                <div key={activity.id} className="text-xs mb-1 text-gray-700 dark:text-gray-300">
                                  {activity.responsable}
                                </div>
                              ))}
                          </td>
                          
                          {/* Middle Activities & Responsible & Evaluations */}
                          <td className={`border border-gray-300 dark:border-gray-600 p-2 align-top ${middleBase}`}>
                            {sortActivitiesByTime(dayActivities.Middle || [])
                              .filter(activity => matchFiltersForActivity(activity, 'Middle'))
                              .map(activity => renderActivity(activity, dateKey, 'Middle'))}
                          </td>
                          <td className={`border border-gray-300 dark:border-gray-600 p-2 align-top ${middleBase}`}>
                            {sortActivitiesByTime(dayActivities.Middle || [])
                              .filter(activity => matchFiltersForActivity(activity, 'Middle'))
                              .map(activity => (
                                <div key={activity.id} className="text-xs mb-1 text-gray-700 dark:text-gray-300">
                                  {activity.responsable}
                                </div>
                              ))}
                          </td>
                          <td className={`border border-gray-300 dark:border-gray-600 p-2 align-top ${middleEval}`}>
                            {sortEvaluationsByYearLevel(dayEvaluations.Middle || [])
                              .filter(evaluation => matchFiltersForEvaluation(evaluation, 'Middle'))
                              .map(evaluation => renderEvaluation(evaluation, dateKey, 'Middle'))}
                          </td>
                          
                          {/* Senior Activities & Responsible & Evaluations */}
                          <td className={`border border-gray-300 dark:border-gray-600 p-2 align-top ${seniorBase}`}>
                            {sortActivitiesByTime(dayActivities.Senior || [])
                              .filter(activity => matchFiltersForActivity(activity, 'Senior'))
                              .map(activity => renderActivity(activity, dateKey, 'Senior'))}
                          </td>
                          <td className={`border border-gray-300 dark:border-gray-600 p-2 align-top ${seniorBase}`}>
                            {sortActivitiesByTime(dayActivities.Senior || [])
                              .filter(activity => matchFiltersForActivity(activity, 'Senior'))
                              .map(activity => (
                                <div key={activity.id} className="text-xs mb-1 text-gray-700 dark:text-gray-300">
                                  {activity.responsable}
                                </div>
                              ))}
                          </td>
                          <td className={`border border-gray-300 dark:border-gray-600 p-2 align-top ${seniorEval}`}>
                            {sortEvaluationsByYearLevel(dayEvaluations.Senior || [])
                              .filter(evaluation => matchFiltersForEvaluation(evaluation, 'Senior'))
                              .map(evaluation => renderEvaluation(evaluation, dateKey, 'Senior'))}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* User Management Panel Modal */}
      {showUserManagement && (
        <UserManagementPanel onClose={() => setShowUserManagement(false)} />
      )}

      {/* Print Report Panel Modal */}
      {showPrintReport && (
        <PrintReportPanel 
          onClose={() => setShowPrintReport(false)}
          activities={activities}
          evaluations={evaluations}
        />
      )}

      {/* Footer - Solo para Editor y Viewer */}
      <footer>
        <Footer mode={isEditor ? "editor" : "viewer"} />
      </footer>
    </div>
  );
};

export default RegistroEscolarApp;
