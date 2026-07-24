import { Barber, Service, Product, AppConfig, Appointment, Expense, Revenue, Announcement } from './types';

export const INITIAL_CONFIG: AppConfig = {
  name: "BarberPro Elite",
  address: "Av. Paulista, 1000 - São Paulo, SP",
  phone: "(11) 99999-9999",
  whatsapp: "5511999999999",
  openingHour: 9,
  closingHour: 20,
  openDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
  logo: "", // Empty string will use default icon
  primaryColor: "#f59e0b", // Default Gold
  adminPassword: "123",
  adminUsername: "fabricio",
  caixaUsername: "caixa",
  caixaPassword: "caixa"
};

export const INITIAL_SERVICES: Service[] = [
  { id: 's1', name: 'Corte Clássico', price: 60, durationMinutes: 45, description: 'Corte tradicional com tesoura e máquina.', image: 'https://images.unsplash.com/photo-1599351431202-6e000542842e?auto=format&fit=crop&q=80&w=200' },
  { id: 's2', name: 'Barba Terapia', price: 45, durationMinutes: 30, description: 'Modelagem de barba com toalha quente.', image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=200' },
  { id: 's3', name: 'Combo Completo', price: 90, durationMinutes: 75, description: 'Corte de cabelo + Barba + Sobrancelha.', image: 'https://images.unsplash.com/photo-1503951914875-befbb7470d03?auto=format&fit=crop&q=80&w=200' },
  { id: 's4', name: 'Acabamento', price: 25, durationMinutes: 15, description: 'Apenas pezinho e contornos.', image: 'https://images.unsplash.com/photo-1593702295094-aea8cdd39d01?auto=format&fit=crop&q=80&w=200' },
];

export const INITIAL_BARBERS: Barber[] = [
  { 
    id: 'b1', 
    name: 'Maestro Silva', 
    specialties: ['Corte Clássico', 'Barba', 'Pigmentação'], 
    avatar: 'https://images.unsplash.com/photo-1583543735309-b5f70a75cdbd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80', 
    rating: 4.9, 
    commissionRate: 0.5, 
    username: 'maestro', 
    password: '123',
    experienceYears: 12,
    bio: 'Especialista em cortes clássicos e visagismo. Com mais de uma década de experiência, transformo o visual do cliente com precisão e estilo.',
    shiftStart: '09:00',
    shiftEnd: '19:00',
    breakStart: '12:00',
    breakEnd: '13:00'
  },
  { 
    id: 'b2', 
    name: 'Júnior Fade', 
    specialties: ['Degradê', 'Desenhos', 'Freestyle'], 
    avatar: 'https://images.unsplash.com/photo-1618077360395-f3068be8e001?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80', 
    rating: 4.7, 
    commissionRate: 0.4, 
    username: 'junior', 
    password: '123',
    experienceYears: 4,
    bio: 'Mestre nos degradês e cortes modernos. Apaixonado por tendências urbanas e arte no cabelo.',
    shiftStart: '10:00',
    shiftEnd: '20:00',
    breakStart: '14:00',
    breakEnd: '15:00'
  },
  { 
    id: 'b3', 
    name: 'Viktor Razor', 
    specialties: ['Barba Terapia', 'Corte na Tesoura'], 
    avatar: 'https://images.unsplash.com/photo-1521119989659-a83eee488058?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80', 
    rating: 4.8, 
    commissionRate: 0.45, 
    username: 'viktor', 
    password: '123',
    experienceYears: 8,
    bio: 'Foco total na experiência de barbearia tradicional. Especialista em relaxamento capilar e barba na navalha.',
    shiftStart: '09:00',
    shiftEnd: '18:00',
    breakStart: '13:00',
    breakEnd: '14:00'
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Pomada Matte', description: 'Fixação forte com efeito seco natural.', price: 35, stock: 12, category: 'Cabelo', image: 'https://picsum.photos/200/200?random=10' },
  { id: 'p2', name: 'Óleo de Barba', description: 'Hidratação profunda e brilho para a barba.', price: 40, stock: 5, category: 'Barba', image: 'https://picsum.photos/200/200?random=11' },
  { id: 'p3', name: 'Shampoo Mentolado', description: 'Limpeza refrescante para couro cabeludo.', price: 30, stock: 0, category: 'Lavagem', image: 'https://picsum.photos/200/200?random=12' },
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  { id: 'msg1', title: 'Promoção de Inauguração', message: 'Faça o combo Cabelo + Barba e ganhe uma bebida!', active: true, createdAt: new Date().toISOString() }
];

// Generate some appointments for today
const today = new Date();
today.setHours(10, 0, 0, 0);

export const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: 'a1', clientName: 'Carlos Oliveira', serviceId: 's1', barberId: 'b1', date: today.toISOString(), status: 'COMPLETED', totalPrice: 60 },
  { id: 'a2', clientName: 'Ricardo Santos', serviceId: 's3', barberId: 'b2', date: new Date(today.getTime() + 60*60*1000).toISOString(), status: 'IN_PROGRESS', totalPrice: 90 },
  { id: 'a3', clientName: 'Felipe Costa', serviceId: 's2', barberId: 'b1', date: new Date(today.getTime() + 120*60*1000).toISOString(), status: 'PENDING', totalPrice: 45 },
];

export const INITIAL_EXPENSES: Expense[] = [
  { id: 'e1', description: 'Conta de Energia', amount: 350.00, date: new Date().toISOString(), category: 'FIXED' },
  { id: 'e2', description: 'Internet Fibra', amount: 120.00, date: new Date().toISOString(), category: 'FIXED' },
  { id: 'e3', description: 'Produtos de Limpeza', amount: 85.50, date: new Date().toISOString(), category: 'VARIABLE' },
];

export const INITIAL_REVENUES: Revenue[] = [
    { id: 'r1', description: 'Venda de Pomada (Balcão)', amount: 35.00, date: new Date().toISOString(), category: 'PRODUCT' }
];