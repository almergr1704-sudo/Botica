import React, { useState } from 'react';
import { Plus, Search, Building, User, Users, ClipboardCheck, Network, CheckCircle, RefreshCw } from 'lucide-react';
import { Cliente, Proveedor, Sucursal } from '../types/pharmacy';

interface ClientSupplierManagerProps {
  branches: Sucursal[];
  clients: Cliente[];
  suppliers: Proveedor[];
  onAddBranch: (branch: Omit<Sucursal, 'id'>) => void;
  onAddClient: (client: Omit<Cliente, 'id'>) => void;
  onAddSupplier: (supplier: Omit<Proveedor, 'id'>) => void;
}

export default function ClientSupplierManager({
  branches,
  clients,
  suppliers,
  onAddBranch,
  onAddClient,
  onAddSupplier
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
      if (sRuc.length !== 11 || !sRuc.startsWith('20') && !sRuc.startsWith('10')) {
        setFormError('El RUC peruano de herencia jurídica debe comenzar por 10 o 20 y contener exactamente 11 dígitos.');
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
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-150 shadow-sm flex-col sm:flex-row gap-3">
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-250 w-full sm:w-auto">
          <button
            onClick={() => { setActiveSegment('branches'); setSearchTerm(''); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              activeSegment === 'branches' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Sucursales Multi-Local ({branches.length})
          </button>
          
          <button
            onClick={() => { setActiveSegment('clients'); setSearchTerm(''); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              activeSegment === 'clients' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Clientes SUNAT ({clients.length})
          </button>

          <button
            onClick={() => { setActiveSegment('suppliers'); setSearchTerm(''); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              activeSegment === 'suppliers' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Proveedores Droguerías ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto self-stretch">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Filtrar ${
                activeSegment === 'branches' ? 'sucursal' : activeSegment === 'clients' ? 'cliente' : 'proveedor'
              }...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-60 pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
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
                  <div className="grid grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-2 gap-3">
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
    </div>
  );
}
