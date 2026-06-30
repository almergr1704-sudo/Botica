-- ============================================================================
-- SCRIPT DE MIGRACIÓN Y CREACIÓN DE BASE DE DATOS COMPLETA: BOTICA/FARMACIA
-- MOTOR COMPATIBLE: PostgreSQL 16 o superior / Supabase / Neon
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREACIÓN DE TABLAS (Normalización 3FN)
-- ----------------------------------------------------------------------------

-- A. Sucursales (Branches)
CREATE TABLE sucursales (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    direccion TEXT,
    ubigeo VARCHAR(6),
    ciudad VARCHAR(100),
    telefono VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- B. Roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- C. Permisos (Permissions)
CREATE TABLE permisos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- D. Roles - Permisos (M:N Join)
CREATE TABLE roles_permisos (
    rol_id INT REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id INT REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

-- E. Usuarios (Users) - Almacenamiento con contraseñas en Bcrypt
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(128) UNIQUE, -- Enlace directo para Firebase Auth UID
    username VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    rol_id INT REFERENCES roles(id) ON DELETE SET NULL,
    id_sucursal VARCHAR(50) REFERENCES sucursales(id) ON DELETE SET NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    requiere_cambio_password BOOLEAN NOT NULL DEFAULT FALSE,
    password VARCHAR(255), -- Hash en formato Bcrypt (No guardar en texto plano)
    fecha_cambio_password TIMESTAMP WITH TIME ZONE,
    estado_registro VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado_registro IN ('activo', 'inactivo', 'anulado', 'eliminado_logico')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- F. Clientes
CREATE TABLE clientes (
    id VARCHAR(50) PRIMARY KEY,
    tipo_documento VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('DNI', 'RUC')),
    numero_documento VARCHAR(20) NOT NULL UNIQUE,
    nombre_razon_social VARCHAR(200) NOT NULL,
    direccion TEXT,
    email VARCHAR(150),
    es_socio BOOLEAN NOT NULL DEFAULT FALSE,
    estado_registro VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado_registro IN ('activo', 'inactivo', 'anulado', 'eliminado_logico')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- G. Proveedores
CREATE TABLE proveedores (
    id VARCHAR(50) PRIMARY KEY,
    ruc VARCHAR(20) NOT NULL UNIQUE,
    razon_social VARCHAR(200) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(150),
    contacto VARCHAR(100),
    estado_registro VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado_registro IN ('activo', 'inactivo', 'anulado', 'eliminado_logico')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- H. Categorías
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

-- I. Marcas
CREATE TABLE marcas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- J. Laboratorios
CREATE TABLE laboratorios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- K. Medicamentos (Productos)
CREATE TABLE medicamentos (
    id VARCHAR(50) PRIMARY KEY,
    codigo_barras VARCHAR(100) UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    principio_activo VARCHAR(200),
    concentracion VARCHAR(100),
    presentacion VARCHAR(150),
    laboratorio_id INT REFERENCES laboratorios(id) ON DELETE SET NULL,
    categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
    marca_id INT REFERENCES marcas(id) ON DELETE SET NULL,
    registro_sanitario VARCHAR(50),
    requiere_receta BOOLEAN NOT NULL DEFAULT FALSE,
    precio_sugerido DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (precio_sugerido >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    estado_registro VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado_registro IN ('activo', 'inactivo', 'anulado', 'eliminado_logico')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- L. Lotes (Lots)
CREATE TABLE lotes (
    id VARCHAR(50) PRIMARY KEY,
    id_producto VARCHAR(50) NOT NULL REFERENCES medicamentos(id) ON DELETE CASCADE,
    id_sucursal VARCHAR(50) NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    numero_lote VARCHAR(50) NOT NULL,
    fecha_vencimiento VARCHAR(10) NOT NULL, -- Formato YYYY-MM-DD
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0), -- Evita stock negativo a nivel de restricción física
    stock_inicial INT NOT NULL DEFAULT 0 CHECK (stock_inicial >= 0),
    precio_compra DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (precio_compra >= 0),
    precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (precio_venta >= 0),
    estado_registro VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado_registro IN ('activo', 'inactivo', 'anulado', 'eliminado_logico')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- M. Inventarios (Stock total consolidado por Sucursal)
CREATE TABLE inventarios (
    id SERIAL PRIMARY KEY,
    id_producto VARCHAR(50) NOT NULL REFERENCES medicamentos(id) ON DELETE CASCADE,
    id_sucursal VARCHAR(50) NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    stock_total INT NOT NULL DEFAULT 0 CHECK (stock_total >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_producto_sucursal UNIQUE (id_producto, id_sucursal)
);

-- N. Movimientos de Inventario
CREATE TABLE movimientos_inventario (
    id SERIAL PRIMARY KEY,
    id_producto VARCHAR(50) NOT NULL REFERENCES medicamentos(id),
    id_sucursal VARCHAR(50) NOT NULL REFERENCES sucursales(id),
    id_lote VARCHAR(50) REFERENCES lotes(id) ON DELETE SET NULL,
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('INGRESO', 'SALIDA', 'AJUSTE', 'TRASLADO')),
    cantidad INT NOT NULL,
    id_usuario INT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    motivo TEXT
);

-- O. Compras
CREATE TABLE compras (
    id VARCHAR(50) PRIMARY KEY,
    id_sucursal VARCHAR(50) NOT NULL REFERENCES sucursales(id),
    id_proveedor VARCHAR(50) NOT NULL REFERENCES proveedores(id),
    id_usuario INT REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo_comprobante VARCHAR(30) NOT NULL CHECK (tipo_comprobante IN ('Factura', 'Boleta', 'GuiaRemision')),
    serie_comprobante VARCHAR(20) NOT NULL,
    numero_comprobante VARCHAR(30) NOT NULL,
    fecha_emision VARCHAR(10) NOT NULL, -- Formato YYYY-MM-DD
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    igv DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(30) NOT NULL DEFAULT 'Completado' CHECK (estado IN ('Completado', 'Pendiente', 'Cancelado', 'Anulado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- P. Detalle de Compras
CREATE TABLE detalle_compras (
    id SERIAL PRIMARY KEY,
    id_compra VARCHAR(50) NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    id_producto VARCHAR(50) NOT NULL REFERENCES medicamentos(id),
    id_lote VARCHAR(50) NOT NULL REFERENCES lotes(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0)
);

-- Q. Ventas
CREATE TABLE ventas (
    id VARCHAR(50) PRIMARY KEY,
    id_sucursal VARCHAR(50) NOT NULL REFERENCES sucursales(id),
    id_usuario INT NOT NULL REFERENCES usuarios(id),
    id_cliente VARCHAR(50) REFERENCES clientes(id),
    tipo_comprobante VARCHAR(20) NOT NULL CHECK (tipo_comprobante IN ('Boleta', 'Factura', 'NotaCredito', 'NotaDebito')),
    serie_comprobante VARCHAR(10) NOT NULL,
    numero_comprobante VARCHAR(20) NOT NULL,
    fecha_emision VARCHAR(10) NOT NULL, -- YYYY-MM-DD
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    igv DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (igv >= 0),
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    hash_sunat VARCHAR(100),
    estado_sunat VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (estado_sunat IN ('Aceptado', 'Pendiente', 'Rechazado')),
    id_venta_referencia VARCHAR(50), -- Para enlazar Nota de Crédito/Débito a su comprobante original
    motivo_anulacion TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'Valido' CHECK (estado IN ('Valido', 'Anulado')),
    estado_registro VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado_registro IN ('activo', 'inactivo', 'anulado', 'eliminado_logico')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- R. Detalle de Ventas
CREATE TABLE detalle_ventas (
    id SERIAL PRIMARY KEY,
    id_venta VARCHAR(50) NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    id_producto VARCHAR(50) NOT NULL REFERENCES medicamentos(id),
    id_lote VARCHAR(50) NOT NULL REFERENCES lotes(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    igv_item DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_item DECIMAL(10,2) NOT NULL CHECK (total_item >= 0)
);

-- S. Cajas (Cash Registers / Cash Sessions)
CREATE TABLE cajas (
    id SERIAL PRIMARY KEY,
    id_sucursal VARCHAR(50) NOT NULL REFERENCES sucursales(id),
    id_usuario INT NOT NULL REFERENCES usuarios(id),
    fecha_apertura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    monto_apertura DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    monto_cierre DECIMAL(10,2),
    ventas_efectivo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ventas_tarjeta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ventas_transferencia DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    otros_ingresos DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    egresos DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(20) NOT NULL DEFAULT 'Abierta' CHECK (estado IN ('Abierta', 'Cerrada'))
);

-- T. Métodos de Pago
CREATE TABLE metodos_pago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- U. Transacciones de Caja
CREATE TABLE caja_transacciones (
    id SERIAL PRIMARY KEY,
    id_caja INT NOT NULL REFERENCES cajas(id) ON DELETE CASCADE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO')),
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    metodo_pago_id INT REFERENCES metodos_pago(id) ON DELETE SET NULL,
    referencia VARCHAR(150),
    fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- V. Kardex (Tarjeta de control de inventario detallado)
CREATE TABLE kardex (
    id SERIAL PRIMARY KEY,
    id_sucursal VARCHAR(50) NOT NULL REFERENCES sucursales(id),
    id_producto VARCHAR(50) NOT NULL REFERENCES medicamentos(id),
    id_lote VARCHAR(50) NOT NULL REFERENCES lotes(id),
    tipo_transaccion VARCHAR(30) NOT NULL CHECK (tipo_transaccion IN ('COMPRA', 'VENTA', 'TRASLADO_INGRESO', 'TRASLADO_SALIDA', 'AJUSTE_INGRESO', 'AJUSTE_SALIDA')),
    documento_referencia VARCHAR(100),
    cantidad_entrada INT NOT NULL DEFAULT 0 CHECK (cantidad_entrada >= 0),
    precio_entrada DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (precio_entrada >= 0),
    cantidad_salida INT NOT NULL DEFAULT 0 CHECK (cantidad_salida >= 0),
    precio_salida DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (precio_salida >= 0),
    cantidad_saldo INT NOT NULL CHECK (cantidad_saldo >= 0),
    precio_saldo DECIMAL(10,2) NOT NULL CHECK (precio_saldo >= 0),
    valor_total_saldo DECIMAL(10,2) NOT NULL CHECK (valor_total_saldo >= 0),
    fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- W. Configuración General (System settings)
CREATE TABLE configuracion_general (
    clave VARCHAR(100) PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT
);

-- X. Auditoría (Security and action logs)
CREATE TABLE auditorias (
    id SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nombre VARCHAR(150),
    modulo VARCHAR(100),
    accion VARCHAR(100) NOT NULL,
    detalle TEXT NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_dispositivo VARCHAR(45)
);

-- Y. Historial de Cambios (Audit Trails of old vs new row states)
CREATE TABLE historial_cambios (
    id SERIAL PRIMARY KEY,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id VARCHAR(100) NOT NULL,
    accion VARCHAR(10) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    valor_anterior JSONB,
    valor_nuevo JSONB,
    id_usuario INT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Z. Series y Correlativos (Sequential document number allocation)
CREATE TABLE series_correlativos (
    id SERIAL PRIMARY KEY,
    id_sucursal VARCHAR(50) NOT NULL REFERENCES sucursales(id),
    tipo_documento VARCHAR(20) NOT NULL CHECK (tipo_documento IN ('Boleta', 'Factura', 'NotaCredito', 'NotaDebito')),
    serie VARCHAR(10) NOT NULL,
    correlativo_actual INT NOT NULL DEFAULT 0 CHECK (correlativo_actual >= 0)
);


-- ----------------------------------------------------------------------------
-- 2. ÍNDICES DE OPTIMIZACIÓN Y RENDIMIENTO
-- ----------------------------------------------------------------------------

-- A. Búsqueda por Código de Barras e IDs en Medicamentos
CREATE INDEX idx_medicamentos_codigo ON medicamentos(codigo_barras);
CREATE INDEX idx_medicamentos_nombre ON medicamentos(nombre);

-- B. Búsqueda por Documento e Identificación en Clientes / Proveedores
CREATE INDEX idx_clientes_documento ON clientes(numero_documento);
CREATE INDEX idx_clientes_nombre ON clientes(nombre_razon_social);
CREATE INDEX idx_proveedores_ruc ON proveedores(ruc);
CREATE INDEX idx_proveedores_razon ON proveedores(razon_social);

-- C. Búsqueda por Lote y Vencimientos
CREATE INDEX idx_lotes_numero ON lotes(numero_lote);
CREATE INDEX idx_lotes_vencimiento ON lotes(fecha_vencimiento);
CREATE INDEX idx_lotes_producto_sucursal ON lotes(id_producto, id_sucursal);

-- D. Consultas de Transacciones Financieras y Documentos por Fechas y Correlativo
CREATE INDEX idx_ventas_fecha ON ventas(fecha_emision);
CREATE INDEX idx_ventas_documento ON ventas(serie_comprobante, numero_comprobante);
CREATE INDEX idx_compras_fecha ON compras(fecha_emision);
CREATE INDEX idx_compras_documento ON compras(serie_comprobante, numero_comprobante);

-- E. Auditoría y Kardex por Fechas e Históricos
CREATE INDEX idx_kardex_producto_sucursal ON kardex(id_producto, id_sucursal);
CREATE INDEX idx_kardex_fecha ON kardex(fecha);
CREATE INDEX idx_auditorias_fecha ON auditorias(fecha);
CREATE INDEX idx_historial_fecha ON historial_cambios(fecha);


-- ----------------------------------------------------------------------------
-- 3. VISTAS PARA REPORTES Y ANALÍTICA
-- ----------------------------------------------------------------------------

-- A. Vista para Reporte de Ventas Diarias Consolidadas
CREATE OR REPLACE VIEW vw_reporte_ventas_diarias AS
SELECT 
    v.fecha_emision AS fecha,
    v.id_sucursal,
    s.nombre AS sucursal_nombre,
    v.tipo_comprobante,
    COUNT(v.id) AS total_operaciones,
    SUM(v.subtotal) AS subtotal_recaudado,
    SUM(v.igv) AS igv_recaudado,
    SUM(v.total) AS total_recaudado
FROM ventas v
JOIN sucursales s ON v.id_sucursal = s.id
WHERE v.estado = 'Valido'
GROUP BY v.fecha_emision, v.id_sucursal, s.nombre, v.tipo_comprobante;

-- B. Vista para Alerta de Medicamentos con Stock Bajo
CREATE OR REPLACE VIEW vw_reporte_stock_bajo AS
SELECT 
    m.id AS producto_id,
    m.nombre AS producto_nombre,
    m.principio_activo,
    m.presentacion,
    s.nombre AS sucursal_nombre,
    COALESCE(SUM(l.stock), 0) AS stock_actual,
    m.precio_sugerido
FROM medicamentos m
CROSS JOIN sucursales s
LEFT JOIN lotes l ON l.id_producto = m.id AND l.id_sucursal = s.id AND l.estado_registro = 'activo'
GROUP BY m.id, m.nombre, m.principio_activo, m.presentacion, s.nombre, m.precio_sugerido
HAVING COALESCE(SUM(l.stock), 0) < 15;

-- C. Vista para Alerta de Lotes Próximos a Vencer (90 días)
CREATE OR REPLACE VIEW vw_reporte_lotes_por_vencer AS
SELECT 
    l.id_sucursal,
    s.nombre AS sucursal_nombre,
    l.id_producto,
    m.nombre AS producto_nombre,
    l.numero_lote,
    l.fecha_vencimiento,
    l.stock,
    (TO_DATE(l.fecha_vencimiento, 'YYYY-MM-DD') - CURRENT_DATE) AS dias_para_vencer
FROM lotes l
JOIN medicamentos m ON l.id_producto = m.id
JOIN sucursales s ON l.id_sucursal = s.id
WHERE l.stock > 0 
  AND l.estado_registro = 'activo'
  AND TO_DATE(l.fecha_vencimiento, 'YYYY-MM-DD') <= (CURRENT_DATE + INTERVAL '90 days');


-- ----------------------------------------------------------------------------
-- 4. TRIGGERS Y FUNCIONES ALMACENADAS (Automatizaciones e Integridad)
-- ----------------------------------------------------------------------------

-- A. FUNCIÓN Y TRIGGER: Actualizar stock de lote, inventario consolidado y Kardex en VENTAS
CREATE OR REPLACE FUNCTION fn_procesar_detalle_venta() 
RETURNS TRIGGER AS $$
DECLARE
    v_stock_actual INT;
    v_stock_nuevo INT;
    v_id_sucursal VARCHAR(50);
    v_id_usuario INT;
    v_doc_ref VARCHAR(100);
BEGIN
    -- 1. Obtener la sucursal, usuario y comprobante de la cabecera de la venta
    SELECT id_sucursal, id_usuario, (serie_comprobante || '-' || numero_comprobante)
    INTO v_id_sucursal, v_id_usuario, v_doc_ref
    FROM ventas 
    WHERE id = NEW.id_venta;

    -- 2. Validar stock actual del lote específico
    SELECT stock INTO v_stock_actual FROM lotes WHERE id = NEW.id_lote;
    
    IF v_stock_actual IS NULL THEN
        RAISE EXCEPTION 'Lote % no existe para el producto %', NEW.id_lote, NEW.id_producto;
    END IF;

    IF v_stock_actual < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el lote %. Disponible: %, Solicitado: %', 
            NEW.id_lote, v_stock_actual, NEW.cantidad;
    END IF;

    -- 3. Restar stock del Lote
    UPDATE lotes 
    SET stock = stock - NEW.cantidad 
    WHERE id = NEW.id_lote;

    -- 4. Actualizar inventario consolidado por sucursal
    INSERT INTO inventarios (id_producto, id_sucursal, stock_total)
    VALUES (NEW.id_producto, v_id_sucursal, 0)
    ON CONFLICT (id_producto, id_sucursal) 
    DO UPDATE SET stock_total = GREATEST(0, inventarios.stock_total - NEW.cantidad);

    -- 5. Registrar movimiento de inventario detallado
    INSERT INTO movimientos_inventario (id_producto, id_sucursal, id_lote, tipo_movimiento, cantidad, id_usuario, motivo)
    VALUES (NEW.id_producto, v_id_sucursal, NEW.id_lote, 'SALIDA', NEW.cantidad, v_id_usuario, 'Venta: ' || v_doc_ref);

    -- 6. Insertar registro histórico en la tarjeta Kardex
    SELECT stock INTO v_stock_nuevo FROM lotes WHERE id = NEW.id_lote;
    
    INSERT INTO kardex (
        id_sucursal, id_producto, id_lote, tipo_transaccion, documento_referencia,
        cantidad_salida, precio_salida, cantidad_saldo, precio_saldo, valor_total_saldo
    )
    VALUES (
        v_id_sucursal, NEW.id_producto, NEW.id_lote, 'VENTA', v_doc_ref,
        NEW.cantidad, NEW.precio_unitario, v_stock_nuevo, NEW.precio_unitario, (v_stock_nuevo * NEW.precio_unitario)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tg_procesar_detalle_venta
AFTER INSERT ON detalle_ventas
FOR EACH ROW
EXECUTE FUNCTION fn_procesar_detalle_venta();


-- B. FUNCIÓN Y TRIGGER: Actualizar stock de lote, consolidado y Kardex en COMPRAS
CREATE OR REPLACE FUNCTION fn_procesar_detalle_compra() 
RETURNS TRIGGER AS $$
DECLARE
    v_stock_nuevo INT;
    v_id_sucursal VARCHAR(50);
    v_id_usuario INT;
    v_doc_ref VARCHAR(100);
BEGIN
    -- 1. Obtener la sucursal, usuario y comprobante de la cabecera de la compra
    SELECT id_sucursal, id_usuario, (serie_comprobante || '-' || numero_comprobante)
    INTO v_id_sucursal, v_id_usuario, v_doc_ref
    FROM compras 
    WHERE id = NEW.id_compra;

    -- 2. Incrementar stock del Lote recibido
    UPDATE lotes 
    SET stock = stock + NEW.cantidad 
    WHERE id = NEW.id_lote;

    -- 3. Actualizar inventario consolidado por sucursal
    INSERT INTO inventarios (id_producto, id_sucursal, stock_total)
    VALUES (NEW.id_producto, v_id_sucursal, NEW.cantidad)
    ON CONFLICT (id_producto, id_sucursal) 
    DO UPDATE SET stock_total = inventarios.stock_total + NEW.cantidad;

    -- 4. Registrar movimiento de inventario detallado
    INSERT INTO movimientos_inventario (id_producto, id_sucursal, id_lote, tipo_movimiento, cantidad, id_usuario, motivo)
    VALUES (NEW.id_producto, v_id_sucursal, NEW.id_lote, 'INGRESO', NEW.cantidad, v_id_usuario, 'Compra: ' || v_doc_ref);

    -- 5. Insertar registro histórico en la tarjeta Kardex
    SELECT stock INTO v_stock_nuevo FROM lotes WHERE id = NEW.id_lote;
    
    INSERT INTO kardex (
        id_sucursal, id_producto, id_lote, tipo_transaccion, documento_referencia,
        cantidad_entrada, precio_entrada, cantidad_saldo, precio_saldo, valor_total_saldo
    )
    VALUES (
        v_id_sucursal, NEW.id_producto, NEW.id_lote, 'COMPRA', v_doc_ref,
        NEW.cantidad, NEW.precio_unitario, v_stock_nuevo, NEW.precio_unitario, (v_stock_nuevo * NEW.precio_unitario)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tg_procesar_detalle_compra
AFTER INSERT ON detalle_compras
FOR EACH ROW
EXECUTE FUNCTION fn_procesar_detalle_compra();


-- C. FUNCIÓN Y TRIGGER: Registro automático de auditoría de seguridad para cambios de precio
CREATE OR REPLACE FUNCTION fn_auditar_cambio_precio_lote()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.precio_venta <> NEW.precio_venta THEN
        INSERT INTO auditorias (id_usuario, usuario_nombre, modulo, accion, detalle)
        VALUES (
            NULL, 
            'SISTEMA_TRIGGER', 
            'Inventario_Lotes', 
            'ALTERACION_PRECIO', 
            'Se modificó el precio de venta del lote ' || NEW.numero_lote || ' (Medicamento ID: ' || NEW.id_producto || ') de S/ ' || OLD.precio_venta || ' a S/ ' || NEW.precio_venta
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tg_auditar_cambio_precio_lote
AFTER UPDATE ON lotes
FOR EACH ROW
EXECUTE FUNCTION fn_auditar_cambio_precio_lote();


-- ----------------------------------------------------------------------------
-- 5. SEMILLERO DE DATOS INICIALES (Configuración básica, roles y sucursales)
-- ----------------------------------------------------------------------------

-- A. Insertar Roles del Sistema
INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Control absoluto del sistema ERP, configuraciones corporativas y reportes de auditoría global.'),
('FarmaceuticoRegente', 'Encargado de la regencia de medicamentos, control de registros sanitarios y recetas médicas.'),
('Almacenero', 'Gestión de almacenes, recepción de lotes de proveedores, movimientos de inventario y Kardex.'),
('Cajero', 'Apertura, cuadre de caja, y procesamiento de boletas y facturas de venta al público.');

-- B. Insertar Permisos Clave
INSERT INTO permisos (nombre, descripcion) VALUES
('usuarios:gestionar', 'Crear, editar y suspender usuarios en el ERP.'),
('inventario:gestionar', 'Ingresar lotes, realizar ajustes de inventario e imprimir guías.'),
('ventas:procesar', 'Acceso al módulo de Punto de Venta (POS) y emisión de boletas/facturas.'),
('auditoria:ver', 'Ver el panel de auditorías, historial de cambios de datos y reportes Sunat.');

-- C. Insertar Sucursal Matriz Inicial
INSERT INTO sucursales (id, nombre, direccion, ubigeo, ciudad, telefono) VALUES
('SUC-CENTRAL', 'Sucursal Central - Lima Centro', 'Av. Tacna 420, Cercado de Lima', '150101', 'Lima', '01-4283921');

-- D. Insertar Métodos de Pago estándar
INSERT INTO metodos_pago (nombre, activo) VALUES
('Efectivo', TRUE),
('Tarjeta de Crédito', TRUE),
('Tarjeta de Débito', TRUE),
('Yape/Plin', TRUE),
('Transferencia Bancaria', TRUE);

-- E. Insertar Parámetros de Configuración del Sistema
INSERT INTO configuracion_general (clave, valor, descripcion) VALUES
('IGV_PORCENTAJE', '18', 'Tasa general de impuesto sobre las ventas (Impuesto General a las Ventas) en Perú.'),
('BOTICA_RUC', '20123456789', 'Número de RUC oficial de la empresa para facturación electrónica.'),
('BOTICA_RAZON_SOCIAL', 'BOTICAS & SALUD PERU S.A.C.', 'Razón social oficial que figura en los comprobantes SUNAT.'),
('ALERTA_STOCK_MINIMO', '15', 'Cantidad mínima recomendada de stock consolidado antes de emitir alerta de desabastecimiento.');

-- F. Insertar Series y Correlativos Iniciales para Facturación Electrónica en la Central
INSERT INTO series_correlativos (id_sucursal, tipo_documento, serie, correlativo_actual) VALUES
('SUC-CENTRAL', 'Boleta', 'B001', 0),
('SUC-CENTRAL', 'Factura', 'F001', 0),
('SUC-CENTRAL', 'NotaCredito', 'FC01', 0),
('SUC-CENTRAL', 'NotaDebito', 'FD01', 0);
