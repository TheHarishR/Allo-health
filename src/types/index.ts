// src/types/index.ts
export interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  totalStock: number;
  warehouses: WarehouseStock[];
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  productCount: number;
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'RELEASED';

export interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    imageUrl: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface ReserveRequest {
  productId: string;
  warehouseId: string;
  quantity: number;
}

export interface ReserveResponse {
  reservation: Reservation;
}
