import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import RegistroEscolarApp from "./RegistroEscolarApp";
import LoginPage from "./LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./pages/AdminPage";
import ActivityLogPage from "./pages/ActivityLogPage";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["editor"]}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/actividad-log"
              element={
                <ProtectedRoute allowedRoles={["editor"]}>
                  <ActivityLogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RegistroEscolarApp />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
