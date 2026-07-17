import React from 'react';
import { useAppStore } from '../store';
import { Star, Clock, Scissors, Award, Sparkles } from 'lucide-react';

export const ClientTeam = () => {
  const { barbers } = useAppStore();

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-3xl font-bold text-white">Nossos Especialistas</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Conheça a equipe de elite pronta para transformar seu visual com técnica, precisão e estilo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {barbers.map((barber) => (
          <div key={barber.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group hover:border-gold-500/50 transition-all hover:-translate-y-1 shadow-xl">
            {/* Header Image */}
            <div className="h-48 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10"></div>
              <img 
                src={barber.avatar} 
                alt={barber.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>

            {/* Content */}
            <div className="p-6 relative z-20 -mt-12">
                {/* Avatar & Name */}
                <div className="flex justify-between items-end mb-4">
                    <img 
                        src={barber.avatar} 
                        alt={barber.name} 
                        className="w-20 h-20 rounded-2xl object-cover border-4 border-slate-900 shadow-lg"
                    />
                    <div className="flex items-center gap-1 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 text-gold-500 font-bold text-sm mb-2">
                        <Star size={14} fill="currentColor" />
                        <span>{barber.rating}</span>
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-white mb-1">{barber.name}</h3>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Award size={14} />
                        <span>{barber.experienceYears ? `${barber.experienceYears} anos de experiência` : 'Especialista'}</span>
                    </div>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed mb-6 border-b border-slate-800 pb-4">
                    {barber.bio || "Profissional dedicado a oferecer o melhor atendimento e estilo."}
                </p>

                {/* Specialties */}
                <div>
                    <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
                        <Scissors size={12} /> Especialidades
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {barber.specialties.map((spec, index) => (
                            <span 
                                key={index} 
                                className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-gold-500/30 hover:text-white transition-colors cursor-default"
                            >
                                {spec}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-16 bg-slate-900 rounded-2xl p-8 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="p-4 bg-gold-500/10 rounded-full text-gold-500">
                    <Sparkles size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Quer fazer parte do time?</h3>
                    <p className="text-slate-400">Estamos sempre procurando novos talentos.</p>
                </div>
            </div>
            <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-colors w-full md:w-auto">
                Enviar Currículo
            </button>
      </div>
    </div>
  );
};