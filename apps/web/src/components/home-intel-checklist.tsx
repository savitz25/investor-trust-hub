'use client';

import { useEffect, useState } from 'react';
import type { ChecklistItem } from '@ith/domain';

const STORAGE_KEY = 'ith-home-research-checklist-v1';

export function HomeIntelChecklist({ items }: { items: ChecklistItem[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const done = items.filter((item) => checked[item.id]).length;

  return (
    <div>
      <p className="ith-kicker">
        {done} of {items.length} research steps marked. This is your process, not a score on any firm.
      </p>
      <ul className="ith-check">
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={Boolean(checked[item.id])}
                onChange={() => toggle(item.id)}
              />
              <span>
                {item.label}{' '}
                <a href={item.href}>Open related evidence</a>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
