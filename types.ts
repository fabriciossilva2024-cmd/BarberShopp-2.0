export type UserRole = 'CLIENT' | 'BARBER' | 'ADMIN' | 'CAIXA';

export type PaymentMethod = 'PIX' | 'CASH' | 'TRANSFER';

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description: string;
  image?: string; // Added image field
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  image: string;
  category: string;
}

export interface Barber {
  id: string;
  name: string;
  role?: 'BARBER' | 'CAIXA';
  specialties: string[];
  avatar: string;
  rating: number;
  commissionRate: number; // 0.0 to 1.0
  username?: string;
  password?: string;
  bio?: string;
  experienceYears?: number;
  // Schedule Fields
  shiftStart?: string; // Format "HH:mm"
  shiftEnd?: string;   // Format "HH:mm"
  breakStart?: string; // Format "HH:mm"
  breakEnd?: string;   // Format "HH:mm"
  isOnBreak?: boolean;
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Appointment {
  id: string;
  clientName: string;
  clientId?: string;
  serviceId: string;
  barberId: string;
  date: string; // ISO String
  status: AppointmentStatus;
  notes?: string;
  totalPrice: number;
  productIds?: string[];
  commissionPaid?: boolean;
  commissionPaymentMethod?: PaymentMethod;
  clientArrived?: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  notes?: string;
  createdAt?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: 'FIXED' | 'VARIABLE' | 'MARKETING' | 'OTHER';
}

export interface Revenue {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: 'SERVICE' | 'PRODUCT' | 'OTHER';
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  active: boolean;
  createdAt: string;
}

export interface AppConfig {
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  openingHour: number;
  closingHour: number;
  openDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  logo?: string;
  primaryColor?: string; // Hex code for main branding color
  adminPassword?: string;
  adminUsername?: string; // Added admin username field
  caixaUsername?: string;
  caixaPassword?: string;
}