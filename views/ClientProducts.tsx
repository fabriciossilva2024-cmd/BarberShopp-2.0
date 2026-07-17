import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Search, ShoppingBag, Tag, AlertCircle, Check, PackageX } from 'lucide-react';

export const ClientProducts = () => {
  const { products } = useAppStore();
  const [filter, setFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))];
  
  const filteredProducts = products.filter(p => {
    const matchesCategory = filter === 'Todos' || p.category === filter;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Esgotado', color: 'text-red-500', bg: 'bg-red-500/10', icon: PackageX };
    if (stock < 5) return { label: 'Últimas unidades', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertCircle };
    return { label: 'Disponível', color: 'text-green-500', bg: 'bg-green-500/10', icon: Check };
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex p-3 rounded-full bg-slate-900 border border-slate-800 mb-2">
            <ShoppingBag className="text-gold-500" size={32} />
        </div>
        <h2 className="text-3xl font-bold text-white">Nossos Produtos</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
           Produtos premium selecionados para manter o seu estilo em dia, mesmo em casa. 
           Adquira diretamente no balcão.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
            {categories.map(cat => (
            <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${
                filter === cat 
                    ? 'bg-gold-500 text-slate-900 border-gold-500' 
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
                }`}
            >
                {cat}
            </button>
            ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
                type="text" 
                placeholder="Buscar produto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-gold-500 transition-colors"
            />
        </div>
      </div>

      {/* Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
            <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum produto encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => {
                const status = getStockStatus(product.stock);
                const StatusIcon = status.icon;

                return (
                    <div key={product.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-600 transition-all hover:shadow-xl flex flex-col h-full">
                        {/* Image Area */}
                        <div className="relative h-56 bg-white/5 p-4 flex items-center justify-center overflow-hidden">
                             <img
                                src={product.image || '/no-image.png'}
                                alt={product.name}
                                onError={(e) => {
                                  e.currentTarget.src = '/no-image.png';
                                }}
                                className="h-full object-contain group-hover:scale-110 transition-transform duration-500"
                             />
                             <div className="absolute top-3 right-3">
                                 <span className="bg-slate-900/90 backdrop-blur text-slate-300 text-xs font-bold px-3 py-1 rounded-full border border-slate-700 uppercase tracking-wide">
                                     {product.category}
                                 </span>
                             </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
                                <p className="text-slate-400 text-sm line-clamp-3 mb-4">
                                    {product.description}
                                </p>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 uppercase font-bold">Preço</span>
                                        <span className="text-2xl font-bold text-gold-500">R$ {product.price.toFixed(2)}</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${status.bg} ${status.color} border border-current/10`}>
                                        <StatusIcon size={14} />
                                        <span className="text-xs font-bold">{status.label}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
};