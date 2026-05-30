// Edge-to-edge layout — the builder uses the full viewport so the iframe
// preview gets maximum space.

export default function LandingBuilderLayout({ children }: { children: React.ReactNode }) {
  return <div className="-mx-4 -my-8 sm:-mx-8 lg:-mx-12 lg:-my-12">{children}</div>;
}
