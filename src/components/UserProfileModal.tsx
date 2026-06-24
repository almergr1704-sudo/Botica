import React, { useState } from 'react';
import { X, Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, Check, Info } from 'lucide-react';
import { Usuario } from '../types/pharmacy';
import { verifyPassword } from '../utils/security';

interface UserProfileModalProps {
  currentUser: Usuario;
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged: (updatedUser: Usuario) => void;
}

const WEAK_PASSWORDS = [
  'admin', 'admin123', 'password', '12345678', 'contraseña', 
  'sigifar', 'sigifar123', 'alfafarma', 'mendoza123', 'regente123'
];

export default function UserProfileModal({
  currentUser,
  isOpen,
  onClose,
  onPasswordChanged
}: UserProfileModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  // Real-time validations
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const meetsAllRequirements = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const isMatch = newPassword && newPassword === confirmPassword;
  const isReusingOld = newPassword && verifyPassword(newPassword, currentUser.password || '');

  // Strength score
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
    if (!newPassword) return { label: 'Sin ingresar', colorClass: 'bg-slate-200 dark:bg-slate-700 w-0', textColor: 'text-slate-450', progress: 0 };
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // 1. Verify current password
    const isCurrentCorrect = verifyPassword(currentPassword, currentUser.password || '');
    if (!isCurrentCorrect) {
      setErrorMessage('La contraseña actual ingresada es incorrecta.');
      return;
    }

    // 2. Verify meets requirements
    if (!meetsAllRequirements) {
      setErrorMessage('La nueva contraseña no cumple con todas las directivas de seguridad corporativas.');
      return;
    }

    // 3. Verify weak/common
    if (WEAK_PASSWORDS.includes(newPassword.toLowerCase()) || newPassword.toLowerCase().includes(currentUser.username.toLowerCase())) {
      setErrorMessage('La contraseña elegida es una clave común o contiene su identificador. Por seguridad, elija otra.');
      return;
    }

    // 4. Verify identical to old
    if (isReusingOld) {
      setErrorMessage('No puede reutilizar su contraseña actual por políticas de alternancia cíclica.');
      return;
    }

    // 5. Verify match
    if (!isMatch) {
      setErrorMessage('La confirmación no coincide exactamente con la nueva contraseña.');
      return;
    }

    // Success! Update password
    setSuccessMessage('Su contraseña ha sido modificada con éxito. Por seguridad, su sesión se cerrará automáticamente en 3 segundos.');
    
    setTimeout(() => {
      onPasswordChanged({
        ...currentUser,
        password: newPassword, // Will be hashed in App.tsx
        requiere_cambio_password: false
      });
      onClose();
    }, 3000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const isCurrentCorrect = verifyPassword(currentPassword, currentUser.password || '');
      if (!isCurrentCorrect || !meetsAllRequirements || !isMatch || isReusingOld) {
        e.preventDefault();
        setErrorMessage('Por favor, verifique y cumpla todos los requisitos de seguridad antes de procesar el formulario.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-250"
        onKeyDown={handleKeyDown}
      >
        {/* Header bar */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-700/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-700/60 rounded-lg text-slate-200">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider">Gestión de Claves</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide leading-none mt-0.5">Seguridad y Políticas de Acceso</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card brief */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[8px] uppercase tracking-wider font-extrabold">Usuario Activo</span>
            <span className="font-extrabold text-slate-700 dark:text-slate-200">{currentUser.nombre}</span>
          </div>
          <div className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono font-bold text-[9px]">
            {currentUser.username} • {currentUser.rol}
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          
          {/* Status and feedback messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-250 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 rounded-lg flex items-start gap-2 text-[10.5px] leading-snug animate-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="font-semibold">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-250 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-start gap-2 text-[10.5px] leading-snug animate-in slide-in-from-top-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="font-semibold">{successMessage}</div>
            </div>
          )}

          {/* Current Password Field */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Contraseña Actual *
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
                placeholder="Introduzca su contraseña vigente"
                className="w-full pl-3 pr-10 py-1.5 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 font-mono text-xs"
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

          {/* New Password Field */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Nueva Contraseña de Acceso *
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
                placeholder="Escriba nueva clave segura"
                className="w-full pl-3 pr-10 py-1.5 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 font-mono text-xs"
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

          {/* Confirm New Password Field */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Confirmar Nueva Contraseña *
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
                placeholder="Repita la clave con exactitud"
                className="w-full pl-3 pr-10 py-1.5 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 font-mono text-xs"
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

          {/* Real-time checklist and strength bar */}
          <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-400">
            
            {/* Strength Meter bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-bold">
                <span className="uppercase text-slate-400">Nivel de Seguridad</span>
                <span className={`font-black uppercase ${strengthInfo.textColor}`}>{strengthInfo.label}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${strengthInfo.colorClass}`}></div>
              </div>
            </div>

            {/* Checklist of policies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-[9.5px] font-semibold pt-2 border-t border-slate-150 dark:border-slate-850">
              <div className="flex items-center gap-1.5">
                {hasMinLength ? <Check className="w-3 h-3 text-emerald-650" /> : <X className="w-3 h-3 text-rose-500" />}
                <span className={hasMinLength ? 'text-emerald-700' : 'text-slate-450 dark:text-slate-500'}>Min. 8 caracteres</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasUppercase ? <Check className="w-3 h-3 text-emerald-650" /> : <X className="w-3 h-3 text-rose-500" />}
                <span className={hasUppercase ? 'text-emerald-700' : 'text-slate-450 dark:text-slate-500'}>Mayúscula (A-Z)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasLowercase ? <Check className="w-3 h-3 text-emerald-650" /> : <X className="w-3 h-3 text-rose-500" />}
                <span className={hasLowercase ? 'text-emerald-700' : 'text-slate-450 dark:text-slate-500'}>Minúscula (a-z)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasNumber ? <Check className="w-3 h-3 text-emerald-650" /> : <X className="w-3 h-3 text-rose-500" />}
                <span className={hasNumber ? 'text-emerald-700' : 'text-slate-450 dark:text-slate-500'}>Un Número (0-9)</span>
              </div>
              <div className="flex items-center gap-1.5 sm:col-span-2">
                {hasSpecial ? <Check className="w-3 h-3 text-emerald-650" /> : <X className="w-3 h-3 text-rose-500" />}
                <span className={hasSpecial ? 'text-emerald-700' : 'text-slate-450 dark:text-slate-500'}>Carácter Especial (ej: !@#$*)</span>
              </div>
            </div>

            {/* Check weak/reused */}
            {newPassword && (
              <div className="pt-2 border-t border-slate-150 dark:border-slate-850 flex flex-col gap-1 text-[9px] font-bold uppercase leading-none">
                {isReusingOld && (
                  <div className="text-rose-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> ¡No puede reutilizar la clave vigente!
                  </div>
                )}
                {WEAK_PASSWORDS.includes(newPassword.toLowerCase()) && (
                  <div className="text-rose-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> ¡La contraseña es muy común/vulnerable!
                  </div>
                )}
                {!isReusingOld && !WEAK_PASSWORDS.includes(newPassword.toLowerCase()) && (
                  <div className="text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Clave apta para alternancia cíclica
                  </div>
                )}
              </div>
            )}

            {/* Match validator */}
            <div className="pt-2 border-t border-slate-150 dark:border-slate-850 flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-400">Coincidencia exacta:</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                newPassword && isMatch 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {newPassword && isMatch ? '✓ COINCIDEN' : '✗ NO COINCIDEN'}
              </span>
            </div>

          </div>

          {/* Action button triggers */}
          <div className="pt-3 border-t border-slate-150 dark:border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors text-[10px] uppercase tracking-wider cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!meetsAllRequirements || !isMatch || isReusingOld || !currentPassword}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-md disabled:opacity-50 disabled:shadow-none text-[10px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Actualizar Clave
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
