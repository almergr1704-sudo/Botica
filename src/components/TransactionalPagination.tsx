import React from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

interface TransactionalPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function TransactionalPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange
}: TransactionalPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Guard current page limits
  const safeCurrentPage = Math.min(totalPages, Math.max(1, currentPage));

  const startRecord = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(totalItems, safeCurrentPage * pageSize);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-850/40 px-5 py-3.5 rounded-xl border border-slate-150 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
      
      {/* 1. Records count / selector panel */}
      <div className="flex items-center gap-3">
        <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Filas:</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1); // auto reset to first page
          }}
          className="bg-white dark:bg-slate-900 border border-slate-255 dark:border-slate-700 px-2.5 py-1 rounded bg-slate-50 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
        >
          <option value={10}>10 registros</option>
          <option value={20}>20 registros</option>
          <option value={50}>50 registros</option>
        </select>
        
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
        
        <span className="font-medium text-slate-550 dark:text-slate-400">
          Mostrando <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono">{startRecord}-{endRecord}</strong> de <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono">{totalItems}</strong> totales
        </span>
      </div>

      {/* 2. Interactive Page Selector Button Controls */}
      <div className="flex items-center gap-1.5 font-sans">
        
        {/* [Primero] button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:text-slate-400 cursor-pointer transition-all"
          title="Primera Página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* [Anterior] button */}
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:text-slate-400 shadow-xs cursor-pointer transition-all"
          title="Página Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Selected Highlight Pages indicator bubble */}
        <div className="px-3 py-1 bg-indigo-600 dark:bg-indigo-600 rounded-lg text-white font-black font-mono text-[11px] shadow-sm">
          {safeCurrentPage} / {totalPages}
        </div>

        {/* [Siguiente] button */}
        <button
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:text-slate-400 shadow-xs cursor-pointer transition-all"
          title="Página Siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* [Último] button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:text-slate-400 cursor-pointer transition-all"
          title="Última Página"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
        
      </div>
    </div>
  );
}
