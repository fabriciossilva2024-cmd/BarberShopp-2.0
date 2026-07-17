import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appointment, Barber, Product, Service, AppConfig, PaymentMethod, Expense, Revenue, Announcement, UserRole } from './types';
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
  
  let status: any = dbApt.status ? dbApt.status.toLowerCase() : 'pending';
  if (status === 'scheduled') status = 'PENDING';
  else if (status === 'finished') status = 'COMPLETED';
  else if (status === 'canceled') status = 'CANCELLED';
  else if (status === 'in_progress') status = 'IN_PROGRESS';
  else status = status.toUpperCase();

  return {
    id: dbApt.id,
    clientName: dbApt.client_name,
    serviceId: dbApt.service_id,
    barberId: dbApt.barber_id,
    date: dateTimeStr,
    status: status,
    totalPrice: 0, 
    productIds: dbApt.product_ids || [], 
    commissionPaid: dbApt.commission_paid || false, 
    commissionPaymentMethod: dbApt.commission_payment_method,
    clientArrived: dbApt.client_arrived || false,
    notes: dbApt.notes || '' 
  };
};

const mapBarberFromDB = (dbBarber: any, profile: any): Barber => {
  return {
    id: dbBarber.id,
    name: profile?.name || dbBarber.name || 'Barbeiro',
    specialties: dbBarber.specialty ? dbBarber.specialty.split(',') : [],
    avatar: dbBarber.avatar || 'https://images.unsplash.com/photo-1583543735309-b5f70a75cdbd?auto=format&fit=crop&w=500&q=80',
    rating: dbBarber.rating || 5.0,
    commissionRate: dbBarber.commission_rate ?? 0.5,
    username: profile?.email || dbBarber.username || dbBarber.email || '',
    password: dbBarber.password || '', 
    experienceYears: dbBarber.experience_years || 0,
    shiftStart: dbBarber.shift_start || '09:00',
    shiftEnd: dbBarber.shift_end || '18:00',
    breakStart: dbBarber.break_start || '12:00',
    breakEnd: dbBarber.break_end || '13:00',
    bio: dbBarber.bio || ''
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
  loading: boolean;
  isSupabaseConnected: boolean;
  
  userRole: UserRole | undefined;
  currentUserId: string | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;

  addAppointment: (apt: Omit<Appointment, 'id'>) => Promise<void>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  updateProductStock: (id: string, delta: number) => Promise<void>;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
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
  seedDatabase: () => Promise<void>;
  refreshData: (isBackground?: boolean) => Promise<void>; 
  testConnection: () => Promise<{ success: boolean; message: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

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
            if (session) checkUserRole(session.user.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) checkUserRole(session.user.id);
            else {
                setUserRole(undefined);
                setCurrentUserId(null);
            }
        });
        return () => subscription.unsubscribe();
    }
  }, []);

  const login = async (emailOrUsername: string, password: string) => {
    if (emailOrUsername === config.adminUsername && password === config.adminPassword) {
        setUserRole('ADMIN');
        setCurrentUserId('admin');
        return { error: null };
    }
    const mockBarber = barbers.find(b => b.username === emailOrUsername && b.password === password);
    if (mockBarber) {
        setUserRole('BARBER');
        setCurrentUserId(mockBarber.id);
        return { error: null };
    }
    
    if (!navigator.onLine) {
        return { error: "Sem conexão com internet para login" };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailOrUsername,
      password,
    });
    
    if (error) return { error: error.message };
    if (data.user) {
        await checkUserRole(data.user.id);
    }
    return { error: null };
  };

  const logout = async () => {
    if (navigator.onLine) await supabase.auth.signOut();
    setUserRole(undefined);
    setCurrentUserId(null);
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
      const { data: servicesData, error: servicesError } = await supabase.from('services').select('*').eq('active', true);
      
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
          const { data: configData } = await supabase.from('app_config').select('*').limit(1).single();
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
                  primaryColor: configData.primary_color || config.primaryColor,
                  adminUsername: configData.admin_username || config.adminUsername,
                  adminPassword: configData.admin_password || config.adminPassword
              };
              setConfig(newConfig);
          }

          // Products
          const { data: productsData } = await supabase.from('products').select('*').eq('active', true);
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
          const { data: barbersData } = await supabase.from('barbers').select(`*, profiles(name, role, email)`);
          let mappedBarbers: Barber[] = [];
          if (barbersData) {
              mappedBarbers = barbersData.map((b: any) => mapBarberFromDB(b, b.profiles));
          } else {
              const { data: simpleBarbers } = await supabase.from('barbers').select('*');
              mappedBarbers = simpleBarbers ? simpleBarbers.map((b: any) => mapBarberFromDB(b, null)) : [];
          }
          setBarbers(mappedBarbers);

          // Expenses
          const { data: expData } = await supabase.from('expenses').select('*');
          const mappedExpenses = expData ? expData.map((e: any) => ({
              id: e.id,
              description: e.description,
              amount: e.amount,
              date: e.date,
              category: e.category
          })) : [];
          setExpenses(mappedExpenses);

          // Revenues
          const { data: revData } = await supabase.from('revenues').select('*');
          const mappedRevenues = revData ? revData.map((r: any) => ({
              id: r.id,
              description: r.description,
              amount: r.amount,
              date: r.date,
              category: r.category
          })) : [];
          setRevenues(mappedRevenues);

          // Announcements
          const { data: annData } = await supabase.from('announcements').select('*');
          const mappedAnnouncements = annData ? annData.map((a: any) => ({
              id: a.id,
              title: a.title,
              message: a.message,
              active: a.active,
              createdAt: a.created_at
          })) : [];
          setAnnouncements(mappedAnnouncements);

          // Appointments
          const { data: aptData } = await supabase.from('appointments').select('*');
          let mappedAppointments: Appointment[] = [];
          if (aptData) {
              mappedAppointments = aptData.map(mapAppointmentFromDB).map(apt => {
                   const sourceServices = mappedServices || []; 
                   // @ts-ignore
                   let s = sourceServices.find((s:any) => s.id === apt.serviceId);
                   if (!s) s = INITIAL_SERVICES.find(is => is.id === apt.serviceId);
                   return { ...apt, totalPrice: s ? s.price : 0 };
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
              config: newConfig
          });

      } else {
          console.warn("Supabase disconnected/error:", servicesError);
          setIsSupabaseConnected(false);
          if (!loadFromLocalStorage()) loadMockData();
      }

    } catch (error) {
      console.error("Error loading Supabase data:", error);
      setIsSupabaseConnected(false);
      if (!loadFromLocalStorage()) loadMockData();
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const testConnection = async (): Promise<{ success: boolean; message: string }> => {
      try {
          if (!navigator.onLine) {
              return { success: false, message: "Sem conexão com a internet." };
          }
          // Try to fetch a single row from a public table to verify read access
          // using 'app_config' as it is a singleton usually always present
          const { data, error } = await supabase.from('app_config').select('id').limit(1);
          
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
        product_ids: aptData.productIds
    };

    if (!navigator.onLine) {
        addToOfflineQueue('appointments', 'INSERT', dbPayload);
        return;
    }

    try {
        const { data, error } = await supabase.from('appointments').insert([dbPayload]).select().single();
        if (error) throw error;
        if (data) {
            setAppointments(prev => prev.map(a => a.id === tempId ? { ...a, id: data.id } : a));
        }
    } catch (e: any) {
        console.warn("Offline/Error adding appointment, queuing...", e);
        addToOfflineQueue('appointments', 'INSERT', dbPayload);
    }
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    if (!isValidUuid(id)) return;

    let dbStatus = 'scheduled';
    if (status === 'COMPLETED') dbStatus = 'finished';
    if (status === 'CANCELLED') dbStatus = 'canceled';
    if (status === 'IN_PROGRESS') dbStatus = 'in_progress';
    
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
    if(updates.name) payload.name = updates.name;
    if(updates.description) payload.description = updates.description;
    if(updates.price) payload.price = updates.price;
    if(updates.stock) payload.stock = updates.stock;
    if(updates.category) payload.category = updates.category;
    if(updates.image) payload.image = updates.image;

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
      if(updates.name) payload.name = updates.name;
      if(updates.price) payload.price = updates.price;
      if(updates.durationMinutes) payload.duration_minutes = updates.durationMinutes;
      if(updates.description) payload.description = updates.description;
      if(updates.image) payload.image = updates.image;
      
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
      
      // Clean payload: Remove undefined values to avoid DB issues
      const payload: any = {
            name: barber.name,
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
            password: barber.password
      };
      
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
             console.error("Supabase Insert Error:", error);
             throw error;
         }
         
         if(data) {
             // Update local state with Real ID from DB
             setBarbers(prev => prev.map(b => b.id === tempId ? { ...b, id: data.id } : b));
             // Trigger background refresh to ensure consistency
             fetchData(true);
         }
      } catch(e) { 
          console.warn("Falling back to offline queue due to error:", e);
          addToOfflineQueue('barbers', 'INSERT', payload);
      }
  };

  const updateBarber = async (id: string, updates: Partial<Barber>) => {
      setBarbers(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
      if (!isValidUuid(id)) return;

      const payload: any = {};
      if(updates.name) payload.name = updates.name;
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

      if (!navigator.onLine) {
          addToOfflineQueue('barbers', 'UPDATE', { match: { id }, data: payload });
          return;
      }

      try {
          await supabase.from('barbers').update(payload).eq('id', id);
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

  const seedDatabase = async () => {
      if(!navigator.onLine) {
          alert("Necessário conexão para popular o banco.");
          return;
      }
      setLoading(true);
      try {
          for (const s of INITIAL_SERVICES) {
              await supabase.from('services').insert({ ...s, image: s.image, duration_minutes: s.durationMinutes, active: true });
          }
          for (const p of INITIAL_PRODUCTS) {
              await supabase.from('products').insert({ ...p, active: true });
          }
          await fetchData();
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
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

      if (!navigator.onLine) {
          addToOfflineQueue('app_config', 'UPSERT', payload);
          return;
      }

      try {
          const { error } = await supabase.from('app_config').upsert(payload);
          if (error) throw error;
      } catch (e) {
          addToOfflineQueue('app_config', 'UPSERT', payload);
      }
  };

  return (
    <AppContext.Provider value={{ 
        config, services, barbers, products, appointments, expenses, revenues, announcements, loading, isSupabaseConnected,
        userRole, currentUserId, login, logout,
        addAppointment, updateAppointmentStatus, updateProductStock, updateConfig, 
        addBarber, updateBarber, deleteBarber,
        addProduct, updateProduct, deleteProduct,
        payCommission, updateAppointmentCommission,
        addExpense, deleteExpense,
        addRevenue, deleteRevenue,
        addService, updateService, deleteService,
        confirmArrival,
        addAnnouncement, deleteAnnouncement, toggleAnnouncement,
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