import React from "react";
import RegistroEscolarApp from "@/RegistroEscolarApp";

const AdminPage = () => {
  // Renderiza la misma vista principal, sin abrir automáticamente el panel de usuarios
  // El panel solo se abre cuando el usuario hace clic en el botón manualmente
  return <RegistroEscolarApp />;
};

export default AdminPage;

