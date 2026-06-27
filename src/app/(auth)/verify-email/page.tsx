import { VerifyEmailClient } from './VerifyEmailClient';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token?.trim()) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-paper-50 p-8 text-center text-sm text-red-700">
        Missing verification token.
      </div>
    );
  }

  return <VerifyEmailClient token={token.trim()} />;
}
