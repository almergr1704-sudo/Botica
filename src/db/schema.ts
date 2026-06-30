import { pgTable, serial, text, integer, boolean, timestamp, numeric, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Sucursales (Branches)
export const sucursales = pgTable("sucursales", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  direccion: text("direccion"),
  ubigeo: text("ubigeo"),
  ciudad: text("ciudad"),
  telefono: text("telefono"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sucursales_nombre").on(table.nombre),
]);

// 2. Roles
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  descripcion: text("descripcion"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. Permisos (Permissions)
export const permisos = pgTable("permisos", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  descripcion: text("descripcion"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. Roles - Permisos (Join table)
export const rolesPermisos = pgTable("roles_permisos", {
  rolId: integer("rol_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
  permisoId: integer("permiso_id").references(() => permisos.id, { onDelete: "cascade" }).notNull(),
}, (table) => [
  index("idx_roles_permisos_ids").on(table.rolId, table.permisoId),
]);

// 5. Usuarios (Users)
export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  uid: text("uid").unique(), // Firebase Auth UID link
  username: text("username").notNull().unique(),
  nombre: text("nombre").notNull(),
  email: text("email"),
  rolId: integer("rol_id").references(() => roles.id),
  id_sucursal: text("id_sucursal").references(() => sucursales.id),
  activo: boolean("activo").default(true).notNull(),
  requiere_cambio_password: boolean("requiere_cambio_password").default(false).notNull(),
  password: text("password"), // Bcrypt-hashed
  fecha_cambio_password: timestamp("fecha_cambio_password"),
  estado_registro: text("estado_registro").default("activo").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_usuarios_username").on(table.username),
]);

// 6. Clientes (Clients)
export const clientes = pgTable("clientes", {
  id: text("id").primaryKey(),
  tipo_documento: text("tipo_documento").notNull(), // 'DNI' | 'RUC'
  numero_documento: text("numero_documento").notNull().unique(),
  nombre_razon_social: text("nombre_razon_social").notNull(),
  direccion: text("direccion"),
  email: text("email"),
  es_socio: boolean("es_socio").default(false).notNull(),
  estado_registro: text("estado_registro").default("activo").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_clientes_documento").on(table.numero_documento),
  index("idx_clientes_nombre").on(table.nombre_razon_social),
]);

// 7. Proveedores (Suppliers)
export const proveedores = pgTable("proveedores", {
  id: text("id").primaryKey(),
  ruc: text("ruc").notNull().unique(),
  razon_social: text("razon_social").notNull(),
  direccion: text("direccion"),
  telefono: text("telefono"),
  email: text("email"),
  contacto: text("contacto"),
  estado_registro: text("estado_registro").default("activo").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_proveedores_ruc").on(table.ruc),
  index("idx_proveedores_razon_social").on(table.razon_social),
]);

// 8. Categorías
export const categorias = pgTable("categorias", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  descripcion: text("descripcion"),
});

// 9. Marcas
export const marcas = pgTable("marcas", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
});

// 10. Laboratorios
export const laboratorios = pgTable("laboratorios", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
});

// 11. Medicamentos / Productos
export const medicamentos = pgTable("medicamentos", {
  id: text("id").primaryKey(),
  codigo_barras: text("codigo_barras").unique(),
  nombre: text("nombre").notNull(),
  principio_activo: text("principio_activo"),
  concentracion: text("concentracion"),
  presentacion: text("presentacion"),
  laboratorioId: integer("laboratorio_id").references(() => laboratorios.id),
  categoriaId: integer("categoria_id").references(() => categorias.id),
  marcaId: integer("marca_id").references(() => marcas.id),
  registro_sanitario: text("registro_sanitario"),
  requiere_receta: boolean("requiere_receta").default(false).notNull(),
  precio_sugerido: numeric("precio_sugerido", { precision: 10, scale: 2 }).default("0.00").notNull(),
  activo: boolean("activo").default(true).notNull(),
  estado_registro: text("estado_registro").default("activo").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_medicamentos_codigo").on(table.codigo_barras),
  index("idx_medicamentos_nombre").on(table.nombre),
]);

// 12. Lotes (Lots)
export const lotes = pgTable("lotes", {
  id: text("id").primaryKey(),
  id_producto: text("id_producto").references(() => medicamentos.id, { onDelete: "cascade" }).notNull(),
  id_sucursal: text("id_sucursal").references(() => sucursales.id, { onDelete: "cascade" }).notNull(),
  numero_lote: text("numero_lote").notNull(),
  fecha_vencimiento: text("fecha_vencimiento").notNull(), // YYYY-MM-DD
  stock: integer("stock").default(0).notNull(),
  stock_inicial: integer("stock_inicial").default(0).notNull(),
  precio_compra: numeric("precio_compra", { precision: 10, scale: 2 }).default("0.00").notNull(),
  precio_venta: numeric("precio_venta", { precision: 10, scale: 2 }).default("0.00").notNull(),
  estado_registro: text("estado_registro").default("activo").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lotes_numero").on(table.numero_lote),
  index("idx_lotes_vencimiento").on(table.fecha_vencimiento),
]);

