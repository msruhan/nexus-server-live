import { Aurora } from './templates/Aurora';
import { Grid } from './templates/Grid';
import { Orbit } from './templates/Orbit';
import { Minimal } from './templates/Minimal';
import { sanitizeHtml } from '@/lib/sanitize-html';
import type { MaintenanceTemplateId, MaintenanceViewProps } from './types';

export function MaintenanceView({
  template,
  message,
  ...props
}: MaintenanceViewProps & { template: MaintenanceTemplateId }) {
  // Sanitize admin-supplied HTML message before it reaches dangerouslySetInnerHTML
  // in any template. Prevents stored XSS if the admin account is compromised.
  const safeMessage = sanitizeHtml(message ?? '');

  switch (template) {
    case 'grid':
      return <Grid message={safeMessage} {...props} />;
    case 'orbit':
      return <Orbit message={safeMessage} {...props} />;
    case 'minimal':
      return <Minimal message={safeMessage} {...props} />;
    case 'aurora':
    default:
      return <Aurora message={safeMessage} {...props} />;
  }
}
