export type UserRole = "CEO" | "MANAGER" | "SECRETARY";

export type VehicleStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "ARCHIVED";

export interface BranchType {
  id: string;
  name: string;
  code: string;
  location?: string | null;
}

export interface UserType {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string | null;
}

export interface VehicleType {
  id: string;
  code: string;
  name: string;
  registrationNumber: string;
  vin?: string | null;
  engineNumber?: string | null;
  manufacturer: string;
  model: string;
  year: number;
  colour?: string | null;
  fuelType: string;
  status: VehicleStatus;
  branchId?: string | null;
  assignedDriverId?: string | null;
  assignedDriver?: DriverType | null;
  createdAt: string | Date;
}

export interface DriverType {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string | Date;
  employmentStatus: string;
  emergencyContact?: string | null;
  branchId?: string | null;
}

export interface FuelRecordType {
  id: string;
  vehicleId: string;
  vehicle?: VehicleType;
  driverId?: string | null;
  driver?: DriverType | null;
  litres: number;
  pricePerLitre: number;
  totalCost: number;
  odometer: number;
  vendor?: string | null;
  date: string | Date;
}

export interface MaintenanceRecordType {
  id: string;
  vehicleId: string;
  vehicle?: VehicleType;
  serviceType: string;
  labourCost: number;
  partsCost: number;
  totalCost: number;
  vendor?: string | null;
  receiptUrl?: string | null;
  photosUrl?: string | null;
  nextServiceDate?: string | Date | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string | Date;
}

export interface ExpenseType {
  id: string;
  vehicleId: string;
  vehicle?: VehicleType;
  category: string;
  amount: number;
  description?: string | null;
  date: string | Date;
}

export interface DocumentType {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  expiryDate?: string | Date | null;
  vehicleId?: string | null;
  driverId?: string | null;
}

export interface ApprovalType {
  id: string;
  entityType: string;
  entityId: string;
  requestedById: string;
  requestedBy?: UserType;
  approverId?: string | null;
  approver?: UserType | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comments?: string | null;
  createdAt: string | Date;
}
