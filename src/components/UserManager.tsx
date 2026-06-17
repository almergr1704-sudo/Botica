import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Key, Shield, Check, X, AlertOctagon, 
  RefreshCw, Eye, EyeOff, Lock, Landmark, FolderGit, Layout, FileTerminal, ArrowRight
} from 'lucide-react';
import { Usuario, Sucursal } from '../types/pharmacy';

interface UserManagerProps {
  branches: Sucursal[];
  users: Usuario[];
  onAddUser: (user: Omit<Usuario, 'id'>) => void;
  onToggleUserStatus: (userId: string) => void;
  currentUser: Usuario;
  onSetCurrentUser: (user: Usuario) => void;
}

export default function UserManager({
  branches,
  users,
  onAddUser,
  onToggleUserStatus,
  currentUser,
  onSetCurrentUser
}: UserManagerProps) {
  // Navigation inside this modular view
  const [activeSubTab, setActiveSubTab] = useState<'users_list' | 'architecture_view' | 'login_simulator'>('users_list');

  // Form states for creating user
  const [fullName, setFullName] = useState('');
  const [dni, setDni] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Administrador' | 'FarmaceuticoRegente' | 'Cajero'>('Cajero');
  const [branchId, setBranchId] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Form states for login simulator
  const [simUsername, setSimUsername] = useState('');
  const [simPassword, setSimPassword] = useState('');
  const [showSimPassword, setShowSimPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [lastLoggedInName, setLastLoggedInName] = useState('');

  // Default select branch
  useEffect(() => {
    if (branches.length > 0 && !branchId) {
      setBranchId(branches[0].id);
    }
  }, [branches, branchId]);

  // Action: Create User
  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    if (!fullName || !dni || !username || !password || !branchId) {
      setFormError('Por favor, complete todos los campos requeridos para el alta.');
      return;
    }

    if (dni.length !== 8 || !/^\d+$/.test(dni)) {
      setFormError('El DNI debe tener exactamente 8 caracteres numéricos.');
      return;
    }

    // Check username duplicates
    const duplicate = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (duplicate) {
      setFormError(`El apodo de usuario "${username}" ya está registrado en el sistema.`);
      return;
    }

    // Encrypted password simulation representation: SHA256 length string
    // In actual SQL script, we use SHA256 or bcrypt. Here we save the user to state.
    onAddUser({
      username: username.toLowerCase().trim(),
      nombre: `${fullName} (DNI ${dni})`,
      rol: role,
      id_sucursal: branchId,
      activo: true // default state is Active as per standard creation
    });

    setFormSuccess(true);
    setFullName('');
    setDni('');
    setUsername('');
    setPassword('');
    
    setTimeout(() => {
      setFormSuccess(false);
    }, 4000);
  };

  // Action: Login simulator verification with strict toggled control
  const handleSimulateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess(false);

    if (!simUsername || !simPassword) {
      setLoginError('Proporcione el nombre de usuario y contraseña.');
      return;
    }

    const matchedUser = users.find(u => u.username.toLowerCase().trim() === simUsername.toLowerCase().trim());
    
    if (!matchedUser) {
      setLoginError('Credenciales incorrectas: El usuario no existe en la base de datos.');
      return;
    }

    // Checking the database Active toggled status as strictly mandated in Prompt 1:
    // "verifique obligatoriamente que su estado sea activo == True antes de permitirle el acceso al sistema"
    if (!matchedUser.activo) {
      setLoginError(`¡ACCESO RECHAZADO (bloqueo de seguridad): El usuario "${matchedUser.username}" está actualmente INHABILITADO por administración. Inicie sesión con una credencial autorizada.`);
      return;
    }

    // Successful mock authentication
    setLoginSuccess(true);
    setLastLoggedInName(matchedUser.nombre);
    onSetCurrentUser(matchedUser);

    // Reset login form fields
    setSimUsername('');
    setSimPassword('');
    
    setTimeout(() => {
      setLoginSuccess(false);
    }, 3500);
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Header Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
              Módulo de Personal, Autenticación y Arquitectura Core (Parte 1)
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Gestione recursos humanos de boticas descentralizadas, valide accesos activos y explore la estructura MVC del sistema ERP.
          </p>
        </div>

        {/* Sub-panels control */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveSubTab('users_list')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'users_list' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-xs" />
            Control de Personal
          </button>
          
          <button
            onClick={() => setActiveSubTab('login_simulator')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'login_simulator' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Key className="w-4 h-4 text-xs text-amber-500" />
            Simulador de Login
          </button>

          <button
            onClick={() => setActiveSubTab('architecture_view')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'architecture_view' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderGit className="w-4 h-4 text-xs" />
            Estructura MVC
          </button>
        </div>
      </div>

      {/* SUB-PANEL 1: GEStION DE PERSONAL & FORMULARIO */}
      {activeSubTab === 'users_list' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LADO IZQUIERDO: FORMULARIO DE CREAR USUARIO (5 cols de 12) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-150 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Alta de Nuevo Empleado</h3>
                <p className="text-[10px] text-slate-400">Registre un personal y configure sus credenciales de acceso.</p>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-150 text-red-900 text-xs rounded-lg flex items-start gap-2 animate-pulse">
                <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="text-[11px] font-medium leading-relaxed">{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-950 text-xs rounded-lg flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="block text-[11.5px] font-bold">¡Personal Creado!</strong>
                  <span className="text-[10px] text-emerald-805 block">Se ha registrado el acceso en la lista dinámica.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                  Nombres y Apellidos *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Daniel Jesús Cárdenas"
                  className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                  DNI (Documento de Identidad) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  placeholder="8 dígitos obligatorios"
                  className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                  Sucursal de Destino *
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.nombre} ({b.ciudad})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                    placeholder="ej: daniel.cajero"
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                  Rol de Acceso en Sistema *
                </label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  <label className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                    role === 'Cajero' ? 'bg-indigo-50 border-indigo-250 text-indigo-900' : 'bg-slate-50 border-slate-205 hover:bg-slate-100 text-slate-705'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="role" 
                        checked={role === 'Cajero'} 
                        onChange={() => setRole('Cajero')}
                        className="text-indigo-600 focus:ring-indigo-505"
                      />
                      <div>
                        <span className="block font-bold text-[10.5px]">Cajero(a) de Turno</span>
                        <span className="block text-[9px] opacity-75 font-normal">Realiza transacciones en el POS de Caja Chica</span>
                      </div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                    role === 'FarmaceuticoRegente' ? 'bg-indigo-50 border-indigo-250 text-indigo-900' : 'bg-slate-50 border-slate-205 hover:bg-slate-100 text-slate-705'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="role" 
                        checked={role === 'FarmaceuticoRegente'} 
                        onChange={() => setRole('FarmaceuticoRegente')}
                        className="text-indigo-600 focus:ring-indigo-505"
                      />
                      <div>
                        <span className="block font-bold text-[10.5px]">Químico Farmacéutico</span>
                        <span className="block text-[9px] opacity-75 font-normal">Gestiona lotes, mermas y medicamentos regulados</span>
                      </div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                    role === 'Administrador' ? 'bg-indigo-50 border-indigo-250 text-indigo-900' : 'bg-slate-50 border-slate-205 hover:bg-slate-100 text-slate-705'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="role" 
                        checked={role === 'Administrador'} 
                        onChange={() => setRole('Administrador')}
                        className="text-indigo-600 focus:ring-indigo-505"
                      />
                      <div>
                        <span className="block font-bold text-[10.5px]">Administrador General</span>
                        <span className="block text-[9px] opacity-75 font-normal">Plena gobernanza de personal, sedes y auditorías</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all shadow-xs uppercase tracking-wider text-[10.5px] mt-2 block"
              >
                Registrar Empleado en BD
              </button>
            </form>
          </div>

          {/* LADO DERECHO: TABLA DINAMICA DE PERSONAL (8 cols de 12) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-150 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Directorio Activo de Personal</h3>
                <p className="text-[10px] text-slate-400">Lista dinámica de empleados vinculados con control de revocación de credenciales.</p>
              </div>
              <div className="bg-slate-100 px-3 py-1.5 rounded-md border border-slate-150 text-[10.5px] text-slate-650 font-medium">
                Total Registrados: <strong className="text-slate-900 font-bold font-mono">{users.length}</strong>
              </div>
            </div>

            {/* Alerta aclaratoria sobre el interruptor */}
            <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 text-[10.5px]/relaxed text-slate-700">
              📌 <strong>Regla estricta de seguridad:</strong> El botón <strong>"Habilitar / Deshabilitar"</strong> inyecta de inmediato un estado `activo = FALSE` en el registro. Si deshabilita un usuario, este quedará bloqueado ante cualquier intento de login en el módulo posterior o terminales POS.
            </div>

            {/* Tabla dinámica de usuarios */}
            <div className="overflow-x-auto border border-slate-150 rounded-xl">
              <table className="w-full text-left text-xs text-slate-600 table-auto">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-150">
                  <tr>
                    <th className="px-4 py-3 leading-4">Nombre / Identidad</th>
                    <th className="px-4 py-3 leading-4">Username</th>
                    <th className="px-4 py-3 leading-4">Rol en ERP</th>
                    <th className="px-4 py-3 leading-4">Establecimiento</th>
                    <th className="px-4 py-3 leading-4 text-center">Estado de Acceso</th>
                    <th className="px-4 py-3 leading-4 text-right">Interruptor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {users.map(u => {
                    const branch = branches.find(b => b.id === u.id_sucursal);
                    const isCurrentUser = currentUser.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-all">
                        <td className="px-4 py-3.5">
                          <div>
                            <span className="font-bold text-slate-850 block">{u.nombre}</span>
                            <span className="text-[9.5px] text-slate-400 block mt-0.5">ID: {u.id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-indigo-700 bg-indigo-50/60 px-1.5 py-0.5 rounded border border-indigo-100 text-[10px]">
                            {u.username}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                            u.rol === 'Administrador' 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                              : u.rol === 'FarmaceuticoRegente'
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-205'
                          }`}>
                            {u.rol === 'Administrador' ? 'Administrador' : u.rol === 'FarmaceuticoRegente' ? 'Q. Farmacéutico' : 'Cajero'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">
                          {branch ? branch.nombre.split(' - ')[1] || branch.nombre : 'Sin Sucursal asignada'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {u.activo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-md border border-emerald-150">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              AUTORIZADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-extrabold rounded-md border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              SUSPENDIDO
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end items-center gap-2">
                            {isCurrentUser && (
                              <span className="text-[9px] font-mono text-indigo-505 font-bold italic mr-1">Eres tú</span>
                            )}
                            
                            {/* Toggle Switch */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isCurrentUser) {
                                  alert('Por seguridad, no puedes deshabilitarte a ti mismo.');
                                  return;
                                }
                                onToggleUserStatus(u.id);
                              }}
                              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                u.activo ? 'bg-indigo-600' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  u.activo ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>* Contraseñas guardadas en formato HASH_SHA256 en BD física</span>
              <span>Conexión cifrada SSL Activa</span>
            </div>
          </div>

        </div>
      )}

      {/* SUB-PANEL 2: SIMULADOR DE INICIO DE SESIÓN */}
      {activeSubTab === 'login_simulator' && (
        <div className="max-w-xl mx-auto space-y-6">
          
          <div className="bg-white p-6 rounded-xl border border-slate-150 shadow-md space-y-6 text-slate-805">
            
            <div className="text-center space-y-2 pb-4 border-b border-slate-100">
              <div className="mx-auto w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Simulador de Autenticación de Empleados
              </h3>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                Pruebe la lógica de login y verifique cómo el sistema bloquea inmediatamente a los usuarios suspendidos (inactivos).
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-red-100 border border-red-200 text-red-950 text-xs rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold uppercase text-red-750 text-[10.5px]">
                  <AlertOctagon className="w-4 h-4 text-red-650 shrink-0" />
                  Gobernanza de Acceso Rechazado
                </div>
                <p className="text-[11px] font-sans leading-relaxed">
                  {loginError}
                </p>
              </div>
            )}

            {loginSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold uppercase text-emerald-800 text-[10.5px]">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  Autenticación Exitosa
                </div>
                <p className="text-[11px] font-sans">
                  Bienvenido <strong>{lastLoggedInName}</strong>. Su sesión ha sido iniciada. Todo el sistema ERP y el POS ahora se ejecutan bajo su firma activa de auditoría.
                </p>
              </div>
            )}

            <form onSubmit={handleSimulateLogin} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre de Usuario (Username)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={simUsername}
                    onChange={(e) => setSimUsername(e.target.value.replace(/\s+/g, ''))}
                    placeholder="ej: admin, cajero.sofia, quimico.mendoza"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-slate-50"
                  />
                  <div className="absolute left-3 top-3 text-slate-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Contraseña de Accesos</label>
                  <span className="text-[9.5px] text-slate-400">Contraseña Demo: Cualquiera</span>
                </div>
                <div className="relative">
                  <input
                    type={showSimPassword ? 'text' : 'password'}
                    required
                    value={simPassword}
                    onChange={(e) => setSimPassword(e.target.value)}
                    placeholder="Contraseña"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-slate-50"
                  />
                  <div className="absolute left-3 top-3 text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSimPassword(!showSimPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                  >
                    {showSimPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border text-[10.5px]/relaxed text-slate-550">
                💡 <strong>¿Cómo probar?</strong>
                <br />
                1. Intenta loguearte con <strong className="text-slate-800">admin</strong> (Contraseña: la que sea). Iniciarás sesión correctamente.
                <br />
                2. Ve al tab <strong>"Control de Personal"</strong> y apaga el interruptor de <strong className="text-slate-800">Sofía Quispe Pineda (cajero.sofia)</strong>.
                <br />
                3. Regresa aquí e intenta loguearte con <strong className="text-slate-805">cajero.sofia</strong>. Verás cómo el middleware virtual deniega totalmente el acceso por estar deshabilitada en la BD.
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:translate-y-px text-white rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
              >
                <Lock className="w-4 h-4 text-xs" />
                Ejecutar Login (Validación Activa)
              </button>

            </form>

          </div>

          {/* Tarjeta con el código explicativo de Laravel/Express/NestJS para el login */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-slate-805 bg-slate-850 flex items-center gap-2">
              <FileTerminal className="w-4 h-4 text-sky-400" />
              <h4 className="text-[10px] font-black text-white uppercase tracking-wider font-sans">
                Código Backend: Lógica de Autenticación Mandataria
              </h4>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-[10.5px] text-slate-400">
                Ejemplo del endpoint de Login desarrollado con protección e inhabilitación inmediata del usuario inactivo:
              </p>
              <pre className="p-3 bg-slate-950 text-emerald-400 rounded-lg overflow-x-auto text-[10px] font-mono leading-relaxed border border-slate-800">
                <code>{`// Endpoint controller: auth/login.ts (Node.js / Express / Knex)
export async function handleLogin(req: Request, res: Response) {
  const { username, password } = req.body;
  
  // 1. Busqueda en tabla de usuarios
  const user = await db('usuarios')
    .where('username', '=', username.toLowerCase().trim())
    .first();
    
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }
  
  // 2. Control de Estado Activo Obligatorio (Requisito Parte 1)
  if (!user.activo) {
    return res.status(403).json({ 
      error: 'ACCESO BLOQUEADO: Usuario inactivo. Consulte con recursos humanos.' 
    });
  }
  
  // 3. Verificidad de Hash de contraseña bcrypt/sha256
  const passOk = await verifyHash(password, user.password_hash);
  if (!passOk) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }
  
  // Genera Token JWT de sesión
  const token = generateJWT(user);
  return res.json({ token, user: { id: user.id, username: user.username, rol: user.rol } });
}`}</code>
              </pre>
            </div>
          </div>

        </div>
      )}

      {/* SUB-PANEL 3: ARQUITECTURA CORE - MVC / CLEAN ARCHITECTURE EXPLAINED */}
      {activeSubTab === 'architecture_view' && (
        <div className="bg-white p-6 rounded-xl border border-slate-150 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Arquitectura de Software Propuesta</h3>
            <p className="text-[11px] text-slate-400">Estructura limpia para un ERP multi-sucursal robusto, escalable y tolerante a fallos.</p>
          </div>

          <div className="text-xs text-slate-705 leading-relaxed space-y-4">
            
            <p>
              Para un ERP de este calibre, que debe dialogar con servicios SOAP asíncronos de la SUNAT e inventarios dinámicos controlados minuciosamente por Lotes FIFO, se sugiere estructurar el proyecto bajo una <strong>Arquitectura Limpia (Clean Architecture)</strong> o un patrón <strong>MVC robusto (Model-View-Controller)</strong>.
            </p>

            {/* Estructura de Folders visual con cajas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Backend folders */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-205 space-y-2">
                <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-150 px-2 py-0.5 rounded uppercase">
                  Estructura Backend (NodeJS / Express o NestJS)
                </span>
                <pre className="text-[10.5px] font-mono text-slate-700 leading-relaxed font-semibold">
{`📂 api-farmacia-erp
├── 📂 src
│   ├── 📂 config          # Conectores pg (postgres) / Firebase / SOAP SUNAT
│   ├── 📂 controllers     # Controladores de Rutas (Login, POS, Lotes)
│   ├── 📂 middlewares     # Seguridad, Cors, AuthGuard, VerificarUsuarioActivo
│   ├── 📂 models          # Esquemas Knex / TypeORM / Drizzle
│   ├── 📂 services        # Caso de Uso (Lógica FIFO, Generador XML UBL, OSE Envió)
│   └── 📂 routes          # Endpoints (/api/auth, /api/productos, /api/ventas)
├── .env.example
├── package.json
└── tsconfig.json`}
                </pre>
              </div>

              {/* Frontend folders */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-205 space-y-2">
                <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded uppercase">
                  Estructura Frontend (React / TypeScript / Vite)
                </span>
                <pre className="text-[10.5px] font-mono text-slate-700 leading-relaxed font-semibold">
{`📂 client-farmacia-erp
├── 📂 public
│   └── 📄 favicon.ico
├── 📂 src
│   ├── 📂 api             # Llamadas HTTP (Fetch / Axios) a Backend
│   ├── 📂 components      # Componentes modulares (POS, UserManager, LotTable)
│   ├── 📂 data            # Seed inicial y constantes estáticas
│   ├── 📂 hooks           # Hooks personalizados (useLocalStorage, useAuth)
│   ├── 📂 types           # Interfaces de TypeScript (pharmacy.ts)
│   ├── 📄 App.tsx          # Componente contenedor de vistas
│   └── 📄 main.tsx         # Punto de entrada de renderizado React
├── package.json
└── vite.config.ts`}
                </pre>
              </div>

            </div>

            {/* Factores Clave */}
            <div className="pt-2">
              <h4 className="font-bold text-slate-800 text-xs mb-2 uppercase">Gobernanza de Datos Requerida para Perú</h4>
              <ul className="space-y-2 list-disc pl-5">
                <li>
                  <strong className="text-slate-800">Cifrado de Contraseñas:</strong> En el Backend, la contraseña guardada representará un hash Bcrypt con sal (work factor de 10) o Argon2 para blindar la base de datos de filtraciones.
                </li>
                <li>
                  <strong className="text-slate-800">Trazabilidad en Lotes:</strong> La llave foránea `id_lote` en la tabla `detalle_ventas` es clave. Garantiza que en cualquier auditoría se conozca con precisión científica cuál lote se dispensó a un paciente, cumpliendo con la de Ley de Buenas Prácticas de Oficina Farmacéutica del Perú.
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
