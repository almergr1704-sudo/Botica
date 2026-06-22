import React, { useState } from 'react';
import { 
  ShoppingBag, AlertTriangle, Boxes, CheckCircle2, FileText, Ban, Building2, Lock, 
  Edit3, ShieldCheck, ClipboardCheck, Users, Building, User, Truck, Package, Tag, 
  Settings, CreditCard, ShieldAlert, MapPin, Database, Layers, Coins, Calendar, FileCheck, Info
} from 'lucide-react';
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
  const [activePolicyTab, setActivePolicyTab] = useState<'all' | 'editable' | 'critical'>('all');
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
        <div id="digemid-critical-alert" className="bg-red-50 dark:bg-rose-950/20 border-l-4 border-red-600 dark:border-red-500 p-5 rounded-xl shadow-md border border-red-200 dark:border-red-900/60 transition-all">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full text-red-700 dark:text-red-300 mt-0.5 shrink-0">
                <AlertTriangle className="w-5.5 h-5.5" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-red-950 dark:text-red-100 font-sans uppercase tracking-tight flex items-center gap-1.5">
                  Alerta Crítica DIGEMID: Medicamentos Vencidos en Almacén ({expiredLots.length})
                </h4>
                <p className="text-xs md:text-sm text-red-900 dark:text-red-200 mt-1 leading-relaxed font-semibold">
                  Se han detectado lotes de medicamentos cuya fecha de caducidad ha expirado. De acuerdo con la normativa del{' '}
                  <strong className="text-red-950 dark:text-red-100 underline decoration-red-600 font-black">Ministerio de Salud y DIGEMID en el Perú</strong>, poseer stock vencido en las estanterías de venta constituye una falta muy grave que amerita una multa de hasta <strong>5 UIT o la clausura temporal del local</strong>.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => onNavigate('lots')}
                    className="text-xs font-extrabold text-red-950 dark:text-red-100 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-700 px-4 py-2 rounded-lg transition-all cursor-pointer shadow-3xs"
                  >
                    Ver Lotes Vencidos 🔍
                  </button>
                  <button
                    onClick={onClearExpired}
                    className="text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500 px-4 py-2 rounded-lg transition-all shadow-md cursor-pointer uppercase font-mono tracking-wider"
                  >
                    Simular Baja de Lotes (Retiro DIGEMID) ✔
                  </button>
                </div>
              </div>
            </div>
            <span className="text-[11px] bg-red-200 dark:bg-red-900 text-red-950 dark:text-white font-black font-sans px-3 py-1.5 rounded-full border-2 border-red-400 dark:border-red-700 uppercase tracking-wider shrink-0 shadow-2xs antialiased mr-2">
              🚨 Multa Inminente 5 UIT
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

      {/* SECCIÓN NUEVA: POLÍTICA DE GESTIÓN Y SEGURIDAD DE DATOS (REQUISITO EXPLICITO) */}
      <div id="data-policy-control-panel" className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-slate-300 dark:border-slate-800 p-6 shadow-md space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-5 border-b-2 border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              Directiva de Seguridad: Auditorías y Clasificación Transaccional
            </h4>
            <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 mt-1 font-medium max-w-3xl">
              Control de edición reglamentaria bajo normas SUNAT (R.S. N° 097-2012) y buenas prácticas de trazabilidad farmacéutica DIGEMID.
            </p>
          </div>
          
          <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl border-2 border-slate-300 dark:border-slate-700 font-sans text-xs shrink-0 shadow-xs">
            <button
              onClick={() => setActivePolicyTab('all')}
              className={`px-4 py-2 font-black rounded-lg transition-all cursor-pointer ${
                activePolicyTab === 'all' 
                  ? 'bg-slate-900 text-white dark:bg-slate-700 dark:text-white shadow-xs' 
                  : 'text-slate-700 dark:text-slate-350 hover:bg-slate-300 dark:hover:bg-slate-750'
              }`}
            >
              Todos ({11 + 9})
            </button>
            <button
              onClick={() => setActivePolicyTab('editable')}
              className={`px-4 py-2 font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activePolicyTab === 'editable' 
                  ? 'bg-blue-700 text-white shadow-xs' 
                  : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'
              }`}
            >
              <Edit3 className="w-4 h-4 mr-0.5 text-blue-600 dark:text-blue-300" />
              Editables ({11})
            </button>
            <button
              onClick={() => setActivePolicyTab('critical')}
              className={`px-4 py-2 font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activePolicyTab === 'critical' 
                  ? 'bg-rose-700 text-white shadow-xs' 
                  : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
            >
              <Lock className="w-4 h-4 mr-0.5 text-rose-600 dark:text-rose-300" />
              Inmutables ({9})
            </button>
          </div>
        </div>

        {/* Dynamic Display Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* COL 1: Datos Editables y Eliminables */}
          {(activePolicyTab === 'all' || activePolicyTab === 'editable') && (
            <div className="bg-white dark:bg-slate-950 border-2 border-blue-200 dark:border-blue-900/60 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm font-black text-blue-900 dark:text-blue-300 uppercase tracking-wide">
                <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-blue-950 dark:text-blue-200">
                  <Edit3 className="w-5.5 h-5.5 text-blue-600 dark:text-blue-400" />
                  Datos Maestros Editables
                </span>
                <span className="text-[10.5px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs antialiased uppercase tracking-wider">
                  <span className="w-2 h-2 bg-emerald-600 dark:bg-emerald-400 rounded-full animate-pulse shrink-0"></span>
                  Auditoría Activa v1.0
                </span>
              </div>
              
              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-950 dark:text-blue-200 leading-relaxed font-semibold">
                Registros principales modificables bajo control regulado. Toda edición guarda un log indeleble del usuario, timestamp, IP y valores anteriores.
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Master Cards - Editable */}
                <div className="group p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800/80 rounded-xl hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Staff y Usuarios</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Controles de accesos</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-350 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    Editable
                  </span>
                </div>

                <div className="group p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800/80 rounded-xl hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                      <Building2 className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Sucursales Filiales</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Locales autorizados</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-350 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    Editable
                  </span>
                </div>

                <div className="group p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800/80 rounded-xl hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                      <User className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Clientes de POS</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Fichero de pacientes</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-350 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    Editable
                  </span>
                </div>

                <div className="group p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800/80 rounded-xl hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                      <Truck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Droguerías</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium font-sans">Proveedores químicos</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-350 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    Editable
                  </span>
                </div>

                <div className="group p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800/80 rounded-xl hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                      <Package className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Catálogo / Medicinas</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Códigos DIGEMID</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-350 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    Editable
                  </span>
                </div>

                <div className="group p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800/80 rounded-xl hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                      <Tag className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Categorías & Marcas</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Laboratorios y líneas</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-350 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    Editable
                  </span>
                </div>

                <div className="group p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800/80 rounded-xl hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                      <Settings className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Configuración</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Propiedades SOL, IGV</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-350 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    Editable
                  </span>
                </div>

                <div className="group p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800/80 rounded-xl hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                      <CreditCard className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Métodos de Pago</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Bancos, POS y Yape</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-350 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    Editable
                  </span>
                </div>

                <div className="group p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800/80 rounded-xl hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Roles y Permisos</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Privilegios de personal</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-350 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    Editable
                  </span>
                </div>

                <div className="group p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800/80 rounded-xl hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                      <MapPin className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Fichas de Dirección</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Ubicación y despachos</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-350 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    Editable
                  </span>
                </div>

                <div className="col-span-1 sm:col-span-2 group p-3.5 bg-blue-50/30 dark:bg-blue-950/20 border-2 border-dashed border-blue-200 dark:border-blue-800/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg">
                      <Boxes className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-blue-950 dark:text-blue-100 text-xs block">Lotes Creados por Error</span>
                      <span className="text-[10px] text-blue-800 dark:text-blue-450 font-semibold leading-relaxed">Admite correcciones manuales antes de vincular transacciones activas en caja.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COL 2: Datos Críticos INMUTABLES */}
          {(activePolicyTab === 'all' || activePolicyTab === 'critical') && (
            <div className="bg-white dark:bg-slate-950 border-2 border-red-200 dark:border-red-900/60 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm font-black text-rose-900 dark:text-rose-300 uppercase tracking-wide">
                <span className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-rose-950 dark:text-rose-200">
                  <Lock className="w-5.5 h-5.5 text-rose-650 dark:text-rose-450" />
                  Registros Críticos Inmutables
                </span>
                <span className="text-[10.5px] font-extrabold bg-red-100 dark:bg-red-950/60 text-red-900 dark:text-red-300 px-3 py-1 rounded-full border border-red-300 dark:border-red-800 flex items-center gap-1.5 shadow-2xs antialiased uppercase tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                  Bloqueo Activo SUNAT
                </span>
              </div>
              
              <div className="bg-red-50/50 dark:bg-red-950/20 p-3.5 rounded-xl border border-red-100 dark:border-red-900/40 text-xs text-red-950 dark:text-red-200 leading-relaxed font-semibold">
                La legislación farmacéutica y tributaria prohibe toda alteración o borrado de transacciones. Requiere notas de crédito/débito para cambios.
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Master Cards - Immutable */}
                <div className="group p-3 bg-red-50/5 dark:bg-slate-900 border-2 border-rose-100/50 dark:border-rose-950/60 rounded-xl hover:shadow-md hover:border-red-500 dark:hover:border-red-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Boletas Emitidas</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Boletas de venta POS</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-105 dark:bg-red-950 text-red-800 dark:text-red-350 border border-red-300 dark:border-red-800 flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                    Firme
                  </span>
                </div>

                <div className="group p-3 bg-red-50/5 dark:bg-slate-900 border-2 border-rose-100/50 dark:border-rose-950/60 rounded-xl hover:shadow-md hover:border-red-500 dark:hover:border-red-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg">
                      <FileCheck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Facturas Firmadas</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">UBL 2.1 a SUNAT/OSE</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-105 dark:bg-red-950 text-red-800 dark:text-red-350 border border-red-300 dark:border-red-800 flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                    Firme
                  </span>
                </div>

                <div className="group p-3 bg-red-50/5 dark:bg-slate-900 border-2 border-rose-100/50 dark:border-rose-950/60 rounded-xl hover:shadow-md hover:border-red-500 dark:hover:border-red-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg">
                      <Coins className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Notas de Crédito</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Corrección de facturas</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-105 dark:bg-red-950 text-red-800 dark:text-red-350 border border-red-300 dark:border-red-800 flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                    Firme
                  </span>
                </div>

                <div className="group p-3 bg-red-50/5 dark:bg-slate-900 border-2 border-rose-100/50 dark:border-rose-950/60 rounded-xl hover:shadow-md hover:border-red-500 dark:hover:border-red-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg">
                      <ShoppingBag className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Historial Ventas</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Tesorera y arqueos</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-105 dark:bg-red-950 text-red-800 dark:text-red-350 border border-red-300 dark:border-red-800 flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                    Firme
                  </span>
                </div>

                <div className="group p-3 bg-red-50/5 dark:bg-slate-900 border-2 border-rose-100/50 dark:border-rose-950/60 rounded-xl hover:shadow-md hover:border-red-500 dark:hover:border-red-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg">
                      <Database className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Kárdex Contable</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Movimiento mercaderías</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-105 dark:bg-red-950 text-red-800 dark:text-red-350 border border-red-300 dark:border-red-800 flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                    Firme
                  </span>
                </div>

                <div className="group p-3 bg-red-50/5 dark:bg-slate-900 border-2 border-rose-100/50 dark:border-rose-950/60 rounded-xl hover:shadow-md hover:border-red-500 dark:hover:border-red-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg">
                      <ClipboardCheck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Movimientos Caja</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Efectivos reconciliados</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-105 dark:bg-red-950 text-red-800 dark:text-red-350 border border-red-300 dark:border-red-800 flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                    Firme
                  </span>
                </div>

                <div className="group p-3 bg-red-50/5 dark:bg-slate-900 border-2 border-rose-100/50 dark:border-rose-950/60 rounded-xl hover:shadow-md hover:border-red-500 dark:hover:border-red-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg">
                      <Layers className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Libros Oficiales</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Formatos electrónicos PLE</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-105 dark:bg-red-950 text-red-800 dark:text-red-350 border border-red-300 dark:border-red-800 flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                    Firme
                  </span>
                </div>

                <div className="group p-3 bg-red-50/5 dark:bg-slate-900 border-2 border-rose-100/50 dark:border-rose-950/60 rounded-xl hover:shadow-md hover:border-red-500 dark:hover:border-red-400 hover:scale-[1.01] transition-all duration-150 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg">
                      <ShieldAlert className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">Logs de Auditoría</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium font-sans">Huellas digitales</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-105 dark:bg-red-950 text-red-800 dark:text-red-350 border border-red-300 dark:border-red-800 flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                    Firme
                  </span>
                </div>

                <div className="col-span-1 sm:col-span-2 group p-3.5 bg-rose-50/30 dark:bg-rose-950/20 border-2 border-dashed border-rose-200 dark:border-rose-800/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100/85 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg">
                      <Lock className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-rose-950 dark:text-rose-100 text-xs block">Inventario Físico Declarado</span>
                      <span className="text-[10px] text-rose-800 dark:text-rose-450 font-semibold leading-relaxed">Los saldos no admiten descuentos ni mermas extraordinarias sin la firma digital de auditoría autorizada.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Auditor log confirmation footer inside widget */}
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-850 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between text-xs font-bold text-slate-850 dark:text-slate-200">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Bitácora Oficial Conforme: Todos los cambios a datos maestros del sistema se registran con hash criptográfico en base de datos.</span>
          </span>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded bg-teal-100 dark:bg-teal-950 text-teal-850 dark:text-teal-300 border border-teal-300 dark:border-teal-800 flex items-center gap-1 cursor-help shrink-0" title="Todo el software cumple los estándares regulatorios peruanos.">
            <Info className="w-3.5 h-3.5" />
            Certificado DIGEMID UBL 2.1
          </span>
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
