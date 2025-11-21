import { BACKEND_URL } from "@/config";

/**
 * Parse JSON from response body ONCE.
 * Prevents "Response body is already used" errors.
 */
export const parseJsonOnce = async (response) => {
  if (response.bodyUsed) {
    console.warn("Response body already consumed");
    return {};
  }

  try {
    return await response.json();
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    return {};
  }
};

/**
 * Handle fetch response: parse JSON once and throw on error.
 */
export const handleResponse = async (response) => {
  const data = await parseJsonOnce(response);
  if (!response.ok) {
    // Manejar diferentes formatos de error
    let errorMessage = "Solicitud inválida";
    
    if (data?.detail) {
      // FastAPI devuelve errores en data.detail
      if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        // Errores de validación de Pydantic vienen como array
        errorMessage = data.detail.map(err => {
          if (typeof err === 'object' && err.msg) {
            return `${err.loc?.join('.') || 'Campo'}: ${err.msg}`;
          }
          return String(err);
        }).join(', ');
      } else if (typeof data.detail === 'object') {
        errorMessage = JSON.stringify(data.detail);
      }
    } else if (data?.error) {
      errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    } else if (data?.message) {
      errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
    }
    
    throw new Error(errorMessage);
  }
  return data;
};

export const login = async ({ email }) => {
  if (!BACKEND_URL) {
    throw new Error("La URL del backend no está configurada");
  }

  const loginUrl = `${BACKEND_URL}/api/auth/login`;
  console.log("[AuthService] Attempting login to:", loginUrl);

  try {
    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    console.log("[AuthService] Login response status:", response.status);
    const result = await handleResponse(response);
    return result;
  } catch (error) {
    console.error("[AuthService] Login error:", error);
    // Handle network errors (Failed to fetch, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`No se pudo conectar con el servidor. Verifica que el backend esté corriendo en ${BACKEND_URL}`);
    }
    // Re-throw other errors
    throw error;
  }
};

export const fetchCurrentUser = async (token) => {
  if (!token) {
    throw new Error("Token no proporcionado");
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await handleResponse(response);
    return data.user ?? data;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error("No se pudo conectar con el servidor");
    }
    throw error;
  }
};

