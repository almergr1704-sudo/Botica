import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Key, 
  Users, 
  Eye, 
  EyeOff, 
  AlertOctagon, 
  Check, 
  Settings, 
  HelpCircle, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck 
} from 'lucide-react';
import { Usuario } from '../types/pharmacy';
import { 
  verifyPassword, 
  getPasswordPolicy, 
  savePasswordPolicy, 
  checkPasswordPolicy, 
  logSecurityAction, 
  hashPassword,
  isTemporaryPassword,
  mustChangePassword,
  PasswordPolicy 
} from '../utils/security';

interface LoginScreenProps {
  users: Usuario[];
  onLoginSuccess: (user: Usuario) => void;
  darkMode: boolean;
}

export default function LoginScreen({ users, onLoginSuccess, darkMode }: LoginScreenProps) {
  // Login form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Policy and lockout states
  const [policy, setPolicy] = useState<PasswordPolicy>(getPasswordPolicy());
  const [showPolicySettings, setShowPolicySettings] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [lockedUsername, setLockedUsername] = useState<string>('');

  // Password recovery states
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [foundUser, setFoundUser] = useState<Usuario | null>(null);
  
  // New password on recovery
  const [newRecPassword, setNewRecPassword] = useState('');
  const [confirmRecPassword, setConfirmRecPassword] = useState('');
  const [showRecPassword, setShowRecPassword] = useState(false);

  // Monitor Lockout Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lockoutRemaining > 0) {
      interval = setInterval(() => {
        setLockoutRemaining(prev => {
          if (prev <= 1) {
            // Lockout expired, clear from local storage for username
            if (lockedUsername) {
              localStorage.removeItem(`erp_lockout_${lockedUsername}`);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lockoutRemaining, lockedUsername]);

  // Check persistent lockout on load/username edit
  const checkUsernameLockout = (uName: string) => {
    const cleanUsername = uName.trim().toLowerCase();
    const savedLockout = localStorage.getItem(`erp_lockout_${cleanUsername}`);
    if (savedLockout) {
      try {
        const data = JSON.parse(savedLockout);
        const now = Date.now();
        if (data.lockUntil > now) {
          const remaining = Math.ceil((data.lockUntil - now) / 1000);
          setLockoutRemaining(remaining);
          setLockedUsername(cleanUsername);
          return true;
        } else {
          // Lockout expired
          localStorage.removeItem(`erp_lockout_${cleanUsername}`);
        }
      } catch (e) {}
    }
    setLockoutRemaining(0);
    return false;
  };

  const handleUsernameChange = (val: string) => {
    const cleanVal = val.replace(/\s+/g, '');
    setUsername(cleanVal);
    checkUsernameLockout(cleanVal);
  };

  // Handle standard login submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setLoginError('');

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !password) {
      setLoginError('Por favor complete todos los campos obligatorios.');
      setIsSubmitting(false);
      return;
    }

    // 1. Check if user is locked out
    if (checkUsernameLockout(cleanUsername)) {
      setLoginError(`Esta cuenta se encuentra temporalmente bloqueada por reiterados intentos fallidos. Espere ${lockoutRemaining} segundos.`);
      setIsSubmitting(false);
      return;
    }

    // Call actual backend API
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername, password })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error de autenticación');
      }

      // Success! Clear failed attempts
      localStorage.removeItem(`erp_attempts_${cleanUsername}`);
      localStorage.removeItem(`erp_lockout_${cleanUsername}`);

      // Save real session token
      localStorage.setItem('sigifar_session_token', data.token);

      logSecurityAction(data.user.id, `${data.user.nombre} (${data.user.rol})`, 
        data.user.requiere_cambio_password 
          ? 'Inicio de sesión bajo credenciales temporales. REDIRECCIÓN MANDATORIA E INMEDIATA a cambio obligatorio de contraseña.' 
          : `Inicio de sesión exitoso bajo rol: [${data.user.rol}].`
      );

      setIsSubmitting(false);
      // Trigger parent success handler
      onLoginSuccess(data.user);
    })
    .catch((err) => {
      // Increment failed attempts and trigger lockouts on client side for enhanced UI/UX safety
      const savedAttemptsStr = localStorage.getItem(`erp_attempts_${cleanUsername}`) || '0';
      const newAttempts = parseInt(savedAttemptsStr) + 1;
      
      if (newAttempts >= policy.maxFailedAttempts) {
        // Lock user
        const lockUntil = Date.now() + (policy.lockoutDurationSec * 1000);
        localStorage.setItem(`erp_lockout_${cleanUsername}`, JSON.stringify({ attempts: newAttempts, lockUntil }));
        localStorage.removeItem(`erp_attempts_${cleanUsername}`); // Reset attempts once locked
        
        setLockoutRemaining(policy.lockoutDurationSec);
        setLockedUsername(cleanUsername);
        
        logSecurityAction('anon', 'Usuario Anónimo', `CUENTA BLOQUEADA por ${policy.lockoutDurationSec}s tras ${newAttempts} intentos fallidos de login.`);
        setLoginError(`Cuenta bloqueada temporalmente por reiterados intentos fallidos. Intente de nuevo en ${policy.lockoutDurationSec} segundos.`);
      } else {
        localStorage.setItem(`erp_attempts_${cleanUsername}`, newAttempts.toString());
        logSecurityAction('anon', 'Usuario Anónimo', `Intento fallido de login (${newAttempts}/${policy.maxFailedAttempts}) para usuario "${cleanUsername}".`);
        setLoginError(`Credenciales incorrectas o inválidas. Intento ${newAttempts} de ${policy.maxFailedAttempts}.`);
      }
      setIsSubmitting(false);
    });
  };

  // Password Recovery Flow
  const handleStartRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    const cleanUsername = recoveryUsername.trim().toLowerCase();

    const user = users.find(u => u.username.toLowerCase() === cleanUsername);
    if (!user) {
      setRecoveryError('El nombre de usuario ingresado no existe en el sistema.');
      return;
    }

    if (!user.activo || user.estado_registro === 'eliminado_logico') {
      setRecoveryError('No se puede restablecer la clave para una cuenta desactivada o de baja.');
      return;
    }

    // Verify email placeholder if exists or use a default mock check
    const userEmail = user.email || 'pedidos@alfafarma.pe'; // Default mock email if none specified
    const cleanEmail = recoveryEmail.trim().toLowerCase();

    if (cleanEmail !== userEmail.toLowerCase()) {
      setRecoveryError('El correo electrónico ingresado no coincide con el registrado en su ficha laboral.');
      return;
    }

    // User verified! Go to Step 2
    setFoundUser(user);
    setRecoveryStep(2);
  };

  const handleFinishRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (!foundUser) return;

    // Check policies
    const check = checkPasswordPolicy(newRecPassword, policy);
    if (!check.meetsAll) {
      setRecoveryError('La nueva contraseña no cumple con los criterios de seguridad vigentes.');
      return;
    }

    if (newRecPassword !== confirmRecPassword) {
      setRecoveryError('Las contraseñas no coinciden.');
      return;
    }

    // No reuse of temporal or same password
    const oldPassword = foundUser.password || '';
    if (newRecPassword === oldPassword || newRecPassword === 'admin') {
      setRecoveryError('Por motivos de seguridad, no puede reutilizar su contraseña anterior o claves iniciales.');
      return;
    }

    // Success! Save new password securely hashed
    const hashed = hashPassword(newRecPassword);
    
    // Update user in local storage
    const updatedUsers = users.map(u => {
      if (u.id === foundUser.id) {
        return {
          ...u,
          password: hashed,
          requiere_cambio_password: false, // successfully changed
          fecha_cambio_password: new Date().toISOString()
        };
      }
      return u;
    });

    localStorage.setItem('erp_users', JSON.stringify(updatedUsers));
    
    // Force direct reload trigger for users state in parent
    window.dispatchEvent(new Event('storage'));

    logSecurityAction(foundUser.id, `${foundUser.nombre} (${foundUser.rol})`, `Contraseña reestablecida exitosamente mediante portal de recuperación.`);

    alert('¡Contraseña restablecida correctamente! Ya puede iniciar sesión con su nueva contraseña.');

    // Reset recovery state
    setIsRecovering(false);
    setRecoveryUsername('');
    setRecoveryEmail('');
    setNewRecPassword('');
    setConfirmRecPassword('');
    setRecoveryStep(1);
    setFoundUser(null);
    setUsername(foundUser.username);
  };

  // Password strength on recovery form
  const recPolicyCheck = checkPasswordPolicy(newRecPassword, policy);
  const isRecMatch = newRecPassword && newRecPassword === confirmRecPassword;

  // Custom policy settings change
  const handlePolicyChange = (key: keyof PasswordPolicy, val: any) => {
    const updated = { ...policy, [key]: val };
    setPolicy(updated);
    savePasswordPolicy(updated);
  };

  return (
    <div className="w-full max-w-md mx-auto my-8">
      
      {/* 1. CARTERA DE AUTENTICACIÓN */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        
        {/* Encabezado Principal */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-8 text-white text-center relative">
          <div className="absolute top-3 right-3">
            <button 
              type="button" 
              onClick={() => setShowPolicySettings(!showPolicySettings)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
              title="Gobernanza de Seguridad"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="mx-auto w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mb-3 shadow-md border border-white/10">
            <ShieldCheck className="w-8 h-8 text-indigo-200" />
          </div>
          <h1 className="text-base font-extrabold tracking-widest uppercase text-white">
            SigiFar Enterprise ERP
          </h1>
          <p className="text-[10px] text-indigo-200 font-mono mt-1 font-bold">
            Portal de Autenticación Unificado y Seguro
          </p>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-6">
          
          {!isRecovering ? (
            /* A. STANDARD LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              
              <div className="text-center pb-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">
                  Firma de Operario Requerida
                </span>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200 rounded-xl flex gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[10.5px] leading-relaxed font-sans font-medium">
                    {loginError}
                  </p>
                </div>
              )}

              {lockoutRemaining > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] text-amber-800 dark:text-amber-400">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    Portal Bloqueado por Seguridad
                  </div>
                  <p className="text-[10.5px] leading-relaxed font-sans font-medium">
                    Para evitar ataques de fuerza bruta, la cuenta ha sido temporalmente bloqueada. Espere <span className="font-mono font-bold text-xs bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded text-amber-950 dark:text-white">{lockoutRemaining}s</span> para reintentar.
                  </p>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Nombre de Usuario *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    disabled={lockoutRemaining > 0 || isSubmitting}
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="Ingrese su alias de colaborador"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 text-xs font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <div className="absolute left-3 top-3.5 text-slate-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Contraseña de Acceso *
                  </label>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setIsRecovering(true);
                      setRecoveryError('');
                      setRecoveryStep(1);
                    }}
                    className="text-[9.5px] font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-all disabled:opacity-50 disabled:no-underline"
                  >
                    ¿Olvidó su clave?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={lockoutRemaining > 0 || isSubmitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña del sistema"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 text-xs font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <div className="absolute left-3 top-3.5 text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={lockoutRemaining > 0 || isSubmitting}
                className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-widest text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Verificando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Validar Identidad y Acceder
                  </>
                )}
              </button>

              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-150 dark:border-slate-800/80 text-[10px]/relaxed text-slate-500 dark:text-slate-450 mt-4">
                🔒 <strong>Credenciales de Inicio (Admin por Defecto)</strong>
                <br />
                • Usuario: <code className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1 py-0.5 rounded">admin</code> | Contraseña temporal: <code className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1 py-0.5 rounded">admin</code>
                <br />
                <em>Al acceder con credenciales temporales, se le exigirá obligatoriamente crear una nueva clave bajo políticas de robustez.</em>
              </div>

            </form>
          ) : (
            /* B. PASSWORD RECOVERY SCREEN */
            <div className="space-y-4">
              <div className="text-center pb-2 flex flex-col items-center">
                <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500 dark:text-indigo-400">
                  Restablecimiento de Credenciales
                </span>
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Verifique su cuenta de colaborador para fijar una nueva clave.
                </p>
              </div>

              {recoveryError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200 rounded-xl flex gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[10.5px] leading-relaxed font-sans font-medium">
                    {recoveryError}
                  </p>
                </div>
              )}

              {recoveryStep === 1 ? (
                /* Step 1: Request account and email info */
                <form onSubmit={handleStartRecovery} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                      Su Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      required
                      value={recoveryUsername}
                      onChange={(e) => setRecoveryUsername(e.target.value.replace(/\s+/g, ''))}
                      placeholder="ej: admin, quimico.mendoza"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                      Correo Electrónico Registrado
                    </label>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="ej: pedidos@alfafarma.pe"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecovering(false);
                        setRecoveryError('');
                      }}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all uppercase tracking-wide text-[10px]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all uppercase tracking-wide text-[10px]"
                    >
                      Verificar Cuenta
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: Input new password following policy */
                <form onSubmit={handleFinishRecovery} className="space-y-3.5 text-xs">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/40 text-[10.5px] text-emerald-800 dark:text-emerald-400">
                    ✓ Colaborador verificado: <strong>{foundUser?.nombre}</strong>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                      Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={showRecPassword ? "text" : "password"}
                        required
                        value={newRecPassword}
                        onChange={(e) => setNewRecPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full pl-3 pr-10 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecPassword(!showRecPassword)}
                        className="absolute right-3 top-2 text-slate-450 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {showRecPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                      Confirme la Nueva Contraseña *
                    </label>
                    <input
                      type={showRecPassword ? "text" : "password"}
                      required
                      value={confirmRecPassword}
                      onChange={(e) => setConfirmRecPassword(e.target.value)}
                      placeholder="Repita la clave exacta"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono text-xs"
                    />
                  </div>

                  {/* Policy requirements checklist */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1 text-[9.5px]/relaxed">
                    <span className="font-bold text-slate-450 uppercase block tracking-wider mb-1">Requisitos Obligatorios</span>
                    <div className="grid grid-cols-2 gap-1.5 font-medium">
                      <div className="flex items-center gap-1">
                        {recPolicyCheck.hasMinLength ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="text-rose-500 font-bold">✗</span>}
                        <span className={recPolicyCheck.hasMinLength ? 'text-emerald-700' : 'text-slate-400'}>Mín. {policy.minLength} carac.</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {recPolicyCheck.hasUppercase ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="text-rose-500 font-bold">✗</span>}
                        <span className={recPolicyCheck.hasUppercase ? 'text-emerald-700' : 'text-slate-400'}>Mayúscula (A-Z)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {recPolicyCheck.hasLowercase ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="text-rose-500 font-bold">✗</span>}
                        <span className={recPolicyCheck.hasLowercase ? 'text-emerald-700' : 'text-slate-400'}>Minúscula (a-z)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {recPolicyCheck.hasNumber ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="text-rose-500 font-bold">✗</span>}
                        <span className={recPolicyCheck.hasNumber ? 'text-emerald-700' : 'text-slate-400'}>Un Número (0-9)</span>
                      </div>
                      <div className="flex items-center gap-1 col-span-2">
                        {recPolicyCheck.hasSpecial ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="text-rose-500 font-bold">✗</span>}
                        <span className={recPolicyCheck.hasSpecial ? 'text-emerald-700' : 'text-slate-400'}>Carácter Especial (ej: !@#$*)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryStep(1);
                        setFoundUser(null);
                        setNewRecPassword('');
                        setConfirmRecPassword('');
                      }}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all uppercase tracking-wide text-[10px]"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={!recPolicyCheck.meetsAll || !isRecMatch}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all uppercase tracking-wide text-[10px] disabled:opacity-50"
                    >
                      Cambiar Clave
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </div>

      {/* 2. PANEL DE CONFIGURACIÓN DE POLÍTICAS DE SEGURIDAD (GOBERNANZA) */}
      {showPolicySettings && (
        <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-150 dark:border-slate-800 animate-in fade-in duration-200 transition-colors duration-300">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-850">
            <Settings className="w-5 h-5 text-indigo-500 shrink-0" />
            <div className="text-left">
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">
                Gobernanza de Ciberseguridad
              </h3>
              <p className="text-[10px] text-slate-400">
                Auditoría y Directivas de Robustez de Contraseñas del ERP
              </p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Length parameter */}
            <div className="flex items-center justify-between">
              <label className="text-[10.5px] font-bold text-slate-650 dark:text-slate-300">Longitud Mínima de Clave</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="4"
                  max="16"
                  value={policy.minLength}
                  onChange={(e) => handlePolicyChange('minLength', parseInt(e.target.value))}
                  className="w-24 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono bg-indigo-50 dark:bg-indigo-900/35 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-bold text-xs">{policy.minLength}</span>
              </div>
            </div>

            {/* Checkboxes for constraints */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Restricciones de Caracteres</span>
              
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-850">
                  <input
                    type="checkbox"
                    checked={policy.requireUppercase}
                    onChange={(e) => handlePolicyChange('requireUppercase', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 cursor-pointer"
                  />
                  <span className="text-[10.5px] text-slate-600 dark:text-slate-300">Mayúsculas (A-Z)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-850">
                  <input
                    type="checkbox"
                    checked={policy.requireLowercase}
                    onChange={(e) => handlePolicyChange('requireLowercase', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 cursor-pointer"
                  />
                  <span className="text-[10.5px] text-slate-600 dark:text-slate-300">Minúsculas (a-z)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-850">
                  <input
                    type="checkbox"
                    checked={policy.requireNumbers}
                    onChange={(e) => handlePolicyChange('requireNumbers', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 cursor-pointer"
                  />
                  <span className="text-[10.5px] text-slate-600 dark:text-slate-300">Números (0-9)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-850">
                  <input
                    type="checkbox"
                    checked={policy.requireSpecial}
                    onChange={(e) => handlePolicyChange('requireSpecial', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 cursor-pointer"
                  />
                  <span className="text-[10.5px] text-slate-600 dark:text-slate-300">Especiales (*@#$)</span>
                </label>
              </div>
            </div>

            {/* Lockout details */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-850 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Mitigación de Fuerza Bruta</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1">Intentos Permitidos</label>
                  <select
                    value={policy.maxFailedAttempts}
                    onChange={(e) => handlePolicyChange('maxFailedAttempts', parseInt(e.target.value))}
                    className="w-full p-2 border border-slate-205 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  >
                    <option value={2}>2 Intentos</option>
                    <option value={3}>3 Intentos (Recom.)</option>
                    <option value={5}>5 Intentos</option>
                    <option value={10}>10 Intentos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1">Duración del Bloqueo</label>
                  <select
                    value={policy.lockoutDurationSec}
                    onChange={(e) => handlePolicyChange('lockoutDurationSec', parseInt(e.target.value))}
                    className="w-full p-2 border border-slate-205 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  >
                    <option value={10}>10 segundos</option>
                    <option value={30}>30 segundos</option>
                    <option value={60}>1 minuto</option>
                    <option value={300}>5 minutos</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
