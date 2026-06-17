import React, { useState, useEffect } from 'react';
import { 
  Search, ShoppingCart, Trash2, ShieldCheck, TicketCheck, Users, HelpCircle, 
  FileText, CheckCircle, RefreshCw, Send, AlertTriangle, Lock, Unlock, 
  DollarSign, ArrowUpRight, ArrowDownLeft, UploadCloud, FileImage, 
  History, Eye, ClipboardCheck, Scale, AlertOctagon, Ban
} from 'lucide-react';
import { Sucursal, Producto, Lote, Cliente, Usuario, Venta, DetalleVenta } from '../types/pharmacy';

// Extended Interfaces for Cash Registers (Control de Caja Chica)
interface EgresoMano {
  id: string;
  motivo: string;
  monto: number;
  fecha: string;
}

interface CashSession {
  id: string;
  id_sucursal: string;
  id_usuario: string;
  monto_apertura: number;
  fecha_apertura: string;
  ventas_acumuladas: number;
  egresos_manuales: EgresoMano[];
  estado: 'ABIERTA' | 'CERRADA';
  fecha_cierre?: string;
  monto_cierre_fisico?: number;
  diferencia_arqueo?: number;
}

interface POSSystemProps {
  branches: Sucursal[];
  products: Producto[];
  lots: Lote[];
  clients: Cliente[];
  users: Usuario[];
  onAddSale: (newSale: Venta, details: Omit<DetalleVenta, 'id' | 'id_venta'>[]) => void;
  onDeductStock: (loteId: string, qty: number) => void;
}

interface CartItem {
  producto: Producto;
  lote: Lote;
  cantidad: number;
  explicacion_fifo?: string; // Logs how FIFO resolved this specific item
}

