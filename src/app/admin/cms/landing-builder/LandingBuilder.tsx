'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeSlash,
  PencilSimple,
  Trash,
  Plus,
  X,
  ArrowsClockwise,
  ArrowSquareOut,
  Monitor,
  DeviceMobile,
  DeviceTablet,
  Lightning,
  ChartLineUp,
  GridFour,
  ListChecks,
  TreeStructure,
  Path,
  ChatTeardrop,
  Question,
  Image as ImageIcon,
  Megaphone,
  Buildings,
  TextAa,
  CodeSimple,
  Minus,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import { SortableList } from '@/components/dashboard/SortableList';
import {
  SECTION_TYPES,
  SECTION_LABELS,
  SECTION_DESCRIPTIONS,
  type SectionType,
} from '@/lib/cms-types';
import { SectionEditor } from './SectionEditor';

type Item = {
  id: string;
  sectionType: string;
  title: string | null;
  subtitle: string | null;
  content: unknown;
  settings?: unknown;
  isVisible: boolean;
};

const ICON_MAP: Record<string, Icon> = {
  hero: Lightning,
  stats: ChartLineUp,
  features: GridFour,
  service_catalog: ListChecks,
  method: TreeStructure,
  how_to_order: Path,
  testimonials: ChatTeardrop,
  faq: Question,
  banner_slider: ImageIcon,
  cta: Megaphone,
  partners: Buildings,
  running_ads: TextAa,
  custom_html: CodeSimple,
  spacer: Minus,
};

const DEVICES = [
  { key: 'desktop', label: 'Desktop', icon: Monitor, width: '100%' },
  { key: 'tablet', label: 'Tablet', icon: DeviceTablet, width: '768px' },
  { key: 'mobile', label: 'Mobile', icon: DeviceMobile, width: '390px' },
] as const;

type Device = (typeof DEVICES)[number]['key'];

