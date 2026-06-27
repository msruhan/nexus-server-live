export type RegistrationActivationMode = 'AUTO' | 'MANUAL' | 'EMAIL';

export function parseRegistrationActivationMode(
  value: string | null | undefined,
): RegistrationActivationMode {
  if (value === 'MANUAL' || value === 'EMAIL') return value;
  return 'AUTO';
}

export function registrationActivationLabel(mode: RegistrationActivationMode): string {
  switch (mode) {
    case 'MANUAL':
      return 'Manual admin approval';
    case 'EMAIL':
      return 'Email verification link';
    default:
      return 'Auto active';
  }
}

export function userNeedsEmailVerification(user: {
  emailVerifiedAt: Date | null;
  emailVerificationToken: string | null;
}): boolean {
  return !user.emailVerifiedAt && Boolean(user.emailVerificationToken);
}

export function userPendingAdminActivation(user: {
  isActive: boolean;
  emailVerifiedAt: Date | null;
  emailVerificationToken: string | null;
}): boolean {
  return !user.isActive && !userNeedsEmailVerification(user);
}
