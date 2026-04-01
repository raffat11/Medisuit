
export type UserProfile = {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string | null;
}

export type Patient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isBlacklisted?: boolean;
  dateOfBirth?: string;
  weight?: number; // in kg
  height?: number; // in cm
};

export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'Programada' | 'Confirmada' | 'Completada' | 'Cancelada';
  isPriority?: boolean;
  appointmentType?: 'Primera Cita' | 'Terapia' | 'Consulta' | 'Control' | 'Otro';
  clinicalNoteId?: string;
  patient?: Patient;
};

export type Medication = {
  id: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
  supplier: string;
  price: number;
  cost?: number;
  classification: string;
  commonDosages?: string[];
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  price: number;
  isProvided?: boolean;
};

export type BillItem = {
  medicationId: string;
  medicationName: string;
  quantity: number;
  costPerUnit: number;
  expiryDate: string; // YYYY-MM-DD
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  date: string;
  items: InvoiceItem[];
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  appointmentId?: string;
};

export type Service = {
  id: string;
  name: string;
  price: number;
  isFixed?: boolean;
};

export type Bill = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: 'Proveedor' | 'Servicios' | 'Salarios' | 'Otros';
  supplier?: string;
  items?: BillItem[];
  status: 'Paid' | 'Pending';
};

export type ClinicalNote = {
  id: string;
  patientId: string;
  appointmentId: string;
  createdAt: any; // Firestore Timestamp
  notes: string;
  prescriptions: {
    medicationId: string;
    name: string;
    dosage: string;
  }[];
};

export type Chat = {
  id: string;
  participants: string[];
  userInfo: {
    uid: string;
    displayName: string;
    photoURL?: string | null;
  }[];
  lastMessage?: {
    text: string;
    createdAt: any;
  }
}

export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  createdAt: any; // Firestore Timestamp
}
