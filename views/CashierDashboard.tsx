import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { Client } from '../types';
import { formatPhone } from '../utils';
import { 
  Wallet, Plus, X, ArrowUpRight, ArrowDownLeft, Banknote, 
  Lock, Loader, Clock, CreditCard, BanknoteIcon, DollarSign, 
  TrendingUp, TrendingDown, History, RefreshCw, Package,
  CheckCircle, AlertCircle, Search, Filter, UserPlus, Phone, Globe
} from 'lucide-react';

export const CashierDashboard = () => {
  const { 
    config, services, barbers, products, appointments, expenses, revenues, clients,
    addExpense, addRevenue, refreshData, updateProductStock, addClient
  } = useAppStore();

  const todayStr = new Date().toISOString().split('T')[0];
  
  // --- Caixa State ---
  const [caixaOpen, setCaixaOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // --- Transaction Modal State ---
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [transactionDesc, setTransactionDesc] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('OTHER');
  const [transactionPaymentMethod, setTransactionPaymentMethod] = useState<'PIX' | 'CASH' | 'TRANSFER'>('CASH');

  // --- Quick Sale State ---
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [quickSaleService, setQuickSaleService] = useState('');
  const [quickSaleBarber, setQuickSaleBarber] = useState('');
  const [quickSaleClient, setQuickSaleClient] = useState('');
  const [quickSalePayment, setQuickSalePayment] = useState<'PIX' | 'CASH' | 'TRANSFER'>('CASH');

  // --- Product Sale State ---
  const [showProductSale, setShowProductSale] = useState(false);
  const [productSaleId, setProductSaleId] = useState('');
  const [productSaleQty, setProductSaleQty] = useState('1');
  const [productSaleClient, setProductSaleClient] = useState('');
  const [productSalePayment, setProductSalePayment] = useState<'PIX' | 'CASH' | 'TRANSFER'>('CASH');

  // --- History State ---
  const [activeTab, setActiveTab] = useState<'RESUMO' | 'HISTORICO' | 'PRODUTOS' | 'CLIENTES'>('RESUMO');

  // --- Client States ---
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientSecurityOpen, setIsClientSecurityOpen] = useState(false);
  const [clientSecurityPassword, setClientSecurityPassword] = useState('');
  const [clientSuccessMsg, setClientSuccessMsg] = useState('');

  // Load caixa state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`caixa_${todayStr}`);
    if (saved) {
      const data = JSON.parse(saved);
      setCaixaOpen(data.open || false);
      setOpeningAmount(data.openingAmount || '');
    }
  }, [todayStr]);

  const saveCaixaState = (open: boolean, amount: string) => {
    localStorage.setItem(`caixa_${todayStr}`, JSON.stringify({ open, openingAmount: amount }));
  };

  // --- Calculations ---
  const todayAppointments = useMemo(() => 
    appointments.filter(a => a.date?.startsWith(todayStr) && a.status === 'COMPLETED'),
  [appointments, todayStr]);

  const todayRevenues = useMemo(() => 
    revenues.filter(r => r.date?.startsWith(todayStr)),
  [revenues, todayStr]);

  const todayExpenses = useMemo(() => 
    expenses.filter(e => e.date?.startsWith(todayStr)),
  [expenses, todayStr]);

  const totalEntradas = todayAppointments.reduce((sum, a) => sum + (a.totalPrice || 0), 0) 
    + todayRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
  
  const totalSaidas = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const saldoAtual = (parseFloat(openingAmount) || 0) + totalEntradas - totalSaidas;

  const todayTransactions = [...todayAppointments.map(a => ({
    id: a.id,
    type: 'INCOME' as const,
    description: `Serviço - ${services.find(s => s.id === a.serviceId)?.name || 'Serviço'}`,
    amount: a.totalPrice || 0,
    category: 'SERVICE',
    date: a.date,
    client: a.clientName
  })), ...todayRevenues.map(r => ({
    id: r.id,
    type: 'INCOME' as const,
    description: r.description,
    amount: r.amount,
    category: r.category,
    date: r.date,
    client: ''
  })), ...todayExpenses.map(e => ({
    id: e.id,
    type: 'EXPENSE' as const,
    description: e.description,
    amount: e.amount,
    category: e.category,
    date: e.date,
    client: ''
  }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- Handlers ---
  const handleOpenCaixa = () => {
    if (!openingAmount || parseFloat(openingAmount) < 0) {
      alert('Informe o valor de abertura do caixa.');
      return;
    }
    setCaixaOpen(true);
    saveCaixaState(true, openingAmount);
  };

  const handleCloseCaixa = async () => {
    if (!confirmClose) {
      setConfirmClose(true);
      return;
    }
    setIsClosing(true);
    
    await addExpense({
      description: 'Fechamento de Caixa - Retirada',
      amount: saldoAtual,
      category: 'OTHER',
      date: new Date().toISOString()
    });
    
    setCaixaOpen(false);
    setClosingAmount(saldoAtual.toFixed(2));
    saveCaixaState(false, '');
    setIsClosing(false);
    setConfirmClose(false);
    alert(`Caixa fechado! Saldo: R$ ${saldoAtual.toFixed(2)}`);
  };

  const handleAddTransaction = async () => {
    if (!transactionDesc || !transactionAmount || parseFloat(transactionAmount) <= 0) {
      alert('Preencha descrição e valor.');
      return;
    }

    const amount = parseFloat(transactionAmount);
    const now = new Date().toISOString();

    if (transactionType === 'INCOME') {
      await addRevenue({ description: transactionDesc, amount, category: transactionCategory, date: now });
    } else {
      await addExpense({ description: transactionDesc, amount, category: transactionCategory, date: now });
    }

    setTransactionDesc('');
    setTransactionAmount('');
    setTransactionCategory('OTHER');
    setShowAddTransaction(false);
  };

  const handleQuickSale = async () => {
    if (!quickSaleService || !quickSaleBarber || !quickSaleClient) {
      alert('Preencha todos os campos.');
      return;
    }

    const service = services.find(s => s.id === quickSaleService);
    if (!service) return;

    const now = new Date().toISOString();
    await addRevenue({
      description: `Venda Rápida - ${service.name} (${quickSaleClient})`,
      amount: service.price,
      category: 'SERVICE',
      date: now
    });

    setQuickSaleClient('');
    setQuickSaleService('');
    setQuickSaleBarber('');
    setShowQuickSale(false);
    alert(`Venda registrada: R$ ${service.price.toFixed(2)}`);
  };

  const handleProductSale = async () => {
    if (!productSaleId || !productSaleClient || parseInt(productSaleQty) <= 0) {
      alert('Preencha todos os campos.');
      return;
    }

    const product = products.find(p => p.id === productSaleId);
    if (!product) return;
    const qty = parseInt(productSaleQty);

    if (product.stock < qty) {
      alert(`Estoque insuficiente. Disponível: ${product.stock} un.`);
      return;
    }

    const now = new Date().toISOString();
    const total = product.price * qty;

    await addRevenue({
      description: `Produto - ${product.name}${qty > 1 ? ` (${qty}x)` : ''} (${productSaleClient})`,
      amount: total,
      category: 'PRODUCT',
      date: now
    });

    await updateProductStock(productSaleId, -qty);

    setProductSaleClient('');
    setProductSaleId('');
    setProductSaleQty('1');
    setShowProductSale(false);
    alert(`Venda de produto registrada: R$ ${total.toFixed(2)}`);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editingClient.name?.trim()) return;
    setIsClientModalOpen(false);
    setIsClientSecurityOpen(true);
  };

  const handleConfirmSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsClientSecurityOpen(false);
    try {
      await addClient({
        name: editingClient!.name,
        phone: editingClient!.phone || '',
        email: editingClient!.email || '',
        whatsapp: editingClient!.whatsapp || '',
        notes: editingClient!.notes || ''
      });
      setEditingClient(null);
      setClientSuccessMsg('Cliente cadastrado com sucesso!');
      setTimeout(() => setClientSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      alert('Erro ao salvar cliente no banco de dados. Tente novamente.');
    }
  };

  // --- Render ---
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wallet size={24} className="text-gold-500" /> Painel Caixa
          {caixaOpen ? (
            <span className="text-xs px-3 py-1 bg-green-500/10 text-green-500 rounded-full border border-green-500/20 ml-2">
              ABERTO
            </span>
          ) : (
            <span className="text-xs px-3 py-1 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 ml-2">
              FECHADO
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => refreshData(true)}
            className="px-4 py-2 rounded-lg font-bold flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
          >
            <RefreshCw size={16} /> Atualizar
          </button>
          {caixaOpen && (
            <button 
              onClick={handleCloseCaixa}
              disabled={isClosing}
              className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
                confirmClose 
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' 
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'
              }`}
            >
              {isClosing ? <Loader size={16} className="animate-spin" /> : <Lock size={16} />}
              {confirmClose ? 'Confirmar Fechamento' : 'Fechar Caixa'}
            </button>
          )}
        </div>
      </div>

      {/* Caixa Fechado - Inline Banner */}
      {!caixaOpen && (
        <div className="bg-slate-900 border border-gold-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border-2 border-gold-500/30 flex-shrink-0">
            <Wallet size={28} className="text-gold-500" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-white mb-1">Caixa Fechado</h3>
            <p className="text-slate-400 text-sm">Informe o valor de abertura para iniciar as operações do dia.</p>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="number" 
              step="0.01"
              min="0"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              className="w-36 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-center font-bold focus:outline-none focus:border-gold-500"
              placeholder="R$ 0,00"
            />
            <button 
              onClick={handleOpenCaixa}
              className="bg-gold-500 hover:bg-gold-400 text-slate-900 font-bold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
            >
              Abrir Caixa
            </button>
          </div>
        </div>
      )}

      {/* Saldo Card */}
      <div className="bg-slate-900 border border-gold-500/30 p-5 rounded-xl shadow-lg shadow-gold-500/5">
        <div className="text-gold-500 text-xs font-bold uppercase mb-1 flex items-center gap-1">
          <Wallet size={12} /> Saldo Atual do Caixa
        </div>
        <div className={`text-2xl font-bold ${saldoAtual >= 0 ? 'text-gold-500' : 'text-red-500'}`}>
          R$ {saldoAtual.toFixed(2)}
        </div>
      </div>

      {/* Action Buttons */}
      {caixaOpen && (
      <>
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={() => setShowAddTransaction(true)}
          className="bg-gold-500 hover:bg-gold-400 text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-gold-900/20"
        >
          <Plus size={18} /> Novo Lançamento
        </button>
        <button 
          onClick={() => setShowQuickSale(true)}
          className="bg-green-500/10 hover:bg-green-500/20 text-green-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-green-500/20"
        >
          <DollarSign size={18} /> Venda Rápida
        </button>
        <button 
          onClick={() => setShowProductSale(true)}
          className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-blue-500/20"
        >
          <Package size={18} /> Vender Produto
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {(['PRODUTOS', 'CLIENTES'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              activeTab === tab
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {tab === 'PRODUTOS' ? 'Estoque' : 'Clientes'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'PRODUTOS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h4 className="font-bold text-white mb-4 flex items-center gap-2">
            <Package size={18} className="text-gold-500" /> Estoque de Produtos
          </h4>
          <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
            {products.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-4">Nenhum produto cadastrado.</p>
            ) : (
              products.map(prod => (
                <div key={prod.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold text-white">{prod.name}</div>
                    <div className="text-[10px] text-slate-500">{prod.category} • R$ {prod.price.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${prod.stock > 0 ? 'text-white' : 'text-red-500'}`}>
                      {prod.stock} un.
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'CLIENTES' && (
        <div className="space-y-6">
          {clientSuccessMsg && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-500 px-4 py-3 rounded-xl flex items-center gap-2 font-medium animate-fade-in">
              <CheckCircle size={20} /> {clientSuccessMsg}
            </div>
          )}

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                placeholder="Buscar cliente por nome, telefone ou email..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
            <button 
              onClick={() => { setEditingClient({ name: '', phone: '', email: '', whatsapp: '', notes: '' }); setIsClientModalOpen(true); }}
              className="bg-gold-500 hover:bg-gold-400 text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-gold-900/20 whitespace-nowrap"
            >
              <Plus size={18} /> Novo Cliente
            </button>
          </div>

          <div className="space-y-2">
            {clients.filter(c => {
              if (!clientSearchTerm) return true;
              const term = clientSearchTerm.toLowerCase();
              return (c.name?.toLowerCase().includes(term) || c.phone?.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term));
            }).length === 0 ? (
              <div className="bg-slate-900/50 rounded-xl border border-slate-800 border-dashed p-8 text-center">
                <UserPlus size={40} className="mx-auto text-slate-600 mb-3 opacity-50" />
                <p className="text-slate-500 text-sm">
                  {clients.length === 0 ? 'Nenhum cliente cadastrado ainda.' : 'Nenhum cliente encontrado para esta busca.'}
                </p>
              </div>
            ) : (
              clients.filter(c => {
                if (!clientSearchTerm) return true;
                const term = clientSearchTerm.toLowerCase();
                return (c.name?.toLowerCase().includes(term) || c.phone?.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term));
              }).map(client => (
                <div key={client.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 flex-shrink-0">
                      <span className="text-sm font-bold text-gold-500">{client.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{client.name}</div>
                      <div className="text-[10px] text-slate-500 flex flex-wrap gap-2">
                        {client.phone && <span className="flex items-center gap-1"><Phone size={10} /> {client.phone}</span>}
                        {client.email && <span className="flex items-center gap-1"><Globe size={10} /> {client.email}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">
                      {appointments.filter(a => a.clientId === client.id).length} agend.
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      </>
      )}

      {/* Transaction Modal */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Novo Lançamento</h3>
              <button onClick={() => setShowAddTransaction(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => setTransactionType('INCOME')}
                  className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
                    transactionType === 'INCOME' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <ArrowUpRight size={16} className="inline mr-1" /> Entrada
                </button>
                <button 
                  onClick={() => setTransactionType('EXPENSE')}
                  className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
                    transactionType === 'EXPENSE' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <ArrowDownLeft size={16} className="inline mr-1" /> Saída
                </button>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Descrição</label>
                <input 
                  type="text" 
                  value={transactionDesc}
                  onChange={(e) => setTransactionDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                  placeholder="Ex: Venda de produto, Compra de material..."
                />
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-lg font-bold focus:outline-none focus:border-gold-500"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Categoria</label>
                <select 
                  value={transactionCategory}
                  onChange={(e) => setTransactionCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                >
                  {transactionType === 'INCOME' ? (
                    <>
                      <option value="PRODUCT">Produto</option>
                      <option value="SERVICE">Serviço Extra</option>
                      <option value="OTHER">Outro</option>
                    </>
                  ) : (
                    <>
                      <option value="FIXED">Fixo</option>
                      <option value="VARIABLE">Variável</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="OTHER">Outro</option>
                    </>
                  )}
                </select>
              </div>

              <button 
                onClick={handleAddTransaction}
                className={`w-full py-3 rounded-lg font-bold transition-colors ${
                  transactionType === 'INCOME'
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                Registrar {transactionType === 'INCOME' ? 'Entrada' : 'Saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Sale Modal */}
      {showQuickSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Venda Rápida</h3>
              <button onClick={() => setShowQuickSale(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Nome do Cliente</label>
                <input 
                  type="text" 
                  value={quickSaleClient}
                  onChange={(e) => setQuickSaleClient(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                  placeholder="Buscar ou digitar nome do cliente..."
                />
                {quickSaleClient && clients.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg max-h-48 overflow-y-auto custom-scrollbar shadow-xl">
                    {clients.filter(c => c.name?.toLowerCase().includes(quickSaleClient.toLowerCase())).slice(0, 8).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setQuickSaleClient(c.name)}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gold-500/10 hover:text-gold-500 flex items-center gap-2 transition-colors"
                      >
                        <UserPlus size={14} className="text-slate-500" /> {c.name}
                        {c.phone && <span className="text-[10px] text-slate-500 ml-auto">{c.phone}</span>}
                      </button>
                    ))}
                    {clients.filter(c => c.name?.toLowerCase().includes(quickSaleClient.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-500">Nenhum cliente encontrado. Será cadastrado como novo.</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Serviço</label>
                <select 
                  value={quickSaleService}
                  onChange={(e) => setQuickSaleService(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                >
                  <option value="">Selecione um serviço</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Profissional</label>
                <select 
                  value={quickSaleBarber}
                  onChange={(e) => setQuickSaleBarber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                >
                  <option value="">Selecione o profissional</option>
                  {barbers.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Forma de Pagamento</label>
                <div className="flex gap-2">
                  {(['CASH', 'PIX', 'TRANSFER'] as const).map(method => (
                    <button
                      key={method}
                      onClick={() => setQuickSalePayment(method)}
                      className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors ${
                        quickSalePayment === method
                          ? 'bg-gold-500 text-slate-900'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {method === 'CASH' ? '💵 Dinheiro' : method === 'PIX' ? '📱 PIX' : '🏦 Transferência'}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleQuickSale}
                className="w-full py-3 rounded-lg font-bold bg-green-600 hover:bg-green-500 text-white transition-colors"
              >
                Registrar Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Sale Modal */}
      {showProductSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Package size={20} className="text-blue-500" /> Vender Produto
              </h3>
              <button onClick={() => setShowProductSale(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Nome do Cliente</label>
                <input 
                  type="text" 
                  value={productSaleClient}
                  onChange={(e) => setProductSaleClient(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                  placeholder="Buscar ou digitar nome do cliente..."
                />
                {productSaleClient && clients.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg max-h-48 overflow-y-auto custom-scrollbar shadow-xl">
                    {clients.filter(c => c.name?.toLowerCase().includes(productSaleClient.toLowerCase())).slice(0, 8).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setProductSaleClient(c.name)}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gold-500/10 hover:text-gold-500 flex items-center gap-2 transition-colors"
                      >
                        <UserPlus size={14} className="text-slate-500" /> {c.name}
                        {c.phone && <span className="text-[10px] text-slate-500 ml-auto">{c.phone}</span>}
                      </button>
                    ))}
                    {clients.filter(c => c.name?.toLowerCase().includes(productSaleClient.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-500">Nenhum cliente encontrado. Será cadastrado como novo.</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Produto</label>
                <select 
                  value={productSaleId}
                  onChange={(e) => setProductSaleId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                >
                  <option value="">Selecione um produto</option>
                  {products.filter(p => p.stock > 0).map(p => (
                    <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)} (Estoque: {p.stock})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Quantidade</label>
                <input 
                  type="number" 
                  min="1"
                  value={productSaleQty}
                  onChange={(e) => setProductSaleQty(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              {productSaleId && (
                <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Total</span>
                  <span className="text-blue-500 font-bold text-lg">
                    R$ {((products.find(p => p.id === productSaleId)?.price || 0) * parseInt(productSaleQty || '1')).toFixed(2)}
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Forma de Pagamento</label>
                <div className="flex gap-2">
                  {(['CASH', 'PIX', 'TRANSFER'] as const).map(method => (
                    <button
                      key={method}
                      onClick={() => setProductSalePayment(method)}
                      className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors ${
                        productSalePayment === method
                          ? 'bg-gold-500 text-slate-900'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {method === 'CASH' ? '💵 Dinheiro' : method === 'PIX' ? '📱 PIX' : '🏦 Transferência'}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleProductSale}
                className="w-full py-3 rounded-lg font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Registrar Venda de Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-slate-800 shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <UserPlus size={20} className="text-gold-500" />
              Novo Cliente
            </h3>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Nome *</label>
                <input 
                  type="text" 
                  placeholder="Nome completo" 
                  className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white focus:outline-none focus:border-gold-500" 
                  value={editingClient?.name || ''} 
                  onChange={e => setEditingClient(prev => ({ ...prev!, name: e.target.value }))}
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Telefone</label>
                  <input 
                    type="text" 
                    placeholder="(00) 00000-0000" 
                    className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white focus:outline-none focus:border-gold-500" 
                    value={editingClient?.phone || ''} 
                    onChange={e => setEditingClient(prev => ({ ...prev!, phone: formatPhone(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-bold uppercase mb-1">WhatsApp</label>
                  <input 
                    type="text" 
                    placeholder="(00) 00000-0000" 
                    className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white focus:outline-none focus:border-gold-500" 
                    value={editingClient?.whatsapp || ''} 
                    onChange={e => setEditingClient(prev => ({ ...prev!, whatsapp: formatPhone(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Email</label>
                <input 
                  type="email" 
                  placeholder="email@exemplo.com" 
                  className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white focus:outline-none focus:border-gold-500" 
                  value={editingClient?.email || ''} 
                  onChange={e => setEditingClient(prev => ({ ...prev!, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Observações</label>
                <textarea 
                  placeholder="Preferências, restrições, etc..." 
                  className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white text-sm focus:outline-none focus:border-gold-500 min-h-[80px]" 
                  value={editingClient?.notes || ''} 
                  onChange={e => setEditingClient(prev => ({ ...prev!, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setIsClientModalOpen(false); setEditingClient(null); }} 
                  className="flex-1 p-3 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 p-3 rounded-lg bg-gold-500 text-slate-900 font-bold hover:bg-gold-400 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Security Confirmation Modal */}
      {isClientSecurityOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-sm border border-slate-800 shadow-2xl animate-fade-in">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-gold-500 border border-slate-700">
                <Lock size={32} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 text-center">
              Confirmação de Segurança
            </h3>
            <p className="text-slate-400 text-sm text-center mb-6">
              Por favor, confirme sua senha administrativa para salvar o cliente.
            </p>
            <form onSubmit={handleConfirmSaveClient} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Senha Atual</label>
                <input 
                  type="password" 
                  autoFocus
                  placeholder="Digite sua senha..." 
                  className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white focus:outline-none focus:border-gold-500" 
                  value={clientSecurityPassword} 
                  onChange={e => setClientSecurityPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setIsClientSecurityOpen(false); setClientSecurityPassword(''); }} 
                  className="flex-1 p-3 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 p-3 rounded-lg bg-gold-500 text-slate-900 font-bold hover:bg-gold-400 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
