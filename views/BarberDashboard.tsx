import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Clock, CheckCircle, Calendar, DollarSign, Briefcase, TrendingUp, Filter, AlertCircle, UserCheck, Activity, Wifi, Edit, Save, X, Coffee, Play, CheckSquare, RefreshCw, UserPlus, Phone, Globe, Search, Lock, Plus, MessageCircle } from 'lucide-react';
import { Appointment, Client } from '../types';
import { formatPhone } from '../utils';

interface BarberDashboardProps {
    currentBarberId?: string | null;
}

export const BarberDashboard: React.FC<BarberDashboardProps> = ({ currentBarberId }) => {
  const { appointments, barbers, services, confirmArrival, updateBarber, updateAppointmentStatus, refreshData, loading, clients, addClient, config } = useAppStore();
  
  // Use the passed ID - if null, try to find first barber, otherwise show empty state
  const activeId = currentBarberId || barbers[0]?.id || null;

  // Force refresh when component mounts, but in BACKGROUND mode (true) to avoid unmounting the app
  useEffect(() => {
    refreshData(true);
  }, []);

  const currentBarber = activeId ? barbers.find(b => b.id === activeId) : null;
  const commissionRate = currentBarber?.commissionRate || 0.5;

  const [activeTab, setActiveTab] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'CLIENTES'>('TODAY');
  
  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
      shiftStart: '',
      shiftEnd: '',
      breakStart: '',
      breakEnd: ''
  });

  // Finish Confirmation Modal State
  const [finishingAptId, setFinishingAptId] = useState<string | null>(null);

  // Client States
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientSecurityOpen, setIsClientSecurityOpen] = useState(false);
  const [clientSecurityPassword, setClientSecurityPassword] = useState('');
  const [clientSuccessMsg, setClientSuccessMsg] = useState('');

  // Real-time State
  const [now, setNow] = useState(new Date());
  const isOnBreak = currentBarber?.isOnBreak || false;

  // Effect to update the clock every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
        setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);
  
  // Start of Week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0,0,0,0);

  // End of Week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23,59,59,999);

  // Filter Appointments for the logged-in barber
  const barberAppointments = activeId 
    ? appointments.filter(a => a.barberId === activeId && a.status !== 'CANCELLED')
    : [];

  const todayApts = barberAppointments.filter(a => {
      const d = new Date(a.date);
      return d.toDateString() === now.toDateString();
  });

  const weekApts = barberAppointments.filter(a => {
      const d = new Date(a.date);
      return d >= startOfWeek && d <= endOfWeek;
  });

  const monthApts = barberAppointments.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // --- Stats Calculation Helper ---
  const calculateStats = (apts: Appointment[]) => {
      const completed = apts.filter(a => a.status === 'COMPLETED');
      const count = completed.length;
      const scheduledCount = apts.length;
      const revenue = completed.reduce((sum, a) => sum + a.totalPrice, 0);
      const commission = revenue * commissionRate;
      return { count, scheduledCount, revenue, commission };
  };

  const todayStats = calculateStats(todayApts);
  const weekStats = calculateStats(weekApts);
  const monthStats = calculateStats(monthApts);

  // Select data based on active tab
  const currentList = activeTab === 'TODAY' ? todayApts : activeTab === 'WEEK' ? weekApts : monthApts;
  const currentStats = activeTab === 'TODAY' ? todayStats : activeTab === 'WEEK' ? weekStats : monthStats;

  // Sorting: Pending/InProgress first, then by time
  const sortedList = [...currentList].sort((a, b) => {
     // Custom status weight
     const getWeight = (s: string) => {
         if (s === 'IN_PROGRESS') return 0;
         if (s === 'PENDING') return 1;
         return 2;
     };
     if (getWeight(a.status) !== getWeight(b.status)) {
         return getWeight(a.status) - getWeight(b.status);
     }
     return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const StatCard = ({ label, value, subValue, icon: Icon, colorClass }: any) => (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
        <div>
            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">{label}</p>
            <h3 className={`text-2xl font-bold ${colorClass}`}>{value}</h3>
            {subValue && <p className="text-slate-500 text-xs mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')} text-white`}>
            <Icon size={24} className="opacity-80" />
        </div>
    </div>
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'IN_PROGRESS': return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold animate-pulse">EM ANDAMENTO</span>;
        case 'PENDING': return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-full text-xs font-bold">AGENDADO</span>;
        case 'COMPLETED': return <span className="px-3 py-1 bg-green-500/20 text-green-500 border border-green-500/30 rounded-full text-xs font-bold">FINALIZADO</span>;
        default: return <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-xs">{status}</span>;
    }
  };

  const handleConfirmArrival = (id: string) => {
      confirmArrival(id);
  };

  const handleStartService = (id: string) => {
      updateAppointmentStatus(id, 'IN_PROGRESS');
  };

  const handleSendWhatsApp = (apt: Appointment) => {
      const client = apt.clientId ? clients.find(c => c.id === apt.clientId) : undefined;
      const whatsapp = client?.whatsapp || client?.phone || '';
      
      if (!whatsapp) {
          alert('Número de WhatsApp não encontrado para este cliente.');
          return;
      }
      
      const cleanNumber = whatsapp.replace(/\D/g, '');
      const message = encodeURIComponent(
          `Olá ${apt.clientName}! Aqui é da ${config.name || 'BarberShop'}. ` +
          `Estamos te chamando para informar que você é o próximo a ser atendido! ` +
          `Por favor, dirija-se ao estabelecimento. Aguardamos você! 💈`
      );
      
      window.open(`https://wa.me/55${cleanNumber}?text=${message}`, '_blank');
  };

  const openFinishModal = (id: string) => {
      setFinishingAptId(id);
  };

  const confirmFinishService = () => {
      if (finishingAptId) {
          updateAppointmentStatus(finishingAptId, 'COMPLETED');
          setFinishingAptId(null);
      }
  };

  const handleOpenSchedule = () => {
      if(currentBarber) {
          setScheduleForm({
              shiftStart: currentBarber.shiftStart || '09:00',
              shiftEnd: currentBarber.shiftEnd || '18:00',
              breakStart: currentBarber.breakStart || '12:00',
              breakEnd: currentBarber.breakEnd || '13:00',
          });
      } else {
          // Fallback if currentBarber not found in list yet (latency)
          setScheduleForm({
              shiftStart: '09:00',
              shiftEnd: '18:00',
              breakStart: '12:00',
              breakEnd: '13:00',
          });
      }
      setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
      await updateBarber(activeId, scheduleForm);
      // Wait a moment for local state update propagation if needed, then close
      setIsScheduleModalOpen(false);
      
      // Try to refresh from DB, but don't block UI if offline
      refreshData(true).catch(e => console.warn("Background refresh failed", e));
      
      alert("Horários atualizados com sucesso!");
  };

  const toggleBreak = async () => {
      await updateBarber(activeId, { isOnBreak: !isOnBreak });
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

  return (
    <div className="space-y-8">
       {/* No Barber Found State */}
       {!activeId && (
         <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800">
           <AlertCircle size={48} className="mx-auto text-slate-600 mb-4" />
           <h2 className="text-xl font-bold text-white mb-2">Nenhum profissional encontrado</h2>
           <p className="text-slate-400">Faça login novamente ou contate o administrador.</p>
         </div>
       )}

       {activeId && (
       <>
       {/* Header Profile */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-6 rounded-xl border border-slate-800 gap-4 relative overflow-hidden">
        {/* Live Indicator Background Effect */}
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Activity size={100} />
        </div>

        <div className="flex items-center gap-4 z-10 w-full md:w-auto">
            <div className="relative">
                <img src={currentBarber?.avatar || "https://images.unsplash.com/photo-1583543735309-b5f70a75cdbd?auto=format&fit=crop&w=500&q=80"} alt={currentBarber?.name} className={`w-16 h-16 rounded-full border-2 object-cover ${isOnBreak ? 'border-yellow-500 opacity-60' : 'border-gold-500'}`} />
                <div className={`absolute bottom-0 right-0 w-4 h-4 border-2 border-slate-900 rounded-full ${isOnBreak ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between md:justify-start gap-3">
                    <h2 className="text-2xl font-bold text-white">{currentBarber?.name || "Carregando..."}</h2>
                    <button 
                        onClick={handleOpenSchedule}
                        className="md:hidden text-slate-400 hover:text-gold-500"
                    >
                        <Edit size={18} />
                    </button>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm mt-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-slate-800 rounded text-gold-500 font-bold text-xs">{(commissionRate * 100).toFixed(0)}% Comissão</span>
                    {isOnBreak ? (
                        <span className="flex items-center gap-1 text-yellow-500 text-xs font-bold uppercase tracking-wide">
                            <Coffee size={10} /> Em Intervalo
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-green-500 text-xs font-bold uppercase tracking-wide">
                            <Wifi size={10} /> Online
                        </span>
                    )}
                </div>
                {/* Schedule Display */}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={10} /> {currentBarber?.shiftStart || '09:00'} - {currentBarber?.shiftEnd || '18:00'}</span>
                    {currentBarber?.breakStart && (
                        <span className="flex items-center gap-1 border-l border-slate-700 pl-3"><Coffee size={10} /> Almoço: {currentBarber.breakStart} - {currentBarber.breakEnd}</span>
                    )}
                </div>
            </div>
        </div>
        
        <div className="flex flex-col items-end gap-3 z-10 w-full md:w-auto">
            <div className="hidden md:block text-sm text-slate-400 flex items-center justify-end gap-2">
                <span>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <button 
                    onClick={() => refreshData(true)}
                    disabled={loading}
                    className="ml-2 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Atualizar Dados"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            </div>
            <div className="hidden md:block text-xl font-bold text-white capitalize mb-1">
                {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>

            <button 
                onClick={toggleBreak}
                className={`flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-bold transition-colors border ${
                    isOnBreak 
                        ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 border-yellow-500/30 animate-pulse' 
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                }`}
            >
                <Coffee size={14} />
                {isOnBreak ? 'Voltar ao Serviço' : 'Intervalo'}
            </button>
            
            <button 
                onClick={handleOpenSchedule}
                className="hidden md:flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
                <Edit size={14} /> Meus Horários
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="grid grid-cols-4 md:flex p-1 bg-slate-900 border border-slate-800 rounded-lg w-full md:w-fit gap-1 md:gap-0">
            <button 
                onClick={() => setActiveTab('TODAY')}
                className={`px-2 md:px-6 py-2 rounded-md text-xs md:text-sm font-bold transition-all ${activeTab === 'TODAY' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Hoje
            </button>
            <button 
                onClick={() => setActiveTab('WEEK')}
                className={`px-2 md:px-6 py-2 rounded-md text-xs md:text-sm font-bold transition-all ${activeTab === 'WEEK' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Semana
            </button>
            <button 
                onClick={() => setActiveTab('MONTH')}
                className={`px-2 md:px-6 py-2 rounded-md text-xs md:text-sm font-bold transition-all ${activeTab === 'MONTH' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Mês
            </button>
            <button 
                onClick={() => setActiveTab('CLIENTES')}
                className={`px-2 md:px-6 py-2 rounded-md text-xs md:text-sm font-bold transition-all ${activeTab === 'CLIENTES' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Clientes
            </button>
        </div>
        <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <Clock size={12} /> Atualização em tempo real
        </div>
      </div>

      {/* Stats Row */}
      {activeTab !== 'CLIENTES' && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
            label="Minha Comissão (Realizada)" 
            value={`R$ ${currentStats.commission.toFixed(2)}`} 
            icon={DollarSign} 
            colorClass="text-gold-500" 
        />
        <StatCard 
            label="Faturamento Total (Bruto)" 
            value={`R$ ${currentStats.revenue.toFixed(2)}`} 
            icon={TrendingUp} 
            colorClass="text-green-500" 
        />
        <StatCard 
            label="Serviços Realizados" 
            value={currentStats.count} 
            subValue={`de ${currentStats.scheduledCount} agendados`}
            icon={Briefcase} 
            colorClass="text-blue-500" 
        />
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar size={20} className="text-slate-500" />
            Histórico de Agendamentos ({activeTab === 'TODAY' ? 'Hoje' : activeTab === 'WEEK' ? 'Esta Semana' : 'Este Mês'})
        </h3>
        
        {sortedList.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                <p className="text-slate-500">Nenhum agendamento encontrado para este período.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {sortedList.map((apt) => {
                    const service = services.find(s => s.id === apt.serviceId);
                    const date = new Date(apt.date);
                    
                    const canConfirm = activeTab === 'TODAY' && apt.status === 'PENDING' && !apt.clientArrived;
                    const canStart = activeTab === 'TODAY' && apt.status === 'PENDING' && apt.clientArrived;
                    const canFinish = activeTab === 'TODAY' && apt.status === 'IN_PROGRESS';
                    
                    return (
                        <div key={apt.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="bg-slate-800 p-3 rounded-lg text-center min-w-[70px]">
                                        <div className="text-lg font-bold text-white">
                                            {date.getHours()}:{date.getMinutes().toString().padStart(2, '0')}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">
                                            {date.getDate()}/{date.getMonth()+1}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                            {apt.clientName}
                                            {apt.clientArrived && (
                                                <span className="text-[10px] bg-green-900 text-green-300 px-2 py-0.5 rounded-full border border-green-800 flex items-center gap-1">
                                                    <CheckCircle size={10} /> NA LOJA
                                                </span>
                                            )}
                                        </h4>
                                        <div className="text-sm text-slate-400 mt-1">
                                            {service?.name} • <span className="text-slate-500">{service?.durationMinutes} min</span>
                                        </div>
                                        {apt.notes && (
                                            <div className="flex items-center gap-1 text-xs text-yellow-500/80 mt-1">
                                                <AlertCircle size={12} />
                                                <span>Obs: {apt.notes}</span>
                                            </div>
                                        )}
                                        {/* Show included products if any */}
                                        {apt.productIds && apt.productIds.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {apt.productIds.map((pid, idx) => (
                                                    <span key={idx} className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">
                                                        + Produto
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col md:items-end w-full md:w-auto pl-[86px] md:pl-0 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0 gap-2">
                                    <div className="flex items-center justify-between gap-6 w-full md:w-auto">
                                        <div className="flex flex-col md:items-end">
                                            <span className="text-xs text-slate-500 font-bold uppercase">Valor Total</span>
                                            <span className="text-white font-bold">R$ {apt.totalPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="flex flex-col md:items-end">
                                            <span className="text-xs text-slate-500 font-bold uppercase mb-1 text-right">Status</span>
                                            {getStatusBadge(apt.status)}
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 mt-2 w-full md:w-auto">
                                        {canConfirm && (
                                            <button 
                                                onClick={() => handleConfirmArrival(apt.id)}
                                                className="flex-1 md:flex-none py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <UserCheck size={14} />
                                                Chegou
                                            </button>
                                        )}
                                        
                                         {canStart && (
                                             <button 
                                                 onClick={() => handleStartService(apt.id)}
                                                 className="flex-1 md:flex-none py-2 px-4 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 hover:border-blue-500/50 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                             >
                                                 <Play size={14} />
                                                 Iniciar
                                             </button>
                                         )}

                                         {activeTab === 'TODAY' && apt.status === 'PENDING' && (
                                             <button 
                                                 onClick={() => handleSendWhatsApp(apt)}
                                                 className="flex-1 md:flex-none py-2 px-4 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 hover:border-green-500/50 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                                 title="Notificar cliente via WhatsApp"
                                             >
                                                 <MessageCircle size={14} />
                                                 WhatsApp
                                             </button>
                                         )}

                                        {canFinish && (
                                            <button 
                                                onClick={() => openFinishModal(apt.id)}
                                                className="flex-1 md:flex-none py-2 px-4 bg-green-600 hover:bg-green-500 text-white border border-green-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                                            >
                                                <CheckSquare size={14} />
                                                Finalizar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
      </>
      )}

      {/* CLIENTES Tab */}
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

      {/* Schedule Management Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsScheduleModalOpen(false)}></div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-[95%] sm:w-full max-w-md relative shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Clock size={20} className="text-gold-500" />
                        Meus Horários
                    </h3>
                    <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-blue-500/10 rounded">
                                <Briefcase size={14} className="text-blue-500" />
                            </div>
                            <span className="text-sm font-bold text-white">Expediente</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Início</label>
                                <input 
                                    type="time" 
                                    value={scheduleForm.shiftStart}
                                    onChange={(e) => setScheduleForm({...scheduleForm, shiftStart: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Fim</label>
                                <input 
                                    type="time" 
                                    value={scheduleForm.shiftEnd}
                                    onChange={(e) => setScheduleForm({...scheduleForm, shiftEnd: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-yellow-500/10 rounded">
                                <Coffee size={14} className="text-yellow-500" />
                            </div>
                            <span className="text-sm font-bold text-white">Intervalo / Almoço</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Início Pausa</label>
                                <input 
                                    type="time" 
                                    value={scheduleForm.breakStart}
                                    onChange={(e) => setScheduleForm({...scheduleForm, breakStart: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Fim Pausa</label>
                                <input 
                                    type="time" 
                                    value={scheduleForm.breakEnd}
                                    onChange={(e) => setScheduleForm({...scheduleForm, breakEnd: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleSaveSchedule}
                        className="w-full bg-gold-500 hover:bg-gold-400 text-slate-900 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-gold-900/20"
                    >
                        <Save size={18} />
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Confirmation Modal for Finishing Service */}
      {finishingAptId && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setFinishingAptId(null)}></div>
            <div className="bg-slate-900 border border-green-500/30 rounded-2xl w-[95%] sm:w-full max-w-sm relative shadow-2xl p-6 text-center max-h-[90vh] overflow-y-auto">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckSquare size={32} className="text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Finalizar Atendimento?</h3>
                <p className="text-slate-400 text-sm mb-6">
                    O valor será registrado no financeiro e o status atualizado para concluído.
                </p>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={() => setFinishingAptId(null)}
                        className="flex-1 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmFinishService}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-green-900/20"
                    >
                        Confirmar
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
      </>
       )}
    </div>
  );
};