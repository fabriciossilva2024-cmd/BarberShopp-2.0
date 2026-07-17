import React from 'react';
import { useAppStore } from '../store';
import { Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { Appointment } from '../types';

export const ClientQueue = () => {
  const { appointments, barbers, services } = useAppStore();

  // Filter for active appointments (mock logic: just take today's pending/in-progress)
  // In a real app, you'd filter by actual date
  const activeQueue = appointments
    .filter(a => ['PENDING', 'IN_PROGRESS'].includes(a.status))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'IN_PROGRESS': return <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-lg text-[10px] uppercase font-bold animate-pulse border border-green-500/20">Em Atendimento</span>;
      case 'PENDING': return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-lg text-[10px] uppercase font-bold border border-yellow-500/20">Aguardando</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Fila em Tempo Real</h2>
        <p className="text-slate-400">Confira sua posição e previsão de atendimento.</p>
      </div>

      <div className="grid gap-4">
        {activeQueue.length === 0 ? (
          <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800">
             <Clock size={48} className="mx-auto text-slate-600 mb-4" />
             <p className="text-slate-400">A fila está vazia no momento.</p>
          </div>
        ) : (
          activeQueue.map((apt, index) => {
            const barber = barbers.find(b => b.id === apt.barberId);
            const service = services.find(s => s.id === apt.serviceId);
            const dateObj = new Date(apt.date);
            const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString('pt-BR');
            const isNext = index === 0;

            return (
              <div key={apt.id} className={`bg-slate-900 border ${isNext ? 'border-gold-500/50 shadow-gold-900/10' : 'border-slate-800'} rounded-xl relative overflow-hidden shadow-lg group transition-all`}>
                {/* Status Strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${apt.status === 'IN_PROGRESS' ? 'bg-green-500 animate-pulse' : 'bg-gold-500'}`}></div>

                <div className="p-5 pl-6">
                    {/* Top Row: Position, Name, Time */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <span className={`text-2xl font-black ${isNext ? 'text-white' : 'text-slate-700'}`}>
                                #{String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                                <h3 className="font-bold text-lg text-white leading-tight truncate pr-2">
                                    {apt.clientName}
                                </h3>
                                {apt.clientArrived && apt.status === 'PENDING' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-medium mt-0.5">
                                        <CheckCircle2 size={10} /> Chegou na loja
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end flex-shrink-0">
                            <div className={`flex items-center gap-1 text-[10px] font-medium mb-1 ${isNext ? 'text-slate-300' : 'text-slate-500'}`}>
                                <Calendar size={10} />
                                <span>{dateStr}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 font-bold px-2 py-1 rounded-md text-xs ${isNext ? 'bg-gold-500 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                                <Clock size={12} />
                                <span>{time}</span>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-800 my-3"></div>

                    {/* Bottom Row: Barber/Service & Status Badge */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="relative flex-shrink-0">
                                <img src={barber?.avatar} alt={barber?.name} className="w-9 h-9 rounded-full border border-slate-700 object-cover" />
                                {apt.status === 'IN_PROGRESS' && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                                )}
                            </div>
                            <div className="flex flex-col min-w-0 pr-2">
                                <span className="text-sm text-slate-300 font-medium truncate">{service?.name}</span>
                                <span className="text-xs text-slate-500 truncate">com {barber?.name}</span>
                            </div>
                        </div>
                        
                        <div className="flex-shrink-0">
                            {getStatusBadge(apt.status)}
                        </div>
                    </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};