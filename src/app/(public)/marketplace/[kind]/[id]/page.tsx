import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ServiceStatus } from '@/lib/constants';
import { formatUSD } from '@/lib/format';
import { parseServerFieldDefs } from '@/lib/server-fields';
import { listEnabledGateways } from '@/lib/payment/registry';
import {
  marketplaceInitials,
  resolveMarketplaceImage,
} from '@/lib/marketplace';
import {
  MarketplaceServices,
  type ServiceRow,
} from '@/components/marketplace/MarketplaceServices';

export const dynamic = 'force-dynamic';

function toPlainText(html: string | null): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text || null;
}

const IMEI_BADGES: Array<[keyof ImeiRequireFlags, string]> = [
  ['requiresImei', 'IMEI'],
  ['requiresSn', 'Serial'],
  ['requiresEcid', 'ECID'],
  ['requiresNetwork', 'Network'],
  ['requiresModel', 'Model'],
  ['requiresProvider', 'Provider'],
  ['requiresPin', 'PIN'],
  ['requiresKbh', 'KBH'],
  ['requiresMep', 'MEP'],
  ['requiresPrd', 'PRD'],
];

type ImeiRequireFlags = {
  requiresImei: boolean;
  requiresNetwork: boolean;
  requiresModel: boolean;
  requiresProvider: boolean;
  requiresPin: boolean;
  requiresKbh: boolean;
  requiresMep: boolean;
  requiresPrd: boolean;
  requiresSn: boolean;
  requiresEcid: boolean;
};

export default async function MarketplaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { kind, id } = await params;
  const { service: initialServiceId } = await searchParams;
  if (kind !== 'imei' && kind !== 'server') notFound();

  const session = await auth();
  const isAuthenticated = !!session?.user && session.user.role === 'USER';
  const loginNext = `/marketplace/${kind}/${id}`;
  const guestGateways = (await listEnabledGateways())
    .filter((g) => g.ready)
    .map((g) => ({ id: g.id, label: g.label }));

  let title = '';
  let description: string | null = null;
  let imageUrl: string | null = null;
  let rows: ServiceRow[] = [];

  if (kind === 'imei') {
    const group = await prisma.imeiServiceGroup.findFirst({
      where: { id, marketplaceVisible: true },
      include: {
        services: { where: { status: ServiceStatus.ACTIVE }, orderBy: { price: 'asc' } },
      },
    });
    if (!group) notFound();
    title = group.title;
    description = group.description;
    imageUrl = group.imageUrl;
    rows = group.services.map((s) => ({
      description: toPlainText(s.description),
      badges: IMEI_BADGES.filter(([flag]) => s[flag]).map(([, label]) => label),
      modal: {
        kind: 'imei',
        id: s.id,
        title: s.title,
        priceLabel: formatUSD(s.price),
        deliveryTime: s.deliveryTime,
        requires: {
          imei: s.requiresImei,
          network: s.requiresNetwork,
          model: s.requiresModel,
          provider: s.requiresProvider,
          pin: s.requiresPin,
          kbh: s.requiresKbh,
          mep: s.requiresMep,
          prd: s.requiresPrd,
          sn: s.requiresSn,
          ecid: s.requiresEcid,
          email: false,
          note: false,
        },
      },
    }));
  } else {
    const box = await prisma.serverServiceBox.findFirst({
      where: { id, marketplaceVisible: true },
      include: {
        services: { where: { status: ServiceStatus.ACTIVE }, orderBy: { price: 'asc' } },
      },
    });
    if (!box) notFound();
    title = box.title;
    description = box.description;
    imageUrl = box.imageUrl;
    rows = box.services.map((s) => {
      const fieldDefs = parseServerFieldDefs(s.requiredFields);
      return {
        description: toPlainText(s.description),
        badges: fieldDefs.map((f) => f.label),
        modal: {
          kind: 'server' as const,
          id: s.id,
          title: s.title,
          priceLabel: formatUSD(s.price),
          deliveryTime: s.deliveryTime,
          fieldDefs,
        },
      };
    });
  }

  const heroImg = resolveMarketplaceImage(imageUrl);

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-16 lg:px-10 lg:py-24">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
      >
        ← Marketplace
      </Link>

      <div className="mt-6 overflow-hidden rounded-3xl border border-line">
        <div className="relative aspect-[16/6] bg-ink sm:aspect-[16/5]">
          {heroImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImg} alt={title} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink via-ink to-primary-700">
              <span className="font-display text-7xl font-black tracking-tight text-paper/20">
                {marketplaceInitials(title)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/70">
              {kind === 'imei' ? 'IMEI services' : 'Server services'}
            </span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-paper lg:text-5xl">
              {title}
            </h1>
          </div>
        </div>
      </div>

      {description && (
        <p className="mt-6 max-w-2xl font-serif text-lg italic text-ink-muted">{description}</p>
      )}

      <MarketplaceServices
        rows={rows}
        isAuthenticated={isAuthenticated}
        loginNext={loginNext}
        guestGateways={guestGateways}
        initialServiceId={initialServiceId ?? null}
      />
    </section>
  );
}
