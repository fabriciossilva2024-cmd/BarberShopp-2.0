import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Appointment, Barber, Product, Service, AppConfig, PaymentMethod, Expense, Revenue, Announcement, UserRole, Client } from './types';
import { supabase } from './supabaseClient';
import { addToOfflineQueue } from './offlineSync';
import { 
  INITIAL_CONFIG, 
  INITIAL_SERVICES, 
  INITIAL_BARBERS, 
  INITIAL_PRODUCTS, 
  INITIAL_APPOINTMENTS, 
  INITIAL_EXPENSES, 
  INITIAL_REVENUES, 
  INITIAL_ANNOUNCEMENTS 
} from './mockData';

// --- Helper for Error Extraction ---
const getErrorMessage = (e: any) => {
    if (typeof e === 'string') return e;
    if (e instanceof Error) return e.message;
    if (typeof e === 'object' && e !== null) {
        return e.message || e.error_description || e.details || e.hint || JSON.stringify(e);
    }
    return "Erro desconhecido";
};

// --- Helper for UUID Validation ---
const isValidUuid = (id: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// --- Mappers (Database <-> Frontend) ---

const mapAppointmentFromDB = (dbApt: any): Appointment => {
  const dateTimeStr = `${dbApt.appointment_date}T${dbApt.appointment_time}`;
  
  const statusMap: Record<string, Appointment['status']> = {
    'scheduled': 'PENDING',
    'confirmed': 'CONFIRMED',
    'in_progress': 'IN_PROGRESS',
    'finished': 'COMPLETED',
    'completed': 'COMPLETED',
    'canceled': 'CANCELLED',
    'cancelled': 'CANCELLED',
    'no_show': 'NO_SHOW',
    'pending': 'PENDING'
  };
  const rawStatus = dbApt.status ? dbApt.status.toLowerCase() : 'pending';
  const status = statusMap[rawStatus] || rawStatus.toUpperCase() as Appointment['status'];

    return {
    id: dbApt.id,
    clientName: dbApt.client_name,
    clientId: dbApt.client_id,
    serviceId: dbApt.service_id,
    barberId: dbApt.barber_id,
    date: dateTimeStr,
    status: status,
    totalPrice: dbApt.total_price || 0, 
    productIds: dbApt.product_ids || [], 
    commissionPaid: dbApt.commission_paid || false, 
    commissionPaymentMethod: dbApt.commission_payment_method,
    clientArrived: dbApt.client_arrived || false,
    notes: dbApt.notes || '' 
  };
};

  const mapBarberFromDB = (dbBarber: any, profile?: any): Barber => {
  return {
    id: dbBarber.id,
    name: dbBarber.name || 'Barbeiro',
    role: dbBarber.role || 'BARBER',
    specialties: dbBarber.specialty ? dbBarber.specialty.split(',') : [],
    avatar: dbBarber.avatar || 'https://images.unsplash.com/photo-1583543735309-b5f70a75cdbd?auto=format&fit=crop&w=500&q=80',
    rating: dbBarber.rating || 5.0,
    commissionRate: dbBarber.commission_rate ?? 0.5,
    username: dbBarber.username || dbBarber.email || '',
    password: '', 
    experienceYears: dbBarber.experience_years || 0,
    shiftStart: dbBarber.shift_start || '09:00',
    shiftEnd: dbBarber.shift_end || '18:00',
    breakStart: dbBarber.break_start || '12:00',
    breakEnd: dbBarber.break_end || '13:00',
    bio: dbBarber.bio || '',
    isOnBreak: dbBarber.is_on_break === true
  };
};

interface AppContextType {
  config: AppConfig;
  services: Service[];
  barbers: Barber[];
  products: Product[];
  appointments: Appointment[];
  expenses: Expense[];
  revenues: Revenue[];
  announcements: Announcement[];
  clients: Client[];
  loading: boolean;
  isSupabaseConnected: boolean;
  
  userRole: UserRole | undefined;
  currentUserId: string | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;

  addAppointment: (apt: Omit<Appointment, 'id'>) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  updateProductStock: (id: string, delta: number) => Promise<void>;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<string | null>;
  addBarber: (barber: Omit<Barber, 'id'>) => Promise<void>;
  updateBarber: (id: string, updates: Partial<Barber>) => Promise<void>;
  deleteBarber: (id: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  payCommission: (barberId: string, method: PaymentMethod) => Promise<void>;
  updateAppointmentCommission: (id: string, paid: boolean, method?: PaymentMethod) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addRevenue: (revenue: Omit<Revenue, 'id'>) => Promise<void>;
  deleteRevenue: (id: string) => Promise<void>;
  addService: (service: Omit<Service, 'id'>) => Promise<void>;
  updateService: (id: string, updates: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  confirmArrival: (id: string) => Promise<void>;
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt'>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  toggleAnnouncement: (id: string) => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<Client>;
  findClientByPhone: (phone: string) => Client | undefined;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  seedDatabase: () => Promise<void>;
  refreshData: (isBackground?: boolean) => Promise<void>; 
  testConnection: () => Promise<{ success: boolean; message: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | undefined>(() => {
    try { return (localStorage.getItem('barberpro_role') as UserRole) || undefined; } catch { return undefined; }
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try { return localStorage.getItem('barberpro_user_id') || null; } catch { return null; }
  });

  useEffect(() => {
    try {
      if (userRole) localStorage.setItem('barberpro_role', userRole);
      else localStorage.removeItem('barberpro_role');
      if (currentUserId) localStorage.setItem('barberpro_user_id', currentUserId);
      else localStorage.removeItem('barberpro_user_id');
    } catch {}
  }, [userRole, currentUserId]);
  
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // --- Auth Logic ---
  const checkUserRole = async (userId: string) => {
    try {
        if (!navigator.onLine) return;
        const { data, error } = await supabase
        .from('profiles')
        .select('role, id')
        .eq('id', userId)
        .single();
        
        if (data && !error) {
            setUserRole(data.role as UserRole);
            setCurrentUserId(userId);
        }
    } catch (e) { console.log('Auth check skipped or failed'); }
  };

  useEffect(() => {
    if (navigator.onLine) {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                checkUserRole(session.user.id);
            } else {
                const hasLocalRole = !!localStorage.getItem('barberpro_role');
                if (hasLocalRole) {
                    setUserRole(localStorage.getItem('barberpro_role') as UserRole);
                    setCurrentUserId(localStorage.getItem('barberpro_user_id'));
                }
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                checkUserRole(session.user.id);
            } else {
                const hasLocalRole = !!localStorage.getItem('barberpro_role');
                if (!hasLocalRole) {
                    setUserRole(undefined);
                    setCurrentUserId(null);
                }
            }
        });
        return () => subscription.unsubscribe();
    }
  }, []);

  const login = async (emailOrUsername: string, password: string) => {
    if (!navigator.onLine) {
      return { error: "Sem conexao com internet para login" };
    }

    const { data, error } = await supabase.rpc('login_user', {
      p_username: emailOrUsername,
      p_password: password
    });

    if (error) return { error: "Erro ao conectar ao servidor" };
    if (!data || !data.success) return { error: data?.error || "Usuario ou senha invalidos" };

    const authEmail = data.auth_email;
    if (!authEmail) return { error: "Erro de configuracao: email nao encontrado" };

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: password
    });

    if (authError) {
      console.error("Auth session error:", authError);
      return { error: "Erro ao criar sessao: " + authError.message };
    }

    setUserRole(data.role);
    setCurrentUserId(data.user_id);

    await fetchData(true);

    return { error: null };
  };

  const logout = async () => {
    if (navigator.onLine) await supabase.auth.signOut();
    setUserRole(undefined);
    setCurrentUserId(null);
    localStorage.removeItem('barberpro_role');
    localStorage.removeItem('barberpro_user_id');
  };

  // --- Data Fetching & Caching ---

  const saveToLocalStorage = (key: string, data: any) => {
      try { localStorage.setItem(key, JSON.stringify(data)); } 
      catch (e) { console.warn("Cache storage failed", e); }
  };

  const loadFromLocalStorage = () => {
      try {
          const cached = localStorage.getItem('barberpro_cache');
          if (cached) {
              const data = JSON.parse(cached);
              setServices(data.services || []);
              setProducts(data.products || []);
              setBarbers(data.barbers || []);
              setAppointments(data.appointments || []);
              setExpenses(data.expenses || []);
              setRevenues(data.revenues || []);
              setAnnouncements(data.announcements || []);
              setClients(data.clients || []);
              if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
              console.info("Loaded from Local Cache");
              return true;
          }
      } catch (e) { console.warn("Cache load failed", e); }
      return false;
  };

  const loadMockData = () => {
      console.log("Loading Mock Data (Fallback)");
      setServices(INITIAL_SERVICES);
      setProducts(INITIAL_PRODUCTS);
      setBarbers(INITIAL_BARBERS);
      setAppointments(INITIAL_APPOINTMENTS);
      setExpenses(INITIAL_EXPENSES);
      setRevenues(INITIAL_REVENUES);
      setAnnouncements(INITIAL_ANNOUNCEMENTS);
  };

  const fetchDataRef = useRef<((isBackground?: boolean) => Promise<void>) | null>(null);

  const fetchData = async (isBackground: boolean = false) => {
    if (!isBackground) setLoading(true);

    if (!navigator.onLine) {
        setIsSupabaseConnected(false);
        if (!loadFromLocalStorage()) {
             loadMockData();
        }
        if (!isBackground) setLoading(false);
        return;
    }

    try {
      const [servicesResult, configResult, productsResult, barbersResult, expResult, revResult, annResult, clientsResult, aptResult] = await Promise.all([
          supabase.from('services').select('*').eq('active', true),
          supabase.from('app_config_public').select('*').limit(1).maybeSingle(),
          supabase.from('products').select('*').eq('active', true),
          supabase.from('barbers').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('revenues').select('*'),
          supabase.from('announcements').select('*'),
          supabase.from('clients').select('*'),
          supabase.from('appointments').select('*')
      ]);

      const { data: servicesData, error: servicesError } = servicesResult;
      
      if (!servicesError) {
          setIsSupabaseConnected(true);
          const mappedServices: Service[] = servicesData ? servicesData.map((s: any) => ({
             id: s.id,
             name: s.name,
             price: s.price,
             durationMinutes: s.duration_minutes,
             description: s.description || '',
             image: s.image || s.image_url || '' 
         })) : [];
         setServices(mappedServices);

          // Config
          const { data: configData } = configResult;
          let newConfig = { ...config };
          if (configData) {
              newConfig = {
                  ...config,
                  name: configData.name || config.name,
                  address: configData.address || config.address,
                  phone: configData.phone || config.phone,
                  whatsapp: configData.whatsapp || config.whatsapp,
                  openingHour: configData.opening_hour || config.openingHour,
                  closingHour: configData.closing_hour || config.closingHour,
                  openDays: configData.open_days || config.openDays,
                  logo: configData.logo || config.logo,
                  primaryColor: configData.primary_color || config.primaryColor
                };
              setConfig(newConfig);
          }

          // Products
          const { data: productsData } = productsResult;
          const mappedProducts = productsData ? productsData.map((p: any) => ({
             id: p.id,
             name: p.name,
             price: p.price,
             stock: p.stock,
             description: p.description || '',
             category: p.category || 'Geral',
             image: p.image || p.image_url || ''
          })) : [];
          setProducts(mappedProducts);

          // Barbers
          const { data: barbersData } = barbersResult;
          let mappedBarbers: Barber[] = [];
          if (barbersData) {
               mappedBarbers = barbersData.map((b: any) => mapBarberFromDB(b));
          }
          setBarbers(mappedBarbers);

          // Expenses
          const { data: expData } = expResult;
          const mappedExpenses = expData ? expData.map((e: any) => ({
              id: e.id,
              description: e.description,
              amount: e.amount,
              date: e.date,
              category: e.category
          })) : [];
          setExpenses(mappedExpenses);

          // Revenues
          const { data: revData } = revResult;
          const mappedRevenues = revData ? revData.map((r: any) => ({
              id: r.id,
              description: r.description,
              amount: r.amount,
              date: r.date,
              category: r.category
          })) : [];
          setRevenues(mappedRevenues);

          // Announcements
          const { data: annData } = annResult;
          const mappedAnnouncements = annData ? annData.map((a: any) => ({
              id: a.id,
              title: a.title,
              message: a.message,
              active: a.active,
              createdAt: a.created_at
          })) : [];
          setAnnouncements(mappedAnnouncements);

          // Clients
          const { data: clientsData } = clientsResult;
          const mappedClients: Client[] = clientsData ? clientsData.map((c: any) => ({
              id: c.id,
              name: c.name,
              phone: c.phone || '',
              email: c.email || '',
              whatsapp: c.whatsapp || '',
              notes: c.notes || '',
              createdAt: c.created_at
          })) : [];
          setClients(mappedClients);

          // Appointments
          const { data: aptData } = aptResult;
          let mappedAppointments: Appointment[] = [];
          if (aptData) {
              mappedAppointments = aptData.map(mapAppointmentFromDB).map(apt => {
                   const sourceServices = mappedServices || []; 
                   let s = sourceServices.find((sv) => sv.id === apt.serviceId);
                   if (!s) s = INITIAL_SERVICES.find(is => is.id === apt.serviceId);
                   return { ...apt, totalPrice: apt.totalPrice || (s ? s.price : 0) };
              });
          }
          setAppointments(mappedAppointments);

          // Cache all data
          saveToLocalStorage('barberpro_cache', {
              services: mappedServices,
              products: mappedProducts,
              barbers: mappedBarbers,
              appointments: mappedAppointments,
              expenses: mappedExpenses,
              revenues: mappedRevenues,
              announcements: mappedAnnouncements,
              clients: mappedClients,
              config: newConfig
          });

      } else {
          console.warn("Supabase disconnected/error:", servicesError);
          setIsSupabaseConnected(false);
          if (!loadFromLocalStorage()) loadMockData();
      }

    } catch (error) {
      console.error("Error loading data:", error);
      setIsSupabaseConnected(false);
      if (!loadFromLocalStorage()) loadMockData();
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  fetchDataRef.current = fetchData;

  useEffect(() => {
    fetchData();
  }, []);

  // --- Realtime Subscription ---
  useEffect(() => {
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchDataRef.current?.(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => fetchDataRef.current?.(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, () => fetchDataRef.current?.(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchDataRef.current?.(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchDataRef.current?.(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchDataRef.current?.(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenues' }, () => fetchDataRef.current?.(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => fetchDataRef.current?.(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, () => fetchDataRef.current?.(true))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- Refresh on tab/mobile resume ---
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        fetchDataRef.current?.(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // --- Polling: sync with DB every 5s (reduced from 2s to lower Supabase load) ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        fetchDataRef.current?.(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const testConnection = async (): Promise<{ success: boolean; message: string }> => {
      try {
          if (!navigator.onLine) {
              return { success: false, message: "Sem conexão com a internet." };
          }
          // Try to fetch a single row from a public table to verify read access
          // using 'app_config' as it is a singleton usually always present
          const { data, error } = await supabase.from('app_config_public').select('id').limit(1);
          
          if (error) {
              console.error("Connection Test Error:", error);
              return { success: false, message: `Erro ao conectar: ${error.message}. Verifique se as tabelas existem.` };
          }
          
          return { success: true, message: "Conexão com Supabase ativa e operante!" };
      } catch (e: any) {
          console.error("Connection Test Exception:", e);
          return { success: false, message: `Erro Crítico: ${e.message}` };
      }
  };

  // --- Actions with Offline Queue Support ---

  const addAppointment = async (aptData: Omit<Appointment, 'id'>) => {
    const tempId = Math.random().toString(36).substr(2, 9);
    setAppointments(prev => [...prev, { ...aptData, id: tempId, status: 'PENDING' }]);

    const dateObj = new Date(aptData.date);
    const dbPayload = {
        client_name: aptData.clientName,
        service_id: aptData.serviceId,
        barber_id: aptData.barberId,
        appointment_date: `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`,
        appointment_time: `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:00`,
        status: 'scheduled',
        notes: aptData.notes || '',
        product_ids: aptData.productIds || [],
        total_price: aptData.totalPrice || 0
    };

    // Remove null/undefined values
    const cleanPayload: Record<string, any> = {};
    for (const [key, val] of Object.entries(dbPayload)) {
        cleanPayload[key] = val ?? (key === 'product_ids' ? [] : null);
    }

    if (!navigator.onLine) {
        addToOfflineQueue('appointments', 'INSERT', cleanPayload);
        return;
    }

    try {
        const { data, error } = await supabase.from('appointments').insert([cleanPayload]).select().single();
        if (error) {
            console.error('[Appointment Error]', error.message, error.details, error.hint);
            throw error;
        }
        if (data) {
            setAppointments(prev => prev.map(a => a.id === tempId ? { ...a, id: data.id } : a));
        }
    } catch (e: any) {
        console.error('[Appointment Failed]', e?.message || e);
        setAppointments(prev => prev.filter(a => a.id !== tempId));
    }
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    if (!isValidUuid(id)) return;

    const dbUpdates: any = {};
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
    if (updates.serviceId !== undefined) dbUpdates.service_id = updates.serviceId;
    if (updates.barberId !== undefined) dbUpdates.barber_id = updates.barberId;
    if (updates.totalPrice !== undefined) dbUpdates.total_price = updates.totalPrice;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.status !== undefined) {
        const statusToDb: Record<string, string> = {
            'PENDING': 'scheduled',
            'CONFIRMED': 'confirmed',
            'IN_PROGRESS': 'in_progress',
            'COMPLETED': 'finished',
            'CANCELLED': 'canceled',
            'NO_SHOW': 'no_show'
        };
        dbUpdates.status = statusToDb[updates.status] || 'scheduled';
    }
    if (updates.date !== undefined) {
        const d = new Date(updates.date);
        dbUpdates.appointment_date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        dbUpdates.appointment_time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;
    }

    if (!navigator.onLine) {
        addToOfflineQueue('appointments', 'UPDATE', { match: { id }, data: dbUpdates });
        return;
    }

    try {
        await supabase.from('appointments').update(dbUpdates).eq('id', id);
    } catch (e) {
        addToOfflineQueue('appointments', 'UPDATE', { match: { id }, data: dbUpdates });
    }
  };

  const deleteAppointment = async (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    if (!isValidUuid(id)) return;

    if (!navigator.onLine) {
        addToOfflineQueue('appointments', 'DELETE', { match: { id } });
        return;
    }

    try {
        await supabase.from('appointments').delete().eq('id', id);
    } catch (e) {
        addToOfflineQueue('appointments', 'DELETE', { match: { id } });
    }
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    if (!isValidUuid(id)) return;

    const statusToDb: Record<string, string> = {
        'PENDING': 'scheduled',
        'CONFIRMED': 'confirmed',
        'IN_PROGRESS': 'in_progress',
        'COMPLETED': 'finished',
        'CANCELLED': 'canceled',
        'NO_SHOW': 'no_show'
    };
    const dbStatus = statusToDb[status] || 'scheduled';
    
    if (!navigator.onLine) {
        addToOfflineQueue('appointments', 'UPDATE', { match: { id }, data: { status: dbStatus } });
        return;
    }

    try {
        await supabase.from('appointments').update({ status: dbStatus }).eq('id', id);
    } catch (e) {
        addToOfflineQueue('appointments', 'UPDATE', { match: { id }, data: { status: dbStatus } });
    }
  };

  const confirmArrival = async (id: string) => {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, clientArrived: true } : a));
      if (!isValidUuid(id)) return;
      
      const payload = { client_arrived: true };
      if (!navigator.onLine) {
          addToOfflineQueue('appointments', 'UPDATE', { match: { id }, data: payload });
          return;
      }
      try {
          await supabase.from('appointments').update(payload).eq('id', id);
      } catch (e) {
          addToOfflineQueue('appointments', 'UPDATE', { match: { id }, data: payload });
      }
  };

  const updateProductStock = async (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const newStock = Math.max(0, product.stock + delta);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p));
    
    if (!isValidUuid(id)) return;
    
    if (!navigator.onLine) {
        addToOfflineQueue('products', 'UPDATE', { match: { id }, data: { stock: newStock } });
        return;
    }

    try {
        await supabase.from('products').update({ stock: newStock }).eq('id', id);
    } catch (e) {
        addToOfflineQueue('products', 'UPDATE', { match: { id }, data: { stock: newStock } });
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    const tempId = Math.random().toString(36).substr(2, 9);
    setProducts(prev => [...prev, { ...product, id: tempId }]);

    const dbPayload = {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        category: product.category,
        image: product.image,
        active: true
    };

    if (!navigator.onLine) {
        addToOfflineQueue('products', 'INSERT', dbPayload);
        return;
    }

    try {
        const { data, error } = await supabase.from('products').insert([dbPayload]).select().single();
        if (error) throw error;
        if (data) setProducts(prev => prev.map(p => p.id === tempId ? { ...p, id: data.id } : p));
    } catch(e) { 
        addToOfflineQueue('products', 'INSERT', dbPayload);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    if (!isValidUuid(id)) return;

      const payload: any = {};
      if(updates.name !== undefined) payload.name = updates.name;
      if(updates.description !== undefined) payload.description = updates.description;
      if(updates.price !== undefined) payload.price = updates.price;
      if(updates.stock !== undefined) payload.stock = updates.stock;
      if(updates.category !== undefined) payload.category = updates.category;
      if(updates.image !== undefined) payload.image = updates.image;

      if (!navigator.onLine) {
          addToOfflineQueue('products', 'UPDATE', { match: { id }, data: payload });
          return;
      }

      try {
          await supabase.from('products').update(payload).eq('id', id);
      } catch(e) { 
          addToOfflineQueue('products', 'UPDATE', { match: { id }, data: payload });
      }
  };

  const deleteProduct = async (id: string) => {
      setProducts(prev => prev.filter(p => p.id !== id));
      if (!isValidUuid(id)) return;
      
      if (!navigator.onLine) {
          addToOfflineQueue('products', 'DELETE', { id });
          return;
      }
      try {
          const { error } = await supabase.from('products').delete().eq('id', id);
          if (error) await supabase.from('products').update({ active: false }).eq('id', id);
      } catch (e) {
          addToOfflineQueue('products', 'DELETE', { id });
      }
  };

  const addService = async (service: Omit<Service, 'id'>) => {
      const tempId = Math.random().toString(36).substr(2, 9);
      setServices(prev => [...prev, { ...service, id: tempId }]);
      
      const dbPayload = {
          name: service.name,
          price: service.price,
          duration_minutes: service.durationMinutes,
          description: service.description,
          image: service.image,
          active: true
      };

      if (!navigator.onLine) {
          addToOfflineQueue('services', 'INSERT', dbPayload);
          return;
      }

      try {
        const { data, error } = await supabase.from('services').insert([dbPayload]).select().single();
        if (error) throw error;
        if (data) setServices(prev => prev.map(s => s.id === tempId ? { ...s, id: data.id } : s));
      } catch(e) { 
          addToOfflineQueue('services', 'INSERT', dbPayload);
      }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
      setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      if (!isValidUuid(id)) return;

      const payload: any = {};
      if(updates.name !== undefined) payload.name = updates.name;
      if(updates.price !== undefined) payload.price = updates.price;
      if(updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes;
      if(updates.description !== undefined) payload.description = updates.description;
      if(updates.image !== undefined) payload.image = updates.image;
      
      if (!navigator.onLine) {
          addToOfflineQueue('services', 'UPDATE', { match: { id }, data: payload });
          return;
      }

      try {
          await supabase.from('services').update(payload).eq('id', id);
      } catch(e) { 
          addToOfflineQueue('services', 'UPDATE', { match: { id }, data: payload });
      }
  };

  const deleteService = async (id: string) => {
      setServices(prev => prev.filter(s => s.id !== id));
      if (!isValidUuid(id)) return;

      if (!navigator.onLine) {
          addToOfflineQueue('services', 'DELETE', { id });
          return;
      }
      try {
          const { error } = await supabase.from('services').delete().eq('id', id);
          if (error) await supabase.from('services').update({ active: false }).eq('id', id);
      } catch (e) {
          addToOfflineQueue('services', 'DELETE', { id });
      }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
      const tempId = Math.random().toString(36).substr(2, 9);
      setExpenses(prev => [...prev, { ...expense, id: tempId }]);
      
      const dbPayload = {
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          date: expense.date
      };

      if (!navigator.onLine) {
          addToOfflineQueue('expenses', 'INSERT', dbPayload);
          return;
      }

      try {
          const { data, error } = await supabase.from('expenses').insert([dbPayload]).select().single();
          if (error) throw error;
          if(data) setExpenses(prev => prev.map(e => e.id === tempId ? { ...e, id: data.id } : e));
      } catch(e) { 
          addToOfflineQueue('expenses', 'INSERT', dbPayload);
      }
  };

  const deleteExpense = async (id: string) => {
      setExpenses(prev => prev.filter(e => e.id !== id));
      if (!isValidUuid(id)) return;
      
      if (!navigator.onLine) {
          addToOfflineQueue('expenses', 'DELETE', { id });
          return;
      }
      try {
          await supabase.from('expenses').delete().eq('id', id);
      } catch (e) {
          addToOfflineQueue('expenses', 'DELETE', { id });
      }
  };

  const addRevenue = async (revenue: Omit<Revenue, 'id'>) => {
      const tempId = Math.random().toString(36).substr(2, 9);
      setRevenues(prev => [...prev, { ...revenue, id: tempId }]);
      
      const dbPayload = {
          description: revenue.description,
          amount: revenue.amount,
          category: revenue.category,
          date: revenue.date
      };

      if (!navigator.onLine) {
          addToOfflineQueue('revenues', 'INSERT', dbPayload);
          return;
      }

      try {
          const { data, error } = await supabase.from('revenues').insert([dbPayload]).select().single();
          if (error) throw error;
          if(data) setRevenues(prev => prev.map(r => r.id === tempId ? { ...r, id: data.id } : r));
      } catch(e) { 
          addToOfflineQueue('revenues', 'INSERT', dbPayload);
      }
  };

  const deleteRevenue = async (id: string) => {
      setRevenues(prev => prev.filter(r => r.id !== id));
      if (!isValidUuid(id)) return;

      if (!navigator.onLine) {
          addToOfflineQueue('revenues', 'DELETE', { id });
          return;
      }
      try {
          await supabase.from('revenues').delete().eq('id', id);
      } catch (e) {
          addToOfflineQueue('revenues', 'DELETE', { id });
      }
  };

  const addAnnouncement = async (ann: Omit<Announcement, 'id' | 'createdAt'>) => {
      const tempId = Math.random().toString(36).substr(2, 9);
      const newAnn = { ...ann, id: tempId, createdAt: new Date().toISOString() };
      setAnnouncements(prev => [...prev, newAnn]);
      
      const dbPayload = {
          title: ann.title,
          message: ann.message,
          active: ann.active
      };

      if (!navigator.onLine) {
          addToOfflineQueue('announcements', 'INSERT', dbPayload);
          return;
      }

      try {
          const { data, error } = await supabase.from('announcements').insert([dbPayload]).select().single();
          if (error) throw error;
          if(data) setAnnouncements(prev => prev.map(a => a.id === tempId ? { ...a, id: data.id, createdAt: data.created_at } : a));
      } catch(e) { 
          addToOfflineQueue('announcements', 'INSERT', dbPayload);
      }
  };

  const deleteAnnouncement = async (id: string) => {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      if (!isValidUuid(id)) return;

      if (!navigator.onLine) {
          addToOfflineQueue('announcements', 'DELETE', { id });
          return;
      }
      try {
          await supabase.from('announcements').delete().eq('id', id);
      } catch (e) {
          addToOfflineQueue('announcements', 'DELETE', { id });
      }
  };

  const toggleAnnouncement = async (id: string) => {
      const ann = announcements.find(a => a.id === id);
      if(!ann) return;
      const newState = !ann.active;
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active: newState } : a));
      
      if (!isValidUuid(id)) return;
      
      if (!navigator.onLine) {
          addToOfflineQueue('announcements', 'UPDATE', { match: { id }, data: { active: newState } });
          return;
      }
      try {
          await supabase.from('announcements').update({ active: newState }).eq('id', id);
      } catch (e) {
          addToOfflineQueue('announcements', 'UPDATE', { match: { id }, data: { active: newState } });
      }
  };

  const addBarber = async (barber: Omit<Barber, 'id'>) => {
      const tempId = Math.random().toString(36).substr(2, 9);
      // Optimistic Update
      setBarbers(prev => [...prev, { ...barber, id: tempId }]);
      
      // Clean payload: Remove undefined/null values to avoid DB issues
      const rawPayload: Record<string, any> = {
            name: barber.name,
            role: barber.role || 'BARBER',
            specialty: (barber.specialties || []).join(','),
            avatar: barber.avatar,
            rating: barber.rating,
            commission_rate: barber.commissionRate,
            experience_years: barber.experienceYears,
            bio: barber.bio,
            shift_start: barber.shiftStart,
            shift_end: barber.shiftEnd,
            break_start: barber.breakStart,
            break_end: barber.breakEnd,
            active: true,
            username: barber.username,
            password: barber.password,
            ...(barber.isOnBreak !== undefined ? { is_on_break: barber.isOnBreak } : {})
      };

      // Remove null/undefined values to prevent Supabase errors
      const payload: Record<string, any> = {};
      for (const [key, val] of Object.entries(rawPayload)) {
          if (val !== null && val !== undefined) {
              payload[key] = val;
          }
      }
      
      // Only add email if valid username looks like email
      if (barber.username && barber.username.includes('@')) {
          payload.email = barber.username;
      }

      if (!navigator.onLine) {
          addToOfflineQueue('barbers', 'INSERT', payload);
          return;
      }
      
      try {
         const { data, error } = await supabase.from('barbers').insert([payload]).select().single();
         
         if (error) {
             throw error;
         }
         
          if(data) {
              setBarbers(prev => prev.map(b => b.id === tempId ? { ...b, id: data.id } : b));
              fetchData(true);

              if (barber.username && barber.password) {
                  const authEmail = 'barber_' + barber.name.toLowerCase().replace(/\s+/g, '_').replace(/\./g, '') + '@barbershop.app';
                  try {
                      await supabase.rpc('create_barber_auth_user', {
                          p_email: authEmail,
                          p_password: barber.password,
                          p_name: barber.name,
                          p_role: barber.role || 'BARBER'
                      });
                  } catch (authErr) {
                      console.warn('Auth user creation failed (non-critical):', authErr);
                  }
              }
          }
      } catch(e: any) { 
          setBarbers(prev => prev.filter(b => b.id !== tempId));
          throw e;
      }
  };

  const updateBarber = async (id: string, updates: Partial<Barber>) => {
      setBarbers(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
      if (!isValidUuid(id)) return;

      const payload: any = {};
      if(updates.name) payload.name = updates.name;
      if(updates.role) payload.role = updates.role;
      if(updates.specialties) payload.specialty = updates.specialties.join(',');
      if(updates.avatar) payload.avatar = updates.avatar;
      if(updates.commissionRate !== undefined) payload.commission_rate = updates.commissionRate;
      if(updates.experienceYears !== undefined) payload.experience_years = updates.experienceYears;
      if(updates.bio) payload.bio = updates.bio;
      if(updates.shiftStart !== undefined) payload.shift_start = updates.shiftStart;
      if(updates.shiftEnd !== undefined) payload.shift_end = updates.shiftEnd;
      if(updates.breakStart !== undefined) payload.break_start = updates.breakStart;
      if(updates.breakEnd !== undefined) payload.break_end = updates.breakEnd;
      if(updates.username) payload.username = updates.username;
      if(updates.password) payload.password = updates.password;
      if(updates.isOnBreak !== undefined) payload.is_on_break = updates.isOnBreak;

      if (!navigator.onLine) {
          addToOfflineQueue('barbers', 'UPDATE', { match: { id }, data: payload });
          return;
      }

      try {
          await supabase.from('barbers').update(payload).eq('id', id);

          if (updates.password) {
              const { data: profileData } = await supabase
                  .from('barbers').select('profile_id').eq('id', id).single();
              if (profileData?.profile_id) {
                  await supabase.rpc('update_auth_password', {
                      p_user_id: profileData.profile_id,
                      p_new_password: updates.password
                  });
              }
          }
      } catch(e) { 
          addToOfflineQueue('barbers', 'UPDATE', { match: { id }, data: payload });
      }
  };

  const deleteBarber = async (id: string) => {
      setBarbers(prev => prev.filter(b => b.id !== id));
      if (!isValidUuid(id)) return;

      if (!navigator.onLine) {
          addToOfflineQueue('barbers', 'DELETE', { id });
          return;
      }
      try {
          await supabase.from('barbers').delete().eq('id', id);
      } catch (e) {
          addToOfflineQueue('barbers', 'DELETE', { id });
      }
  };
  
  const payCommission = async (barberId: string, method: PaymentMethod) => {
    const targetApts = appointments.filter(a => 
        a.barberId === barberId && 
        a.status === 'COMPLETED' && 
        !a.commissionPaid
    );
    
    if (targetApts.length === 0) {
        alert("Nenhuma comissão pendente encontrada.");
        return;
    }

    const targetIds = targetApts.map(a => a.id);
    const validIds = targetIds.filter(id => isValidUuid(id));

    setAppointments(prev => prev.map(a => {
        if (targetIds.includes(a.id)) {
            return { ...a, commissionPaid: true, commissionPaymentMethod: method };
        }
        return a;
    }));

    if (validIds.length === 0) return;

    if (!navigator.onLine) {
        // Queue individual updates for offline sync reliability
        validIds.forEach(id => {
            addToOfflineQueue('appointments', 'UPDATE', { match: { id }, data: { commission_paid: true, commission_payment_method: method } });
        });
        
        // Queue expense creation
        const barber = barbers.find(b => b.id === barberId);
        const rate = barber?.commissionRate || 0;
        const total = targetApts.reduce((sum, a) => sum + (a.totalPrice * rate), 0);
        if (total > 0) {
            addToOfflineQueue('expenses', 'INSERT', {
                description: `Comissão - ${barber?.name || 'Profissional'}`,
                amount: total,
                category: 'VARIABLE',
                date: new Date().toISOString()
            });
        }
        return;
    }

    try {
        const { error: aptError } = await supabase
            .from('appointments')
            .update({ commission_paid: true, commission_payment_method: method })
            .in('id', validIds);

        if (aptError) throw aptError;

        const barber = barbers.find(b => b.id === barberId);
        const rate = barber?.commissionRate || 0;
        const total = targetApts.reduce((sum, a) => sum + (a.totalPrice * rate), 0);

        if (total > 0) {
             await addExpense({
                description: `Comissão - ${barber?.name || 'Profissional'}`,
                amount: total,
                category: 'VARIABLE',
                date: new Date().toISOString()
             });
        }
        await fetchData(true);
    } catch (e: any) {
        // Fallback to queue if network failed mid-op
        validIds.forEach(id => {
            addToOfflineQueue('appointments', 'UPDATE', { match: { id }, data: { commission_paid: true, commission_payment_method: method } });
        });
    }
  };

  const updateAppointmentCommission = async (id: string, paid: boolean, method?: PaymentMethod) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, commissionPaid: paid, ...(method ? { commissionPaymentMethod: method } : {}) } : a));
    if (!isValidUuid(id)) return;

    const payload: any = { commission_paid: paid };
    if (method) payload.commission_payment_method = method;

    if (!navigator.onLine) {
        addToOfflineQueue('appointments', 'UPDATE', { match: { id }, data: payload });
        return;
    }

    try {
        await supabase.from('appointments').update(payload).eq('id', id);
    } catch (e) {
        addToOfflineQueue('appointments', 'UPDATE', { match: { id }, data: payload });
    }
  };

  // --- Client Management ---
  const addClient = async (client: Omit<Client, 'id'>): Promise<Client> => {
    const tempId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9) + '-' + Date.now();

    const dbPayload = {
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      whatsapp: client.whatsapp || '',
      notes: client.notes || ''
    };

    if (!navigator.onLine) {
      const newClient: Client = { ...client, id: tempId };
      setClients(prev => [...prev, newClient]);
      addToOfflineQueue('clients', 'INSERT', dbPayload);
      return newClient;
    }

    try {
      const { data, error } = await supabase.from('clients').insert([dbPayload]).select().single();
      if (error) {
        console.error('[Supabase] Erro ao inserir cliente:', error.message, error);
        throw error;
      }
      if (data) {
        const savedClient: Client = {
          id: data.id,
          name: data.name,
          phone: data.phone || '',
          email: data.email || '',
          whatsapp: data.whatsapp || '',
          notes: data.notes || '',
          createdAt: data.created_at
        };
        setClients(prev => [...prev, savedClient]);
        return savedClient;
      }
    } catch (e) {
      console.error('[Supabase] Falha ao salvar cliente:', e);
      throw e;
    }
    return { ...client, id: tempId };
  };

  const findClientByPhone = (phone: string): Client | undefined => {
    if (!phone) return undefined;
    const clean = phone.replace(/\D/g, '');
    return clients.find(c => {
      if (!c.phone) return false;
      return c.phone.replace(/\D/g, '') === clean;
    });
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (!isValidUuid(id)) return;

    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.whatsapp !== undefined) payload.whatsapp = updates.whatsapp;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    if (!navigator.onLine) {
      addToOfflineQueue('clients', 'UPDATE', { match: { id }, data: payload });
      return;
    }

    try {
      await supabase.from('clients').update(payload).eq('id', id);
    } catch (e) {
      addToOfflineQueue('clients', 'UPDATE', { match: { id }, data: payload });
    }
  };

  const seedDatabase = async () => {
      if(!navigator.onLine) {
          alert("Necessário conexão para popular o banco.");
          return;
      }
      setLoading(true);
      try {
          // Insert services without fixed IDs - let Supabase generate UUIDs
          for (const s of INITIAL_SERVICES) {
              const { id: _id, ...serviceData } = s;
              await supabase.from('services').insert({ ...serviceData, duration_minutes: serviceData.durationMinutes, active: true });
          }
          // Insert products without fixed IDs - let Supabase generate UUIDs
          for (const p of INITIAL_PRODUCTS) {
              const { id: _id, ...productData } = p;
              await supabase.from('products').insert({ ...productData, active: true });
          }
          await fetchData();
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const updateConfig = async (newConfig: Partial<AppConfig>): Promise<string | null> => {
      setConfig(prev => ({ ...prev, ...newConfig }));
      
      const payload: any = { id: 1 };
      if (newConfig.name !== undefined) payload.name = newConfig.name;
      if (newConfig.address !== undefined) payload.address = newConfig.address;
      if (newConfig.phone !== undefined) payload.phone = newConfig.phone;
      if (newConfig.whatsapp !== undefined) payload.whatsapp = newConfig.whatsapp;
      if (newConfig.openingHour !== undefined) payload.opening_hour = newConfig.openingHour;
      if (newConfig.closingHour !== undefined) payload.closing_hour = newConfig.closingHour;
      if (newConfig.openDays !== undefined) payload.open_days = newConfig.openDays;
      if (newConfig.logo !== undefined) payload.logo = newConfig.logo;
      if (newConfig.primaryColor !== undefined) payload.primary_color = newConfig.primaryColor;
      if (newConfig.adminUsername !== undefined) payload.admin_username = newConfig.adminUsername;
      if (newConfig.adminPassword !== undefined) payload.admin_password = newConfig.adminPassword;
      if (newConfig.caixaUsername !== undefined) payload.caixa_username = newConfig.caixaUsername;
      if (newConfig.caixaPassword !== undefined) payload.caixa_password = newConfig.caixaPassword;

      if (!navigator.onLine) {
          addToOfflineQueue('app_config', 'UPSERT', payload);
          return 'Salvo offline - será sincronizado quando voltar a conexão.';
      }

      const { data: sessionData } = await supabase.auth.getSession();
      console.log("Session check before config save:", sessionData.session ? "ACTIVE" : "NO SESSION");

      try {
          const { data, error } = await supabase.from('app_config').upsert(payload).select();
          if (error) {
              console.error("Supabase Config Upsert Error:", JSON.stringify(error));
              addToOfflineQueue('app_config', 'UPSERT', payload);
              return `Erro ao salvar no banco: ${error.message} (verifique o console para detalhes)`;
          }
          console.log("Config saved successfully:", data);
          return null;
      } catch (e: any) {
          console.error("Config save failed:", e);
          addToOfflineQueue('app_config', 'UPSERT', payload);
          return `Falha na conexão: ${e.message || e}`;
      }
  };

  return (
    <AppContext.Provider value={{ 
        config, services, barbers, products, appointments, expenses, revenues, announcements, clients, loading, isSupabaseConnected,
        userRole, currentUserId, login, logout,
        addAppointment, updateAppointment, deleteAppointment, updateAppointmentStatus, updateProductStock, updateConfig, 
        addBarber, updateBarber, deleteBarber,
        addProduct, updateProduct, deleteProduct,
        payCommission, updateAppointmentCommission,
        addExpense, deleteExpense,
        addRevenue, deleteRevenue,
        addService, updateService, deleteService,
        confirmArrival,
        addAnnouncement, deleteAnnouncement, toggleAnnouncement,
        addClient, findClientByPhone, updateClient,
        seedDatabase,
        refreshData: fetchData,
        testConnection
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};