import React from "react";
import "@/App.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import RegistroEscolarApp from "./RegistroEscolarApp";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <RegistroEscolarApp />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
