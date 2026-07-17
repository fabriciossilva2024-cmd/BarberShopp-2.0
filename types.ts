export type UserRole = 'CLIENT' | 'BARBER' | 'ADMIN';

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
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Appointment {
  id: string;
  clientName: string; // Simplified for demo, usually would be a User ID
  serviceId: string;
  barberId: string;
  date: string; // ISO String
  status: AppointmentStatus;
  notes?: string;
  totalPrice: number;
  productIds?: string[]; // New field: Products included in the appointment
  commissionPaid?: boolean; // New field to track payout status
  commissionPaymentMethod?: PaymentMethod; // Track how it was paid
  clientArrived?: boolean; // Track if client is physically present
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
}