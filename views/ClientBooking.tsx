import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Check, Calendar as CalendarIcon, Clock, User, Scissors, Coffee, Plus, ShoppingBag, Minus } from 'lucide-react';

interface ClientBookingProps {
  navigate: (view: string) => void;
}

export const ClientBooking: React.FC<ClientBookingProps> = ({ navigate }) => {
  const { services, barbers, addAppointment, appointments, config, products, updateProductStock } = useAppStore();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  
  // State for products selected during booking
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const service = services.find(s => s.id === selectedService);
  const barber = barbers.find(b => b.id === selectedBarber);

  // Filter products that have stock
  const availableProducts = products.filter(p => p.stock > 0);

  // Calculate totals
  const productsTotal = products
    .filter(p => selectedProductIds.includes(p.id))
    .reduce((sum, p) => sum + p.price, 0);

  const finalTotalPrice = (service?.price || 0) + productsTotal;

  // Helper to get today's date string YYYY-MM-DD in local time
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayString();

  // Dynamic Time Slot Generation based on Barber's Schedule
  const generateTimeSlots = () => {
    // Defines the standard grid of hours to check against the barber's schedule
    const gridStart = 7; // 07:00
    const gridEnd = 23;  // 23:00
    const potentialSlots = [];

    for (let h = gridStart; h <= gridEnd; h++) {
        potentialSlots.push(`${String(h).padStart(2, '0')}:00`);
    }

    if (!barber) {
        // Fallback: use store config if available, otherwise generic
        const start = config.openingHour || 9;
        const end = config.closingHour || 20;
        return potentialSlots.filter(t => {
            const h = parseInt(t.split(':')[0]);
            return h >= start && h < end;
        });
    }

    const shiftStart = barber.shiftStart || '09:00';
    const shiftEnd = barber.shiftEnd || '20:00';
    const breakStart = barber.breakStart;
    const breakEnd = barber.breakEnd;

    return potentialSlots.filter(time => {
        // 1. Check if within Shift
        if (time < shiftStart || time >= shiftEnd) return false;

        // 2. Check if inside Break (if break is set)
        if (breakStart && breakEnd) {
            // A slot is invalid if it is equal to or after break start AND before break end
            // E.g. Break 12:00-13:00. Slot 12:00 is invalid. Slot 13:00 is valid.
            if (time >= breakStart && time < breakEnd) return false;
        }

        return true;
    });
  };

  const timeSlots = generateTimeSlots();

  const toggleProduct = (productId: string) => {
      if (selectedProductIds.includes(productId)) {
          setSelectedProductIds(prev => prev.filter(id => id !== productId));
      } else {
          setSelectedProductIds(prev => [...prev, productId]);
      }
  };

  const handleConfirm = () => {
    if (selectedService && selectedBarber && selectedDate && selectedTime && clientName) {
        // Construct ISO date from date and time strings
        const dateTime = new Date(`${selectedDate}T${selectedTime}`);
        
        // Decrement stock for selected products
        selectedProductIds.forEach(pid => updateProductStock(pid, -1));

        addAppointment({
            clientName,
            serviceId: selectedService,
            barberId: selectedBarber,
            date: dateTime.toISOString(),
            status: 'PENDING',
            notes,
            totalPrice: finalTotalPrice,
            productIds: selectedProductIds
        });
        alert('Agendamento realizado com sucesso!');
        navigate('client-home');
    }
  };

  const StepIndicator = ({ num, active, completed }: any) => (
    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
      active ? 'bg-gold-500 text-slate-900' : completed ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'
    }`}>
      {completed ? <Check size={16} /> : num}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center px-4 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -z-10"></div>
        <StepIndicator num={1} active={step === 1} completed={step > 1} />
        <StepIndicator num={2} active={step === 2} completed={step > 2} />
        <StepIndicator num={3} active={step === 3} completed={step > 3} />
        <StepIndicator num={4} active={step === 4} completed={step > 4} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-gold-500"><Scissors /> Escolha o Serviço</h3>
            <div className="grid gap-3">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s.id); setStep(2); }}
                  className="flex justify-between items-center p-4 rounded-xl bg-slate-800 hover:bg-slate-700 hover:border-gold-500 border border-transparent transition-all text-left"
                >
                  <div>
                    <div className="font-bold text-white">{s.name}</div>
                    <div className="text-xs text-slate-400">{s.durationMinutes} min • {s.description}</div>
                  </div>
                  <div className="font-bold text-gold-500">R$ {s.price.toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-gold-500"><User /> Escolha o Profissional</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {barbers.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBarber(b.id); setStep(3); }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 hover:border-gold-500 border border-transparent transition-all text-left"
                >
                  <img src={b.avatar} alt={b.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <div className="font-bold text-white">{b.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                        <span className="text-gold-500">★</span> {b.rating}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-slate-400 mt-4 hover:underline">Voltar</button>
          </div>
        )}

        {step === 3 && (
            <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-gold-500"><CalendarIcon /> Data e Hora</h3>
                    {barber && (
                        <div className="text-right text-xs text-slate-500">
                            <div>Agenda de <span className="text-white font-bold">{barber.name}</span></div>
                            <div className="flex flex-col items-end gap-0.5 mt-1">
                                <span className="flex items-center gap-1"><Clock size={10}/> {barber.shiftStart || '09:00'} - {barber.shiftEnd || '20:00'}</span>
                                {barber.breakStart && (
                                    <span className="flex items-center gap-1 text-slate-600"><Coffee size={10}/> Pausa: {barber.breakStart} - {barber.breakEnd}</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Selecione a Data</label>
                    <input 
                        type="date" 
                        min={todayStr}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                        onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                        value={selectedDate}
                    />
                </div>

                {selectedDate && (
                    <div className="animate-fade-in">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Horários Disponíveis</label>
                        {timeSlots.length === 0 ? (
                            <div className="text-slate-500 text-sm italic p-4 bg-slate-800/50 rounded-lg border border-slate-800">
                                Nenhum horário disponível dentro do expediente deste profissional.
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {timeSlots.map(time => {
                                    // Check availability in database
                                    const isTaken = appointments.some(apt => {
                                        if (apt.barberId !== selectedBarber || apt.status === 'CANCELLED') return false;
                                        
                                        const aptDateObj = new Date(apt.date);
                                        const year = aptDateObj.getFullYear();
                                        const month = String(aptDateObj.getMonth() + 1).padStart(2, '0');
                                        const day = String(aptDateObj.getDate()).padStart(2, '0');
                                        const aptYMD = `${year}-${month}-${day}`;

                                        if (aptYMD !== selectedDate) return false;

                                        const h = String(aptDateObj.getHours()).padStart(2, '0');
                                        const m = String(aptDateObj.getMinutes()).padStart(2, '0');
                                        const aptTime = `${h}:${m}`;

                                        return aptTime === time;
                                    });

                                    // Check if time is in the past (for today)
                                    const isPast = (() => {
                                        if (selectedDate === todayStr) {
                                            const now = new Date();
                                            const currentH = now.getHours();
                                            const currentM = now.getMinutes();
                                            const [slotH, slotM] = time.split(':').map(Number);
                                            return slotH < currentH || (slotH === currentH && slotM <= currentM);
                                        }
                                        return selectedDate < todayStr;
                                    })();

                                    const isDisabled = isTaken || isPast;

                                    return (
                                        <button
                                            key={time}
                                            onClick={() => !isDisabled && setSelectedTime(time)}
                                            disabled={isDisabled}
                                            className={`py-2 rounded-lg text-sm font-medium transition-all ${
                                                isDisabled 
                                                ? 'bg-slate-800/50 text-slate-700 border border-slate-800/50 cursor-not-allowed' 
                                                : selectedTime === time 
                                                    ? 'bg-gold-500 text-slate-900 shadow-lg shadow-gold-500/20 scale-105' 
                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-600 border border-slate-800'
                                            }`}
                                        >
                                            {time}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex justify-between pt-6 border-t border-slate-800 mt-4">
                     <button onClick={() => setStep(2)} className="text-sm text-slate-400 hover:underline">Voltar</button>
                     <button 
                        onClick={() => { if(selectedDate && selectedTime) setStep(4); }}
                        disabled={!selectedDate || !selectedTime}
                        className="bg-gold-500 text-slate-900 px-8 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gold-400 transition-colors shadow-lg shadow-gold-900/10"
                     >
                        Continuar
                     </button>
                </div>
            </div>
        )}

        {step === 4 && (
             <div className="space-y-6">
                <h3 className="text-xl font-bold text-gold-500">Confirmar Agendamento</h3>
                
                {/* Summary Card */}
                <div className="bg-slate-800/50 p-6 rounded-2xl space-y-3 border border-slate-700">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Serviço:</span>
                        <span className="text-white font-medium">{service?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Barbeiro:</span>
                        <span className="text-white font-medium">{barber?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Data e Hora:</span>
                        <span className="text-white font-medium">{new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString()} às {selectedTime}</span>
                    </div>
                    {/* Selected Products List in Summary */}
                    {selectedProductIds.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-slate-700/50">
                            <span className="text-xs text-slate-500 block mb-1">Adicionais:</span>
                            {products.filter(p => selectedProductIds.includes(p.id)).map(p => (
                                <div key={p.id} className="flex justify-between text-sm text-slate-300">
                                    <span>+ {p.name}</span>
                                    <span>R$ {p.price.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="border-t border-slate-700 my-2 pt-3 flex justify-between text-xl font-bold">
                        <span className="text-gold-500">Total:</span>
                        <span className="text-gold-500">R$ {finalTotalPrice.toFixed(2)}</span>
                    </div>
                </div>

                {/* Add Products Section */}
                <div className="space-y-3">
                    <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                        <ShoppingBag size={16} className="text-gold-500" />
                        Adicionar Produtos ao Pacote
                    </h4>
                    {availableProducts.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">Nenhum produto disponível no momento.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {availableProducts.map(p => {
                                const isSelected = selectedProductIds.includes(p.id);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => toggleProduct(p.id)}
                                        className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                                            isSelected 
                                            ? 'bg-gold-500/10 border-gold-500 text-white' 
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <img src={p.image} className="w-8 h-8 rounded object-cover bg-slate-900" alt="" />
                                            <div className="truncate">
                                                <div className="text-sm font-bold truncate">{p.name}</div>
                                                <div className="text-xs opacity-70">R$ {p.price.toFixed(2)}</div>
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${isSelected ? 'bg-gold-500 border-gold-500 text-slate-900' : 'border-slate-600'}`}>
                                            {isSelected ? <Check size={12} strokeWidth={3} /> : <Plus size={12} />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-2">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Seu Nome</label>
                        <input 
                            type="text" 
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                            placeholder="Digite seu nome completo"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Observações (Opcional)</label>
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                            placeholder="Alguma preferência?"
                            rows={2}
                        />
                    </div>
                </div>

                <button 
                    onClick={handleConfirm}
                    disabled={!clientName}
                    className="w-full bg-gold-500 text-slate-900 py-4 rounded-xl font-bold text-lg hover:bg-gold-400 disabled:opacity-50 transition-colors shadow-lg shadow-gold-500/10"
                >
                    Confirmar Agendamento ({selectedProductIds.length > 0 ? 'Combo' : 'Serviço'})
                </button>
                 <button onClick={() => setStep(3)} className="w-full text-center text-sm text-slate-400 mt-2 hover:underline">Voltar</button>
             </div>
        )}
      </div>
    </div>
  );
};