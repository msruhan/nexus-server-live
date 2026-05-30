import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const category = url.searchParams.get('category');
  const q = url.searchParams.get('q')?.trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 100), 1), 200);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { ticketCode: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: [{ status: 'asc' }, { lastReplyAt: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      ticketCode: true,
      subject: true,
      category: true,
      priority: true,
      status: true,
      lastReplyAt: true,
      lastReplyBy: true,
      imeiOrderId: true,
      serverOrderId: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { replies: true } },
    },
  });

  // Aggregate counts for the admin dashboard pill row.
  const countsByStatus = await prisma.supportTicket.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  return apiSuccess({
    tickets,
    counts: countsByStatus.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = c._count._all;
      return acc;
    }, {}),
  });
}
