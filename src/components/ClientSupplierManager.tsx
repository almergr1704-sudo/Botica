import React, { useState } from 'react';
import { Plus, Search, Building, User, Users, ClipboardCheck, Network, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Cliente, Proveedor, Sucursal } from '../types/pharmacy';

interface ClientSupplierManagerProps {
  branches: Sucursal[];
  clients: Cliente[];
  suppliers: Proveedor[];
  onAddBranch: (branch: Omit<Sucursal, 'id'>) => void;
  onAddClient: (client: Omit<Cliente, 'id'>) => void;
  onAddSupplier: (supplier: Omit<Proveedor, 'id'>) => void;
  onUpdateBranch?: (branch: Sucursal) => void;
  onDeleteBranch?: (id: string) => void;
  onUpdateClient?: (client: Cliente) => void;
  onDeleteClient?: (id: string) => void;
  onUpdateSupplier?: (supplier: Proveedor) => void;
  onDeleteSupplier?: (id: string) => void;
}

export default function ClientSupplierManager({
  branches,
  clients,
  suppliers,
  onAddBranch,
  onAddClient,
  onAddSupplier,
  onUpdateBranch,
  onDeleteBranch,
  onUpdateClient,
  onDeleteClient,
  onUpdateSupplier,
  onDeleteSupplier
}: ClientSupplierManagerProps) {
  const [activeSegment, setActiveSegment] = useState<'branches' | 'clients' | 'suppliers'>('branches');
  const [searchTerm, setSearchTerm] = useState('');

  // Forms modals
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');

  // Branch Form
  const [bNo, setBNo] = useState('');
  const [bDir, setBDir] = useState('');
  const [bUbi, setBUbi] = useState('');
  const [bCiu, setBCiu] = useState('');
  const [bTel, setBTel] = useState('');

  // Client Form
  const [cDocType, setCDocType] = useState<'DNI' | 'RUC'>('DNI');
  const [cDocNo, setCDocNo] = useState('');
  const [cName, setCName] = useState('');
  const [cDir, setCDir] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [apiSuccessMsg, setApiSuccessMsg] = useState('');

  // Supplier Form
  const [sRuc, setSRuc] = useState('');
  const [sSocial, setSSocial] = useState('');
  const [sDir, setSDir] = useState('');
  const [sTel, setSTel] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sContact, setSContact] = useState('');

  // Branch edit / delete states
  const [editingBranch, setEditingBranch] = useState<Sucursal | null>(null);
  const [showEditBranchModal, setShowEditBranchModal] = useState(false);
  const [ebNo, setEbNo] = useState('');
  const [ebDir, setEbDir] = useState('');
  const [ebUbi, setEbUbi] = useState('');
  const [ebCiu, setEbCiu] = useState('');
  const [ebTel, setEbTel] = useState('');
  const [ebError, setEbError] = useState('');
  const [deletingBranch, setDeletingBranch] = useState<Sucursal | null>(null);
  const [showDeleteBranchConfirm, setShowDeleteBranchConfirm] = useState(false);

  // Client edit / delete states
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [ecDocType, setEcDocType] = useState<'DNI' | 'RUC'>('DNI');
  const [ecDocNo, setEcDocNo] = useState('');
  const [ecName, setEcName] = useState('');
  const [ecDir, setEcDir] = useState('');
  const [ecEmail, setEcEmail] = useState('');
  const [ecError, setEcError] = useState('');
  const [deletingClient, setDeletingClient] = useState<Cliente | null>(null);
  const [showDeleteClientConfirm, setShowDeleteClientConfirm] = useState(false);

  // Supplier edit / delete states
  const [editingSupplier, setEditingSupplier] = useState<Proveedor | null>(null);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [esRuc, setEsRuc] = useState('');
  const [esSocial, setEsSocial] = useState('');
  const [esDir, setEsDir] = useState('');
  const [esTel, setEsTel] = useState('');
  const [esEmail, setEsEmail] = useState('');
  const [esContact, setEsContact] = useState('');
  const [esError, setEsError] = useState('');
  const [deletingSupplier, setDeletingSupplier] = useState<Proveedor | null>(null);
  const [showDeleteSupplierConfirm, setShowDeleteSupplierConfirm] = useState(false);

  const [clientConflict, setClientConflict] = useState<{ local: Cliente; server: Cliente } | null>(null);
  const [supplierConflict, setSupplierConflict] = useState<{ local: Proveedor; server: Proveedor } | null>(null);

  // Branch helper execution
  const handleStartEditBranch = (b: Sucursal) => {
    setEditingBranch(b);
    setEbNo(b.nombre);
    setEbDir(b.direccion);
    setEbUbi(b.ubigeo);
    setEbCiu(b.ciudad);
    setEbTel(b.telefono || '');
    setEbError('');
    setShowEditBranchModal(true);
  };

  const handleSaveEditBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ebNo || !ebDir || !ebUbi || !ebCiu) {
      setEbError('Por favor complete todos los campos obligatorios (*).');
      return;
    }
    if (ebUbi.length !== 6) {
      setEbError('El Ubigeo de la sucursal debe tener exactamente 6 dígitos.');
      return;
    }
    if (editingBranch && onUpdateBranch) {
      onUpdateBranch({
        ...editingBranch,
        nombre: ebNo,
        direccion: ebDir,
        ubigeo: ebUbi,
        ciudad: ebCiu,
        telefono: ebTel
      });
    }
    setShowEditBranchModal(false);
    setEditingBranch(null);
  };

  const handleStartDeleteBranch = (b: Sucursal) => {
    setDeletingBranch(b);
    setShowDeleteBranchConfirm(true);
  };

  const handleConfirmDeleteBranch = () => {
    if (deletingBranch && onDeleteBranch) {
      onDeleteBranch(deletingBranch.id);
    }
    setShowDeleteBranchConfirm(false);
    setDeletingBranch(null);
  };

  // Client helper execution
  const handleStartEditClient = (c: Cliente) => {
    setEditingClient(c);
    setEcDocType(c.tipo_documento);
    setEcDocNo(c.numero_documento);
    setEcName(c.nombre_razon_social);
    setEcDir(c.direccion || '');
    setEcEmail(c.email || '');
    setEcError('');
    setShowEditClientModal(true);
  };

  const handleSaveEditClient = (e: React.FormEvent, bypassCheck: boolean = false) => {
    e.preventDefault();
    if (!ecDocNo || !ecName) {
      setEcError('Por favor complete el documento y nombre fiscal.');
      return;
    }
    if (ecDocType === 'DNI' && !/^\d{8}$/.test(ecDocNo)) {
      setEcError('El número de DNI peruano debe contener exactamente 8 dígitos numéricos.');
      return;
    }
    if (ecDocType === 'RUC' && !/^(10|20)\d{9}$/.test(ecDocNo)) {
      setEcError('El RUC peruano debe comenzar con 10 o 20 y contener exactamente 11 dígitos numéricos.');
      return;
    }
    if (editingClient) {
      if (!bypassCheck) {
        try {
          const raw = localStorage.getItem('erp_clients');
          if (raw) {
            const list = JSON.parse(raw);
            const serverCli = list.find((c: any) => c.id === editingClient.id);
            if (serverCli) {
              const serverVersion = serverCli.version ?? 1;
              const localVersion = (editingClient as any).version ?? 1;
              if (serverVersion > localVersion) {
                setClientConflict({
                  local: {
                    ...editingClient,
                    tipo_documento: ecDocType,
                    numero_documento: ecDocNo,
                    nombre_razon_social: ecName,
                    direccion: ecDir,
                    email: ecEmail
                  },
                  server: serverCli
                });
                return;
              }
            }
          }
        } catch (err) {}
      }

      if (onUpdateClient) {
        const targetVersion = bypassCheck ? (clientConflict?.server?.version ?? 1) : ((editingClient as any).version ?? 1);
        onUpdateClient({
          ...editingClient,
          tipo_documento: ecDocType,
          numero_documento: ecDocNo,
          nombre_razon_social: ecName,
          direccion: ecDir,
          email: ecEmail,
          version: targetVersion
        });
      }
    }
    setShowEditClientModal(false);
    setEditingClient(null);
    setClientConflict(null);
  };

  const handleStartDeleteClient = (c: Cliente) => {
    setDeletingClient(c);
    setShowDeleteClientConfirm(true);
  };

  const handleConfirmDeleteClient = () => {
    if (deletingClient && onDeleteClient) {
      onDeleteClient(deletingClient.id);
    }
    setShowDeleteClientConfirm(false);
    setDeletingClient(null);
  };

  // Supplier helper execution
  const handleStartEditSupplier = (s: Proveedor) => {
    setEditingSupplier(s);
    setEsRuc(s.ruc);
    setEsSocial(s.razon_social);
    setEsDir(s.direccion);
    setEsTel(s.telefono);
    setEsEmail(s.email);
    setEsContact(s.contacto || '');
    setEsError('');
    setShowEditSupplierModal(true);
  };

  const handleSaveEditSupplier = (e: React.FormEvent, bypassCheck: boolean = false) => {
    e.preventDefault();
    if (!esRuc || !esSocial || !esDir || !esTel) {
      setEsError('Por favor complete todos los campos obligatorios.');
      return;
    }
    if (!/^(10|20)\d{9}$/.test(esRuc)) {
      setEsError('El RUC peruano del proveedor debe comenzar con 10 o 20 y contener exactamente 11 dígitos numéricos.');
      return;
    }
    if (editingSupplier) {
      if (!bypassCheck) {
        try {
          const raw = localStorage.getItem('erp_suppliers');
          if (raw) {
            const list = JSON.parse(raw);
            const serverSup = list.find((s: any) => s.id === editingSupplier.id);
            if (serverSup) {
              const serverVersion = serverSup.version ?? 1;
              const localVersion = (editingSupplier as any).version ?? 1;
              if (serverVersion > localVersion) {
                setSupplierConflict({
                  local: {
                    ...editingSupplier,
                    ruc: esRuc,
                    razon_social: esSocial,
                    direccion: esDir,
                    telefono: esTel,
                    email: esEmail,
                    contacto: esContact
                  },
                  server: serverSup
                });
                return;
              }
            }
          }
        } catch (err) {}
      }

      if (onUpdateSupplier) {
        const targetVersion = bypassCheck ? (supplierConflict?.server?.version ?? 1) : ((editingSupplier as any).version ?? 1);
        onUpdateSupplier({
          ...editingSupplier,
          ruc: esRuc,
          razon_social: esSocial,
          direccion: esDir,
          telefono: esTel,
          email: esEmail,
          contacto: esContact,
          version: targetVersion
        });
      }
    }
    setShowEditSupplierModal(false);
    setEditingSupplier(null);
    setSupplierConflict(null);
  };

  const handleStartDeleteSupplier = (s: Proveedor) => {
    setDeletingSupplier(s);
    setShowDeleteSupplierConfirm(true);
  };

  const handleConfirmDeleteSupplier = () => {
    if (deletingSupplier && onDeleteSupplier) {
      onDeleteSupplier(deletingSupplier.id);
    }
    setShowDeleteSupplierConfirm(false);
    setDeletingSupplier(null);
  };

  const executeApiSearch = () => {
    if (!cDocNo) {
      setFormError('Debe ingresar un número de documento para consultar.');
      return;
    }
    if (cDocType === 'DNI' && cDocNo.length !== 8) {
      setFormError('El DNI debe tener exactamente 8 dígitos.');
      return;
    }
    if (cDocType === 'RUC' && cDocNo.length !== 11) {
      setFormError('El RUC debe tener exactamente 11 dígitos.');
      return;
    }

    setFormError('');
    setIsSearchingApi(true);

    // Simula consulta a API nacional peruana (RENIEC / SUNAT)
    setTimeout(() => {
      setIsSearchingApi(false);
      if (cDocType === 'DNI') {
        const firstNames = ['María', 'José', 'Ana', 'Luis', 'Carlos', 'Sofía'];
        const lastNames = ['Mendoza', 'Sánchez', 'Huamán', 'Castro', 'Pérez', 'Ramos'];
        const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        setCName(randomName);
        setCDir('Calle Lima 120, Arequipa');
        setApiSuccessMsg('RENIEC: Documento validado y encontrado con éxito.');
      } else {
        const businessNames = ['Droguería FarmaSol S.A.C.', 'Inversiones Médicas del Sur EIRL', 'Representaciones Farmacéuticas Inc.', 'Botica Súper Ahorro S.C.'];
        const randomBiz = businessNames[Math.floor(Math.random() * businessNames.length)];
        setCName(randomBiz);
        setCDir('Av. República de Panamá 1480, San Isidro, Lima');
        setApiSuccessMsg('SUNAT: Contribuyente Activo y Habido en estado normal.');
      }
    }, 1200);
  };

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (activeSegment === 'branches') {
      if (!bNo || !bDir || !bUbi || !bCiu) {
        setFormError('Por favor llene todos los campos obligatorios (*)');
        return;
      }
      if (bUbi.length !== 6) {
        setFormError('El Ubigeo de la sucursal debe tener exactamente 6 dígitos (código INEI).');
        return;
      }
      onAddBranch({
        nombre: bNo,
        direccion: bDir,
        ubigeo: bUbi,
        ciudad: bCiu,
        telefono: bTel
      });
      // reset
      setBNo(''); setBDir(''); setBUbi(''); setBCiu(''); setBTel('');
    } 
    
    else if (activeSegment === 'clients') {
      if (!cDocNo || !cName) {
        setFormError('Por favor complete el documento y nombre completo.');
        return;
      }
      if (cDocType === 'DNI' && !/^\d{8}$/.test(cDocNo)) {
        setFormError('El número de DNI peruano debe contener exactamente 8 dígitos numéricos.');
        return;
      }
      if (cDocType === 'RUC' && !/^(10|20)\d{9}$/.test(cDocNo)) {
        setFormError('El RUC peruano debe comenzar con 10 o 20 y contener exactamente 11 dígitos numéricos.');
        return;
      }
      onAddClient({
        tipo_documento: cDocType,
        numero_documento: cDocNo,
        nombre_razon_social: cName,
        direccion: cDir,
        email: cEmail
      });
      // reset
      setCDocNo(''); setCName(''); setCDir(''); setCEmail(''); setApiSuccessMsg('');
    } 
    
    else if (activeSegment === 'suppliers') {
      if (!sRuc || !sSocial || !sDir || !sTel) {
        setFormError('Complete los datos obligatorios del proveedor corporativo.');
        return;
      }
      if (!/^(10|20)\d{9}$/.test(sRuc)) {
        setFormError('El RUC peruano del proveedor debe comenzar con 10 o 20 y contener exactamente 11 dígitos numéricos.');
        return;
      }
      onAddSupplier({
        ruc: sRuc,
        razon_social: sSocial,
        direccion: sDir,
        telefono: sTel,
        email: sEmail,
        contacto: sContact
      });
      // reset
      setSRuc(''); setSSocial(''); setSDir(''); setSTel(''); setSEmail(''); setSContact('');
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Selector de segmento */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-sm flex-col lg:flex-row gap-4">
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-250 dark:border-slate-700 w-full lg:w-auto">
          <button
            onClick={() => { setActiveSegment('branches'); setSearchTerm(''); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 h-10 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeSegment === 'branches' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Sucursales Multi-Local ({branches.length})
          </button>
          
          <button
            onClick={() => { setActiveSegment('clients'); setSearchTerm(''); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 h-10 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeSegment === 'clients' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Clientes SUNAT ({clients.length})
          </button>

          <button
            onClick={() => { setActiveSegment('suppliers'); setSearchTerm(''); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 h-10 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeSegment === 'suppliers' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Proveedores Droguerías ({suppliers.length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto self-stretch">
          <div className="relative flex-1 sm:flex-initial w-full sm:w-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={`Filtrar ${
                activeSegment === 'branches' ? 'sucursal' : activeSegment === 'clients' ? 'cliente' : 'proveedor'
              }...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-60 h-10 pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Registrar {activeSegment === 'branches' ? 'Sucursal' : activeSegment === 'clients' ? 'Cliente' : 'Proveedor'}
          </button>
        </div>
      </div>

      {/* RENDER PLANILLA DE SUCURSALES */}
      {activeSegment === 'branches' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branches
            .filter(b => b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || b.direccion.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(b => (
              <div key={b.id} className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute right-0 top-0 bg-blue-500/10 text-blue-700 px-3 py-1 text-[10px] uppercase font-mono font-bold tracking-wider rounded-bl-lg">
                  Establecimiento
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm font-sans">{b.nombre}</h4>
                  <p className="text-xs text-slate-400 mt-1">{b.direccion}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs font-mono text-slate-500">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Ubigeo INEI</span>
                    <span className="text-slate-800 font-semibold">{b.ubigeo}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Ciudad</span>
                    <span className="text-slate-800 font-semibold">{b.ciudad}</span>
                  </div>
                  <div className="col-span-2 mt-1">
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Teléfono</span>
                    <span className="text-slate-800 font-semibold">{b.telefono || 'Sin teléfono'}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleStartEditBranch(b)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-150 text-slate-750 font-bold rounded-lg border border-slate-200 flex items-center gap-1 transition-all text-[10.5px]"
                    title="Editar Local"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartDeleteBranch(b)}
                    className="px-2.5 py-1 bg-red-55/75 hover:bg-red-100 text-red-650 font-bold rounded-lg border border-red-150 flex items-center gap-1 transition-all text-[10.5px]"
                    title="Eliminar Sede"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* RENDER PLANILLA DE CLIENTES */}
      {activeSegment === 'clients' && (
        <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Directorio de Clientes Autorizados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                <tr>
                  <th className="py-3 px-5">Cliente / Razón Social</th>
                  <th className="py-3 px-5">Tipo Comprobante Sugerido</th>
                  <th className="py-3 px-5">Documento de Identidad</th>
                  <th className="py-3 px-5">Dirección Fiscal / Contacto</th>
                  <th className="py-3 px-5">Correo Electrónico</th>
                  <th className="py-3 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients
                  .filter(c => c.nombre_razon_social.toLowerCase().includes(searchTerm.toLowerCase()) || c.numero_documento.includes(searchTerm))
                  .map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-5 font-bold text-slate-800 text-sm">{c.nombre_razon_social}</td>
                      <td className="py-3 px-5">
                        <span className={`px-2.5 py-0.5 text-[10px] rounded font-bold ${
                          c.tipo_documento === 'RUC' 
                            ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                            : 'bg-blue-105 text-blue-800 border border-blue-200'
                        }`}>
                          {c.tipo_documento === 'RUC' ? 'Exige Factura' : 'Boleta de Venta'}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono font-extrabold text-slate-700">{c.tipo_documento}: {c.numero_documento}</td>
                      <td className="py-3 px-5 text-slate-500">{c.direccion || 'No especificada'}</td>
                      <td className="py-3 px-5 text-slate-500 font-mono">{c.email || '—'}</td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5 font-sans">
                          <button
                            type="button"
                            onClick={() => handleStartEditClient(c)}
                            className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-705 hover:text-blue-650 rounded border border-slate-200 transition-all font-semibold text-[10.5px]"
                            title="Editar Cliente"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartDeleteClient(c)}
                            className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-850 rounded border border-red-150 transition-all font-semibold text-[10.5px]"
                            title="Eliminar Cliente"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RENDER PLANILLA DE PROVEEDORES */}
      {activeSegment === 'suppliers' && (
        <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Droguerías y Laboratorios Distribuidores Autorizados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                <tr>
                  <th className="py-3 px-5">Razón Social Corp.</th>
                  <th className="py-3 px-5">RUC Contribuyente</th>
                  <th className="py-3 px-5">Dirección de Despacho</th>
                  <th className="py-3 px-5">Contacto Comercial</th>
                  <th className="py-3 px-5">Teléfono / Email</th>
                  <th className="py-3 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers
                  .filter(s => s.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) || s.ruc.includes(searchTerm))
                  .map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-5">
                        <span className="font-bold text-slate-800 text-sm block">{s.razon_social}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Droguería Farmacéutica Homologada</span>
                      </td>
                      <td className="py-3 px-5 font-mono font-extrabold text-slate-700">{s.ruc}</td>
                      <td className="py-3 px-5 text-slate-500">{s.direccion}</td>
                      <td className="py-3 px-5">
                        <span className="bg-slate-100 text-slate-800 font-medium px-2 py-0.5 rounded text-[10px]">
                          {s.contacto || 'Sin asignar'}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono">
                        <div className="text-slate-600">{s.telefono}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{s.email}</div>
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5 font-sans">
                          <button
                            type="button"
                            onClick={() => handleStartEditSupplier(s)}
                            className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-705 hover:text-blue-650 rounded border border-slate-200 transition-all font-semibold text-[10.5px]"
                            title="Editar Proveedor"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartDeleteSupplier(s)}
                            className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-850 rounded border border-red-150 transition-all font-semibold text-[10.5px]"
                            title="Eliminar Proveedor"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURABLE */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                Registrar {activeSegment === 'branches' ? 'Sucursal' : activeSegment === 'clients' ? 'Cliente' : 'Proveedor Droguería'}
              </h3>
              <button
                onClick={() => { setShowModal(false); setFormError(''); }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="p-6 space-y-4 text-xs font-sans">
              {formError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-150">
                  {formError}
                </div>
              )}

              {/* SUCURSALES FORM */}
              {activeSegment === 'branches' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Nombre del Local *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Inkafarma - Sucursal Cayma"
                      value={bNo}
                      onChange={(e) => setBNo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Dirección Física *</label>
                    <input
                      type="text"
                      required
                      placeholder="Dirección fiscal aprobada por DIGEMID"
                      value={bDir}
                      onChange={(e) => setBDir(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Ubigeo INEI (6 dígitos) *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="Ej: 150122"
                        value={bUbi}
                        onChange={(e) => setBUbi(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Ciudad *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Lima, Arequipa"
                        value={bCiu}
                        onChange={(e) => setBCiu(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Teléfono Fijo / Móvil</label>
                    <input
                      type="text"
                      placeholder="Ej: (01) 448-9128"
                      value={bTel}
                      onChange={(e) => setBTel(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* CLIENTE FORM */}
              {activeSegment === 'clients' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block font-bold text-slate-600 mb-1">Tipo Doc.</label>
                      <select
                        value={cDocType}
                        onChange={(e) => setCDocType(e.target.value as 'DNI' | 'RUC')}
                        className="w-full px-2 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                      >
                        <option value="DNI">DNI (Boleta)</option>
                        <option value="RUC">RUC (Factura)</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block font-bold text-slate-600 mb-1">Nro. Documento *</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          required
                          placeholder={cDocType === 'DNI' ? '8 dígitos' : '11 dígitos'}
                          value={cDocNo}
                          onChange={(e) => setCDocNo(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                        />
                        <button
                          type="button"
                          onClick={executeApiSearch}
                          className="bg-slate-800 hover:bg-slate-900 text-white px-2.5 rounded-lg flex items-center justify-center transition-colors shadow-sm text-[10px] font-bold gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${isSearchingApi ? 'animate-spin' : ''}`} />
                          Dato API
                        </button>
                      </div>
                    </div>
                  </div>

                  {apiSuccessMsg && (
                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-150 p-2 rounded-lg flex items-center gap-1.5 font-bold text-[10px]">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{apiSuccessMsg}</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Nombre Completo / Razón Social *</label>
                    <input
                      type="text"
                      required
                      placeholder="Apellido, Nombre o Razón Social registrada"
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Dirección Fiscal / Habitación</label>
                    <input
                      type="text"
                      placeholder="Dirección fiscal para facturación"
                      value={cDir}
                      onChange={(e) => setCDir(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">E-mail para Envío de XML/CDR</label>
                    <input
                      type="email"
                      placeholder="correo@cliente.pe"
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* SUPPLIER FORM */}
              {activeSegment === 'suppliers' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">RUC Jurídico (11 dígitos) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 20100120191"
                      maxLength={11}
                      value={sRuc}
                      onChange={(e) => setSRuc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Razon Social *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Distribuidora Albis S.A."
                      value={sSocial}
                      onChange={(e) => setSSocial(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Dirección de Despacho *</label>
                    <input
                      type="text"
                      required
                      placeholder="Donde se entregan los pedidos"
                      value={sDir}
                      onChange={(e) => setSDir(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Teléfono contacto *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 315-4800"
                        value={sTel}
                        onChange={(e) => setSTel(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">E-mail Comercial</label>
                      <input
                        type="email"
                        placeholder="ventas@suiza.com.pe"
                        value={sEmail}
                        onChange={(e) => setSEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Nombre de Contacto (Vendedor)</label>
                    <input
                      type="text"
                      placeholder="Ej: Lic. Antonio Silva"
                      value={sContact}
                      onChange={(e) => setSContact(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(''); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR SUCURSAL */}
      {showEditBranchModal && editingBranch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-800">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-150">
            <div className="px-5 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  ✏️ Editar Sucursal / Establecimiento
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Autorizado y registrado bajo la supervisión de DIGEMID.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowEditBranchModal(false); setEditingBranch(null); }}
                className="text-slate-450 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditBranch} className="p-5 space-y-4 text-xs font-sans">
              {ebError && (
                <div className="bg-red-50 text-red-750 p-2.5 rounded-lg border border-red-150">
                  {ebError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-sans">Nombre del Local *</label>
                  <input
                    type="text"
                    required
                    value={ebNo}
                    onChange={(e) => setEbNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-sans">Dirección Física *</label>
                  <input
                    type="text"
                    required
                    value={ebDir}
                    onChange={(e) => setEbDir(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-sans">Ubigeo INEI *</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={ebUbi}
                      onChange={(e) => setEbUbi(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-sans">Ciudad *</label>
                    <input
                      type="text"
                      required
                      value={ebCiu}
                      onChange={(e) => setEbCiu(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-sans">Teléfono</label>
                  <input
                    type="text"
                    value={ebTel}
                    onChange={(e) => setEbTel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setShowEditBranchModal(false); setEditingBranch(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ELIMINAR SUCURSAL CONFIRMACIÓN */}
      {showDeleteBranchConfirm && deletingBranch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-800">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-150">
            <div className="p-5 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-650 font-bold text-xl">
                ⚠️
              </div>
              <div className="text-xs">
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">¿Eliminar Establecimiento?</h3>
                <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                  Está por dar de baja el local <strong className="text-slate-800 font-bold">{deletingBranch.nombre}</strong> ({deletingBranch.ciudad}). Esto inhabilitará el despacho en este local, afectando reportes del Kardex de Almacén.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setShowDeleteBranchConfirm(false); setDeletingBranch(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteBranch}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-sm"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CLIENTE */}
      {showEditClientModal && editingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-800">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-150">
            <div className="px-5 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  ✏️ Editar Datos del Cliente
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Actualizar credenciales de facturación fiscal SUNAT.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowEditClientModal(false); setEditingClient(null); }}
                className="text-slate-450 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {clientConflict && (
              <div className="p-5 text-xs font-sans space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3.5">
                  <div className="flex gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-tight text-amber-950">⚠️ Conflicto de Concurrencia de Red</h4>
                      <p className="mt-1 text-[11px] leading-relaxed">
                        Este cliente fue actualizado por otro operador (<strong>{clientConflict.server.last_updated_by || 'Administrador (Facturación)'}</strong>) mientras usted modificaba sus datos.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs col-span-3 text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="p-2 font-black text-slate-600 uppercase tracking-wider">Campo</th>
                        <th className="p-2 font-black text-amber-700 bg-amber-50/50 uppercase tracking-wider">Tu Propuesta</th>
                        <th className="p-2 font-black text-blue-700 bg-blue-50/50 uppercase tracking-wider">Código de Red</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Nombre / R. Social</td>
                        <td className="p-2 font-semibold text-amber-900 bg-amber-50/20">{clientConflict.local.nombre_razon_social}</td>
                        <td className="p-2 font-semibold text-blue-900 bg-blue-50/20">{clientConflict.server.nombre_razon_social}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Doc. Identidad</td>
                        <td className="p-2 font-neutral text-amber-900 bg-amber-50/20">{clientConflict.local.tipo_documento} - {clientConflict.local.numero_documento}</td>
                        <td className="p-2 font-neutral text-blue-900 bg-blue-50/20">{clientConflict.server.tipo_documento} - {clientConflict.server.numero_documento}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Dirección</td>
                        <td className="p-2 font-semibold text-amber-900 bg-amber-50/20">{clientConflict.local.direccion ?? '-'}</td>
                        <td className="p-2 font-semibold text-blue-900 bg-blue-50/20">{clientConflict.server.direccion ?? '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Ficha Versión</td>
                        <td className="p-2 font-mono text-amber-900 bg-amber-50/20">v{(clientConflict.local as any).version ?? 1}</td>
                        <td className="p-2 font-mono text-blue-900 bg-blue-50/20">v{(clientConflict.server as any).version ?? 1}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    onClick={(e) => handleSaveEditClient(e, true)}
                    className="w-full text-center py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    💥 Forzar Sobrescritura en Base de Datos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEcDocType(clientConflict.server.tipo_documento);
                      setEcDocNo(clientConflict.server.numero_documento);
                      setEcName(clientConflict.server.nombre_razon_social);
                      setEcDir(clientConflict.server.direccion || '');
                      setEcEmail(clientConflict.server.email || '');
                      setEditingClient({
                        ...editingClient!,
                        version: (clientConflict.server as any).version
                      });
                      setClientConflict(null);
                    }}
                    className="w-full text-center py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    🔄 Recargar y Adaptar a Versión de Red
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditClientModal(false);
                      setEditingClient(null);
                      setClientConflict(null);
                    }}
                    className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Cerrar sin guardar
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveEditClient} className={`p-5 space-y-4 text-xs font-sans ${clientConflict ? 'hidden' : ''}`}>
              {ecError && (
                <div className="bg-red-50 text-red-750 p-2.5 rounded-lg border border-red-150">
                  {ecError}
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo Doc.</label>
                    <select
                      value={ecDocType}
                      disabled
                      onChange={(e) => setEcDocType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-205 rounded-lg font-medium bg-slate-100"
                    >
                      <option value="DNI">DNI</option>
                      <option value="RUC">RUC</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Doc. Identidad *</label>
                    <input
                      type="text"
                      required
                      value={ecDocNo}
                      onChange={(e) => setEcDocNo(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Completo o Razón Social *</label>
                  <input
                    type="text"
                    required
                    value={ecName}
                    onChange={(e) => setEcName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dirección Fiscal / Residencia</label>
                  <input
                    type="text"
                    value={ecDir}
                    onChange={(e) => setEcDir(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Formatos de Comprobatorios Automáticos (E-mail)</label>
                  <input
                    type="email"
                    value={ecEmail}
                    onChange={(e) => setEcEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setShowEditClientModal(false); setEditingClient(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ELIMINAR CLIENTE CONFIRMACIÓN */}
      {showDeleteClientConfirm && deletingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-800">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-150">
            <div className="p-5 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-650 font-bold text-xl">
                ⚠️
              </div>
              <div className="text-xs">
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">¿Eliminar Cliente del Directorio?</h3>
                <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                  Está por remover al cliente <strong className="text-slate-800 font-bold">{deletingClient.nombre_razon_social}</strong> ({deletingClient.numero_documento}) del catálogo de acceso acelerado para la dispensación general de comprobantes.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setShowDeleteClientConfirm(false); setDeletingClient(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteClient}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-sm"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PROVEEDOR */}
      {showEditSupplierModal && editingSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-800">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-150">
            <div className="px-5 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  ✏️ Editar Datos del Proveedor
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Droguerías farmacéuticas autorizadas por el MINSA.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowEditSupplierModal(false); setEditingSupplier(null); }}
                className="text-slate-450 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {supplierConflict && (
              <div className="p-5 text-xs font-sans space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3.5">
                  <div className="flex gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-tight text-amber-950">⚠️ Conflicto de Concurrencia de Red</h4>
                      <p className="mt-1 text-[11px] leading-relaxed">
                        Este registro de proveedor fue actualizado en red por otro operador (<strong>{supplierConflict.server.last_updated_by || 'Administrador (Almacén)'}</strong>) mientras usted modificaba sus datos.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="p-2 font-black text-slate-600 uppercase tracking-wider">Campo</th>
                        <th className="p-2 font-black text-amber-700 bg-amber-50/50 uppercase tracking-wider">Tu Propuesta</th>
                        <th className="p-2 font-black text-blue-700 bg-blue-50/50 uppercase tracking-wider">Código de Red</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Razón Social</td>
                        <td className="p-2 font-semibold text-amber-900 bg-amber-50/20">{supplierConflict.local.razon_social}</td>
                        <td className="p-2 font-semibold text-blue-900 bg-blue-50/20">{supplierConflict.server.razon_social}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-500">RUC Proveedor</td>
                        <td className="p-2 font-mono text-amber-900 bg-amber-50/20">{supplierConflict.local.ruc}</td>
                        <td className="p-2 font-mono text-blue-900 bg-blue-50/20">{supplierConflict.server.ruc}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Teléfono</td>
                        <td className="p-2 font-semibold text-amber-900 bg-amber-50/20">{supplierConflict.local.telefono}</td>
                        <td className="p-2 font-semibold text-blue-900 bg-blue-50/20">{supplierConflict.server.telefono}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Ficha Versión</td>
                        <td className="p-2 font-mono text-amber-900 bg-amber-50/20">v{(supplierConflict.local as any).version ?? 1}</td>
                        <td className="p-2 font-mono text-blue-900 bg-blue-50/20">v{(supplierConflict.server as any).version ?? 1}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    onClick={(e) => handleSaveEditSupplier(e, true)}
                    className="w-full text-center py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    💥 Forzar Sobrescritura en Base de Datos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEsRuc(supplierConflict.server.ruc);
                      setEsSocial(supplierConflict.server.razon_social);
                      setEsDir(supplierConflict.server.direccion);
                      setEsTel(supplierConflict.server.telefono);
                      setEsEmail(supplierConflict.server.email);
                      setEsContact(supplierConflict.server.contacto || '');
                      setEditingSupplier({
                        ...editingSupplier!,
                        version: (supplierConflict.server as any).version
                      });
                      setSupplierConflict(null);
                    }}
                    className="w-full text-center py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    🔄 Recargar y Adaptar a Versión de Red
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditSupplierModal(false);
                      setEditingSupplier(null);
                      setSupplierConflict(null);
                    }}
                    className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Cerrar sin guardar
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveEditSupplier} className={`p-5 space-y-4 text-xs font-sans ${supplierConflict ? 'hidden' : ''}`}>
              {esError && (
                <div className="bg-red-50 text-red-750 p-2.5 rounded-lg border border-red-150">
                  {esError}
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Doc. Tributario</label>
                    <input
                      type="text"
                      disabled
                      value="RUC"
                      className="w-full px-3 py-2 border border-slate-205 rounded-lg font-medium bg-slate-100 text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">RUC Remitente *</label>
                    <input
                      type="text"
                      required
                      value={esRuc}
                      onChange={(e) => setEsRuc(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Razón Social Corporativa *</label>
                  <input
                    type="text"
                    required
                    value={esSocial}
                    onChange={(e) => setEsSocial(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dirección de Despacho *</label>
                  <input
                    type="text"
                    required
                    value={esDir}
                    onChange={(e) => setEsDir(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teléfono Fijo *</label>
                    <input
                      type="text"
                      required
                      value={esTel}
                      onChange={(e) => setEsTel(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={esEmail}
                      onChange={(e) => setEsEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contacto / Promotor Médico</label>
                  <input
                    type="text"
                    value={esContact}
                    onChange={(e) => setEsContact(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setShowEditSupplierModal(false); setEditingSupplier(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ELIMINAR PROVEEDOR CONFIRMACIÓN */}
      {showDeleteSupplierConfirm && deletingSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-800">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-150">
            <div className="p-5 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-650 font-bold text-xl">
                ⚠️
              </div>
              <div className="text-xs">
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">¿Eliminar Droguería Distribuidora?</h3>
                <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                  Está por desvincular al proveedor corporativo <strong className="text-slate-800 font-bold">{deletingSupplier.razon_social}</strong> (RUC: <span className="font-mono">{deletingSupplier.ruc}</span>). Esto impedirá registrar nuevos lotes asociados con su firma comercial.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setShowDeleteSupplierConfirm(false); setDeletingSupplier(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSupplier}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-sm"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
