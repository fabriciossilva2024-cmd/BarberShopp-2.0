import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { supabase } from '../supabaseClient';
import { 
  LayoutDashboard, Calendar, Users, Scissors, ShoppingBag, 
  DollarSign, Settings, Plus, Trash2, Edit, X, Save, 
  CheckCircle, AlertCircle, TrendingUp, Wallet, Star, Briefcase, 
  Clock, Coffee, ChevronRight, Search, Check, Filter, Megaphone,
  Menu, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft, PieChart, Banknote, ImageIcon, Upload, Loader, Lock, MapPin, Phone, Globe, Package, ToggleLeft, ToggleRight, User, ShieldCheck, CalendarDays, Database, Wifi
} from 'lucide-react';
import { Barber, Service, Product, AppointmentStatus, PaymentMethod } from '../types';

const DAYS_OF_WEEK = [
    { id: 0, label: 'Dom', full: 'Domingo' },
    { id: 1, label: 'Seg', full: 'Segunda' },
    { id: 2, label: 'Ter', full: 'Terça' },
    { id: 3, label: 'Qua', full: 'Quarta' },
    { id: 4, label: 'Qui', full: 'Quinta' },
    { id: 5, label: 'Sex', full: 'Sexta' },
    { id: 6, label: 'Sáb', full: 'Sábado' },
];

// --- CAIXA VIEW COMPONENT ---
interface CaixaViewProps {
    services: Service[];
    barbers: Barber[];
    appointments: any[];
    expenses: any[];
    revenues: any[];
    addExpense: (expense: any) => Promise<void>;
    addRevenue: (revenue: any) => Promise<void>;
}

