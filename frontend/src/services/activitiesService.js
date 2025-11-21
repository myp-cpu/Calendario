import { BACKEND_URL } from "@/config";
import { handleResponse } from "@/services/authService";

/**
 * Get all activities from the backend
 * @param {string} token - JWT token
 * @param {string} dateFrom - Optional start date (YYYY-MM-DD)
 * @param {string} dateTo - Optional end date (YYYY-MM-DD)
 * @param {string} seccion - Optional seccion filter (Junior/Middle/Senior)
 * @returns {Promise<Object>} Activities grouped by date and seccion
 */
export const fetchActivities = async (token, dateFrom = null, dateTo = null, seccion = null) => {
  if (!token) {
    throw new Error("Token no proporcionado");
  }

  if (!BACKEND_URL) {
    throw new Error("La URL del backend no está configurada");
  }

  let url = `${BACKEND_URL}/api/activities?`;
  const params = new URLSearchParams();
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);
  if (seccion) params.append("seccion", seccion);
  url += params.toString();

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await handleResponse(response);
  return data.activities || {};
};

/**
 * Create a new activity
 * @param {string} token - JWT token
 * @param {Object} activity - Activity data
 * @returns {Promise<Object>} Created activity or result with created count
 */
export const createActivity = async (token, activity) => {
  if (!token) {
    throw new Error("Token no proporcionado");
  }

  if (!BACKEND_URL) {
    throw new Error("La URL del backend no está configurada");
  }

  const response = await fetch(`${BACKEND_URL}/api/activities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(activity),
  });

  const data = await handleResponse(response);
  // If seccion is "ALL", backend returns { success: true, created: 3 }
  // Otherwise, it returns { success: true, activity: {...} }
  return data.activity || data;
};

/**
 * Update an existing activity
 * @param {string} token - JWT token
 * @param {string} activityId - Activity ID
 * @param {Object} activity - Updated activity data
 * @returns {Promise<Object>} Updated activity
 */
export const updateActivity = async (token, activityId, activity) => {
  if (!token) {
    throw new Error("Token no proporcionado");
  }

  if (!BACKEND_URL) {
    throw new Error("La URL del backend no está configurada");
  }

  const response = await fetch(`${BACKEND_URL}/api/activities/${activityId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(activity),
  });

  const data = await handleResponse(response);
  return data.activity;
};

/**
 * Delete an activity
 * @param {string} token - JWT token
 * @param {string} activityId - Activity ID
 * @returns {Promise<void>}
 */
export const deleteActivity = async (token, activityId) => {
  if (!token) {
    throw new Error("Token no proporcionado");
  }

  if (!BACKEND_URL) {
    throw new Error("La URL del backend no está configurada");
  }

  const response = await fetch(`${BACKEND_URL}/api/activities/${activityId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  await handleResponse(response);
};

/**
 * Get all evaluations from the backend
 * @param {string} token - JWT token
 * @param {string} dateFrom - Optional start date (YYYY-MM-DD)
 * @param {string} dateTo - Optional end date (YYYY-MM-DD)
 * @param {string} seccion - Optional seccion filter (Junior/Middle/Senior)
 * @returns {Promise<Object>} Evaluations grouped by date and seccion
 */
export const fetchEvaluations = async (token, dateFrom = null, dateTo = null, seccion = null) => {
  if (!token) {
    throw new Error("Token no proporcionado");
  }

  if (!BACKEND_URL) {
    throw new Error("La URL del backend no está configurada");
  }

  let url = `${BACKEND_URL}/api/evaluations?`;
  const params = new URLSearchParams();
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);
  if (seccion) params.append("seccion", seccion);
  url += params.toString();

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await handleResponse(response);
  return data.evaluations || {};
};

/**
 * Create a new evaluation
 * @param {string} token - JWT token
 * @param {Object} evaluation - Evaluation data
 * @returns {Promise<Object>} Created evaluation
 */
export const createEvaluation = async (token, evaluation) => {
  if (!token) {
    throw new Error("Token no proporcionado");
  }

  if (!BACKEND_URL) {
    throw new Error("La URL del backend no está configurada");
  }

  const response = await fetch(`${BACKEND_URL}/api/evaluations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(evaluation),
  });

  const data = await handleResponse(response);
  return data.evaluation;
};

/**
 * Update an existing evaluation
 * @param {string} token - JWT token
 * @param {string} evaluationId - Evaluation ID
 * @param {Object} evaluation - Updated evaluation data
 * @returns {Promise<Object>} Updated evaluation
 */
export const updateEvaluation = async (token, evaluationId, evaluation) => {
  if (!token) {
    throw new Error("Token no proporcionado");
  }

  if (!BACKEND_URL) {
    throw new Error("La URL del backend no está configurada");
  }

  const response = await fetch(`${BACKEND_URL}/api/evaluations/${evaluationId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(evaluation),
  });

  const data = await handleResponse(response);
  return data.evaluation;
};

/**
 * Delete an evaluation
 * @param {string} token - JWT token
 * @param {string} evaluationId - Evaluation ID
 * @returns {Promise<void>}
 */
export const deleteEvaluation = async (token, evaluationId) => {
  if (!token) {
    throw new Error("Token no proporcionado");
  }

  if (!BACKEND_URL) {
    throw new Error("La URL del backend no está configurada");
  }

  const response = await fetch(`${BACKEND_URL}/api/evaluations/${evaluationId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  await handleResponse(response);
};

