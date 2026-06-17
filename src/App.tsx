import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Pill, CalendarClock, BookUser, Layers, ShieldCheck, ClipboardList, Users, History } from 'lucide-react';
import { Sucursal, Producto, Lote, Cliente, Proveedor, Usuario, Venta, DetalleVenta } from './types/pharmacy';
import { 
  INITIAL_SUCURSALES, 
  INITIAL_PRODUCTOS, 
  INITIAL_LOTES, 
  INITIAL_CLIENTES, 
  INITIAL_PROVEEDORES, 
  INITIAL_USUARIOS 
} from './data/mockData';

// Component imports
import DashboardOverview from './components/DashboardOverview';
import POSSystem from './components/POSSystem';
import ProductCatalog from './components/ProductCatalog';
import LotManager from './components/LotManager';
import ClientSupplierManager from './components/ClientSupplierManager';
import ArchitectureView from './components/ArchitectureView';
import KardexPurchases from './components/KardexPurchases';
import SunatAuditoriaDashboard from './components/SunatAuditoriaDashboard';
import UserManager from './components/UserManager';
import SalesHistory from './components/SalesHistory';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'pos' | 'products' | 'lots' | 'contacts' | 'architecture' | 'kardex' | 'sunat_control' | 'users' | 'sales_history'>('overview');

  // Database States loaded from LocalStorage or seed data
  const [branches, setBranches] = useState<Sucursal[]>([]);
  const [products, setProducts] = useState<Producto[]>([]);
  const [lots, setLots] = useState<Lote[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [suppliers, setSuppliers] = useState<Proveedor[]>([]);
  const [sales, setSales] = useState<Venta[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [salesDetails, setSalesDetails] = useState<DetalleVenta[]>([]);

  // Selected User Session (Simulated)
  const [currentUser, setCurrentUser] = useState<Usuario>(INITIAL_USUARIOS[0]);

  // Synchronize with LocalStorage
  useEffect(() => {
    const localBranches = localStorage.getItem('erp_branches');
    const localProducts = localStorage.getItem('erp_products');
    const localLots = localStorage.getItem('erp_lots');
    const localClients = localStorage.getItem('erp_clients');
    const localSuppliers = localStorage.getItem('erp_suppliers');
    const localSales = localStorage.getItem('erp_sales');
    const localSalesDetails = localStorage.getItem('erp_sales_details');
    const localUsers = localStorage.getItem('erp_users');

    if (localBranches) setBranches(JSON.parse(localBranches));
    else {
      setBranches(INITIAL_SUCURSALES);
      localStorage.setItem('erp_branches', JSON.stringify(INITIAL_SUCURSALES));
    }

    if (localProducts) setProducts(JSON.parse(localProducts));
    else {
      setProducts(INITIAL_PRODUCTOS);
      localStorage.setItem('erp_products', JSON.stringify(INITIAL_PRODUCTOS));
    }

    if (localLots) setLots(JSON.parse(localLots));
    else {
      setLots(INITIAL_LOTES);
      localStorage.setItem('erp_lots', JSON.stringify(INITIAL_LOTES));
    }

    if (localClients) setClients(JSON.parse(localClients));
    else {
      setClients(INITIAL_CLIENTES);
      localStorage.setItem('erp_clients', JSON.stringify(INITIAL_CLIENTES));
    }

    if (localSuppliers) setSuppliers(JSON.parse(localSuppliers));
    else {
      setSuppliers(INITIAL_PROVEEDORES);
      localStorage.setItem('erp_suppliers', JSON.stringify(INITIAL_PROVEEDORES));
    }

    if (localSales) setSales(JSON.parse(localSales));
    else {
      setSales([]);
    }

    if (localSalesDetails) setSalesDetails(JSON.parse(localSalesDetails));
    else {
      setSalesDetails([]);
    }

    if (localUsers) {
      const parsedUsers = JSON.parse(localUsers);
      setUsers(parsedUsers);
      // Auto-update standard logged-in user state just in case status changed
      const currentExists = parsedUsers.find((u: Usuario) => u.id === currentUser.id);
      if (currentExists) {
        setCurrentUser(currentExists);
      }
    }
    else {
      setUsers(INITIAL_USUARIOS);
      localStorage.setItem('erp_users', JSON.stringify(INITIAL_USUARIOS));
    }
  }, []);

  // Update helper functions to push changes to state and LocalStorage
  const handleAddUser = (newUser: Omit<Usuario, 'id'>) => {
    const updated = [...users, { ...newUser, id: `usr-${Date.now()}` }];
    setUsers(updated);
    localStorage.setItem('erp_users', JSON.stringify(updated));
  };

  const handleToggleUserStatus = (userId: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, activo: !u.activo } : u);
    setUsers(updated);
    localStorage.setItem('erp_users', JSON.stringify(updated));
    
    // If the currently simulated user is toggled inactive, auto-rollback active session to Admin to simulate safe override
    const targetUser = updated.find(u => u.id === userId);
    if (targetUser && !targetUser.activo && currentUser.id === userId) {
      const defaultAdmin = updated.find(u => u.rol === 'Administrador' && u.activo) || updated[0];
      setCurrentUser(defaultAdmin);
      alert(`La sesión activa para el usuario suspendido "${targetUser.username}" ha sido revocada por razones de seguridad de inicio de sesión.`);
    }
  };
  const handleAddProduct = (newProd: Omit<Producto, 'id'>) => {
    const updated = [...products, { ...newProd, id: `prod-${Date.now()}` }];
    setProducts(updated);
    localStorage.setItem('erp_products', JSON.stringify(updated));
  };

  const handleAddLot = (newLot: Omit<Lote, 'id'>) => {
    const updated = [...lots, { ...newLot, id: `lote-${Date.now()}` }];
    setLots(updated);
    localStorage.setItem('erp_lots', JSON.stringify(updated));
  };

  const handleDeleteLot = (lotId: string) => {
    const updated = lots.filter(l => l.id !== lotId);
    setLots(updated);
    localStorage.setItem('erp_lots', JSON.stringify(updated));
  };

  const handleAddBranch = (newBranch: Omit<Sucursal, 'id'>) => {
    const updated = [...branches, { ...newBranch, id: `suc-${Date.now()}` }];
    setBranches(updated);
    localStorage.setItem('erp_branches', JSON.stringify(updated));
  };

  const handleAddClient = (newClient: Omit<Cliente, 'id'>) => {
    const updated = [...clients, { ...newClient, id: `cli-${Date.now()}` }];
    setClients(updated);
    localStorage.setItem('erp_clients', JSON.stringify(updated));
  };

  const handleAddSupplier = (newSupplier: Omit<Proveedor, 'id'>) => {
    const updated = [...suppliers, { ...newSupplier, id: `prov-${Date.now()}` }];
    setSuppliers(updated);
    localStorage.setItem('erp_suppliers', JSON.stringify(updated));
  };

  const handleAddSale = (newSale: Venta, details: Omit<DetalleVenta, 'id' | 'id_venta'>[]) => {
    const updatedSales = [...sales, newSale];
    setSales(updatedSales);
    localStorage.setItem('erp_sales', JSON.stringify(updatedSales));

    const finalDetails: DetalleVenta[] = details.map((d, index) => ({
      ...d,
      id: `det-${Date.now()}-${index}`,
      id_venta: newSale.id
    }));
    const updatedDetails = [...salesDetails, ...finalDetails];
    setSalesDetails(updatedDetails);
    localStorage.setItem('erp_sales_details', JSON.stringify(updatedDetails));
  };

  // Deduce Lot Stock on purchase
  const handleDeductStock = (loteId: string, qty: number) => {
    const updated = lots.map(l => {
      if (l.id === loteId) {
        return { ...l, stock: Math.max(0, l.stock - qty) };
      }
      return l;
    });
    setLots(updated);
    localStorage.setItem('erp_lots', JSON.stringify(updated));
  };

  // DIGEMID disposal command action: removes/retires all expired drug stock instantly!
  const handleClearExpired = () => {
    const today = new Date();
    const healthyLots = lots.filter(l => new Date(l.fecha_vencimiento) >= today);
    setLots(healthyLots);
    localStorage.setItem('erp_lots', JSON.stringify(healthyLots));
  };

  const handleUpdateLotStock = (loteId: string, newStock: number) => {
    const updated = lots.map(l => (l.id === loteId ? { ...l, stock: newStock } : l));
    setLots(updated);
    localStorage.setItem('erp_lots', JSON.stringify(updated));
  };

  const handleUpdateLotPrice = (loteId: string, newPrice: number) => {
    const updated = lots.map(l => (l.id === loteId ? { ...l, precio_venta: newPrice } : l));
    setLots(updated);
    localStorage.setItem('erp_lots', JSON.stringify(updated));
  };

  const handleDeleteProduct = (prodId: string) => {
    const updated = products.filter(p => p.id !== prodId);
    setProducts(updated);
    localStorage.setItem('erp_products', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans">
      
      {/* BARRA DE ESTADO SUPERIOR CON INFORME FISCAL */}
      <div className="bg-slate-900 text-slate-300 text-[11px] px-6 py-2 flex flex-col sm:flex-row justify-between items-center border-b border-slate-800 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Servidor SUNAT: Conexión Estable (UBL 2.1)
          </span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline text-slate-400">Plataforma Homologada OSE N° 0451-2026</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-slate-400 font-mono">
            <span>Hora Oficial UTC-5:</span>
            <span className="text-white font-bold">{new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Usuario Activo:</span>
            <span className="text-blue-300 font-bold bg-slate-850 px-2 py-0.5 rounded border border-slate-800/80">{currentUser.nombre}</span>
          </div>
        </div>
      </div>

      {/* CABECERA PRINCIPAL DEL ERP */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo y título de la solución corporativa */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <Pill className="w-6 h-6 rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight font-sans">
                  SigiFar Perú
                </h1>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-150 rounded-full font-mono uppercase">
                  v1.2-Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Sofware ERP & POS de Gestión Farmacéutica Integral • DIGEMID & SUNAT
              </p>
            </div>
          </div>

          {/* Menú de Navegación ERP */}
          <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'overview' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-blue-600" />
              Tableros
            </button>

            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'pos' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              Caja POS
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'products' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Pill className="w-4 h-4 text-indigo-600 rotate-45" />
              Catálogo
            </button>

            <button
              onClick={() => setActiveTab('lots')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'lots' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CalendarClock className="w-4 h-4 text-amber-600" />
              Lotes / DIGEMID
            </button>

            <button
              onClick={() => setActiveTab('kardex')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'kardex' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-rose-600" />
              Kardex & Compras
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'contacts' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BookUser className="w-4 h-4 text-purple-600" />
              Directorios
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'users' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-500" />
              Personal & Accesos
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'architecture' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-sky-600" />
              Arquitectura Base
            </button>

            <button
              onClick={() => setActiveTab('sunat_control')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'sunat_control' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              SUNAT & Auditoría
            </button>

            <button
              onClick={() => setActiveTab('sales_history')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'sales_history' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
              id="tab-history-comprobantes"
            >
              <History className="w-4 h-4 text-violet-600" />
              Historial Comprobantes
            </button>
          </nav>

        </div>
      </header>

      {/* RENDER PRINCIPAL DE LOS MÓDULOS ACTIVOS */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {activeTab === 'overview' && (
          <DashboardOverview
            products={products}
            lots={lots}
            branches={branches}
            sales={sales}
            onNavigate={(tab) => {
              if (tab === 'pos') setActiveTab('pos');
              if (tab === 'lots') setActiveTab('lots');
              if (tab === 'products') setActiveTab('products');
              if (tab === 'clients_suppliers') setActiveTab('contacts');
              if (tab === 'architecture') setActiveTab('architecture');
            }}
            onClearExpired={handleClearExpired}
          />
        )}

        {activeTab === 'pos' && (
          <POSSystem
            branches={branches}
            products={products}
            lots={lots}
            clients={clients}
            users={INITIAL_USUARIOS}
            onAddSale={handleAddSale}
            onDeductStock={handleDeductStock}
          />
        )}

        {activeTab === 'products' && (
          <ProductCatalog
            products={products}
            onAddProduct={handleAddProduct}
          />
        )}

        {activeTab === 'lots' && (
          <LotManager
            lots={lots}
            products={products}
            branches={branches}
            onAddLot={handleAddLot}
            onDeleteLot={handleDeleteLot}
            onClearExpired={handleClearExpired}
          />
        )}

        {activeTab === 'contacts' && (
          <ClientSupplierManager
            branches={branches}
            clients={clients}
            suppliers={suppliers}
            onAddBranch={handleAddBranch}
            onAddClient={handleAddClient}
            onAddSupplier={handleAddSupplier}
          />
        )}

        {activeTab === 'kardex' && (
          <KardexPurchases
            products={products}
            lots={lots}
            suppliers={suppliers}
            branches={branches}
            onAddLot={handleAddLot}
            onRefreshLots={() => {
              const localLots = localStorage.getItem('erp_lots');
              if (localLots) setLots(JSON.parse(localLots));
            }}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureView />
        )}

        {activeTab === 'users' && (
          <UserManager
            branches={branches}
            users={users}
            onAddUser={handleAddUser}
            onToggleUserStatus={handleToggleUserStatus}
            currentUser={currentUser}
            onSetCurrentUser={setCurrentUser}
          />
        )}

        {activeTab === 'sunat_control' && (
          <SunatAuditoriaDashboard
            products={products}
            lots={lots}
            branches={branches}
            sales={sales}
            onUpdateLotStock={handleUpdateLotStock}
            onUpdateLotPrice={handleUpdateLotPrice}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === 'sales_history' && (
          <SalesHistory
            sales={sales}
            salesDetails={salesDetails}
            branches={branches}
            clients={clients}
            users={users}
            products={products}
          />
        )}
      </main>

      {/* PIE DE PÁGINA REGULATORIO */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-10 px-6 border-t border-slate-800 shrink-0 font-sans mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <span className="text-white font-extrabold text-sm tracking-tight flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-500" /> SigiFar ERP / POS Perú
            </span>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Solución inteligente de nivel corporativo para farmacias, droguerías y boticas independientes en el territorio peruano. Diseñado para blindar su empresa ante fiscalizaciones tributarias y sanitarias.
            </p>
          </div>
          
          <div className="space-y-1 text-[11px]">
            <span className="text-slate-200 font-extrabold block">Cumplimiento Regulado Nacional:</span>
            <ul className="space-y-1 list-disc pl-4 text-slate-400">
              <li>Módulo de Lotes: Dirigido según directivas DIGEMID para Buenas Prácticas de Distribución y Transporte.</li>
              <li>Facturación Electrónica: Emisión homologada bajo estructura XML UBL v2.1 exigida por SUNAT.</li>
              <li>Protección y Trazabilidad del Medicamento Vencido.</li>
            </ul>
          </div>

          <div className="space-y-2 text-[11px] md:text-right">
            <span className="text-slate-200 font-extrabold block">Autoridades Supervisoras</span>
            <div className="flex gap-2 justify-start md:justify-end flex-wrap">
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-bold rounded">MINSA / DIGEMID</span>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-bold rounded">SUNAT</span>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-bold rounded">SUSALUD</span>
            </div>
            <p className="text-[10px] text-slate-500">Generador de base de datos interactiva SQL - Parte 1 Proyecto Completo.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
