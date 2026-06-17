import React, { useState } from 'react';
import { ShoppingBag, ArrowUpRight, ArrowDownLeft, FileText, Calendar, Plus, RefreshCw, Layers, Database, Calculator, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Producto, Lote, Proveedor, Sucursal } from '../types/pharmacy';

interface KardexEntry {
  id: string;
  fecha: string;
  tipo_movimiento: 'ENTRADA (COMPRA)' | 'SALIDA (VENTA)' | 'RETIRO (BAJA)';
  comprobante: string;
  empresa_relacionada: string; // Proveedor o Cliente
  producto_nombre: string;
  numero_lote: string;
  cantidad: number;
  precio_unitario: number;
  valor_total: number;
}

interface KardexPurchasesProps {
  products: Producto[];
  lots: Lote[];
  suppliers: Proveedor[];
  branches: Sucursal[];
  onAddLot: (newLot: Omit<Lote, 'id'>) => void;
  onRefreshLots: () => void;
}

export default function KardexPurchases({
  products,
  lots,
  suppliers,
  branches,
  onAddLot,
  onRefreshLots
}: KardexPurchasesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'purchases' | 'kardex_view' | 'fifo_logic'>('purchases');
  
  // States representing simulated Kardex logs
  const [kardexLog, setKardexLog] = useState<KardexEntry[]>([
    {
      id: 'k-01',
      fecha: '2026-06-10 09:15:00',
      tipo_movimiento: 'ENTRADA (COMPRA)',
      comprobante: 'Factura F002-84192',
      empresa_relacionada: 'Química Suiza S.A.C.',
      producto_nombre: 'Paracetamol 500mg',
      numero_lote: 'L-P01B26',
      cantidad: 500,
      precio_unitario: 0.05,
      valor_total: 25.00
    },
    {
      id: 'k-02',
      fecha: '2026-06-11 11:30:00',
      tipo_movimiento: 'ENTRADA (COMPRA)',
      comprobante: 'Factura F005-02148',
      empresa_relacionada: 'Distribuidora Droguería Albis S.A.',
      producto_nombre: 'Amoxicilina 500mg',
      numero_lote: 'L-AMX921',
      cantidad: 200,
      precio_unitario: 0.45,
      valor_total: 90.00
    },
    {
      id: 'k-03',
      fecha: '2026-06-12 16:15:02',
      tipo_movimiento: 'SALIDA (VENTA)',
      comprobante: 'Factura F001-00000001',
      empresa_relacionada: 'Clínica San Borja S.A.C.',
      producto_nombre: 'Paracetamol 500mg',
      numero_lote: 'L-P01A25',
      cantidad: 100,
      precio_unitario: 0.20,
      valor_total: 20.00
    },
    {
      id: 'k-04',
      fecha: '2026-06-15 11:34:20',
      tipo_movimiento: 'SALIDA (VENTA)',
      comprobante: 'Boleta B001-00000004',
      empresa_relacionada: 'Alberto García Vargas (DNI)',
      producto_nombre: 'Paracetamol 500mg',
      numero_lote: 'L-P01A25',
      cantidad: 20,
      precio_unitario: 0.20,
      valor_total: 4.00
    }
  ]);

  // Form states for registering a new Purchase Receipt
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('suc-01');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [qtyPurchased, setQtyPurchased] = useState(100);
  const [costPrice, setCostPrice] = useState(0.50);
  const [sellPrice, setSellPrice] = useState(1.20);
  
  const [formSuccessMsg, setFormSuccessMsg] = useState('');
  const [formErrorMsg, setFormErrorMsg] = useState('');

  const handleRegisterPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccessMsg('');
    setFormErrorMsg('');

    if (!selectedSupplierId || !selectedBranchId || !selectedProductId || !invoiceNumber || !lotNumber || !expiryDate || qtyPurchased <= 0) {
      setFormErrorMsg('Por favor complete todos los datos del formulario de compra.');
      return;
    }

    const prodObj = products.find(p => p.id === selectedProductId);
    const suppObj = suppliers.find(s => s.id === selectedSupplierId);

    if (!prodObj || !suppObj) {
      setFormErrorMsg('Medicamento o Proveedor inválido.');
      return;
    }

    // Call inventory lot registration (Parte 1 logic integrated)
    onAddLot({
      id_producto: selectedProductId,
      id_sucursal: selectedBranchId,
      numero_lote: lotNumber.toUpperCase(),
      fecha_vencimiento: expiryDate,
      stock: qtyPurchased,
      stock_inicial: qtyPurchased,
      precio_compra: costPrice,
      precio_venta: sellPrice
    });

    // Create entry in Kardex
    const dateNow = new Date();
    const formattedDate = `${dateNow.toISOString().split('T')[0]} ${dateNow.toLocaleTimeString('es-PE')}`;
    
    const newKardexEntry: KardexEntry = {
      id: `k-${Date.now()}`,
      fecha: formattedDate,
      tipo_movimiento: 'ENTRADA (COMPRA)',
      comprobante: `Factura ${invoiceNumber}`,
      empresa_relacionada: suppObj.razon_social,
      producto_nombre: prodObj.nombre,
      numero_lote: lotNumber.toUpperCase(),
      cantidad: qtyPurchased,
      precio_unitario: costPrice,
      valor_total: qtyPurchased * costPrice
    };

    setKardexLog([newKardexEntry, ...kardexLog]);
    setFormSuccessMsg(`Compra exitosa: Se ingresaron ${qtyPurchased} unidades de ${prodObj.nombre} al Lote ${lotNumber.toUpperCase()}.`);
    
    // Clear Form Fields
    setLotNumber('');
    setExpiryDate('');
    setQtyPurchased(100);
    setCostPrice(0.50);
    setSellPrice(1.20);
    setInvoiceNumber('');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden font-sans">
      
      {/* HEADER CONTENEDOR */}
      <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
              Kardex & Almacenes
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
              Contabilidad FIFO
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Módulo de Inventario, Compras y Almacén (Parte 2)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Herramienta interactiva para simular ingresos por compra de droguerías, control de movimientos y auditoría fiscal del Kardex permanente de la botica.
          </p>
        </div>

        {/* SUB ACCIONES TAB */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveSubTab('purchases')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded transition-all ${
              activeSubTab === 'purchases' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-950'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            Ingresar Compra
          </button>
          <button
            onClick={() => setActiveSubTab('kardex_view')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded transition-all ${
              activeSubTab === 'kardex_view' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-950'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            Registro Kardex
          </button>
          <button
            onClick={() => setActiveSubTab('fifo_logic')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded transition-all ${
              activeSubTab === 'fifo_logic' ? 'bg-white text-blue-650 shadow-xs' : 'text-slate-500 hover:text-slate-950'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            Lógica FIFO & SQL
          </button>
        </div>
      </div>

      <div className="p-6">

        {/* SUBTAB 1: REGISTRAR COMPRA */}
        {activeSubTab === 'purchases' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Formulario */}
            <form onSubmit={handleRegisterPurchase} className="lg:col-span-7 space-y-4 text-xs">
              
              {formSuccessMsg && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-150 p-4 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="font-sans">
                    <span className="font-bold block mb-1">¡Medicamento Ingresado con Éxito!</span>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">{formSuccessMsg}</p>
                  </div>
                </div>
              )}

              {formErrorMsg && (
                <div className="bg-red-50 text-red-750 p-3 rounded-lg border border-red-150">
                  {formErrorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Proveedor */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Droguería Proveedora (RUC) *</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50 font-sans"
                  >
                    <option value="">Seleccione Proveedor Homologado...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.razon_social} (RUC: {s.ruc})</option>
                    ))}
                  </select>
                </div>

                {/* Comprobante de Compra */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nro Factura del Proveedor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: F002-094851"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                </div>

                {/* Sucursal Destino */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Almacén de Destino *</label>
                  <select
                    required
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50 font-sans"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Medicamento */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Medicamento Regulado DIGEMID *</label>
                  <select
                    required
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50 font-sans"
                  >
                    <option value="">Seleccione Medicamento...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.principio_activo})</option>
                    ))}
                  </select>
                </div>

                {/* Número de lote */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Número de Lote (Comercial) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: L-IBU1024"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                </div>

                {/* Fecha de vencimiento */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha de Caducidad/Vcto *</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                </div>

                {/* Cantidad */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Cantidad Comprada (Unidades) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={qtyPurchased}
                    onChange={(e) => setQtyPurchased(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                </div>

                {/* Costo de compra */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Precio Compra Unitario s/IGV (Costo) *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                </div>
              </div>

              {/* Costo de venta */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Precio Venta Unitario al Público Sugerido (P.V.) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={sellPrice}
                  onChange={(e) => setSellPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Registrar Entrada y Actualizar Inventario
                </button>
              </div>

            </form>

            {/* Panel explicativo */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-amber-50/50 border border-amber-200/80 p-4 rounded-xl text-xs text-amber-900 leading-relaxed space-y-3">
                <h4 className="font-extrabold uppercase tracking-wide flex items-center gap-1.5 text-amber-950">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  REGLAMENTACIÓN DE COMPRAS - DROGUERÍAS
                </h4>
                <p>
                  En el mercado farmacéutico peruano, las boticas solo pueden abastecerse de droguerías u oficinas de laboratorio <strong>debidamente autorizadas y registradas ante DIGEMID</strong> con su respectiva autorización sanitaria de funcionamiento.
                </p>
                <p>
                  Cada factura de compra recibida constituye la prueba heráldica de la procedencia legal del medicamento en caso de inspecciones. El lote que ingresa hereda el Registro Sanitario del Catálogo para salvaguardar la salud pública.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                <span className="font-extrabold text-slate-800 block">Movimiento Automático al Kardex:</span>
                <p>
                  Al dar la entrada a través de este portal, el sistema realiza de forma síncrona:
                </p>
                <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px]">
                  <li>Crea el registro del Lote con stock asignado para el POS.</li>
                  <li>Inserta una fila de <strong className="text-slate-800">ENTRADA (COMPRA)</strong> con costo ponderado o PEPS.</li>
                  <li>Recalcula el stock valorizado total de sucursal.</li>
                </ul>
              </div>
            </div>

          </div>
        )}

        {/* SUBTAB 2: REGISTRO KARDEX */}
        {activeSubTab === 'kardex_view' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-700 font-mono uppercase tracking-wide">
                  Movimientos en Kardex Permanente de Existencias
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Control de entradas por factura de compras, salidas por Boleta/Factura POS y bajas por alertas DIGEMID.</p>
              </div>
              <button
                onClick={() => onRefreshLots()}
                className="text-xs bg-white text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-205 flex items-center gap-1.5 transition-all shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refrescar Almacén
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-150 shadow-inner overflow-hidden">
              <table className="w-full text-xs text-left text-slate-600 font-sans">
                <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Tipo Movimiento</th>
                    <th className="py-3 px-4">Referencia Doc.</th>
                    <th className="py-3 px-4">Medicamento / Lote</th>
                    <th className="py-3 px-4">Proveedor / Cliente</th>
                    <th className="py-3 px-4 text-center">Unidades</th>
                    <th className="py-3 px-4 text-right">Costo unitario</th>
                    <th className="py-3 px-4 text-right">Monto Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kardexLog.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/55 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">{row.fecha}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 font-bold text-[9px] px-2 py-0.5 rounded-full ${
                          row.tipo_movimiento.includes('ENTRADA')
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            : 'bg-blue-50 text-blue-800 border border-blue-105'
                        }`}>
                          {row.tipo_movimiento.includes('ENTRADA') ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3 text-blue-500" />
                          )}
                          {row.tipo_movimiento}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{row.comprobante}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{row.producto_nombre}</span>
                          <span className="text-[10px] text-blue-600 font-bold font-mono">Lote: {row.numero_lote}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{row.empresa_relacionada}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{row.cantidad}</td>
                      <td className="py-3 px-4 text-right font-mono">S/ {row.precio_unitario.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">S/ {row.valor_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 3: LÓGICA FIFO Y CONSULTAS SQL */}
        {activeSubTab === 'fifo_logic' && (
          <div className="space-y-6">
            <div className="bg-slate-950 text-slate-200 p-6 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-500" />
                Lógica Computacional de Kardex y Costeo FIFO (Primeras Entradas, Primeras Salidas)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400">
                <div className="space-y-2">
                  <p>
                    <strong className="text-slate-200">El Principio FIFO / PEPS:</strong> En farmacias reguladas, este método no es opcional sino imperativo. Asegura que los lotes con fechas de vencimiento más próximas sean los primeros en ser facturados y dispensados al cliente.
                  </p>
                  <p>
                    <strong className="text-slate-200">Algoritmo de Descuento (Salidas):</strong> Cuando un cajero vende 100 tabletas de Paracetamol en el POS, el backend no reduce stock aleatoriamente. Busca la lista de lotes activos del producto, los ordena por <code className="text-amber-400 bg-amber-950/20 px-1 rounded">fecha_vencimiento ASC</code>, y va reduciendo el stock disponible de forma secuencial.
                  </p>
                </div>
                <div className="space-y-2 bg-slate-900 p-4 rounded-lg border border-slate-850">
                  <span className="font-bold text-slate-200 block mb-1">Cálculo de Stock en Código JS/TS:</span>
                  <pre className="font-mono text-[10.5px] text-amber-400 leading-normal overflow-x-auto">
{`// Algoritmo de despacho FIFO en Back
const despacharFIFO = (productoId, sucursalId, cantidadSoli) => {
  const lotesDisponibles = db.query(
    "SELECT * FROM lotes WHERE id_producto = ? AND id_sucursal = ? AND stock > 0 ORDER BY fecha_vencimiento ASC",
    [productoId, sucursalId]
  );
  
  let restante = cantidadSoli;
  for (let lote of lotesDisponibles) {
    if (restante <= 0) break;
    const descontar = Math.min(lote.stock, restante);
    
    db.execute("UPDATE lotes SET stock = stock - ? WHERE id = ?", [descontar, lote.id]);
    db.insertKardex("SALIDA (VENTA)", lote.id, descontar);
    restante -= descontar;
  }
};`}
                  </pre>
                </div>
              </div>
            </div>

            {/* CONSULTAS SQL PARA EL DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[10px] bg-red-950 text-red-400 border border-red-900 rounded font-bold font-mono px-2 py-0.5 uppercase block w-max">
                  Consulta de Stock Bajo (Menos al límite regulatorio)
                </span>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Para emitir alertas preventivas en el tablero de administración y gatillar las sugerencias automáticas de compras (reabastecimiento) a los laboratorios.
                </p>
                <div className="bg-slate-900 p-3 rounded border border-slate-850 font-mono text-[10.5px] text-emerald-400">
                  <pre>{`SELECT 
    p.nombre AS nombre_medicamento,
    SUM(l.stock) AS stock_total_unidades,
    p.laboratorio,
    p.presentacion,
    CASE 
        WHEN SUM(l.stock) <= 15 THEN 'CRÍTICO' 
        ELSE 'BAJO' 
    END AS severidad
FROM lotes l
JOIN productos p ON l.id_producto = p.id
GROUP BY p.id, p.nombre, p.laboratorio, p.presentacion
HAVING SUM(l.stock) < 30 -- Límite mínimo determinado por local
ORDER BY stock_total_unidades ASC;`}</pre>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-900 rounded font-bold font-mono px-2 py-0.5 uppercase block w-max">
                  Consulta Alerta de Próximos a Vencer (3 y 6 meses)
                </span>
                <p className="text-xs text-slate-455 leading-relaxed">
                  Regulado por el MINSA. Devuelve todo medicamento cuyo lote expira prontamente, permitiendo segregar el stock en anaqueles para evitar multas DIGEMID.
                </p>
                <div className="bg-slate-900 p-3 rounded border border-slate-850 font-mono text-[10.5px] text-emerald-400">
                  <pre>{`SELECT 
    l.numero_lote,
    p.nombre AS medicamento,
    l.fecha_vencimiento,
    s.nombre AS establecimiento_sucursal,
    (l.fecha_vencimiento - CURRENT_DATE) AS dias_para_caducar,
    CASE 
        WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO - CRÍTICO MASIVO'
        WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '90 days' THEN 'VENCE EN MENOS DE 3 MESES'
        ELSE 'VENCE EN MENOS DE 6 MESES'
    END AS estado_alerta
FROM lotes l
JOIN productos p ON l.id_producto = p.id
JOIN sucursales s ON l.id_sucursal = s.id
WHERE l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '180 days'
ORDER BY l.fecha_vencimiento ASC;`}</pre>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
