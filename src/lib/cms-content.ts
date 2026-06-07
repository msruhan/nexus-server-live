import { defaultContent, type SectionType } from './cms-types';

/** Merge stored section JSON with typed defaults so nothing renders hardcoded. */
export function resolveSectionContent(
  sectionType: string,
  content: Record<string, unknown>,
): Record<string, unknown> {
  const defaults = defaultContent(sectionType as SectionType);
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) {
    return { ...content };
  }
  return { ...(defaults as Record<string, unknown>), ...content };
}
