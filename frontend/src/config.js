const normalizeUrl = (url) => {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

const resolveDefaultBackendUrl = () => {
  // Netlify compatible: use REACT_APP_API_BASE_URL
  // Fallback to REACT_APP_BACKEND_URL for backward compatibility
  const envUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL;
  
  if (envUrl && envUrl.trim()) {
    const url = normalizeUrl(envUrl.trim());
    console.log("[Config] API URL loaded:", url);
    return url;
  }

  console.error("[Config] REACT_APP_API_BASE_URL not set in environment variables");
  console.log("[Config] Available env vars:", Object.keys(process.env).filter(k => k.startsWith('REACT_APP_')));
  return "";
};

export const BACKEND_URL = resolveDefaultBackendUrl();

// Debug: Log API URL on module load
console.log("API URL:", process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL || "NOT SET");

