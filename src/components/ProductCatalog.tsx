import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ShieldCheck, Check, AlertCircle, Sparkles, AlertTriangle } from 'lucide-react';
import { Producto } from '../types/pharmacy';
import TransactionalPagination from './TransactionalPagination';

interface ProductCatalogProps {
  products: Producto[];
  onAddProduct: (newProduct: Omit<Producto, 'id'>) => void;
  onUpdateProduct?: (product: Producto) => void;
  onDeleteProduct?: (id: string) => void;
}

export default function ProductCatalog({ 
  products, 
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct
}: ProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [requiresRecipeFilter, setRequiresRecipeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Auto-reset to page 1 on search / filter modification
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, requiresRecipeFilter]);

  // Form states
  const [newProdName, setNewProdName] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdActive, setNewProdActive] = useState('');
  const [newProdConcentration, setNewProdConcentration] = useState('');
  const [newProdPresentation, setNewProdPresentation] = useState('');
  const [newProdLab, setNewProdLab] = useState('');
  const [newProdSanReg, setNewProdSanReg] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdRecipe, setNewProdRecipe] = useState(false);
  const [newProdPrice, setNewProdPrice] = useState(0.50);
  const [formError, setFormError] = useState('');

  // Edit Product states
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [epName, setEpName] = useState('');
  const [epBarcode, setEpBarcode] = useState('');
  const [epActive, setEpActive] = useState('');
  const [epConcentration, setEpConcentration] = useState('');
  const [epPresentation, setEpPresentation] = useState('');
  const [epLab, setEpLab] = useState('');
  const [epSanReg, setEpSanReg] = useState('');
  const [epCategory, setEpCategory] = useState('');
  const [epRecipe, setEpRecipe] = useState(false);
  const [epActivo, setEpActivo] = useState(true);
  const [epPrice, setEpPrice] = useState(0.50);
  const [epError, setEpError] = useState('');
  const [concurrencyConflict, setConcurrencyConflict] = useState<{ local: Producto; server: Producto } | null>(null);

  // Delete Product states
  const [deletingProduct, setDeletingProduct] = useState<Producto | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Handlers for edit workflow
  const handleStartEditProduct = (prod: Producto) => {
    setEditingProduct(prod);
    setEpName(prod.nombre);
    setEpBarcode(prod.codigo_barras);
    setEpActive(prod.principio_activo);
    setEpConcentration(prod.concentracion);
    setEpPresentation(prod.presentacion);
    setEpLab(prod.laboratorio);
    setEpSanReg(prod.registro_sanitario);
    setEpCategory(prod.categoria);
    setEpRecipe(prod.requiere_receta);
    setEpActivo(prod.activo !== false);
    setEpPrice(prod.precio_sugerido);
    setEpError('');
    setShowEditModal(true);
  };

  const handleSaveEditProduct = (e: React.FormEvent, bypassCheck: boolean = false) => {
    e.preventDefault();
    if (!epName || !epBarcode || !epActive || !epLab || !epSanReg || !epCategory) {
      setEpError('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    const regSanPattern = /^[A-Z]{1,2}-\d+$/i;
    if (!regSanPattern.test(epSanReg)) {
      setEpError('El Registro Sanitario debe cumplir con el formato DIGEMID (ej: EE-04821 o NG-12048).');
      return;
    }

    if (editingProduct) {
      if (!bypassCheck) {
        try {
          const raw = localStorage.getItem('erp_products');
          if (raw) {
            const list = JSON.parse(raw);
            const serverProd = list.find((p: any) => p.id === editingProduct.id);
            if (serverProd) {
              const serverVersion = serverProd.version ?? 1;
              const localVersion = (editingProduct as any).version ?? 1;
              if (serverVersion > localVersion) {
                // simultaneous update detected
                setConcurrencyConflict({
                  local: {
                    ...editingProduct,
                    codigo_barras: epBarcode,
                    nombre: epName,
                    principio_activo: epActive,
                    concentracion: epConcentration || 'No especificada',
                    presentacion: epPresentation || 'Caja',
                    laboratorio: epLab,
                    registro_sanitario: epSanReg.toUpperCase(),
                    categoria: epCategory,
                    requiere_receta: epRecipe,
                    activo: epActivo,
                    precio_sugerido: Number(epPrice)
                  },
                  server: serverProd
                });
                return;
              }
            }
          }
        } catch (err) {}
      }

      if (onUpdateProduct) {
        const targetVersion = bypassCheck ? (concurrencyConflict?.server?.version ?? 1) : ((editingProduct as any).version ?? 1);
        onUpdateProduct({
          ...editingProduct,
          codigo_barras: epBarcode,
          nombre: epName,
          principio_activo: epActive,
          concentracion: epConcentration || 'No especificada',
          presentacion: epPresentation || 'Caja',
          laboratorio: epLab,
          registro_sanitario: epSanReg.toUpperCase(),
          categoria: epCategory,
          requiere_receta: epRecipe,
          activo: epActivo,
          precio_sugerido: Number(epPrice),
          version: targetVersion
        });
      }
    }

    setShowEditModal(false);
    setEditingProduct(null);
    setConcurrencyConflict(null);
  };

  // Handlers for delete workflow
  const handleStartDeleteProduct = (prod: Producto) => {
    setDeletingProduct(prod);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteProduct = () => {
    if (deletingProduct && onDeleteProduct) {
      onDeleteProduct(deletingProduct.id);
    }
    setShowDeleteConfirm(false);
    setDeletingProduct(null);
  };

  const laboratories = Array.from(new Set(products.map(p => p.laboratorio)));
  const categories = Array.from(new Set(products.map(p => p.categoria)));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdBarcode || !newProdActive || !newProdLab || !newProdSanReg || !newProdCategory) {
      setFormError('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    // RegEx para Registro Sanitario en Perú
    // Suele iniciar con dos letras (ej: EE, EN, NG, EG, N, PG, DE) seguidas de número correlativo
    const regSanPattern = /^[A-Z]{1,2}-\d+$/i;
    if (!regSanPattern.test(newProdSanReg)) {
      setFormError('El Registro Sanitario debe cumplir con el formato DIGEMID (ej: EE-04821 o NG-12048).');
      return;
    }

    onAddProduct({
      codigo_barras: newProdBarcode,
      nombre: newProdName,
      principio_activo: newProdActive,
      concentracion: newProdConcentration || 'No especificada',
      presentacion: newProdPresentation || 'Caja',
      laboratorio: newProdLab,
      registro_sanitario: newProdSanReg.toUpperCase(),
      categoria: newProdCategory,
      requiere_receta: newProdRecipe,
      precio_sugerido: Number(newProdPrice)
    });

    // Reset fields
    setNewProdName('');
    setNewProdBarcode('');
    setNewProdActive('');
    setNewProdConcentration('');
    setNewProdPresentation('');
    setNewProdLab('');
    setNewProdSanReg('');
    setNewProdCategory('');
    setNewProdRecipe(false);
    setNewProdPrice(0.50);
    setFormError('');
    setShowAddModal(false);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.principio_activo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.codigo_barras.includes(searchTerm);
    const matchesCategory = categoryFilter === '' || p.categoria === categoryFilter;
    const matchesRecipe = requiresRecipeFilter === 'all' || 
                          (requiresRecipeFilter === 'recipe' && p.requiere_receta) ||
                          (requiresRecipeFilter === 'no_recipe' && !p.requiere_receta);
    return matchesSearch && matchesCategory && matchesRecipe;
  });

  return (
    <div className="space-y-6">
      {/* Encabezado y búsqueda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-150 shadow-sm">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nombre, principio o barra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans appearance-none"
            >
              <option value="">Todas las Categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <select
              value={requiresRecipeFilter}
              onChange={(e) => setRequiresRecipeFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans appearance-none"
            >
              <option value="all">Sustancias (Ambas)</option>
              <option value="recipe">Venta con Receta Médica</option>
              <option value="no_recipe">Venta Libre (OTC)</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Registrar Medicamento
        </button>
      </div>

      {/* Lista de productos */}
      <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 font-sans">
            Catálogo Oficial de Medicamentos (DIGEMID Regulados)
          </h3>
          <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2.5 py-0.5 rounded-full font-mono">
            {filteredProducts.length} registros
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No se encontraron medicamentos con los filtros seleccionados.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto table-responsive-container">
              <table className="w-full text-xs text-left text-slate-600 font-sans table-layout-fixed-custom">
                <colgroup>
                  <col className="w-[24%] min-w-[180px]" />
                  <col className="w-[20%] min-w-[150px]" />
                  <col className="w-[15%] min-w-[110px]" />
                  <col className="w-[15%] min-w-[110px]" />
                  <col className="w-[12%] min-w-[100px]" />
                  <col className="w-[7%] min-w-[70px]" />
                  <col className="w-[7%] min-w-[110px]" />
                </colgroup>
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-5">Código / Nombre</th>
                    <th className="py-3 px-5">Principio Activo</th>
                    <th className="py-3 px-5">Laboratorio</th>
                    <th className="py-3 px-5">Reg. Sanitario DIGEMID</th>
                    <th className="py-3 px-5">Exigencia</th>
                    <th className="py-3 px-5 text-right">Pto. Sugerido</th>
                    <th className="py-3 px-5 text-right font-sans">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(prod => (
                    <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-5 overflow-hidden">
                        <div className="flex flex-col max-w-full">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="font-bold text-slate-800 text-sm truncate" title={prod.nombre}>{prod.nombre}</span>
                            {prod.activo === false && (
                              <span className="inline-flex items-center gap-1 text-[8px] text-red-650 bg-red-50 border border-red-150 rounded px-1 py-0.5 font-bold animate-pulse whitespace-nowrap">
                                🚫 INACTIVO
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2 text-[10px] text-slate-400 mt-1 max-w-full overflow-hidden">
                            <span className="truncate">{prod.presentacion}</span>
                            <span>•</span>
                            <span className="font-mono truncate">{prod.codigo_barras}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 overflow-hidden">
                        <div className="flex flex-col max-w-full">
                          <span className="font-semibold text-slate-700 truncate block" title={prod.principio_activo}>
                            {prod.principio_activo}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">{prod.concentracion}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-slate-500 font-medium overflow-hidden">
                        <span className="truncate block" title={prod.laboratorio}>{prod.laboratorio}</span>
                      </td>
                      <td className="py-3 px-5 font-mono overflow-hidden">
                        <span className="bg-slate-100 text-slate-705 text-[10px] px-2 py-0.5 rounded border border-slate-200 font-bold block truncate max-w-full" title={prod.registro_sanitario}>
                          {prod.registro_sanitario}
                        </span>
                      </td>
                      <td className="py-3 px-5 overflow-hidden">
                        {prod.requiere_receta ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-red-700 bg-red-50 border border-red-150 rounded-full px-2 py-0.5 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Receta Médica
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-150 rounded-full px-2 py-0.5 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Venta Libre
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-slate-800">
                        S/ {prod.precio_sugerido.toFixed(2)}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5 font-sans">
                          <button
                            type="button"
                            onClick={() => handleStartEditProduct(prod)}
                            className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-705 hover:text-blue-650 rounded border border-slate-200 transition-all font-semibold text-[10.5px] cursor-pointer"
                            title="Editar Medicamento"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartDeleteProduct(prod)}
                            className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-655 hover:text-red-850 rounded border border-red-150 transition-all font-semibold text-[10.5px] cursor-pointer"
                            title="Eliminar Medicamento"
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

            {/* Pagination controls footer */}
            <div className="border-t border-slate-100 p-4">
              <TransactionalPagination
                currentPage={currentPage}
                totalItems={filteredProducts.length}
                pageSize={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
                onPageSizeChange={(s) => setPageSize(s)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal para Registrar Medicamento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Nuevo Medicamento en Catálogo (DIGEMID)
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">El software aplicará reglas de validación sanitaria obligatoria.</p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setFormError(''); }}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 border border-red-150">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Panadol Antigripal"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Código de Barras *</label>
                  <input
                    type="text"
                    required
                    placeholder="Código EAN-13 (ej: 7750102030401)"
                    value={newProdBarcode}
                    onChange={(e) => setNewProdBarcode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Principio Activo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Paracetamol + Maleato de clorfenamina"
                    value={newProdActive}
                    onChange={(e) => setNewProdActive(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Concentración</label>
                  <input
                    type="text"
                    placeholder="Ej: 500mg + 4mg"
                    value={newProdConcentration}
                    onChange={(e) => setNewProdConcentration(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Presentación Comercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Caja x 100 tabletas"
                    value={newProdPresentation}
                    onChange={(e) => setNewProdPresentation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Laboratorio Fabricante *</label>
                  <select
                    required
                    value={newProdLab}
                    onChange={(e) => setNewProdLab(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans"
                  >
                    <option value="">Seleccione Laboratorio</option>
                    <option value="Laboratorios Portugal S.A.">Laboratorios Portugal S.A.</option>
                    <option value="Hersil S.A. Laboratorios">Hersil S.A. Laboratorios</option>
                    <option value="Laboratorios Lansier S.A.C.">Laboratorios Lansier S.A.C.</option>
                    <option value="IQFarma">IQFarma</option>
                    <option value="Medifarma S.A.">Medifarma S.A.</option>
                    <option value="Bayer S.A.">Bayer S.A.</option>
                    <option value="Sandoz Perú S.A.">Sandoz Perú S.A.</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Registro Sanitario DIGEMID *</label>
                  <input
                    type="text"
                    required
                    placeholder="Formato: EE-00000 o NG-00000"
                    value={newProdSanReg}
                    onChange={(e) => setNewProdSanReg(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                  <span className="text-[9px] text-slate-400 block mt-1">Requerido para auditoría sanitaria. Formato obligatorio: Prefijo-Números</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Categoría Farmacológica *</label>
                  <select
                    required
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans"
                  >
                    <option value="">Seleccione Categoría</option>
                    <option value="Analgésico / Antipirético">Analgésico / Antipirético</option>
                    <option value="Antibiótico">Antibiótico</option>
                    <option value="Antiinflamatorio no esteroideo (AINE)">Antiinflamatorio no esteroideo (AINE)</option>
                    <option value="Antiulceroso / Inhibidor bomba protones">Antiulceroso / Inhibidor bomba protones</option>
                    <option value="Cardiovascular / Hipolipemiante">Cardiovascular / Hipolipemiante</option>
                    <option value="Dermatológico / Cicatrizante">Dermatológico / Cicatrizante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Precio Unitario Sugerido (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="newRecipe"
                    checked={newProdRecipe}
                    onChange={(e) => setNewProdRecipe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="newRecipe" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                    ¿Requiere Receta Médica Obligatoria?
                  </label>
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
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR MEDICAMENTO */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-800">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-150">
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  ✏️ Editar Medicamento en Catálogo
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">El software aplicará reglas de validación sanitaria obligatoria.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowEditModal(false); setEditingProduct(null); }}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {concurrencyConflict && (
              <div className="p-6 text-xs font-sans space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3.5">
                  <div className="flex gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-tight text-amber-950">⚠️ Conflicto de Concurrencia de Red</h4>
                      <p className="mt-1 text-[11px] leading-relaxed">
                        Este registro de medicamento fue editado y guardado en red por un colega (<strong>{concurrencyConflict.server.last_updated_by || 'Administrador (Almacén Central)'}</strong>) mientras usted modificaba esta ficha técnica.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="p-2 font-black text-slate-600 uppercase tracking-wider">Propiedad</th>
                        <th className="p-2 font-black text-amber-700 bg-amber-50/50 uppercase tracking-wider">Tu Propuesta</th>
                        <th className="p-2 font-black text-blue-700 bg-blue-50/50 uppercase tracking-wider">Código de Red</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Nombre Comercial</td>
                        <td className="p-2 font-semibold text-amber-900 bg-amber-50/20">{concurrencyConflict.local.nombre}</td>
                        <td className="p-2 font-semibold text-blue-900 bg-blue-50/20">{concurrencyConflict.server.nombre}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Principio Activo</td>
                        <td className="p-2 font-semibold text-amber-900 bg-amber-50/20">{concurrencyConflict.local.principio_activo}</td>
                        <td className="p-2 font-semibold text-blue-900 bg-blue-50/20">{concurrencyConflict.server.principio_activo}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Precio Sugerido</td>
                        <td className="p-2 font-mono text-amber-900 bg-amber-50/20">S/ {concurrencyConflict.local.precio_sugerido.toFixed(2)}</td>
                        <td className="p-2 font-mono text-blue-900 bg-blue-50/20">S/ {concurrencyConflict.server.precio_sugerido.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-500">Sede Versión</td>
                        <td className="p-2 font-mono text-amber-900 bg-amber-50/20">v{(concurrencyConflict.local as any).version ?? 1}</td>
                        <td className="p-2 font-mono text-blue-900 bg-blue-50/20">v{(concurrencyConflict.server as any).version ?? 1}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-slate-150 space-y-2">
                  <button
                    type="button"
                    onClick={(e) => handleSaveEditProduct(e, true)}
                    className="w-full text-center py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-850 text-white font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    💥 Forzar Sobrescritura en Servidor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEpName(concurrencyConflict.server.nombre);
                      setEpBarcode(concurrencyConflict.server.codigo_barras);
                      setEpActive(concurrencyConflict.server.principio_activo);
                      setEpConcentration(concurrencyConflict.server.concentracion);
                      setEpPresentation(concurrencyConflict.server.presentacion);
                      setEpLab(concurrencyConflict.server.laboratorio);
                      setEpSanReg(concurrencyConflict.server.registro_sanitario);
                      setEpCategory(concurrencyConflict.server.categoria);
                      setEpRecipe(concurrencyConflict.server.requiere_receta);
                      setEpActivo(concurrencyConflict.server.activo);
                      setEpPrice(concurrencyConflict.server.precio_sugerido);
                      setEditingProduct({
                        ...editingProduct!,
                        version: (concurrencyConflict.server as any).version
                      });
                      setConcurrencyConflict(null);
                    }}
                    className="w-full text-center py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    🔄 Recargar y Adaptar a Versión de Red
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingProduct(null);
                      setConcurrencyConflict(null);
                    }}
                    className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Cancelar y Cerrar
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveEditProduct} className={`p-6 space-y-4 text-xs font-sans ${concurrencyConflict ? 'hidden' : ''}`}>
              {epError && (
                <div className="bg-red-50 text-red-750 p-3 rounded-lg flex items-center gap-2 border border-red-150">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{epError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    value={epName}
                    onChange={(e) => setEpName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Código de Barras (GTIN/EAN) *</label>
                  <input
                    type="text"
                    required
                    value={epBarcode}
                    onChange={(e) => setEpBarcode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Principio Activo (DCI) *</label>
                  <input
                    type="text"
                    required
                    value={epActive}
                    onChange={(e) => setEpActive(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Concentración</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 500 mg ó 100 mg / 5 mL"
                    value={epConcentration}
                    onChange={(e) => setEpConcentration(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Presentación de Venta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Caja de 100 tabletas, Frasco 120ml"
                    value={epPresentation}
                    onChange={(e) => setEpPresentation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Laboratorio Productor *</label>
                  <input
                    type="text"
                    required
                    value={epLab}
                    onChange={(e) => setEpLab(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Registro Sanitario DIGEMID *</label>
                  <input
                    type="text"
                    required
                    value={epSanReg}
                    onChange={(e) => setEpSanReg(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Categoría Farmacológica *</label>
                  <input
                    type="text"
                    required
                    value={epCategory}
                    onChange={(e) => setEpCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Precio Unitario Sugerido (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={epPrice}
                    onChange={(e) => setEpPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="editRecipe"
                    checked={epRecipe}
                    onChange={(e) => setEpRecipe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="editRecipe" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                    ¿Requiere Receta Médica Obligatoria?
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="editActivo"
                    checked={epActivo}
                    onChange={(e) => setEpActivo(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="editActivo" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                    ¿Producto Activo para Operaciones?
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingProduct(null); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-all font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm font-sans"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ELIMINAR MEDICAMENTO CONFIRMACIÓN */}
      {showDeleteConfirm && deletingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-800">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-150">
            <div className="p-5 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-650 font-bold text-xl">
                ⚠️
              </div>
              <div className="text-xs">
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">¿Eliminar del Catálogo?</h3>
                <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                  Está por eliminar de forma permanente el medicamento <strong className="text-slate-800 font-bold">{deletingProduct.nombre}</strong> (Reg: <span className="font-mono">{deletingProduct.registro_sanitario}</span>) del Catálogo Maestro. Esto impedirá de inmediato su venta, sucursales y la provisión de nuevos lotes.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-105 flex justify-center gap-2 text-xs font-sans">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeletingProduct(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteProduct}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-sm"
                  id="confirm-delete-prod-btn"
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
