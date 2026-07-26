import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.document.deleteMany();
  await prisma.partInstallation.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.fuelRecord.deleteMany();
  await prisma.vehicleAssignment.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  const mainBranch = await prisma.branch.create({
    data: {
      name: "Lagos HQ Branch",
      code: "BR-LOS-01",
      location: "Victoria Island, Lagos",
    },
  });

  const [ceoPassword, managerPassword, secretaryPassword] = await Promise.all([
    hashPassword("ceo_vehco_2026"),
    hashPassword("mgr_vehco_2026"),
    hashPassword("sec_vehco_2026"),
  ]);

  const ceo = await prisma.user.create({
    data: {
      name: "Chinedu Okonkwo",
      email: "ceo@vehco.com",
      password: ceoPassword,
      role: "CEO",
      branchId: mainBranch.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Amina Bello",
      email: "manager@vehco.com",
      password: managerPassword,
      role: "MANAGER",
      branchId: mainBranch.id,
    },
  });

  const secretary = await prisma.user.create({
    data: {
      name: "Tunde Adebayo",
      email: "secretary@vehco.com",
      password: secretaryPassword,
      role: "SECRETARY",
      branchId: mainBranch.id,
    },
  });

  const driver1 = await prisma.driver.create({
    data: {
      firstName: "Emeka",
      lastName: "Okafor",
      email: "e.okafor@vehco.com",
      phone: "+234-803-456-7890",
      licenseNumber: "LAG-DL-982341",
      licenseExpiry: new Date("2027-11-15"),
      employmentStatus: "ACTIVE",
      emergencyContact: "Ngozi Okafor (+234-802-111-2233)",
      branchId: mainBranch.id,
    },
  });

  const driver2 = await prisma.driver.create({
    data: {
      firstName: "Ibrahim",
      lastName: "Musa",
      email: "i.musa@vehco.com",
      phone: "+234-805-678-9012",
      licenseNumber: "ABJ-DL-773120",
      licenseExpiry: new Date("2026-08-20"),
      employmentStatus: "ACTIVE",
      emergencyContact: "Fatima Musa (+234-806-334-5566)",
      branchId: mainBranch.id,
    },
  });

  const vehicle1 = await prisma.vehicle.create({
    data: {
      code: "VEH-001",
      name: "Executive SUV Alpha",
      registrationNumber: "LAG-489-AB",
      vin: "1HGCR2F83HA000101",
      engineNumber: "ENG-88231",
      manufacturer: "Toyota",
      model: "Land Cruiser V8",
      year: 2023,
      colour: "Midnight Black",
      fuelType: "DIESEL",
      status: "ACTIVE",
      branchId: mainBranch.id,
      assignedDriverId: driver1.id,
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      code: "VEH-002",
      name: "Logistics Van Beta",
      registrationNumber: "ABJ-112-CD",
      vin: "1HGCR2F83HA000102",
      engineNumber: "ENG-44129",
      manufacturer: "Mercedes-Benz",
      model: "Sprinter 516",
      year: 2022,
      colour: "Silver Metallic",
      fuelType: "DIESEL",
      status: "ACTIVE",
      branchId: mainBranch.id,
      assignedDriverId: driver2.id,
    },
  });

  const vehicle3 = await prisma.vehicle.create({
    data: {
      code: "VEH-003",
      name: "Sedan Fleet Gamma",
      registrationNumber: "PHC-778-XY",
      vin: "1HGCR2F83HA000103",
      engineNumber: "ENG-10928",
      manufacturer: "Honda",
      model: "Accord EX-L",
      year: 2021,
      colour: "Pearl White",
      fuelType: "PETROL",
      status: "MAINTENANCE",
      branchId: mainBranch.id,
    },
  });

  await prisma.vehicleAssignment.create({
    data: {
      vehicleId: vehicle1.id,
      driverId: driver1.id,
      notes: "Primary executive assignment",
    },
  });

  await prisma.fuelRecord.create({
    data: {
      vehicleId: vehicle1.id,
      driverId: driver1.id,
      litres: 75.5,
      pricePerLitre: 1.85,
      totalCost: 139.68,
      odometer: 42350,
      vendor: "NNPC Mega Station, VI Lagos",
      date: new Date("2026-07-20"),
    },
  });

  await prisma.fuelRecord.create({
    data: {
      vehicleId: vehicle2.id,
      driverId: driver2.id,
      litres: 90.0,
      pricePerLitre: 1.85,
      totalCost: 166.5,
      odometer: 88100,
      vendor: "Total Energies, Garki Abuja",
      date: new Date("2026-07-22"),
    },
  });

  const maint1 = await prisma.maintenanceRecord.create({
    data: {
      vehicleId: vehicle3.id,
      serviceType: "Brake Pad Replacement & Rotor Skimming",
      labourCost: 150.0,
      partsCost: 320.0,
      totalCost: 470.0,
      vendor: "Elizade Toyota Service Centre, Ikeja",
      status: "PENDING",
      nextServiceDate: new Date("2027-01-15"),
    },
  });

  await prisma.partInstallation.create({
    data: {
      maintenanceRecordId: maint1.id,
      partName: "Ceramic Front Brake Pads",
      partNumber: "BP-HON-091",
      quantity: 1,
      unitCost: 220.0,
      totalCost: 220.0,
    },
  });

  await prisma.expense.create({
    data: {
      vehicleId: vehicle1.id,
      category: "INSURANCE",
      amount: 1200.0,
      description: "Annual Comprehensive Commercial Coverage",
      date: new Date("2026-01-10"),
    },
  });

  await prisma.approval.create({
    data: {
      entityType: "MAINTENANCE",
      entityId: maint1.id,
      requestedById: secretary.id,
      status: "PENDING",
      comments: "Urgent brake maintenance requested by driver",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: secretary.id,
      action: "CREATE_MAINTENANCE",
      entity: "MaintenanceRecord",
      entityId: maint1.id,
      details: "Submitted brake replacement request for VEH-003",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
