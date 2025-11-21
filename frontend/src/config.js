const normalizeUrl = (url) => {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

const resolveDefaultBackendUrl = () => {
  const envUrl = process.env.REACT_APP_BACKEND_URL;
  if (envUrl && envUrl.trim()) {
    const url = normalizeUrl(envUrl.trim());
    console.log("[Config] Using BACKEND_URL from .env:", url);
    return url;
  }

  console.error("[Config] REACT_APP_BACKEND_URL not set in .env file");
  return "";
};

export const BACKEND_URL = resolveDefaultBackendUrl();