const CaixaView: React.FC<CaixaViewProps> = ({ services, barbers, appointments, expenses, revenues, addExpense, addRevenue }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const [caixaOpen, setCaixaOpen] = useState(false);
    const [openingAmount, setOpeningAmount] = useState('');
    const [closingAmount, setClosingAmount] = useState('');
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [transactionDesc, setTransactionDesc] = useState('');
    const [transactionAmount, setTransactionAmount] = useState('');
    const [transactionCategory, setTransactionCategory] = useState('OTHER');
    const [isClosing, setIsClosing] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);

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

    // Today's transactions
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
        
        // Register closing as expense (transfer)
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

    if (!caixaOpen) {
        return (
            <div className="animate-fade-in space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Wallet size={24} className="text-gold-500" /> Painel Caixa
                </h2>
                
                <div className="max-w-md mx-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-gold-500/30">
                            <Wallet size={36} className="text-gold-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Caixa Fechado</h3>
                        <p className="text-slate-400 text-sm mb-6">Abra o caixa para iniciar as operações do dia.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Valor de Abertura (R$)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    min="0"
                                    value={openingAmount}
                                    onChange={(e) => setOpeningAmount(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-center text-xl font-bold focus:outline-none focus:border-gold-500"
                                    placeholder="0,00"
                                />
                            </div>
                            <button 
                                onClick={handleOpenCaixa}
                                className="w-full bg-gold-500 hover:bg-gold-400 text-slate-900 font-bold py-3 rounded-lg transition-colors text-lg"
                            >
                                Abrir Caixa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Wallet size={24} className="text-gold-500" /> Painel Caixa
                    <span className="text-xs px-3 py-1 bg-green-500/10 text-green-500 rounded-full border border-green-500/20 ml-2">
                        ABERTO
                    </span>
                </h2>
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
            </div>

            {/* Saldo Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <Banknote size={12} /> Abertura
                    </div>
                    <div className="text-2xl font-bold text-white">R$ {parseFloat(openingAmount || '0').toFixed(2)}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <ArrowUpRight size={12} className="text-green-500" /> Entradas
                    </div>
                    <div className="text-2xl font-bold text-green-500">R$ {totalEntradas.toFixed(2)}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <ArrowDownLeft size={12} className="text-red-500" /> Saídas
                    </div>
                    <div className="text-2xl font-bold text-red-500">R$ {totalSaidas.toFixed(2)}</div>
                </div>
                <div className="bg-slate-900 border border-gold-500/30 p-5 rounded-xl shadow-lg shadow-gold-500/5">
                    <div className="text-gold-500 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <Wallet size={12} /> Saldo Atual
                    </div>
                    <div className={`text-2xl font-bold ${saldoAtual >= 0 ? 'text-gold-500' : 'text-red-500'}`}>
                        R$ {saldoAtual.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Add Transaction Button */}
            <div className="flex justify-end">
                <button 
                    onClick={() => setShowAddTransaction(true)}
                    className="bg-gold-500 hover:bg-gold-400 text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-gold-900/20"
                >
                    <Plus size={18} /> Novo Lançamento
                </button>
            </div>

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

            {/* Transactions List */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Entradas */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <ArrowUpRight size={18} className="text-green-500" /> Entradas do Dia
                    </h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {todayAppointments.length === 0 && todayRevenues.length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-4">Nenhuma entrada registrada hoje.</p>
                        ) : (
                            <>
                                {todayAppointments.map(apt => (
                                    <div key={apt.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                                        <div>
                                            <div className="text-sm font-bold text-white">{apt.clientName}</div>
                                            <div className="text-[10px] text-slate-500">
                                                Serviço • {new Date(apt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <span className="text-green-500 font-bold text-sm">+ R$ {(apt.totalPrice || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                                {todayRevenues.map(rev => (
                                    <div key={rev.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                                        <div>
                                            <div className="text-sm font-bold text-white">{rev.description}</div>
                                            <div className="text-[10px] text-slate-500">{rev.category} • {new Date(rev.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <span className="text-green-500 font-bold text-sm">+ R$ {rev.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Saídas */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <ArrowDownLeft size={18} className="text-red-500" /> Saídas do Dia
                    </h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {todayExpenses.length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-4">Nenhuma saída registrada hoje.</p>
                        ) : (
                            todayExpenses.map(exp => (
                                <div key={exp.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                                    <div>
                                        <div className="text-sm font-bold text-white">{exp.description}</div>
                                        <div className="text-[10px] text-slate-500">{exp.category} • {new Date(exp.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                    <span className="text-red-500 font-bold text-sm">- R$ {exp.amount.toFixed(2)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AdminDashboard = () => {
  const { 
    config, services, barbers, products, appointments, expenses, revenues, announcements,
    updateConfig, addBarber, updateBarber, deleteBarber,
    addService, updateService, deleteService,
    addProduct, updateProduct, deleteProduct,
    addExpense, deleteExpense,
    addRevenue, deleteRevenue,
    addAnnouncement, deleteAnnouncement, toggleAnnouncement,
    payCommission, seedDatabase, refreshData, testConnection
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [viewBarberId, setViewBarberId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // -- Filter States (Agenda) --
  const [filterDate, setFilterDate] = useState('');
  const [filterBarberId, setFilterBarberId] = useState('ALL');

  // -- Filter States (Financeiro) --
  const [financeStartDate, setFinanceStartDate] = useState('');
  const [financeEndDate, setFinanceEndDate] = useState('');

  // -- Form States --
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [uploadingServiceImg, setUploadingServiceImg] = useState(false);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [uploadingProductImg, setUploadingProductImg] = useState(false);

  const [isBarberModalOpen, setIsBarberModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Partial<Barber> | null>(null);
  const [uploadingBarberImg, setUploadingBarberImg] = useState(false);

  // -- Announcement States --
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [newAnnouncementData, setNewAnnouncementData] = useState({ title: '', message: '' });

  // -- Finance States --
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({ description: '', amount: '', category: '' });

  // -- Settings State --
  const [settingsForm, setSettingsForm] = useState(config);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // -- Security Modal State --
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityPassword, setSecurityPassword] = useState('');

  // Sync settings form when config changes (e.g. after load)
  useEffect(() => {
    setSettingsForm(config);
  }, [config]);

  // -- Derived Data (Overview) --
  const totalServicesRevenue = appointments
    .filter(a => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + a.totalPrice, 0);

  const totalPending = appointments
    .filter(a => a.status === 'PENDING' || a.status === 'IN_PROGRESS')
    .length;

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Services Today
  const todayServicesRevenue = appointments
    .filter(a => a.status === 'COMPLETED' && a.date.startsWith(todayStr))
    .reduce((sum, a) => sum + a.totalPrice, 0);

  // -- Finance Calculations (Overview Global) --
  const totalExtraRevenue = revenues.reduce((acc, curr) => acc + curr.amount, 0);
  const grandTotalRevenue = totalServicesRevenue + totalExtraRevenue;
  
  const todayExtraRevenue = revenues
    .filter(r => r.date.startsWith(todayStr))
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const grandTotalToday = todayServicesRevenue + todayExtraRevenue;

  // -- Finance Calculations (Finance Tab - Filtered) --
  
  // Helper for date range check
  const isInFinanceRange = (dateStr: string) => {
      const d = dateStr.split('T')[0];
      if (financeStartDate && d < financeStartDate) return false;
      if (financeEndDate && d > financeEndDate) return false;
      return true;
  };

  const filteredFinanceAppointments = useMemo(() => 
      appointments.filter(a => a.status === 'COMPLETED' && isInFinanceRange(a.date)), 
  [appointments, financeStartDate, financeEndDate]);

  const filteredFinanceRevenues = useMemo(() => 
      revenues.filter(r => isInFinanceRange(r.date)), 
  [revenues, financeStartDate, financeEndDate]);

  const filteredFinanceExpenses = useMemo(() => 
      expenses.filter(e => isInFinanceRange(e.date)), 
  [expenses, financeStartDate, financeEndDate]);

  // Totals for Finance Tab
  const financeServiceTotal = filteredFinanceAppointments.reduce((sum, a) => sum + a.totalPrice, 0);
  const financeRevenueTotal = filteredFinanceRevenues.reduce((sum, r) => sum + r.amount, 0);
  const financeProductTotal = filteredFinanceRevenues
      .filter(r => r.category === 'PRODUCT')
      .reduce((sum, r) => sum + r.amount, 0);
  const financeExpenseTotal = filteredFinanceExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const financeGrandTotal = financeServiceTotal + financeRevenueTotal;
  const financeNetBalance = financeGrandTotal - financeExpenseTotal;


  // -- Pending Commissions Logic --
  const pendingCommissions = useMemo(() => {
    return barbers.map(barber => {
        const unpaidApts = appointments.filter(a => 
            a.barberId === barber.id && 
            a.status === 'COMPLETED' && 
            !a.commissionPaid
        );
        
        const totalGenerated = unpaidApts.reduce((sum, a) => sum + a.totalPrice, 0);
        const commissionToPay = totalGenerated * barber.commissionRate;
        
        return {
            barber,
            count: unpaidApts.length,
            totalGenerated,
            commissionToPay
        };
    }).filter(item => item.commissionToPay > 0);
  }, [barbers, appointments]);

  // -- Barber Details Data --
  const viewingBarberData = useMemo(() => {
    if (!viewBarberId) return null;
    const barber = barbers.find(b => b.id === viewBarberId);
    if (!barber) return null;

    const apts = appointments.filter(a => a.barberId === viewBarberId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const paidApts = apts.filter(a => a.commissionPaid);
    
    const totalServices = apts.filter(a => a.status === 'COMPLETED').length;
    const totalGenerated = apts.filter(a => a.status === 'COMPLETED').reduce((sum, a) => sum + a.totalPrice, 0);
    const totalCommission = totalGenerated * barber.commissionRate;
    const totalPaidCommission = paidApts.reduce((sum, a) => sum + (a.totalPrice * barber.commissionRate), 0);

    return {
        barber,
        apts,
        paidApts,
        totalServices,
        totalGenerated,
        totalCommission,
        totalPaidCommission
    };
  }, [viewBarberId, barbers, appointments]);

  // -- Filtered Appointments Logic --
  const filteredAppointments = useMemo(() => {
      return appointments.filter(apt => {
          const matchesDate = filterDate ? apt.date.startsWith(filterDate) : true;
          const matchesBarber = filterBarberId !== 'ALL' ? apt.barberId === filterBarberId : true;
          return matchesDate && matchesBarber;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, filterDate, filterBarberId]);

  const handlePayCommission = async (barberId: string, method: PaymentMethod) => {
      if(window.confirm(`Confirmar pagamento de comissão via ${method}?`)) {
          await payCommission(barberId, method);
      }
  };

  const handleTestConnection = async () => {
      const result = await testConnection();
      if(result.success) {
          alert(`SUCESSO: ${result.message}`);
      } else {
          alert(`FALHA: ${result.message}`);
      }
  };

  // -- Image Upload Handlers --
  
  // 1. Service Image
  const handleServiceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploadingServiceImg(true);

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `services/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        
        if (editingService) {
            setEditingService({ ...editingService, image: data.publicUrl });
        }

    } catch (error) {
        console.warn("Supabase Storage upload failed. Using Base64 fallback.", error);
        const reader = new FileReader();
        reader.onloadend = () => {
             if (editingService) {
                 setEditingService({ ...editingService, image: reader.result as string });
             }
        };
        reader.readAsDataURL(file);
    } finally {
        setUploadingServiceImg(false);
    }
  };

  // 2. Product Image
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploadingProductImg(true);

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images') 
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        
        if (editingProduct) {
            setEditingProduct({ ...editingProduct, image: data.publicUrl });
        }

    } catch (error) {
        console.warn("Supabase Storage upload failed. Using Base64 fallback.", error);
        const reader = new FileReader();
        reader.onloadend = () => {
             if (editingProduct) {
                 setEditingProduct({ ...editingProduct, image: reader.result as string });
             }
        };
        reader.readAsDataURL(file);
    } finally {
        setUploadingProductImg(false);
    }
  };

  // 3. Barber Avatar Upload
  const handleBarberImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploadingBarberImg(true);

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `barbers/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images') 
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        
        if (editingBarber) {
            setEditingBarber({ ...editingBarber, avatar: data.publicUrl });
        }

    } catch (error) {
        console.warn("Supabase Storage upload failed. Using Base64 fallback.", error);
        const reader = new FileReader();
        reader.onloadend = () => {
             if (editingBarber) {
                 setEditingBarber({ ...editingBarber, avatar: reader.result as string });
             }
        };
        reader.readAsDataURL(file);
    } finally {
        setUploadingBarberImg(false);
    }
  };

  // 4. Logo Upload (Settings)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploadingLogo(true);

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `config/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images') 
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        setSettingsForm(prev => ({ ...prev, logo: data.publicUrl }));

    } catch (error) {
        console.warn("Supabase Storage upload failed. Using Base64 fallback.", error);
        const reader = new FileReader();
        reader.onloadend = () => {
             setSettingsForm(prev => ({ ...prev, logo: reader.result as string }));
        };
        reader.readAsDataURL(file);
    } finally {
        setUploadingLogo(false);
    }
  };

  // -- Handlers --
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    
    if (editingService.id) {
        await updateService(editingService.id, editingService);
    } else {
        await addService({
            name: editingService.name!,
            price: Number(editingService.price),
            durationMinutes: Number(editingService.durationMinutes),
            description: editingService.description || '',
            image: editingService.image
        });
    }
    setIsServiceModalOpen(false);
    setEditingService(null);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingProduct) return;
      if (editingProduct.id) {
          await updateProduct(editingProduct.id, editingProduct);
      } else {
          await addProduct({
              name: editingProduct.name!,
              price: Number(editingProduct.price),
              stock: Number(editingProduct.stock),
              category: editingProduct.category || 'Geral',
              description: editingProduct.description,
              image: editingProduct.image!
          });
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
  };

  const handleSaveBarber = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingBarber) return;
      
      // Validation: Name is strictly required
      if (!editingBarber.name || editingBarber.name.trim() === '') {
          alert("O nome do barbeiro é obrigatório.");
          return;
      }
      
      const barberPayload = {
          name: editingBarber.name,
          specialties: editingBarber.specialties || [],
          avatar: editingBarber.avatar || 'https://cdn-icons-png.flaticon.com/512/3655/3655583.png',
          // Ensure valid numbers, default to safe values
          rating: editingBarber.rating ? Number(editingBarber.rating) : 5.0,
          commissionRate: editingBarber.commissionRate !== undefined ? Number(editingBarber.commissionRate) : 0.5,
          // Ensure integer for postgres (remove decimals)
          experienceYears: editingBarber.experienceYears ? Math.floor(Number(editingBarber.experienceYears)) : 0,
          // String fallbacks
          username: editingBarber.username || '',
          password: editingBarber.password || '',
          shiftStart: editingBarber.shiftStart || '09:00',
          shiftEnd: editingBarber.shiftEnd || '18:00',
          breakStart: editingBarber.breakStart || '',
          breakEnd: editingBarber.breakEnd || '',
          bio: editingBarber.bio || ''
      };

      try {
          if (editingBarber.id) {
              await updateBarber(editingBarber.id, barberPayload);
          } else {
              await addBarber(barberPayload);
          }
          setIsBarberModalOpen(false);
          setEditingBarber(null);
      } catch (error) {
          console.error("Failed to save barber:", error);
          alert("Erro ao salvar dados. Verifique a conexão com o banco de dados.");
      }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newAnnouncementData.title || !newAnnouncementData.message) return;
      await addAnnouncement({
          title: newAnnouncementData.title,
          message: newAnnouncementData.message,
          active: true
      });
      setIsAnnouncementModalOpen(false);
      setNewAnnouncementData({ title: '', message: '' });
  };

  const handleAddTransaction = async (type: 'REVENUE' | 'EXPENSE') => {
      if (!newTransaction.description || !newTransaction.amount) return;

      if (type === 'REVENUE') {
          await addRevenue({
              description: newTransaction.description,
              amount: Number(newTransaction.amount),
              category: (newTransaction.category as any) || 'OTHER',
              date: new Date().toISOString()
          });
          setIsRevenueModalOpen(false);
      } else {
          await addExpense({
              description: newTransaction.description,
              amount: Number(newTransaction.amount),
              category: (newTransaction.category as any) || 'OTHER',
              date: new Date().toISOString()
          });
          setIsExpenseModalOpen(false);
      }
      setNewTransaction({ description: '', amount: '', category: '' });
  };

  const handleConfirmSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Verify Password
      if (securityPassword !== config.adminPassword) {
          alert("Senha incorreta! As alterações não foram salvas.");
          return;
      }

      await updateConfig(settingsForm);
      setIsSecurityModalOpen(false);
      setSecurityPassword('');
      alert('Configurações salvas com sucesso!');
  };

  const toggleDay = (dayId: number) => {
      setSettingsForm(prev => {
          const currentDays = prev.openDays || [];
          const newDays = currentDays.includes(dayId)
              ? currentDays.filter(d => d !== dayId)
              : [...currentDays, dayId].sort();
          return { ...prev, openDays: newDays };
      });
  };

  // -- Render Helpers --
  const TabButton = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left font-bold ${
        activeTab === id 
          ? 'bg-gold-500 text-slate-900 shadow-lg shadow-gold-500/10' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-100px)]">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sticky top-24">
           {/* Mobile Menu Toggle */}
           <button 
             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
             className="md:hidden w-full flex items-center justify-between text-white font-bold p-2 mb-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
           >
             <div className="flex items-center gap-2">
               <Menu size={20} className="text-gold-500" />
               <span>MENU DO PAINEL</span>
             </div>
             {isMobileMenuOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
           </button>

           {/* Menu Items Container - Hidden on mobile unless open, always visible on desktop */}
           <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block space-y-2 animate-fade-in`}>
               <TabButton id="OVERVIEW" icon={LayoutDashboard} label="Visão Geral" />
               <TabButton id="APPOINTMENTS" icon={Calendar} label="Agenda" />
               <TabButton id="BARBERS" icon={Users} label="Profissionais" />
               <TabButton id="SERVICES" icon={Scissors} label="Serviços" />
               <TabButton id="PRODUCTS" icon={ShoppingBag} label="Produtos" />
                <TabButton id="FINANCE" icon={DollarSign} label="Financeiro" />
                <TabButton id="CAIXA" icon={Wallet} label="Caixa" />
                <TabButton id="ANNOUNCEMENTS" icon={Megaphone} label="Avisos" />
               <TabButton id="SETTINGS" icon={Settings} label="Configurações" />
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">
        
        {/* VIEW: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
           <div className="grid gap-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                      <div className="text-slate-400 text-xs font-bold uppercase mb-1">Faturamento Total</div>
                      <div className="text-2xl font-bold text-green-500">R$ {grandTotalRevenue.toFixed(2)}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                      <div className="text-slate-400 text-xs font-bold uppercase mb-1">Hoje</div>
                      <div className="text-2xl font-bold text-white">R$ {grandTotalToday.toFixed(2)}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                      <div className="text-slate-400 text-xs font-bold uppercase mb-1">Pendentes</div>
                      <div className="text-2xl font-bold text-gold-500">{totalPending}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                      <div className="text-slate-400 text-xs font-bold uppercase mb-1">Profissionais</div>
                      <div className="text-2xl font-bold text-white">{barbers.length}</div>
                  </div>
              </div>

              {/* Recent Activity / Simple List */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Clock size={18} /> Últimos Agendamentos</h3>
                  <div className="space-y-3">
                      {appointments.slice(-5).reverse().map(apt => (
                          <div key={apt.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                              <div>
                                  <div className="font-bold text-white">{apt.clientName}</div>
                                  <div className="text-xs text-slate-400">
                                      {new Date(apt.date).toLocaleDateString()} - {services.find(s => s.id === apt.serviceId)?.name}
                                  </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded font-bold ${
                                  apt.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 
                                  apt.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-slate-700 text-slate-400'
                              }`}>
                                  {apt.status}
                              </span>
                          </div>
                      ))}
                  </div>
              </div>
           </div>
        )}

        {/* ... (Keep existing views for APPOINTMENTS, SERVICES, PRODUCTS, FINANCE, ANNOUNCEMENTS, SETTINGS) ... */}
        {/* The rest of the file content is assumed to be unchanged, but I must return the full file as per instructions. */}
        {/* I will paste the rest of the component content below to ensure full file integrity */}

        {/* VIEW: APPOINTMENTS (AGENDA) */}
        {activeTab === 'APPOINTMENTS' && (
           <div className="animate-fade-in space-y-6">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                   <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                       <Calendar size={24} className="text-slate-400" /> Agenda Completa
                   </h2>
                   <div className="text-xs text-slate-500 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                       {filteredAppointments.length} agendamentos listados
                   </div>
               </div>

               {/* Filters Bar */}
               <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-end">
                   <div className="w-full md:flex-1">
                       <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                           <Calendar size={12} /> Filtrar Data
                       </label>
                       <input 
                           type="date" 
                           value={filterDate}
                           onChange={(e) => setFilterDate(e.target.value)}
                           className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-gold-500"
                       />
                   </div>
                   <div className="w-full md:flex-1">
                       <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                           <Users size={12} /> Filtrar Profissional
                       </label>
                       <select 
                           value={filterBarberId}
                           onChange={(e) => setFilterBarberId(e.target.value)}
                           className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-gold-500"
                       >
                           <option value="ALL">Todos os Profissionais</option>
                           {barbers.map(b => (
                               <option key={b.id} value={b.id}>{b.name}</option>
                           ))}
                       </select>
                   </div>
                   {(filterDate || filterBarberId !== 'ALL') && (
                       <button 
                           onClick={() => { setFilterDate(''); setFilterBarberId('ALL'); }}
                           className="w-full md:w-auto px-4 py-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-500 border border-slate-700 rounded-lg text-xs font-bold transition-colors h-[38px] flex items-center justify-center gap-2"
                       >
                           <X size={14} /> Limpar
                       </button>
                   )}
               </div>

               <div className="grid gap-4">
                   {filteredAppointments.length === 0 ? (
                       <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                           <Calendar size={48} className="mx-auto text-slate-600 mb-4 opacity-50" />
                           <p className="text-slate-500">Nenhum agendamento encontrado para os filtros selecionados.</p>
                       </div>
                   ) : (
                       filteredAppointments
                       .map(apt => {
                           const barber = barbers.find(b => b.id === apt.barberId);
                           const service = services.find(s => s.id === apt.serviceId);
                           const aptProducts = products.filter(p => apt.productIds?.includes(p.id));
                           const dateObj = new Date(apt.date);
                           const isToday = new Date().toDateString() === dateObj.toDateString();

                           return (
                               <div key={apt.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 hover:border-slate-700 transition-colors flex flex-col md:flex-row gap-4 md:gap-6 relative overflow-hidden group">
                                   <div className={`absolute left-0 top-0 bottom-0 w-1 md:w-1.5 ${
                                       apt.status === 'COMPLETED' ? 'bg-green-500' : 
                                       apt.status === 'IN_PROGRESS' ? 'bg-blue-500 animate-pulse' : 
                                       apt.status === 'CANCELLED' ? 'bg-red-500' : 'bg-gold-500'
                                   }`}></div>

                                   <div className="flex flex-row md:flex-col items-center md:items-center justify-between md:justify-start gap-3 md:gap-1 pl-3 md:pl-4">
                                       <div className="flex items-center gap-3 md:flex-col md:gap-1">
                                           <div className={`text-xl md:text-2xl font-black ${isToday ? 'text-white' : 'text-slate-500'}`}>
                                               {dateObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                           </div>
                                           <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase bg-slate-800 px-2 py-0.5 rounded text-center">
                                               {dateObj.toLocaleDateString()}
                                           </div>
                                       </div>
                                       
                                       <div className="md:hidden">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                                               apt.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                               apt.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                               apt.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                               'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                           }`}>
                                               {apt.status === 'IN_PROGRESS' ? 'Executando' : 
                                                apt.status === 'PENDING' ? 'Agendado' : 
                                                apt.status === 'COMPLETED' ? 'Finalizado' : 'Cancelado'}
                                           </span>
                                       </div>
                                   </div>

                                   <div className="flex-1 space-y-2 pl-3 md:pl-0 border-l-2 border-slate-800 md:border-l-0 md:border-none">
                                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-2">
                                           <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                                               {apt.clientName}
                                               {apt.status === 'IN_PROGRESS' && (
                                                   <span className="hidden md:inline-block text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">Em Andamento</span>
                                               )}
                                           </h3>
                                           <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400 bg-slate-800/50 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-slate-700/50 w-fit">
                                               <img src={barber?.avatar} className="w-4 h-4 md:w-5 md:h-5 rounded-full object-cover" alt="" />
                                               <span>{barber?.name}</span>
                                           </div>
                                       </div>

                                       <div className="flex flex-col gap-1">
                                           <div className="flex items-center gap-2 text-slate-300 text-sm">
                                               <Scissors size={14} className="text-gold-500" />
                                               <span className="font-medium">{service?.name}</span>
                                           </div>
                                           
                                           {aptProducts.length > 0 && (
                                               <div className="flex items-start gap-2 mt-1">
                                                   <Package size={14} className="text-purple-400 mt-0.5" />
                                                   <div className="flex flex-wrap gap-1">
                                                       {aptProducts.map(p => (
                                                           <span key={p.id} className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
                                                               + {p.name}
                                                           </span>
                                                       ))}
                                                   </div>
                                               </div>
                                           )}
                                       </div>
                                   </div>

                                   <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 pl-3 md:pl-0">
                                       <div className="flex justify-between w-full md:w-auto md:block text-right">
                                           <div className="text-xs text-slate-500 uppercase font-bold md:mb-1">Total</div>
                                           <div className="text-lg md:text-xl font-bold text-white">R$ {apt.totalPrice.toFixed(2)}</div>
                                       </div>
                                       
                                       <div className="hidden md:block">
                                           <span className={`px-3 py-1 rounded text-xs font-bold uppercase border ${
                                               apt.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                               apt.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                               apt.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                               'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                           }`}>
                                               {apt.status === 'IN_PROGRESS' ? 'Executando' : 
                                                apt.status === 'PENDING' ? 'Agendado' : 
                                                apt.status === 'COMPLETED' ? 'Finalizado' : 'Cancelado'}
                                           </span>
                                       </div>
                                   </div>
                               </div>
                           );
                       })
                   )}
               </div>
           </div>
        )}

        {/* VIEW: BARBERS */}
        {activeTab === 'BARBERS' && (
           <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Profissionais</h2>
                  <button 
                    onClick={() => { setEditingBarber({}); setIsBarberModalOpen(true); }}
                    className="bg-gold-500 hover:bg-gold-400 text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                  >
                      <Plus size={18} /> Novo Barbeiro
                  </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {barbers.map(barber => (
                      <div key={barber.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 group hover:border-slate-600 transition-all">
                          <div className="flex items-start gap-4 mb-4">
                              <img src={barber.avatar} alt={barber.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-700" />
                              <div>
                                  <h3 className="font-bold text-white">{barber.name}</h3>
                                  <div className="text-xs text-slate-400 mt-1">
                                      {barber.specialties.slice(0, 2).join(', ')}
                                      {barber.specialties.length > 2 && '...'}
                                  </div>
                                  <div className="flex items-center gap-1 mt-2 text-gold-500 text-xs font-bold">
                                      <Star size={12} fill="currentColor" /> {barber.rating}
                                  </div>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-4">
                              <button 
                                onClick={() => setViewBarberId(barber.id)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                  Detalhes
                              </button>
                              <button 
                                onClick={() => { setEditingBarber(barber); setIsBarberModalOpen(true); }}
                                className="bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                  Editar
                              </button>
                          </div>
                          <button 
                            onClick={() => deleteBarber(barber.id)}
                            className="w-full py-2 flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
                          >
                              <Trash2 size={14} /> Remover
                          </button>
                      </div>
                  ))}
              </div>
           </div>
        )}

        {/* VIEW: SERVICES */}
        {activeTab === 'SERVICES' && (
           <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Serviços</h2>
                  <button 
                    onClick={() => { setEditingService({}); setIsServiceModalOpen(true); }}
                    className="bg-gold-500 hover:bg-gold-400 text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                  >
                      <Plus size={18} /> Novo Serviço
                  </button>
              </div>
              <div className="space-y-3">
                  {services.map(s => (
                      <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition-colors">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-800 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                                  {s.image ? (
                                      <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                                  ) : (
                                      <Scissors size={20} className="text-slate-400" />
                                  )}
                              </div>
                              <div>
                                  <h3 className="font-bold text-white">{s.name}</h3>
                                  <p className="text-xs text-slate-500">{s.durationMinutes} min • {s.description}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-6">
                              <span className="font-bold text-gold-500">R$ {s.price.toFixed(2)}</span>
                              <div className="flex items-center gap-2">
                                  <button onClick={() => { setEditingService(s); setIsServiceModalOpen(true); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                                      <Edit size={16} />
                                  </button>
                                  <button onClick={() => deleteService(s.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
           </div>
        )}

         {/* VIEW: PRODUCTS */}
         {activeTab === 'PRODUCTS' && (
           <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Produtos</h2>
                  <button 
                    onClick={() => { setEditingProduct({}); setIsProductModalOpen(true); }}
                    className="bg-gold-500 hover:bg-gold-400 text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                  >
                      <Plus size={18} /> Novo Produto
                  </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map(p => (
                      <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 group">
                          <div className="flex gap-4 mb-3">
                              <div className="w-16 h-16 bg-slate-800 rounded-lg flex-shrink-0">
                                  {p.image && <img src={p.image} className="w-full h-full object-cover rounded-lg" />}
                              </div>
                              <div>
                                  <h3 className="font-bold text-white line-clamp-1">{p.name}</h3>
                                  <div className="text-xs text-slate-500 mb-1">{p.category}</div>
                                  <div className="text-gold-500 font-bold">R$ {p.price.toFixed(2)}</div>
                              </div>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                              <span className={`text-xs font-bold ${p.stock < 5 ? 'text-red-500' : 'text-green-500'}`}>
                                  Estoque: {p.stock}
                              </span>
                              <div className="flex gap-2">
                                  <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="text-slate-400 hover:text-white">
                                      <Edit size={16} />
                                  </button>
                                  <button onClick={() => deleteProduct(p.id)} className="text-slate-400 hover:text-red-500">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
           </div>
        )}

        {/* VIEW: FINANCE */}
        {activeTab === 'FINANCE' && (
           <div className="animate-fade-in space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-end">
                   <div className="w-full md:flex-1">
                       <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                           <Filter size={12} /> Data Início
                       </label>
                       <input 
                           type="date" 
                           value={financeStartDate}
                           onChange={(e) => setFinanceStartDate(e.target.value)}
                           className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-gold-500"
                       />
                   </div>
                   <div className="w-full md:flex-1">
                       <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                           <Filter size={12} /> Data Fim
                       </label>
                       <input 
                           type="date" 
                           value={financeEndDate}
                           onChange={(e) => setFinanceEndDate(e.target.value)}
                           className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-gold-500"
                       />
                   </div>
                   {(financeStartDate || financeEndDate) && (
                       <button 
                           onClick={() => { setFinanceStartDate(''); setFinanceEndDate(''); }}
                           className="w-full md:w-auto px-4 py-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-500 border border-slate-700 rounded-lg text-xs font-bold transition-colors h-[38px] flex items-center justify-center gap-2"
                       >
                           <X size={14} /> Limpar
                       </button>
                   )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                          <ArrowUpRight size={48} className="text-green-500" />
                      </div>
                      <div className="relative z-10">
                          <p className="text-slate-400 text-xs font-bold uppercase mb-1">Entradas Totais</p>
                          <h3 className="text-2xl font-bold text-green-500">R$ {financeGrandTotal.toFixed(2)}</h3>
                          <div className="flex flex-col gap-1 text-[10px] text-slate-500 mt-2">
                             <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                                <span>Serviços Atendidos:</span>
                                <span className="text-green-500 font-bold">R$ {financeServiceTotal.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between items-center pt-1">
                                <span>Produtos & Extras:</span>
                                <span className="text-blue-500 font-bold">R$ {financeRevenueTotal.toFixed(2)}</span>
                             </div>
                          </div>
                      </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                          <ArrowDownLeft size={48} className="text-red-500" />
                      </div>
                      <div className="relative z-10">
                          <p className="text-slate-400 text-xs font-bold uppercase mb-1">Saídas / Despesas</p>
                          <h3 className="text-2xl font-bold text-red-500">R$ {financeExpenseTotal.toFixed(2)}</h3>
                          <p className="text-[10px] text-slate-500 mt-2">Custos fixos, variáveis e comissões no período.</p>
                      </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                          <PieChart size={48} className="text-gold-500" />
                      </div>
                      <div className="relative z-10">
                          <p className="text-slate-400 text-xs font-bold uppercase mb-1">Saldo Líquido</p>
                          <h3 className={`text-2xl font-bold ${financeNetBalance >= 0 ? 'text-gold-500' : 'text-red-500'}`}>
                             R$ {financeNetBalance.toFixed(2)}
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-2">Resultado operacional do período selecionado.</p>
                      </div>
                  </div>
              </div>

              {pendingCommissions.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Wallet size={18} className="text-gold-500" /> Comissões Pendentes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingCommissions.map(({ barber, count, totalGenerated, commissionToPay }) => (
                            <div key={barber.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-gold-500/50 transition-colors">
                                <div className="flex items-center gap-3 mb-3 border-b border-slate-700 pb-3">
                                    <img src={barber.avatar} className="w-10 h-10 rounded-full object-cover" alt={barber.name} />
                                    <div>
                                        <div className="font-bold text-white text-sm">{barber.name}</div>
                                        <div className="text-xs text-slate-400">{count} cortes pendentes</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end mb-3">
                                    <div className="text-xs text-slate-500">
                                        Gerado: R$ {totalGenerated.toFixed(2)}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gold-500 font-bold uppercase">A Pagar</div>
                                        <div className="text-xl font-bold text-white">R$ {commissionToPay.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => handlePayCommission(barber.id, 'PIX')}
                                        className="bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <Banknote size={14} /> PIX
                                    </button>
                                    <button 
                                        onClick={() => handlePayCommission(barber.id, 'CASH')}
                                        className="bg-green-600 hover:bg-green-500 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-lg shadow-green-900/20"
                                    >
                                        <DollarSign size={14} /> Dinheiro
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-6">
                  
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-full">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-white flex items-center gap-2">
                              <ArrowUpRight size={18} className="text-green-500" /> Receitas Extras
                          </h4>
                          <button 
                            onClick={() => setIsRevenueModalOpen(true)}
                            className="bg-green-500/10 hover:bg-green-500/20 text-green-500 text-xs font-bold px-3 py-1.5 rounded-lg border border-green-500/20 transition-colors"
                          >
                              + Adicionar
                          </button>
                      </div>
                      <div className="overflow-y-auto max-h-[300px] custom-scrollbar space-y-2">
                           {filteredFinanceRevenues.length === 0 ? (
                               <p className="text-center text-slate-500 text-sm py-4">Nenhuma receita extra encontrada no período.</p>
                           ) : (
                               filteredFinanceRevenues.map(rev => (
                                   <div key={rev.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center group hover:bg-slate-800 transition-colors">
                                       <div>
                                           <div className="text-sm font-bold text-white">{rev.description}</div>
                                           <div className="text-[10px] text-slate-500">
                                               {new Date(rev.date).toLocaleDateString()} • {rev.category}
                                           </div>
                                       </div>
                                       <div className="flex items-center gap-3">
                                           <span className="text-green-500 font-bold text-sm">+ R$ {rev.amount.toFixed(2)}</span>
                                           <button onClick={() => deleteRevenue(rev.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                               <Trash2 size={14} />
                                           </button>
                                       </div>
                                   </div>
                               ))
                           )}
                      </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-full">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-white flex items-center gap-2">
                              <ArrowDownLeft size={18} className="text-red-500" /> Despesas
                          </h4>
                          <button 
                            onClick={() => setIsExpenseModalOpen(true)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors"
                          >
                              + Adicionar
                          </button>
                      </div>
                      <div className="overflow-y-auto max-h-[300px] custom-scrollbar space-y-2">
                           {filteredFinanceExpenses.length === 0 ? (
                               <p className="text-center text-slate-500 text-sm py-4">Nenhuma despesa encontrada no período.</p>
                           ) : (
                               filteredFinanceExpenses.map(exp => (
                                   <div key={exp.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center group hover:bg-slate-800 transition-colors">
                                       <div>
                                           <div className="text-sm font-bold text-white">{exp.description}</div>
                                           <div className="text-[10px] text-slate-500">
                                               {new Date(exp.date).toLocaleDateString()} • {exp.category}
                                           </div>
                                       </div>
                                       <div className="flex items-center gap-3">
                                           <span className="text-red-500 font-bold text-sm">- R$ {exp.amount.toFixed(2)}</span>
                                           <button onClick={() => deleteExpense(exp.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                               <Trash2 size={14} />
                                           </button>
                                       </div>
                                   </div>
                               ))
                           )}
                      </div>
                  </div>

              </div>
           </div>
        )}

        {/* VIEW: CAIXA */}
        {activeTab === 'CAIXA' && (
           <CaixaView 
             services={services}
             barbers={barbers}
             appointments={appointments}
             expenses={expenses}
             revenues={revenues}
             addExpense={addExpense}
             addRevenue={addRevenue}
           />
        )}

        {/* VIEW: ANNOUNCEMENTS */}
        {activeTab === 'ANNOUNCEMENTS' && (
           <div className="animate-fade-in">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                       <Megaphone size={24} className="text-gold-500" /> Gerenciar Avisos
                   </h2>
                   <button 
                     onClick={() => setIsAnnouncementModalOpen(true)}
                     className="bg-gold-500 hover:bg-gold-400 text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-gold-900/20"
                   >
                       <Plus size={18} /> Novo Aviso
                   </button>
               </div>

               <div className="grid gap-4">
                   {announcements.length === 0 ? (
                       <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                           <Megaphone size={48} className="mx-auto text-slate-600 mb-4 opacity-50" />
                           <p className="text-slate-500">Nenhum aviso cadastrado. Crie um para exibir na tela inicial dos clientes.</p>
                       </div>
                   ) : (
                       announcements.map(ann => (
                           <div key={ann.id} className={`bg-slate-900 border ${ann.active ? 'border-gold-500/30' : 'border-slate-800'} rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group transition-all`}>
                               <div className="flex-1">
                                   <div className="flex items-center gap-2 mb-1">
                                       <h3 className={`text-lg font-bold ${ann.active ? 'text-white' : 'text-slate-500'}`}>{ann.title}</h3>
                                       {ann.active ? (
                                           <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded border border-green-500/20 font-bold uppercase">Ativo</span>
                                       ) : (
                                           <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-700 font-bold uppercase">Inativo</span>
                                       )}
                                   </div>
                                   <p className={`text-sm ${ann.active ? 'text-slate-300' : 'text-slate-600'}`}>{ann.message}</p>
                                   <div className="text-[10px] text-slate-600 mt-2">Criado em: {new Date(ann.createdAt).toLocaleDateString()}</div>
                               </div>
                               
                               <div className="flex items-center gap-3 w-full md:w-auto">
                                   <button 
                                       onClick={() => toggleAnnouncement(ann.id)}
                                       className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                           ann.active 
                                           ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/20' 
                                           : 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20'
                                       }`}
                                   >
                                       {ann.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                       {ann.active ? 'Desativar' : 'Ativar'}
                                   </button>
                                   <button 
                                       onClick={() => deleteAnnouncement(ann.id)}
                                       className="p-2 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                       title="Excluir"
                                   >
                                       <Trash2 size={18} />
                                   </button>
                               </div>
                           </div>
                       ))
                   )}
               </div>
           </div>
        )}

        {/* VIEW: SETTINGS */}
        {activeTab === 'SETTINGS' && (
           <div className="max-w-4xl mx-auto animate-fade-in pb-12">
               <div className="flex items-center justify-between mb-8">
                   <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                       <Settings size={28} className="text-slate-400" /> 
                       Configurações do Sistema
                   </h2>
                   <div className="flex gap-3">
                       <button onClick={() => { if(window.confirm('Isso irá popular o banco de dados com dados de exemplo. Continuar?')) seedDatabase(); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700 transition-colors">
                           Popular Banco
                       </button>
                       <button onClick={() => setIsSecurityModalOpen(true)} className="px-6 py-2 bg-gold-500 hover:bg-gold-400 text-slate-900 font-bold rounded-lg shadow-lg shadow-gold-500/20 transition-colors flex items-center gap-2">
                           <Save size={18} /> Salvar Tudo
                       </button>
                   </div>
               </div>

               <div className="grid gap-8">
                   {/* 1. Appearance & Branding */}
                   <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                       <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                           <ImageIcon size={20} className="text-gold-500" /> Identidade Visual
                       </h3>
                       <div className="flex flex-col md:flex-row gap-8">
                           {/* Logo Upload */}
                           <div className="flex-shrink-0 flex flex-col items-center gap-3">
                               <div className="relative group w-32 h-32 rounded-full overflow-hidden bg-slate-800 border-4 border-slate-700 hover:border-gold-500 transition-colors">
                                   {settingsForm.logo ? (
                                       <img src={settingsForm.logo} alt="Logo" className="w-full h-full object-cover" />
                                   ) : (
                                       <div className="w-full h-full flex items-center justify-center text-slate-600">
                                           <ImageIcon size={32} />
                                       </div>
                                   )}
                                   <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                       {uploadingLogo ? (
                                           <Loader className="animate-spin text-white" />
                                       ) : (
                                           <>
                                               <Upload className="text-white mb-1" size={24} />
                                               <span className="text-[10px] text-white font-bold uppercase">Alterar</span>
                                           </>
                                       )}
                                       <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                   </label>
                               </div>
                               <span className="text-xs text-slate-500 font-bold uppercase">Logo da Barbearia</span>
                           </div>

                           {/* Main Info */}
                           <div className="flex-1 space-y-4">
                               <div>
                                   <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Nome do Estabelecimento</label>
                                   <input 
                                       type="text" 
                                       value={settingsForm.name} 
                                       onChange={(e) => setSettingsForm({...settingsForm, name: e.target.value})}
                                       className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500" 
                                   />
                               </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <div>
                                       <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Cor Primária (Hex)</label>
                                       <div className="flex gap-2">
                                           <input 
                                               type="color" 
                                               value={settingsForm.primaryColor} 
                                               onChange={(e) => setSettingsForm({...settingsForm, primaryColor: e.target.value})}
                                               className="h-11 w-12 bg-slate-800 border border-slate-700 rounded-lg p-1 cursor-pointer"
                                           />
                                           <input 
                                               type="text" 
                                               value={settingsForm.primaryColor} 
                                               onChange={(e) => setSettingsForm({...settingsForm, primaryColor: e.target.value})}
                                               className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500 font-mono" 
                                           />
                                       </div>
                                   </div>
                               </div>
                           </div>
                       </div>
                   </section>

                   {/* 2. Contact & Location */}
                   <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                       <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                           <MapPin size={20} className="text-gold-500" /> Contato e Localização
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="md:col-span-2">
                               <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Endereço Completo</label>
                               <input 
                                   type="text" 
                                   value={settingsForm.address} 
                                   onChange={(e) => setSettingsForm({...settingsForm, address: e.target.value})}
                                   className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500" 
                               />
                           </div>
                           <div>
                               <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Telefone Fixo</label>
                               <input 
                                   type="text" 
                                   value={settingsForm.phone} 
                                   onChange={(e) => setSettingsForm({...settingsForm, phone: e.target.value})}
                                   className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500" 
                               />
                           </div>
                           <div>
                               <label className="block text-xs text-slate-500 font-bold uppercase mb-1">WhatsApp (Apenas Números)</label>
                               <input 
                                   type="text" 
                                   value={settingsForm.whatsapp} 
                                   onChange={(e) => setSettingsForm({...settingsForm, whatsapp: e.target.value})}
                                   className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500" 
                               />
                           </div>
                       </div>
                   </section>

                   {/* 3. Operation Hours */}
                   <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                       <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                           <Clock size={20} className="text-gold-500" /> Horário de Funcionamento
                       </h3>
                       <div className="grid grid-cols-2 gap-6">
                           {/* Days of Week Selection */}
                           <div className="col-span-2 mb-2">
                                <label className="block text-xs text-slate-500 font-bold uppercase mb-3 flex items-center gap-2">
                                    <CalendarDays size={14} /> Dias de Funcionamento
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_OF_WEEK.map((day) => {
                                        const isOpen = settingsForm.openDays?.includes(day.id);
                                        return (
                                            <button
                                                key={day.id}
                                                type="button"
                                                onClick={() => toggleDay(day.id)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                                    isOpen
                                                    ? 'bg-green-500/20 text-green-500 border-green-500/30 shadow-lg shadow-green-900/20'
                                                    : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
                                                }`}
                                            >
                                                {day.label}
                                            </button>
                                        )
                                    })}
                                </div>
                           </div>

                           <div>
                               <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Abertura (Hora)</label>
                               <input 
                                   type="number" 
                                   min="0" max="23"
                                   value={settingsForm.openingHour} 
                                   onChange={(e) => setSettingsForm({...settingsForm, openingHour: Number(e.target.value)})}
                                   className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500" 
                               />
                           </div>
                           <div>
                               <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Fechamento (Hora)</label>
                               <input 
                                   type="number" 
                                   min="0" max="23"
                                   value={settingsForm.closingHour} 
                                   onChange={(e) => setSettingsForm({...settingsForm, closingHour: Number(e.target.value)})}
                                   className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500" 
                               />
                           </div>
                       </div>
                   </section>

                   {/* 4. Access Credentials */}
                   <section className="bg-slate-900 border border-red-900/30 rounded-2xl p-6">
                       <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-3 text-red-400">
                           <Lock size={20} /> Acesso Administrativo
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                               <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Usuário Admin</label>
                               <input 
                                   type="text" 
                                   value={settingsForm.adminUsername} 
                                   onChange={(e) => setSettingsForm({...settingsForm, adminUsername: e.target.value})}
                                   className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-500" 
                               />
                           </div>
                           <div>
                               <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Senha Admin</label>
                               <input 
                                   type="password" 
                                   value={settingsForm.adminPassword} 
                                   onChange={(e) => setSettingsForm({...settingsForm, adminPassword: e.target.value})}
                                   className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-500" 
                               />
                           </div>
                       </div>
                   </section>

                   {/* 5. System Diagnosis */}
                   <section className="bg-slate-900 border border-blue-900/30 rounded-2xl p-6">
                       <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-3 text-blue-400">
                           <Database size={20} /> Diagnóstico de Sistema
                       </h3>
                       <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-white mb-1">Verificar Conexão Supabase</h4>
                                <p className="text-xs text-slate-400 max-w-sm">Teste se as credenciais e o banco de dados estão configurados e acessíveis.</p>
                            </div>
                            <button 
                                onClick={handleTestConnection}
                                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-4 py-2 rounded-lg font-bold border border-blue-500/30 flex items-center gap-2 transition-colors"
                            >
                                <Wifi size={16} /> Testar Conexão
                            </button>
                       </div>
                   </section>
               </div>
           </div>
        )}

      </div>

      {/* --- MODALS --- */}

      {/* Barber Details Modal */}
      {viewBarberId && viewingBarberData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setViewBarberId(null)}></div>
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl relative shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fade-in">
                  
                  {/* Premium Banner Header */}
                  <div className="h-32 md:h-40 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                      <button 
                        onClick={() => setViewBarberId(null)} 
                        className="absolute top-4 right-4 bg-black/30 hover:bg-red-500/80 text-white p-2 rounded-full transition-all z-20 backdrop-blur-sm"
                      >
                        <X size={20} />
                      </button>
                  </div>

                  {/* Profile Header Info */}
                  <div className="px-4 md:px-8 -mt-12 md:-mt-16 flex flex-col md:flex-row items-end md:items-end gap-4 md:gap-6 relative z-10 mb-6 md:mb-8">
                      <div className="relative group">
                          <img 
                            src={viewingBarberData.barber.avatar} 
                            alt={viewingBarberData.barber.name} 
                            className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-slate-900 object-cover shadow-2xl group-hover:scale-105 transition-transform" 
                          />
                          <div className="absolute bottom-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-green-500 border-4 border-slate-900 rounded-full"></div>
                      </div>
                      
                      <div className="flex-1 pb-1 w-full md:w-auto">
                          <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">{viewingBarberData.barber.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2">
                              <span className="text-xs md:text-sm text-slate-400 font-medium">@{viewingBarberData.barber.username || 'user'}</span>
                              <span className="w-1 h-1 bg-slate-600 rounded-full hidden md:block"></span>
                              <div className="flex items-center gap-1 bg-gold-500/10 border border-gold-500/20 px-2 py-0.5 rounded text-gold-500 text-[10px] md:text-xs font-bold uppercase">
                                  <Star size={12} fill="currentColor" /> {viewingBarberData.barber.rating}
                              </div>
                              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-400 text-[10px] md:text-xs font-bold uppercase">
                                  <Briefcase size={12} /> {(viewingBarberData.barber.commissionRate * 100)}% Comissão
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="overflow-y-auto px-4 md:px-8 pb-8 space-y-6 md:space-y-8 custom-scrollbar">
                      
                      {/* Stats Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                          <div className="bg-slate-800/50 p-4 md:p-5 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Scissors size={18} className="md:w-5 md:h-5" /></div>
                              </div>
                              <p className="text-xl md:text-2xl font-bold text-white">{viewingBarberData.totalServices}</p>
                              <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">Serviços Realizados</p>
                          </div>

                          <div className="bg-slate-800/50 p-4 md:p-5 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                  <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><TrendingUp size={18} className="md:w-5 md:h-5" /></div>
                              </div>
                              <p className="text-xl md:text-2xl font-bold text-white">R$ {viewingBarberData.totalGenerated.toFixed(2)}</p>
                              <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">Faturamento Total</p>
                          </div>

                          <div className="bg-slate-800/50 p-4 md:p-5 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                  <div className="p-2 bg-gold-500/10 rounded-lg text-gold-500"><Wallet size={18} className="md:w-5 md:h-5" /></div>
                              </div>
                              <p className="text-xl md:text-2xl font-bold text-gold-500">R$ {viewingBarberData.totalCommission.toFixed(2)}</p>
                              <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">Comissão Acumulada</p>
                          </div>

                          <div className="bg-slate-800/50 p-4 md:p-5 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><CheckCircle size={18} className="md:w-5 md:h-5" /></div>
                              </div>
                              <p className="text-xl md:text-2xl font-bold text-white">R$ {viewingBarberData.totalPaidCommission.toFixed(2)}</p>
                              <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">Já Pago</p>
                          </div>
                      </div>

                      {/* Content Split */}
                      <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
                          
                          {/* Appointment History */}
                          <div className="flex flex-col h-full">
                              <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                                      <Calendar size={18} className="text-slate-400" />
                                      Histórico de Serviços
                                  </h4>
                                  <span className="text-[10px] md:text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">Últimos 50</span>
                              </div>
                              
                              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex-1 min-h-[300px] flex flex-col">
                                  <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[400px]">
                                      {viewingBarberData.apts.length === 0 ? (
                                          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8">
                                              <Scissors size={32} className="opacity-20 mb-2" />
                                              <p className="text-sm">Nenhum atendimento registrado.</p>
                                          </div>
                                      ) : (
                                          <table className="w-full text-left text-xs md:text-sm">
                                              <thead className="bg-slate-900/50 text-slate-500 font-bold uppercase text-[10px] md:text-xs sticky top-0 backdrop-blur-sm z-10">
                                                  <tr>
                                                      <th className="px-4 py-3">Data</th>
                                                      <th className="px-4 py-3">Cliente/Serviço</th>
                                                      <th className="px-4 py-3 text-right">Valor</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-700/50">
                                                  {viewingBarberData.apts.map(apt => (
                                                      <tr key={apt.id} className="hover:bg-slate-700/30 transition-colors group">
                                                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-[10px] md:text-xs">
                                                              {new Date(apt.date).toLocaleDateString()} <br/>
                                                              <span className="opacity-50">{new Date(apt.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                          </td>
                                                          <td className="px-4 py-3">
                                                              <div className="font-medium text-white">{apt.clientName}</div>
                                                              <div className="text-[10px] md:text-xs text-slate-500 truncate max-w-[120px] md:max-w-[150px]">
                                                                  {services.find(s => s.id === apt.serviceId)?.name}
                                                              </div>
                                                          </td>
                                                          <td className="px-4 py-3 text-right">
                                                              <div className="font-bold text-slate-200">R$ {apt.totalPrice.toFixed(0)}</div>
                                                              <div className="flex justify-end mt-1">
                                                                  <span className={`text-[9px] md:text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                                                    apt.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' :
                                                                    apt.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
                                                                    'bg-yellow-500/10 text-yellow-500'
                                                                  }`}>
                                                                      {apt.status === 'COMPLETED' ? 'OK' : apt.status.substring(0,3)}
                                                                  </span>
                                                              </div>
                                                          </td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      )}
                                  </div>
                              </div>
                          </div>

                          {/* Payment History */}
                          <div className="flex flex-col h-full">
                              <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                                      <DollarSign size={18} className="text-green-500" />
                                      Pagamentos Realizados
                                  </h4>
                                  <span className="text-[10px] md:text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">Extrato</span>
                              </div>

                              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex-1 min-h-[300px] flex flex-col">
                                  <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[400px]">
                                      {viewingBarberData.paidApts.length === 0 ? (
                                          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8">
                                              <Wallet size={32} className="opacity-20 mb-2" />
                                              <p className="text-sm">Nenhum pagamento registrado.</p>
                                          </div>
                                      ) : (
                                          <table className="w-full text-left text-xs md:text-sm">
                                              <thead className="bg-slate-900/50 text-slate-500 font-bold uppercase text-[10px] md:text-xs sticky top-0 backdrop-blur-sm z-10">
                                                  <tr>
                                                      <th className="px-4 py-3">Data</th>
                                                      <th className="px-4 py-3">Método</th>
                                                      <th className="px-4 py-3 text-right">Comissão Paga</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-700/50">
                                                  {viewingBarberData.paidApts.map(apt => (
                                                      <tr key={apt.id} className="hover:bg-slate-700/30 transition-colors">
                                                          <td className="px-4 py-3 text-slate-300 text-[10px] md:text-xs">
                                                              {new Date(apt.date).toLocaleDateString()}
                                                          </td>
                                                          <td className="px-4 py-3 text-slate-400 text-[10px] md:text-xs uppercase">
                                                              {apt.commissionPaymentMethod || 'PIX'}
                                                          </td>
                                                          <td className="px-4 py-3 text-right font-bold text-green-500">
                                                              R$ {(apt.totalPrice * viewingBarberData.barber.commissionRate).toFixed(2)}
                                                          </td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      )}
                                  </div>
                              </div>
                          </div>

                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Service Modal */}
      {isServiceModalOpen && editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-slate-800">
                <h3 className="text-xl font-bold text-white mb-4">
                    {editingService.id ? 'Editar Serviço' : 'Novo Serviço'}
                </h3>
                <form onSubmit={handleSaveService} className="space-y-4">
                    <input type="text" placeholder="Nome" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={editingService.name || ''} onChange={e => setEditingService({...editingService, name: e.target.value})} required />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Preço" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={editingService.price || ''} onChange={e => setEditingService({...editingService, price: Number(e.target.value)})} required />
                        <input type="number" placeholder="Minutos" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={editingService.durationMinutes || ''} onChange={e => setEditingService({...editingService, durationMinutes: Number(e.target.value)})} required />
                    </div>
                    <textarea placeholder="Descrição" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={editingService.description || ''} onChange={e => setEditingService({...editingService, description: e.target.value})} />
                    
                    {/* Enhanced Image Input - File Upload Version */}
                    <div>
                        <label className="block text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                            <ImageIcon size={12} /> Imagem do Serviço
                        </label>
                        <div className="flex flex-col gap-3">
                            {editingService.image ? (
                                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-700 group">
                                    <img src={editingService.image} className="w-full h-full object-cover" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            type="button"
                                            onClick={() => setEditingService({...editingService, image: ''})} 
                                            className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1"
                                        >
                                            <Trash2 size={14} /> Remover Imagem
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="w-full h-32 border-2 border-dashed border-slate-700 hover:border-gold-500 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-800/50 hover:bg-slate-800">
                                    {uploadingServiceImg ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader className="animate-spin text-gold-500" size={24} />
                                            <span className="text-xs text-gold-500 font-bold">Enviando...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-3 bg-slate-900 rounded-full mb-2">
                                                 <Upload size={20} className="text-gold-500" />
                                            </div>
                                            <span className="text-sm text-slate-400 font-bold">Clique para enviar imagem</span>
                                            <span className="text-xs text-slate-500 mt-1">JPG, PNG ou WEBP</span>
                                        </>
                                    )}
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleServiceImageUpload}
                                        disabled={uploadingServiceImg}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setIsServiceModalOpen(false)} className="flex-1 p-3 rounded-lg bg-slate-800 text-white">Cancelar</button>
                        <button type="submit" className="flex-1 p-3 rounded-lg bg-gold-500 text-slate-900 font-bold">Salvar</button>
                    </div>
                </form>
             </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-slate-800">
                <h3 className="text-xl font-bold text-white mb-4">
                    {editingProduct.id ? 'Editar Produto' : 'Novo Produto'}
                </h3>
                <form onSubmit={handleSaveProduct} className="space-y-4">
                    <input type="text" placeholder="Nome" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} required />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Preço" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} required />
                        <input type="number" placeholder="Estoque" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={editingProduct.stock || ''} onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})} required />
                    </div>
                    <input type="text" placeholder="Categoria" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} />
                    
                    {/* Enhanced Image Input - File Upload Version (Product) */}
                    <div>
                        <label className="block text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                            <ImageIcon size={12} /> Imagem do Produto
                        </label>
                        <div className="flex flex-col gap-3">
                            {editingProduct.image ? (
                                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-700 group">
                                    <img src={editingProduct.image} className="w-full h-full object-cover" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            type="button"
                                            onClick={() => setEditingProduct({...editingProduct, image: ''})} 
                                            className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1"
                                        >
                                            <Trash2 size={14} /> Remover Imagem
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="w-full h-32 border-2 border-dashed border-slate-700 hover:border-gold-500 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-800/50 hover:bg-slate-800">
                                    {uploadingProductImg ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader className="animate-spin text-gold-500" size={24} />
                                            <span className="text-xs text-gold-500 font-bold">Enviando...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-3 bg-slate-900 rounded-full mb-2">
                                                 <Upload size={20} className="text-gold-500" />
                                            </div>
                                            <span className="text-sm text-slate-400 font-bold">Clique para enviar imagem</span>
                                            <span className="text-xs text-slate-500 mt-1">JPG, PNG ou WEBP</span>
                                        </>
                                    )}
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleProductImageUpload}
                                        disabled={uploadingProductImg}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 p-3 rounded-lg bg-slate-800 text-white">Cancelar</button>
                        <button type="submit" className="flex-1 p-3 rounded-lg bg-gold-500 text-slate-900 font-bold">Salvar</button>
                    </div>
                </form>
             </div>
        </div>
      )}

      {/* Edit Barber Modal (Simplified) */}
      {isBarberModalOpen && editingBarber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-slate-800 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-white mb-4">
                    {editingBarber.id ? 'Editar Barbeiro' : 'Novo Barbeiro'}
                </h3>
                <form onSubmit={handleSaveBarber} className="space-y-4">
                    <input type="text" placeholder="Nome" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={editingBarber.name || ''} onChange={e => setEditingBarber({...editingBarber, name: e.target.value})} required />
                    
                    {/* Barber Image Upload */}
                    <div>
                        <label className="block text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                            <ImageIcon size={12} /> Foto do Perfil
                        </label>
                        <div className="flex items-center gap-4">
                            {/* Preview */}
                            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 flex-shrink-0 group">
                                {editingBarber.avatar ? (
                                    <img src={editingBarber.avatar} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                                        <User size={32} />
                                    </div>
                                )}
                                {/* Overlay for removing */}
                                {editingBarber.avatar && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button type="button" onClick={() => setEditingBarber({...editingBarber, avatar: ''})} className="text-red-500">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Upload Button */}
                            <label className="flex-1 cursor-pointer">
                                <div className="flex flex-col items-start gap-1 p-3 border border-dashed border-slate-700 rounded-lg hover:border-gold-500 hover:bg-slate-800 transition-colors">
                                    <span className="text-sm font-bold text-white flex items-center gap-2">
                                        {uploadingBarberImg ? <Loader className="animate-spin" size={16}/> : <Upload size={16} />}
                                        {uploadingBarberImg ? 'Enviando...' : 'Carregar Foto'}
                                    </span>
                                    <span className="text-xs text-slate-500">JPG, PNG ou WEBP (Max 2MB)</span>
                                </div>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleBarberImageUpload}
                                    disabled={uploadingBarberImg}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" step="0.01" placeholder="Comissão (0.0-1.0)" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={editingBarber.commissionRate || ''} onChange={e => setEditingBarber({...editingBarber, commissionRate: Number(e.target.value)})} required />
                        <input type="number" placeholder="Anos Exp." className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={editingBarber.experienceYears || ''} onChange={e => setEditingBarber({...editingBarber, experienceYears: Number(e.target.value)})} />
                    </div>
                    
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <h4 className="text-sm font-bold text-white mb-2">Acesso</h4>
                        <div className="grid grid-cols-2 gap-4">
                             <input type="text" placeholder="Login" className="w-full bg-slate-900 p-2 rounded border border-slate-600 text-white text-sm" value={editingBarber.username || ''} onChange={e => setEditingBarber({...editingBarber, username: e.target.value})} />
                             <input type="password" placeholder="Senha" className="w-full bg-slate-900 p-2 rounded border border-slate-600 text-white text-sm" value={editingBarber.password || ''} onChange={e => setEditingBarber({...editingBarber, password: e.target.value})} />
                        </div>
                    </div>

                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <h4 className="text-sm font-bold text-white mb-2">Horário</h4>
                        <div className="grid grid-cols-2 gap-2">
                             <input type="time" className="w-full bg-slate-900 p-2 rounded border border-slate-600 text-white text-sm" value={editingBarber.shiftStart || ''} onChange={e => setEditingBarber({...editingBarber, shiftStart: e.target.value})} />
                             <input type="time" className="w-full bg-slate-900 p-2 rounded border border-slate-600 text-white text-sm" value={editingBarber.shiftEnd || ''} onChange={e => setEditingBarber({...editingBarber, shiftEnd: e.target.value})} />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setIsBarberModalOpen(false)} className="flex-1 p-3 rounded-lg bg-slate-800 text-white">Cancelar</button>
                        <button type="submit" className="flex-1 p-3 rounded-lg bg-gold-500 text-slate-900 font-bold">Salvar</button>
                    </div>
                </form>
             </div>
        </div>
      )}

      {/* New Announcement Modal */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-sm border border-slate-800">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                   <Megaphone size={24} className="text-gold-500" /> Novo Aviso
                </h3>
                <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Título</label>
                        <input type="text" placeholder="Ex: Promoção de Natal" className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={newAnnouncementData.title} onChange={e => setNewAnnouncementData({...newAnnouncementData, title: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Mensagem</label>
                        <textarea placeholder="Detalhes da promoção ou aviso..." className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white" value={newAnnouncementData.message} onChange={e => setNewAnnouncementData({...newAnnouncementData, message: e.target.value})} rows={3} required />
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setIsAnnouncementModalOpen(false)} className="flex-1 p-3 rounded-lg bg-slate-800 text-white">Cancelar</button>
                        <button type="submit" className="flex-1 p-3 rounded-lg bg-gold-500 text-slate-900 font-bold">Salvar</button>
                    </div>
                </form>
             </div>
        </div>
      )}
      
      {/* ... Other Modals ... */}
      
      {/* Security Confirmation Modal */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
             <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-sm border border-slate-800 shadow-2xl animate-fade-in">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-gold-500 border border-slate-700">
                        <ShieldCheck size={32} />
                    </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 text-center">
                   Confirmação de Segurança
                </h3>
                <p className="text-slate-400 text-sm text-center mb-6">
                    Por favor, confirme sua senha administrativa para salvar as alterações sensíveis.
                </p>
                <form onSubmit={handleConfirmSaveSettings} className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Senha Atual</label>
                        <input 
                            type="password" 
                            autoFocus
                            placeholder="Digite sua senha..." 
                            className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white focus:outline-none focus:border-gold-500" 
                            value={securityPassword} 
                            onChange={e => setSecurityPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => { setIsSecurityModalOpen(false); setSecurityPassword(''); }} 
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