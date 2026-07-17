import React from 'react';
import { Calendar, Users, ShoppingBag, ListOrdered, Clock, Star, Bell, Sparkles } from 'lucide-react';
import { useAppStore } from '../store';

interface ClientHomeProps {
  navigate: (view: string) => void;
}

export const ClientHome: React.FC<ClientHomeProps> = ({ navigate }) => {
  const { config, announcements } = useAppStore();

  const activeAnnouncements = announcements.filter(a => a.active);

  const ActionCard = ({ title, icon: Icon, onClick, colorClass, desc }: any) => (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-6 h-48 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border border-slate-800 bg-slate-900 ${colorClass}`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon size={80} />
      </div>
      <div className="bg-slate-950/30 w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm">
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white mb-1">{title}</h3>
        <p className="text-sm text-slate-300 font-medium opacity-80">{desc}</p>
      </div>
    </button>
  );

  return (
    <div className="space-y-10">
      {/* Announcements Section - Modern Grid Layout */}
      {activeAnnouncements.length > 0 && (
        <div className="w-full animate-fade-in">
           <div className="flex items-center gap-2 mb-4 px-1">
              <Sparkles size={14} className="text-gold-500" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Destaques & Avisos</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {activeAnnouncements.map(announcement => (
               <div key={announcement.id} className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-gold-500/40 transition-all duration-300 group shadow-lg">
                  {/* Decorative Glow */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-gold-500/5 rounded-full blur-3xl group-hover:bg-gold-500/10 transition-all"></div>
                  
                  <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-gold-500 group-hover:scale-110 group-hover:border-gold-500/30 transition-all shadow-md">
                              <Bell size={20} />
                          </div>
                          <span className="text-[10px] font-bold bg-gold-500/10 text-gold-500 px-2 py-1 rounded-md border border-gold-500/20 uppercase tracking-wide">
                              Importante
                          </span>
                      </div>
                      
                      <h4 className="font-bold text-white text-xl mb-2 leading-tight group-hover:text-gold-400 transition-colors">
                          {announcement.title}
                      </h4>
                      <p className="text-slate-400 text-sm leading-relaxed">
                          {announcement.message}
                      </p>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="text-center space-y-4 py-4">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
          Bem-vindo à {config.name}
        </h2>
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto px-4">
          Cortes clássicos e modernos em um ambiente exclusivo. Agende seu horário ou acompanhe a fila em tempo real.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-gold-500 text-sm font-medium mt-2">
          <Clock size={16} />
          <span>Aberto hoje: {config.openingHour}h às {config.closingHour}h</span>
        </div>
      </div>

      {/* Main Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ActionCard
          title="AGENDA"
          desc="Reserve seu horário"
          icon={Calendar}
          onClick={() => navigate('client-booking')}
          colorClass="hover:border-gold-500/50"
        />
        <ActionCard
          title="FILA"
          desc="Acompanhe ao vivo"
          icon={ListOrdered}
          onClick={() => navigate('client-queue')}
          colorClass="hover:border-blue-500/50"
        />
        <ActionCard
          title="PRODUTOS"
          desc="Nossa loja oficial"
          icon={ShoppingBag}
          onClick={() => navigate('client-products')}
          colorClass="hover:border-emerald-500/50"
        />
        <ActionCard
          title="EQUIPE"
          desc="Conheça os profissionais"
          icon={Users}
          onClick={() => navigate('client-team')}
          colorClass="hover:border-purple-500/50"
        />
      </div>

      {/* Quick Testimonial/Promo area */}
      <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 to-transparent pointer-events-none"></div>
        <div className="flex justify-center mb-4 text-gold-500">
          <Star fill="currentColor" size={24} />
          <Star fill="currentColor" size={24} />
          <Star fill="currentColor" size={24} />
          <Star fill="currentColor" size={24} />
          <Star fill="currentColor" size={24} />
        </div>
        <p className="text-xl italic text-slate-300 mb-4">"O melhor atendimento da região. Profissionais qualificados e ambiente nota 10!"</p>
        <p className="text-gold-500 font-bold">- João M., Cliente VIP</p>
      </div>
    </div>
  );
};