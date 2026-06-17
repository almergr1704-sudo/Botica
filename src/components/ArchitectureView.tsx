import React, { useState } from 'react';
import { Copy, Check, FileCode, Database, Layers, Layout, ArrowRight, Play, CheckCircle } from 'lucide-react';

export default function ArchitectureView() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'architecture' | 'schema' | 'sql_console'>('architecture');
  const [selectedSimQuery, setSelectedSimQuery] = useState<string>('q1');
  const [consoleOutput, setConsoleOutput] = useState<any[]>(MOCK_QUERY_RESULTS.q1);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const runSimulatedQuery = (queryId: string) => {
    setSelectedSimQuery(queryId);
    setConsoleOutput(MOCK_QUERY_RESULTS[queryId as keyof typeof MOCK_QUERY_RESULTS] || []);
  };

  const sqlSchema = `-- ====================================================================
-- SISTEMA ERP & POS FARMACÉUTICO (BOTICACONTROL) - PERÚ
-- DISEÑO DE BASE DE DATOS Y RELACIONES REFERENCIALES (DIGEMID / SUNAT)
-- DB: PostgreSQL (Recomendado por su soporte nativo JSONB y transaccionalidad)
-- ====================================================================

-- 1. TABLA: SUCURSALES (Multi-sucursales en Perú)
CREATE TABLE sucursales (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    ubigeo CHAR(6) NOT NULL, -- Ubigeo oficial de 6 dígitos (INEI Perú - ej: 150122 Miraflores)
    ciudad VARCHAR(100) NOT NULL,
    telefono VARCHAR(30) DEFAULT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA: PRODUCTOS (Información general regulada por DIGEMID)
CREATE TABLE productos (
    id VARCHAR(50) PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    principio_activo VARCHAR(150) NOT NULL, -- Ej: Paracetamol, Amoxicilina
    concentracion VARCHAR(50) NOT NULL,     -- Ej: 500 mg, 1 g, 5%
    presentacion VARCHAR(100) NOT NULL,     -- Ej: Caja x 100 tabletas, Frasco x 120ml
    laboratorio VARCHAR(100) NOT NULL,      -- Ej: Portugal, Hersil, Bayer, Lansier
    registro_sanitario VARCHAR(50) NOT NULL, -- Obligatorio DIGEMID (ej: EE-04821)
    categoria VARCHAR(100) NOT NULL,        -- Ej: Analgésico, Antibiótico
    requiere_receta BOOLEAN DEFAULT FALSE,  -- Control de venta bajo receta (DIGEMID)
    precio_sugerido DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA: LOTES (Control de Inventario físico descentralizado por Sucursal con fecha de vencimiento)
CREATE TABLE lotes (
    id VARCHAR(50) PRIMARY KEY,
    id_producto VARCHAR(50) REFERENCES productos(id) ON DELETE CASCADE,
    id_sucursal VARCHAR(50) REFERENCES sucursales(id) ON DELETE CASCADE,
    numero_lote VARCHAR(50) NOT NULL,       -- Número de lote del fabricante
    fecha_vencimiento DATE NOT NULL,        -- Control de caducidad estricto (DIGEMID)
    stock INT NOT NULL CHECK (stock >= 0),
    stock_inicial INT NOT NULL,
    precio_compra DECIMAL(12, 4) NOT NULL,  -- Precio de adquisición (útil para costeo PEPS/FIFO)
    precio_venta DECIMAL(12, 2) NOT NULL,   -- Precio de venta al público en esta sucursal
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Asegura que no se duplique un lote idéntico para un mismo producto en la misma sucursal
    UNIQUE(id_producto, id_sucursal, numero_lote)
);

-- 4. TABLA: CLIENTES (Sunat Ready)
CREATE TABLE clientes (
    id VARCHAR(50) PRIMARY KEY,
    tipo_documento VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('DNI', 'RUC', 'CEX')), -- DNI / RUC según SUNAT
    numero_documento VARCHAR(20) UNIQUE NOT NULL,
    nombre_razon_social VARCHAR(255) NOT NULL,
    direccion VARCHAR(255),
    email VARCHAR(150),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA: PROVEEDORES (Droguerías y Laboratorios autorizados)
CREATE TABLE proveedores (
    id VARCHAR(50) PRIMARY KEY,
    ruc CHAR(11) UNIQUE NOT NULL CHECK (length(ruc) = 11), -- RUC de 11 dígitos en Perú
    razon_social VARCHAR(255) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    contacto VARCHAR(100),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA: USUARIOS (Control de acceso y auditoría)
CREATE TABLE usuarios (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    rol VARCHAR(30) NOT NULL CHECK (rol IN ('Administrador', 'FarmaceuticoRegente', 'Cajero')),
    id_sucursal VARCHAR(50) REFERENCES sucursales(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA: VENTAS (Cabecera de comprobante de pago SUNAT)
CREATE TABLE ventas (
    id VARCHAR(50) PRIMARY KEY,
    id_sucursal VARCHAR(50) REFERENCES sucursales(id),
    id_usuario VARCHAR(50) REFERENCES usuarios(id),
    id_cliente VARCHAR(50) REFERENCES clientes(id) ON DELETE SET NULL,
    tipo_comprobante VARCHAR(20) NOT NULL CHECK (tipo_comprobante IN ('Boleta', 'Factura')),
    serie_comprobante CHAR(4) NOT NULL,      -- Ej: 'B001' para Boletas, 'F001' para Facturas
    numero_comprobante VARCHAR(10) NOT NULL, -- Correlativo de 8 dígitos (00000001)
    fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(12, 2) NOT NULL,
    igv DECIMAL(12, 2) NOT NULL,             -- Impuesto General a las Ventas (18% en Perú)
    total DECIMAL(12, 2) NOT NULL,
    hash_sunat VARCHAR(100),                 -- Firma XML / Hash generado para SUNAT
    estado_sunat VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado_sunat IN ('Pendiente', 'Aceptado', 'Rechazado')),
    xml_generado TEXT,
    UNIQUE(id_sucursal, tipo_comprobante, serie_comprobante, numero_comprobante)
);

-- 8. TABLA: DETALLE_VENTAS (Conexión directa con Lote de origen)
CREATE TABLE detalle_ventas (
    id VARCHAR(50) PRIMARY KEY,
    id_venta VARCHAR(50) REFERENCES ventas(id) ON DELETE CASCADE,
    id_producto VARCHAR(50) REFERENCES productos(id),
    id_lote VARCHAR(50) REFERENCES lotes(id), -- DIGEMID exige trazabilidad: de qué lote salió la medicina vendida
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(12, 2) NOT NULL,
    igv_item DECIMAL(12, 2) NOT NULL,
    total_item DECIMAL(12, 2) NOT NULL
);

-- ====================================================================
-- ÍNDICES COMPLEMENTARIOS PARA OPTIMIZACIÓN (DIGEMID Y SUNAT RUNTIME)
-- ====================================================================
CREATE INDEX idx_lotes_vencimiento ON lotes(fecha_vencimiento); -- Reporte rápido de medicamentos expirando
CREATE INDEX idx_productos_nombre ON productos(nombre, principio_activo); -- Búsquedas rápidas en POS
CREATE INDEX idx_ventas_emision ON ventas(fecha_emision); -- Rendición mensual de libros contables
`;

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      <div className="p-6 bg-slate-950 border-b border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">Arquitectura Core</span>
            <span className="px-2 py-0.5 text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">SUNAT / DIGEMID Perú</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-white font-sans">
            Planificación y Diseño Arquitectónico (Parte 1)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl font-sans">
            Desarrollado bajo principios de Clean Architecture y con estricto cumplimiento de trazabilidad de lotes (DIGEMID) y estándares fiscales de comprobantes URI electrónicos (SUNAT).
          </p>
        </div>

        {/* Tabs de Arquitectura */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'architecture' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Estructura Limpia
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'schema' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Esquema SQL (DDL)
          </button>
          <button
            onClick={() => setActiveTab('sql_console')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'sql_console' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            Consola SQL Simulada
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* TAB 1: ESTRUCTURA LIMPIA */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stack Recomendado */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-850">
                <span className="text-[10px] font-mono tracking-wider uppercase text-blue-400 font-bold block mb-2">Stack Tecnológico</span>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">Backend Principal</h4>
                    <p className="text-xs text-slate-400 mt-0.5">NestJS (TypeScript) + PostgreSQL + Prisma ORM. NestJS fuerza una separación limpia orientada a módulos, facilitando las auditorías de código DIGEMID.</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">Frontend Administrativo</h4>
                    <p className="text-xs text-slate-400 mt-0.5">React 19 + Vite + Tailwind CSS. Proporciona alto rendimiento en el cargue del catálogo y transacciones en el punto de venta offline-ready.</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">Módulo SUNAT Facturación</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Microservicio en Node.js de firmas XML con biblioteca UBL y conexión directa por certificado digital al OSE (Operador de Servicios Electrónicos) o SUNAT.</p>
                  </div>
                </div>
              </div>

              {/* Arquitectura de Carpeta */}
              <div className="lg:col-span-2 bg-slate-950 p-4 rounded-lg border border-slate-850">
                <span className="text-[10px] font-mono tracking-wider uppercase text-blue-400 font-bold block mb-2">Estructura de Directorios Recomendada</span>
                <div className="font-mono text-xs text-slate-300 bg-slate-900 p-3 rounded border border-slate-800 overflow-x-auto max-h-[220px]">
{`boticacontrol-erp/
├── backend/                  # NestJS API (Clean Architecture + DDD)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── inventario/   # Productos, Lotes (DIGEMID), Laboratorios
│   │   │   ├── facturacion/  # Ventas, Envío SUNAT, Boletas/Facturas (UBL 2.1)
│   │   │   ├── sucursales/   # Control multi-local y almacenes
│   │   │   └── usuarios/     # Roles, Control de Acceso basado en Roles (RBAC)
│   │   ├── common/           # Middlewares, Interceptors, Pipes de Validación
│   │   ├── config/           # Variables de entorno SUNAT API, OSE credentials
│   │   └── main.ts
│   └── prisma/schema.prisma  # Esquema declarativo de base de datos SQL
└── frontend/                 # React Client Setup (Modular SPA)
    ├── src/
    │   ├── components/      # UI Atoms, Organisms (POS, Expiry Alerts)
    │   ├── hooks/           # custom hooks (useCart, useLots, searchAPI)
    │   ├── services/        # API Connections (SUNAT parser, Client lookup)
    │   ├── App.tsx          # Router and Global App States
    │   └── main.tsx`}
                </div>
              </div>
            </div>

            {/* Justificación de la estructura en Perú */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-850">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Layout className="w-4 h-4 text-emerald-400" />
                Consideraciones de Negocio y Normativa Local (DIGEMID y SUNAT)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                <div className="space-y-2">
                  <p>
                    <strong className="text-slate-200">Trazabilidad por Lote:</strong> DIGEMID exige que las farmacias puedan dar de baja y retirar del mercado lotes contaminados o con alertas sanitarias de inmediato. En nuestro esquema relacional, la tabla <code className="text-amber-400 bg-amber-950/20 px-1 py-0.2 rounded font-mono">lotes</code> está conectada directamente con <code className="text-amber-400 bg-amber-950/20 px-1 py-0.2 rounded font-mono">detalle_ventas</code> para saber exactamente a qué clientes se vendió un lote en particular.
                  </p>
                  <p>
                    <strong className="text-slate-200">Ubigeo y Direcciones:</strong> Cada sucursal requiere de un Ubigeo válido de 6 dígitos que se envía a la SUNAT en cada cabecera XML para determinar el punto de despacho contable correspondiente.
                  </p>
                </div>
                <div className="space-y-2">
                  <p>
                    <strong className="text-slate-200">Facturación Electrónica UBL 2.1:</strong> La SUNAT requiere que todas las facturas y boletas lleven un código hash (DigestValue), código de barras QR, IGV desagregado (18% tasa regular o exonerado para medicinas oncológicas u otras exenciones locales), y que sean enviadas en un archivo comprimido ZIP con extensión XML.
                  </p>
                  <p>
                    <strong className="text-slate-200">Tratamiento de Medicaciones Controladas:</strong> El campo <code className="text-amber-400 bg-amber-950/20 px-1 py-0.2 rounded font-mono">requiere_receta</code> permite al sistema de punto de venta (POS) requerir de forma obligatoria los datos del médico colegiado y el adjunto de la receta médica antes de facturar antibióticos o psicotrópicos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ESQUEMA SQL */}
        {activeTab === 'schema' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-950 px-4 py-2 rounded-t-lg border-t border-x border-slate-850">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <FileCode className="w-4 h-4 text-amber-500" />
                <span>postgres_schema_v1.0.sql</span>
              </div>
              <button
                onClick={() => handleCopy(sqlSchema, 'schema_sql')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded transition-all active:scale-95"
              >
                {copiedText === 'schema_sql' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-xs overflow-x-auto p-4 rounded-b-lg bg-slate-950 border border-slate-850 max-h-[380px] text-emerald-400 select-all">
              <pre>{sqlSchema}</pre>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              * Nota: El esquema define cascadas seguras (`ON DELETE CASCADE`) para proteger consistencia durante purgas de datos de prueba y llaves alternas `UNIQUE` compuestas para blindar los inventarios en entornos multi-hilo concurrentes.
            </p>
          </div>
        )}

        {/* TAB 3: CONSOLA SQL SIMULADA */}
        {activeTab === 'sql_console' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-850">
              <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <Play className="w-4 h-4 text-emerald-400 inline" /> Ejemplos de Consultas Clave y Reportes para SUNAT/DIGEMID
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => runSimulatedQuery('q1')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedSimQuery === 'q1'
                      ? 'bg-blue-950/40 border-blue-500 text-blue-200'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-mono text-blue-400 block font-semibold">REPORTE DIGEMID</span>
                  <span className="text-xs font-medium block mt-1">Lotes Próximos a Vencer (&lt; 90 días) o Expirados</span>
                </button>

                <button
                  onClick={() => runSimulatedQuery('q2')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedSimQuery === 'q2'
                      ? 'bg-blue-950/40 border-blue-500 text-blue-200'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-mono text-amber-400 block font-semibold">TRAZABILIDAD</span>
                  <span className="text-xs font-medium block mt-1">¿A quién se le vendieron unidades del Lote &quot;L-P01A25&quot;?</span>
                </button>

                <button
                  onClick={() => runSimulatedQuery('q3')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedSimQuery === 'q3'
                      ? 'bg-blue-950/40 border-blue-500 text-blue-200'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-mono text-purple-400 block font-semibold">REPORTE CONTABLE</span>
                  <span className="text-xs font-medium block mt-1">Resumen de Ventas Diarias + IGV cobrado SUNAT</span>
                </button>
              </div>
            </div>

            {/* Código SQL de la consulta activa */}
            <div className="bg-slate-950 rounded-lg border border-slate-850 overflow-hidden">
              <div className="bg-slate-900 border-b border-slate-850 px-4 py-2 flex justify-between items-center">
                <span className="text-xs font-mono text-slate-400">Consulta SQL Activa</span>
                <span className="px-2 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-950 rounded">SELECT STATEMENT</span>
              </div>
              <div className="p-3 bg-slate-950 font-mono text-xs text-amber-300 overflow-x-auto">
                {selectedSimQuery === 'q1' && (
                  <pre>{`SELECT 
    s.nombre AS sucursal,
    p.nombre AS medicamento,
    p.principio_activo,
    l.numero_lote,
    l.fecha_vencimiento,
    l.stock,
    (l.fecha_vencimiento - CURRENT_DATE) AS dias_para_vencer
FROM lotes l
JOIN productos p ON l.id_producto = p.id
JOIN sucursales s ON l.id_sucursal = s.id
WHERE l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY l.fecha_vencimiento ASC;`}</pre>
                )}
                {selectedSimQuery === 'q2' && (
                  <pre>{`SELECT 
    v.fecha_emision,
    v.tipo_comprobante || ' ' || v.serie_comprobante || '-' || v.numero_comprobante AS comprobante,
    c.nombre_razon_social AS cliente,
    c.numero_documento,
    dv.cantidad,
    dv.precio_unitario,
    dv.total_item
FROM detalle_ventas dv
JOIN ventas v ON dv.id_venta = v.id
JOIN clientes c ON v.id_cliente = c.id
WHERE dv.id_lote = 'lote-101' -- Busca el id de lote específico de la alerta DIGEMID
ORDER BY v.fecha_emision DESC;`}</pre>
                )}
                {selectedSimQuery === 'q3' && (
                  <pre>{`SELECT 
    v.id_sucursal,
    s.nombre AS sucursal,
    COUNT(v.id) AS total_transacciones,
    SUM(v.subtotal) AS ingreso_neto,
    SUM(v.igv) AS igv_recaudado,
    SUM(v.total) AS recaudacion_total
FROM ventas v
JOIN sucursales s ON v.id_sucursal = s.id
GROUP BY v.id_sucursal, s.nombre
ORDER BY recaudacion_total DESC;`}</pre>
                )}
              </div>
            </div>

            {/* Resultado Simulador de Base de Datos */}
            <div className="bg-slate-950 rounded-lg border border-slate-850 overflow-hidden">
              <div className="bg-slate-900 border-b border-slate-850 px-4 py-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-mono text-emerald-400">Resultado del Servidor PostgreSQL en Tiempo Real</span>
              </div>
              <div className="p-4 overflow-x-auto max-h-[220px]">
                <table className="w-full text-xs text-left font-mono text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-400 capitalize">
                      {consoleOutput.length > 0 && Object.keys(consoleOutput[0]).map((key) => (
                        <th key={key} className="py-2 px-3">{key.replace('_', ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {consoleOutput.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-850 hover:bg-slate-900/60 transition-colors">
                        {Object.values(row).map((val: any, cellIdx) => (
                          <td key={cellIdx} className="py-2 px-3">
                            {typeof val === 'number' && val % 1 !== 0 ? `S/ ${val.toFixed(2)}` : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Datos simulados de respuesta para la consola SQL Interactiva
const MOCK_QUERY_RESULTS = {
  q1: [
    { sucursal: 'Mifarma - Sucursal Miraflores', medicamento: 'Paracetamol 500mg', principio_activo: 'Paracetamol', numero_lote: 'L-P01A25', fecha_vencimiento: '2026-06-12 (Vencido)', stock: 45, dias_para_vencer: -5 },
    { sucursal: 'Mifarma - Sucursal Miraflores', medicamento: 'Amoxicilina 500mg', principio_activo: 'Amoxicilina', numero_lote: 'L-AMX921', fecha_vencimiento: '2026-07-02', stock: 120, dias_para_vencer: 15 },
    { sucursal: 'San José - Sucursal Yanahuara', medicamento: 'Lansoprazol 30mg', principio_activo: 'Lansoprazol', numero_lote: 'L-LAN103', fecha_vencimiento: '2026-07-12', stock: 45, dias_para_vencer: 25 },
    { sucursal: 'Mifarma - Sucursal Miraflores', medicamento: 'Paracetamol 500mg', principio_activo: 'Paracetamol', numero_lote: 'L-P01B26', fecha_vencimiento: '2026-08-01', stock: 250, dias_para_vencer: 45 }
  ],
  q2: [
    { fecha_emision: '2026-06-15 11:34:20', comprobante: 'Boleta B001-00000004', cliente: 'Alberto García Vargas', numero_documento: '45802145', cantidad: 20, precio_unitario: 'S/ 0.20', total_item: 'S/ 4.00' },
    { fecha_emision: '2026-06-12 16:15:02', comprobante: 'Factura F001-00000001', cliente: 'Clínica San Borja S.A.C.', numero_documento: '20601234567', cantidad: 100, precio_unitario: 'S/ 0.20', total_item: 'S/ 20.00' }
  ],
  q3: [
    { id_sucursal: 'suc-01', sucursal: 'Botica Mifarma - Sucursal Miraflores', total_transacciones: 184, ingreso_neto: 2845.50, igv_recaudado: 512.20, recaudacion_total: 3357.70 },
    { id_sucursal: 'suc-02', sucursal: 'Botica Inkafarma - Sucursal Lima Centro', total_transacciones: 122, ingreso_neto: 1941.00, igv_recaudado: 349.38, recaudacion_total: 2290.38 },
    { id_sucursal: 'suc-03', sucursal: 'Botica San José - Sucursal Yanahuara', total_transacciones: 52, ingreso_neto: 840.00, igv_recaudado: 151.20, recaudacion_total: 991.20 }
  ]
};
