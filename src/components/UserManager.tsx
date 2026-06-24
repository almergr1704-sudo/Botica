import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Key, Shield, Check, X, AlertOctagon, 
  RefreshCw, Eye, EyeOff, Lock, Landmark, FolderGit, Layout, FileTerminal, ArrowRight, AlertTriangle
} from 'lucide-react';
import { Usuario, Sucursal } from '../types/pharmacy';
import { hashPassword } from '../utils/security';

interface UserManagerProps {
  branches: Sucursal[];
  users: Usuario[];
  onAddUser: (user: Omit<Usuario, 'id'>) => void;
  onToggleUserStatus: (userId: string) => void;
  currentUser: Usuario;
  onSetCurrentUser: (user: Usuario) => void;
  onUpdateUser?: (user: Usuario) => void;
  onDeleteUser?: (userId: string) => void;
}

export default function UserManager({
  branches,
  users,
  onAddUser,
  onToggleUserStatus,
  currentUser,
  onSetCurrentUser,
  onUpdateUser,
  onDeleteUser
}: UserManagerProps) {
  // Navigation inside this modular view
  const [activeSubTab, setActiveSubTab] = useState<'users_list' | 'architecture_view' | 'login_simulator'>('users_list');

  // Form states for creating user
  const [fullName, setFullName] = useState('');
  const [dni, setDni] = useState('');
  const [username, setUsername] = useState('');
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Administrador' | 'FarmaceuticoRegente' | 'Almacenero' | 'Cajero'>('Cajero');
  const [branchId, setBranchId] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Suggest username when fullName changes
  useEffect(() => {
    if (!usernameEdited && fullName.trim()) {
      const normalized = fullName.trim().toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z\s]/g, ''); // letters and spaces only
      const parts = normalized.split(/\s+/);
      if (parts.length >= 2) {
        // Concatenate first name + paternal surname (e.g. Almer Gaona -> almergaona)
        const suggested = parts[0] + parts[1];
        setUsername(suggested);
      } else if (parts.length === 1 && parts[0]) {
        setUsername(parts[0]);
      }
    } else if (!fullName.trim() && !usernameEdited) {
      setUsername('');
    }
  }, [fullName, usernameEdited]);

  // Edit / Update States
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<'Administrador' | 'FarmaceuticoRegente' | 'Almacenero' | 'Cajero'>('Cajero');
  const [editBranchId, setEditBranchId] = useState('');
  const [editError, setEditError] = useState('');
  const [concurrencyConflict, setConcurrencyConflict] = useState<{ local: Usuario; server: Usuario } | null>(null);

  // Delete Confirm States
  const [deletingUser, setDeletingUser] = useState<Usuario | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      activo: true, // default state is Active as per standard creation
      password: hashPassword(password || 'ClaveGenerica123!'),
      requiere_cambio_password: true,
      must_change_password: true,
      password_changed: false
    });

    setFormSuccess(true);
    setFullName('');
    setDni('');
    setUsername('');
    setUsernameEdited(false);
    setPassword('');
    
    setTimeout(() => {
      setFormSuccess(false);
    }, 4000);
  };

  // Edit / Update actions
  const handleStartEditUser = (user: Usuario) => {
    setEditingUser(user);
    setEditFullName(user.nombre);
    setEditUsername(user.username);
    setEditRole(user.rol);
    setEditBranchId(user.id_sucursal);
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveEditUser = (e: React.FormEvent, bypassCheck: boolean = false) => {
    e.preventDefault();
    setEditError('');

    if (!editFullName || !editUsername || !editBranchId) {
      setEditError('Por favor complete todos lo campos obligatorios.');
      return;
    }

    // Check duplicate username
    if (editingUser && editUsername.toLowerCase().trim() !== editingUser.username.toLowerCase().trim()) {
      const duplicate = users.find(u => u.username.toLowerCase() === editUsername.toLowerCase().trim());
      if (duplicate) {
        setEditError(`El username "${editUsername}" ya está registrado.`);
        return;
      }
    }

    if (editingUser) {
      if (!bypassCheck) {
        try {
          const raw = localStorage.getItem('erp_users');
          if (raw) {
            const list = JSON.parse(raw);
            const serverUser = list.find((u: any) => u.id === editingUser.id);
            if (serverUser) {
              const serverVersion = serverUser.version ?? 1;
              const localVersion = (editingUser as any).version ?? 1;
              if (serverVersion > localVersion) {
                // simultaneous update detected
                setConcurrencyConflict({
                  local: {
                    ...editingUser,
                    nombre: editFullName.trim(),
                    username: editUsername.toLowerCase().trim(),
                    rol: editRole,
                    id_sucursal: editBranchId
                  },
                  server: serverUser
                });
                return;
              }
            }
          }
        } catch (err) {}
      }

      if (onUpdateUser) {
        const targetVersion = bypassCheck ? (concurrencyConflict?.server?.version ?? 1) : ((editingUser as any).version ?? 1);
        onUpdateUser({
          ...editingUser,
          nombre: editFullName.trim(),
          username: editUsername.toLowerCase().trim(),
          rol: editRole,
          id_sucursal: editBranchId,
          version: targetVersion
        });
      }
    }

    setShowEditModal(false);
    setEditingUser(null);
    setConcurrencyConflict(null);
  };

  // Delete actions
  const handleStartDeleteUser = (user: Usuario) => {
    setDeletingUser(user);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteUser = () => {
    if (deletingUser && onDeleteUser) {
      onDeleteUser(deletingUser.id);
    }
    setShowDeleteConfirm(false);
    setDeletingUser(null);
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
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSubTab('users_list')}
            className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'users_list' 
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-xs" />
            Control de Personal
          </button>
          
          <button
            onClick={() => setActiveSubTab('login_simulator')}
            className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'login_simulator' 
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 text-xs" />
            Simulador de Login
          </button>

          <button
            onClick={() => setActiveSubTab('architecture_view')}
            className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'architecture_view' 
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.replace(/\s+/g, ''));
                      setUsernameEdited(true);
                    }}
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
                    role === 'Almacenero' ? 'bg-indigo-50 border-indigo-250 text-indigo-900' : 'bg-slate-50 border-slate-205 hover:bg-slate-100 text-slate-705'
                  }`}>
                    <div className="flex items-center gap-2">
                       <input 
                        type="radio" 
                        name="role" 
                        checked={role === 'Almacenero'} 
                        onChange={() => setRole('Almacenero')}
                        className="text-indigo-600 focus:ring-indigo-505"
                      />
                      <div>
                        <span className="block font-bold text-[10.5px]">Almacenero / Logística</span>
                        <span className="block text-[9px] opacity-75 font-normal">Acceso restringido únicamente a inventario, compras y proveedores</span>
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
                              : u.rol === 'Almacenero'
                              ? 'bg-teal-100 text-teal-700 border border-teal-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-205'
                          }`}>
                            {u.rol === 'Administrador' 
                              ? 'Administrador' 
                              : u.rol === 'FarmaceuticoRegente' 
                              ? 'Q. Farmacéutico' 
                              : u.rol === 'Almacenero' 
                              ? 'Almacenero' 
                              : 'Cajero'}
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
                            
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleStartEditUser(u)}
                              className="p-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-650 rounded border border-slate-200 transition-all text-[11px]"
                              title="Editar Empleado"
                            >
                              ✏️
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isCurrentUser) {
                                  alert('Por seguridad, no puedes eliminar tu propia cuenta activa de administrador.');
                                  return;
                                }
                                if (u.username.toLowerCase() === 'admin') {
                                  alert('No se puede dar de baja o eliminar la cuenta del Administrador principal del sistema.');
                                  return;
                                }
                                handleStartDeleteUser(u);
                              }}
                              className="p-1 px-2 bg-red-50 hover:bg-red-105 text-red-650 hover:text-red-850 rounded border border-red-150 transition-all text-[11px]"
                              title="Eliminar Empleado"
                            >
                              🗑️
                            </button>

                            {/* Toggle Switch */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isCurrentUser) {
                                  alert('Por seguridad, no puedes deshabilitarte a ti mismo.');
                                  return;
                                }
                                if (u.username.toLowerCase() === 'admin') {
                                  alert('No se puede desactivar la cuenta del Administrador principal del sistema.');
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

      {/* MODALS PARA ACCIONES MASTER */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-150">
            <div className="px-5 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  ✏️ Editar Acceso de Personal
                </h3>
                <p className="text-[10px] text-slate-450 mt-0.5">Modifique los privilegios, sede y nombre del empleado.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowEditModal(false); setEditingUser(null); }}
                className="text-slate-450 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {concurrencyConflict ? (
              <div className="p-5 text-xs font-sans space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3.5">
                  <div className="flex gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-tight text-amber-950">⚠️ Conflicto de Concurrencia de Red</h4>
                      <p className="mt-1 text-[11px] leading-relaxed">
                        Este perfil de personal fue actualizado en la base de datos por el usuario <strong>{concurrencyConflict.server.last_updated_by || 'Personal de SUNAT (Administración)'}</strong> mientras usted lo editaba.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="p-2 font-black text-slate-600 uppercase tracking-wider">Propiedad</th>
                        <th className="p-2 font-black text-amber-700 bg-amber-50/50 uppercase tracking-wider">Tu Propuesta</th>
                        <th className="p-2 font-black text-blue-700 bg-blue-50/50 uppercase tracking-wider">Código de Red</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Nombre completo</td>
                        <td className="p-2 font-semibold text-amber-900 bg-amber-50/20">{concurrencyConflict.local.nombre}</td>
                        <td className="p-2 font-semibold text-blue-900 bg-blue-50/20">{concurrencyConflict.server.nombre}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Username</td>
                        <td className="p-2 font-mono text-amber-900 bg-amber-50/20">{concurrencyConflict.local.username}</td>
                        <td className="p-2 font-mono text-blue-900 bg-blue-50/20">{concurrencyConflict.server.username}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Rol</td>
                        <td className="p-2 font-semibold text-amber-900 bg-amber-50/20">{concurrencyConflict.local.rol}</td>
                        <td className="p-2 font-semibold text-blue-900 bg-blue-50/20">{concurrencyConflict.server.rol}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Ficha Versión</td>
                        <td className="p-2 font-mono text-amber-900 bg-amber-50/20">v{(concurrencyConflict.local as any).version ?? 1}</td>
                        <td className="p-2 font-mono text-blue-900 bg-blue-50/20">v{(concurrencyConflict.server as any).version ?? 1}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    onClick={(e) => handleSaveEditUser(e, true)}
                    className="w-full text-center py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    💥 Forzar Sobrescritura en Base de Datos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Discard edits but load new ones in inputs so user can merge/tune
                      setEditFullName(concurrencyConflict.server.nombre);
                      setEditUsername(concurrencyConflict.server.username);
                      setEditRole(concurrencyConflict.server.rol as any);
                      setEditBranchId(concurrencyConflict.server.id_sucursal);
                      setEditingUser({
                        ...editingUser!,
                        version: (concurrencyConflict.server as any).version
                      });
                      setConcurrencyConflict(null);
                    }}
                    className="w-full text-center py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    🔄 Descartar locales y Adaptar datos de Red
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                      setConcurrencyConflict(null);
                    }}
                    className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Cerrar sin guardar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveEditUser} className="p-5 space-y-4 text-xs font-sans">
                {editError && (
                  <div className="bg-red-50 text-red-750 p-2.5 rounded-lg border border-red-150 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Completo y DNI</label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-indigo-505 font-medium bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre de Usuario (Username)</label>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.replace(/\s+/g, ''))}
                      className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-indigo-505 font-mono bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rol / Cargo del Personal</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-indigo-505 font-medium bg-white"
                    >
                      <option value="Administrador">Administrador</option>
                      <option value="FarmaceuticoRegente">Químico Farmacéutico</option>
                      <option value="Almacenero">Almacenero</option>
                      <option value="Cajero">Cajero</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sede / Establecimiento de Operación</label>
                    <select
                      value={editBranchId}
                      onChange={(e) => setEditBranchId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-indigo-505 font-medium bg-white"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nombre} ({b.ciudad})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setEditingUser(null); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showDeleteConfirm && deletingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-150">
            <div className="p-5 text-center space-y-4 font-sans text-xs">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-650">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">¿Dar de baja definitiva?</h3>
                <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                  Está a punto de revocar todos los accesos e historiales del empleado <strong className="text-slate-855 font-bold">{deletingUser.nombre}</strong> (username: <span className="font-mono text-indigo-600 font-bold">{deletingUser.username}</span>). Esta acción es irreversible en la BD interna para fines de auditoría retroactiva.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeletingUser(null); }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                >
                  Confirmar Baja
                </button>
              </div>
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
