import { randomBytes } from 'crypto';
import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/db';

function normalizeBackupCode(raw: string): string {
  return raw.replace(/^bc:/i, '').replace(/[\s-]/g, '').toUpperCase();
}

function generatePlainCode(): string {
  const hex = randomBytes(4).toString('hex').toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

export async function generateBackupCodesForUser(
  userId: string,
  count = 10,
): Promise<string[]> {
  await prisma.backupCode.deleteMany({
    where: { userId, usedAt: null },
  });

  const plainCodes: string[] = [];
  const rows: { userId: string; codeHash: string }[] = [];

  for (let i = 0; i < count; i++) {
    const plain = generatePlainCode();
    plainCodes.push(plain);
    const normalized = normalizeBackupCode(plain);
    rows.push({
      userId,
      codeHash: await hash(normalized, 10),
    });
  }

  await prisma.backupCode.createMany({ data: rows });
  return plainCodes;
}

export async function consumeBackupCode(userId: string, codePlain: string): Promise<boolean> {
  const normalized = normalizeBackupCode(codePlain);
  if (normalized.length < 8) return false;

  const unused = await prisma.backupCode.findMany({
    where: { userId, usedAt: null },
    select: { id: true, codeHash: true },
  });

  for (const row of unused) {
    if (!(await compare(normalized, row.codeHash))) continue;
    const updated = await prisma.backupCode.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return updated.count === 1;
  }
  return false;
}

export function isBackupCodeInput(input: string): boolean {
  const t = input.trim();
  return t.toLowerCase().startsWith('bc:') || /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/.test(t);
}
