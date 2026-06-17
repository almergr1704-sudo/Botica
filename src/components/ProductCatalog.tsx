import React, { useState } from 'react';
import { Plus, Search, Filter, ShieldCheck, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Producto } from '../types/pharmacy';

interface ProductCatalogProps {
  products: Producto[];
  onAddProduct: (newProduct: Omit<Producto, 'id'>) => void;
}

export default function ProductCatalog({ products, onAddProduct }: ProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [requiresRecipeFilter, setRequiresRecipeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

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
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600 font-sans">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-5">Código / Nombre</th>
                  <th className="py-3 px-5">Principio Activo</th>
                  <th className="py-3 px-5">Laboratorio</th>
                  <th className="py-3 px-5">Reg. Sanitario DIGEMID</th>
                  <th className="py-3 px-5">Exigencia</th>
                  <th className="py-3 px-5 text-right">Pto. Sugerido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(prod => (
                  <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">{prod.nombre}</span>
                        <div className="flex gap-2 text-[10px] text-slate-400 mt-1">
                          <span>{prod.presentacion}</span>
                          <span>•</span>
                          <span className="font-mono">{prod.codigo_barras}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-700">{prod.principio_activo}</span>
                        <span className="text-[10px] text-slate-400">{prod.concentracion}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-slate-500 font-medium">{prod.laboratorio}</td>
                    <td className="py-3 px-5 font-mono">
                      <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded border border-slate-200 font-bold">
                        {prod.registro_sanitario}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      {prod.requiere_receta ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-red-700 bg-red-50 border border-red-100 rounded-full px-2 py-0.5 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          Receta Médica
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Venta Libre
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-bold text-slate-800">
                      S/ {prod.precio_sugerido.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}
