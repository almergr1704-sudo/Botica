import React, { useState, useEffect } from 'react';
import { 
  Search, ShoppingCart, Trash2, ShieldCheck, TicketCheck, Users, HelpCircle, 
  FileText, CheckCircle, RefreshCw, Send, AlertTriangle, Lock, Unlock, 
  DollarSign, ArrowUpRight, ArrowDownLeft, UploadCloud, FileImage, 
  History, Eye, ClipboardCheck, Scale, AlertOctagon, Ban, Printer, Download, Share2, Mail, ExternalLink, X,
  CreditCard, QrCode, Coins, Check, Percent
} from 'lucide-react';
import { Sucursal, Producto, Lote, Cliente, Usuario, Venta, DetalleVenta } from '../types/pharmacy';
import { 
  generateA4Document, 
  generateTicketDocument, 
  triggerDirectTicketPrint, 
  DocumentContext 
} from '../utils/documentGenerator';

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
  ventas_efectivo?: number;
  ventas_yape_plin?: number;
  ventas_tarjeta?: number;
}

interface POSSystemProps {
  branches: Sucursal[];
  products: Producto[];
  lots: Lote[];
  clients: Cliente[];
  users: Usuario[];
  onAddSale: (newSale: Venta, details: Omit<DetalleVenta, 'id' | 'id_venta'>[]) => void;
  onDeductStock: (loteId: string, qty: number) => void;
  onAddClient?: (client: Omit<Cliente, 'id'>) => void;
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
  onDeductStock,
  onAddClient
}: POSSystemProps) {
  // Config states & current branch
  const [selectedBranchId, setSelectedBranchId] = useState<string>('suc-01');
  const [selectedClientId, setSelectedClientId] = useState<string>('cli-default');
  const [docType, setDocType] = useState<'Boleta' | 'Factura'>('Boleta');

  // New Client creation form states
  const [clientSearchType, setClientSearchType] = useState<'existing' | 'new'>('existing');
  const [newClientDocType, setNewClientDocType] = useState<'DNI' | 'RUC'>('DNI');
  const [newClientDocNum, setNewClientDocNum] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [isQueryingRUC, setIsQueryingRUC] = useState(false);
  const [consultMsg, setConsultMsg] = useState('');
  
  // Search state
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [showSqlReference, setShowSqlReference] = useState<boolean>(false);
  const [errorPOSMessage, setErrorPOSMessage] = useState('');
  const [posSuccessMsg, setPosSuccessMsg] = useState('');

  // Checkout Modal State & Multi-Method configurations
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [checkoutCashAmt, setCheckoutCashAmt] = useState<string>('0');
  const [checkoutCashPaid, setCheckoutCashPaid] = useState<string>('');
  const [checkoutYapeAmt, setCheckoutYapeAmt] = useState<string>('0');
  const [checkoutYapeVoucher, setCheckoutYapeVoucher] = useState<string>('');
  const [checkoutCardAmt, setCheckoutCardAmt] = useState<string>('0');
  const [checkoutCardTerminal, setCheckoutCardTerminal] = useState<'Niubiz' | 'IziPay'>('Niubiz');
  const [checkoutCardRef, setCheckoutCardRef] = useState<string>('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [generatedTicket, setGeneratedTicket] = useState<any | null>(null);

  // Print modal & context for the last processed sale
  const [lastSaleContext, setLastSaleContext] = useState<DocumentContext | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [shareDialogExpanded, setShareDialogExpanded] = useState<boolean>(false);
  const [shareChannel, setShareChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [shareInput, setShareInput] = useState<string>('');
  const [shareToast, setShareToast] = useState<string>('');

  const MOCK_SUNAT_RUC_DB: Record<string, { name: string, address: string, email: string }> = {
    '20100032901': { name: 'FARMACO PERU S.A.C.', address: 'Av. Las Gardenias 452 - San Isidro, Lima', email: 'contacto@farmacoperu.com' },
    '20543210987': { name: 'CORP. MEDICA SAN FERNANDO E.I.R.L.', address: 'Jr. Angaraes 780 - Cercado de Lima, Lima', email: 'ventas@sanfernandomedica.pe' },
    '20601234567': { name: 'REPRESENTACIONES DEZA S.A.', address: 'Av. Javier Prado Este 1105 - San Borja, Lima', email: 'administracion@deza.com.pe' },
    '20591823719': { name: 'BOTICAS EL INCA DEL SUR S.C.R.L.', address: 'Arequipa, Calle Comercio 124', email: 'boticaselinca@incapack.com' }
  };

  const MOCK_RENIEC_DNI_DB: Record<string, { name: string, address: string, email: string }> = {
    '45718293': { name: 'Carlos Mendoza Ruiz', address: 'Calle Los Cedros 321, Lince, Lima', email: 'carlos.mendoza@gmail.com' },
    '71294821': { name: 'Fiorella Beltrán Alva', address: 'Jr. Cuzco 950, San Isidro, Lima', email: 'fio.beltran@hotmail.com' },
    '44556677': { name: 'Juan Alberto Perez Lopez', address: 'Av. Larco 450, Miraflores, Lima', email: 'juan.perez@outlook.com' },
  };

  const handleConsultDoc = () => {
    const docNum = newClientDocNum.trim();
    if (newClientDocType === 'RUC') {
      if (docNum.length !== 11) {
        setConsultMsg('❌ El RUC debe contener exactamente 11 números.');
        return;
      }
      setIsQueryingRUC(true);
      setConsultMsg('🔍 Consultando padrón SUNAT...');
      setTimeout(() => {
        const found = MOCK_SUNAT_RUC_DB[docNum];
        if (found) {
          setNewClientName(found.name);
          setNewClientAddress(found.address);
          setNewClientEmail(found.email);
          setConsultMsg('✅ SUNAT: Datos obtenidos con éxito.');
        } else {
          const suffix = ['S.A.C.', 'E.I.R.L.', 'S.R.L.', 'S.A.'][Math.floor(Math.random() * 4)];
          const names = ['FARMANOR PERU', 'DISTRIBUIDORA INKAFARMA', 'BIO-ALFA PERU', 'MEDICINAS DEL PACIFICO', 'BOTICA & SALUD INTEGRAL', 'FARMACÉUTICA NACIONAL'];
          const randomName = `${names[Math.floor(Math.random() * names.length)]} ${suffix}`;
          const randomAddress = `Av. Los Próceres N° ${Math.floor(100 + Math.random() * 900)}, San Juan de Lurigancho, Lima`;
          const randomEmail = `contacto@${randomName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.pe`;
          setNewClientName(randomName);
          setNewClientAddress(randomAddress);
          setNewClientEmail(randomEmail);
          setConsultMsg('✅ SUNAT: Cliente nuevo registrado en padrón. Datos autocompletados.');
        }
        setIsQueryingRUC(false);
      }, 800);
    } else {
      if (docNum.length !== 8) {
        setConsultMsg('❌ El DNI debe contener exactamente 8 números.');
        return;
      }
      setIsQueryingRUC(true);
      setConsultMsg('🔍 Consultando RENIEC...');
      setTimeout(() => {
        const found = MOCK_RENIEC_DNI_DB[docNum];
        if (found) {
          setNewClientName(found.name);
          setNewClientAddress(found.address);
          setNewClientEmail(found.email);
          setConsultMsg('✅ RENIEC: Identidad verificada.');
        } else {
          const names = ['Alejandro', 'Luis', 'María', 'Ana', 'Juan', 'Rosa', 'Gisela', 'Roberto', 'Paola'];
          const surnames1 = ['Quispe', 'Flores', 'Sánchez', 'García', 'Alva', 'Rojas', 'Mendoza', 'Díaz', 'Castillo'];
          const surnames2 = ['Huamán', 'Mamani', 'Gutiérrez', 'Torres', 'Soto', 'Ramírez', 'Vargas', 'Espinoza'];
          const randomName = `${names[Math.floor(Math.random() * names.length)]} ${surnames1[Math.floor(Math.random() * surnames1.length)]} ${surnames2[Math.floor(Math.random() * surnames2.length)]}`;
          const randomAddress = `Jr. Ayacucho N° ${Math.floor(100 + Math.random() * 900)}, Cercado de Lima, Lima`;
          const randomEmail = `${randomName.toLowerCase().split(' ')[0]}.${randomName.toLowerCase().split(' ')[1]}@gmail.com`;
          setNewClientName(randomName);
          setNewClientAddress(randomAddress);
          setNewClientEmail(randomEmail);
          setConsultMsg('✅ RENIEC: Persona encontrada. Datos completados.');
        }
        setIsQueryingRUC(false);
      }, 600);
    }
  };

  const changeDocType = (type: 'Boleta' | 'Factura') => {
    setDocType(type);
    setConsultMsg('');
    if (type === 'Factura') {
      setNewClientDocType('RUC');
      // If client is currently selected to default (anonymous), we should force to search corporate or enter dynamic fields
      const currentClient = clients.find(c => c.id === selectedClientId);
      if (!currentClient || currentClient.tipo_documento !== 'RUC') {
        const firstRuc = clients.find(c => c.tipo_documento === 'RUC');
        if (firstRuc) {
          setSelectedClientId(firstRuc.id);
        } else {
          setClientSearchType('new');
        }
      }
    } else {
      setNewClientDocType('DNI');
    }
  };

  // Active cashier (Simulado)
  const activeUser: Usuario = users[2] || { 
    id: 'usr-03', 
    username: 'sofia_caja', 
    nombre: 'Sofía Quispe Pineda (Cajero)', 
    rol: 'Cajero', 
    id_sucursal: 'suc-01', 
    activo: true 
  };

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
      ventas_efectivo: 0,
      ventas_yape_plin: 0,
      ventas_tarjeta: 0,
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
  const clientIsSocio = clients.find(c => c.id === selectedClientId)?.es_socio || false;
  
  const getCartItemUnitPrice = (item: CartItem) => {
    // If the client is a Socio, they benefit from a preferential partner rate (15% discount) on the sales unit price
    return clientIsSocio ? item.lote.precio_venta * 0.85 : item.lote.precio_venta;
  };

  const cartTotal = cart.reduce((acc, curr) => acc + (curr.cantidad * getCartItemUnitPrice(curr)), 0);
  const cartSubtotal = cartTotal / 1.18;
  const cartIgv = cartTotal - cartSubtotal;

  // Controller to open checkout payment wizard after standard validations
  const handleOpenCheckoutModal = () => {
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

    // 1. Medical prescription validation
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

    // 2. SUNAT Customer validation depending on docType
    if (docType === 'Factura') {
      if (clientSearchType === 'existing') {
        const clientObj = clients.find(c => c.id === selectedClientId);
        if (!clientObj || clientObj.id === 'cli-default') {
          setErrorPOSMessage('Para emitir Factura Electrónica SUNAT, debe seleccionar un cliente corporativo.');
          return;
        }
        if (clientObj.tipo_documento !== 'RUC') {
          setErrorPOSMessage('El cliente seleccionado tiene DNI o es anónimo. Se requiere RUC de 11 dígitos para emitir Factura.');
          return;
        }
      } else {
        // New client validation for Factura
        const docNum = newClientDocNum.trim();
        if (!/^(10|20)\d{9}$/.test(docNum)) {
          setErrorPOSMessage('Para emitir Factura, el RUC del cliente debe comenzar con 10 o 20 y tener exactamente 11 dígitos numéricos.');
          return;
        }
        if (!newClientName.trim()) {
          setErrorPOSMessage('La Razón Social del cliente es obligatoria para emitir Factura.');
          return;
        }
        if (!newClientAddress.trim()) {
          setErrorPOSMessage('La Dirección Fiscal del cliente es obligatoria para emitir Factura.');
          return;
        }
        if (!newClientEmail.trim() || !newClientEmail.includes('@')) {
          setErrorPOSMessage('Debe ingresar un Correo Electrónico válido para el envío de los comprobantes electrónicos de la Factura.');
          return;
        }

        // Check and register client dynamically
        const existing = clients.find(c => c.numero_documento === docNum);
        if (!existing) {
          onAddClient?.({
            nombre_razon_social: newClientName.trim(),
            tipo_documento: 'RUC',
            numero_documento: docNum,
            direccion: newClientAddress.trim(),
            email: newClientEmail.trim(),
            es_socio: false
          });
        }
      }
    } else {
      // Boleta check: Optional client registering
      if (clientSearchType === 'new' && newClientDocNum.trim()) {
        const docNum = newClientDocNum.trim();
        if (newClientDocType === 'DNI' && !/^\d{8}$/.test(docNum)) {
          setErrorPOSMessage('El DNI ingresado del cliente debe tener exactamente 8 dígitos numéricos.');
          return;
        }
        if (newClientDocType === 'RUC' && !/^(10|20)\d{9}$/.test(docNum)) {
          setErrorPOSMessage('El RUC ingresado del cliente debe comenzar con 10 o 20 y tener exactamente 11 dígitos numéricos.');
          return;
        }
        if (!newClientName.trim()) {
          setErrorPOSMessage('Por lo menos debe ingresar el Nombre/Razón Social para registrar los datos del cliente.');
          return;
        }

        // Save if not exists
        const existing = clients.find(c => c.numero_documento === docNum);
        if (!existing) {
          onAddClient?.({
            nombre_razon_social: newClientName.trim(),
            tipo_documento: newClientDocType,
            numero_documento: docNum,
            direccion: newClientAddress.trim() || undefined,
            email: newClientEmail.trim() || undefined,
            es_socio: false
          });
        }
      }
    }

    // Default checkout allocations to 100% Cash by default
    setCheckoutCashAmt(cartTotal.toFixed(2));
    setCheckoutCashPaid('');
    setCheckoutYapeAmt('0');
    setCheckoutYapeVoucher('');
    setCheckoutCardAmt('0');
    setCheckoutCardRef('');
    setCheckoutCardTerminal('Niubiz');
    
    setShowCheckoutModal(true);
  };

  // SUNAT transaction final recording & state commits
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

    // Millisecond Transaction Concurrency check: Anti-Stock Negativo
    try {
      const dbLotsStr = localStorage.getItem('erp_lots');
      if (dbLotsStr) {
        const dbLots = JSON.parse(dbLotsStr) as Lote[];
        for (const item of cart) {
          const freshLot = dbLots.find(l => l.id === item.lote.id);
          if (!freshLot || freshLot.stock < item.cantidad) {
            setErrorPOSMessage(`[CONCURRENCIA] Bloqueo de stock negativo: El lote "${item.lote.numero_lote}" del medicamento "${item.producto.nombre}" ya no posee stock suficiente en el servidor (Stock disponible: ${freshLot ? freshLot.stock : 0}, Requerido: ${item.cantidad}). Operación rechazada.`);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Error verifying thread stock", err);
    }

    let clientObj = clients.find(c => c.id === selectedClientId);
    if (clientSearchType === 'new' && newClientDocNum.trim()) {
      const found = clients.find(c => c.numero_documento === newClientDocNum.trim());
      if (found) {
        clientObj = found;
      }
    }

    // Double check prescription
    if (requiresRecipe) {
      if (!recipeDoctorName.trim() || !recipeCMP.trim() || !recipeDate || !recipeFileAttached || !recipeCheckedByRegente) {
        setErrorPOSMessage('DIGEMID Bloqueo: El carrito contiene medicamentos que exigen Receta Médica Obligatoria.');
        return;
      }
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
      id_cliente: clientObj ? (clientObj.id === 'cli-default' ? undefined : clientObj.id) : undefined,
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

    const detailRecords: Omit<DetalleVenta, 'id' | 'id_venta'>[] = cart.map(item => {
      const discountedUnit = getCartItemUnitPrice(item);
      const total_item = item.cantidad * discountedUnit;
      const subtotal_item = total_item / 1.18;
      const igv_item = total_item - subtotal_item;
      return {
        id_producto: item.producto.id,
        id_lote: item.lote.id,
        numero_lote: item.lote.numero_lote,
        cantidad: item.cantidad,
        precio_unitario: discountedUnit,
        igv_item: igv_item,
        total_item: total_item
      };
    });

    // Trigger state changes in Parent (App.tsx)
    onAddSale(saleRecord, detailRecords);
    
    // Deduct stock per selected lot
    cart.forEach(item => {
      onDeductStock(item.lote.id, item.cantidad);
    });

    // Extract exact cash flow breakdowns
    const cashPortion = Number(checkoutCashAmt || 0);
    const yapePortion = Number(checkoutYapeAmt || 0);
    const cardPortion = Number(checkoutCardAmt || 0);

    // Update current active cash session revenues with payment breakdown for audit trails
    const updatedSession: CashSession = {
      ...activeSession,
      ventas_acumuladas: activeSession.ventas_acumuladas + cartTotal,
      ventas_efectivo: (activeSession.ventas_efectivo || 0) + cashPortion,
      ventas_yape_plin: (activeSession.ventas_yape_plin || 0) + yapePortion,
      ventas_tarjeta: (activeSession.ventas_tarjeta || 0) + cardPortion,
    };
    const updatedHistory = sessionsHistory.map(s => s.id === activeSession.id ? updatedSession : s);
    setSessionsHistory(updatedHistory);
    setActiveSession(updatedSession);
    localStorage.setItem('erp_cash_sessions', JSON.stringify(updatedHistory));

    // Fill ticket print visual display
    const chosenBranch = branches.find(b => b.id === selectedBranchId);
    const ticketObj = {
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
      paymentSplit: {
        cash: cashPortion,
        yape: yapePortion,
        card: cardPortion,
        yapeRef: checkoutYapeVoucher,
        cardRef: checkoutCardRef,
        cardTerm: checkoutCardTerminal,
        cashPaid: Number(checkoutCashPaid || 0)
      },
      items: cart.map(item => {
        const discountedUnit = getCartItemUnitPrice(item);
        return {
          name: item.producto.nombre,
          lot: item.lote.numero_lote,
          qty: item.cantidad,
          unit: discountedUnit,
          tot: item.cantidad * discountedUnit
        };
      })
    };
    setGeneratedTicket(ticketObj);

    // Assembly of Document Context for real native printing and PDF generation
    const detailsContextList = cart.map((item, index) => {
      const discountedUnit = getCartItemUnitPrice(item);
      const total_item = item.cantidad * discountedUnit;
      const subtotal_item = total_item / 1.18;
      const igv_item = total_item - subtotal_item;
      return {
        id: `det-${Date.now()}-${index}`,
        id_venta: finalId,
        id_producto: item.producto.id,
        id_lote: item.lote.id,
        numero_lote: item.lote.numero_lote,
        cantidad: item.cantidad,
        precio_unitario: discountedUnit,
        igv_item: igv_item,
        total_item: total_item,
        productoName: item.producto.nombre,
        principioActivo: item.producto.principio_activo,
        concentra: item.producto.concentracion
      };
    });

    const docContext: DocumentContext = {
      sale: saleRecord,
      details: detailsContextList,
      branch: chosenBranch,
      client: clientObj || undefined,
      cashier: activeUser
    };

    setLastSaleContext(docContext);
    setShowPrintModal(true);
    setShareDialogExpanded(false);
    setShareInput('');

    // Reset Form and State
    setCart([]);
    setSelectedClientId('cli-default'); // reset to default anon client!
    setRecipeDoctorName('');
    setRecipeCMP('');
    setRecipeDate('');
    setRecipeFileAttached(false);
    setRecipeFileMockName('');
    setRecipeCheckedByRegente(false);
    setShowCheckoutModal(false); // Close payment wizard
    setPosSuccessMsg('¡Venta facturada con éxito, registrada en arqueo, y ticket impreso!');
  };

  // Helper lots of current branch
  const activeBranchLots = lots.filter(l => l.id_sucursal === selectedBranchId && l.stock > 0);
  const availableProductIds = Array.from(new Set(activeBranchLots.map(l => l.id_producto)));
  const availableProducts = products.filter(p => p.activo !== false && availableProductIds.includes(p.id));

  // Search filtered products with robust multi-field predictive lookup (rebounding on >=3 characters)
  const filteredProducts = (() => {
    const query = searchProductQuery.trim().toLowerCase();
    if (query.length < 3) return [];

    const matched = availableProducts.filter(p => {
      const matchBrand = p.nombre.toLowerCase().includes(query);
      const matchGeneric = p.principio_activo.toLowerCase().includes(query);
      const matchBarcode = p.codigo_barras.toLowerCase().includes(query);
      const matchInternalId = p.id.toLowerCase().includes(query);
      const matchLab = p.laboratorio.toLowerCase().includes(query);
      const matchCat = p.categoria.toLowerCase().includes(query);

      return matchBrand || matchGeneric || matchBarcode || matchInternalId || matchLab || matchCat;
    });

    // Sort descending by total branch stock to prioritize available alternatives
    return matched.sort((a, b) => {
      const stockA = activeBranchLots.filter(l => l.id_producto === a.id).reduce((sum, l) => sum + l.stock, 0);
      const stockB = activeBranchLots.filter(l => l.id_producto === b.id).reduce((sum, l) => sum + l.stock, 0);
      return stockB - stockA;
    });
  })();

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

          {/* Aviso preventivo para ingreso menor a 3 caracteres */}
          {searchProductQuery.trim().length > 0 && searchProductQuery.trim().length < 3 && activeSession && (
            <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-2 text-[11px] animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="font-bold">Escribiendo término de búsqueda...</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Por favor ingrese al menos 3 caracteres para iniciar el motor predictivo multi-campo.</p>
              </div>
            </div>
          )}

          {/* Lista de resultados filtrados con Autocompletado */}
          {searchProductQuery.trim().length >= 3 && activeSession && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-h-75 overflow-y-auto divide-y divide-slate-150 relative z-10 animate-in slide-in-from-top-1 duration-150">
              {filteredProducts.length === 0 ? (
                <div className="p-5 text-center text-slate-400 space-y-2">
                  <AlertOctagon className="w-7 h-7 text-slate-300 mx-auto" />
                  <span className="block font-bold text-slate-500">No se encontraron medicamentos disponibles con lotes vigentes</span>
                  <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Escriba otro principio activo o genérico para ver las marcas equivalentes que sí tengan stock en esta sucursal (ej: "Paracetamol", "Amoxicilina", "Portugal").
                  </p>
                </div>
              ) : (
                <>
                  {/* Info Header suggesting generic match */}
                  <div className="bg-slate-50 px-3 py-2 text-[10px] text-slate-500 font-semibold border-b border-slate-150 flex items-center justify-between">
                    <span>Resultados del autocompletado inteligente (ordenados por stock disponible):</span>
                    <span className="text-[9.5px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-mono">
                      {filteredProducts.length} marcas/fórmulas
                    </span>
                  </div>

                  {filteredProducts.map(prod => {
                    const productLots = activeBranchLots.filter(l => l.id_producto === prod.id);
                    const totalStock = productLots.reduce((sum, l) => sum + l.stock, 0);

                    // Oldest lot recommended under FIFO
                    const fifoLot = [...productLots].sort((a, b) => 
                      new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
                    )[0];

                    const isRecommAlternative = searchProductQuery.trim().toLowerCase() !== prod.nombre.toLowerCase();

                    return (
                      <div key={prod.id} className="p-3.5 hover:bg-indigo-50/25 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors">
                        <div className="flex-1 min-w-0">
                          {/* REQUIRED LINE FORMAT SPEC:
                              [Nombre Comercial] + [Principio Activo] - [Presentación] | [Laboratorio] | Stock: [Cant.] | Precio: S/. [Monto] */}
                          <div className="font-extrabold text-[11.5px] text-slate-800 leading-snug flex items-center flex-wrap gap-x-1 gap-y-0.5">
                            <span className="text-blue-750 font-black">{prod.nombre}</span>
                            <span className="text-slate-400 font-bold">+</span>
                            <span className="text-indigo-650 font-bold">({prod.principio_activo})</span>
                            <span className="text-slate-400 font-bold">-</span>
                            <span className="text-slate-550 font-medium">{prod.presentacion}</span>
                            <span className="text-slate-300 font-normal">|</span>
                            <span className="text-amber-800 font-semibold">{prod.laboratorio}</span>
                            <span className="text-slate-300 font-normal">|</span>
                            <span className={`px-1 rounded-sm text-[10.5px] ${totalStock <= 20 ? 'text-red-700 bg-red-50 font-bold' : 'text-slate-850 font-extrabold'}`}>
                              Stock: {totalStock}
                            </span>
                            <span className="text-slate-300 font-normal">|</span>
                            <span className="text-emerald-700 bg-emerald-50/50 px-1 rounded font-black">
                              Precio: S/. {fifoLot?.precio_venta.toFixed(2) || prod.precio_sugerido.toFixed(2)}
                            </span>
                          </div>

                          {/* Secondary badges & tags for UI clarity */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[8.5px] font-mono">
                              BARCODE: {prod.codigo_barras} • COD_INT: {prod.id}
                            </span>
                            <span className="text-[9.5px] text-slate-400">
                              Categoría: <span className="text-slate-600 font-medium">{prod.categoria}</span>
                            </span>
                            {prod.requiere_receta && (
                              <span className="bg-rose-50 text-rose-700 border border-rose-150 text-[8.5px] px-1.5 py-px rounded font-extrabold uppercase tracking-wider flex items-center gap-0.5">
                                <AlertOctagon className="w-3 h-3 text-rose-500" />
                                Receta Obligatoria
                              </span>
                            )}
                          </div>

                          {fifoLot && (
                            <span className="inline-block text-[9px] text-slate-500 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150 mt-1.5 font-mono">
                              Próximo Lote a Vencer PEPS: <span className="text-amber-700 font-bold">{fifoLot.numero_lote}</span> (Expira: {fifoLot.fecha_vencimiento} | Stock: {fifoLot.stock} uds)
                            </span>
                          )}
                        </div>

                        {/* FIFO automated fast-buy button */}
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200 shrink-0 self-stretch sm:self-auto justify-between">
                          <div className="flex flex-col">
                            <span className="text-[8.5px] text-slate-400 font-bold pl-1 font-mono uppercase">Cant</span>
                            <input
                              type="number"
                              id={`qty-fifo-${prod.id}`}
                              defaultValue={1}
                              min={1}
                              max={totalStock}
                              className="w-12 text-center text-xs font-bold border border-slate-205 bg-white rounded p-1 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const inputEl = document.getElementById(`qty-fifo-${prod.id}`) as HTMLInputElement;
                              const qty = inputEl ? Number(inputEl.value) : 1;
                              handleAddProductFIFO(prod, qty);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-bold px-3 py-2 rounded transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3 animate-spin-slow" />
                            Agregar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Developer Tools SQL Reference Toggle Button */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-mono text-[9px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
              Algoritmo: Búsqueda Predictiva Multi-campo activa (mín. 3 chars)
            </span>
            <button
              type="button"
              onClick={() => setShowSqlReference(!showSqlReference)}
              className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline py-0.5 px-2 rounded hover:bg-indigo-50/80 transition-colors cursor-pointer"
            >
              {showSqlReference ? "Ocultar Consulta SQL" : "🛠 Ver Consulta SQL (Backend)"}
            </button>
          </div>

          {showSqlReference && (
            <div className="bg-slate-900 border border-slate-800 text-slate-300 p-3.5 rounded-lg space-y-2 mt-2 leading-relaxed animate-in slide-in-from-top-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-extrabold text-[9.5px] uppercase tracking-wide text-indigo-400 font-mono flex items-center gap-1.5">
                  📁 SQL Query Engine (PostgreSQL / SQLite Equivalent)
                </span>
                <span className="text-[8.5px] text-slate-500 font-mono">Búsqueda Unificada</span>
              </div>
              <p className="text-[9.5px] text-slate-400 font-sans">
                Esta consulta optimizada con operadores <span className="font-mono text-white">ILIKE / OR</span> busca coincidencias simultáneas de marca, genérico, lote o laboratorio, previniendo la pérdida de ventas al sugerir de inmediato alternativas con stock disponible:
              </p>
              <pre className="text-[9px] text-indigo-300 font-mono bg-slate-950 p-2.5 rounded overflow-x-auto whitespace-pre">
{`SELECT p.*, COALESCE(SUM(l.stock), 0) AS stock_total
FROM productos p
LEFT JOIN lotes l ON p.id = l.id_producto AND l.id_sucursal = :sucursal_id AND l.stock > 0
WHERE 
  p.nombre ILIKE :query_term          -- Nombre Comercial (ej: 'Apronax')
  OR p.principio_activo ILIKE :query_term  -- Genérico (ej: 'Naproxeno')
  OR p.codigo_barras ILIKE :query_term      -- Código de Barras Escaneado
  OR p.id ILIKE :query_term                 -- Código de Producto Interno
  OR p.laboratorio ILIKE :query_term       -- Laboratorio (ej: 'Bayer')
  OR p.categoria ILIKE :query_term         -- Categoría (ej: 'Antibióticos')
GROUP BY p.id
ORDER BY stock_total DESC;  -- Priorizar marcas con mayor disponibilidad`}
              </pre>
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
                        {item.cantidad} unids x S/ {getCartItemUnitPrice(item).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-extrabold text-blue-700 font-mono block mt-0.5">
                        Importe: S/ {(item.cantidad * getCartItemUnitPrice(item)).toFixed(2)}
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
                  onClick={() => changeDocType('Boleta')}
                  className={`py-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    docType === 'Boleta'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-205 hover:bg-slate-100'
                  }`}
                >
                  Boleta de Venta
                </button>
                <button
                  type="button"
                  onClick={() => changeDocType('Factura')}
                  className={`py-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
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
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-600">Cliente / Receptor</label>
                {clientIsSocio && (
                  <span className="bg-indigo-100 text-indigo-750 font-black text-[9px] px-2 py-0.5 rounded-full animate-pulse border border-indigo-250">
                    ★ SOCIO PREFERENCIAL ACTIVO (-15%)
                  </span>
                )}
              </div>

              {/* Navigation Tabs for Client Type Selection */}
              <div className="grid grid-cols-2 gap-1 mb-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/40 dark:border-slate-700/40">
                <button
                  type="button"
                  onClick={() => setClientSearchType('existing')}
                  className={`py-1.5 text-[10.5px] font-extrabold rounded-md cursor-pointer transition-all ${
                    clientSearchType === 'existing'
                      ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Buscar Existente 🔍
                </button>
                <button
                  type="button"
                  onClick={() => setClientSearchType('new')}
                  className={`py-1.5 text-[10.5px] font-extrabold rounded-md cursor-pointer transition-all ${
                    clientSearchType === 'new'
                      ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Registrar Nuevo / Consultar 👤
                </button>
              </div>

              {clientSearchType === 'existing' ? (
                <div>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 bg-slate-50 font-sans text-xs cursor-pointer ${
                      clientIsSocio 
                        ? 'border-indigo-400 focus:ring-indigo-500 bg-indigo-50/10 text-indigo-900 font-extrabold'
                        : 'border-slate-205 focus:ring-blue-550'
                    }`}
                  >
                    {/* Filter based on Factura/Boleta requirements */}
                    {clients
                      .filter(c => docType === 'Boleta' ? true : c.tipo_documento === 'RUC')
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nombre_razon_social} ({c.tipo_documento} {c.numero_documento}){c.es_socio ? ' ★ SOCIO' : ''}
                        </option>
                      ))
                    }
                    {docType === 'Factura' && clients.filter(c => c.tipo_documento === 'RUC').length === 0 && (
                      <option value="" disabled>
                        ⚠️ No hay clientes registrados con RUC
                      </option>
                    )}
                  </select>

                  {docType === 'Factura' && clients.filter(c => c.tipo_documento === 'RUC').length === 0 && (
                    <p className="text-[10px] text-amber-700 mt-1 leading-tight">
                      * No tiene clientes con RUC registrados. Use "Registrar Nuevo" para realizar la consulta SUNAT y autocompletar.
                    </p>
                  )}
                </div>
              ) : (
                /* Registrar Nuevo client form */
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-[10px]">Identificación del Cliente</span>
                    <div className="flex gap-1.5">
                      {docType === 'Factura' ? (
                        <span className="bg-blue-100 text-blue-800 text-[9.5px] px-2 py-0.5 rounded font-extrabold uppercase font-mono">
                          Requerido: RUC
                        </span>
                      ) : (
                        <div className="flex bg-slate-200 rounded p-0.5">
                          <button
                            type="button"
                            onClick={() => { setNewClientDocType('DNI'); setConsultMsg(''); }}
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer ${
                              newClientDocType === 'DNI' ? 'bg-blue-600 text-white' : 'text-slate-650'
                            }`}
                          >
                            DNI
                          </button>
                          <button
                            type="button"
                            onClick={() => { setNewClientDocType('RUC'); setConsultMsg(''); }}
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer ${
                              newClientDocType === 'RUC' ? 'bg-blue-600 text-white' : 'text-slate-650'
                            }`}
                          >
                            RUC
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 bg-white p-0.5 rounded border border-slate-205">
                    <input
                      type="text"
                      maxLength={newClientDocType === 'RUC' ? 11 : 8}
                      placeholder={newClientDocType === 'RUC' ? "RUC de 11 dígitos" : "DNI de 8 dígitos"}
                      value={newClientDocNum}
                      onChange={(e) => { setNewClientDocNum(e.target.value.replace(/\D/g, '')); setConsultMsg(''); }}
                      className="flex-1 px-2 py-1 focus:outline-hidden font-mono text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleConsultDoc}
                      disabled={isQueryingRUC}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[9.5px] flex items-center gap-1 shrink-0 disabled:bg-slate-400 cursor-pointer"
                    >
                      {isQueryingRUC ? 'Espere...' : `Consultar ${newClientDocType}`}
                    </button>
                  </div>

                  {consultMsg && (
                    <p className={`text-[9.5px] font-mono leading-tight p-1 bg-white rounded border border-slate-100 ${consultMsg.startsWith('❌') ? 'text-red-650' : 'text-emerald-700 font-bold'}`}>
                      {consultMsg}
                    </p>
                  )}

                  <div className="space-y-1.5 pt-1">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                        {newClientDocType === 'RUC' ? 'Razón Social Fiscal' : 'Nombres y Apellidos'} {docType === 'Factura' && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        placeholder={newClientDocType === 'RUC' ? "Ej. PHARMA CORP PERU S.A.C." : "Ej. Doris Quispe Mamani"}
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                        {newClientDocType === 'RUC' ? 'Dirección Fiscal' : 'Dirección'} {docType === 'Factura' && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        placeholder="Av. Principal N° 123 - Lince, Lima"
                        value={newClientAddress}
                        onChange={(e) => setNewClientAddress(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                        Correo Electrónico {docType === 'Factura' && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="email"
                        placeholder="cliente@dominio.com.pe"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Checkbox Receta Block overlay block */}
            <button
              onClick={handleOpenCheckoutModal}
              disabled={cart.length === 0}
              className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-xs border cursor-pointer ${
                cart.length === 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-650 active:scale-95 shadow-sm'
              }`}
            >
              <Send className="w-4 h-4" />
              Abrir Pasarela de Pago (s/ {cartTotal.toFixed(2)})
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

      {/* --- MODAL PASARELA DE PAGO MULTI-MÉTODO --- */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4 backdrop-blur-xs font-sans overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Header / Resumen del Recibo */}
            <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex justify-between items-center">
              <div>
                <span className="bg-blue-600/50 backdrop-blur-xs text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-blue-400/30 font-mono">
                  {docType === 'Factura' ? 'Facturación de Factura Electrónica' : 'Facturación de Boleta de Venta'}
                </span>
                <h3 className="text-lg font-black mt-1 flex items-center gap-1.5">
                  <Coins className="w-5 h-5 text-amber-300" />
                  Módulo de Cobro & Pasarela de Pago
                </h3>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="text-white/80 hover:text-white font-bold bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-all text-sm w-8 h-8 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Resumen del Cliente y Descuento Socio */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex flex-wrap gap-4 justify-between items-center">
              <div>
                <span className="block text-[9.5px] text-slate-400 font-bold uppercase tracking-wide">Cliente del Comprobante</span>
                <span className="font-bold text-slate-800">
                  {clients.find(c => c.id === selectedClientId)?.nombre_razon_social || 'Clientes Varios (Anónimo)'}
                </span>
              </div>
              
              <div className="text-right">
                <span className="block text-[9.5px] text-slate-400 font-bold uppercase tracking-wide">Total Neto a Cobrar</span>
                <span className="text-xl font-black text-blue-700 font-mono">
                  S/ {cartTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quick Shortcuts */}
            <div className="px-6 pt-4 pb-1">
              <span className="block text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-wide">Métodos de Pago Rápidos (100%)</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutCashAmt(cartTotal.toFixed(2));
                    setCheckoutYapeAmt('0');
                    setCheckoutCardAmt('0');
                  }}
                  className={`py-2 px-3 rounded-lg border text-center font-bold text-xs transition-all cursor-pointer ${
                    Math.abs(Number(checkoutCashAmt || 0) - cartTotal) < 0.01 && Number(checkoutYapeAmt || 0) === 0 && Number(checkoutCardAmt || 0) === 0
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                      : 'bg-white border-slate-205 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  💵 100% Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutCashAmt('0');
                    setCheckoutYapeAmt(cartTotal.toFixed(2));
                    setCheckoutCardAmt('0');
                  }}
                  className={`py-2 px-3 rounded-lg border text-center font-bold text-xs transition-all cursor-pointer ${
                    Math.abs(Number(checkoutYapeAmt || 0) - cartTotal) < 0.01 && Number(checkoutCashAmt || 0) === 0 && Number(checkoutCardAmt || 0) === 0
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-805 shadow-xs'
                      : 'bg-white border-slate-205 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  📱 100% Yape / Plin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutCashAmt('0');
                    setCheckoutYapeAmt('0');
                    setCheckoutCardAmt(cartTotal.toFixed(2));
                  }}
                  className={`py-2 px-3 rounded-lg border text-center font-bold text-xs transition-all cursor-pointer ${
                    Math.abs(Number(checkoutCardAmt || 0) - cartTotal) < 0.01 && Number(checkoutCashAmt || 0) === 0 && Number(checkoutYapeAmt || 0) === 0
                      ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs'
                      : 'bg-white border-slate-205 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  💳 100% Tarjeta
                </button>
              </div>
            </div>

            {/* Payment breakdowns (Custom / Split Inputs) */}
            <div className="p-6 space-y-4 max-h-[380px] overflow-y-auto">
              {/* SECTION A: CASH */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-700 flex items-center gap-1">
                    💸 A. Pago en Efectivo (Soles)
                  </span>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1 font-mono text-slate-400 font-semibold text-[10px]">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={checkoutCashAmt}
                      onChange={(e) => setCheckoutCashAmt(e.target.value)}
                      className="w-full text-right pr-2 pl-6 py-0.5 border border-slate-205 rounded font-bold font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {Number(checkoutCashAmt || 0) > 0 && (
                  <div className="grid grid-cols-2 gap-4 pt-1 animate-in slide-in-from-top-1">
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 mb-1">Monto Entregado por Cliente</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">S/</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Con cuánto paga..."
                          value={checkoutCashPaid}
                          onChange={(e) => setCheckoutCashPaid(e.target.value)}
                          className="w-full pl-6 pr-2 py-1 border border-slate-205 rounded font-mono font-bold text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-150 rounded-lg p-2.5 flex flex-col justify-center text-center">
                      <span className="block text-[8.5px] font-black uppercase text-emerald-800 tracking-wide">Vuelto Exacto</span>
                      <span className="font-black text-emerald-700 text-base font-mono">
                        S/ {Math.max(0, Number(checkoutCashPaid || 0) - Number(checkoutCashAmt || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION B: YAPE / PLIN */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-700 flex items-center gap-1">
                    📱 B. Billeteras Digitales (Yape / Plin)
                  </span>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1 font-mono text-slate-400 font-semibold text-[10px]">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={checkoutYapeAmt}
                      onChange={(e) => setCheckoutYapeAmt(e.target.value)}
                      className="w-full text-right pr-2 pl-6 py-0.5 border border-slate-205 rounded font-bold font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {Number(checkoutYapeAmt || 0) > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 animate-in slide-in-from-top-1 items-center bg-white p-3 rounded-lg border border-indigo-100">
                    <div className="sm:col-span-4 flex flex-col items-center justify-center p-2 bg-slate-50 rounded border border-slate-150">
                      <QrCode className="w-14 h-14 text-slate-800 animate-pulse" />
                      <span className="text-[8px] font-bold text-indigo-700 uppercase mt-1 tracking-wide">QR DE LA BOTICA</span>
                    </div>
                    <div className="sm:col-span-8 space-y-2">
                      <p className="text-[9.5px] text-slate-500 leading-snug">
                        Muestre el código QR al cliente. Una vez verificado el abono en el celular o monitor, digite obligatoriamente los 4 últimos dígitos de la operación del Yape / Plin.
                      </p>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-600 mb-0.5">Últimos 4 Dígitos de Operación *</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="Ej: 9815"
                          value={checkoutYapeVoucher}
                          onChange={(e) => setCheckoutYapeVoucher(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-2.5 py-1 border border-slate-205 rounded font-mono font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                        {checkoutYapeVoucher.trim().length < 4 && (
                          <span className="text-rose-600 text-[8.5px] font-semibold block mt-1">★ Requerido (últimos 4 dígitos numéricos)</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION C: CARD / TELEFONÍA / TARJETAS */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-700 flex items-center gap-1">
                    💳 C. Tarjetas (Crédito o Débito)
                  </span>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1 font-mono text-slate-400 font-semibold text-[10px]">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={checkoutCardAmt}
                      onChange={(e) => setCheckoutCardAmt(e.target.value)}
                      className="w-full text-right pr-2 pl-6 py-0.5 border border-slate-205 rounded font-bold font-mono text-xs focus:ring-1 focus:ring-blue-550 focus:outline-none"
                    />
                  </div>
                </div>

                {Number(checkoutCardAmt || 0) > 0 && (
                  <div className="grid grid-cols-2 gap-3 pt-1 animate-in slide-in-from-top-1 bg-white p-3 rounded-lg border border-blue-100">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Terminal de Pago</label>
                      <select
                        value={checkoutCardTerminal}
                        onChange={(e) => setCheckoutCardTerminal(e.target.value as 'Niubiz' | 'IziPay')}
                        className="w-full px-2 py-1 border border-slate-205 rounded font-sans font-bold text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                      >
                        <option value="Niubiz">Niubiz POS</option>
                        <option value="IziPay">IziPay POS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">N° de Referencia Voucher *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 0045"
                        value={checkoutCardRef}
                        onChange={(e) => setCheckoutCardRef(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-2.5 py-1 border border-slate-205 rounded font-mono font-bold text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      {checkoutCardRef.trim().length === 0 && (
                        <span className="text-rose-600 text-[8.5px] font-semibold block mt-1">★ Campo Requerido</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Calculations Status Box */}
            {(() => {
              const totalAllocated = Number(checkoutCashAmt || 0) + Number(checkoutYapeAmt || 0) + Number(checkoutCardAmt || 0);
              const diff = cartTotal - totalAllocated;
              const isBalanced = Math.abs(diff) < 0.05;
              const isOverAllocated = diff < -0.05;

              const yapeFilledCorrect = Number(checkoutYapeAmt || 0) === 0 || checkoutYapeVoucher.trim().length >= 4;
              const cardFilledCorrect = Number(checkoutCardAmt || 0) === 0 || checkoutCardRef.trim().length > 0;
              const formsValid = isBalanced && yapeFilledCorrect && cardFilledCorrect;

              return (
                <div className="border-t border-slate-200 bg-slate-50">
                  {/* Visual Status Indicator */}
                  <div className={`p-4 text-xs font-semibold flex items-center justify-between border-b border-slate-150 ${
                    isBalanced 
                      ? 'bg-emerald-50 text-emerald-800' 
                      : isOverAllocated 
                        ? 'bg-rose-50 text-rose-800 animate-pulse'
                        : 'bg-amber-50 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {isBalanced ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                      <div>
                        <span className="font-bold">Distribución del Pago:</span>
                        <p className="text-[10.5px] text-slate-500 font-mono">
                          Asignado: S/ {totalAllocated.toFixed(2)} | Esperado: S/ {cartTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {!isBalanced && (
                      <div className="flex items-center gap-1.5">
                        {isOverAllocated ? (
                          <span className="font-bold font-mono">Exceso: S/ {Math.abs(diff).toFixed(2)}</span>
                        ) : (
                          <>
                            <span className="font-bold font-mono text-amber-800">Incompleto: S/ {diff.toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => {
                                // Add remaining to cash
                                const currentCash = Number(checkoutCashAmt || 0);
                                setCheckoutCashAmt((currentCash + diff).toFixed(2));
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] px-2.5 py-1 rounded shadow-xs cursor-pointer hover:scale-105 active:scale-95 transition-all"
                            >
                              + Cuadrar con Efectivo
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {isBalanced && (
                      <span className="bg-emerald-100 text-emerald-850 border border-emerald-250 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wide">
                        ✔ Caja Lista
                      </span>
                    )}
                  </div>

                  {/* Operational validation messages */}
                  {(!yapeFilledCorrect || !cardFilledCorrect) && (
                    <div className="bg-rose-50 border-b border-slate-150 p-3 text-[10px] text-rose-800 space-y-0.5 font-sans">
                      <strong>Campos obligatorios requeridos:</strong>
                      {!yapeFilledCorrect && <p>• Ingrese los 4 últimos dígitos del voucher de operacion de Yape / Plin.</p>}
                      {!cardFilledCorrect && <p>• Ingrese el número de referencia del voucher de tarjeta POS (Niubiz/IziPay).</p>}
                    </div>
                  )}

                  {/* Actions bar */}
                  <div className="p-4 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowCheckoutModal(false)}
                      className="px-4 py-2 bg-white border border-slate-205 rounded-xl font-bold font-sans text-slate-600 hover:text-slate-900 text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Volver al Carrito
                    </button>
                    <button
                      type="button"
                      disabled={!formsValid}
                      onClick={handleProcessSale}
                      className={`px-5 py-2.5 rounded-xl font-bold font-sans text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                        formsValid
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                          : 'bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <TicketCheck className="w-4 h-4" />
                      Emitir {docType === 'Factura' ? 'Factura' : 'Boleta'} & Cobrar
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* VENTANA MODAL FLOTANTE (BOTONERA INTERFAZ POS DE COMPROBANTES) */}
      {showPrintModal && lastSaleContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-emerald-600 text-white p-5 relative">
              <button 
                onClick={() => setShowPrintModal(false)}
                className="absolute top-4 right-4 text-emerald-100 hover:text-white p-1 hover:bg-emerald-700/55 rounded-full transition-colors"
                id="pos-close-print-modal"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-2 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-snug">Venta Procesada Exitosamente</h3>
                  <p className="text-emerald-100 text-[10.5px]">Comprobante firmado y aprobado de forma síncrona por SUNAT (OSE)</p>
                </div>
              </div>
            </div>

            {/* Quick Metadata Recap */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Comprobante</span>
                <span className="font-extrabold text-slate-700 text-xs">
                  {lastSaleContext.sale.tipo_comprobante === 'Factura' ? 'Factura Electrónica' : 'Boleta de Venta'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Correlativo</span>
                <span className="font-mono font-bold text-slate-800 text-xs">
                  {lastSaleContext.sale.serie_comprobante}-{lastSaleContext.sale.numero_comprobante}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Cliente</span>
                <span className="font-semibold text-slate-600 truncate block">
                  {lastSaleContext.client?.nombre_razon_social || 'Público General'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Monto Cobrado</span>
                <span className="font-bold font-black text-emerald-600 text-sm">
                  S/ {lastSaleContext.sale.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* BUTTON 1: IMPRIMIR TICKET */}
                <button
                  onClick={() => triggerDirectTicketPrint(lastSaleContext)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-center group"
                  id="btn-print-ticket-native"
                >
                  <Printer className="w-7 h-7 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-slate-800 text-xs">Imprimir Ticket</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 leading-tight">Envío directo a ticketera (80mm) sin vista previa</span>
                </button>

                {/* BUTTON 2: DESCARGAR PDF */}
                <button
                  onClick={() => {
                    const doc = generateA4Document(lastSaleContext);
                    doc.save(`A4_${lastSaleContext.sale.tipo_comprobante === 'Factura' ? 'FA' : 'BO'}_${lastSaleContext.sale.serie_comprobante}-${lastSaleContext.sale.numero_comprobante}.pdf`);
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-center group"
                  id="btn-download-pdf-a4"
                >
                  <Download className="w-7 h-7 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-slate-800 text-xs">Descargar PDF A4</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 leading-tight">Formato oficial A4 para descarga directa o archivo</span>
                </button>
              </div>

              {/* Download alternative: Ticket PDF */}
              <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg flex justify-between items-center text-xs">
                <span className="text-slate-500 text-[10px]">¿Desea descargar el Ticket Térmico en formato PDF?</span>
                <button
                  onClick={() => {
                    const doc = generateTicketDocument(lastSaleContext);
                    doc.save(`TICKET_${lastSaleContext.sale.tipo_comprobante === 'Factura' ? 'FA' : 'BO'}_${lastSaleContext.sale.serie_comprobante}-${lastSaleContext.sale.numero_comprobante}.pdf`);
                  }}
                  className="text-[10px] font-bold text-slate-700 hover:text-indigo-600 flex items-center gap-1 hover:underline"
                >
                  Descargar Ticket PDF
                </button>
              </div>

              {/* BUTTON 3: ENVÍO DIGITAL (WHATSAPP / CORREO) */}
              <div className="border border-slate-150 rounded-xl overflow-hidden">
                <button
                  onClick={() => {
                    setShareDialogExpanded(!shareDialogExpanded);
                    setShareToast('');
                    // Autofill if client has details
                    if (lastSaleContext.client?.email) {
                      setShareInput(lastSaleContext.client.email);
                      setShareChannel('email');
                    } else {
                      setShareInput('');
                    }
                  }}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Enviar Comprobante Digital</span>
                      <span className="text-[9.5px] text-slate-400 block mt-0.5">Enviar por WhatsApp o Correo electrónico</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 hover:underline">
                    {shareDialogExpanded ? 'Ocultar' : 'Configurar'}
                  </span>
                </button>

                {shareDialogExpanded && (
                  <div className="p-4 bg-white border-t border-slate-150 space-y-3.5 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShareChannel('whatsapp');
                          setShareInput('');
                          setShareToast('');
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-[10.5px] border cursor-pointer text-center transition-all ${
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
                          setShareInput(lastSaleContext.client?.email || '');
                          setShareToast('');
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-[10.5px] border cursor-pointer text-center transition-all ${
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
                        placeholder={shareChannel === 'email' ? 'ejemplo@boticacorreo.com' : 'Ej: 994851203'}
                        value={shareInput}
                        onChange={(e) => setShareInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!shareInput.trim()) {
                            setShareToast('Por favor, complete el campo de contacto.');
                            return;
                          }
                          const docLabel = `${lastSaleContext.sale.serie_comprobante}-${lastSaleContext.sale.numero_comprobante}`;
                          if (shareChannel === 'whatsapp') {
                            // Sanitized number digits only
                            const numeric = shareInput.replace(/\D/g, '');
                            const templateMessage = encodeURIComponent(`Estimado cliente de Botica Enterprise, le enviamos el comprobante digital ${lastSaleContext.sale.tipo_comprobante} N° ${docLabel} por un total de S/ ${lastSaleContext.sale.total.toFixed(2)}. Puede descargarlo en formato digital aquí: https://firmado-ose.sunat.gob.pe/consulta/${lastSaleContext.sale.hash_sunat}`);
                            const targetUrl = `https://wa.me/${numeric.startsWith('51') ? '' : '51'}${numeric}?text=${templateMessage}`;
                            window.open(targetUrl, '_blank');
                            setShareToast(`¡Abriendo chat de WhatsApp para enviar el comprobante ${docLabel}!`);
                          } else {
                            // Simulated email dispatch
                            setShareToast(`✔ ¡Enlace de descarga del comprobante ${docLabel} enviado exitosamente al correo ${shareInput}!`);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs"
                      >
                        Enviar Enlace
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
                )}
              </div>
            </div>

            {/* Footer control */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setShowPrintModal(false)}
                className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-900 border border-slate-950 text-white font-bold rounded-lg text-xs"
              >
                Terminar Venta & Volver al POS
              </button>
            </div>
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
