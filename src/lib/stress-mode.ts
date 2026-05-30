/**
 * Stress Test Mode Helper
 *
 * Aktif hanya saat env STRESS_TEST_MODE=true.
 * Digunakan oleh client library (Telegram, DhruFusion, BinderByte) untuk
 * mengembalikan response mock alih-alih hit external API.
 *
 * Production safety: ketika env tidak di-set, fungsi return false dan
 * perilaku app 100% identik dengan kondisi normal.
 */

export function isStressTestMode(): boolean {
  return process.env.STRESS_TEST_MODE === 'true'
}

/**
 * Helper untuk simulate network latency di mock.
 * Digunakan di mock function agar test response time mencakup
 * ekspektasi delay external API.
 */
export async function mockDelay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}
