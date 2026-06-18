import React, { useState } from 'react';
import { 
  ShoppingBag, ArrowUpRight, ArrowDownLeft, FileText, Calendar, Plus, 
  RefreshCw, Layers, Database, Calculator, CheckCircle2, ShieldAlert,
  Trash2, ArrowRightLeft, AlertTriangle, Send
} from 'lucide-react';
import { Producto, Lote, Proveedor, Sucursal } from '../types/pharmacy';

interface KardexEntry {
  id: string;
  fecha: string;
  tipo_movimiento: 'ENTRADA (COMPRA)' | 'SALIDA (VENTA)' | 'RETIRO (BAJA)' | 'AJUSTE ENTRADA' | 'AJUSTE SALIDA' | 'TRANSFERENCIA ENTRADA' | 'TRANSFERENCIA SALIDA';
  comprobante: string;
  empresa_relacionada: string; // Proveedor o Cliente o Destino
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
  onUpdateLots: (updatedLots: Lote[]) => void;
}

interface DynamicPurchaseItem {
  key: string;
  id_producto: string;
  numero_lote: string;
  fecha_vencimiento: string;
  stock: number;
  precio_compra: number;
  precio_venta: number;
}

export default function KardexPurchases({
  products,
  lots,
  suppliers,
  branches,
  onAddLot,
  onRefreshLots,
  onUpdateLots
}: KardexPurchasesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'purchases' | 'kardex_view' | 'transfers' | 'alerts' | 'fifo_logic'>('purchases');
  
  // States representing simulated Kardex logs
  const [kardexLog, setKardexLog] = useState<KardexEntry[]>([
    {
      id: 'k-01',
      fecha: '2026-06-18 09:15:00',
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
      fecha: '2026-06-18 11:30:00',
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
      fecha: '2026-06-18 16:15:02',
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
      fecha: '2026-06-18 11:34:20',
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

  // General Form States for Purchase Header
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('suc-01');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  
  // DYNAMIC TABLE state for adding multiple products under Prompt 2 (Versión Corregida)
  const [dynamicPurchaseItems, setDynamicPurchaseItems] = useState<DynamicPurchaseItem[]>([
    {
      key: `item-${Date.now()}-1`,
      id_producto: '',
      numero_lote: '',
      fecha_vencimiento: '',
      stock: 100,
      precio_compra: 0.50,
      precio_venta: 1.20
    }
  ]);

  // Form Success / Error feedback
  const [formSuccessMsg, setFormSuccessMsg] = useState('');
  const [formErrorMsg, setFormErrorMsg] = useState('');

  // Inventory Adjustment states
  const [selectedLotForAdjustment, setSelectedLotForAdjustment] = useState<string>('');
  const [adjustmentNewStock, setAdjustmentNewStock] = useState<number>(0);
  const [adjustmentMotif, setAdjustmentMotif] = useState<string>('');
  const [adjustmentSuccess, setAdjustmentSuccess] = useState<string>('');

  // Branch Transfer states
  const [transferProductId, setTransferProductId] = useState<string>('');
  const [transferSourceLotId, setTransferSourceLotId] = useState<string>('');
  const [transferTargetBranchId, setTransferTargetBranchId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<number>(10);
  const [transferSuccess, setTransferSuccess] = useState<string>('');
  const [transferError, setTransferError] = useState<string>('');

  // Alerts Actions state
  const [reportingAlertId, setReportingAlertId] = useState<string>('');

  // Handle Dynamic Table manipulations
  const handleAddPurchaseRow = () => {
    setDynamicPurchaseItems([
      ...dynamicPurchaseItems,
      {
        key: `item-${Date.now()}-${dynamicPurchaseItems.length + 1}`,
        id_producto: '',
        numero_lote: '',
        fecha_vencimiento: '',
        stock: 100,
        precio_compra: 0.50,
        precio_venta: 1.20
      }
    ]);
  };

  const handleRemovePurchaseRow = (key: string) => {
    if (dynamicPurchaseItems.length === 1) {
      setFormErrorMsg('Debe ingresar obligatoriamente al menos un producto en la tabla de compras.');
      return;
    }
    setDynamicPurchaseItems(dynamicPurchaseItems.filter(item => item.key !== key));
  };

  const handleUpdatePurchaseItem = (key: string, field: keyof DynamicPurchaseItem, value: any) => {
    setDynamicPurchaseItems(
      dynamicPurchaseItems.map(item => {
        if (item.key === key) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Full purchase registry with dynamic items
  const handleRegisterReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccessMsg('');
    setFormErrorMsg('');

    if (!selectedSupplierId || !selectedBranchId || !invoiceNumber) {
      setFormErrorMsg('Por favor complete los datos generales del proveedor y factura de compra.');
      return;
    }

    // Check if any empty products exist in the dynamic rows
    const hasIncompleteRows = dynamicPurchaseItems.some(
      item => !item.id_producto || !item.numero_lote || !item.fecha_vencimiento || item.stock <= 0
    );

    if (hasIncompleteRows) {
      setFormErrorMsg('Error: Complete todos los campos solicitados de forma obligatoria para cada producto (Medicamento, Lote, Fecha Vencimiento y Cantidad).');
      return;
    }

    const supplierObj = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplierObj) {
      setFormErrorMsg('Proveedor inválido.');
      return;
    }

    const dateNow = new Date();
    const formattedDate = `${dateNow.toISOString().split('T')[0]} ${dateNow.toLocaleTimeString('es-PE')}`;
    const newKardexEntries: KardexEntry[] = [];

    // Save each purchase as a lot & register inside Kardex
    dynamicPurchaseItems.forEach((item, index) => {
      const prodObj = products.find(p => p.id === item.id_producto);
      if (!prodObj) return;

      // Add Lot via existing app callback
      onAddLot({
        id_producto: item.id_producto,
        id_sucursal: selectedBranchId,
        numero_lote: item.numero_lote.toUpperCase().trim(),
        fecha_vencimiento: item.fecha_vencimiento,
        stock: item.stock,
        stock_inicial: item.stock,
        precio_compra: item.precio_compra,
        precio_venta: item.precio_venta
      });

      // Assemble corresponding Kardex log
      newKardexEntries.push({
        id: `k-${Date.now()}-${index}`,
        fecha: formattedDate,
        tipo_movimiento: 'ENTRADA (COMPRA)',
        comprobante: `Factura ${invoiceNumber}`,
        empresa_relacionada: supplierObj.razon_social,
        producto_nombre: prodObj.nombre,
        numero_lote: item.numero_lote.toUpperCase().trim(),
        cantidad: item.stock,
        precio_unitario: item.precio_compra,
        valor_total: item.stock * item.precio_compra
      });
    });

    setKardexLog([...newKardexEntries, ...kardexLog]);
    setFormSuccessMsg(`Recepción de Mercadería Exitosa: Se registraron exitosamente ${dynamicPurchaseItems.length} medicamentos y lotes bajo la Factura ${invoiceNumber}.`);
    
    // Reset dynamic form to initial state
    setInvoiceNumber('');
    setDynamicPurchaseItems([
      {
        key: `item-${Date.now()}-1`,
        id_producto: '',
        numero_lote: '',
        fecha_vencimiento: '',
        stock: 100,
        precio_compra: 0.50,
        precio_venta: 1.20
      }
    ]);
  };

  // Perform Inventory Adjustment
  const handleSaveInventoryAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustmentSuccess('');

    if (!selectedLotForAdjustment) {
      alert('Por favor seleccione un lote para ajustar.');
      return;
    }

    if (!adjustmentMotif.trim()) {
      alert('Debe digitar el motivo detallado del ajuste obligatorio.');
      return;
    }

    const targetLot = lots.find(l => l.id === selectedLotForAdjustment);
    if (!targetLot) return;

    const prodObj = products.find(p => p.id === targetLot.id_producto);
    const prodName = prodObj ? prodObj.nombre : 'Medicamento Desconocido';
    const originalStock = targetLot.stock;
    const delta = adjustmentNewStock - originalStock;

    if (delta === 0) {
      alert('Error: El nuevo stock ingresado es idéntico al stock actual. No hay variación para ajustar.');
      return;
    }

    // Update global and localStorage lot array
    const updatedLotsArr = lots.map(l => {
      if (l.id === selectedLotForAdjustment) {
        return { ...l, stock: adjustmentNewStock };
      }
      return l;
    });
    onUpdateLots(updatedLotsArr);

    // Compute type and insert adjustment entry to the Kardex
    const dateNow = new Date();
    const formattedDate = `${dateNow.toISOString().split('T')[0]} ${dateNow.toLocaleTimeString('es-PE')}`;
    const motionType = delta > 0 ? 'AJUSTE ENTRADA' : 'AJUSTE SALIDA';

    const adjustmentEntry: KardexEntry = {
      id: `k-adj-${Date.now()}`,
      fecha: formattedDate,
      tipo_movimiento: motionType,
      comprobante: 'Ajuste de Inv. Físico',
      empresa_relacionada: `Auditoría Almacén: ${adjustmentMotif}`,
      producto_nombre: prodName,
      numero_lote: targetLot.numero_lote,
      cantidad: Math.abs(delta),
      precio_unitario: targetLot.precio_compra,
      valor_total: Math.abs(delta) * targetLot.precio_compra
    };

    setKardexLog([adjustmentEntry, ...kardexLog]);
    setAdjustmentSuccess(`¡Ajuste Guardado con éxito! Se corrigió el stock del lote ${targetLot.numero_lote} de ${originalStock} a ${adjustmentNewStock} unidades.`);

    // Clear state
    setSelectedLotForAdjustment('');
    setAdjustmentNewStock(0);
    setAdjustmentMotif('');

    setTimeout(() => {
      setAdjustmentSuccess('');
    }, 4500);
  };

  // Perform Inter-branch inventory transfer
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferSuccess('');
    setTransferError('');

    if (!transferSourceLotId || !transferTargetBranchId || transferQty <= 0) {
      setTransferError('Por favor complete todos los campos de transferencia.');
      return;
    }

    const sourceLot = lots.find(l => l.id === transferSourceLotId);
    if (!sourceLot) {
      setTransferError('Lote de origen no encontrado.');
      return;
    }

    if (sourceLot.id_sucursal === transferTargetBranchId) {
      setTransferError('Error: La sucursal de destino no puede ser la misma que la sucursal de origen.');
      return;
    }

    if (sourceLot.stock < transferQty) {
      setTransferError(`Error: El stock disponible en el lote seleccionado es insuficiente. Máximo a transferir: ${sourceLot.stock}`);
      return;
    }

    // Deduct quantity from origin lot, then search/add to destination lot
    const prodObj = products.find(p => p.id === sourceLot.id_producto);
    const prodName = prodObj ? prodObj.nombre : 'Medicamento';
    const sourceBranchObj = branches.find(b => b.id === sourceLot.id_sucursal);
    const targetBranchObj = branches.find(b => b.id === transferTargetBranchId);

    const sourceBranchName = sourceBranchObj ? sourceBranchObj.nombre : 'Boticario Origen';
    const targetBranchName = targetBranchObj ? targetBranchObj.nombre : 'Boticario Destino';

    // 1. Descontar origin
    // 2. Sumar / Crear destino
    let destinationLotExists = lots.find(
      l => l.id_producto === sourceLot.id_producto &&
           l.id_sucursal === transferTargetBranchId &&
           l.numero_lote === sourceLot.numero_lote
    );

    let updatedLots: Lote[] = [];

    if (destinationLotExists) {
      // Add quantity to destination lot
      updatedLots = lots.map(l => {
        if (l.id === sourceLot.id) {
          return { ...l, stock: l.stock - transferQty };
        }
        if (l.id === destinationLotExists!.id) {
          return { ...l, stock: l.stock + transferQty };
        }
        return l;
      });
    } else {
      // Create duplicate lot assigned to target sucursal
      const newLotId = `lote-tr-${Date.now()}`;
      const newCopiedLot: Lote = {
        id: newLotId,
        id_producto: sourceLot.id_producto,
        id_sucursal: transferTargetBranchId,
        numero_lote: sourceLot.numero_lote,
        fecha_vencimiento: sourceLot.fecha_vencimiento,
        stock: transferQty,
        stock_inicial: transferQty,
        precio_compra: sourceLot.precio_compra,
        precio_venta: sourceLot.precio_venta
      };

      updatedLots = lots.map(l => {
        if (l.id === sourceLot.id) {
          return { ...l, stock: l.stock - transferQty };
        }
        return l;
      });
      updatedLots.push(newCopiedLot);
    }

    onUpdateLots(updatedLots);

    // Add entry logs to Kardex (out and in)
    const dateNow = new Date();
    const formattedDate = `${dateNow.toISOString().split('T')[0]} ${dateNow.toLocaleTimeString('es-PE')}`;

    const outKardex: KardexEntry = {
      id: `k-tr-out-${Date.now()}`,
      fecha: formattedDate,
      tipo_movimiento: 'TRANSFERENCIA SALIDA',
      comprobante: 'Guía Interna de Traslado',
      empresa_relacionada: `Hacia: ${targetBranchName}`,
      producto_nombre: prodName,
      numero_lote: sourceLot.numero_lote,
      cantidad: transferQty,
      precio_unitario: sourceLot.precio_compra,
      valor_total: transferQty * sourceLot.precio_compra
    };

    const inKardex: KardexEntry = {
      id: `k-tr-in-${Date.now()}`,
      fecha: formattedDate,
      tipo_movimiento: 'TRANSFERENCIA ENTRADA',
      comprobante: 'Guía Interna de Traslado',
      empresa_relacionada: `Desde: ${sourceBranchName}`,
      producto_nombre: prodName,
      numero_lote: sourceLot.numero_lote,
      cantidad: transferQty,
      precio_unitario: sourceLot.precio_compra,
      valor_total: transferQty * sourceLot.precio_compra
    };

    setKardexLog([outKardex, inKardex, ...kardexLog]);
    setTransferSuccess(`Guía de Traslado Procesada: Se transfirieron con éxito ${transferQty} unidades del lote ${sourceLot.numero_lote} de "${sourceBranchName}" a "${targetBranchName}".`);

    // Reset fields
    setTransferProductId('');
    setTransferSourceLotId('');
    setTransferTargetBranchId('');
    setTransferQty(10);
  };

  // Warehouse Alerts calculation
  const getLowStockAlerts = () => {
    return products.map(p => {
      const totalStock = lots.filter(l => l.id_producto === p.id).reduce((sum, l) => sum + l.stock, 0);
      return {
        product: p,
        totalStock
      };
    }).filter(p => p.totalStock < 30);
  };

  const getExpiringAlerts = () => {
    const today = new Date();
    const sixMonthsFromNow = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000);
    
    return lots.map(l => {
      const prod = products.find(p => p.id === l.id_producto);
      const branch = branches.find(b => b.id === l.id_sucursal);
      const expiryDateObj = new Date(l.fecha_vencimiento);
      const isExpired = expiryDateObj < today;
      const daysLeft = Math.ceil((expiryDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        lot: l,
        product: prod,
        branch: branch,
        daysLeft,
        isExpired
      };
    }).filter(a => a.daysLeft <= 180 && a.lot.stock > 0);
  };

  const reportAlertToChemist = (id: string, detail: string) => {
    setReportingAlertId(id);
    setTimeout(() => {
      setReportingAlertId('');
      alert(`Mensaje enviado al Químico Farmacéutico: \n"${detail}"\nSe procederá a segregar o reponer con prioridad.`);
    }, 1000);
  };

  const lowStockAlertsList = getLowStockAlerts();
  const expiringAlertsList = getExpiringAlerts();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 shadow-sm overflow-hidden font-sans">
      
      {/* HEADER CONTENEDOR */}
      <div className="p-6 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2 py-0.5 text-[10.5px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded">
              Kardex & Almacenes
            </span>
            <span className="px-2 py-0.5 text-[10.5px] font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded">
              Contabilidad FIFO PEPS
            </span>
            <span className="px-2 py-0.5 text-[10.5px] font-mono font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded">
              Perfil Almacenero Autorizado
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Módulo Integrado de Inventario, Almacén y Compras
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Registra ingresos con tablas dinámicas de droguerías, audita existencias aplicando ajustes físicos firmados con motivos de discrepancia y simula guías de traslado inter-sucursales.
          </p>
        </div>

        {/* SUB ACCIONES TAB */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-705 shrink-0 flex-wrap gap-1 md:gap-0">
          <button
            onClick={() => setActiveSubTab('purchases')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
              activeSubTab === 'purchases' 
                ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Compras / Recibo
          </button>
          <button
            onClick={() => setActiveSubTab('kardex_view')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
              activeSubTab === 'kardex_view' 
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Kardex & Ajustes
          </button>
          <button
            onClick={() => setActiveSubTab('transfers')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
              activeSubTab === 'transfers' 
                ? 'bg-violet-600 dark:bg-violet-600 text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Traslados
          </button>
          <button
            onClick={() => setActiveSubTab('alerts')}
            className={`relative flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
              activeSubTab === 'alerts' 
                ? 'bg-red-650 dark:bg-red-650 text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Alertas Almacén
            {(lowStockAlertsList.length + expiringAlertsList.length) > 0 && (
              <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 text-[9px] bg-red-600 text-white font-extrabold rounded-full animate-bounce">
                {lowStockAlertsList.length + expiringAlertsList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('fifo_logic')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
              activeSubTab === 'fifo_logic' 
                ? 'bg-amber-600 dark:bg-amber-600 text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Lógica FIFO & SQL
          </button>
        </div>
      </div>

      <div className="p-6">

        {/* SUBTAB 1: RECEPCION DE MERCADERIA (COMPRAS CON TABLA DINAMICA) */}
        {activeSubTab === 'purchases' && (
          <div className="space-y-6">
            
            <div className="bg-sky-50 dark:bg-sky-950/20 text-sky-950 dark:text-sky-300 p-3.5 rounded-xl border border-sky-100 dark:border-sky-900/50 text-[11px] leading-relaxed flex items-center gap-3">
              <Database className="w-5 h-5 text-sky-600 shrink-0" />
              <div>
                <strong>Asistente de Ingreso de Medicamentos:</strong> Ingrese la factura de compra de droguerías peruanas y añada dinámicamente cada producto farmacéutico con su respectivo Lote, vencimiento y costo. Al guardar, se inyectarán de forma atómica en el inventario de lotes para su venta inmediata en el POS.
              </div>
            </div>

            <form onSubmit={handleRegisterReceipt} className="space-y-6 text-xs">
              
              {formSuccessMsg && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-800/80 p-4 rounded-xl flex items-start gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block mb-1">¡Recepción Guardada con Éxito!</span>
                    <p className="text-[11px] font-sans leading-relaxed">{formSuccessMsg}</p>
                  </div>
                </div>
              )}

              {formErrorMsg && (
                <div className="bg-red-50 dark:bg-red-950/40 text-red-750 dark:text-red-400 p-3.5 rounded-xl border border-red-150 dark:border-red-900">
                  ⚠️ {formErrorMsg}
                </div>
              )}

              {/* DATOS GENERALES (HEADER DEL RECIBO) */}
              <div className="bg-slate-50 dark:bg-slate-850/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Proveedor */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 mb-1 uppercase tracking-wide">
                    1. Droguería Proveedora (RUC) *
                  </label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-505 bg-white dark:bg-slate-800 font-sans"
                  >
                    <option value="">Seleccione Proveedor...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.razon_social} (RUC: {s.ruc})</option>
                    ))}
                  </select>
                </div>

                {/* 2. Factura de Compra */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 mb-1 uppercase tracking-wide">
                    2. Número de Factura de Compra *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: F002-094851"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-505 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                {/* 3. Sucursal de Destino */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 mb-1 uppercase tracking-wide">
                    3. Establecimiento de Destino *
                  </label>
                  <select
                    required
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-505 bg-white dark:bg-slate-800 font-sans"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DETALLE DINÁMICO DE PRODUCTOS (TABLA DINÁMICA DE ENTRADA) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-350 tracking-wider flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4 text-blue-500" />
                    Detalle Farmacéutico de Lotes Entrantes
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddPurchaseRow}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 hover:scale-102 active:scale-98 text-white rounded-lg text-[10.5px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Anexar Medicamento Diferente
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 overflow-x-auto shadow-sm">
                  <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300 min-w-[900px]">
                    <thead className="bg-slate-50 dark:bg-slate-850 text-[10px] text-slate-400 dark:text-slate-400 uppercase font-black border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 w-[26%]">Medicamento Regulado DIGEMID *</th>
                        <th className="py-2.5 px-3 w-[15%]">Nro Lote *</th>
                        <th className="py-2.5 px-3 w-[15%]">Fecha Vencimiento *</th>
                        <th className="py-2.5 px-3 w-[12%]">Cantidad (Uds) *</th>
                        <th className="py-2.5 px-3 w-[13%]">Costo Compra Unit. (S/) *</th>
                        <th className="py-2.5 px-3 w-[13%]">Precio Venta Unit. (S/) *</th>
                        <th className="py-2.5 px-3 w-[6%] text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dynamicPurchaseItems.map((item, index) => (
                        <tr key={item.key} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 transition-all">
                          {/* 1. Medicamento dropdown */}
                          <td className="py-3 px-3">
                            <select
                              required
                              value={item.id_producto}
                              onChange={(e) => handleUpdatePurchaseItem(item.key, 'id_producto', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 rounded"
                            >
                              <option value="">Seleccionar...</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre} ({p.principio_activo} {p.concentracion})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* 2. Lote */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              required
                              placeholder="Ej: L-IBU421"
                              value={item.numero_lote}
                              onChange={(e) => handleUpdatePurchaseItem(item.key, 'numero_lote', e.target.value.toUpperCase())}
                              className="w-full px-2.5 py-1.5 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono tracking-wider rounded text-[11px]"
                            />
                          </td>

                          {/* 3. Fecha Vencimiento */}
                          <td className="py-3 px-3">
                            <input
                              type="date"
                              required
                              value={item.fecha_vencimiento}
                              onChange={(e) => handleUpdatePurchaseItem(item.key, 'fecha_vencimiento', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono rounded"
                            />
                          </td>

                          {/* 4. Cantidad */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              required
                              min={1}
                              value={item.stock}
                              onChange={(e) => handleUpdatePurchaseItem(item.key, 'stock', Math.max(1, Number(e.target.value)))}
                              className="w-full px-2 py-1.5 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-center rounded"
                            />
                          </td>

                          {/* 5. Precio Compra Costo */}
                          <td className="py-3 px-3 relative">
                            <div className="absolute left-4 top-5 font-mono text-slate-400">S/</div>
                            <input
                              type="number"
                              required
                              step="0.01"
                              min="0.01"
                              value={item.precio_compra}
                              onChange={(e) => handleUpdatePurchaseItem(item.key, 'precio_compra', Math.max(0.01, Number(e.target.value)))}
                              className="w-full pl-6 pr-2 py-1.5 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono rounded"
                            />
                          </td>

                          {/* 6. Precio Venta Publico */}
                          <td className="py-3 px-3 relative">
                            <div className="absolute left-4 top-5 font-mono text-slate-400">S/</div>
                            <input
                              type="number"
                              required
                              step="0.01"
                              min="0.01"
                              value={item.precio_venta}
                              onChange={(e) => handleUpdatePurchaseItem(item.key, 'precio_venta', Math.max(0.01, Number(e.target.value)))}
                              className="w-full pl-6 pr-2 py-1.5 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono rounded"
                            />
                          </td>

                          {/* 7. Eliminar */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemovePurchaseRow(item.key)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-all cursor-pointer"
                              title="Remover Fila de Producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ACCIONES FINALES */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <span className="text-[10.5px] text-slate-450 dark:text-slate-400 font-sans">
                  Total productos diferenciados en la orden: <strong className="text-slate-800 dark:text-white font-bold">{dynamicPurchaseItems.length}</strong>
                </span>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer text-center"
                >
                  📥 Guardar Recepción Completa en Almacén
                </button>
              </div>

            </form>

            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-xl text-xs text-amber-900 dark:text-amber-400 space-y-2">
              <h4 className="font-extrabold uppercase flex items-center gap-1.5 text-amber-950 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                Validaciones Sanitarias DIGEMID (Normas PEPS y Almacenamiento)
              </h4>
              <p className="leading-relaxed">
                Cada uno de los medicamentos ingresados herederá las características regulatorias de la DIGEMID (Registro Sanitario, categoría, control de receta y principio activo). Bajo la ley peruana, es responsabilidad directa del Almacenero y del Químico Farmacéutico verificar que las facturas correspondan únicamente a droguerías certificadas con Buenas Prácticas de Almacenamiento (BPA).
              </p>
            </div>

          </div>
        )}

        {/* SUBTAB 2: REGISTRO KARDEX Y AJUSTES DE INVENTARIO */}
        {activeSubTab === 'kardex_view' && (
          <div className="space-y-8">
            
            {/* PANEL DE FORMULARIO DE AJUSTE (AUDITORÍA FÍSICA) */}
            <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <span className="px-2 py-0.5 text-[9.5px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono font-bold rounded">
                  Firma Auditoría Almacén
                </span>
                <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase mt-1.5">
                  Ajuste de Conteo Físico de Inventario
                </h3>
                <p className="text-[10.5px] text-slate-550 dark:text-slate-400 mt-0.5">
                  Permite corregir discrepancias de stock detectadas en el inventario físico en botica. Deja un registro firmado e irrevocable en la bitácora de auditoría digital.
                </p>
              </div>

              {adjustmentSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-850 p-3.5 rounded-lg text-xs font-sans">
                  ✅ {adjustmentSuccess}
                </div>
              )}

              <form onSubmit={handleSaveInventoryAdjustment} className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                {/* 1. Selección de Lote para ajustar */}
                <div className="md:col-span-5">
                  <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Lote Específico a Corregir stock: *
                  </label>
                  <select
                    required
                    value={selectedLotForAdjustment}
                    onChange={(e) => {
                      setSelectedLotForAdjustment(e.target.value);
                      const selected = lots.find(l => l.id === e.target.value);
                      setAdjustmentNewStock(selected ? selected.stock : 0);
                    }}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-indigo-505 font-sans"
                  >
                    <option value="">Seleccione Lote...</option>
                    {lots.map(l => {
                      const prodObj = products.find(p => p.id === l.id_producto);
                      const branchObj = branches.find(b => b.id === l.id_sucursal);
                      const prodName = prodObj ? prodObj.nombre : 'Medicamento';
                      const branchName = branchObj ? branchObj.nombre.split(' - ')[1] || branchObj.nombre : 'Sede';
                      return (
                        <option key={l.id} value={l.id}>
                          {prodName} | Lote: {l.numero_lote} ({branchName}) [Stock actual: {l.stock} uds]
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Nuevo Stock */}
                <div className="md:col-span-2">
                  <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Nuevo Stock Físico: *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={adjustmentNewStock}
                    onChange={(e) => setAdjustmentNewStock(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg font-mono text-center focus:ring-1 focus:ring-indigo-505"
                  />
                </div>

                {/* 3. Motivo del Ajuste */}
                <div className="md:col-span-3">
                  <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Comentario / Razón del Ajuste: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Mermas, rotura de frasco, auditoría..."
                    value={adjustmentMotif}
                    onChange={(e) => setAdjustmentMotif(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-indigo-550"
                  />
                </div>

                {/* 4. Botón Aplicar */}
                <div className="md:col-span-2 flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 hover:scale-102 text-white font-bold rounded-lg text-[11px] transition-all uppercase tracking-wide cursor-pointer text-center"
                  >
                    Guardar Ajuste
                  </button>
                </div>
              </form>
            </div>

            {/* TABLA PRINCIPAL DE MOVIMIENTOS KARDEX */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-350 font-mono uppercase tracking-wide">
                    Bitácora Histórica de Kardex del Establecimiento
                  </h3>
                  <p className="text-[10px] text-slate-400">Todo movimiento genera registros automáticos firmados con el método FIFO.</p>
                </div>
                <button
                  onClick={() => onRefreshLots()}
                  className="text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-100 px-3 py-1.5 rounded-lg border border-slate-205 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refrescar Lotes
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 shadow-inner overflow-hidden overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300 min-w-[950px]">
                  <thead className="bg-slate-50 dark:bg-slate-850/60 text-[9.5px] text-slate-450 dark:text-slate-400 uppercase font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-[15%]">Fecha / Hora</th>
                      <th className="py-3 px-4 w-[18%]">Tipo Movimiento</th>
                      <th className="py-3 px-4 w-[15%]">Referencia Doc.</th>
                      <th className="py-3 px-4 w-[25%]">Medicamento / Lote</th>
                      <th className="py-3 px-4 w-[16%]">Proveedor / Motivo Traslado</th>
                      <th className="py-3 px-4 text-center w-[8%]">Cant.</th>
                      <th className="py-3 px-4 text-right w-[10%]">Costo Compra</th>
                      <th className="py-3 px-4 text-right w-[11%]">Monto Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {kardexLog.map((row) => {
                      const isEntry = row.tipo_movimiento.includes('ENTRADA') || row.tipo_movimiento.includes('AJUSTE ENTRADA');
                      const isAdjustment = row.tipo_movimiento.includes('AJUSTE');
                      const isTransfer = row.tipo_movimiento.includes('TRANSFERENCIA');
                      
                      let rowBadgeClass = 'bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900';
                      if (isEntry) {
                        rowBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';
                      } else if (isAdjustment) {
                        rowBadgeClass = 'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
                      } else if (isTransfer) {
                        rowBadgeClass = 'bg-purple-50 text-purple-850 border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900';
                      }

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-855/10 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 text-[10.5px]">{row.fecha}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 font-bold text-[9px] px-2 py-0.5 rounded-full border ${rowBadgeClass}`}>
                              {isEntry ? (
                                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <ArrowDownLeft className="w-3 h-3 text-blue-500" />
                              )}
                              {row.tipo_movimiento}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">{row.comprobante}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{row.producto_nombre}</span>
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold font-mono">Lote: {row.numero_lote}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-650 dark:text-slate-400 font-sans text-[11px] leading-tight">
                            {row.empresa_relacionada}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-slate-800 dark:text-white">{row.cantidad}</td>
                          <td className="py-3 px-4 text-right font-mono text-[11px]">S/ {row.precio_unitario.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white text-[11px]">
                            S/ {row.valor_total.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* SUBTAB 3: TRANSFERENCIAS ENTRE SUCURSALES (GUIAS DE ENVIO) */}
        {activeSubTab === 'transfers' && (
          <div className="space-y-6">
            
            <div className="bg-violet-50 dark:bg-violet-950/20 text-violet-950 dark:text-violet-300 p-4 rounded-xl border border-violet-100 dark:border-violet-900/50 text-xs leading-relaxed flex items-center gap-3">
              <ArrowRightLeft className="w-5 h-5 text-violet-600 shrink-0" />
              <div>
                <strong>Envío de Medicamento Inter-Sucursal:</strong> Formulario regulado para trasladar existencias desde el almacén de origen hacia otra botica filial afiliada a la red de SigiFar Perú. Este módulo descuenta la cantidad de forma segura del lote emisor y la suma en la sede de destino, registrando las guías internas.
              </div>
            </div>

            {transferSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-850 p-4 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{transferSuccess}</span>
              </div>
            )}

            {transferError && (
              <div className="bg-red-50 dark:bg-red-950/40 text-red-750 dark:text-red-400 p-3.5 rounded-xl border border-red-150 dark:border-red-900 text-xs">
                ⚠️ {transferError}
              </div>
            )}

            <form onSubmit={handleExecuteTransfer} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-150 dark:border-slate-800 space-y-4 shadow-xs text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Seleccionar Medicamento */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    1. Medicamento regulado a transferir: *
                  </label>
                  <select
                    required
                    value={transferProductId}
                    onChange={(e) => {
                      setTransferProductId(e.target.value);
                      setTransferSourceLotId('');
                    }}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="">Seleccione Medicamento...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.principio_activo})</option>
                    ))}
                  </select>
                </div>

                {/* 2. Seleccionar Lote Origen (con su stock y sucursal actual) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    2. Lote Emisor & Sucursal de Origen: *
                  </label>
                  <select
                    required
                    disabled={!transferProductId}
                    value={transferSourceLotId}
                    onChange={(e) => setTransferSourceLotId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
                  >
                    <option value="">Seleccione Lote...</option>
                    {lots
                      .filter(l => l.id_producto === transferProductId && l.stock > 0)
                      .map(l => {
                        const branch = branches.find(b => b.id === l.id_sucursal);
                        const branchName = branch ? branch.nombre : 'Sede';
                        return (
                          <option key={l.id} value={l.id}>
                            Lote: {l.numero_lote} | Sede: {branchName} (S: {l.stock} uds) - Vcto: {l.fecha_vencimiento}
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* 3. Seleccionar Sucursal Destino */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    3. Establecimiento Sede de Destino: *
                  </label>
                  <select
                    required
                    value={transferTargetBranchId}
                    onChange={(e) => setTransferTargetBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="">Seleccione Sucursal de Destino...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Cantidad a transferir */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    4. Cantidad de Unidades a Trasladar: *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={transferQty}
                    onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg font-mono focus:ring-1 focus:ring-violet-550"
                  />
                </div>

              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-750 text-white rounded-lg text-xs font-bold font-sans tracking-wide transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4.5 h-4.5 text-white" />
                  CONFIRMAR TRASLADO INTERSUCURSAL
                </button>
              </div>

            </form>

          </div>
        )}

        {/* SUBTAB 4: PANEL DE ALERTAS DE ALMACEN (PRIORITARIO) */}
        {activeSubTab === 'alerts' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* ALERTA 1: LISTADO DE PRODUCTOS CON STOCK BAJO (MENOS DE 30 UNIDADES TOTALES) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-red-50/15 dark:bg-red-950/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-2 text-[9px] bg-red-100 text-red-700 font-extrabold rounded-md border border-red-200 uppercase font-mono tracking-wider">
                      REPOSICIÓN
                    </span>
                    <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase">
                      Lotes con Stock Bajo (&lt; 30 uds)
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-300 font-bold">
                    Total: {lowStockAlertsList.length}
                  </span>
                </div>
                
                <div className="p-5 space-y-3.5">
                  <p className="text-[10.5px] text-slate-450 dark:text-slate-400">
                    Productos cuya sumatoria total de stock de todos los lotes está por debajo del límite regulatorio local de seguridad. Requiere emitir orden de compra inmediata.
                  </p>

                  {lowStockAlertsList.length === 0 ? (
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-450 text-xs text-center rounded-xl font-medium">
                      ✓ Todos los medicamentos cuentan con niveles de stock óptimos en sus anaqueles.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {lowStockAlertsList.map(item => (
                        <div key={item.product.id} className="p-3 bg-slate-50 dark:bg-slate-850/50 rounded-xl border border-slate-150 dark:border-slate-800 flex items-center justify-between gap-3 transition-colors hover:bg-slate-100/40">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">{item.product.nombre}</span>
                            <span className="text-[10px] text-slate-400 block font-normal">Presentación: {item.product.presentacion}</span>
                            <span className="text-[9.5px] font-mono text-indigo-750 dark:text-indigo-400 font-semibold block uppercase">Lab: {item.product.laboratorio}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-center px-2.5 py-1 text-xs bg-red-100 dark:bg-red-950 text-red-750 dark:text-red-400 border border-red-200 dark:border-red-900 font-black rounded-lg min-w-[65px]">
                              {item.totalStock} Uds
                            </span>
                            <button
                              onClick={() => reportAlertToChemist(
                                `stock-${item.product.id}`,
                                `ALERTA STOCK CRÍTICO: El medicamento ${item.product.nombre} solo cuenta con ${item.totalStock} unidades en total en almacén.`
                              )}
                              disabled={reportingAlertId === `stock-${item.product.id}`}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[9.5px] tracking-wide transition-all select-none cursor-pointer disabled:opacity-50"
                            >
                              Reportar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ALERTA 2: LISTADO DE PRODUCTOS PROXIMOS A VENCER (VENCIMIENTO MENOR A 180 DIAS) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/15 dark:bg-amber-950/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-2 text-[9px] bg-amber-100 text-amber-700 font-extrabold rounded-md border border-amber-200 uppercase font-mono tracking-wider">
                      VENCIMIENTO
                    </span>
                    <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase">
                      Lotes Próximos a Vencer (&lt; 180 días)
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-505 dark:text-slate-305 font-bold animate-pulse">
                    Total: {expiringAlertsList.length}
                  </span>
                </div>
                
                <div className="p-5 space-y-3.5">
                  <p className="text-[10.5px] text-slate-450 dark:text-slate-400">
                    Medicamentos cuyos lotes se aproximan al rango crítico de vencimiento regulado por el MINSA. Deben ser segregados para mermas o sometidos a tarifas promocionales.
                  </p>

                  {expiringAlertsList.length === 0 ? (
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-455 text-xs text-center rounded-xl font-medium">
                      ✓ Gran trabajo: Ningún lote se encuentra próximo a vencer en los siguientes 6 meses.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {expiringAlertsList.map(a => {
                        const isOver = a.daysLeft <= 0;
                        return (
                          <div key={a.lot.id} className="p-3 bg-slate-50 dark:bg-slate-850/50 rounded-xl border border-slate-150 dark:border-slate-800 flex items-center justify-between gap-3 transition-colors hover:bg-slate-100/40">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[8.5px] font-extrabold px-1 py-0.2 rounded ${
                                  isOver ? 'bg-red-150 text-red-750 font-bold' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {isOver ? 'YA VENCIDO 🚨' : `${a.daysLeft} DÍAS RESTANTES`}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-400 font-mono">Lote: {a.lot.numero_lote}</span>
                              </div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block mt-1">{a.product?.nombre}</span>
                              <span className="text-[10px] text-indigo-650 dark:text-indigo-400 block mt-0.5 font-bold">Vence: {a.lot.fecha_vencimiento}</span>
                              <span className="text-[9px] text-slate-450 block font-medium">Sede: {a.branch?.nombre.split(' - ')[1] || a.branch?.nombre}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-center px-1.5 py-1 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-850 font-bold rounded min-w-[55px]">
                                {a.lot.stock} Uds
                              </span>
                              <button
                                onClick={() => reportAlertToChemist(
                                  `exp-${a.lot.id}`,
                                  `ALERTA VENCIMIENTO CRÍTICO: El Lote ${a.lot.numero_lote} de ${a.product?.nombre} expira el ${a.lot.fecha_vencimiento} (${a.daysLeft} días) en la sucursal.`
                                )}
                                disabled={reportingAlertId === `exp-${a.lot.id}`}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[9.5px] tracking-wide transition-all select-none cursor-pointer disabled:opacity-50"
                              >
                                Reportar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* SUBTAB 5: EXPLICACIÓN DE LA LÓGICA FIFO COMPUTADA */}
        {activeSubTab === 'fifo_logic' && (
          <div className="space-y-6">
            <div className="bg-slate-950 text-slate-200 p-6 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-400 animate-pulse" />
                Matemática Computacional de Kardex y Costeo FIFO (PEPS)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400">
                <div className="space-y-2">
                  <p>
                    <strong className="text-slate-200">El Proceso FIFO / PEPS:</strong> En farmacias reguladas, este método no es opcional sino imperativo. Asegura que los lotes con fechas de vencimiento más próximas sean los primeros en ser facturados y dispensados al cliente.
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
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para emitir alertas preventivas en el tablero de administración y gatillar las sugerencias automáticas de compras (reabastecimiento) a los laboratorios.
                </p>
                <div className="bg-slate-900 p-3 rounded border border-slate-850 font-mono text-[10.5px] text-emerald-400 overflow-x-auto">
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
                <p className="text-xs text-slate-400 leading-relaxed">
                  Regulado por el MINSA. Devuelve todo medicamento cuyo lote expira prontamente, permitiendo segregar el stock en anaqueles para evitar mermas indeseadas.
                </p>
                <div className="bg-slate-900 p-3 rounded border border-slate-850 font-mono text-[10.5px] text-emerald-400 overflow-x-auto">
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
