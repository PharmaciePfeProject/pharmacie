export type Doctor = {
  doctor_id: number;
  name: string | null;
  specialty: string | null;
  address: string | null;
  tel: number | null;
  actived: number;
};

export type DoctorsListResponse = {
  items: Doctor[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type DoctorFilters = {
  search?: string;
  specialty?: string;
  actived?: number;
  page?: number;
  pageSize?: number;
};

export type CreateDoctorPayload = {
  name: string;
  specialty?: string;
  address?: string;
  tel?: number;
};

export type UpdateDoctorPayload = {
  name: string;
  specialty?: string;
  address?: string;
  tel?: number;
  actived?: number;
};
