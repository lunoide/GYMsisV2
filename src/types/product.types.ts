// Tipos de productos

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  imageUrl: string;
  stock: number;
  points: number;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  imageUrl: string;
  stock: number;
  points: number;
  createdBy: string;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  category?: ProductCategory;
  imageUrl?: string;
  stock?: number;
  points?: number;
  status?: ProductStatus;
}

export interface ProductSale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerId?: string; // ID del usuario si es miembro
  isMember: boolean; // Si el comprador es miembro
  pointsAwarded?: number; // Puntos otorgados por la compra
  saleDate: Date;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  notes?: string;
  soldBy: string;
  createdAt: Date;
}

export interface CreateProductSaleData {
  productId: string;
  quantity: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerId?: string; // ID del usuario si es miembro
  isMember: boolean; // Si el comprador es miembro
  paymentMethod: PaymentMethod;
  notes?: string;
  soldBy: string;
}

export type ProductCategory = 
  | 'supplements'
  | 'equipment'
  | 'apparel'
  | 'accessories'
  | 'nutrition'
  | 'other';

export type ProductStatus = 
  | 'active'
  | 'inactive'
  | 'out_of_stock';

export type PaymentMethod = 
  | 'cash'
  | 'card'
  | 'transfer'
  | 'other';

export type SaleStatus = 
  | 'completed'
  | 'pending'
  | 'cancelled';

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  totalSales: number;
  totalRevenue: number;
}

// Interfaz para subir imágenes a Postimages
export interface PostimagesResponse {
  status: string;
  url: string;
  direct_link: string;
  thumb: string;
  delete_url: string;
}