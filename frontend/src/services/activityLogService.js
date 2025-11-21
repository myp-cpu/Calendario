import { BACKEND_URL } from '../config';
import { handleResponse } from './authService';

/**
 * Get activity logs with optional filters
 * @param {string} token - JWT token
 * @param {Object} filters - Optional filters: { user, action, entity, dateFrom, dateTo, seccion }
 * @returns {Promise<Object>} Response with logs array
 */
export const getActivityLogs = async (token, filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.user) params.append('user', filters.user);
    if (filters.action) params.append('action', filters.action);
    if (filters.entity) params.append('entity', filters.entity);
    if (filters.dateFrom) params.append('date_from', filters.dateFrom);
    if (filters.dateTo) params.append('date_to', filters.dateTo);
    if (filters.seccion) params.append('seccion', filters.seccion);
    
    const queryString = params.toString();
    const url = `${BACKEND_URL}/api/activity-logs${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await handleResponse(response);
    
    if (!response.ok) {
      throw new Error(data.detail || 'Error al obtener logs de actividad');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    throw error;
  }
};

