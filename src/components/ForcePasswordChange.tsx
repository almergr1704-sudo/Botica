import React, { useState } from 'react';
import { KeyRound, Check, X, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { Usuario } from '../types/pharmacy';
import { verifyPassword } from '../utils/security';

interface ForcePasswordChangeProps {
  currentUser: Usuario;
  onPasswordChanged: (updatedUser: Usuario) => void;
  onLogout: () => void;
}

const WEAK_PASSWORDS = [
  'admin', 'admin123', 'password', '12345678', 'contraseña', 
  'sigifar', 'sigifar123', 'alfafarma', 'mendoza123', 'regente123'
];

export default function ForcePasswordChange({
  currentUser,
  onPasswordChanged,
  onLogout
}: ForcePasswordChangeProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  // Password requirements
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const meetsAllRequirements = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const isMatch = newPassword !== '' && newPassword === confirmPassword;
  const isCurrentPasswordCorrect = currentPassword ? verifyPassword(currentPassword, currentUser.password || '') : false;
  const isReusingOld = newPassword !== '' && verifyPassword(newPassword, currentUser.password || '');

  // Real-time strength score calculation
  const getStrengthScore = () => {
    if (!newPassword) return 0;
    if (newPassword.length < 6) return 1;
    let score = 1;
    if (hasMinLength) score += 1;
    if (hasUppercase && hasLowercase) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;
    return score;
  };

  const strengthScore = getStrengthScore();

  const getStrengthInfo = () => {
    if (!newPassword) return { label: 'Sin ingresar', colorClass: 'bg-slate-200 dark:bg-slate-700 w-0', textColor: 'text-slate-400', progress: 0 };
    if (newPassword.length < 6) return { label: 'Muy Débil', colorClass: 'bg-rose-500 w-1/5', textColor: 'text-rose-500', progress: 20 };
    
    switch (strengthScore) {
      case 1:
      case 2:
        return { label: 'Débil', colorClass: 'bg-rose-500 w-2/5', textColor: 'text-rose-500', progress: 40 };
      case 3:
        return { label: 'Medio', colorClass: 'bg-amber-500 w-3/5', textColor: 'text-amber-500', progress: 60 };
      case 4:
        return { label: 'Fuerte', colorClass: 'bg-emerald-500 w-4/5', textColor: 'text-emerald-500', progress: 80 };
      case 5:
        return { label: 'Muy Seguro', colorClass: 'bg-blue-600 w-full', textColor: 'text-blue-600', progress: 100 };
      default:
        return { label: 'Débil', colorClass: 'bg-rose-500 w-2/5', textColor: 'text-rose-500', progress: 40 };
    }
  };

  const strengthInfo = getStrengthInfo();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Explicit and complete validation on submit
    if (!currentPassword) {
      setErrorMessage('Debe ingresar su contraseña actual.');
      return;
    }

    if (!isCurrentPasswordCorrect) {
      setErrorMessage('La contraseña actual es incorrecta o inválida.');
      return;
    }

    if (!newPassword) {
      setErrorMessage('Debe ingresar una nueva contraseña.');
      return;
    }

    if (!meetsAllRequirements) {
      setErrorMessage('La nueva contraseña no cumple con todos los requisitos de seguridad obligatorios.');
      return;
    }

    if (WEAK_PASSWORDS.includes(newPassword.toLowerCase()) || newPassword.toLowerCase().includes(currentUser.username.toLowerCase())) {
      setErrorMessage('La contraseña es demasiado común o contiene su identificador de usuario. Elija una contraseña segura.');
      return;
    }

    if (isReusingOld) {
      setErrorMessage('No puede reutilizar su contraseña temporal o actual como la nueva contraseña.');
      return;
    }

    if (!isMatch) {
      setErrorMessage('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    // Pass validated updated user to App.tsx
    onPasswordChanged({
      ...currentUser,
      password: newPassword,
      requiere_cambio_password: false
    });
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      // Direct physical blockade to prevent any automatic form submit key bypass
      e.preventDefault();
      setErrorMessage('Por motivos de seguridad, el envío automático del formulario mediante la tecla Enter está deshabilitado. Debe usar el botón "Guardar Contraseña" de manera explícita.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 overflow-hidden"
      >
        
        {/* Progress header or lock indicator */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/10 dark:bg-black/20 text-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md border border-white/10">
            <KeyRound className="w-6 h-6 text-white animate-pulse" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-wider text-white">Cambio Obligatorio de Contraseña</h2>
          <p className="text-[10px] text-indigo-200 mt-1 max-w-[280px] mx-auto">
            Por directiva de ciberseguridad, debe cambiar su contraseña de primer acceso antes de utilizar el sistema.
          </p>
        </div>

        {/* User Card */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Colaborador Autenticado</span>
            <span className="font-extrabold text-slate-700 dark:text-slate-200">{currentUser.nombre}</span>
          </div>
          <div className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono font-bold text-[9.5px]">
            {currentUser.username} ({currentUser.rol})
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSave} onKeyDown={handleFormKeyDown} className="p-6 space-y-4">
          
          {/* Validation Feedback message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 rounded-lg flex items-start gap-2 text-[10.5px] leading-snug animate-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="font-semibold">{errorMessage}</div>
            </div>
          )}

          {/* Current Password Field */}
          <div>
            <label className="block text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-wide mb-1">
              Contraseña Temporal o Actual *
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setErrorMessage('');
                }}
                autoComplete="current-password"
                placeholder="Ingrese la clave actual (ej: admin)"
                className="w-full pl-3 pr-10 py-2 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password field */}
          <div>
            <label className="block text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-wide mb-1">
              Nueva Contraseña Segura *
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrorMessage('');
                }}
                autoComplete="new-password"
                placeholder="Escriba la nueva contraseña"
                className="w-full pl-3 pr-10 py-2 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password field */}
          <div>
            <label className="block text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-wide mb-1">
              Confirme la Nueva Contraseña *
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMessage('');
                }}
                autoComplete="new-password"
                placeholder="Repita la clave exacta"
                className="w-full pl-3 pr-10 py-2 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 font-mono text-xs"
                disabled={!meetsAllRequirements}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                disabled={!meetsAllRequirements}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Key Validator Checker Block (Visual UI design) */}
          <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
            
            {/* Strength indicator line */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold uppercase text-slate-400 dark:text-slate-500">Robustez de Clave</span>
                <span className={`font-black uppercase ${strengthInfo.textColor}`}>{strengthInfo.label}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden transition-all duration-300">
                <div className={`h-full rounded-full transition-all duration-350 ${strengthInfo.colorClass}`}></div>
              </div>
            </div>

            {/* Criteria checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]/relaxed font-medium pt-1 border-t border-slate-150 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                <span className={hasMinLength ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-450 dark:text-slate-500'}>Min. 8 caracteres</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasUppercase ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                <span className={hasUppercase ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-450 dark:text-slate-500'}>Letra Mayúscula (A-Z)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasLowercase ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                <span className={hasLowercase ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-450 dark:text-slate-500'}>Letra Minúscula (a-z)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                <span className={hasNumber ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-450 dark:text-slate-500'}>Al menos un Número</span>
              </div>
              <div className="flex items-center gap-1.5 sm:col-span-2">
                {hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                <span className={hasSpecial ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-450 dark:text-slate-500'}>Carácter Especial (!@#$@%&amp;)</span>
              </div>
            </div>

            {/* Check weak/reused */}
            {newPassword && (
              <div className="pt-2 border-t border-slate-150 dark:border-slate-800 flex flex-col gap-1 text-[9px] font-bold uppercase leading-none">
                {isReusingOld && (
                  <div className="text-rose-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> ¡No puede reutilizar su contraseña actual!
                  </div>
                )}
                {WEAK_PASSWORDS.includes(newPassword.toLowerCase()) && (
                  <div className="text-rose-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> ¡Contraseña demasiado débil o común!
                  </div>
                )}
                {!isReusingOld && !WEAK_PASSWORDS.includes(newPassword.toLowerCase()) && (
                  <div className="text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Contraseña apta para seguridad corporativa
                  </div>
                )}
              </div>
            )}

            {/* Coincidence checker */}
            <div className="pt-2 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between text-[10.5px]">
              <span className="font-bold text-slate-500 dark:text-slate-450">Confirmación de Claves:</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                newPassword && isMatch 
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200' 
                  : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200'
              }`}>
                {newPassword && isMatch ? (
                  <>✓ COINCIDEN</>
                ) : (
                  <>✗ NO COINCIDEN</>
                )}
              </span>
            </div>

          </div>

          {/* Action Button Controls */}
          <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex flex-col gap-2">
            <button
              type="submit"
              disabled={!meetsAllRequirements || !isMatch || isReusingOld || !isCurrentPasswordCorrect}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none uppercase tracking-wider text-[11px] cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Guardar Contraseña y Continuar
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all text-[10.5px] cursor-pointer block text-center"
            >
              Cerrar Sesión (Cambiar de Usuario)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