// 13. Inventario general acumulado por sucursal
export const inventarios = pgTable("inventarios", {
  id: serial("id").primaryKey(),
  id_producto: text("id_producto").references(() => medicamentos.id, { onDelete: "cascade" }).notNull(),
  id_sucursal: text("id_sucursal").references(() => sucursales.id, { onDelete: "cascade" }).notNull(),
  stock_total: integer("stock_total").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 14. Movimientos de Inventario
export const movimientosInventario = pgTable("movimientos_inventario", {
  id: serial("id").primaryKey(),
  id_producto: text("id_producto").references(() => medicamentos.id).notNull(),
  id_sucursal: text("id_sucursal").references(() => sucursales.id).notNull(),
  id_lote: text("id_lote").references(() => lotes.id),
  tipo_movimiento: text("tipo_movimiento").notNull(), // INGRESO, SALIDA, AJUSTE, TRASLADO
  cantidad: integer("cantidad").notNull(),
  id_usuario: integer("id_usuario").references(() => usuarios.id),
  fecha: timestamp("fecha").defaultNow().notNull(),
  motivo: text("motivo"),
});

// 15. Compras (Purchases)
export const compras = pgTable("compras", {
  id: text("id").primaryKey(),
  id_sucursal: text("id_sucursal").references(() => sucursales.id).notNull(),
  id_proveedor: text("id_proveedor").references(() => proveedores.id).notNull(),
  id_usuario: integer("id_usuario").references(() => usuarios.id),
  tipo_comprobante: text("tipo_comprobante").notNull(), // 'Factura' | 'Boleta'
  serie_comprobante: text("serie_comprobante").notNull(),
  numero_comprobante: text("numero_comprobante").notNull(),
  fecha_emision: text("fecha_emision").notNull(), // YYYY-MM-DD
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).default("0.00").notNull(),
  igv: numeric("igv", { precision: 10, scale: 2 }).default("0.00").notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).default("0.00").notNull(),
  estado: text("estado").default("Completado").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_compras_fecha").on(table.fecha_emision),
  index("idx_compras_documento").on(table.serie_comprobante, table.numero_comprobante),
]);

// 16. Detalle de Compras (Purchase Details)
export const detalleCompras = pgTable("detalle_compras", {
  id: serial("id").primaryKey(),
  id_compra: text("id_compra").references(() => compras.id, { onDelete: "cascade" }).notNull(),
  id_producto: text("id_producto").references(() => medicamentos.id).notNull(),
  id_lote: text("id_lote").references(() => lotes.id).notNull(),
  cantidad: integer("cantidad").notNull(),
  precio_unitario: numeric("precio_unitario", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
});

// 17. Ventas (Sales)
export const ventas = pgTable("ventas", {
  id: text("id").primaryKey(),
  id_sucursal: text("id_sucursal").references(() => sucursales.id).notNull(),
  id_usuario: integer("id_usuario").references(() => usuarios.id).notNull(),
  id_cliente: text("id_cliente").references(() => clientes.id),
  tipo_comprobante: text("tipo_comprobante").notNull(), // 'Boleta' | 'Factura' | 'NotaCredito'
  serie_comprobante: text("serie_comprobante").notNull(),
  numero_comprobante: text("numero_comprobante").notNull(),
  fecha_emision: text("fecha_emision").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).default("0.00").notNull(),
  igv: numeric("igv", { precision: 10, scale: 2 }).default("0.00").notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).default("0.00").notNull(),
  hash_sunat: text("hash_sunat"),
  estado_sunat: text("estado_sunat").default("Pendiente").notNull(), // 'Aceptado' | 'Pendiente' | 'Rechazado'
  id_venta_referencia: text("id_venta_referencia"), // Nota de crédito reference
  motivo_anulacion: text("motivo_anulacion"),
  estado: text("estado").default("Valido").notNull(), // 'Valido' | 'Anulado'
  estado_registro: text("estado_registro").default("activo").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ventas_fecha").on(table.fecha_emision),
  index("idx_ventas_documento").on(table.serie_comprobante, table.numero_comprobante),
]);

// 18. Detalle de Ventas (Sale Details)
export const detalleVentas = pgTable("detalle_ventas", {
  id: serial("id").primaryKey(),
  id_venta: text("id_venta").references(() => ventas.id, { onDelete: "cascade" }).notNull(),
  id_producto: text("id_producto").references(() => medicamentos.id).notNull(),
  id_lote: text("id_lote").references(() => lotes.id).notNull(),
  cantidad: integer("cantidad").notNull(),
  precio_unitario: numeric("precio_unitario", { precision: 10, scale: 2 }).notNull(),
  igv_item: numeric("igv_item", { precision: 10, scale: 2 }).notNull(),
  total_item: numeric("total_item", { precision: 10, scale: 2 }).notNull(),
});

