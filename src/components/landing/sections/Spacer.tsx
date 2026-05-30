const HEIGHTS: Record<string, string> = {
  sm: 'h-12 sm:h-16',
  md: 'h-20 sm:h-24',
  lg: 'h-32 sm:h-40',
  xl: 'h-44 sm:h-56',
};

export function Spacer({ height = 'md' }: { height?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return <div aria-hidden className={HEIGHTS[height] ?? HEIGHTS.md} />;
}
