import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { LedgerType } from './constants';
import type { Prisma as PrismaTypes } from '@prisma/client';

export class InsufficientBalanceError extends Error {
  constructor(message = 'Insufficient balance') {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export async function ensureWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: new Prisma.Decimal(0) },
  });
}

export async function debitWallet(
  tx: PrismaTypes.TransactionClient,
  userId: string,
  amount: Prisma.Decimal | number,
  description: string,
  referenceId?: string,
) {
  const amt = amount instanceof Prisma.Decimal ? amount : new Prisma.Decimal(amount);
  const wallet = await tx.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error('Wallet not found');
  if (wallet.balance.lessThan(amt)) throw new InsufficientBalanceError();

  const newBalance = wallet.balance.sub(amt);
  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: newBalance },
  });
  await tx.walletLedger.create({
    data: {
      walletId: wallet.id,
      type: LedgerType.PAYMENT,
      amount: amt.neg(),
      balance: newBalance,
      description,
      referenceId,
    },
  });
  return newBalance;
}

export async function creditWallet(
  tx: PrismaTypes.TransactionClient,
  userId: string,
  amount: Prisma.Decimal | number,
  type: 'TOPUP' | 'REFUND',
  description: string,
  referenceId?: string,
) {
  const amt = amount instanceof Prisma.Decimal ? amount : new Prisma.Decimal(amount);
  const wallet = await tx.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error('Wallet not found');

  const newBalance = wallet.balance.add(amt);
  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: newBalance },
  });
  await tx.walletLedger.create({
    data: {
      walletId: wallet.id,
      type,
      amount: amt,
      balance: newBalance,
      description,
      referenceId,
    },
  });
  return newBalance;
}
