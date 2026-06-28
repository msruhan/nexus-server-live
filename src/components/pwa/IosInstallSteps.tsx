export function IosInstallSteps({
  siteName,
  compact = false,
}: {
  siteName: string;
  compact?: boolean;
}) {
  return (
    <ol
      className={`list-decimal space-y-1.5 pl-4 text-xs text-ink-muted ${compact ? '' : 'mt-2'}`}
    >
      <li>
        Tap the <strong className="text-ink">Share</strong> button in Safari (square with arrow).
      </li>
      <li>
        Scroll and tap <strong className="text-ink">Add to Home Screen</strong>.
      </li>
      <li>
        Open {siteName} from your home screen, then enable push in Settings.
      </li>
    </ol>
  );
}
