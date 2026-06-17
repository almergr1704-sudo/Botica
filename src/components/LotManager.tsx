import React, { useState } from 'react';
import { Plus, Search, Calendar, ShieldAlert, CheckCircle, Trash2, HelpCircle, FileSpreadsheet, Building2, AlertTriangle } from 'lucide-react';
import { Lote, Producto, Sucursal } from '../types/pharmacy';

interface LotManagerProps {
  lots: Lote[];
  products: Producto[];
  branches: Sucursal[];
  onAddLot: (newLot: Omit<Lote, 'id'>) => void;
  onDeleteLot: (id: string) => void;
  onClearExpired: () => void;
}

export default function LotManager({
  lots,
  products,
  branches,
  onAddLot,
  onDeleteLot,
  onClearExpired
}: LotManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [expiryStatusFilter, setExpiryStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [newLotProduct, setNewLotProduct] = useState('');
  const [newLotBranch, setNewLotBranch] = useState('');
  const [newLotNumber, setNewLotNumber] = useState('');
  const [newLotExpiry, setNewLotExpiry] = useState('');
  const [newLotStock, setNewLotStock] = useState(100);
  const [newLotPriceC, setNewLotPriceC] = useState(0.10);
  const [newLotPriceV, setNewLotPriceV] = useState(0.30);
  const [formError, setFormError] = useState('');

  // Dispose state
  const [disposalReceipt, setDisposalReceipt] = useState<any | null>(null);

  const getDaysDiff = (expiryDateStr: string) => {
    const today = new Date();
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpirationStatus = (days: number) => {
    if (days < 0) return { label: 'Vencido', color: 'bg-red-100 text-red-800 border-red-200', type: 'expired' };
    if (days <= 30) return { label: 'Vence < 30 días', color: 'bg-orange-100 text-orange-850 border-orange-250', type: 'critical' };
    if (days <= 90) return { label: 'Vence < 90 días', color: 'bg-amber-100 text-amber-800 border-amber-200', type: 'warning' };
    return { label: 'Vigente (Ok)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', type: 'ok' };
  };

  const handleCreateLot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLotProduct || !newLotBranch || !newLotNumber || !newLotExpiry || newLotStock <= 0) {
      setFormError('Por favor complete todos los datos obligatorios.');
      return;
    }

    onAddLot({
      id_producto: newLotProduct,
      id_sucursal: newLotBranch,
      numero_lote: newLotNumber.toUpperCase(),
      fecha_vencimiento: newLotExpiry,
      stock: Number(newLotStock),
      stock_inicial: Number(newLotStock),
      precio_compra: Number(newLotPriceC),
      precio_venta: Number(newLotPriceV)
    });

    // Reset
    setNewLotProduct('');
    setNewLotBranch('');
    setNewLotNumber('');
    setNewLotExpiry('');
    setNewLotStock(100);
    setNewLotPriceC(0.10);
    setNewLotPriceV(0.30);
    setFormError('');
    setShowAddModal(false);
  };

  const handleSimulateDisposal = (lote: Lote) => {
    const prod = products.find(p => p.id === lote.id_producto);
    const branch = branches.find(b => b.id === lote.id_sucursal);
    
    // Genera acta de destrucción autorizada para Digemid
    const documentNo = `ACT-${Math.floor(100000 + Math.random() * 900000)}`;
    setDisposalReceipt({
      numActa: documentNo,
      producto: prod?.nombre,
      concentracion: prod?.concentracion,
      regSanitario: prod?.registro_sanitario,
      lote: lote.numero_lote,
      sucursal: branch?.nombre,
      direccion: branch?.direccion,
      cantidadBaja: lote.stock,
      fechaVcto: lote.fecha_vencimiento,
      fechaBaja: new Date().toLocaleDateString('es-PE'),
      farmaceuticoNombre: 'Dra. Patricia Mendoza Cruz (Col. FPS 18451)'
    });

    // Remueve el lote del stock actual
    onDeleteLot(lote.id);
  };

  const filteredLots = lots.filter(l => {
    const prod = products.find(p => p.id === l.id_producto);
    const matchesSearch = prod?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          prod?.principio_activo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.numero_lote.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBranch = selectedBranchFilter === '' || l.id_sucursal === selectedBranchFilter;
    
    const days = getDaysDiff(l.fecha_vencimiento);
    const statusType = getExpirationStatus(days).type;
    const matchesStatus = expiryStatusFilter === 'all' ||
                          (expiryStatusFilter === 'expired' && statusType === 'expired') ||
                          (expiryStatusFilter === 'critical' && (statusType === 'critical' || statusType === 'expired')) ||
                          (expiryStatusFilter === 'warning' && statusType === 'warning') ||
                          (expiryStatusFilter === 'ok' && statusType === 'ok');

    return matchesSearch && matchesBranch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Botones de Filtro e Ingreso */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-150 shadow-sm font-sans">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por lote o nombre producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 appearance-none"
            >
              <option value="">Todas las Sucursales</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.nombre.split(' - ')[1]}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <select
              value={expiryStatusFilter}
              onChange={(e) => setExpiryStatusFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 appearance-none"
            >
              <option value="all">Todos los Vencimientos</option>
              <option value="expired">Solo Expirados (Crítico DIGEMID)</option>
              <option value="critical">Vencidos o Próximos (&lt;30 días)</option>
              <option value="warning">Próximos a Vencer (&lt;90 días)</option>
              <option value="ok">Vigencia Segura (&gt;90 días)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Ingresar Nuevo Lote
          </button>
        </div>
      </div>

      {/* ACTA DE BAJA EMITIDA (Si se simuló retiro) */}
      {disposalReceipt && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 relative shadow-sm">
          <button
            onClick={() => setDisposalReceipt(null)}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
          <div className="flex gap-4 items-start">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-xs text-emerald-900 space-y-2">
              <h4 className="font-extrabold uppercase tracking-wide flex items-center gap-2">
                Acta de Retiro y Destrucción Emitida Correctamente ({disposalReceipt.numActa})
              </h4>
              <p>
                De acuerdo a las normativas de la DIGEMID, el lote ha sido dado de baja del sistema oficial de ventas 
                y trasladado al almacén de cuarentena para su posterior incineración y desecho industrial farmacéutico.
              </p>
              <div className="bg-white/80 border border-emerald-100 p-3 rounded-lg font-mono text-[11px] text-slate-700 space-y-1">
                <div><strong>Medicamento:</strong> {disposalReceipt.producto} {disposalReceipt.concentracion} (Reg: {disposalReceipt.regSanitario})</div>
                <div><strong>Lote Retirado:</strong> {disposalReceipt.lote} (Vencido el {disposalReceipt.fechaVcto})</div>
                <div><strong>Cantidad Destruida:</strong> {disposalReceipt.cantidadBaja} Unidades</div>
                <div><strong>Local:</strong> {disposalReceipt.sucursal} ({disposalReceipt.direccion})</div>
                <div><strong>Fecha de Ejecución:</strong> {disposalReceipt.fechaBaja}</div>
                <div><strong>Firma Farmacéutico:</strong> {disposalReceipt.farmaceuticoNombre}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de lotes */}
      <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 font-sans">
            Trazabilidad y Estado de Almacenes
          </h3>
          <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-100 font-bold font-mono px-2 py-0.5 rounded uppercase">
            FIFO (PEPS) Control
          </span>
        </div>

        {filteredLots.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No se encontraron lotes de inventario que correspondan a su búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600 font-sans">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-5">Medicamento / Presentación</th>
                  <th className="py-3 px-5">Ubicación / Sucursal</th>
                  <th className="py-3 px-5">N° Lote</th>
                  <th className="py-3 px-5">Vencimiento / Días Restantes</th>
                  <th className="py-3 px-5">Stock Físico</th>
                  <th className="py-3 px-5 text-right">Precios</th>
                  <th className="py-3 px-5 text-center">Acciones Normativas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLots.map(lote => {
                  const prod = products.find(p => p.id === lote.id_producto);
                  const branch = branches.find(b => b.id === lote.id_sucursal);
                  const days = getDaysDiff(lote.fecha_vencimiento);
                  const expiryUI = getExpirationStatus(days);

                  return (
                    <tr key={lote.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">{prod?.nombre}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">{prod?.principio_activo} • {prod?.presentacion}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{branch?.nombre.split(' - ')[1]}</span>
                          <span className="text-[10px] text-slate-450">{branch?.ciudad}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 font-mono font-bold text-blue-600">{lote.numero_lote}</td>
                      <td className="py-3 px-5">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-slate-700 font-semibold">{lote.fecha_vencimiento}</span>
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-semibold w-max ${expiryUI.color}`}>
                            {expiryUI.label} {days < 0 ? `(${Math.abs(days)}d vencido)` : `(${days} días)`}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex flex-col">
                          <span className={`font-mono text-sm font-bold ${lote.stock <= 15 ? 'text-red-600' : 'text-slate-800'}`}>
                            {lote.stock} / {lote.stock_inicial}
                          </span>
                          <span className="text-[9px] text-slate-400">unidades restantes</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right font-mono">
                        <div className="flex flex-col text-[10px]/tight text-slate-450">
                          <div><span className="font-medium text-slate-500">Compra:</span> S/ {lote.precio_compra.toFixed(2)}</div>
                          <div className="font-bold text-slate-800 text-xs mt-0.5">PV: S/ {lote.precio_venta.toFixed(2)}</div>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-center">
                        {days < 0 ? (
                          <button
                            onClick={() => handleSimulateDisposal(lote)}
                            className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded transition-all shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Retirar (Destrucción)
                          </button>
                        ) : days <= 95 ? (
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-100 rounded px-2 py-1 flex items-center gap-1 justify-center max-w-[140px] mx-auto">
                            <AlertTriangle className="w-3.5 h-3.5" /> Priorizar Venta
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-150 rounded px-2 py-1 inline-block">
                            Stock Disponible
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Agregar Lote */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Alta de Inventario Físico (Nuevo Lote)
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Ingrese lotes con su fecha de vencimiento correcta para el control DIGEMID.</p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setFormError(''); }}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLot} className="p-6 space-y-4 text-xs font-sans">
              {formError && (
                <div className="bg-red-50 text-red-750 p-3 rounded-lg border border-red-150 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Producto */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Medicamento Regulado *</label>
                  <select
                    required
                    value={newLotProduct}
                    onChange={(e) => setNewLotProduct(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    <option value="">Seleccione Medicamento...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.principio_activo} • Reg: {p.registro_sanitario})</option>
                    ))}
                  </select>
                </div>

                {/* Sucursal */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Establecimiento / Sucursal Destino *</label>
                  <select
                    required
                    value={newLotBranch}
                    onChange={(e) => setNewLotBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    <option value="">Seleccione Establecimiento Sucursal...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Número Lote */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Código de Lote Comercial *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: L-X0912A"
                      value={newLotNumber}
                      onChange={(e) => setNewLotNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>

                  {/* Vencimiento */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha de Vencimiento DIGEMID *</label>
                    <input
                      type="date"
                      required
                      value={newLotExpiry}
                      onChange={(e) => setNewLotExpiry(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>

                  {/* Stock */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Stock de Unidades Ingresadas *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newLotStock}
                      onChange={(e) => setNewLotStock(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>

                  {/* Precio Compra */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Precio Unitario Adquisición (Comp.) *</label>
                    <input
                      type="number"
                      required
                      step="0.001"
                      min="0.01"
                      value={newLotPriceC}
                      onChange={(e) => setNewLotPriceC(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>
                </div>

                {/* Precio Venta */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Precio Unitario de Venta al Público (PV) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={newLotPriceV}
                    onChange={(e) => setNewLotPriceV(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Sugerido para cálculo del 18% IGV en el comprobante electrónico.</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setFormError(''); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                >
                  Registrar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
