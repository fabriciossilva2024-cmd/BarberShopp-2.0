import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Check, Calendar as CalendarIcon, Clock, User, Scissors, Coffee, Plus, ShoppingBag, Phone, Search, UserPlus, CheckCircle } from 'lucide-react';
import { Client } from '../types';
import { formatPhone } from '../utils';

interface ClientBookingProps {
  navigate: (view: string) => void;
}

export const ClientBooking: React.FC<ClientBookingProps> = ({ navigate }) => {
  const { services, barbers, addAppointment, appointments, config, products, updateProductStock, addClient, findClientByPhone } = useAppStore();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Client registration state
  const [phoneSearch, setPhoneSearch] = useState('');
  const [foundClient, setFoundClient] = useState<Client | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [savedClient, setSavedClient] = useState<Client | null>(null);

  const service = services.find(s => s.id === selectedService);
  const barber = barbers.find(b => b.id === selectedBarber);
  const availableProducts = products.filter(p => p.stock > 0);

  const productsTotal = products
    .filter(p => selectedProductIds.includes(p.id))
    .reduce((sum, p) => sum + p.price, 0);
  const finalTotalPrice = (service?.price || 0) + productsTotal;

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayString();

  const generateTimeSlots = () => {
    const gridStart = 7;
    const gridEnd = 23;
    const potentialSlots = [];
    for (let h = gridStart; h <= gridEnd; h++) {
        potentialSlots.push(`${String(h).padStart(2, '0')}:00`);
    }
    if (!barber) {
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
        if (time < shiftStart || time >= shiftEnd) return false;
        if (breakStart && breakEnd) {
            if (time >= breakStart && time < breakEnd) return false;
        }
        return true;
    });
  };

  const timeSlots = generateTimeSlots();

  const toggleProduct = (productId: string) => {
      setSelectedProductIds(prev =>
          prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
      );
  };

  // Client search handler
  const handleSearchClient = () => {
    const clean = phoneSearch.replace(/\D/g, '');
    if (clean.length < 8) return;
    const client = findClientByPhone(clean);
    if (client) {
      setFoundClient(client);
      setSavedClient(client);
      setClientName(client.name);
      setShowRegisterForm(false);
    } else {
      setFoundClient(null);
      setClientPhone(phoneSearch);
      setShowRegisterForm(true);
    }
  };

  // Register new client
  const handleRegisterClient = async () => {
    if (!clientName.trim()) return;
    const newClient = await addClient({
      name: clientName.trim(),
      phone: clientPhone,
      email: clientEmail,
      whatsapp: clientWhatsapp || clientPhone,
      notes: clientNotes
    });
    setSavedClient(newClient);
  };

  const handleConfirm = async () => {
    const finalClientName = savedClient?.name || clientName;
    if (selectedService && selectedBarber && selectedDate && selectedTime && finalClientName) {
        // Parse date components to avoid timezone issues
        const [year, month, day] = selectedDate.split('-').map(Number);
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const dateTime = new Date(year, month - 1, day, hours, minutes);
        
        selectedProductIds.forEach(pid => updateProductStock(pid, -1));
        addAppointment({
            clientName: finalClientName,
            clientId: savedClient?.id,
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

  const StepIndicator = ({ num, label, active, completed }: any) => (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
        active ? 'bg-gold-500 text-slate-900' : completed ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'
      }`}>
        {completed ? <Check size={16} /> : num}
      </div>
      <span className={`text-[10px] font-medium hidden sm:block ${active ? 'text-gold-500' : 'text-slate-600'}`}>{label}</span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center px-2 relative">
        <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-800 -z-10"></div>
        <StepIndicator num={1} label="Serviço" active={step === 1} completed={step > 1} />
        <StepIndicator num={2} label="Profissional" active={step === 2} completed={step > 2} />
        <StepIndicator num={3} label="Data/Hora" active={step === 3} completed={step > 3} />
        <StepIndicator num={4} label="Cadastro" active={step === 4} completed={step > 4} />
        <StepIndicator num={5} label="Confirmação" active={step === 5} completed={step > 5} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">

        {/* STEP 1: Service */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-gold-500"><Scissors /> Escolha o Serviço</h3>
            <div className="grid gap-3">
              {services.map(s => (
                <button key={s.id} onClick={() => { setSelectedService(s.id); setStep(2); }}
                  className="flex justify-between items-center p-4 rounded-xl bg-slate-800 hover:bg-slate-700 hover:border-gold-500 border border-transparent transition-all text-left">
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

        {/* STEP 2: Barber */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-gold-500"><User /> Escolha o Profissional</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {barbers.map(b => (
                <button key={b.id} disabled={b.isOnBreak}
                  onClick={() => { setSelectedBarber(b.id); setStep(3); }}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                    b.isOnBreak ? 'bg-slate-800/50 border-yellow-500/30 opacity-60 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 hover:border-gold-500 border-transparent'
                  }`}>
                  <img src={b.avatar} alt={b.name} className={`w-12 h-12 rounded-full object-cover ${b.isOnBreak ? 'grayscale' : ''}`} />
                  <div className="flex-1">
                    <div className="font-bold text-white">{b.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                        <span className="text-gold-500">★</span> {b.rating}
                    </div>
                    {b.isOnBreak && (
                        <div className="text-xs text-yellow-500 font-bold mt-1 flex items-center gap-1">
                            <Coffee size={10} /> Em intervalo
                        </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-slate-400 mt-4 hover:underline">Voltar</button>
          </div>
        )}

        {/* STEP 3: Date & Time */}
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
                    <input type="date" min={todayStr}
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
                                    const isTaken = appointments.some(apt => {
                                        if (apt.barberId !== selectedBarber || apt.status === 'CANCELLED') return false;
                                        const aptDateObj = new Date(apt.date);
                                        const aptYMD = `${aptDateObj.getFullYear()}-${String(aptDateObj.getMonth()+1).padStart(2,'0')}-${String(aptDateObj.getDate()).padStart(2,'0')}`;
                                        if (aptYMD !== selectedDate) return false;
                                        const aptTime = `${String(aptDateObj.getHours()).padStart(2,'0')}:${String(aptDateObj.getMinutes()).padStart(2,'0')}`;
                                        return aptTime === time;
                                    });
                                    const isPast = (() => {
                                        if (selectedDate === todayStr) {
                                            const now = new Date();
                                            const [slotH, slotM] = time.split(':').map(Number);
                                            return slotH < now.getHours() || (slotH === now.getHours() && slotM <= now.getMinutes());
                                        }
                                        return selectedDate < todayStr;
                                    })();
                                    const isDisabled = isTaken || isPast;
                                    return (
                                        <button key={time} onClick={() => !isDisabled && setSelectedTime(time)} disabled={isDisabled}
                                            className={`py-2 rounded-lg text-sm font-medium transition-all ${
                                                isDisabled ? 'bg-slate-800/50 text-slate-700 border border-slate-800/50 cursor-not-allowed' 
                                                : selectedTime === time ? 'bg-gold-500 text-slate-900 shadow-lg shadow-gold-500/20 scale-105' 
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-600 border border-slate-800'
                                            }`}>
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
                     <button onClick={() => { if(selectedDate && selectedTime) setStep(4); }}
                        disabled={!selectedDate || !selectedTime}
                        className="bg-gold-500 text-slate-900 px-8 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gold-400 transition-colors shadow-lg shadow-gold-900/10">
                        Continuar
                     </button>
                </div>
            </div>
        )}

        {/* STEP 4: Client Registration */}
        {step === 4 && (
            <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-gold-500">
                    <UserPlus /> Identificação do Cliente
                </h3>
                <p className="text-sm text-slate-400">
                    Informe seu telefone para identificar seu cadastro, ou crie um novo.
                </p>

                {!savedClient && (
                    <div className="space-y-4">
                        {/* Phone search */}
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type="tel" value={phoneSearch} placeholder="(11) 99999-9999"
                                    onChange={(e) => { setPhoneSearch(formatPhone(e.target.value)); setFoundClient(null); setShowRegisterForm(false); }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchClient()}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:outline-none focus:border-gold-500"
                                />
                            </div>
                            <button onClick={handleSearchClient}
                                className="bg-slate-800 border border-slate-700 text-white px-4 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2">
                                <Search size={16} /> Buscar
                            </button>
                        </div>

                        {/* Found client */}
                        {foundClient && (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                        <CheckCircle className="text-green-500" size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{foundClient.name}</p>
                                        <p className="text-xs text-slate-400">{foundClient.phone} {foundClient.email ? `• ${foundClient.email}` : ''}</p>
                                    </div>
                                </div>
                                <button onClick={() => setStep(5)}
                                    className="w-full mt-4 bg-gold-500 text-slate-900 py-3 rounded-xl font-bold hover:bg-gold-400 transition-colors">
                                    Continuar com este cliente
                                </button>
                            </div>
                        )}

                        {/* Not found - show register form */}
                        {showRegisterForm && !foundClient && (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-4 animate-fade-in">
                                <p className="text-sm text-gold-500 font-medium flex items-center gap-2">
                                    <UserPlus size={16} /> Cliente não encontrado. Faça o cadastro:
                                </p>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Nome *</label>
                                    <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                                        placeholder="Nome completo" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Telefone</label>
                                    <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                                        placeholder="(11) 99999-9999" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Email</label>
                                        <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                                            placeholder="email@email.com" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">WhatsApp</label>
                                        <input type="tel" value={clientWhatsapp} onChange={(e) => setClientWhatsapp(formatPhone(e.target.value))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                                            placeholder="(11) 99999-9999" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Observações</label>
                                    <input type="text" value={clientNotes} onChange={(e) => setClientNotes(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                                        placeholder="Preferências, alergias, etc." />
                                </div>
                                <button onClick={handleRegisterClient} disabled={!clientName.trim()}
                                    className="w-full bg-gold-500 text-slate-900 py-3 rounded-xl font-bold hover:bg-gold-400 disabled:opacity-50 transition-colors">
                                    Cadastrar e Continuar
                                </button>
                            </div>
                        )}

                        {/* Quick skip - just enter name without full registration */}
                        {!showRegisterForm && !foundClient && phoneSearch && (
                            <div className="text-center">
                                <span className="text-xs text-slate-600">ou</span>
                                <button onClick={() => { setShowRegisterForm(true); setClientPhone(phoneSearch); }}
                                    className="text-xs text-gold-500 hover:underline ml-1">
                                    cadastrar rapidamente
                                </button>
                            </div>
                        )}

                        {!phoneSearch && (
                            <div className="text-center py-4">
                                <span className="text-xs text-slate-600">Não tem telefone?</span>
                                <button onClick={() => setShowRegisterForm(true)}
                                    className="text-xs text-gold-500 hover:underline ml-1">
                                    Cadastrar com apenas o nome
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Client confirmed */}
                {savedClient && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 space-y-3 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="text-green-500" size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-white text-lg">{savedClient.name}</p>
                                <p className="text-sm text-slate-400">{savedClient.phone} {savedClient.email ? `• ${savedClient.email}` : ''}</p>
                            </div>
                        </div>
                        <button onClick={() => { setSavedClient(null); setFoundClient(null); setShowRegisterForm(false); setPhoneSearch(''); setClientName(''); }}
                            className="text-xs text-slate-500 hover:text-slate-300 underline">
                            Trocar cliente
                        </button>
                    </div>
                )}

                <div className="flex justify-between pt-4 border-t border-slate-800">
                     <button onClick={() => setStep(3)} className="text-sm text-slate-400 hover:underline">Voltar</button>
                     <button onClick={() => { if(savedClient) setStep(5); }}
                        disabled={!savedClient}
                        className="bg-gold-500 text-slate-900 px-8 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gold-400 transition-colors shadow-lg shadow-gold-900/10">
                        Continuar
                     </button>
                </div>
            </div>
        )}

        {/* STEP 5: Confirmation */}
        {step === 5 && (
             <div className="space-y-6">
                <h3 className="text-xl font-bold text-gold-500">Confirmar Agendamento</h3>
                
                {/* Summary Card */}
                <div className="bg-slate-800/50 p-6 rounded-2xl space-y-3 border border-slate-700">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Cliente:</span>
                        <span className="text-white font-medium">{savedClient?.name}</span>
                    </div>
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
                                    <button key={p.id} onClick={() => toggleProduct(p.id)}
                                        className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                                            isSelected ? 'bg-gold-500/10 border-gold-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                        }`}>
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

                <div>
                    <label className="block text-sm text-slate-400 mb-1">Observações (Opcional)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500"
                        placeholder="Alguma preferência?" rows={2}
                    />
                </div>

                <button onClick={handleConfirm}
                    className="w-full bg-gold-500 text-slate-900 py-4 rounded-xl font-bold text-lg hover:bg-gold-400 transition-colors shadow-lg shadow-gold-500/10">
                    Confirmar Agendamento ({selectedProductIds.length > 0 ? 'Combo' : 'Serviço'})
                </button>
                <button onClick={() => setStep(4)} className="w-full text-center text-sm text-slate-400 mt-2 hover:underline">Voltar</button>
             </div>
        )}
      </div>
    </div>
  );
};
