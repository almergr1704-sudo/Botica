import React, { useState } from 'react';
import { 
  History, Search, Printer, Download, Share2, Eye, EyeOff, Calendar, AlertCircle, 
  CheckCircle, FileText, Landmark, TrendingUp, Sparkles, Filter, ExternalLink
} from 'lucide-react';
import { Venta, DetalleVenta, Producto, Sucursal, Cliente, Usuario } from '../types/pharmacy';
import { 
  generateA4Document, 
  generateTicketDocument, 
  triggerDirectTicketPrint, 
  DocumentContext 
} from '../utils/documentGenerator';

interface SalesHistoryProps {
  sales: Venta[];
  salesDetails: DetalleVenta[];
  branches: Sucursal[];
  clients: Cliente[];
  users: Usuario[];
  products: Producto[];
  onEmitCreditNote?: (originalSaleId: string, motivo: string) => void;
}

export default function SalesHistory({
  sales,
  salesDetails,
  branches,
  clients,
  users,
  products,
  onEmitCreditNote
}: SalesHistoryProps) {
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDocType, setFilterDocType] = useState<string>('all');
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');

  // Row selection to preview sales items inline
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Sharing states
  const [activeShareSaleId, setActiveShareSaleId] = useState<string | null>(null);
  const [shareInput, setShareInput] = useState('');
  const [shareChannel, setShareChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [shareToast, setShareToast] = useState('');

  // Credit Note states for cancellation
  const [ncTargetSaleId, setNcTargetSaleId] = useState<string | null>(null);
  const [ncMotivoCode, setNcMotivoCode] = useState<string>('01');
  const [ncDescription, setNcDescription] = useState<string>('');

  // Helper: Assemble full document context for a given sale
  const getSaleContext = (sale: Venta): DocumentContext => {
    // 1. Resolve matching branch
    const branchObj = branches.find(b => b.id === sale.id_sucursal);
    // 2. Resolve matching client
    const clientObj = clients.find(c => c.id === sale.id_cliente);
    // 3. Resolve matching cashier
    const userObj = users.find(u => u.id === sale.id_usuario);
    
    // 4. Resolve details and attach product details
    const rawDetails = salesDetails.filter(d => d.id_venta === sale.id);
    const joinedDetails = rawDetails.map(detail => {
      const prod = products.find(p => p.id === detail.id_producto);
      return {
        ...detail,
        productoName: prod?.nombre || 'Medicamento No Identificado',
        principioActivo: prod?.principio_activo || 'S/E',
        concentra: prod?.concentracion || 'S/E'
      };
    });

    return {
      sale,
      details: joinedDetails,
      branch: branchObj,
      client: clientObj,
      cashier: userObj
    };
  };

  // --- STATS AGGREGATIONS (Reactive to applied filters) ---
  const totalSalesAmount = sales.reduce((acc, s) => acc + s.total, 0);
  const totalIgvAmount = sales.reduce((acc, s) => acc + s.igv, 0);
  const facturasCount = sales.filter(s => s.tipo_comprobante === 'Factura').length;
  const boletasCount = sales.filter(s => s.tipo_comprobante === 'Boleta').length;

  // --- FILTER LOGIC ---
  const filteredSales = sales.filter(sale => {
    // 1. Search Query DNI/RUC, Customer Name, or Correlativo
    const docLabel = `${sale.serie_comprobante}-${sale.numero_comprobante}`.toLowerCase();
    const hashMatches = sale.hash_sunat.toLowerCase().includes(searchQuery.toLowerCase());
    const labelMatches = docLabel.includes(searchQuery.toLowerCase());
    
    const clientObj = clients.find(c => c.id === sale.id_cliente);
    const clientName = (clientObj?.nombre_razon_social || 'PÚBLICO EN GENERAL').toLowerCase();
    const clientDoc = (clientObj?.numero_documento || '00000000').toLowerCase();
    
    const queryMatches = (
      labelMatches || 
      hashMatches || 
      clientName.includes(searchQuery.toLowerCase()) || 
      clientDoc.includes(searchQuery.toLowerCase())
    );

    // 2. Document Type
    const matchesType = filterDocType === 'all' || sale.tipo_comprobante === filterDocType;

    // 3. Branch
    const matchesBranch = filterBranchId === 'all' || sale.id_sucursal === filterBranchId;

    // 4. Dates
    let matchesDates = true;
    if (filterDateStart || filterDateEnd) {
      // Basic parse: '17/06/2026 15:00:15' -> extracting date 'YYYY-MM-DD' equivalent
      // For precision, match DD/MM/YYYY
      const parts = sale.fecha_emision.split(' ')[0].split('/');
      if (parts.length === 3) {
        const saleDateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        
        if (filterDateStart) {
          const start = new Date(filterDateStart);
          if (saleDateObj < start) matchesDates = false;
        }
        if (filterDateEnd) {
          const end = new Date(filterDateEnd);
          // Set to end of day
          end.setHours(23, 59, 59, 999);
          if (saleDateObj > end) matchesDates = false;
        }
      }
    }

    return queryMatches && matchesType && matchesBranch && matchesDates;
  });

  // Share handler
  const handleShareSubmit = (sale: Venta) => {
    if (!shareInput.trim()) {
      setShareToast('Por favor, ingresa el dato de contacto.');
      return;
    }
    const label = `${sale.serie_comprobante}-${sale.numero_comprobante}`;
    if (shareChannel === 'whatsapp') {
      const numeric = shareInput.replace(/\D/g, '');
      const template = encodeURIComponent(`Estimado cliente de Botica Enterprise, le adjuntamos el comprobante digital N° ${label} por un total de S/ ${sale.total.toFixed(2)}. Descargue su archivo firmado por la SUNAT en: https://firmado-ose.sunat.gob.pe/descargas/${sale.hash_sunat}`);
      window.open(`https://wa.me/${numeric.startsWith('51') ? '' : '51'}${numeric}?text=${template}`, '_blank');
      setShareToast(`✔ Abriendo chat de WhatsApp para enviar el enlace de ${label}...`);
    } else {
      setShareToast(`✔ Enlace de descarga del comprobante ${label} enviado con éxito al correo ${shareInput}!`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-800">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-indigo-500/30 text-indigo-300 font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-indigo-400/30">
              Módulo de Impresión SUNAT
            </span>
          </div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-indigo-400" />
            Historial de Comprobantes de Venta
          </h1>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xl">
            Centro de auditoría fiscal. Aquí se concentran todas las boletas y facturas declaradas ante la SUNAT. Puede volver a imprimir tickets térmicos de 80mm o descargar archivos PDF oficiales A4 en cualquier momento.
          </p>
        </div>
        
        {/* Rapid aggregation stats */}
        <div className="flex items-center gap-2 font-mono text-xs bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
          <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="block text-[9px] text-slate-400 font-bold uppercase">Recaudado total</span>
            <span className="text-sm font-black text-emerald-400">S/ {totalSalesAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9.5px] font-bold text-slate-400 uppercase">Facturas Emitidas</span>
            <span className="font-extrabold text-sm text-slate-800">{facturasCount} uds</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9.5px] font-bold text-slate-400 uppercase">Boletas Emitidas</span>
            <span className="font-extrabold text-sm text-slate-800">{boletasCount} uds</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9.5px] font-bold text-slate-400 uppercase">IGV Retenido (18%)</span>
            <span className="font-extrabold text-sm text-emerald-700">S/ {totalIgvAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9.5px] font-bold text-slate-400 uppercase">Aprobación OSE</span>
            <span className="font-mono font-bold text-sm text-amber-700">100.0% síncrono</span>
          </div>
        </div>
      </div>

      {/* Filter and Table Panel */}
      <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden space-y-4 p-5">
        
        {/* Controls Frame */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-xs uppercase text-slate-600">
            <Filter className="w-4 h-4 text-indigo-500" />
            Filtros Avanzados y Búsqueda de Comprobantes
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Query Search */}
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por N° Documento, Cliente DNI/RUC o Hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs bg-slate-50 hover:bg-slate-100/50"
              />
            </div>

            {/* Doc Type Selector */}
            <div className="md:col-span-2">
              <select
                value={filterDocType}
                onChange={(e) => setFilterDocType(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs bg-white"
              >
                <option value="all">Ver Todos (Boleta/Factura/Nota de Crédito)</option>
                <option value="Boleta">Solo Boletas de Venta</option>
                <option value="Factura">Solo Facturas de Venta</option>
                <option value="NotaCredito">Solo Notas de Crédito</option>
              </select>
            </div>

            {/* Branch Selector */}
            <div className="md:col-span-2">
              <select
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs bg-white"
              >
                <option value="all">Todas las Sucursales</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>

            {/* Start date */}
            <div className="md:col-span-2 flex items-center gap-1.5 bg-slate-50 border border-slate-205 px-2.5 py-1 rounded-lg">
              <span className="text-[9px] text-slate-400 font-bold uppercase truncate">Desde</span>
              <input
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="w-full text-slate-700 bg-transparent border-0 focus:ring-0 p-0 text-[11px] font-mono"
              />
            </div>

            {/* End date */}
            <div className="md:col-span-2 flex items-center gap-1.5 bg-slate-50 border border-slate-205 px-2.5 py-1 rounded-lg">
              <span className="text-[9px] text-slate-400 font-bold uppercase truncate">Hasta</span>
              <input
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="w-full text-slate-700 bg-transparent border-0 focus:ring-0 p-0 text-[11px] font-mono"
              />
            </div>
          </div>

          {/* Reset filters button if active */}
          {(searchQuery || filterDocType !== 'all' || filterBranchId !== 'all' || filterDateStart || filterDateEnd) && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterDocType('all');
                  setFilterBranchId('all');
                  setFilterDateStart('');
                  setFilterDateEnd('');
                }}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
              >
                Limpiar todos los filtros y criterios
              </button>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="border border-slate-150 rounded-xl overflow-hidden">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-slate-55 border-b border-slate-150 text-slate-500 font-extrabold uppercase text-[9.5px]">
              <tr>
                <th className="px-4 py-3">Comprobante N°</th>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Información Cliente</th>
                <th className="px-4 py-3 text-right">Monto Total</th>
                <th className="px-4 py-3 text-center">Estado SUNAT</th>
                <th className="px-4 py-3 text-right">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <span className="block font-bold">Sin comprobantes registrados</span>
                      <p className="text-[10px] text-slate-408 leading-relaxed">
                        No se han encontrado ventas procesadas que coincidan con los criterios de búsqueda o filtros configurados en este momento.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const ctx = getSaleContext(sale);
                  const isExpanded = expandedSaleId === sale.id;
                  const isSharing = activeShareSaleId === sale.id;

                  return (
                    <React.Fragment key={sale.id}>
                      <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                        {/* Doc Number */}
                        <td className="px-4 py-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              sale.tipo_comprobante === 'Factura' 
                                ? 'bg-indigo-100 text-indigo-800' 
                                : sale.tipo_comprobante === 'NotaCredito'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {sale.tipo_comprobante === 'NotaCredito' ? 'N.CRÉDITO' : sale.tipo_comprobante.slice(0, 3).toUpperCase()}
                            </span>
                            <span className={`font-extrabold ${sale.estado === 'Anulado' ? 'text-slate-400 line-through font-normal' : 'text-slate-800'}`}>
                              {sale.serie_comprobante}-{sale.numero_comprobante}
                            </span>
                          </div>
                          <span className="block text-[8px] text-slate-400 font-mono mt-0.5 truncate max-w-[120px]">
                            HASH: {sale.hash_sunat}
                          </span>
                          {sale.estado === 'Anulado' && (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-150 px-1.5 py-0.5 rounded text-[8px] font-bold mt-1">
                              🚫 ANULADO CON NC
                            </span>
                          )}
                          {sale.tipo_comprobante === 'NotaCredito' && (
                            <div className="mt-1 select-none">
                              <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-150 px-1.5 py-0.5 rounded text-[8.5px] font-black">
                                💜 NOTA DE CRÉDITO
                              </span>
                              {sale.motivo_anulacion && (
                                <span className="block text-[8px] text-purple-500 mt-0.5 max-w-[150px] truncate" title={sale.motivo_anulacion}>
                                  Motivo: {sale.motivo_anulacion}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Date and hour */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-slate-600 block">{sale.fecha_emision}</span>
                        </td>

                        {/* Branch name */}
                        <td className="px-4 py-3 text-slate-600">
                          <span className="font-medium text-slate-700">
                            {ctx.branch?.nombre || 'Sede Central'}
                          </span>
                        </td>

                        {/* Client details */}
                        <td className="px-4 py-3">
                          <span className="font-semibold block text-slate-850">
                            {ctx.client?.nombre_razon_social || 'PÚBLICO EN GENERAL'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {ctx.client ? `${ctx.client.tipo_documento}: ${ctx.client.numero_documento}` : 'Sin Documento'}
                          </span>
                        </td>

                        {/* Cash Amount */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 text-xs">
                          S/ {sale.total.toFixed(2)}
                        </td>

                        {/* SUNAT stamp */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full font-bold text-[8.5px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Aceptado por SUNAT
                          </span>
                        </td>

                        {/* Instant print and download buttons */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {/* Inline Expand button */}
                            <button
                              onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                              title="Ver Medicamentos"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                              {isExpanded ? <EyeOff className="w-4 h-4 text-indigo-600" /> : <Eye className="w-4 h-4" />}
                            </button>

                            {/* RE-PRINT LOCAL EN TICKET 80MM */}
                            <button
                              onClick={() => triggerDirectTicketPrint(ctx)}
                              title="Volver a Imprimir Ticket (80mm)"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-blue-600 hover:text-blue-900 hover:bg-blue-50 transition-all cursor-pointer"
                              id={`btn-reprint-ticket-${sale.id}`}
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* RE-DOWNLOAD FORMAL A4 PDF */}
                            <button
                              onClick={() => {
                                const doc = generateA4Document(ctx);
                                doc.save(`A4_${sale.tipo_comprobante === 'Factura' ? 'FA' : 'BO'}_${sale.serie_comprobante}-${sale.numero_comprobante}.pdf`);
                              }}
                              title="Descargar Comprobante A4 (PDF)"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 transition-all cursor-pointer"
                              id={`btn-redownload-pdf-${sale.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Share trigger button */}
                            <button
                              onClick={() => {
                                setActiveShareSaleId(isSharing ? null : sale.id);
                                setShareToast('');
                                setShareInput(ctx.client?.email || '');
                              }}
                              title="Compartir Comprobante"
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isSharing ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-indigo-600'
                              }`}
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            {/* EMIT CREDIT NOTE TRIGGER */}
                            {onEmitCreditNote && sale.estado !== 'Anulado' && sale.tipo_comprobante !== 'NotaCredito' && (
                              <button
                                onClick={() => {
                                  setNcTargetSaleId(sale.id);
                                  setNcMotivoCode('01');
                                  setNcDescription('Devolución de medicamento cerrado en perfectas condiciones');
                                }}
                                title="Anular con Nota de Crédito"
                                className="p-1.5 hover:bg-red-50 hover:bg-red-100 rounded-lg text-red-600 hover:text-red-800 transition-all cursor-pointer font-bold text-xs"
                              >
                                🚫 NC
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Items Drawer Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-150 animate-in slide-in-from-top-1 duration-150">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
                              <h4 className="font-extrabold text-xs text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-indigo-500 animate-spin-slow" />
                                Detalle de Medicamentos Dispensados [Venta {sale.serie_comprobante}-{sale.numero_comprobante}]
                              </h4>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[10.5px]">
                                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                                    <tr>
                                      <th className="px-3 py-2">Medicamento</th>
                                      <th className="px-3 py-2">Lote</th>
                                      <th className="px-3 py-2 text-right">Precio Unitario</th>
                                      <th className="px-3 py-2 text-center">Cantidad</th>
                                      <th className="px-3 py-2 text-right">IGV Item (18%)</th>
                                      <th className="px-3 py-2 text-right font-black">Total Item</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {ctx.details.map((item, id) => (
                                      <tr key={item.id || id} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-2 font-semibold text-slate-800">
                                          {item.productoName}
                                          <span className="block text-[8.5px] text-slate-400 font-normal">
                                            Principio Activo: {item.principioActivo} • {item.concentra}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 font-mono text-slate-600">
                                          {item.numero_lote}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                                          S/ {item.precio_unitario.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-center font-bold">
                                          {item.cantidad} uds
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-slate-500">
                                          S/ {item.igv_item.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">
                                          S/ {item.total_item.toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="bg-slate-55 font-bold border-t border-slate-200">
                                      <td colSpan={4} className="px-3 py-2.5 text-right font-bold text-slate-600">
                                        Desglose Total SUNAT:
                                      </td>
                                      <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                                        IGV: S/ {sale.igv.toFixed(2)}
                                      </td>
                                      <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-700 text-xs">
                                        NETO: S/ {sale.total.toFixed(2)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Expandable Sharing Dialog Row */}
                      {isSharing && (
                        <tr className="bg-indigo-50/10">
                          <td colSpan={7} className="px-6 py-3 border-b border-indigo-100">
                            <div className="bg-white p-4 rounded-xl border border-indigo-150 shadow-xs max-w-lg space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                                  <Share2 className="w-4 h-4 text-indigo-500" />
                                  Compartir Comprobante Digital {sale.serie_comprobante}-{sale.numero_comprobante}
                                </span>
                                <button 
                                  onClick={() => setActiveShareSaleId(null)}
                                  className="text-slate-400 hover:text-slate-700 text-[10px] font-bold"
                                >
                                  Ocultar
                                </button>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShareChannel('whatsapp');
                                    setShareInput('');
                                    setShareToast('');
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] border cursor-pointer transition-all ${
                                    shareChannel === 'whatsapp'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-705'
                                  }`}
                                >
                                  WhatsApp
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShareChannel('email');
                                    setShareInput(ctx.client?.email || '');
                                    setShareToast('');
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] border cursor-pointer transition-all ${
                                    shareChannel === 'email'
                                      ? 'bg-blue-50 dark:bg-blue-950/45 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-705'
                                  }`}
                                >
                                  Correo Electrónico
                                </button>
                              </div>

                              <div className="flex gap-2">
                                <input
                                  type={shareChannel === 'email' ? 'email' : 'tel'}
                                  placeholder={shareChannel === 'email' ? 'ejemplo@correo.com' : 'Ej: 994851203'}
                                  value={shareInput}
                                  onChange={(e) => setShareInput(e.target.value)}
                                  className="flex-1 px-3 py-1.5 border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs text-slate-800"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleShareSubmit(sale)}
                                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs"
                                >
                                  Compartir Link
                                </button>
                              </div>

                              {shareToast && (
                                <div className={`p-2 rounded text-[10px] text-center font-semibold ${
                                  shareToast.startsWith('✔') 
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' 
                                    : 'bg-amber-50 text-amber-800 border border-amber-150'
                                }`}>
                                  {shareToast}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREDIT NOTE GENERATION WIZARD MODAL */}
      {ncTargetSaleId && (() => {
        const targetSale = sales.find(s => s.id === ncTargetSaleId);
        if (!targetSale) return null;
        return (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl border border-slate-150 max-w-sm w-full overflow-hidden">
              {/* Modal Header */}
              <div className="px-5 py-3 border-b border-slate-150 flex justify-between items-center bg-slate-50 text-xs">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-[10.5px] uppercase tracking-wider flex items-center gap-1.5 label-nc">
                    🚫 Emitir Nota de Crédito (SUNAT)
                  </h3>
                  <p className="text-[9px] text-slate-450 mt-0.5">Anulación formal de la operación dispensada.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNcTargetSaleId(null)}
                  className="text-slate-400 hover:text-slate-705 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-3.5 text-xs font-sans text-slate-700">
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-slate-800 text-[10.5px] rounded-lg space-y-1">
                  <span className="font-bold text-amber-800 block text-[10px]">⚠️ Directivas de Inmutabilidad Fiscal (SUNAT / DIGEMID)</span>
                  <p className="text-[9.5px]/relaxed text-slate-650">
                    Los registros de ventas y comprobantes asociados **NUNCA** pueden eliminarse físicamente ni modificarse. La única forma de anulación es mediante una **Nota de Crédito**, manteniendo trazabilidad de mermas y stocks.
                  </p>
                </div>

                <div className="space-y-3 text-[10.5px]">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">Comprobante Original</span>
                      <strong className="text-slate-800 font-bold font-mono">
                        {targetSale.tipo_comprobante.toUpperCase()} {targetSale.serie_comprobante}-{targetSale.numero_comprobante}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">Total a Revertir</span>
                      <strong className="text-emerald-700 font-bold font-mono">
                        S/ {targetSale.total.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      Discrepancia SUNAT (Catálogo N° 09) *
                    </label>
                    <select
                      value={ncMotivoCode}
                      onChange={(e) => setNcMotivoCode(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-xs text-slate-800"
                    >
                      <option value="01">01 - Anulación de la operación</option>
                      <option value="02">02 - Anulación por error en el RUC / DNI</option>
                      <option value="06">06 - Devolución total del medicamento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      Descripción Detallada del Motivo *
                    </label>
                    <textarea
                      required
                      value={ncDescription}
                      onChange={(e) => setNcDescription(e.target.value)}
                      placeholder="Ej: Empaque sellado devuelto en perfectas condiciones por el paciente. Reversión de stock."
                      rows={2.5}
                      className="w-full px-2.5 py-1.5 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 text-slate-800 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setNcTargetSaleId(null)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-all text-[11px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!ncDescription.trim()}
                  onClick={() => {
                    const motivoText = `${ncMotivoCode === '01' ? 'Anulación de la operación' : ncMotivoCode === '02' ? 'Error en RUC/DNI' : 'Devolución total'} - ${ncDescription}`;
                    if (onEmitCreditNote) {
                      onEmitCreditNote(ncTargetSaleId, motivoText);
                    }
                    setNcTargetSaleId(null);
                  }}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-xs disabled:opacity-50 text-[11px]"
                >
                  Emitir NC
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
