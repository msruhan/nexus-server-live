import { Aurora } from './templates/Aurora';
import { Grid } from './templates/Grid';
import { Orbit } from './templates/Orbit';
import { Minimal } from './templates/Minimal';
import type { MaintenanceTemplateId, MaintenanceViewProps } from './types';

export function MaintenanceView({
  template,
  ...props
}: MaintenanceViewProps & { template: MaintenanceTemplateId }) {
  switch (template) {
    case 'grid':
      return <Grid {...props} />;
    case 'orbit':
      return <Orbit {...props} />;
    case 'minimal':
      return <Minimal {...props} />;
    case 'aurora':
    default:
      return <Aurora {...props} />;
  }
}
