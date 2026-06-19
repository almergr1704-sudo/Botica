import { Producto, Lote, Cliente, Proveedor, Usuario } from '../types/pharmacy';

// Extended interfaces with version metadata to ensure concurrency control
export interface ConcurrentEntity {
  id: string;
  version?: number;
  last_updated_by?: string;
  last_updated_at?: string;
}

// Simulated active users in the national pharmacy network
export const SEED_CONCURRENT_USERS = [
  { name: 'Dr. Rosa Mendoza (Farmacéutica - Miraflores)', role: 'FarmaceuticoRegente', code: 'COL-5819' },
  { name: 'Carlos Gaona (Jefe de Almacén - Sede Arequipa)', role: 'Almacenero', code: 'ADM-2041' },
  { name: 'Ana Luisa Portal (Cajera Líder - Sede Trujillo)', role: 'Cajero', code: 'CAJ-9402' },
  { name: 'Dra. Patricia Cruz (Logística - Sede Principal)', role: 'Administrador', code: 'REG-1049' }
];

/**
 * Checks if a local record has a conflict relative to persistent state in localStorage
 * @param entityType LocalStorage key suffix (e.g. "products", "lots", "clients", "suppliers", "users")
 * @param keyId Unique identifier of target record
 * @param localVersion Version of record when loading the edit modal
 */
export function checkConcurrencyConflict(
  entityType: 'products' | 'lots' | 'clients' | 'suppliers' | 'users',
  keyId: string,
  localVersion: number
): { hasConflict: boolean; freshRecord: any } {
  try {
    const rawData = localStorage.getItem(`erp_${entityType}`);
    if (!rawData) return { hasConflict: false, freshRecord: null };

    const parsedList = JSON.parse(rawData);
    const freshRecord = parsedList.find((item: any) => item.id === keyId);

    if (!freshRecord) {
      return { hasConflict: false, freshRecord: null };
    }

    const currentServerVersion = freshRecord.version ?? 1;
    
    // Conflict exists if the server/persisted version has been incremented beyond the local copy's load version
    const hasConflict = currentServerVersion > localVersion;
    
    return { hasConflict, freshRecord };
  } catch (e) {
    console.error('Error during concurrency checking:', e);
    return { hasConflict: false, freshRecord: null };
  }
}

/**
 * Triggers a random external edit in localStorage to simulate real-time concurrency
 * @returns description string of the simulated external action
 */
export function simulateExternalWrite(): { message: string; type: string; entityId: string } | null {
  const entityTypes = ['products', 'lots', 'clients', 'suppliers', 'users'] as const;
  const chosenType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
  const rawData = localStorage.getItem(`erp_${chosenType}`);
  
  if (!rawData) return null;
  
  try {
    const list = JSON.parse(rawData);
    const filteredList = list.filter((item: any) => item.estado_registro !== 'eliminado_logico');
    if (filteredList.length === 0) return null;
    
    const index = Math.floor(Math.random() * filteredList.length);
    const targetItem = filteredList[index];
    
    const randomUser = SEED_CONCURRENT_USERS[Math.floor(Math.random() * SEED_CONCURRENT_USERS.length)];
    
    // Increment version and attach concurrency info
    targetItem.version = (targetItem.version ?? 1) + 1;
    targetItem.last_updated_by = randomUser.name;
    targetItem.last_updated_at = new Date().toISOString();
    
    let detailMessage = '';
    
    // Apply dummy edits based on type
    if (chosenType === 'products') {
      const prod = targetItem as Producto & ConcurrentEntity;
      const originalPrice = prod.precio_sugerido;
      prod.precio_sugerido = Number((originalPrice * (1 + (Math.random() * 0.1 - 0.05))).toFixed(2));
      detailMessage = `El producto "${prod.nombre}" fue reajustado a S/ ${prod.precio_sugerido} por ${randomUser.name}`;
    } else if (chosenType === 'lots') {
      const lot = targetItem as Lote & ConcurrentEntity;
      const originalStock = lot.stock;
      const offset = Math.floor(Math.random() * 10) + 1;
      lot.stock = Math.max(0, originalStock + (Math.random() > 0.4 ? offset : -offset));
      detailMessage = `El lote "${lot.numero_lote}" del stock de medicamentos recibió un conteo de inventario (Nuevo Stock: ${lot.stock}) por ${randomUser.name}`;
    } else if (chosenType === 'clients') {
      const client = targetItem as Cliente & ConcurrentEntity;
      client.es_socio = !client.es_socio;
      detailMessage = `La afiliación del cliente "${client.nombre_razon_social}" fue actualizada a ${client.es_socio ? 'SOCIO' : 'ESTÁNDAR'} por ${randomUser.name}`;
    } else if (chosenType === 'suppliers') {
      const supplier = targetItem as Proveedor & ConcurrentEntity;
      supplier.direccion = supplier.direccion + ' (Revisado)';
      detailMessage = `La dirección fiscal del proveedor Corporativo "${supplier.razon_social}" fue validada por ${randomUser.name}`;
    } else if (chosenType === 'users') {
      const user = targetItem as Usuario & ConcurrentEntity;
      user.activo = !user.activo;
      detailMessage = `El estado del personal "${user.username}" fue cambiado a ${user.activo ? 'ACTIVO' : 'INACTIVO'} por ${randomUser.name}`;
    }
    
    // Save back to list
    const originalListIdx = list.findIndex((item: any) => item.id === targetItem.id);
    if (originalListIdx !== -1) {
      list[originalListIdx] = targetItem;
    }
    
    localStorage.setItem(`erp_${chosenType}`, JSON.stringify(list));
    
    // Fire real-time synchronization event so all modular views hear about the server change
    window.dispatchEvent(new Event('sync_erp_data'));
    
    return {
      message: detailMessage,
      type: chosenType,
      entityId: targetItem.id
    };
  } catch (e) {
    console.error('Error simulating external write:', e);
    return null;
  }
}
