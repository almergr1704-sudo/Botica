export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  ubigeo: string;
  ciudad: string;
  telefono: string;
}

export interface Producto {
  id: string;
  codigo_barras: string;
  nombre: string;
  principio_activo: string;
  concentracion: string;
  presentacion: string; // e.g. "Caja x 100 tabletas", "Frasco x 120ml"
  laboratorio: string; // e.g. "Portugal", "Hersil", "Lansier"
  registro_sanitario: string; // e.g. "EE-04821" (formato DIGEMID)
  categoria: string; // e.g. "Analgesico", "Antibiotico", "Suplemento"
  requiere_receta: boolean;
  precio_sugerido: number;
}

export interface Lote {
  id: string;
  id_producto: string;
  id_sucursal: string;
  numero_lote: string; // e.g. "L-847291"
  fecha_vencimiento: string; // YYYY-MM-DD
  stock: number;
  stock_inicial: number;
  precio_compra: number;
  precio_venta: number;
}

export interface Cliente {
  id: string;
  tipo_documento: 'DNI' | 'RUC';
  numero_documento: string;
  nombre_razon_social: string;
  direccion?: string;
  email?: string;
}

export interface Proveedor {
  id: string;
  ruc: string;
  razon_social: string;
  direccion: string;
  telefono: string;
  email: string;
  contacto?: string;
}

export interface Usuario {
  id: string;
  username: string;
  nombre: string;
  rol: 'Administrador' | 'FarmaceuticoRegente' | 'Cajero';
  id_sucursal: string;
  activo: boolean;
}

export interface Venta {
  id: string;
  id_sucursal: string;
  id_usuario: string;
  id_cliente?: string;
  tipo_comprobante: 'Boleta' | 'Factura';
  serie_comprobante: string; // e.g., "F001" or "B001"
  numero_comprobante: string; // e.g., "000028"
  fecha_emision: string;
  subtotal: number;
  igv: number;
  total: number;
  hash_sunat: string; // simulated SUNAT hash signature
  estado_sunat: 'Aceptado' | 'Pendiente' | 'Rechazado';
}

export interface DetalleVenta {
  id: string;
  id_venta: string;
  id_producto: string;
  id_lote: string; // stock is deducted from this specific lot!
  numero_lote: string;
  cantidad: number;
  precio_unitario: number;
  igv_item: number;
  total_item: number;
}

export interface Auditoria {
  id: string;
  id_usuario: string;
  usuario_nombre: string;
  modulo: string;
  accion: 'MODIFICACION_PRECIO' | 'ACCION_ELIMINAR' | 'ALTERACION_STOCK' | 'OTRO';
  detalle: string;
  fecha: string;
  ip_dispositivo?: string;
}
