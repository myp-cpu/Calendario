const normalizeUrl = (url) => {
  if (!url) return "";
  // Remove trailing slash only, but keep /api if present
  // The backend is at https://calendario-wdyj.onrender.com/api
  // So REACT_APP_API_BASE_URL should include /api: https://calendario-wdyj.onrender.com/api
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

const resolveDefaultBackendUrl = () => {
  // Netlify compatible: use REACT_APP_API_BASE_URL
  // Fallback to REACT_APP_BACKEND_URL for backward compatibility
  const envUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL;
  
  if (envUrl && envUrl.trim()) {
    const url = normalizeUrl(envUrl.trim());
    // BACKEND_URL should include /api if the backend is at /api
    // Example: https://calendario-wdyj.onrender.com/api
    console.log("[Config] API URL loaded from env:", url);
    console.log("[Config] BACKEND_URL will be:", url);
    
    // Validate URL format
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      console.warn("[Config] URL doesn't start with http:// or https://, prepending https://");
      return `https://${url}`;
    }
    
    return url;
  }

  console.error("[Config] REACT_APP_API_BASE_URL not set in environment variables");
  console.log("[Config] Available env vars:", Object.keys(process.env).filter(k => k.startsWith('REACT_APP_')));
  return "";
};

export const BACKEND_URL = resolveDefaultBackendUrl();

// Debug: Log API URL on module load
if (BACKEND_URL) {
  console.log("[Config] ✅ BACKEND_URL configured:", BACKEND_URL);
  console.log("[Config] ✅ Expected login URL:", `${BACKEND_URL}/auth/login`);
} else {
  console.error("[Config] ❌ BACKEND_URL is NOT configured");
  console.error("[Config] Please set REACT_APP_API_BASE_URL in Netlify environment variables");
}

