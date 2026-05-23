import { NotebookText, Phone, Send } from 'lucide-react';

const contacts = [
  { name: 'Jordan Miles', score: '6/7', reason: 'Follow-up overdue by 3 days' },
  { name: 'Taylor Reed', score: '6/7', reason: 'High qualifier, never contacted' },
  { name: 'Alex Carter', score: '5/7', reason: 'Not contacted in 12 days' },
];

export function PowerListPreview() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[var(--color-card)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[var(--color-text)]">Power List</h2>
        <button type="button" className="text-sm font-bold text-[var(--color-primary)]">See all 10</button>
      </div>
      <div className="mt-3 space-y-3">
        {contacts.map((contact, idx) => (
          <div key={contact.name} className="rounded-xl bg-white/5 p-3">
            <div className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-bold text-[var(--color-text)]">{contact.name}</p>
                  <p className="shrink-0 text-xs text-[var(--color-gold)]">{contact.score}</p>
                </div>
                <p className="mt-1 text-xs text-[var(--color-sub)]">{contact.reason}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Call">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Text">
                    <Send className="h-4 w-4" />
                  </button>
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Notes">
                    <NotebookText className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