// 19. Cajas (Cash Sessions)
export const cajas = pgTable("cajas", {
  id: serial("id").primaryKey(),
  id_sucursal: text("id_sucursal").references(() => sucursales.id).notNull(),
  id_usuario: integer("id_usuario").references(() => usuarios.id).notNull(),
  fecha_apertura: timestamp("fecha_apertura").defaultNow().notNull(),
  fecha_cierre: timestamp("fecha_cierre"),
  monto_apertura: numeric("monto_apertura", { precision: 10, scale: 2 }).default("0.00").notNull(),
  monto_cierre: numeric("monto_cierre", { precision: 10, scale: 2 }),
  ventas_efectivo: numeric("ventas_efectivo", { precision: 10, scale: 2 }).default("0.00").notNull(),
  ventas_tarjeta: numeric("ventas_tarjeta", { precision: 10, scale: 2 }).default("0.00").notNull(),
  ventas_transferencia: numeric("ventas_transferencia", { precision: 10, scale: 2 }).default("0.00").notNull(),
  otros_ingresos: numeric("otros_ingresos", { precision: 10, scale: 2 }).default("0.00").notNull(),
  egresos: numeric("egresos", { precision: 10, scale: 2 }).default("0.00").notNull(),
  estado: text("estado").default("Abierta").notNull(), // 'Abierta' | 'Cerrada'
});

// 20. Métodos de Pago
export const metodosPago = pgTable("metodos_pago", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(), // 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Yape/Plin'
  activo: boolean("activo").default(true).notNull(),
});

// 21. Transacciones de Caja (Cash Ledger Transactions)
export const cajaTransacciones = pgTable("caja_transacciones", {
  id: serial("id").primaryKey(),
  id_caja: integer("id_caja").references(() => cajas.id, { onDelete: "cascade" }).notNull(),
  tipo: text("tipo").notNull(), // 'INGRESO' | 'EGRESO'
  monto: numeric("monto", { precision: 10, scale: 2 }).notNull(),
  metodo_pago_id: integer("metodo_pago_id").references(() => metodosPago.id),
  referencia: text("referencia"),
  fecha: timestamp("fecha").defaultNow().notNull(),
});

// 22. Kardex (Inventory Card)
export const kardex = pgTable("kardex", {
  id: serial("id").primaryKey(),
  id_sucursal: text("id_sucursal").references(() => sucursales.id).notNull(),
  id_producto: text("id_producto").references(() => medicamentos.id).notNull(),
  id_lote: text("id_lote").references(() => lotes.id).notNull(),
  tipo_transaccion: text("tipo_transaccion").notNull(), // 'COMPRA' | 'VENTA' | 'TRASLADO_INGRESO' | 'TRASLADO_SALIDA' | 'AJUSTE_INGRESO' | 'AJUSTE_SALIDA'
  documento_referencia: text("documento_referencia"),
  cantidad_entrada: integer("cantidad_entrada").default(0).notNull(),
  precio_entrada: numeric("precio_entrada", { precision: 10, scale: 2 }).default("0.00").notNull(),
  cantidad_salida: integer("cantidad_salida").default(0).notNull(),
  precio_salida: numeric("precio_salida", { precision: 10, scale: 2 }).default("0.00").notNull(),
  cantidad_saldo: integer("cantidad_saldo").notNull(),
  precio_saldo: numeric("precio_saldo", { precision: 10, scale: 2 }).notNull(),
  valor_total_saldo: numeric("valor_total_saldo", { precision: 10, scale: 2 }).notNull(),
  fecha: timestamp("fecha").defaultNow().notNull(),
}, (table) => [
  index("idx_kardex_producto_sucursal").on(table.id_producto, table.id_sucursal),
  index("idx_kardex_fecha").on(table.fecha),
]);

// 23. Configuración General (General Parameters)
export const configuracionGeneral = pgTable("configuracion_general", {
  clave: text("clave").primaryKey(),
  valor: text("valor").notNull(),
  descripcion: text("descripcion"),
});

// 24. Auditoría (Audit Logs)
export const auditorias = pgTable("auditorias", {
  id: serial("id").primaryKey(),
  id_usuario: integer("id_usuario").references(() => usuarios.id),
  usuario_nombre: text("usuario_nombre"),
  modulo: text("modulo"),
  accion: text("accion").notNull(),
  detalle: text("detalle").notNull(),
  fecha: timestamp("fecha").defaultNow().notNull(),
  ip_dispositivo: text("ip_dispositivo"),
}, (table) => [
  index("idx_auditorias_fecha").on(table.fecha),
]);

