import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Legacy CMS path — palette lives under /admin/appearance for all admins. */
export default function PalettePage() {
  redirect('/admin/appearance');
}
