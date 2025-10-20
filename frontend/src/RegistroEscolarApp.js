import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import UserManagementPanel from './UserManagementPanel';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Week start date
const schoolYearStart = new Date('2026-02-23'); // Week 0 Monday
const schoolYearEnd = new Date('2027-01-05');

const RegistroEscolarApp = () => {
  const { user, loading: authLoading, logout, isEditor, isAuthenticated } = useAuth();
  
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
  const [evaluationForm, setEvaluationForm] = useState({
    seccion: '',
    asignatura: '',
    tema: '',
    curso: '',
    fecha: ''
  });
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingEvaluation, setEditingEvaluation] = useState(null);
  const [showUserManagement, setShowUserManagement] = useState(false);

  // Show login page if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Generate weeks - Monday through Saturday, with Sunday added in black if present  
  const generateWeeks = () => {
    const weeks = [];
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
        weeks.push({ number: weekNumber, days: weekDays });
        weekNumber++;
      }
    }

    return weeks;
  };

  const weeks = generateWeeks();

  const getDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

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

  // Activity submission
  const handleActivitySubmit = (e) => {
    e.preventDefault();
    
    const startDate = new Date(activityForm.fecha);
    const endDate = activityForm.fechaFin ? new Date(activityForm.fechaFin) : startDate;
    
    const newActivity = {
      id: Date.now() + Math.random(),
      ...activityForm,
      timestamp: new Date()
    };

    if (activityForm.hora === 'TODO EL DIA' && activityForm.fechaFin) {
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = getDateKey(currentDate);
        setActivities(prev => ({
          ...prev,
          [dateKey]: {
            ...prev[dateKey],
            [activityForm.seccion]: [
              ...(prev[dateKey]?.[activityForm.seccion] || []),
              { ...newActivity, fecha: dateKey }
            ]
          }
        }));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      const dateKey = activityForm.fecha;
      setActivities(prev => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [activityForm.seccion]: [
            ...(prev[dateKey]?.[activityForm.seccion] || []),
            newActivity
          ]
        }
      }));
    }

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

    alert('Actividad agregada exitosamente');
  };

  // Evaluation submission
  const handleEvaluationSubmit = (e) => {
    e.preventDefault();
    
    const dateKey = evaluationForm.fecha;
    const newEvaluation = {
      id: Date.now() + Math.random(),
      ...evaluationForm,
      timestamp: new Date()
    };

    setEvaluations(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [evaluationForm.seccion]: [
          ...(prev[dateKey]?.[evaluationForm.seccion] || []),
          newEvaluation
        ]
      }
    }));

    setEvaluationForm({
      seccion: '',
      asignatura: '',
      tema: '',
      curso: '',
      fecha: ''
    });

    alert('Evaluación agregada exitosamente');
  };

  // Edit activity function
  const handleEditActivity = (activity, dateKey, section) => {
    setActivityForm({
      ...activity,
      fecha: dateKey
    });
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
  const handleUpdateActivity = (e) => {
    e.preventDefault();
    
    if (!editingActivity) return;
    
    const { id, dateKey: oldDateKey, section } = editingActivity;
    
    setActivities(prev => ({
      ...prev,
      [oldDateKey]: {
        ...prev[oldDateKey],
        [section]: (prev[oldDateKey]?.[section] || []).filter(act => act.id !== id)
      }
    }));
    
    const dateKey = activityForm.fecha;
    const updatedActivity = {
      ...activityForm,
      id: id,
      timestamp: new Date()
    };
    
    setActivities(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [activityForm.seccion]: [
          ...(prev[dateKey]?.[activityForm.seccion] || []).filter(act => act.id !== id),
          updatedActivity
        ]
      }
    }));
    
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
    setEditingActivity(null);
    
    alert('Actividad actualizada exitosamente');
  };

  // Delete activity function
  const handleDeleteActivity = (activityId, dateKey, section) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta actividad?')) {
      setActivities(prev => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [section]: (prev[dateKey]?.[section] || []).filter(act => act.id !== activityId)
        }
      }));
      alert('Actividad eliminada exitosamente');
    }
  };

  // Edit evaluation function
  const handleEditEvaluation = (evaluation, dateKey, section) => {
    setEvaluationForm({
      ...evaluation,
      fecha: dateKey
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
  const handleUpdateEvaluation = (e) => {
    e.preventDefault();
    
    if (!editingEvaluation) return;
    
    const { id, dateKey: oldDateKey, section } = editingEvaluation;
    
    setEvaluations(prev => ({
      ...prev,
      [oldDateKey]: {
        ...prev[oldDateKey],
        [section]: (prev[oldDateKey]?.[section] || []).filter(evaluation => evaluation.id !== id)
      }
    }));
    
    const dateKey = evaluationForm.fecha;
    const updatedEvaluation = {
      ...evaluationForm,
      id: id,
      timestamp: new Date()
    };
    
    setEvaluations(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [evaluationForm.seccion]: [
          ...(prev[dateKey]?.[evaluationForm.seccion] || []).filter(evaluation => evaluation.id !== id),
          updatedEvaluation
        ]
      }
    }));
    
    setEvaluationForm({
      seccion: '',
      asignatura: '',
      tema: '',
      curso: '',
      fecha: ''
    });
    setEditingEvaluation(null);
    
    alert('Evaluación actualizada exitosamente');
  };

  // Delete evaluation function
  const handleDeleteEvaluation = (evaluationId, dateKey, section) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta evaluación?')) {
      setEvaluations(prev => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [section]: (prev[dateKey]?.[section] || []).filter(evaluation => evaluation.id !== evaluationId)
        }
      }));
      alert('Evaluación eliminada exitosamente');
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
    setEvaluationForm({
      seccion: '',
      asignatura: '',
      tema: '',
      curso: '',
      fecha: ''
    });
    setEditingActivity(null);
    setEditingEvaluation(null);
  };

  const renderActivity = (activity, dateKey, section) => {
    const text = activity.hora === 'TODO EL DIA' 
      ? `[TODO EL DÍA] ${activity.actividad}`
      : `[${activity.hora}] ${activity.actividad}`;
    
    const fullText = activity.lugar ? `${text} (${activity.lugar})` : text;
    
    return (
      <div 
        key={activity.id} 
        className={`text-xs mb-1 group hover:bg-gray-100 p-1 rounded ${activity.importante ? 'font-bold text-red-600' : ''}`}
      >
        <div className="flex justify-between items-start">
          <span className="flex-1">{fullText}</span>
          {isEditor && (
            <div className="opacity-0 group-hover:opacity-100 ml-2 flex space-x-1 flex-shrink-0">
              <button
                onClick={() => handleEditActivity(activity, dateKey, section)}
                className="text-blue-500 hover:text-blue-700 text-xs"
                title="Editar actividad"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDeleteActivity(activity.id, dateKey, section)}
                className="text-red-500 hover:text-red-700 text-xs"
                title="Eliminar actividad"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEvaluation = (evaluation, dateKey, section) => (
    <div key={evaluation.id} className="text-xs mb-1 group hover:bg-gray-100 p-1 rounded">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <strong>{evaluation.curso}:</strong> {evaluation.asignatura}
          {evaluation.tema && <span> - {evaluation.tema}</span>}
        </div>
        {isEditor && (
          <div className="opacity-0 group-hover:opacity-100 ml-2 flex space-x-1 flex-shrink-0">
            <button
              onClick={() => handleEditEvaluation(evaluation, dateKey, section)}
              className="text-blue-500 hover:text-blue-700 text-xs"
              title="Editar evaluación"
            >
              ✏️
            </button>
            <button
              onClick={() => handleDeleteEvaluation(evaluation.id, dateKey, section)}
              className="text-red-500 hover:text-red-700 text-xs"
              title="Eliminar evaluación"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with user info and actions */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onBackToSelector}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver a Sistemas
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-lg font-semibold text-gray-800">Registro Escolar Interactivo</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{user.email}</span>
              <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                user.role === 'editor' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {user.role === 'editor' ? 'Editor' : 'Viewer'}
              </span>
            </div>
            
            {isEditor && (
              <button
                onClick={() => setShowUserManagement(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors"
              >
                👥 Gestionar Usuarios
              </button>
            )}
            
            <button
              onClick={logout}
              className="text-gray-600 hover:text-gray-800 transition-colors"
              title="Cerrar sesión"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Info */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Registro de Actividades y Evaluaciones Escolares 2026
            </h2>
            <p className="text-gray-600">
              Sistema completo para registrar y publicar actividades escolares por secciones
            </p>
            {!isEditor && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Modo solo lectura:</strong> Estás viendo el registro como <strong>Viewer</strong>. No puedes agregar, editar o eliminar elementos.
                </p>
              </div>
            )}
          </div>

          {/* Activity Form - Only for editors */}
          {isEditor && (
            <div className="bg-white rounded-lg shadow-md p-4 mb-4 activity-form">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Registro de Actividades</h2>
              <form onSubmit={editingActivity ? handleUpdateActivity : handleActivitySubmit} className="text-sm">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Row 1: Main fields */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sección</label>
                    <select
                      value={activityForm.seccion}
                      onChange={(e) => setActivityForm({...activityForm, seccion: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccionar</option>
                      <option value="Junior">Junior</option>
                      <option value="Middle">Middle</option>
                      <option value="Senior">Senior</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Actividad</label>
                    <input
                      type="text"
                      value={activityForm.actividad}
                      onChange={(e) => setActivityForm({...activityForm, actividad: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Descripción de la actividad"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha {activityForm.hora === 'TODO EL DIA' ? 'Inicio' : ''}
                    </label>
                    <input
                      type="date"
                      value={activityForm.fecha}
                      onChange={(e) => setActivityForm({...activityForm, fecha: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="2026-02-23"
                      max="2027-01-05"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                    <select
                      value={activityForm.hora}
                      onChange={(e) => setActivityForm({...activityForm, hora: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
                    <input
                      type="text"
                      value={activityForm.lugar}
                      onChange={(e) => setActivityForm({...activityForm, lugar: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ubicación"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                    <input
                      type="text"
                      value={activityForm.responsable}
                      onChange={(e) => setActivityForm({...activityForm, responsable: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre del responsable"
                    />
                  </div>
                  
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                    >
                      {editingActivity ? 'Actualizar' : 'Agregar'} Actividad
                    </button>
                    
                    {editingActivity && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Término</label>
                      <input
                        type="date"
                        value={activityForm.fechaFin}
                        onChange={(e) => setActivityForm({...activityForm, fechaFin: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={activityForm.fecha || "2026-02-23"}
                        max="2027-01-05"
                        required={activityForm.hora === 'TODO EL DIA'}
                      />
                    </div>
                  )}
                  
                  <div className="md:col-span-3">
                    <label className="flex items-center text-sm mt-2">
                      <input
                        type="checkbox"
                        checked={activityForm.importante}
                        onChange={(e) => setActivityForm({...activityForm, importante: e.target.checked})}
                        className="mr-2"
                      />
                      <span className="font-medium">Importante (Bold + Rojo)</span>
                    </label>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Evaluation Form - Only for editors */}
          {isEditor && (
            <div className="bg-white rounded-lg shadow-md p-4 mb-4 evaluation-form">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Registro de Evaluaciones</h2>
              <form onSubmit={editingEvaluation ? handleUpdateEvaluation : handleEvaluationSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sección</label>
                  <select
                    value={evaluationForm.seccion}
                    onChange={(e) => setEvaluationForm({...evaluationForm, seccion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Seleccionar</option>
                    <option value="Junior">Junior</option>
                    <option value="Middle">Middle</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asignatura</label>
                  <input
                    type="text"
                    value={evaluationForm.asignatura}
                    onChange={(e) => setEvaluationForm({...evaluationForm, asignatura: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Matemáticas, Ciencias, etc."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tema/Criterio</label>
                  <input
                    type="text"
                    value={evaluationForm.tema}
                    onChange={(e) => setEvaluationForm({...evaluationForm, tema: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Tema de la evaluación"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
                  <select
                    value={evaluationForm.curso}
                    onChange={(e) => setEvaluationForm({...evaluationForm, curso: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {evaluationForm.seccion === 'Middle' && (
                      <>
                        <option value="5° A">5° A</option>
                        <option value="5° B">5° B</option>
                        <option value="6° A">6° A</option>
                        <option value="6° B">6° B</option>
                        <option value="7° A">7° A</option>
                        <option value="7° B">7° B</option>
                        <option value="8° A">8° A</option>
                        <option value="8° B">8° B</option>
                        <option value="5° AB">5° AB</option>
                        <option value="6° AB">6° AB</option>
                        <option value="7° AB">7° AB</option>
                        <option value="8° AB">8° AB</option>
                      </>
                    )}
                    {evaluationForm.seccion === 'Senior' && (
                      <>
                        <option value="I EM A">I EM A</option>
                        <option value="I EM B">I EM B</option>
                        <option value="II EM A">II EM A</option>
                        <option value="II EM B">II EM B</option>
                        <option value="III EM A">III EM A</option>
                        <option value="III EM B">III EM B</option>
                        <option value="IV EM A">IV EM A</option>
                        <option value="IV EM B">IV EM B</option>
                        <option value="I EM AB">I EM AB</option>
                        <option value="II EM AB">II EM AB</option>
                        <option value="III EM AB">III EM AB</option>
                        <option value="IV EM AB">IV EM AB</option>
                      </>
                    )}
                    {evaluationForm.seccion === 'Junior' && (
                      <>
                        <option value="Junior A">Junior A</option>
                        <option value="Junior B">Junior B</option>
                        <option value="Junior AB">Junior AB</option>
                      </>
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={evaluationForm.fecha}
                    onChange={(e) => setEvaluationForm({...evaluationForm, fecha: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="2026-02-23"
                    max="2027-01-05"
                    required
                  />
                </div>
                
                <div className="flex flex-col justify-end">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {editingEvaluation ? 'Actualizar' : 'Agregar'} Evaluación
                  </button>
                  
                  {editingEvaluation && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="mt-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Calendar Display - Vista de 4 Semanas */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Calendario Escolar 2026-2027 - Vista de 4 Semanas</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentWeek(Math.max(0, currentWeek - 4))}
                  disabled={currentWeek === 0}
                  className="px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50 text-sm"
                >
                  ← 4 Semanas Ant.
                </button>
                <span className="text-sm font-medium">
                  Semanas {currentWeek} - {Math.min(currentWeek + 3, weeks.length - 1)}
                </span>
                <button
                  onClick={() => setCurrentWeek(Math.min(weeks.length - 4, currentWeek + 4))}
                  disabled={currentWeek >= weeks.length - 4}
                  className="px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50 text-sm"
                >
                  4 Semanas Sig. →
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="border border-gray-300 p-1 text-center min-w-12">SEMANA</th>
                    <th className="border border-gray-300 p-1 text-center min-w-20">FECHA</th>
                    <th className="border border-gray-300 p-1 text-center bg-green-200 text-green-800" colSpan="2">JUNIOR SCHOOL</th>
                    <th className="border border-gray-300 p-1 text-center bg-yellow-200 text-yellow-800" colSpan="3">MIDDLE SCHOOL</th>
                    <th className="border border-gray-300 p-1 text-center bg-pink-200 text-pink-800" colSpan="3">SENIOR SCHOOL</th>
                  </tr>
                  <tr className="bg-blue-500 text-white">
                    <th className="border border-gray-300 p-1 text-center">N°</th>
                    <th className="border border-gray-300 p-1 text-center">DÍA</th>
                    <th className="border border-gray-300 p-1 text-center bg-green-300 min-w-32">ACTIVIDAD</th>
                    <th className="border border-gray-300 p-1 text-center bg-green-300 min-w-20">RESPONSABLE</th>
                    <th className="border border-gray-300 p-1 text-center bg-yellow-300 min-w-32">ACTIVIDAD</th>
                    <th className="border border-gray-300 p-1 text-center bg-yellow-300 min-w-20">RESPONSABLE</th>
                    <th className="border border-gray-300 p-1 text-center bg-yellow-200 min-w-24">EVALUACIONES</th>
                    <th className="border border-gray-300 p-1 text-center bg-pink-300 min-w-32">ACTIVIDAD</th>
                    <th className="border border-gray-300 p-1 text-center bg-pink-300 min-w-20">RESPONSABLE</th>
                    <th className="border border-gray-300 p-1 text-center bg-pink-200 min-w-24">EVALUACIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.slice(currentWeek, currentWeek + 4).map((week, weekIndex) => 
                    week.days.map((date, dayIndex) => {
                      const dateKey = getDateKey(date);
                      const dayActivities = activities[dateKey] || {};
                      const dayEvaluations = evaluations[dateKey] || {};
                      const dayOfWeek = date.getDay();
                      const isSaturday = dayOfWeek === 6;
                      const isSunday = dayOfWeek === 0;
                      const actualWeekIndex = currentWeek + weekIndex;
                      
                      // Saturday = purple background, Sunday = black background
                      const rowClass = isSaturday ? 'bg-purple-300' : (isSunday ? 'bg-gray-900 text-white' : '');
                      
                      return (
                        <tr key={`${actualWeekIndex}-${dayIndex}`} className={rowClass}>
                          {dayIndex === 0 && (
                            <td 
                              className="border border-gray-300 p-1 text-center font-bold bg-gray-100" 
                              rowSpan={week.days.length}
                            >
                              {week.number}
                            </td>
                          )}
                          <td className={`border border-gray-300 p-1 text-center ${isSunday ? 'text-white bg-gray-900' : ''}`}>
                            {formatDate(date)}
                          </td>
                          
                          {/* Junior Activities & Responsible */}
                          <td className={`border border-gray-300 p-1 align-top ${isSaturday ? 'bg-purple-300' : (isSunday ? 'bg-gray-800' : 'bg-green-50')}`}>
                            {sortActivitiesByTime(dayActivities.Junior || []).map(activity => renderActivity(activity, dateKey, 'Junior'))}
                          </td>
                          <td className={`border border-gray-300 p-1 align-top ${isSaturday ? 'bg-purple-300' : (isSunday ? 'bg-gray-800' : 'bg-green-50')}`}>
                            {sortActivitiesByTime(dayActivities.Junior || []).map(activity => (
                              <div key={activity.id} className="text-xs mb-1">
                                {activity.responsable}
                              </div>
                            ))}
                          </td>
                          
                          {/* Middle Activities & Responsible & Evaluations */}
                          <td className={`border border-gray-300 p-1 align-top ${isSaturday ? 'bg-purple-300' : (isSunday ? 'bg-gray-800' : 'bg-yellow-50')}`}>
                            {sortActivitiesByTime(dayActivities.Middle || []).map(activity => renderActivity(activity, dateKey, 'Middle'))}
                          </td>
                          <td className={`border border-gray-300 p-1 align-top ${isSaturday ? 'bg-purple-300' : (isSunday ? 'bg-gray-800' : 'bg-yellow-50')}`}>
                            {sortActivitiesByTime(dayActivities.Middle || []).map(activity => (
                              <div key={activity.id} className="text-xs mb-1">
                                {activity.responsable}
                              </div>
                            ))}
                          </td>
                          <td className={`border border-gray-300 p-1 align-top ${isSaturday ? 'bg-purple-300' : (isSunday ? 'bg-gray-800' : 'bg-yellow-100')}`}>
                            {(dayEvaluations.Middle || []).map(evaluation => renderEvaluation(evaluation, dateKey, 'Middle'))}
                          </td>
                          
                          {/* Senior Activities & Responsible & Evaluations */}
                          <td className={`border border-gray-300 p-1 align-top ${isSaturday ? 'bg-purple-300' : (isSunday ? 'bg-gray-800' : 'bg-pink-50')}`}>
                            {sortActivitiesByTime(dayActivities.Senior || []).map(activity => renderActivity(activity, dateKey, 'Senior'))}
                          </td>
                          <td className={`border border-gray-300 p-1 align-top ${isSaturday ? 'bg-purple-300' : (isSunday ? 'bg-gray-800' : 'bg-pink-50')}`}>
                            {sortActivitiesByTime(dayActivities.Senior || []).map(activity => (
                              <div key={activity.id} className="text-xs mb-1">
                                {activity.responsable}
                              </div>
                            ))}
                          </td>
                          <td className={`border border-gray-300 p-1 align-top ${isSaturday ? 'bg-purple-300' : (isSunday ? 'bg-gray-800' : 'bg-pink-100')}`}>
                            {(dayEvaluations.Senior || []).map(evaluation => renderEvaluation(evaluation, dateKey, 'Senior'))}
                          </td>
                        </tr>
                      );
                    })
                  )}
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
    </div>
  );
};

export default RegistroEscolarApp;
