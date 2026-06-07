'use client';

import { motion } from 'framer-motion';
import { Reveal } from '@/components/ui/Reveal';
import { RichText } from './RichText';

type Voice = {
  id: string;
  name: string;
  role?: string | null;
  rating?: number;
  content: string;
};

export function Voices({
  items,
  heading,
  emptyMessage,
}: {
  items?: Voice[];
  heading?: string;
  emptyMessage?: string;
}) {
  const list = items ?? [];
  const pull = list[0];
  const others = list.slice(1);
  const displayHeading = heading ?? 'What the {italic:resellers} say.';

  if (list.length === 0) {
    return (
      <section id="voices" className="relative">
        <div className="mx-auto max-w-[1400px] px-6 py-20 text-center lg:px-10 lg:py-32">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            <RichText text={displayHeading} />
          </h2>
          <p className="mx-auto mt-6 max-w-md font-serif text-sm italic text-ink-muted">
            {emptyMessage ?? 'No testimonials yet. Add items in Admin → Testimonials.'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="voices" className="relative">
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-32">
        <Reveal className="mb-14 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
              § Voices from the desk
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-[56px] lg:leading-[1.02]">
              <RichText text={displayHeading} />
            </h2>
          </div>
          <p className="font-serif text-lg italic leading-relaxed text-ink/70 lg:col-span-5 lg:col-start-8">
            People in different cities, asked the same thing. We didn&rsquo;t edit. The italic
            emphasis is theirs.
          </p>
        </Reveal>

        {pull && (
          <motion.figure
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative grid grid-cols-12 gap-6 border-b border-line pb-16 lg:gap-10"
          >
            <div className="col-span-12 flex items-start gap-4 lg:col-span-3">
              <span className="font-serif text-[100px] leading-[0.7] text-primary-500 lg:text-[140px]">
                &ldquo;
              </span>
            </div>
            <div className="col-span-12 lg:col-span-9">
              <blockquote
                className="font-serif text-2xl leading-[1.25] text-ink sm:text-3xl lg:text-[44px] lg:leading-[1.15]"
                dangerouslySetInnerHTML={{ __html: pull.content }}
              />
              <figcaption className="mt-8 flex items-center gap-4 border-t border-line pt-6">
                <Avatar name={pull.name} />
                <div>
                  <div className="font-display font-bold text-ink">{pull.name}</div>
                  {pull.role && (
                    <div className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                      {pull.role}
                    </div>
                  )}
                </div>
              </figcaption>
            </div>
          </motion.figure>
        )}

        {others.length > 0 && (
          <div className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {others.map((v, i) => (
              <motion.figure
                key={v.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
                className={i % 2 === 1 ? 'sm:mt-12' : ''}
              >
                <blockquote
                  className="font-serif text-lg leading-snug text-ink lg:text-xl"
                  dangerouslySetInnerHTML={{ __html: `&ldquo;${v.content}&rdquo;` }}
                />
                <figcaption className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                  <Avatar name={v.name} small />
                  <div>
                    <div className="font-display text-sm font-bold text-ink">{v.name}</div>
                    {v.role && (
                      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                        {v.role}
                      </div>
                    )}
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Avatar({ name, small }: { name: string; small?: boolean }) {
  const initial = name.charAt(0);
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-ink font-display font-bold text-paper ${
        small ? 'h-9 w-9 text-sm' : 'h-12 w-12 text-base'
      }`}
    >
      {initial}
    </span>
  );
}
