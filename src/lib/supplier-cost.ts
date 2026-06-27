import type { Prisma } from '@prisma/client';
import { toNum } from '@/lib/supplier-sync/money';

type ServiceWithSupplier = {
  supplierPrice?: Prisma.Decimal | null;
  price: Prisma.Decimal;
};

export function resolveSupplierCostAtOrder(service: ServiceWithSupplier): Prisma.Decimal {
  if (service.supplierPrice != null) {
    return service.supplierPrice;
  }
  return service.price;
}

export function supplierCostNumber(service: ServiceWithSupplier): number {
  return toNum(resolveSupplierCostAtOrder(service));
}
