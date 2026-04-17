export type PrescriptionLine = {
  line_id: number;
  product_id: number;
  product_lib: string | null;
  total_qt: number;
  days: number | null;
  dist_number: number | null;
  is_periodic: number | null;
  periodicity: string | null;
  posologie: string | null;
  distributed: number | null;
};

export type Prescription = {
  prescription_id: number;
  agent_id: string | null;
  agent_situation: string | null;
  distributed: number | null;
  prescription_date: string | null;
  prescription_number: string | null;
  type: string | null;
  doctor_id: number | null;
  doctor_name: string | null;
  radios: string[];
  lines: PrescriptionLine[];
};

export type CreatePrescriptionLinePayload = {
  product_id: number;
  total_qt: number;
  days?: number;
  dist_number?: number;
  is_periodic?: number;
  periodicity?: string;
  posologie?: string;
  distributed?: number;
};

export type CreatePrescriptionPayload = {
  agent_id?: string;
  agent_situation?: string;
  distributed?: number;
  prescription_date?: string;
  prescription_number?: string;
  type?: string;
  doctor_id?: number;
  radios?: string[];
  lines: CreatePrescriptionLinePayload[];
};

export type PrescriptionDoctor = {
  doctor_id: number;
  name: string | null;
  specialty: string | null;
  address: string | null;
  tel: number | null;
  actived: number;
};

export type PrescriptionAgent = {
  agent_id: string;
  agent_situation: string | null;
};

export type PrescriptionType = {
  type: string;
};
