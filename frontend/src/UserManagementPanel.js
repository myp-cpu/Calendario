import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { BACKEND_URL } from './config';
import { parseJsonOnce } from '@/services/authService';

const UserManagementPanel = ({ onClose }) => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [deleteCsvFile, setDeleteCsvFile] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [tempRole, setTempRole] = useState(null);

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      // BACKEND_URL should already include /api from REACT_APP_API_BASE_URL
      const response = await fetch(`${BACKEND_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await parseJsonOnce(response);
      if (response.ok) {
        setUsers(data.users || []);
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error al cargar usuarios' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCSVUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      setMessage({ type: 'error', text: 'Por favor selecciona un archivo CSV' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      // BACKEND_URL should already include /api from REACT_APP_API_BASE_URL
      const response = await fetch(`${BACKEND_URL}/users/upload-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await parseJsonOnce(response);

      if (response.ok) {
        // Formatear mensajes individuales y contar solo usuarios añadidos
        const formattedDetails = [];
        let addedCount = 0;
        
        if (data.users_added && Array.isArray(data.users_added)) {
          data.users_added.forEach(detail => {
            // Si ya está en español, procesarlo
            if (detail.includes('Se ha añadido:')) {
              formattedDetails.push(detail);
              addedCount++;
            }
            // Convertir formato inglés "Added:" a español
            else if (detail.startsWith('Added: ')) {
              const match = detail.match(/Added: (.+?) → (.+)/);
              if (match) {
                const email = match[1];
                const role = match[2].trim().toLowerCase();
                const roleFormatted = role === 'editor' ? 'Editor' : role === 'viewer' ? 'Viewer' : role.charAt(0).toUpperCase() + role.slice(1);
                formattedDetails.push(`Se ha añadido: ${email} → Se le ha asignado el cargo de ${roleFormatted}.`);
                addedCount++;
              }
            }
            // Ignorar "Updated:" - no se muestran en la lista de añadidos
          });
        }
        
        setMessage({
          type: 'success',
          text: `Se han añadido ${addedCount} usuario(s) exitosamente.`,
          details: formattedDetails.length > 0 ? formattedDetails : undefined,
          errors: data.errors
        });
        setCsvFile(null);
        const fileInput = document.getElementById('csvFileInput');
        if (fileInput) {
          fileInput.value = '';
        }
        await loadUsers();
      } else {
        const errorMessage = data.detail || data.message || 'Error al subir CSV';
        setMessage({ type: 'error', text: errorMessage });
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setMessage({ type: 'error', text: `Error al procesar el archivo: ${error.message || 'Error desconocido'}` });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCSV = async (e) => {
    e.preventDefault();
    if (!deleteCsvFile) {
      setMessage({ type: 'error', text: 'Por favor selecciona un archivo CSV' });
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', deleteCsvFile);

      // BACKEND_URL should already include /api from REACT_APP_API_BASE_URL
      const response = await fetch(`${BACKEND_URL}/users/delete-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await parseJsonOnce(response);

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Se han eliminado ${data.count} usuario(s) exitosamente.`,
          details: data.details || []
        });
        setDeleteCsvFile(null);
        const fileInput = document.getElementById('deleteCsvFileInput');
        if (fileInput) {
          fileInput.value = '';
        }
        await loadUsers();
      } else {
        const errorMessage = data.detail || data.message || 'Error al borrar usuarios desde CSV';
        setMessage({ type: 'error', text: errorMessage });
      }
    } catch (error) {
      console.error('Error deleting CSV:', error);
      setMessage({ type: 'error', text: `Error al procesar el archivo: ${error.message || 'Error desconocido'}` });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteUser = async (email) => {
    if (!window.confirm(`¿Estás seguro de eliminar el usuario ${email}?`)) {
      return;
    }

    try {
      // BACKEND_URL should already include /api from REACT_APP_API_BASE_URL
      const response = await fetch(`${BACKEND_URL}/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await parseJsonOnce(response);
      if (response.ok) {
        setMessage({ type: 'success', text: `Usuario ${email} eliminado exitosamente` });
        await loadUsers();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error al eliminar usuario' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar usuario' });
    }
  };

  const handleEditRole = (email, currentRole) => {
    setEditingRole(email);
    setTempRole(currentRole);
  };

  const handleSaveRole = async (email) => {
    try {
      // BACKEND_URL should already include /api from REACT_APP_API_BASE_URL
      const response = await fetch(`${BACKEND_URL}/users/${encodeURIComponent(email)}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: tempRole })
      });

      const data = await parseJsonOnce(response);
      if (response.ok) {
        setMessage({ type: 'success', text: 'Rol actualizado correctamente' });
        setEditingRole(null);
        setTempRole(null);
        await loadUsers();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error al actualizar rol' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar rol' });
    }
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setTempRole(null);
  };

  // Removed unused function: handleExportCSV
  // This function was defined but never called in the component

  const downloadSampleCSV = () => {
    const csv = 'email,role\nnombre.apellido@redland.cl,editor\nnombre2.apellido2@redland.cl,viewer';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios_ejemplo.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadDeleteSampleCSV = () => {
    const csv = 'email\nusuario1@redland.cl\nusuario2@redland.cl';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios_eliminar_ejemplo.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-[#1A1F2E] rounded-lg sm:rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 my-4 sm:my-0">
        {/* Header */}
        <div className="bg-[#1A2346] dark:bg-[#121C39] text-white px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Gestión de Usuarios</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {/* CSV Upload Section */}
          <div className="mb-4 sm:mb-6 bg-gray-50 dark:bg-[#0F1425] p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-2 sm:mb-3">Subir Usuarios desde CSV</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Sube un archivo CSV con las columnas: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">email</code> y <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">role</code>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Roles permitidos: <span className="font-medium">editor</span> puede editar todo o <span className="font-medium">viewer</span> solo ver
            </p>
            <div className="flex items-center space-x-2 mb-3">
              <button
                onClick={downloadSampleCSV}
                className="text-sm text-[#1A2346] dark:text-[#C5203A] hover:text-[#121C39] dark:hover:text-[#A01A2E] underline transition-colors"
              >
                📥 Descargar ejemplo de CSV
              </button>
            </div>

            <form onSubmit={handleCSVUpload} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-3 sm:space-x-3">
              <div className="flex-1">
                <input
                  id="csvFileInput"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="block w-full text-xs sm:text-sm text-gray-500 dark:text-gray-300 file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-[#1A2346] dark:file:bg-[#121C39] file:text-white hover:file:bg-[#121C39] dark:hover:file:bg-[#0F1425] transition-colors"
                  disabled={uploading}
                />
              </div>
              <button
                type="submit"
                disabled={uploading || !csvFile}
                className="bg-[#1A2346] dark:bg-[#121C39] text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-[#121C39] dark:hover:bg-[#0F1425] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
              >
                {uploading ? 'Subiendo...' : 'Subir CSV'}
              </button>
            </form>
          </div>

          {/* CSV Delete Section */}
          <div className="mb-6 bg-gray-50 dark:bg-[#0F1425] p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Borrar Usuarios desde CSV</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Sube un archivo CSV que contenga únicamente la columna: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">email</code>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Cada correo existente será eliminado automáticamente. Los usuarios que no existan serán ignorados.
            </p>
            <div className="flex items-center space-x-2 mb-3">
              <button
                onClick={downloadDeleteSampleCSV}
                className="text-sm text-[#1A2346] dark:text-[#C5203A] hover:text-[#121C39] dark:hover:text-[#A01A2E] underline transition-colors"
              >
                📥 Descargar ejemplo de CSV
              </button>
            </div>

            <form onSubmit={handleDeleteCSV} className="flex items-end space-x-3">
              <div className="flex-1">
                <input
                  id="deleteCsvFileInput"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setDeleteCsvFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1A2346] dark:file:bg-[#121C39] file:text-white hover:file:bg-[#121C39] dark:hover:file:bg-[#0F1425] transition-colors"
                  disabled={deleting}
                />
              </div>
              <button
                type="submit"
                disabled={deleting || !deleteCsvFile}
                className="bg-red-600 dark:bg-red-700 text-white px-6 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all duration-200"
              >
                {deleting ? 'Borrando...' : 'Borrar Usuarios CSV'}
              </button>
            </form>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`font-medium ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
              {message.details && (
                <ul className="mt-2 text-sm text-gray-700 list-disc list-inside">
                  {message.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
              {message.errors && message.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-800">Errores:</p>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {message.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Users List */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-2 sm:mb-3">Usuarios Autorizados</h3>
            {loading ? (
              <div className="text-center py-6 sm:py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2346] dark:border-[#C5203A]"></div>
                <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">Cargando usuarios...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-6 sm:py-8 bg-gray-50 dark:bg-[#0F1425] rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">No hay usuarios registrados</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Sube un archivo CSV para agregar usuarios</p>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-50 dark:bg-[#121C39]">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Correo Electrónico
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[#1A1F2E] divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.email} className="hover:bg-gray-50 dark:hover:bg-[#0F1425] transition-colors">
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-gray-200 break-words">
                          {user.email}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                          {editingRole === user.email ? (
                            <div className="flex items-center space-x-2">
                              <select
                                value={tempRole}
                                onChange={(e) => setTempRole(e.target.value)}
                                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-gray-200"
                              >
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <button
                                onClick={() => handleSaveRole(user.email)}
                                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm font-medium"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 text-sm font-medium"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              user.role === 'editor'
                                ? 'bg-[#C5203A] text-white'
                                : 'bg-[#1A2346] dark:bg-[#121C39] text-white'
                            }`}>
                              {user.role === 'editor' ? 'Editor' : 'Viewer'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                          <span className={`inline-flex px-2 py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                            user.is_active
                              ? 'bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-800 dark:text-green-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}>
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center">
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 sm:space-x-2 items-center sm:justify-center">
                            {editingRole !== user.email && (
                              <>
                                <button
                                  onClick={() => handleEditRole(user.email, user.role)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium transition-colors text-xs sm:text-sm whitespace-nowrap"
                                >
                                  Editar rol
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.email)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-medium transition-colors text-xs sm:text-sm whitespace-nowrap"
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-[#0F1425] px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-[#1A2346] dark:bg-[#121C39] text-white py-2 px-4 rounded-lg hover:bg-[#121C39] dark:hover:bg-[#0F1425] transition-colors shadow-sm hover:shadow-md text-sm sm:text-base"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPanel;