// 25. Historial de Cambios (Detailed log of DDL/DML data differences)
export const historialCambios = pgTable("historial_cambios", {
  id: serial("id").primaryKey(),
  tabla_afectada: text("tabla_afectada").notNull(),
  registro_id: text("registro_id").notNull(),
  accion: text("accion").notNull(), // 'INSERT' | 'UPDATE' | 'DELETE'
  valor_anterior: text("valor_anterior"), // JSON string
  valor_nuevo: text("valor_nuevo"),       // JSON string
  id_usuario: integer("id_usuario").references(() => usuarios.id),
  fecha: timestamp("fecha").defaultNow().notNull(),
});

// 26. Series y Correlativos (Invoice and Receipt sequence series tracker)
export const seriesCorrelativos = pgTable("series_correlativos", {
  id: serial("id").primaryKey(),
  id_sucursal: text("id_sucursal").references(() => sucursales.id).notNull(),
  tipo_documento: text("tipo_documento").notNull(), // 'Boleta' | 'Factura' | 'NotaCredito'
  serie: text("serie").notNull(),
  correlativo_actual: integer("correlativo_actual").default(0).notNull(),
});

// Relationships
export const sucursalesRelations = relations(sucursales, ({ many }) => ({
  usuarios: many(usuarios),
  lotes: many(lotes),
}));

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  sucursal: one(sucursales, {
    fields: [usuarios.id_sucursal],
    references: [sucursales.id],
  }),
  rol: one(roles, {
    fields: [usuarios.rolId],
    references: [roles.id],
  }),
  auditorias: many(auditorias),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  usuarios: many(usuarios),
  permisos: many(rolesPermisos),
}));

export const permisosRelations = relations(permisos, ({ many }) => ({
  roles: many(rolesPermisos),
}));

export const rolesPermisosRelations = relations(rolesPermisos, ({ one }) => ({
  rol: one(roles, {
    fields: [rolesPermisos.rolId],
    references: [roles.id],
  }),
  permiso: one(permisos, {
    fields: [rolesPermisos.permisoId],
    references: [permisos.id],
  }),
}));

export const medicamentosRelations = relations(medicamentos, ({ one, many }) => ({
  categoria: one(categorias, {
    fields: [medicamentos.categoriaId],
    references: [categorias.id],
  }),
  marca: one(marcas, {
    fields: [medicamentos.marcaId],
    references: [marcas.id],
  }),
  laboratorio: one(laboratorios, {
    fields: [medicamentos.laboratorioId],
    references: [laboratorios.id],
  }),
  lotes: many(lotes),
}));

export const lotesRelations = relations(lotes, ({ one }) => ({
  producto: one(medicamentos, {
    fields: [lotes.id_producto],
    references: [medicamentos.id],
  }),
  sucursal: one(sucursales, {
    fields: [lotes.id_sucursal],
    references: [sucursales.id],
  }),
}));

export const ventasRelations = relations(ventas, ({ one, many }) => ({
  sucursal: one(sucursales, {
    fields: [ventas.id_sucursal],
    references: [sucursales.id],
  }),
  usuario: one(usuarios, {
    fields: [ventas.id_usuario],
    references: [usuarios.id],
  }),
  cliente: one(clientes, {
    fields: [ventas.id_cliente],
    references: [clientes.id],
  }),
  detalles: many(detalleVentas),
}));

export const detalleVentasRelations = relations(detalleVentas, ({ one }) => ({
  venta: one(ventas, {
    fields: [detalleVentas.id_venta],
    references: [ventas.id],
  }),
  producto: one(medicamentos, {
    fields: [detalleVentas.id_producto],
    references: [medicamentos.id],
  }),
  lote: one(lotes, {
    fields: [detalleVentas.id_lote],
    references: [lotes.id],
  }),
}));

export const comprasRelations = relations(compras, ({ one, many }) => ({
  sucursal: one(sucursales, {
    fields: [compras.id_sucursal],
    references: [sucursales.id],
  }),
  proveedor: one(proveedores, {
    fields: [compras.id_proveedor],
    references: [proveedores.id],
  }),
  usuario: one(usuarios, {
    fields: [compras.id_usuario],
    references: [usuarios.id],
  }),
  detalles: many(detalleCompras),
}));

export const detalleComprasRelations = relations(detalleCompras, ({ one }) => ({
  compra: one(compras, {
    fields: [detalleCompras.id_compra],
    references: [compras.id],
  }),
  producto: one(medicamentos, {
    fields: [detalleCompras.id_producto],
    references: [medicamentos.id],
  }),
  lote: one(lotes, {
    fields: [detalleCompras.id_lote],
    references: [lotes.id],
  }),
}));
