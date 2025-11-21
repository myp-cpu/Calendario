import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && user) {
      // Siempre redirigir a la vista principal del calendario, independientemente del rol
      const destination = location.state?.from?.pathname || "/";
      navigate(destination, { replace: true });
    }
  }, [authLoading, isAuthenticated, user, location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double submit using both state and ref
    if (loading || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setError('');
    setLoading(true);

    // Validate email format
    if (!email.endsWith('@redland.cl')) {
      setError('Solo se permiten direcciones de correo @redland.cl');
      setLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    try {
      const result = await login({ email });
      if (!result.success) {
        setError(result.error || 'Error al iniciar sesión. Verifica que tu correo esté autorizado.');
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }
      // Siempre redirigir a la vista principal del calendario, independientemente del rol
      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Login error in handleSubmit:", err);
      setError('Error al iniciar sesión. Por favor intenta nuevamente.');
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 1. Fondo superior azul - 50% del viewport */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-[#0A1438] z-0"></div>

      {/* 3. Fondo inferior: foto del colegio - 50% del viewport */}
      <div 
        className="absolute top-[50vh] left-0 w-full h-[50vh] bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL || ''}/img/colegio/colegio_login.png)` }}
      ></div>

      {/* 2. Onda única - Cubre todo el ancho de la pantalla en la división azul/foto */}
      <img
        src={`${process.env.PUBLIC_URL || ''}/img/formas/onda_2.png`}
        alt="Onda decorativa"
        className="absolute pointer-events-none"
        style={{ 
          top: "50vh",
          left: "50%",
          width: "110vw",
          height: "auto",
          transform: "translate(-50%, -50%)",
          objectFit: "cover",
          zIndex: 1
        }}
        onError={(e) => {
          console.error('Error cargando onda:', e.target.src);
          e.target.style.display = 'none';
        }}
      />

      {/* 4. Contenedor del logo y card - Centrado vertical/horizontal */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8 mt-[-20px]">
        {/* 4. Card blanco centrado */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/20 w-full max-w-[430px] p-10 pt-20 relative animate-fadeInSlow">
          {/* 5. Logo del colegio en círculo azul - Dentro del card */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-[#0A1438] flex items-center justify-center shadow-md mb-4">
              <img 
                src={`${process.env.PUBLIC_URL || ''}/img/logo/imalogotipo-blanco_sinfondo_2.png`}
                alt="Logo Colegio" 
                className="w-[85%] h-[85%] object-contain"
                onError={(e) => {
                  console.error('Error cargando logo:', e.target.src);
                }}
              />
            </div>
          </div>
          <div className="text-center mb-8">
            {/* 6. Textos */}
            <h1 className="text-2xl font-bold text-[#0A1438] mb-2">
              Registro Escolar Web
            </h1>
            <p className="text-gray-600 text-center">
              Inicia sesión con tu correo @redland.cl
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.nombre@redland.cl"
                className="w-full px-4 h-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A1438] focus:border-transparent transition-all"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0A1438] text-white h-12 px-4 rounded-lg hover:bg-[#0d1b52] focus:outline-none focus:ring-2 focus:ring-[#0A1438] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verificando...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>¿No tienes acceso?</p>
            <p className="mt-1">Contacta al administrador para que agregue tu correo.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
