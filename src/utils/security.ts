import { Usuario, Auditoria } from '../types/pharmacy';

// 1. Password Hashing (Simulating a secure SHA-256 PBKDF2 hash representation)
export function hashPassword(password: string): string {
  if (!password) return '';
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex-like hash with a prefix indicating encryption
  return `sha256-sim-${Math.abs(hash).toString(16)}`;
}

export function verifyPassword(entered: string, stored: string): boolean {
  if (!stored) return false;
  // If stored is the legacy admin/plain text password, we compare directly.
  // Otherwise, we compare the hashed version.
  if (stored.startsWith('sha256-sim-')) {
    return hashPassword(entered) === stored;
  }
  return entered === stored;
}

export function isTemporaryPassword(password: string, username: string): boolean {
  if (!password) return true;
  
  // List of initial default passwords (plain or lowercase)
  const defaultPlaintextPasswords = [
    'admin', 
    'adminpassword123!', 
    'mendozapassword1!', 
    'sofiapassword1!', 
    'carlospassword1!',
    'clavegenerica123!'
  ];

  const lowerEntered = password.toLowerCase();

  // If password matches any plain default
  if (defaultPlaintextPasswords.includes(lowerEntered)) {
    return true;
  }

  // Check hashed equivalents of default passwords
  for (const pw of defaultPlaintextPasswords) {
    if (password === hashPassword(pw) || password === hashPassword(pw + '!')) {
      return true;
    }
  }

  // Also check explicit hashed equivalents of standard defaults
  const hashedAdmin = hashPassword('admin');
  const hashedMendoza = hashPassword('MendozaPassword1!');
  const hashedSofia = hashPassword('SofiaPassword1!');
  const hashedCarlos = hashPassword('CarlosPassword1!');
  const hashedGeneric = hashPassword('ClaveGenerica123!');
  
  if (password === hashedAdmin || password === hashedMendoza || password === hashedSofia || password === hashedCarlos || password === hashedGeneric) {
    return true;
  }

  // Also check if they try to use their own username as password
  if (lowerEntered === username.toLowerCase() || password === hashPassword(username.toLowerCase())) {
    return true;
  }

  return false;
}

export function mustChangePassword(user: Usuario): boolean {
  // If the control flags say they must change the password, they must
  if (user.requiere_cambio_password || user.must_change_password) {
    return true;
  }
  if (user.password_changed === false) {
    return true;
  }
  // Secure backend logic check: if current password hash matches any temporal or default credentials, force it.
  if (isTemporaryPassword(user.password || '', user.username)) {
    return true;
  }
  return false;
}

// 2. Global Security Policy Config
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  maxFailedAttempts: number;
  lockoutDurationSec: number; // Duration of lockout in seconds
}

export const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  maxFailedAttempts: 3,
  lockoutDurationSec: 30
};

export function getPasswordPolicy(): PasswordPolicy {
  const saved = localStorage.getItem('erp_password_policy');
  if (saved) {
    try {
      return { ...DEFAULT_POLICY, ...JSON.parse(saved) };
    } catch (e) {
      return DEFAULT_POLICY;
    }
  }
  return DEFAULT_POLICY;
}

export function savePasswordPolicy(policy: PasswordPolicy) {
  localStorage.setItem('erp_password_policy', JSON.stringify(policy));
}

// 3. Password strength and compliance checker
export interface PolicyCheckResult {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  meetsAll: boolean;
}

export function checkPasswordPolicy(password: string, policy: PasswordPolicy): PolicyCheckResult {
  const hasMinLength = password.length >= policy.minLength;
  const hasUppercase = !policy.requireUppercase || /[A-Z]/.test(password);
  const hasLowercase = !policy.requireLowercase || /[a-z]/.test(password);
  const hasNumber = !policy.requireNumbers || /[0-9]/.test(password);
  const hasSpecial = !policy.requireSpecial || /[^A-Za-z0-9]/.test(password);

  const meetsAll = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    meetsAll
  };
}

// 4. Standalone Security Audit Logger
export function logSecurityAction(
  userId: string,
  userFullTitle: string,
  detail: string,
  actionType: 'MODIFICACION_PRECIO' | 'ACCION_ELIMINAR' | 'ALTERACION_STOCK' | 'OTRO' = 'OTRO'
) {
  const saved = localStorage.getItem('erp_audit_logs');
  let currentLogs: Auditoria[] = [];
  if (saved) {
    try {
      currentLogs = JSON.parse(saved);
    } catch (e) {}
  }
  
  const dateNow = new Date();
  const formattedDate = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}-${String(dateNow.getDate()).padStart(2, '0')} ${dateNow.toLocaleTimeString('es-PE')}`;
  
  const newLog: Auditoria = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    id_usuario: userId || 'anon-usr',
    usuario_nombre: userFullTitle || 'Acceso Autónomo',
    modulo: 'AUTENTICACION_Y_SEGURIDAD',
    accion: actionType,
    detalle: detail,
    fecha: formattedDate,
    ip_dispositivo: '192.168.1.120 (Portal de Seguridad)'
  };
  
  const updated = [newLog, ...currentLogs];
  localStorage.setItem('erp_audit_logs', JSON.stringify(updated));
}
