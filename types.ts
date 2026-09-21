export interface Item {
  id?: number;
  name: string;
  qty: number;
  initialRate: number;
  finalRate: number;
}

export interface Payment {
  id?: number;
  type: string;
  amount: number;
  date: string;
}

export interface SitePhotoItem {
  url: string;
  address?: string;
  lat?: string;
  lng?: string;
  timestamp?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  place: string;
  dispatchDate: string;
  returnDate: string | null;
  totalDays: number;
  sitePhotoUrl: string | null;
  sitePhotos: SitePhotoItem[];
  siteFullAddress: string | null;
  siteLat: string | null;
  siteLng: string | null;
  items: Item[];
  transportAgreed: number;
  transportSettled: number;
  payments: Payment[];
  status: "ON_SITE" | "PENDING_BALANCE" | "COMPLETED";
  finalLumpSum: number | null;
}

export interface DairyRecord {
  id: number;
  received_date: string;
  amount: number;
  notes: string;
}

export interface PavanExpense {
  id: number;
  created_at?: string;
  amount: number;
  source: string;
  expense_date: string;
  audio_url: string | null;
  created_by: string;
}

export interface BorrowingRepayment {
  id?: number;
  borrowing_id: number;
  amount: number;
  payment_type: "PRINCIPAL" | "INTEREST";
  repaid_date: string;
  source: string;
  screenshot_url?: string | null;
}

export interface PavanBorrowing {
  id: number;
  created_at?: string;
  person_name: string | null;
  amount: number;
  loan_type: "Friendly" | "Interest";
  interest_rate: string | null;
  borrowed_date: string;
  due_day_of_month?: number;
  reason_type: "TYPE" | "VOICE";
  reason_text: string | null;
  audio_url: string | null;
  status: "PENDING" | "CLEARED";
  created_by: string;
  repayments?: BorrowingRepayment[];
}

export interface JCBorrowing {
  id: number;
  created_at?: string;
  person_name: string;
  amount: number;
  loan_type: "Friendly" | "Interest";
  interest_rate: string | null;
  borrowed_date: string;
  due_day_of_month?: number;
  reason_type: "TYPE" | "VOICE";
  reason_text: string | null;
  audio_url: string | null;
  status: "PENDING" | "CLEARED";
  created_by: string;
  repayments?: BorrowingRepayment[];
}

export interface JCExpense {
  id: number;
  created_at?: string;
  amount: number;
  source: string;
  expense_date: string;
  audio_url: string | null;
  created_by: string;
}

export interface CreditCardProfile {
  id: number;
  created_at?: string;
  card_name: string;
  last_4_digits: string;
  credit_limit: number;
  billing_day: number;
  due_day: number;
  color_code: string;
}

export interface CreditCardSpend {
  id: number;
  card_id: number;
  amount: number;
  spend_date: string;
  category: string;
  reason_text: string | null;
  audio_url: string | null;
  created_by: string;
}

export interface CreditCardRepayment {
  id: number;
  card_id: number;
  amount: number;
  repaid_date: string;
  source: string;
  screenshot_url: string | null;
}

export interface VehicleEMI {
  id: number;
  vehicle_name: string;
  monthly_emi_amount: number;
  total_installments: number;
  completed_installments: number;
  due_day_of_month: number;
  bank_name?: string;
  payments?: VehicleEMIPayment[];
}

export interface VehicleEMIPayment {
  id: number;
  emi_id: number;
  amount: number;
  paid_date: string;
  source: string;
  receipt_url?: string | null;
}

export interface MargadarshiChit {
  id: number;
  member_name: string;
  chit_value: number;
  monthly_due_day: number;
  is_lifted: boolean;
  lifted_amount: number;
  lifted_date?: string | null;
  status: string;
  payments?: MargadarshiPayment[];
}

export interface MargadarshiPayment {
  id: number;
  chit_id: number;
  installment_amount: number;
  dividend_earned: number;
  paid_date: string;
  source: string;
  receipt_url?: string | null;
}

export interface JCSalaryRecord {
  id: number;
  salary_month: string;
  credited_date: string;
  gross_salary: number;
  deducted_amount: number;
  net_credited: number;
  payslip_photo_url?: string | null;
  audio_url?: string | null;
  notes?: string | null;
}

export interface DharmasthalaChit {
  id: number;
  group_name: string;
  total_loan_amount: number;
  weekly_kanth_amount: number;
  total_kanths: number;
  completed_kanths: number;
  start_date: string;
  meeting_day: string;
  payments?: DharmasthalaPayment[];
}

export interface DharmasthalaPayment {
  id: number;
  chit_id: number;
  amount: number;
  paid_date: string;
  kanth_number: number;
  source: string;
  receipt_url?: string | null;
}

export interface CashSourceOption {
  id: string;
  label: string;
  availableBalance: number;
}