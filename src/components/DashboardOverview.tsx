import React from 'react';
import { ShoppingBag, AlertTriangle, Boxes, CheckCircle2, FileText, Ban, Building2 } from 'lucide-react';
import { Lote, Producto, Sucursal, Venta } from '../types/pharmacy';

interface DashboardOverviewProps {
  products: Producto[];
  lots: Lote[];
  branches: Sucursal[];
  sales: Venta[];
  onNavigate: (tab: 'pos' | 'lots' | 'products' | 'clients_suppliers' | 'architecture') => void;
  onClearExpired: () => void;
}

export default function DashboardOverview({
  products,
  lots,
  branches,
  sales,
  onNavigate,
  onClearExpired
}: DashboardOverviewProps) {
  // Stat calculators
  const totalStock = lots.reduce((acc, curr) => acc + curr.stock, 0);
  const totalInventoryValue = lots.reduce((acc, curr) => acc + (curr.stock * curr.precio_venta), 0);

  const currentDateObj = new Date();
  
  const expiredLots = lots.filter(l => {
    const expDate = new Date(l.fecha_vencimiento);
    return expDate < currentDateObj;
  });

  const soonExpiringLots = lots.filter(l => {
    const expDate = new Date(l.fecha_vencimiento);
    const diffTime = expDate.getTime() - currentDateObj.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 90;
  });

  const lowStockLots = lots.filter(l => l.stock > 0 && l.stock <= 15);

  const totalSalesAmount = sales.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="space-y-6">
      {/* Alertas de Emergencia por DIGEMID */}
      {expiredLots.length > 0 && (
        <div id="digemid-critical-alert" className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex gap-3">
              <div className="p-1 bg-red-100 rounded-full text-red-600 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-900 font-sans uppercase">
                  Alerta Crítica DIGEMID: Medicamentos Vencidos en Almacén ({expiredLots.length})
                </h4>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  Se han detectado lotes de medicamentos cuya fecha de caducidad ha expirado. De acuerdo con la normativa del 
                  <strong className="text-red-900"> Ministerio de Salud y DIGEMID en el Perú</strong>, poseer stock vencido en las estanterías de venta 
                  constituye una falta muy grave que amerita una multa de hasta <strong>5 UIT o la clausura temporal del local</strong>.
                </p>
                <div className="mt-3 flex gap-4">
                  <button
                    onClick={() => onNavigate('lots')}
                    className="text-xs font-semibold text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded transition-all"
                  >
                    Ver Lotes Afectados
                  </button>
                  <button
                    onClick={onClearExpired}
                    className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded transition-all shadow-sm"
                  >
                    Simular Baja de Lotes (Retiro DIGEMID)
                  </button>
                </div>
              </div>
            </div>
            <span className="text-[10px] bg-red-100 text-red-800 font-mono px-2 py-0.5 rounded border border-red-250 font-bold uppercase">
              Multa Inminente
            </span>
          </div>
        </div>
      )}

      {/* Grid de KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div id="kpi-sales" className="bg-white p-5 rounded-xl border border-slate-150 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute right-4 top-4 p-3 bg-teal-50 text-teal-600 rounded-lg">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide uppercase">Ventas de Hoy</span>
          <h3 className="text-2xl font-bold font-sans text-slate-800 mt-1">S/ {totalSalesAmount.toFixed(2)}</h3>
          <p className="text-[11px] text-teal-600 mt-2 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            100% Declarado a SUNAT
          </p>
        </div>

        {/* KPI 2 */}
        <div id="kpi-expiration" className={`bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden transition-all hover:shadow-md ${soonExpiringLots.length > 0 ? 'border-amber-250' : 'border-slate-150'}`}>
          <div className="absolute right-4 top-4 p-3 bg-amber-50 text-amber-600 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide uppercase">Próximos a Vencer (&lt;90d)</span>
          <h3 className="text-2xl font-bold font-sans text-slate-800 mt-1">{soonExpiringLots.length} lotes</h3>
          <p className="text-[11px] text-amber-600 mt-2 font-medium">
            Prioridad alta en POS (Regla FIFO)
          </p>
        </div>

        {/* KPI 3 */}
        <div id="kpi-stock" className="bg-white p-5 rounded-xl border border-slate-150 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute right-4 top-4 p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Boxes className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide uppercase">Medicamentos en Inventario</span>
          <h3 className="text-2xl font-bold font-sans text-slate-800 mt-1">{totalStock.toLocaleString()} unds</h3>
          <p className="text-[11px] text-blue-600 mt-2 font-medium">
            S/ {totalInventoryValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} en valor venta
          </p>
        </div>

        {/* KPI 4 */}
        <div id="kpi-branches" className="bg-white p-5 rounded-xl border border-slate-150 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute right-4 top-4 p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide uppercase">Sucursales Activas</span>
          <h3 className="text-2xl font-bold font-sans text-slate-800 mt-1">{branches.length} Locales</h3>
          <p className="text-[11px] text-purple-600 mt-2 font-medium">
            {products.length} productos autorizados DIGEMID
          </p>
        </div>
      </div>

      {/* Panel Central con Alertas de Stock Crítico y Ventas Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Lado Izquierdo: Control de Inventario y Alertas */}
        <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-sm">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 font-sans">
                Alertas de Distribución y Quiebre de Stock
              </h3>
              <p className="text-xs text-slate-400">
                Lotes críticos que requieren reabastecimiento o devolución.
              </p>
            </div>
            <button
              onClick={() => onNavigate('lots')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Ver todos
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {lowStockLots.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-sans">
                No hay productos en quiebre de stock actualmente.
              </div>
            ) : (
              lowStockLots.slice(0, 4).map(l => {
                const prod = products.find(p => p.id === l.id_producto);
                const branch = branches.find(b => b.id === l.id_sucursal);
                return (
                  <div key={l.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-700">{prod?.nombre}</span>
                      <div className="flex gap-2 items-center text-[10px] text-slate-400 mt-0.5">
                        <span>Lote: {l.numero_lote}</span>
                        <span>•</span>
                        <span>{branch?.nombre.split(' - ')[1]}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                        {l.stock} unds
                      </span>
                      <span className="block text-[9px] text-slate-400 mt-1">Stock Crítico</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Caja Informativa DIGEMID de Buenas Prácticas de Almacenamiento (BPA) */}
          <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs leading-relaxed text-blue-800">
            <span className="font-bold block mb-0.5">💡 Norma Técnica de Salud N° 116-MINSA/DIGEMID (BPA):</span>
            El establecimiento farmacéutico debe asegurar una temperatura constante menor a 30°C (o refrigeración si aplica). Los estantes deben estar codificados y la rotación de stocks debe aplicar la metodología <strong className="text-blue-900">FIFO/PVPS (Primero en Vencer, Primero en Salir)</strong>. El sistema bloquea automáticamente lotes bloqueados por alertas de calidad.
          </div>
        </div>

        {/* Lado Derecho: Transacciones del Día y SUNAT Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-sm">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 font-sans">
                Últimos Comprobantes de Pago Generados
              </h3>
              <p className="text-xs text-slate-400">
                Estatus de envío a los servidores de SUNAT.
              </p>
            </div>
            <button
              onClick={() => onNavigate('pos')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded border border-blue-100"
            >
              Ir a Caja (POS)
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {sales.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <span className="text-xs text-slate-400">Ninguna venta registrada el día de hoy.</span>
                <button
                  onClick={() => onNavigate('pos')}
                  className="mt-3 text-xs text-blue-600 underline block mx-auto font-semibold"
                >
                  Abrir primer ticket de caja
                </button>
              </div>
            ) : (
              [...sales].reverse().slice(0, 4).map(sale => {
                const branch = branches.find(b => b.id === sale.id_sucursal);
                return (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-800">
                          {sale.tipo_comprobante} {sale.serie_comprobante}-{sale.numero_comprobante}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          sale.estado_sunat === 'Aceptado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sale.estado_sunat === 'Pendiente'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {sale.estado_sunat}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {branch?.nombre.split(' - ')[1]} | {sale.fecha_emision.split(' ')[1]}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold font-mono text-slate-800">
                        S/ {sale.total.toFixed(2)}
                      </span>
                      <span className="block text-[9px] text-slate-400 mt-1">IGV: S/ {sale.igv.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Caja Informativa SUNAT de Contingencia */}
          <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs leading-relaxed text-purple-800">
            <span className="font-bold block mb-0.5">🛡️ SUNAT Facturación Directa UBL 2.1:</span>
            Los comprobantes generados se envían en lotes usando la clave SOL del contribuyente o del OSE proveedor de servicios. Si ocurre caída de internet, los comprobantes quedan en estatus <strong>Pendiente</strong> con firma digital, listos para sincronizarse automáticamente de acuerdo con el plazo máximo permitido de 3 días para su envío a SUNAT.
          </div>
        </div>

      </div>
    </div>
  );
}