export function LandingBuilder({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [device, setDevice] = React.useState<Device>('desktop');
  const [previewKey, setPreviewKey] = React.useState(0);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => setItems(initial), [initial]);

  const editingItem = items.find((i) => i.id === editing);

  function refreshPreview() {
    setPreviewKey((k) => k + 1);
  }

  async function persistOrder(next: Item[]) {
    setItems(next);
    const res = await fetch('/api/admin/cms/sections/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: next.map((i) => i.id) }),
    });
    if (!res.ok) {
      toast.error('Reorder failed');
      router.refresh();
    } else {
      toast.success('Order saved');
      refreshPreview();
    }
  }

  async function toggleVisible(item: Item) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isVisible: !i.isVisible } : i)),
    );
    const res = await fetch(`/api/admin/cms/sections/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !item.isVisible }),
    });
    if (!res.ok) {
      toast.error('Update failed');
    } else {
      toast.success(item.isVisible ? 'Section hidden' : 'Section visible');
      refreshPreview();
    }
  }

  async function remove(item: Item) {
    if (!confirm(`Delete ${SECTION_LABELS[item.sectionType as SectionType] ?? item.sectionType}?`))
      return;
    const res = await fetch(`/api/admin/cms/sections/${item.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Delete failed');
      return;
    }
    toast.success('Section deleted');
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    refreshPreview();
  }

  async function resetDefaults() {
    if (!confirm('Reset the home page to the default editorial composition? This deletes all current sections.'))
      return;
    const res = await fetch('/api/admin/cms/sections/reset?page=home', { method: 'POST' });
    if (!res.ok) {
      toast.error('Reset failed');
      return;
    }
    toast.success('Reset to defaults');
    router.refresh();
    refreshPreview();
  }

  // Auto-scroll preview to the section being edited
  function scrollPreviewTo(itemId: string) {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      // Sections render in document order; we use position by index
      const idx = items.findIndex((i) => i.id === itemId);
      if (idx < 0) return;
      const sections = doc.querySelectorAll<HTMLElement>('main > section, main > div[data-hidden-section]');
      const target = sections[idx];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch {
      // Silently ignore cross-origin oddities (won't happen on same origin)
    }
  }

  React.useEffect(() => {
    if (editing) {
      // Wait a tick for iframe to be ready
      setTimeout(() => scrollPreviewTo(editing), 100);
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-[calc(100vh-1px)] flex-col bg-paper-100">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-line bg-paper px-4 py-3 lg:px-6">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            § Admin · CMS
          </span>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-ink">
            Landing <span className="font-serif italic font-normal">page builder</span>.
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Device toggle */}
          <div className="hidden gap-1 rounded-full border border-line bg-paper-50 p-1 lg:flex">
            {DEVICES.map((d) => (
              <button
                key={d.key}
                onClick={() => setDevice(d.key)}
                title={d.label}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  device === d.key ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'
                }`}
              >
                <d.icon size={14} weight="bold" />
              </button>
            ))}
          </div>

          <button
            onClick={refreshPreview}
            title="Refresh preview"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper-50 hover:border-ink"
          >
            <ArrowsClockwise size={14} weight="bold" />
          </button>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-full border border-line bg-paper-50 px-3 py-2 text-xs font-bold hover:border-ink sm:inline-flex"
          >
            <ArrowSquareOut size={12} weight="bold" /> Open public site
          </a>

          <button
            onClick={resetDefaults}
            className="hidden rounded-full border border-line bg-paper-50 px-3 py-2 text-xs font-bold hover:border-ink lg:inline-block"
          >
            Reset defaults
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-12">
        {/* LEFT: Section list */}
        <aside className="col-span-12 flex flex-col border-r border-line bg-paper md:col-span-5 lg:col-span-4 xl:col-span-3">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Home · {items.length} {items.length === 1 ? 'section' : 'sections'}
            </span>
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-paper hover:bg-primary-600"
            >
              <Plus size={10} weight="bold" /> Add
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {items.length === 0 ? (
              <EmptyHint onAdd={() => setAdding(true)} />
            ) : (
              <SortableList
                items={items}
                onReorder={persistOrder}
                renderItem={(item) => (
                  <SectionRow
                    item={item}
                    active={editing === item.id}
                    onSelect={() => setEditing(item.id)}
                    onToggleVisible={() => toggleVisible(item)}
                    onEdit={() => setEditing(item.id)}
                    onDelete={() => remove(item)}
                  />
                )}
              />
            )}
          </div>

          {/* Bottom legend */}
          <div className="border-t border-line bg-paper-50 px-4 py-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-soft">
              Tip
            </div>
            <p className="mt-1 font-serif text-[12px] italic text-ink-muted">
              Drag any row by its handle to reorder. Click the section to edit and the preview
              will scroll to it.
            </p>
          </div>
        </aside>

        {/* RIGHT: Preview iframe + editor drawer */}
        <main className="col-span-12 flex min-h-0 flex-col bg-paper-200 md:col-span-7 lg:col-span-8 xl:col-span-9">
          <div className="flex items-center justify-between border-b border-line bg-paper-100 px-4 py-2">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <span className="live-dot" />
              Live preview · {device}
            </div>
            <div className="flex gap-1 lg:hidden">
              {DEVICES.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDevice(d.key)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    device === d.key ? 'bg-ink text-paper' : 'text-ink-muted'
                  }`}
                >
                  <d.icon size={11} weight="bold" />
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex flex-1 min-h-0">
            {/* Preview frame */}
            <div className="flex flex-1 items-start justify-center overflow-auto p-4 lg:p-6">
              <div
                className="relative shrink-0 overflow-hidden rounded-xl border border-line bg-paper shadow-card-hover transition-all"
                style={{ width: DEVICES.find((d) => d.key === device)!.width, maxWidth: '100%' }}
              >
                {/* Window chrome */}
                <div className="flex items-center gap-1.5 border-b border-line bg-paper-100 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-line" />
                  <span className="h-2 w-2 rounded-full bg-line" />
                  <span className="h-2 w-2 rounded-full bg-line" />
                  <span className="ml-3 truncate font-mono text-[10px] text-ink-muted">
                    nexus-server.local — preview
                  </span>
                </div>
                <iframe
                  key={previewKey}
                  ref={iframeRef}
                  src="/admin/cms/landing-builder/preview"
                  className="block w-full"
                  style={{
                    height:
                      device === 'mobile' ? '740px' : device === 'tablet' ? '900px' : '85vh',
                  }}
                  title="Landing preview"
                />
              </div>
            </div>

            {/* Editor drawer */}
            <AnimatePresence>
              {editingItem && (
                <motion.div
                  key={editingItem.id}
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-y-0 right-0 z-10 w-full overflow-y-auto border-l border-line bg-paper shadow-card-hover sm:w-[420px]"
                >
                  <div className="p-5">
                    <SectionEditor
                      item={editingItem}
                      onSaved={() => {
                        toast.success('Section saved');
                        router.refresh();
                        refreshPreview();
                      }}
                      onClose={() => setEditing(null)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {adding && (
        <AddSectionModal
          onClose={() => setAdding(false)}
          afterAdd={() => {
            router.refresh();
            refreshPreview();
          }}
        />
      )}
    </div>
  );
}

function SectionRow({
  item,
  active,
  onSelect,
  onToggleVisible,
  onEdit,
  onDelete,
}: {
  item: Item;
  active: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = ICON_MAP[item.sectionType] ?? Minus;
  return (
    <div
      onClick={onSelect}
      className={`group/section mb-2 cursor-pointer rounded-xl border bg-paper-50 p-3 transition-all hover:border-ink hover:shadow-card ${
        active ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-line'
      } ${item.isVisible ? '' : 'opacity-60'}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            active ? 'bg-primary-500 text-paper' : 'bg-ink text-paper'
          }`}
        >
          <Icon size={16} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold text-ink">
              {SECTION_LABELS[item.sectionType as SectionType] ?? item.sectionType}
            </span>
            <span className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-ink-muted">
              {item.sectionType}
            </span>
          </div>
          {item.title && (
            <div className="mt-0.5 truncate font-serif text-[11px] italic text-ink-muted">
              {item.title}
            </div>
          )}
        </div>
      </div>

      {/* Inline action toolbar */}
      <div className="mt-3 flex items-center gap-1 border-t border-line pt-2 opacity-70 transition-opacity group-hover/section:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible();
          }}
          title={item.isVisible ? 'Hide' : 'Show'}
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-paper-200 hover:text-ink"
        >
          {item.isVisible ? <Eye size={12} /> : <EyeSlash size={12} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Edit"
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-paper-200 hover:text-ink"
        >
          <PencilSimple size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-red-50 hover:text-red-600"
        >
          <Trash size={12} />
        </button>
      </div>
    </div>
  );
}

function EmptyHint({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line bg-paper-50 p-8 text-center">
      <p className="font-serif text-base italic text-ink-muted">No sections yet.</p>
      <p className="mt-2 font-serif text-xs italic text-ink-muted">
        Add your first section, or pop the public composition back in.
      </p>
      <div className="mt-5 flex flex-col items-stretch gap-2">
        <button
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper hover:bg-primary-600"
        >
          <Plus size={12} weight="bold" /> Add section
        </button>
      </div>
    </div>
  );
}

function AddSectionModal({
  onClose,
  afterAdd,
}: {
  onClose: () => void;
  afterAdd: () => void;
}) {
  const [submitting, setSubmitting] = React.useState<SectionType | null>(null);

  async function add(type: SectionType) {
    setSubmitting(type);
    const res = await fetch('/api/admin/cms/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageSlug: 'home', sectionType: type }),
    });
    setSubmitting(null);
    if (!res.ok) {
      toast.error('Add failed');
      return;
    }
    toast.success('Section added');
    afterAdd();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-line bg-paper shadow-card-hover"
      >
        <div className="flex items-center justify-between border-b border-line bg-paper-100 px-5 py-3">
          <h3 className="font-display text-base font-extrabold tracking-tight text-ink">
            Pick a section to add
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
        <div className="grid max-h-[64vh] grid-cols-1 gap-2 overflow-y-auto p-5 sm:grid-cols-2">
          {SECTION_TYPES.map((t) => {
            const Icon = ICON_MAP[t] ?? Minus;
            return (
              <button
                key={t}
                onClick={() => add(t)}
                disabled={!!submitting}
                className="group relative overflow-hidden rounded-xl border border-line bg-paper-50 p-4 text-left transition-all hover:border-ink hover:shadow-card disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-paper transition-colors group-hover:bg-primary-500">
                    <Icon size={18} weight="duotone" />
                  </span>
                  <div>
                    <div className="font-display text-sm font-bold text-ink">{SECTION_LABELS[t]}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-soft">
                      {t}
                    </div>
                  </div>
                </div>
                <p className="mt-3 font-serif text-xs italic text-ink-muted">
                  {SECTION_DESCRIPTIONS[t]}
                </p>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
