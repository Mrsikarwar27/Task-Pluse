import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search, UserRound } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { cn } from '../lib/utils.js';

export default function ClientSelect({ clients, value, onChange, error, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  const selected = clients.find((client) => client.id === value);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        (client.phone || '').toLowerCase().includes(term)
    );
  }, [clients, query]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    const timer = setTimeout(() => searchRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      clearTimeout(timer);
    };
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    setOpen((current) => !current);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={cn(
          'input flex items-center justify-between gap-3 text-left',
          error && 'border-danger focus:border-danger focus:ring-danger',
          disabled && 'cursor-not-allowed bg-cream opacity-70'
        )}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={selected.name} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{selected.name}</span>
              <span className="block truncate text-xs text-muted">{selected.email}</span>
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted">
            <UserRound className="h-4 w-4" />
            Select a client
          </span>
        )}
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {error ? <p className="field-error">{error}</p> : null}

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
          <div className="relative border-b border-line p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-lg border-0 bg-transparent py-2 pl-8 pr-2 text-sm text-ink outline-none placeholder:text-muted"
              placeholder="Search by name, email or phone…"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5" role="listbox">
            {filtered.length ? (
              filtered.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  role="option"
                  aria-selected={client.id === value}
                  disabled={!client.isActive && client.id !== value}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-primary-softer disabled:cursor-not-allowed disabled:opacity-45',
                    client.id === value && 'bg-primary-soft'
                  )}
                  onClick={() => {
                    onChange(client.id);
                    setOpen(false);
                  }}
                >
                  <Avatar name={client.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {client.name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {client.email}
                      {!client.isActive ? ' · Inactive' : ''}
                    </span>
                  </span>
                  {client.id === value ? <Check className="h-4 w-4 text-primary" /> : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted">No clients match that search.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
