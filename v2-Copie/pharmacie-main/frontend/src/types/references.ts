export type Location = {
  location_id: number;
  lib: string | null;
};

export type MovementType = {
  movement_type_id: number;
  label: string | null;
};

export type PharmaClass = {
  pharma_class_id: number;
  label: string | null;
};

export type ProductTypeReference = {
  product_type_id: number;
  label: string | null;
};

export type DciReference = {
  dci_id: number;
  label: string | null;
};
