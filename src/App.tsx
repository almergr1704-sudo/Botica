import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Pill, CalendarClock, BookUser, Layers, ShieldCheck, ClipboardList, Users, History, ChevronLeft, ChevronRight, Menu, X, Moon, Sun, LogOut, Key } from 'lucide-react';
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
import ForcePasswordChange from './components/ForcePasswordChange';
import LoginScreen from './components/LoginScreen';
import UserProfileModal from './components/UserProfileModal';
import { logSecurityAction, hashPassword, verifyPassword, mustChangePassword, isTemporaryPassword } from './utils/security';
import { simulateExternalWrite } from './utils/concurrencyHelper';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'pos' | 'products' | 'lots' | 'contacts' | 'architecture' | 'kardex' | 'sunat_control' | 'users' | 'sales_history'>('overview');

  // Sidebar collapsible and Dark mode states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('erp_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('erp_dark_mode');
    return saved ? JSON.parse(saved) : true; // Default to true (Dark Mode) as requested by user
  });

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
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Concurrency and Multi-user Simulation Engine States
  const [concurrencySimEnabled, setConcurrencySimEnabled] = useState(true);
  const [simToasts, setSimToasts] = useState<{ id: string; message: string; type: string }[]>([]);

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
      // Enrich old users with missing email / require_password parameters
      const enrichedUsers = parsedUsers.map((u: Usuario) => {
        const matchingInitial = INITIAL_USUARIOS.find(init => init.username === u.username);
        const isPrimaryAdmin = u.username.toLowerCase() === 'admin';
        const hasTempPassword = (u.password === 'AdminPassword123!' || u.password === 'admin' || isTemporaryPassword(u.password || '', u.username));
        if (matchingInitial) {
          return {
            ...matchingInitial,
            ...u,
            email: u.email || matchingInitial.email,
            password: (u.password === 'AdminPassword123!' || u.password === 'admin') ? 'admin' : u.password,
            requiere_cambio_password: hasTempPassword ? true : u.requiere_cambio_password,
            must_change_password: hasTempPassword ? true : (u.must_change_password !== undefined ? u.must_change_password : u.requiere_cambio_password),
            password_changed: hasTempPassword ? false : (u.password_changed !== undefined ? u.password_changed : !u.requiere_cambio_password),
            activo: isPrimaryAdmin ? true : u.activo,
            estado_registro: isPrimaryAdmin ? undefined : u.estado_registro
          };
        }
        if (isPrimaryAdmin) {
          return {
            ...u,
            password: (u.password === 'AdminPassword123!' || u.password === 'admin') ? 'admin' : u.password,
            requiere_cambio_password: hasTempPassword ? true : u.requiere_cambio_password,
            must_change_password: hasTempPassword ? true : (u.must_change_password !== undefined ? u.must_change_password : u.requiere_cambio_password),
            password_changed: hasTempPassword ? false : (u.password_changed !== undefined ? u.password_changed : !u.requiere_cambio_password),
            activo: true,
            estado_registro: undefined
          };
        }
        return {
          ...u,
          must_change_password: hasTempPassword ? true : (u.must_change_password !== undefined ? u.must_change_password : u.requiere_cambio_password),
          password_changed: hasTempPassword ? false : (u.password_changed !== undefined ? u.password_changed : !u.requiere_cambio_password),
        };
      });

      // Ensure that 'admin' is definitely in the list and active
      const hasAdmin = enrichedUsers.some((u: Usuario) => u.username.toLowerCase() === 'admin');
      if (!hasAdmin) {
        const initialAdmin = INITIAL_USUARIOS.find(init => init.username === 'admin');
        if (initialAdmin) {
          enrichedUsers.unshift({
            ...initialAdmin,
            activo: true
          });
        }
      }

      setUsers(enrichedUsers);
      localStorage.setItem('erp_users', JSON.stringify(enrichedUsers));
      // Auto-update standard logged-in user state just in case status changed
      if (currentUser) {
        const currentExists = enrichedUsers.find((u: Usuario) => u.id === currentUser.id);
        if (currentExists) {
          setCurrentUser(currentExists);
        }
      }
    }
    else {
      // Force admin to be active in initial users list
      const forcedInitial = INITIAL_USUARIOS.map((u: Usuario) => {
        if (u.username.toLowerCase() === 'admin') {
          return { ...u, activo: true, estado_registro: undefined };
        }
        return u;
      });
      setUsers(forcedInitial);
      localStorage.setItem('erp_users', JSON.stringify(forcedInitial));
    }
  }, []);

  // Restore active session on mount
  useEffect(() => {
    const token = localStorage.getItem('sigifar_session_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        } else {
          // Token expired or invalid, clear it
          localStorage.removeItem('sigifar_session_token');
          setCurrentUser(null);
        }
      })
      .catch((err) => {
        console.error("Session verification failed:", err);
      });
    }
  }, []);

  // Sync state dynamically when storage changes or custom sync triggers
  useEffect(() => {
    const handleSync = () => {
      const localBranches = localStorage.getItem('erp_branches');
      const localProducts = localStorage.getItem('erp_products');
      const localLots = localStorage.getItem('erp_lots');
      const localClients = localStorage.getItem('erp_clients');
      const localSuppliers = localStorage.getItem('erp_suppliers');
      const localSales = localStorage.getItem('erp_sales');
      const localSalesDetails = localStorage.getItem('erp_sales_details');
      const localUsers = localStorage.getItem('erp_users');

      if (localBranches) setBranches(JSON.parse(localBranches));
      if (localProducts) setProducts(JSON.parse(localProducts));
      if (localLots) setLots(JSON.parse(localLots));
      if (localClients) setClients(JSON.parse(localClients));
      if (localSuppliers) setSuppliers(JSON.parse(localSuppliers));
      if (localSales) setSales(JSON.parse(localSales));
      if (localSalesDetails) setSalesDetails(JSON.parse(localSalesDetails));
      if (localUsers) {
        const parsedUsers = JSON.parse(localUsers);
        setUsers(parsedUsers);
        if (currentUser) {
          const currentExists = parsedUsers.find((u: Usuario) => u.id === currentUser.id);
          if (currentExists) {
            setCurrentUser(currentExists);
          }
        }
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('sync_erp_data', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('sync_erp_data', handleSync);
    };
  }, [currentUser]);

  // Background Multi-User Red Network Simulation Loop (Prompts Concurrency Events)
  useEffect(() => {
    if (!concurrencySimEnabled) return;

    const interval = setInterval(() => {
      const res = simulateExternalWrite();
      if (res) {
        const toastId = `toast-${Date.now()}`;
        const newToast = { id: toastId, message: res.message, type: res.type };
        setSimToasts(prev => [newToast, ...prev].slice(0, 4)); // keep last 4 toasts
        
        // Auto-dismiss after 7 seconds
        setTimeout(() => {
          setSimToasts(prev => prev.filter(t => t.id !== toastId));
        }, 7000);
      }
    }, 18000); // Trigger a concurrent simulation event every 18 seconds

    return () => clearInterval(interval);
  }, [concurrencySimEnabled]);

  const triggerManualSimulation = () => {
    const res = simulateExternalWrite();
    if (res) {
      const toastId = `toast-${Date.now()}`;
      const newToast = { id: toastId, message: res.message, type: res.type };
      setSimToasts(prev => [newToast, ...prev].slice(0, 4));
      setTimeout(() => {
        setSimToasts(prev => prev.filter(t => t.id !== toastId));
      }, 7000);
    }
  };

  // Theme support & sidebar sync hooks
  useEffect(() => {
    localStorage.setItem('erp_dark_mode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('erp_sidebar_collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Access control constraint: Forces Almacenero to valid routes if current user swaps
  useEffect(() => {
    if (currentUser && currentUser.rol === 'Almacenero') {
      const allowedTabsForAlmacenero = ['products', 'lots', 'kardex', 'contacts'];
      if (!allowedTabsForAlmacenero.includes(activeTab)) {
        setActiveTab('kardex'); // default to Kardex & Compras block
      }
    }
  }, [currentUser, activeTab]);

  // Update helper functions to push changes to state and LocalStorage
  const handleAddUser = (newUser: Omit<Usuario, 'id'>) => {
    const updated = [
      ...users, 
      { 
        ...newUser, 
        requiere_cambio_password: true, 
        must_change_password: true,
        password_changed: false,
        id: `usr-${Date.now()}` 
      }
    ];
    setUsers(updated);
    localStorage.setItem('erp_users', JSON.stringify(updated));
  };

  const handleToggleUserStatus = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser && targetUser.username.toLowerCase() === 'admin') {
      alert('No se puede desactivar la cuenta del Administrador principal del sistema.');
      return;
    }
    const updated = users.map(u => u.id === userId ? { ...u, activo: !u.activo } : u);
    setUsers(updated);
    localStorage.setItem('erp_users', JSON.stringify(updated));
    
    // If the currently simulated user is toggled inactive, auto-rollback active session to Admin to simulate safe override
    if (targetUser && !targetUser.activo && currentUser && currentUser.id === userId) {
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

  const logAction = (moduleName: string, actionType: 'MODIFICACION_PRECIO' | 'ACCION_ELIMINAR' | 'ALTERACION_STOCK' | 'OTRO', detail: string) => {
    const saved = localStorage.getItem('erp_audit_logs');
    let currentLogs = [];
    if (saved) {
      try {
        currentLogs = JSON.parse(saved);
      } catch (e) {}
    }
    const dateNow = new Date();
    const formattedDate = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}-${String(dateNow.getDate()).padStart(2, '0')} ${dateNow.toLocaleTimeString('es-PE')}`;
    
    const newLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      id_usuario: currentUser?.id || 'usr-01',
      usuario_nombre: currentUser ? `${currentUser.nombre} (${currentUser.rol})` : 'Arq. Luis Alejandro (Admin)',
      modulo: moduleName,
      accion: actionType,
      detalle: detail,
      fecha: formattedDate,
      ip_dispositivo: '192.168.1.25 (Petición de Edición)'
    };
    
    const updated = [newLog, ...currentLogs];
    localStorage.setItem('erp_audit_logs', JSON.stringify(updated));
  };

  const handleUpdateLotStock = (loteId: string, newStock: number) => {
    const lot = lots.find(l => l.id === loteId);
    const updated = lots.map(l => (l.id === loteId ? { ...l, stock: newStock } : l));
    setLots(updated);
    localStorage.setItem('erp_lots', JSON.stringify(updated));
    logAction('LOTES_ALMACEN', 'ALTERACION_STOCK', `Ajuste manual de stock para Lote [${lot?.numero_lote || loteId}]. Nuevo stock: ${newStock}`);
  };

  const handleUpdateLotPrice = (loteId: string, newPrice: number) => {
    const lot = lots.find(l => l.id === loteId);
    const updated = lots.map(l => (l.id === loteId ? { ...l, precio_venta: newPrice } : l));
    setLots(updated);
    localStorage.setItem('erp_lots', JSON.stringify(updated));
    logAction('LOTES_ALMACEN', 'MODIFICACION_PRECIO', `Modificación de precio para Lote [${lot?.numero_lote || loteId}]. Nuevo precio: S/ ${newPrice.toFixed(2)}`);
  };

  const handleUpdateLot = (updatedLot: Lote) => {
    const currentVersion = (updatedLot as any).version ?? 1;
    const withVersion = {
      ...updatedLot,
      version: currentVersion + 1,
      last_updated_by: currentUser?.nombre || 'Personal del Sistema',
      last_updated_at: new Date().toISOString()
    };
    const updated = lots.map(l => l.id === updatedLot.id ? withVersion : l);
    setLots(updated);
    localStorage.setItem('erp_lots', JSON.stringify(updated));
    logAction('LOTES_ALMACEN', 'ALTERACION_STOCK', `Lote [${updatedLot.numero_lote}] modificado en almacén (Stock actual: ${updatedLot.stock}, PV: S/ ${updatedLot.precio_venta.toFixed(2)}).`);
  };

  const handleUpdateProduct = (updatedProd: Producto) => {
    const currentVersion = (updatedProd as any).version ?? 1;
    const withVersion = {
      ...updatedProd,
      version: currentVersion + 1,
      last_updated_by: currentUser?.nombre || 'Personal del Sistema',
      last_updated_at: new Date().toISOString()
    };
    const updated = products.map(p => p.id === updatedProd.id ? withVersion : p);
    setProducts(updated);
    localStorage.setItem('erp_products', JSON.stringify(updated));
    logAction('PRODUCTOS', 'OTRO', `Datos de producto [${updatedProd.nombre}] actualizados en catálogo.`);
  };

  const handleDeleteProduct = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    const hasLots = lots.some(l => l.id_producto === prodId && l.estado_registro !== 'eliminado_logico');
    const hasSales = salesDetails.some(sd => sd.id_producto === prodId);

    // ALWAYS Soft Delete
    const updated = products.map(p => p.id === prodId ? { ...p, activo: false, estado_registro: 'eliminado_logico' as const } : p);
    setProducts(updated);
    localStorage.setItem('erp_products', JSON.stringify(updated));
    logAction('PRODUCTOS', 'ACCION_ELIMINAR', `Borrado lógico aplicado al producto: [${prod.nombre}] due to security directive.`);
    
    if (hasLots || hasSales) {
      alert(`[DIRECTIVA DE CONTROL DE DATOS - PAPELERA LÓGICA]
El producto "${prod.nombre}" cuenta con historial operativo (lotes o registros de ventas).
En cumplimiento con las normas, se ha procedido con un Borrado Lógico (Soft Delete).
El producto ha sido inactivado para futuras operaciones preservando su integridad histórica.`);
    } else {
      alert(`[DIRECTIVA DE CONTROL DE DATOS - PAPELERA LÓGICA]
El producto "${prod.nombre}" ha sido movido a la papelera lógica de DIGEMID/SUNAT.`);
    }
  };

  const handleUpdateBranch = (updatedBranch: Sucursal) => {
    const updated = branches.map(b => b.id === updatedBranch.id ? updatedBranch : b);
    setBranches(updated);
    localStorage.setItem('erp_branches', JSON.stringify(updated));
    logAction('SUCURSALES', 'OTRO', `Establecimiento [${updatedBranch.nombre}] modificado en catálogo.`);
  };

  const handleDeleteBranch = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;

    // ALWAYS Soft Delete
    const updated = branches.map(b => b.id === branchId ? { ...b, estado_registro: 'eliminado_logico' as const } : b);
    setBranches(updated);
    localStorage.setItem('erp_branches', JSON.stringify(updated));
    logAction('SUCURSALES', 'ACCION_ELIMINAR', `Baja de establecimiento (Soft Delete): ${branch.nombre}.`);
    alert(`[DIRECTIVA DE CONTROL DE DATOS - PAPELERA LÓGICA] El establecimiento "${branch.nombre}" ha sido dado de baja lógica en el padrón tributario de SUNAT.`);
  };

  const handleUpdateClient = (updatedClient: Cliente) => {
    const currentVersion = (updatedClient as any).version ?? 1;
    const withVersion = {
      ...updatedClient,
      version: currentVersion + 1,
      last_updated_by: currentUser?.nombre || 'Personal del Sistema',
      last_updated_at: new Date().toISOString()
    };
    const updated = clients.map(c => c.id === updatedClient.id ? withVersion : c);
    setClients(updated);
    localStorage.setItem('erp_clients', JSON.stringify(updated));
    logAction('CLIENTES', 'OTRO', `Cliente fiscal [${updatedClient.nombre_razon_social}] modificado en padrón.`);
  };

  const handleDeleteClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    if (clientId === 'cli-default') {
      alert('El cliente "Público en General" es requerido para las ventas anónimas del POS.');
      return;
    }

    const hasSales = sales.some(s => s.id_cliente === clientId);

    // ALWAYS Soft Delete
    const updated = clients.map(c => c.id === clientId ? { ...c, estado_registro: 'eliminado_logico' as const } : c);
    setClients(updated);
    localStorage.setItem('erp_clients', JSON.stringify(updated));
    logAction('CLIENTES', 'ACCION_ELIMINAR', `Baja de cliente (Soft Delete): ${client.nombre_razon_social}.`);
    
    if (hasSales) {
      alert(`[DIRECTIVA DE CONTROL DE DATOS - PAPELERA LÓGICA]
El cliente "${client.nombre_razon_social}" cuenta con comprobantes de pago asociados (Boletas o Facturas).
En cumplimiento con las normas tributarias de la SUNAT, se ha procedido con un Borrado Lógico (Soft Delete).
El registro se inactivó de listados operativos pero permanece auditable.`);
    } else {
      alert(`[DIRECTIVA DE CONTROL DE DATOS - PAPELERA LÓGICA] El cliente "${client.nombre_razon_social}" ha sido dado de baja lógicamente en el padrón del sistema.`);
    }
  };

  const handleUpdateSupplier = (updatedSupplier: Proveedor) => {
    const currentVersion = (updatedSupplier as any).version ?? 1;
    const withVersion = {
      ...updatedSupplier,
      version: currentVersion + 1,
      last_updated_by: currentUser?.nombre || 'Personal del Sistema',
      last_updated_at: new Date().toISOString()
    };
    const updated = suppliers.map(s => s.id === updatedSupplier.id ? withVersion : s);
    setSuppliers(updated);
    localStorage.setItem('erp_suppliers', JSON.stringify(updated));
    logAction('PROVEEDORES', 'OTRO', `Distribuidor/Laboratorio [${updatedSupplier.razon_social}] modificado en el padrón.`);
  };

  const handleDeleteSupplier = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    const hasLots = lots.some(l => l.id_proveedor === supplierId);

    // ALWAYS Soft Delete
    const updated = suppliers.map(s => s.id === supplierId ? { ...s, estado_registro: 'eliminado_logico' as const } : s);
    setSuppliers(updated);
    localStorage.setItem('erp_suppliers', JSON.stringify(updated));
    logAction('PROVEEDORES', 'ACCION_ELIMINAR', `Baja de proveedor (Soft Delete): ${supplier.razon_social}.`);
    
    if (hasLots) {
      alert(`[DIRECTIVA DE CONTROL DE DATOS - PAPELERA LÓGICA]
Operación completada lógicamente. Dado que el proveedor "${supplier.razon_social}" posee lotes ingresados en el Kardex de compras, se aplica un Borrado Lógico de conservación.`);
    } else {
      alert(`[DIRECTIVA DE CONTROL DE DATOS - PAPELERA LÓGICA] El proveedor "${supplier.razon_social}" ha sido dado de baja lógicamente.`);
    }
  };

  const handleUpdateUser = (updatedUser: Usuario) => {
    const currentVersion = (updatedUser as any).version ?? 1;
    const withVersion = {
      ...updatedUser,
      version: currentVersion + 1,
      last_updated_by: currentUser?.nombre || 'Personal del Sistema',
      last_updated_at: new Date().toISOString()
    };
    const updated = users.map(u => u.id === updatedUser.id ? withVersion : u);
    setUsers(updated);
    localStorage.setItem('erp_users', JSON.stringify(updated));
    logAction('USUARIOS', 'OTRO', `Ficha laboral para [${updatedUser.username}] modificada.`);
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(withVersion);
    }
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (user.username.toLowerCase() === 'admin') {
      alert('No se puede dar de baja o eliminar la cuenta del Administrador principal del sistema.');
      return;
    }

    if (currentUser && currentUser.id === userId) {
      alert('No puedes depurar o revocar tu propia cuenta activa de sesión.');
      return;
    }

    const hasSales = sales.some(s => s.id_usuario === userId);

    // ALWAYS Soft Delete
    const updated = users.map(u => u.id === userId ? { ...u, activo: false, estado_registro: 'eliminado_logico' as const } : u);
    setUsers(updated);
    localStorage.setItem('erp_users', JSON.stringify(updated));
    logAction('USUARIOS', 'ACCION_ELIMINAR', `Baja de empleado laboral (Soft Delete): ${user.username}.`);
    
    if (hasSales) {
      alert(`[DIRECTIVA DE CONTROL DE DATOS - PAPELERA LÓGICA]
El usuario "${user.username}" cuenta con firma operativa en comprobantes SUNAT y flujos de caja.
En cumplimiento con las normas, se ha procedido con un Borrado Lógico (Soft Delete).
Sus credenciales de acceso se han desactivado pero sus trazas de auditoría fiscal quedan guardadas.`);
    } else {
      alert(`[DIRECTIVA DE CONTROL DE DATOS - PAPELERA LÓGICA] El empleado "${user.username}" ha sido inactivado y dado de baja lógicamente.`);
    }
  };

  const handleEmitCreditNote = (originalSaleId: string, motivoText: string) => {
    const originalSale = sales.find(s => s.id === originalSaleId);
    if (!originalSale) return;

    const prefix = originalSale.tipo_comprobante === 'Factura' ? 'F' : 'B';
    const numNC = String(sales.filter(s => s.tipo_comprobante === 'NotaCredito' && s.serie_comprobante.startsWith(`${prefix}C`)).length + 1).padStart(6, '0');
    const serieNC = `${prefix}C01`; // SUNAT Nota de Crédito Series formats e.g. FC01, BC01

    const dateNow = new Date();
    const formattedDate = `${String(dateNow.getDate()).padStart(2, '0')}/${String(dateNow.getMonth() + 1).padStart(2, '0')}/${dateNow.getFullYear()} ${dateNow.toLocaleTimeString('es-PE')}`;
    const hashNc = btoa(`SUNAT_XML_NC_${serieNC}_${numNC}`).slice(0, 32).toUpperCase();

    const creditNote: Venta = {
      id: `sale-nc-${Date.now()}`,
      id_sucursal: originalSale.id_sucursal,
      id_usuario: currentUser?.id || originalSale.id_usuario,
      id_cliente: originalSale.id_cliente,
      tipo_comprobante: 'NotaCredito',
      serie_comprobante: serieNC,
      numero_comprobante: numNC,
      fecha_emision: formattedDate,
      subtotal: originalSale.subtotal,
      igv: originalSale.igv,
      total: originalSale.total,
      hash_sunat: hashNc,
      estado_sunat: 'Aceptado',
      id_venta_referencia: originalSaleId,
      motivo_anulacion: motivoText,
      estado: 'Valido'
    };

    // Update original sale status flag to "Anulado" without deleting or editing forbidden fields
    const updatedSales = sales.map(s => {
      if (s.id === originalSaleId) {
        return { ...s, estado: 'Anulado' as const };
      }
      return s;
    });

    const finalSales = [...updatedSales, creditNote];
    setSales(finalSales);
    localStorage.setItem('erp_sales', JSON.stringify(finalSales));

    // Map sales details matching the original invoice to the Credit Note
    const origDetails = salesDetails.filter(sd => sd.id_venta === originalSaleId);
    const ncDetails: DetalleVenta[] = origDetails.map((od, index) => ({
      ...od,
      id: `det-nc-${Date.now()}-${index}`,
      id_venta: creditNote.id
    }));

    const finalDetails = [...salesDetails, ...ncDetails];
    setSalesDetails(finalDetails);
    localStorage.setItem('erp_sales_details', JSON.stringify(finalDetails));

    // Return stock back to original medicine lots
    const updatedLots = lots.map(l => {
      const match = origDetails.find(od => od.id_lote === l.id);
      if (match) {
        return { ...l, stock: l.stock + match.cantidad };
      }
      return l;
    });
    setLots(updatedLots);
    localStorage.setItem('erp_lots', JSON.stringify(updatedLots));

    // Log this operation into the immutable Kardex / Audit History log
    logAction(
      'VENTAS', 
      'OTRO', 
      `Emisión de Nota de Crédito ${serieNC}-${numNC} para anular Comprobante ${originalSale.serie_comprobante}-${originalSale.numero_comprobante}. Motivo: ${motivoText}. Reintegración de stock operada.`
    );

    alert(`[SUNAT - NOTA DE CRÉDITO EMITIDA]
Comprobante original ${originalSale.serie_comprobante}-${originalSale.numero_comprobante} anulado con éxito en el sistema.
Nota de Crédito correlativa ${serieNC}-${numNC} ha sido compilada y cargada al entorno SUNAT de Auditoría.
Se ha retornado la cantidad vendida a sus respectivos lotes de origen.`);
  };

  const navigationItems = [
    { id: 'overview', label: 'Tableros', icon: LayoutDashboard, color: 'text-blue-500' },
    { id: 'pos', label: 'Caja POS', icon: ShoppingBag, color: 'text-emerald-500' },
    { id: 'products', label: 'Catálogo', icon: Pill, color: 'text-indigo-500', extraClass: 'rotate-45' },
    { id: 'lots', label: 'Lotes / DIGEMID', icon: CalendarClock, color: 'text-amber-500' },
    { id: 'kardex', label: 'Kardex & Compras', icon: ClipboardList, color: 'text-rose-500' },
    { id: 'contacts', label: 'Directorios', icon: BookUser, color: 'text-purple-500' },
    { id: 'users', label: 'Personal & Accesos', icon: Users, color: 'text-teal-500' },
    { id: 'architecture', label: 'Arquitectura Base', icon: Layers, color: 'text-sky-505' },
    { id: 'sunat_control', label: 'SUNAT & Auditoría', icon: ShieldCheck, color: 'text-emerald-500' },
    { id: 'sales_history', label: 'Historial Ventas', icon: History, color: 'text-violet-500' },
  ] as const;

  const filteredNavigationItems = navigationItems.filter(item => {
    if (currentUser?.rol === 'Almacenero') {
      return ['products', 'lots', 'kardex', 'contacts'].includes(item.id);
    }
    return true;
  });

  const handleLogout = () => {
    if (currentUser) {
      logSecurityAction(currentUser.id, `${currentUser.nombre} (${currentUser.rol})`, 'Cierre de sesión finalizado completamente y redirigido al formulario de acceso.');
    }
    localStorage.removeItem('sigifar_session_token');
    setCurrentUser(null);
    setActiveTab('overview');
  };

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        <LoginScreen 
          users={users} 
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setActiveTab('overview');
          }} 
          darkMode={darkMode}
        />
      </div>
    );
  }

  if (currentUser && mustChangePassword(currentUser)) {
    // If the state flags are desynced, align them to enforce absolute block
    if (!currentUser.requiere_cambio_password || !currentUser.must_change_password || currentUser.password_changed !== false) {
      currentUser.requiere_cambio_password = true;
      currentUser.must_change_password = true;
      currentUser.password_changed = false;
    }

    return (
      <div className={`min-h-screen flex justify-center items-center p-4 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        <ForcePasswordChange
          currentUser={currentUser}
          onPasswordChanged={(newPassword, currentPassword) => {
            const token = localStorage.getItem('sigifar_session_token');
            if (!token) {
              alert('Error: No se ha iniciado una sesión de autenticación restringida.');
              return;
            }

            fetch('/api/auth/change-password', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ currentPassword, newPassword })
            })
            .then(async (res) => {
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data.message || 'Error al cambiar contraseña');
              }

              // Success! Store the new unrestricted token and updated user details
              localStorage.setItem('sigifar_session_token', data.token);
              
              // Apply update to users state in React and LocalStorage
              handleUpdateUser(data.user);

              logSecurityAction(data.user.id, `${data.user.nombre} (${data.user.rol})`, 'Cambio obligatorio de contraseña por primer inicio de sesión completado con éxito.');
              setActiveTab('overview');
            })
            .catch((err) => {
              logSecurityAction(currentUser.id, `${currentUser.nombre} (${currentUser.rol})`, 'RECHAZO DE SEGURIDAD BACKEND: Intento de evadir o registrar una contraseña insegura.');
              alert(`Error de Seguridad: ${err.message}`);
            });
          }}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Automatic implicit SELECT filtering of soft-deleted entries per regulatory protocol
  const activeProducts = products.filter(p => p.estado_registro !== 'eliminado_logico');
  const activeLots = lots.filter(l => l.estado_registro !== 'eliminado_logico');
  const activeBranches = branches.filter(b => b.estado_registro !== 'eliminado_logico');
  const activeClients = clients.filter(c => c.estado_registro !== 'eliminado_logico');
  const activeSuppliers = suppliers.filter(s => s.estado_registro !== 'eliminado_logico');
  const activeUsers = users.filter(u => u.estado_registro !== 'eliminado_logico');
  const activeSales = sales.filter(s => s.estado_registro !== 'eliminado_logico');

  return (
    <div className={`min-h-screen flex w-full ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} font-sans antialiased transition-colors duration-200 overflow-x-hidden`}>
      
      {/* 1. SIDEBAR VERTICAL ADAPTABLE (IZQUIERDA) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-xl lg:shadow-none lg:static ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } ${sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Cabecera Sidebar (Logo + Título) */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/30">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-md shadow-blue-500/20 shrink-0">
              <Pill className="w-5 h-5 rotate-45" />
            </div>
            {!sidebarCollapsed && (
              <div className="animate-in fade-in duration-200">
                <span className="font-extrabold text-[15px] text-slate-900 dark:text-white tracking-tight block">
                  SigiFar Perú
                </span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block -mt-1 font-mono">
                  v1.2-Enterprise
                </span>
              </div>
            )}
          </div>
          
          {/* Botón Cerrar en Móvil */}
          <button 
            onClick={() => setSidebarMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Listado de Módulos (Navegación Vertical) */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {filteredNavigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarMobileOpen(false); // Auto close on mobile click
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer group ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-xs border border-blue-100 dark:border-blue-900/30 font-extrabold' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 ${item.color} shrink-0 ${(item as any).extraClass || ''} ${isActive ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} />
                {!sidebarCollapsed && (
                  <span className="truncate text-left flex-1 animate-in fade-in duration-150">
                    {item.label}
                  </span>
                )}
                {isActive && !sidebarCollapsed && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer del Sidebar con botón de colapsar */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/20 space-y-1.5">
          {/* Botón de Perfil / Cambiar Clave en Sidebar */}
          <button
            onClick={() => {
              setIsProfileModalOpen(true);
              setSidebarMobileOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/25 rounded-lg cursor-pointer transition-all font-bold ${
              sidebarCollapsed ? 'justify-center' : 'text-xs'
            }`}
            title="Mi Perfil → Cambiar Contraseña"
          >
            <Key className="w-4 h-4 shrink-0 text-indigo-500" />
            {!sidebarCollapsed && <span>Mi Perfil & Claves</span>}
          </button>

          {/* Botón de Cerrar Sesión en Sidebar */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/25 rounded-lg cursor-pointer transition-all font-bold ${
              sidebarCollapsed ? 'justify-center' : 'text-xs'
            }`}
            title="Cerrar Sesión Activa"
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
            {!sidebarCollapsed && <span>Cerrar Sesión</span>}
          </button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-full items-center justify-center gap-2 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase transition-all">
                <ChevronLeft className="w-4 h-4" />
                <span>Contraer Menú</span>
              </div>
            )}
          </button>
          {sidebarCollapsed && (
            <div className="h-1 lg:hidden"></div>
          )}
        </div>
      </aside>

      {/* Sombra / Overlay de menú móvil */}
      {sidebarMobileOpen && (
        <div 
          onClick={() => setSidebarMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* 2. ÁREA DE CONTENIDO PRINCIPAL (DERECHA) */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        
        {/* BARRA SUPERIOR (HEADER) */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 sm:px-6 shadow-xs">
          
          <div className="flex items-center gap-3">
            {/* Botón Sandwich para Móviles */}
            <button
              onClick={() => setSidebarMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Título de Vista Activa */}
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
              {navigationItems.find(n => n.id === activeTab)?.label}
            </h1>

            {/* Servidor SUNAT Status */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[10.5px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">SUNAT Conexión Estable</span>
            </div>
          </div>

          {/* Configuración superior (Hora, Tema y Usuario) */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            
            {/* Hora oficial simulada */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Hora Oficial UTC-5</span>
              <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
                {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            {/* BOTÓN DYNAMIC INTERACTIVE DARK MODE SELECTOR */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              title={darkMode ? "Estilo Claro (Luz)" : "Estilo Oscuro (Noche)"}
            >
              {darkMode ? (
                <Sun className="w-4.5 h-4.5 text-amber-500 animate-bounce-slow" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-indigo-500" />
              )}
            </button>

            {/* Botón de Gestión de Claves (Mi Perfil) */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
              title="Mi Perfil → Cambiar Contraseña"
              id="header_change_password_btn"
            >
              <Key className="w-4 h-4 text-indigo-500" />
              <span className="hidden lg:inline text-[11px] font-bold">Mis Claves</span>
            </button>

            {/* Usuario Activo Badge */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
              <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 font-mono">
                {currentUser?.nombre ? currentUser.nombre.charAt(0) : 'U'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block -mb-0.5 leading-none font-bold">{currentUser?.rol}</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-none">{currentUser?.username}</span>
              </div>
            </div>

            {/* Botón de Cerrar Sesión en Header */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/35 rounded-lg cursor-pointer transition-colors"
              title="Cerrar Sesión Activa"
              id="header_logout_btn"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* 3. RENDER CENTRAL DE LOS MÓDULOS DE NEGOCIO */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-0">
          
          {/* 🔌 CONSOLA DE SIMULACIÓN DE CONCURRENCIA MULTI-USUARIO EXTRANET */}
          <div className="mb-6 bg-slate-900 dark:bg-slate-950 p-4 rounded-xl border border-blue-500/30 shadow-lg relative overflow-hidden text-slate-100">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${concurrencySimEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  <h3 className="text-xs font-black tracking-wider uppercase text-blue-400 font-mono">
                    Extranet & Concurrencia Simétrica Activa
                  </h3>
                </div>
                <p className="text-xs font-medium text-slate-300 max-w-2xl leading-relaxed">
                  Para probar los controles anti-sobreescritura: abra Editar en los módulos de 
                  <strong> Personal, Clientes</strong> o <strong>Productos</strong>, modifique un campo sin guardar, y pulse el botón 
                  <span className="text-blue-300"> "Simular Modificación Concurrente"</span> para simular que otro cajero en red guardó cambios antes que usted. Al guardar su edición local, ¡el sistema bloqueará la sobreescritura y abrirá la conciliación!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-lg border border-slate-700 select-none transition-colors">
                  <input 
                    type="checkbox" 
                    checked={concurrencySimEnabled} 
                    onChange={(e) => setConcurrencySimEnabled(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-700" 
                  />
                  <span className="text-[10px] font-bold uppercase font-mono tracking-tight">Auto-Simular (18s)</span>
                </label>

                <button
                  type="button"
                  onClick={triggerManualSimulation}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md hover:shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {/* Lightning or Sparkles icon simulation */}
                  <span>🔌 Simular Modificación Concurrente</span>
                </button>
              </div>
            </div>

            {/* Simulated Live Toasts inside the widget */}
            {simToasts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-850 space-y-2 animate-in fade-in duration-300">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest font-mono">Notificaciones de Escritura Externa:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {simToasts.map((toast) => (
                    <div 
                      key={toast.id} 
                      className="flex items-start gap-2 bg-slate-850 border border-indigo-500/10 p-2.5 rounded-lg text-[11px] text-slate-200 animate-in slide-in-from-top-1 duration-200"
                    >
                      <div className="p-1 bg-indigo-500/20 rounded text-indigo-400 shrink-0 font-mono text-[9px] font-bold uppercase">
                        {toast.type}
                      </div>
                      <div className="flex-1 font-medium italic">
                        {toast.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Alerta de conexión global discreta */}
          <div className="mb-4 flex sm:hidden items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px]">
            <span className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> SUNAT Conexión Estable (UBL 2.1)
            </span>
            <span className="text-slate-400 font-mono">{new Date().toLocaleDateString('es-PE')}</span>
          </div>

          {activeTab === 'overview' && (
            <DashboardOverview
              products={activeProducts}
              lots={activeLots}
              branches={activeBranches}
              sales={activeSales}
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
              branches={activeBranches}
              products={activeProducts}
              lots={activeLots}
              clients={activeClients}
              users={activeUsers}
              onAddSale={handleAddSale}
              onDeductStock={handleDeductStock}
              onAddClient={handleAddClient}
            />
          )}

          {activeTab === 'products' && (
            <ProductCatalog
              products={activeProducts}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {activeTab === 'lots' && (
            <LotManager
              lots={activeLots}
              products={activeProducts}
              branches={activeBranches}
              onAddLot={handleAddLot}
              onDeleteLot={handleDeleteLot}
              onClearExpired={handleClearExpired}
              onUpdateLot={handleUpdateLot}
            />
          )}

          {activeTab === 'contacts' && (
            <ClientSupplierManager
              branches={activeBranches}
              clients={activeClients}
              suppliers={activeSuppliers}
              onAddBranch={handleAddBranch}
              onAddClient={handleAddClient}
              onAddSupplier={handleAddSupplier}
              onUpdateBranch={handleUpdateBranch}
              onDeleteBranch={handleDeleteBranch}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
            />
          )}

          {activeTab === 'kardex' && (
            <KardexPurchases
              products={activeProducts}
              lots={activeLots}
              suppliers={activeSuppliers}
              branches={activeBranches}
              onAddLot={handleAddLot}
              onRefreshLots={() => {
                const localLots = localStorage.getItem('erp_lots');
                if (localLots) setLots(JSON.parse(localLots));
              }}
              onUpdateLots={(updated) => {
                setLots(updated);
                localStorage.setItem('erp_lots', JSON.stringify(updated));
              }}
            />
          )}

          {activeTab === 'architecture' && (
            <ArchitectureView />
          )}

          {activeTab === 'users' && (
            <UserManager
              branches={activeBranches}
              users={activeUsers}
              onAddUser={handleAddUser}
              onToggleUserStatus={handleToggleUserStatus}
              currentUser={currentUser}
              onSetCurrentUser={setCurrentUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
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
              onEmitCreditNote={handleEmitCreditNote}
            />
          )}
        </main>

        {/* PIE DE PÁGINA (TEMA E INDICADORES REGULATORIOS) */}
        <footer className="border-t border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs py-8 px-6 mt-auto">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5 text-left">
              <span className="text-slate-900 dark:text-white font-black text-sm tracking-tight flex items-center gap-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-blue-600" /> SigiFar ERP / POS Perú
              </span>
              <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-450">
                Solución inteligente de nivel corporativo para farmacias, droguerías y boticas independientes en el territorio peruano. Diseñado para blindar su empresa ante fiscalizaciones tributarias y sanitarias.
              </p>
            </div>
            
            <div className="space-y-1 text-[11px] text-left">
              <span className="text-slate-750 dark:text-slate-300 font-extrabold block">Cumplimiento Regulado Nacional:</span>
              <ul className="space-y-0.5 list-disc pl-4 text-slate-400 dark:text-slate-450">
                <li>Módulo de Lotes: Dirigido según directivas DIGEMID para Buenas Prácticas de Distribución y Transporte.</li>
                <li>Facturación Electrónica: Emisión homologada bajo estructura XML UBL v2.1 exigida por SUNAT.</li>
                <li>Protección y Trazabilidad del Medicamento Vencido.</li>
              </ul>
            </div>

            <div className="space-y-2 text-[11px] md:text-right text-left">
              <span className="text-slate-755 dark:text-slate-300 font-extrabold block">Autoridades Supervisoras</span>
              <div className="flex gap-2 justify-start md:justify-end flex-wrap">
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded">MINSA / DIGEMID</span>
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded">SUNAT</span>
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded">SUSALUD</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Generador de base de datos interactiva SQL - SigiFar Enterprise.</p>
            </div>
          </div>
        </footer>
      </div>

      {currentUser && (
        <UserProfileModal
          currentUser={currentUser}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onPasswordChanged={(updatedUser) => {
            const dateNow = new Date();
            const formattedDate = dateNow.toISOString();
            const withPasswordChanged = {
              ...updatedUser,
              password: hashPassword(updatedUser.password || ''), // Securely hash before saving
              fecha_cambio_password: formattedDate,
              requiere_cambio_password: false,
              must_change_password: false,
              password_changed: true
            };
            handleUpdateUser(withPasswordChanged);
            logSecurityAction(withPasswordChanged.id, `${withPasswordChanged.nombre} (${withPasswordChanged.rol})`, 'Cambio voluntario de contraseña realizado con éxito. Cerrando todas las sesiones por directivas de seguridad.');
            handleLogout();
          }}
        />
      )}
    </div>
  );
}