export default function POSSystem({
  branches,
  products,
  lots,
  clients,
  users,
  onAddSale,
  onDeductStock
}: POSSystemProps) {
  // Config states & current branch
  const [selectedBranchId, setSelectedBranchId] = useState<string>('suc-01');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [docType, setDocType] = useState<'Boleta' | 'Factura'>('Boleta');
  
  // Search state
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [errorPOSMessage, setErrorPOSMessage] = useState('');
  const [posSuccessMsg, setPosSuccessMsg] = useState('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [generatedTicket, setGeneratedTicket] = useState<any | null>(null);

  // Active cashier (Simulado)
  const activeUser = users[2] || { id: 'usr-03', nombre: 'Sofía Quispe Pineda (Cajero)' };

  // --- PERSISTENCE & COMPILATION OF CASH SESSIONS (Cierre de Caja) ---
  const [sessionsHistory, setSessionsHistory] = useState<CashSession[]>([]);
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);

  // Opening form states
  const [openingBalanceInput, setOpeningBalanceInput] = useState<number>(150);
  
  // Egreso manual form states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpenseMotivo, setNewExpenseMotivo] = useState('');
  const [newExpenseMonto, setNewExpenseMonto] = useState<number>(10);

  // Arqueo / Cierre form states
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [declaredCashInput, setDeclaredCashInput] = useState<number>(0);

  // --- RECETA MEDICA EXTRA FORM STATES ---
  const [requiresRecipe, setRequiresRecipe] = useState(false);
  const [recipeDoctorName, setRecipeDoctorName] = useState('');
  const [recipeCMP, setRecipeCMP] = useState('');
  const [recipeDate, setRecipeDate] = useState('');
  const [recipeFileAttached, setRecipeFileAttached] = useState<boolean>(false);
  const [recipeFileMockName, setRecipeFileMockName] = useState<string>('');
  const [recipeCheckedByRegente, setRecipeCheckedByRegente] = useState<boolean>(false);

  // Load cash sessions on start
  useEffect(() => {
    const savedSessions = localStorage.getItem('erp_cash_sessions');
    if (savedSessions) {
      const parsed: CashSession[] = JSON.parse(savedSessions);
      setSessionsHistory(parsed);
      // look for open session for the current branch & active cashier
      const open = parsed.find(s => s.estado === 'ABIERTA' && s.id_sucursal === selectedBranchId);
      if (open) {
        setActiveSession(open);
      } else {
        setActiveSession(null);
      }
    } else {
      // Seed initial shift history
      const initialSeed: CashSession[] = [
        {
          id: 'cash-001',
          id_sucursal: 'suc-01',
          id_usuario: 'usr-03',
          monto_apertura: 100,
          fecha_apertura: '2026-06-15 08:00:00',
          ventas_acumuladas: 450.50,
          egresos_manuales: [
            { id: 'egr-1', motivo: 'Compra de bolsas biodegradables', monto: 12.00, fecha: '2026-06-15 10:15:00' }
          ],
          estado: 'CERRADA',
          fecha_cierre: '2026-06-15 17:30:00',
          monto_cierre_fisico: 538.50,
          diferencia_arqueo: 0 // Cuadrado perfectamente
        },
        {
          id: 'cash-002',
          id_sucursal: 'suc-01',
          id_usuario: 'usr-03',
          monto_apertura: 120,
          fecha_apertura: '2026-06-16 08:00:00',
          ventas_acumuladas: 200.00,
          egresos_manuales: [
            { id: 'egr-2', motivo: 'Pago de mensajería urgente DIGEMID', monto: 15.00, fecha: '2026-06-16 11:20:00' }
          ],
          estado: 'CERRADA',
          fecha_cierre: '2026-06-16 18:00:00',
          monto_cierre_fisico: 300.00,
          diferencia_arqueo: -5 // Faltaron 5 soles
        }
      ];
      setSessionsHistory(initialSeed);
      localStorage.setItem('erp_cash_sessions', JSON.stringify(initialSeed));
    }
  }, [selectedBranchId]);

  // Recalculates if cart needs medical prescription validation
  useEffect(() => {
    const needs = cart.some(item => item.producto.requiere_receta);
    setRequiresRecipe(needs);
    if (!needs) {
      // Clear recipe validation fields if not needed
      setRecipeDoctorName('');
      setRecipeCMP('');
      setRecipeDate('');
      setRecipeFileAttached(false);
      setRecipeFileMockName('');
      setRecipeCheckedByRegente(false);
    }
  }, [cart]);

  // Handle Box Opening (Apertura de Caja)
  const handleOpenCash = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPOSMessage('');

    if (openingBalanceInput < 0) {
      setErrorPOSMessage('El saldo de apertura no puede ser negativo.');
      return;
    }

    const dateNow = new Date();
    const formattedDate = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}-${String(dateNow.getDate()).padStart(2, '0')} ${dateNow.toLocaleTimeString('es-PE')}`;

    const newSession: CashSession = {
      id: `cash-${Date.now()}`,
      id_sucursal: selectedBranchId,
      id_usuario: activeUser.id,
      monto_apertura: openingBalanceInput,
      fecha_apertura: formattedDate,
      ventas_acumuladas: 0,
      egresos_manuales: [],
      estado: 'ABIERTA'
    };

    const updatedHistory = [newSession, ...sessionsHistory];
    setSessionsHistory(updatedHistory);
    setActiveSession(newSession);
    localStorage.setItem('erp_cash_sessions', JSON.stringify(updatedHistory));
    setPosSuccessMsg('Caja chica abierta con éxito. Terminal POS desbloqueado.');
  };

  // Add Manuel Expense (Egresos manuales)
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    if (!newExpenseMotivo.trim() || newExpenseMonto <= 0) {
      alert('Por favor ingrese un motivo y un monto real superior a S/ 0.');
      return;
    }

    const dateNow = new Date();
    const formattedDate = dateNow.toLocaleTimeString('es-PE');

    const newExpense: EgresoMano = {
      id: `egr-${Date.now()}`,
      motivo: newExpenseMotivo.trim(),
      monto: newExpenseMonto,
      fecha: formattedDate
    };

    const updatedSession: CashSession = {
      ...activeSession,
      egresos_manuales: [...activeSession.egresos_manuales, newExpense]
    };

    const updatedHistory = sessionsHistory.map(s => s.id === activeSession.id ? updatedSession : s);
    
    setSessionsHistory(updatedHistory);
    setActiveSession(updatedSession);
    localStorage.setItem('erp_cash_sessions', JSON.stringify(updatedHistory));

    setNewExpenseMotivo('');
    setNewExpenseMonto(10);
    setShowExpenseModal(false);
    setPosSuccessMsg(`Egreso registrado: Se retiró S/ ${newExpenseMonto.toFixed(2)} por "${newExpense.motivo}".`);
  };

  // Calculate statistics of the current cash session in real-time
  const getExpectedCash = (session: CashSession) => {
    const totalVentas = session.ventas_acumuladas;
    const totalEgresos = session.egresos_manuales.reduce((acc, curr) => acc + curr.monto, 0);
    return Math.max(0, session.monto_apertura + totalVentas - totalEgresos);
  };

  // Process Box Closing (Cierre y Arqueo)
  const handleCloseCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    const expectedCash = getExpectedCash(activeSession);
    const difference = declaredCashInput - expectedCash;

    const dateNow = new Date();
    const formattedDate = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}-${String(dateNow.getDate()).padStart(2, '0')} ${dateNow.toLocaleTimeString('es-PE')}`;

    const closedSession: CashSession = {
      ...activeSession,
      estado: 'CERRADA',
      fecha_cierre: formattedDate,
      monto_cierre_fisico: declaredCashInput,
      diferencia_arqueo: difference
    };

    const updatedHistory = sessionsHistory.map(s => s.id === activeSession.id ? closedSession : s);
    setSessionsHistory(updatedHistory);
    setActiveSession(null);
    localStorage.setItem('erp_cash_sessions', JSON.stringify(updatedHistory));

    setShowClosureModal(false);
    setCart([]); // Clear the active draft cart
    setPosSuccessMsg(`Cierre de caja completado. Arqueo finalizado con una diferencia de S/ ${difference.toFixed(2)} (${
      difference === 0 ? 'CONCILIACIÓN PERFECTA' : difference > 0 ? 'SOBRANTE' : 'FALTANTE'
    }).`);
  };

  // --- ALGORITHMIC FIFO AUTOMATIC LOT ALLOCATION ---
  // When adding a generic quantity of a product, we resolve available lots by FIFO
  const handleAddProductFIFO = (prod: Producto, requestedQty: number) => {
    setErrorPOSMessage('');
    setPosSuccessMsg('');

    if (requestedQty <= 0) {
      setErrorPOSMessage('Ingrese una cantidad válida mayor a cero.');
      return;
    }

    // Filter lots of this product, in this branch, which have positive stock, and are NOT EXPIRED
    const today = new Date();
    const activeLots = lots.filter(l => 
      l.id_producto === prod.id && 
      l.id_sucursal === selectedBranchId && 
      l.stock > 0 &&
      new Date(l.fecha_vencimiento) >= today
    );

    if (activeLots.length === 0) {
      setErrorPOSMessage(`No existen lotes vigentes o con stock disponible para "${prod.nombre}" en este almacén.`);
      return;
    }

    // Sort lots by expiry date ASCENDING (the oldest lot, expiring quickest, goes first = PEPS / FIFO)
    const sortedLots = [...activeLots].sort((a, b) => 
      new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
    );

    // Sum total available stock
    const totalAvailStock = sortedLots.reduce((acc, current) => acc + current.stock, 0);

    if (totalAvailStock < requestedQty) {
      setErrorPOSMessage(`Stock total disponible insuficiente para cubrir las unidades deseadas. Capacidad remanente total: ${totalAvailStock} unids.`);
      return;
    }

    // We proceed to consume step-by-step
    let remainingToAllocate = requestedQty;
    const itemsToAdd: CartItem[] = [];

    for (const lot of sortedLots) {
      if (remainingToAllocate <= 0) break;

      const takenFromThisLot = Math.min(lot.stock, remainingToAllocate);
      
      // Let's explain how much was taken to teach the user
      const explanation = `Tomado de Lote ${lot.numero_lote} (Expira: ${lot.fecha_vencimiento}) - ${takenFromThisLot} unids de forma automática bajo la regla FIFO.`;

      itemsToAdd.push({
        producto: prod,
        lote: lot,
        cantidad: takenFromThisLot,
        explicacion_fifo: explanation
      });

      remainingToAllocate -= takenFromThisLot;
    }

    // Update cart
    // Since items are split by lot, let's merge or push them to cart
    let tempCart = [...cart];

    itemsToAdd.forEach(newItem => {
      const existingIdx = tempCart.findIndex(item => item.lote.id === newItem.lote.id);
      if (existingIdx > -1) {
        // Evaluate limit
        const limit = newItem.lote.stock;
        const currentQty = tempCart[existingIdx].cantidad;
        if (currentQty + newItem.cantidad > limit) {
          tempCart[existingIdx].cantidad = limit; // cap at lot stock
        } else {
          tempCart[existingIdx].cantidad += newItem.cantidad;
        }
      } else {
        tempCart.push(newItem);
      }
    });

    setCart(tempCart);
    setSearchProductQuery('');
    setPosSuccessMsg(`Resolución FIFO Exitosa: Se cargó "${prod.nombre}" en carro, asignando automáticamente el stock de los lotes más próximos a caducar.`);
  };

  const handleRemoveFromCart = (idx: number) => {
    const newCart = [...cart];
    newCart.splice(idx, 1);
    setCart(newCart);
  };

  // Core calculations
  const cartSubtotal = cart.reduce((acc, curr) => acc + (curr.cantidad * curr.lote.precio_venta), 0);
  const cartIgv = cartSubtotal * 0.18;
  const cartTotal = cartSubtotal + cartIgv;

  // SUNAT validation and transaction recording
  const handleProcessSale = () => {
    setErrorPOSMessage('');
    setPosSuccessMsg('');

    if (!activeSession) {
      setErrorPOSMessage('Alerta: Caja Cerrada. Abra caja chica ingresando un monto de apertura antes de facturar.');
      return;
    }

    if (cart.length === 0) {
      setErrorPOSMessage('El carrito de ventas se encuentra vacío.');
      return;
    }

    const clientObj = clients.find(c => c.id === selectedClientId);

    // 1. Receta médica validation
    if (requiresRecipe) {
      if (!recipeDoctorName.trim() || !recipeCMP.trim() || !recipeDate || !recipeFileAttached || !recipeCheckedByRegente) {
        setErrorPOSMessage('DIGEMID Bloqueo: El carrito de ventas contiene medicamentos que exigen Receta Médica Obligatoria. No se puede facturar hasta rellenar los datos de prescripción, cargar la receta digital firmada y certificar su validez.');
        return;
      }
      if (recipeCMP.trim().length < 5) {
        setErrorPOSMessage('El número de Colegiatura Médica (CMP) ingresado parece incorrecto. Se exige un mínimo de 5 dígitos.');
        return;
      }
    }

    // 2. SUNAT RUC validation for Invoice
    if (docType === 'Factura') {
      if (!clientObj) {
        setErrorPOSMessage('Para emitir Factura Electrónica SUNAT, debe seleccionar un cliente corporativo.');
        return;
      }
      if (clientObj.tipo_documento !== 'RUC') {
        setErrorPOSMessage('El cliente seleccionado tiene DNI. Se exige RUC para emitir Factura (IGV Crédito Fiscal).');
        return;
      }
    }

    // 3. SUNAT Cash limits
    if (cartTotal >= 700 && !clientObj) {
      setErrorPOSMessage('Normativa SUNAT: Compras superiores o iguales a S/ 700.00 requieren identificar al cliente (DNI o RUC obligatorios).');
      return;
    }

    // Generate random mock billing numbers
    const dateNow = new Date();
    const formattedDate = `${dateNow.toLocaleDateString('es-PE')} ${dateNow.toLocaleTimeString('es-PE')}`;
    const series = docType === 'Factura' ? 'F001' : 'B001';
    const num_correlativo = String(Math.floor(10000 + Math.random() * 90000));
    const finalId = `sale-${Math.floor(100000 + Math.random() * 900000)}`;

    const saleRecord: Venta = {
      id: finalId,
      id_sucursal: selectedBranchId,
      id_usuario: activeUser.id,
      id_cliente: selectedClientId || undefined,
      tipo_comprobante: docType,
      serie_comprobante: series,
      numero_comprobante: num_correlativo,
      fecha_emision: formattedDate,
      subtotal: cartSubtotal,
      igv: cartIgv,
      total: cartTotal,
      hash_sunat: btoa(`SUNAT_DIGEST_${finalId}_${num_correlativo}`).slice(0, 20).toUpperCase(),
      estado_sunat: 'Aceptado'
    };

    const detailRecords: Omit<DetalleVenta, 'id' | 'id_venta'>[] = cart.map(item => ({
      id_producto: item.producto.id,
      id_lote: item.lote.id,
      numero_lote: item.lote.numero_lote,
      cantidad: item.cantidad,
      precio_unitario: item.lote.precio_venta,
      igv_item: (item.cantidad * item.lote.precio_venta) * 0.18,
      total_item: (item.cantidad * item.lote.precio_venta) * 1.18
    }));

    // Trigger state changes in Parent (App.tsx)
    onAddSale(saleRecord, detailRecords);
    
    // Deduct stock per selected lot
    cart.forEach(item => {
      onDeductStock(item.lote.id, item.cantidad);
    });

    // Update current active cash session revenues
    const updatedSession: CashSession = {
      ...activeSession,
      ventas_acumuladas: activeSession.ventas_acumuladas + cartTotal
    };
    const updatedHistory = sessionsHistory.map(s => s.id === activeSession.id ? updatedSession : s);
    setSessionsHistory(updatedHistory);
    setActiveSession(updatedSession);
    localStorage.setItem('erp_cash_sessions', JSON.stringify(updatedHistory));

    // Fill ticket print visual display
    const chosenBranch = branches.find(b => b.id === selectedBranchId);
    setGeneratedTicket({
      branchName: chosenBranch?.nombre,
      branchDir: chosenBranch?.direccion,
      branchCity: chosenBranch?.ciudad,
      branchUbigeo: chosenBranch?.ubigeo,
      comprobante: `${docType} Electrónica`,
      numero: `${series}-${num_correlativo}`,
      fecha: formattedDate,
      clienteName: clientObj?.nombre_razon_social || 'CLIENTE AL MENOR / PÚBLICO EN GENERAL',
      clienteDoc: clientObj ? `${clientObj.tipo_documento} ${clientObj.numero_documento}` : 'S/D',
      subtotal: cartSubtotal,
      igv: cartIgv,
      total: cartTotal,
      hash: saleRecord.hash_sunat,
      hasRecipe: requiresRecipe,
      recipeDoctor: recipeDoctorName,
      recipeCmp: recipeCMP,
      items: cart.map(item => ({
        name: item.producto.nombre,
        lot: item.lote.numero_lote,
        qty: item.cantidad,
        unit: item.lote.precio_venta,
        tot: item.cantidad * item.lote.precio_venta * 1.18
      }))
    });

    // Reset Form and State
    setCart([]);
    setSelectedClientId('');
    setRecipeDoctorName('');
    setRecipeCMP('');
    setRecipeDate('');
    setRecipeFileAttached(false);
    setRecipeFileMockName('');
    setRecipeCheckedByRegente(false);
    setPosSuccessMsg('¡Venta facturada, declarada ante SUNAT, y registrada en arquéo de caja chica!');
  };

  // Helper lots of current branch
  const activeBranchLots = lots.filter(l => l.id_sucursal === selectedBranchId && l.stock > 0);
  const availableProductIds = Array.from(new Set(activeBranchLots.map(l => l.id_producto)));
  const availableProducts = products.filter(p => availableProductIds.includes(p.id));

  // Search filtered products
  const filteredProducts = availableProducts.filter(p => {
    return p.nombre.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
           p.principio_activo.toLowerCase().includes(searchProductQuery.toLowerCase());
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans text-xs">

      {/* RENDER SUPERIOR: BANNER INFORMATIVO / ESTADO DE CAJA */}
      <div className="col-span-1 lg:col-span-12">
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
          activeSession 
            ? 'bg-emerald-50 border-emerald-150 text-emerald-900' 
            : 'bg-red-50 border-red-150 text-red-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg text-white ${activeSession ? 'bg-emerald-650' : 'bg-red-650'}`}>
              {activeSession ? <Unlock className="w-5 h-5 animate-pulse" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm uppercase tracking-tight">
                  {activeSession ? 'Caja de Ventas Activa e Habilitada' : 'Caja de Ventas Deshabilitada - Requiere Apertura'}
                </span>
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${
                  activeSession 
                    ? 'bg-emerald-200 text-emerald-800 border-emerald-300' 
                    : 'bg-red-200 text-red-850 border-red-300'
                }`}>
                  {activeSession ? 'TURNO ABIERTO' : 'MINSA AUDITORÍA INHABILITADA'}
                </span>
              </div>
              <p className="text-[11px] opacity-80 mt-1">
                {activeSession 
                  ? `Iniciado por ${activeUser.nombre} el ${activeSession.fecha_apertura} | Canal de cobro de Almacén.` 
                  : 'Para iniciar la dispensación y emisión del ticket de venta SUNAT, declare el saldo inicial de caja chica.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {activeSession ? (
              <div className="flex flex-wrap gap-2 w-full justify-end">
                {/* Visual statistics of cash in hand */}
                <div className="bg-white/80 backdrop-blur-xs border border-emerald-200 p-2 rounded-lg text-center font-mono">
                  <span className="block text-[9.5px] text-slate-500 font-semibold">Caja Esperada</span>
                  <span className="font-bold text-slate-900 text-sm">S/ {getExpectedCash(activeSession).toFixed(2)}</span>
                </div>
                <div className="bg-white/80 backdrop-blur-xs border border-emerald-200 p-2 rounded-lg text-center font-mono">
                  <span className="block text-[9.5px] text-slate-500 font-semibold">Ventas Turno</span>
                  <span className="font-bold text-emerald-700 text-sm">+S/ {activeSession.ventas_acumuladas.toFixed(2)}</span>
                </div>
                <div className="bg-white/80 backdrop-blur-xs border border-emerald-200 p-2 rounded-lg text-center font-mono">
                  <span className="block text-[9.5px] text-slate-500 font-semibold">Gastos / Caja Chica</span>
                  <span className="font-bold text-rose-600 text-sm">
                    -S/ {activeSession.egresos_manuales.reduce((acc, curr) => acc + curr.monto, 0).toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(true)}
                  className="px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-[11px] transition-all flex items-center gap-1"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                  Gasto Chica
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeclaredCashInput(getExpectedCash(activeSession));
                    setShowClosureModal(true);
                  }}
                  className="px-4 bg-rose-605 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Cierre de Caja
                </button>
              </div>
            ) : (
              <form onSubmit={handleOpenCash} className="flex gap-2 w-full justify-end items-center bg-white p-2 border border-slate-200 rounded-xl shadow-xs">
                <div className="flex items-center gap-1.5 pl-2">
                  <span className="font-bold text-slate-700">Saldo Apertura:</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-slate-400 font-bold">S/</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={openingBalanceInput}
                      onChange={(e) => setOpeningBalanceInput(Number(e.target.value))}
                      className="w-24 pl-7 pr-2.5 py-2 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg text-white font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Abrir Turno
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {posSuccessMsg && (
        <div className="col-span-1 lg:col-span-12 bg-teal-50 border border-teal-150 text-teal-800 p-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="font-semibold">{posSuccessMsg}</span>
        </div>
      )}

      {/* SECCIÓN IZQUIERDA: TERMINAL DE SELECCIÓN Y CARRITO (7 Columnas de 12) */}
      <div className="lg:col-span-7 col-span-1 flex flex-col space-y-4">
        
        {/* BUSCADOR Y SELECCIÓN */}
        <div className="border border-slate-150 rounded-xl bg-white shadow-sm overflow-hidden p-4 space-y-3">
          <div>
            <h3 className="font-extrabold text-slate-800 tracking-tight text-sm">
              Dispensación de Fórmulas y Medicamentos
            </h3>
            <p className="text-[10.5px] text-slate-400 mt-0.5">Asignación automática de lotes según fecha de vencimiento inmediata (Norma PEPS del MINSA).</p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              disabled={!activeSession}
              placeholder={activeSession ? "Escriba el nombre comercial, principio activo o genérico del medicamento..." : "Abra la caja para iniciar la búsqueda..."}
              value={searchProductQuery}
              onChange={(e) => setSearchProductQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-205 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/60 font-sans disabled:cursor-not-allowed"
            />
          </div>

          {/* Lista de resultados filtrados */}
          {searchProductQuery.length > 0 && activeSession && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-150">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  No se encontraron medicamentos disponibles con lotes vigentes en esta sucursal.
                </div>
              ) : (
                filteredProducts.map(prod => {
                  const productLots = activeBranchLots.filter(l => l.id_producto === prod.id);
                  const totalStock = productLots.reduce((sum, l) => sum + l.stock, 0);

                  // Oldest lot recommended under FIFO
                  const fifoLot = [...productLots].sort((a, b) => 
                    new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
                  )[0];

                  return (
                    <div key={prod.id} className="p-3 hover:bg-blue-50/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-800 text-xs">{prod.nombre}</span>
                          <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[9px] px-1.5 py-0.2 rounded">
                            {prod.presentacion}
                          </span>
                          {prod.requiere_receta && (
                            <span className="bg-red-50 text-red-700 border border-red-150 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider flex items-center gap-0.5">
                              <AlertOctagon className="w-3 h-3 text-red-500" />
                              Receta Médica Obligatoria
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-450 block mt-0.5">
                          {prod.principio_activo} ({prod.concentracion}) • Lab: {prod.laboratorio} • Reg. San: {prod.registro_sanitario}
                        </span>
                        
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="font-mono text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 rounded">
                            S/ {fifoLot?.precio_venta.toFixed(2)} (Sugerido: S/ {prod.precio_sugerido.toFixed(2)})
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Stock Total Almacén: <strong className="text-slate-800">{totalStock} unidades</strong> (repartidas en {productLots.length} lotes)
                          </span>
                        </div>

                        {fifoLot && (
                          <span className="inline-block text-[9.5px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 mt-2 font-mono">
                            Próximo Lote a Vencer: {fifoLot.numero_lote} (Expira: {fifoLot.fecha_vencimiento} | Stock: {fifoLot.stock})
                          </span>
                        )}
                      </div>

                      {/* FIFO automated fast-buy button */}
                      <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-205 self-stretch sm:self-auto justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-450 font-bold pl-1 font-mono uppercase">Cant</span>
                          <input
                            type="number"
                            id={`qty-fifo-${prod.id}`}
                            defaultValue={1}
                            min={1}
                            max={totalStock}
                            className="w-12 text-center text-xs font-bold border border-slate-205 bg-white rounded p-1 font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const inputEl = document.getElementById(`qty-fifo-${prod.id}`) as HTMLInputElement;
                            const qty = inputEl ? Number(inputEl.value) : 1;
                            handleAddProductFIFO(prod, qty);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-bold px-3 py-2 rounded transition-all shadow-sm flex items-center gap-0.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Agregar FIFO
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* CONTENIDO DEL CARRITO */}
        <div className="border border-slate-150 rounded-xl bg-white shadow-sm flex-1 flex flex-col justify-between overflow-hidden min-h-[300px]">
          <div className="p-4 border-b border-slate-105 bg-slate-50 flex justify-between items-center">
            <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              Canasta de Venta Activa
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-150 font-mono font-bold text-[10px]">
              {cart.length} medicamentos
            </span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                <ShoppingCart className="w-8 h-8 text-slate-300" />
                <p>Las canastas están vacías. Introduzca medicamentos en el buscador.</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-5 bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-slate-850 text-xs">{item.producto.nombre}</span>
                      {item.producto.requiere_receta && (
                        <span className="bg-red-105 text-red-800 border border-red-200 text-[8.5px] font-bold px-1.5 py-0.1 rounded uppercase animate-bounce">
                          Bajo Receta Exigida
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] text-slate-500 font-mono">
                      <span className="text-blue-700 font-bold">Lote: {item.lote.numero_lote}</span>
                      <span>•</span>
                      <span>Vencimiento: {item.lote.fecha_vencimiento}</span>
                      <span>•</span>
                      <span>RS: {item.producto.registro_sanitario}</span>
                    </div>

                    {item.explicacion_fifo && (
                      <p className="text-[9.5px] text-slate-450 italic font-mono leading-relaxed max-w-md">
                        {item.explicacion_fifo}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between">
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-slate-800 block">
                        {item.cantidad} unids x S/ {item.lote.precio_venta.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-extrabold text-blue-700 font-mono block mt-0.5">
                        Item c/IGV: S/ {(item.cantidad * item.lote.precio_venta * 1.18).toFixed(2)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(idx)}
                      className="text-slate-400 hover:text-red-650 p-1.5 rounded hover:bg-slate-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-150 grid grid-cols-3 gap-2 text-center text-slate-600 font-semibold text-[11px]">
            <div className="border-r border-slate-200">
              <span className="block text-[9.5px] text-slate-400">Subtotal Afecto</span>
              <span className="font-mono text-slate-800 text-xs font-extrabold">S/ {cartSubtotal.toFixed(2)}</span>
            </div>
            <div className="border-r border-slate-200">
              <span className="block text-[9.5px] text-slate-400">Impuestos IGV (18%)</span>
              <span className="font-mono text-slate-850 text-xs font-extrabold">S/ {cartIgv.toFixed(2)}</span>
            </div>
            <div>
              <span className="block text-[10px] text-blue-600 font-bold">TOTAL NETO</span>
              <span className="font-mono text-blue-700 text-sm font-black">S/ {cartTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECCIÓN DERECHA: APARTADO DE CHECKOUT / SUNAT / CONTROL DE RECETAS (5 Columnas) */}
      <div className="lg:col-span-5 col-span-1 space-y-4">
        
        {/* PANEL CONTROL DE RECETAS MÉDICAS (Solo si se requiere) */}
        {requiresRecipe && (
          <div className="bg-red-50 p-5 rounded-xl border border-red-200 shadow-sm space-y-4">
            <div className="flex gap-2">
              <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-red-950 font-black text-xs uppercase tracking-wide">
                  DIGEMID: Control de Venta Bajo Receta Médica
                </h4>
                <p className="text-[10px] text-red-800 leading-relaxed mt-0.5">
                  El carro contiene antibióticos u otros medicamentos regulados. Complete los datos de la receta del Colegio Médico del Perú (CMP) para desbloquear el pago.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Doctor */}
              <div>
                <label className="block text-[10px] font-bold text-red-900 mb-1">Nombre Completo del Médico Prescriptor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Dr. Manuel Alarcón Vargas"
                  value={recipeDoctorName}
                  onChange={(e) => setRecipeDoctorName(e.target.value)}
                  className="w-full px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white font-sans text-xs"
                />
              </div>

              {/* CMP (Colegiatura) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-red-900 mb-1">N° de Colegiatura (CMP) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 54129"
                    value={recipeCMP}
                    onChange={(e) => setRecipeCMP(e.target.value)}
                    className="w-full px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-red-900 mb-1">Fecha Emisión Receta *</label>
                  <input
                    type="date"
                    required
                    value={recipeDate}
                    onChange={(e) => setRecipeDate(e.target.value)}
                    className="w-full px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* DROP DE ARCHIVO DE RECETA (SIMULADO) */}
              <div>
                <label className="block text-[10px] font-bold text-red-900 mb-1">Archivo de Receta Médica (Soporte Digital) *</label>
                {recipeFileAttached ? (
                  <div className="p-3 bg-white border border-red-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileImage className="w-5 h-5 text-emerald-600" />
                      <div className="font-mono text-[10px]">
                        <span className="font-bold text-slate-800 block truncate max-w-[150px]">{recipeFileMockName}</span>
                        <span className="text-[9px] text-slate-400">Verificado exitosamente • PNG</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setRecipeFileAttached(false); setRecipeFileMockName(''); }}
                      className="text-red-500 hover:text-red-700 font-bold text-[10px]"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => {
                      setRecipeFileAttached(true);
                      setRecipeFileMockName(`receta_cmp_${recipeCMP || 'médico'}_${Date.now().toString().slice(-4)}.png`);
                    }}
                    className="border-2 border-dashed border-red-200 rounded-lg p-4 text-center cursor-pointer hover:bg-red-100/50 transition-colors space-y-1 bg-white"
                  >
                    <UploadCloud className="w-6 h-6 text-red-400 mx-auto" />
                    <span className="block font-bold text-[10.5px] text-red-800">Cargar Receta Médica (Es obligatorio)</span>
                    <span className="block text-[9px] text-red-405">Haga clic aquí para simular la captura/carga del documento.</span>
                  </div>
                )}
              </div>

              {/* Botón de validación del regente farmacéutico */}
              <div className="bg-white p-2.5 border border-red-150 rounded-lg">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recipeCheckedByRegente}
                    onChange={(e) => setRecipeCheckedByRegente(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-550 border-slate-300 pointer-events-auto h-3.5 w-3.5"
                  />
                  <div className="text-[10px] text-slate-600">
                    <span className="font-extrabold text-slate-850 block">Conformidad del Químico Farmacéutico</span>
                    <span>Certifico que los datos coinciden plenamente y que el medicamento se receta para dosis conformes.</span>
                  </div>
                </label>
              </div>

            </div>
          </div>
        )}

        {/* COMPLEMENTO DE COBRO Y EMISIÓN SUNAT */}
        <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Declaración & Pago OSE-SUNAT
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Tipo de Comprobante</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDocType('Boleta')}
                  className={`py-2 text-[11px] font-bold rounded-lg border transition-all ${
                    docType === 'Boleta'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-205 hover:bg-slate-100'
                  }`}
                >
                  Boleta de Venta
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('Factura')}
                  className={`py-2 text-[11px] font-bold rounded-lg border transition-all ${
                    docType === 'Factura'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-205 hover:bg-slate-100'
                  }`}
                >
                  Factura de Venta
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Cliente Fiscal</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-550 bg-slate-50 font-sans"
              >
                <option value="">-- VARIOS / ANÓNIMO --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre_razon_social} ({c.tipo_documento} {c.numero_documento})</option>
                ))}
              </select>
            </div>

            {/* Checkbox Receta Block overlay block */}
            <button
              onClick={handleProcessSale}
              disabled={cart.length === 0}
              className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-xs border ${
                cart.length === 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-650'
              }`}
            >
              <Send className="w-4 h-4" />
              Facturar & Generar Boleta (s/ {cartTotal.toFixed(2)})
            </button>
          </div>
        </div>

        {/* VISUALIZADOR DE TICKET FISCAL ELECTRÓNICO */}
        {generatedTicket && (
          <div className="bg-slate-900 text-slate-300 p-5 rounded-xl shadow-lg font-mono text-[10px] space-y-3 relative overflow-hidden text-left border border-slate-800">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
            
            <div className="text-center font-black">
              <span className="text-xs block text-white">BOTICA ENTERPRISE SAC</span>
              <span className="block text-slate-450">{generatedTicket.branchName}</span>
              <span className="block">{generatedTicket.branchDir}</span>
              <span className="block">RUC: 20485129304</span>
            </div>

            <div className="border-t border-dashed border-slate-750 pt-2 space-y-1">
              <div><strong>TICKET:</strong> {generatedTicket.numero}</div>
              <div><strong>FECHA / TURNOMOV:</strong> {generatedTicket.fecha}</div>
              <div><strong>CLIENTE:</strong> {generatedTicket.clienteName}</div>
              <div><strong>FISCAL DOC:</strong> {generatedTicket.clienteDoc}</div>
            </div>

            {generatedTicket.hasRecipe && (
              <div className="bg-slate-800 p-2 rounded text-[9px] text-amber-300 border border-slate-700">
                <strong>DESPACHO BAJO RECETA VERIFICADA:</strong>
                <p>Prescriptor: {generatedTicket.recipeDoctor} (CMP: {generatedTicket.recipeCmp})</p>
              </div>
            )}

            <div className="border-t border-dashed border-slate-750 pt-2">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dashed border-slate-750 text-slate-400">
                    <th className="text-left pb-1 font-semibold">Medicamento [Lote]</th>
                    <th className="text-right pb-1 font-semibold">Total(S/)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-slate-800">
                  {generatedTicket.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-1">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[9.5px] text-slate-400">
                          {item.qty} unids x S/ {item.unit.toFixed(2)} [Lote: {item.lot}]
                        </div>
                      </td>
                      <td className="text-right py-1 text-white">S/ {item.tot.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-dashed border-slate-750 pt-2 text-right">
              <div>Subtotal Gravado S/ IGV (18%): S/ {generatedTicket.subtotal.toFixed(2)}</div>
              <div>IGV (18%): S/ {generatedTicket.igv.toFixed(2)}</div>
              <div className="text-xs font-black text-emerald-400">NETO RECIBIDO: S/ {generatedTicket.total.toFixed(2)}</div>
            </div>

            <div className="text-center pt-2 space-y-2">
              <span className="block text-[8.5px] text-slate-450 uppercase">Representación impresa autorizada de la OSE</span>
              <div className="bg-emerald-900/40 text-emerald-400 border border-emerald-800 p-2 rounded text-[9px] font-bold flex items-center justify-center gap-1.5 font-sans">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>COMUNICADO SÍNCRONO APROBADO POR SUNAT</span>
              </div>
              <div className="text-[8px] text-slate-500">HASH: {generatedTicket.hash}</div>
            </div>
          </div>
        )}

        {/* HISTORIAL GENERAL DE CAJAS (AUDITORÍA) */}
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-indigo-500" />
            Historial de Sesiones de Caja chica
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Control histórico de arqueo para auditar faltantes y egresos realizados.</p>

          <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
            {sessionsHistory.length === 0 ? (
              <span className="text-slate-400 block py-4 text-center ">Sin historial registrado</span>
            ) : (
              sessionsHistory.map((s) => (
                <div key={s.id} className="py-2.5 flex justify-between items-start text-[10.5px]">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">Turno {s.id.slice(-5)}</span>
                      <span className={`px-1.5 py-0.2 text-[8.5px] rounded-full border ${
                        s.estado === 'ABIERTA' 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {s.estado}
                      </span>
                    </div>
                    <span className="text-slate-400 block text-[9px] font-mono">{s.fecha_apertura}</span>
                    {s.estado === 'CERRADA' && s.fecha_cierre && (
                      <span className="text-slate-500 block text-[9.5px]">
                        Arqueo Cerrado: S/ {s.monto_cierre_fisico?.toFixed(2)} declarado
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-slate-800 block">Apertura: S/ {s.monto_apertura.toFixed(2)}</span>
                    {s.estado === 'CERRADA' && (
                      <span className={`font-mono block font-bold font-semibold text-[10px] ${
                        (s.diferencia_arqueo || 0) === 0 
                          ? 'text-emerald-700' 
                          : (s.diferencia_arqueo || 0) > 0 
                            ? 'text-blue-600' 
                            : 'text-rose-600'
                      }`}>
                        {(s.diferencia_arqueo || 0) === 0 ? 'Cuadrado' : `${(s.diferencia_arqueo || 0) > 0 ? '+' : ''}${s.diferencia_arqueo?.toFixed(2)}`}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* --- MODAL REGISTRO GASTO MANUAL --- */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <span className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-rose-400" />
                Registrar Gasto de Caja Chica
              </span>
              <button 
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddExpense} className="p-5 space-y-4">
              <p className="text-[11px] text-slate-450 leading-relaxed">
                Todo retiro para gastos de oficina, bolsas, mensajería, o compras menores de almacén debe registrarse aquí para evitar discrepancias en el arqueo final de caja chica.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Motivo o Descripción del Egreso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Compra de cinta de embalaje"
                  value={newExpenseMotivo}
                  onChange={(e) => setNewExpenseMotivo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Monto en Efectivo S/ *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={newExpenseMonto}
                  onChange={(e) => setNewExpenseMonto(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-500 hover:text-slate-800 font-semibold border border-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-805 text-white font-bold rounded-lg transition-all"
                >
                  Confirmar Egreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CIERRE DE CAJA & ARQUEO DE SECCIÓN --- */}
      {showClosureModal && activeSession && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-205 max-w-md w-full overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <span className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-rose-400" />
                Cierre de Turno e Arqueo de Caja Chica
              </span>
              <button 
                onClick={() => setShowClosureModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloseCash} className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg leading-relaxed text-[11px] space-y-1">
                <strong>Advertencia de Cuadre de Caja:</strong>
                <p>Al procesar la conciliación de caja, compare el saldo esperado con el dinero físico existente en la gaveta metálica.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-150 font-mono text-center">
                <div>
                  <span className="block text-[9px] text-slate-500 font-semibold">Monto Inicial</span>
                  <span className="font-extrabold text-slate-800">S/ {activeSession.monto_apertura.toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 font-semibold">Ventas del Turno</span>
                  <span className="font-extrabold text-emerald-700">+S/ {activeSession.ventas_acumuladas.toFixed(2)}</span>
                </div>
                <div className="col-span-2 border-t border-slate-200/60 pt-2 text-center">
                  <span className="block text-[9.5px] text-slate-500 font-bold uppercase">Monto Neto Esperado</span>
                  <span className="font-black text-blue-700 text-lg">S/ {getExpectedCash(activeSession).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-700 mb-1">Monto Físico Declarado (Efectivo real en mano) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={0}
                    value={declaredCashInput}
                    onChange={(e) => setDeclaredCashInput(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border-2 border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-550 font-mono font-bold text-sm"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] mt-1 text-slate-400 font-mono">
                  <span>Diferencia en Caja Chica:</span>
                  <span className={`font-bold ${
                    (declaredCashInput - getExpectedCash(activeSession)) === 0 
                      ? 'text-emerald-600' 
                      : (declaredCashInput - getExpectedCash(activeSession)) > 0 
                        ? 'text-blue-600' 
                        : 'text-rose-600'
                  }`}>
                    S/ {(declaredCashInput - getExpectedCash(activeSession)).toFixed(2)} ({(declaredCashInput - getExpectedCash(activeSession)) === 0 ? 'Sin descuadre' : (declaredCashInput - getExpectedCash(activeSession)) > 0 ? 'Sobrante' : 'Faltante'})
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowClosureModal(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-500 hover:text-slate-800 font-semibold border border-slate-205 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg transition-all shadow-sm"
                >
                  Cerrar Caja & Conciliar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Dummy helper wrapper
function AlertCircle(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
