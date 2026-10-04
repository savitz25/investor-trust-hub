'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  MY_INVESTOR_WORKSPACE_HREF,
  MY_INVESTOR_WORKSPACE_LABEL,
  MY_TRUSTHUB_ACCOUNT_ENTRY_HREF,
  investorMyTrustHubAccountEntryEnabled,
  profileSaveLabel,
} from '@/lib/my-investor/account-presentation';
import {
  handoffForm,
  markHandoffSent,
  readHandoff,
  rememberHandoff,
  resumeDecision,
  type HandoffIntent,
  type StoredHandoff,
} from '@/lib/my-investor/handoff-form';
import { deviceFirstProfileSave, deviceFirstProfileUnsave } from '@/lib/my-investor/parent-adapter';
import { STORE_EVENT, isFirmSaved, type SavedFirmKind } from '@/lib/my-investor/storage';

function pageHidden(): boolean {
  return document.visibilityState === 'hidden';
}

/** Bundled master switch. While it is off the control never asks the server. */
const PARENT_SAVE_ENABLED = process.env.NEXT_PUBLIC_INVESTOR_PARENT_SAVE_ENABLED === '1';

function tickets(): Storage | null {
  try { return sessionStorage; } catch { return null; }
}

type Props = {
  slug: string;
  name: string;
  crd?: string | null;
  kind: SavedFirmKind;
  /** Official firm profiles only. Every other profile stays on the device. */
  parentHandoff?: boolean;
};

/**
 * One toggle: Save -> Saved -> Save. The device row changes immediately.
 * It never creates a Watch. Parent sync is staged by the server and is off in
 * production, so the control never reports an account Save on its own.
 */
export function SaveFirmButton({ slug, name, crd, kind, parentHandoff = false }: Props) {
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [releaseAdmitted, setReleaseAdmitted] = useState(false);
  const accountEntry = investorMyTrustHubAccountEntryEnabled();

  const sync = useCallback(() => {
    setSaved(isFirmSaved(slug));
  }, [slug]);

  const submitTicket = useCallback((ticket: StoredHandoff) => {
    const store = tickets();
    const form = handoffForm(ticket.target, ticket.continuationRef, ticket.intent);
    if (!store || !form || pageHidden()) return false;
    markHandoffSent(store, ticket);
    const element = document.createElement('form');
    element.method = 'POST';
    element.action = form.action;
    for (const [field, value] of [['continuationRef', form.continuationRef], ['intent', form.intent]] as const) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = field;
      input.value = value;
      element.append(input);
    }
    document.body.append(element);
    element.submit();
    return true;
  }, []);

  useEffect(() => {
    const initialize = window.setTimeout(sync, 0);
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [sync]);

  // The server decides release exposure for this profile; the control only asks.
  useEffect(() => {
    if (!parentHandoff || !PARENT_SAVE_ENABLED) return;
    let cancelled = false;
    setReleaseAdmitted(false);
    void fetch('/api/my-investor/profile-save?slug=' + encodeURIComponent(slug))
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { admitted?: boolean } | null) => {
        if (!cancelled) setReleaseAdmitted(body?.admitted === true);
      })
      .catch(() => {
        if (!cancelled) setReleaseAdmitted(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentHandoff, slug]);

  // Abandoned handoff recovery: a staged ticket that never left is sent once
  // the page is visible again. A sent ticket is never sent twice.
  useEffect(() => {
    if (!parentHandoff || !releaseAdmitted) return;
    const store = tickets();
    if (!store) return;
    const ticket = readHandoff(store, slug, Date.now());
    if (resumeDecision(ticket, document.visibilityState) === 'submit' && ticket) submitTicket(ticket);
  }, [parentHandoff, releaseAdmitted, slug, submitTicket]);

  function showNote(message: string) {
    setNote(message);
    window.setTimeout(() => setNote(null), 5000);
  }

  async function beginHandoff(intent: HandoffIntent): Promise<boolean> {
    const store = tickets();
    if (!parentHandoff || !releaseAdmitted || !store || pageHidden()) return false;
    setKeepOpen(true);
    try {
      const response = await fetch('/api/my-investor/profile-save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, intent, pageOpen: true }),
      });
      const body = await response.json() as { state?: string; target?: string; continuationRef?: string; intent?: string };
      if (body.state !== 'continue' || !body.target || !body.continuationRef || !body.intent) return false;
      const form = handoffForm(body.target, body.continuationRef, body.intent);
      if (!form) return false;
      const ticket: StoredHandoff = {
        slug,
        target: form.action,
        continuationRef: form.continuationRef,
        intent: form.intent,
        phase: 'staged',
        expiresAt: Date.now() + 600_000,
      };
      rememberHandoff(store, ticket);
      if (pageHidden()) return false;
      return submitTicket(ticket);
    } catch {
      return false;
    } finally {
      setKeepOpen(false);
    }
  }

  function onSave() {
    setError(null);
    const result = deviceFirstProfileSave({ slug, name, crd, kind });
    if (!result.device.ok) {
      setError(result.device.error);
      return;
    }
    sync();
    showNote('Saved on this device.');
    if (parentHandoff) void beginHandoff('save');
  }

  function onUnsave() {
    setError(null);
    deviceFirstProfileUnsave({ slug, crd, kind });
    sync();
    showNote('Removed on this device.');
    if (parentHandoff) void beginHandoff('unsave');
  }

  return (
    <div className="mt-5" data-my-investor-save={slug}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          className={saved ? 'th-btn-secondary' : 'th-btn-primary'}
          onClick={saved ? onUnsave : onSave}
          aria-pressed={saved}
          aria-label={`${profileSaveLabel(saved)} ${name}`}
        >
          {profileSaveLabel(saved)}
        </button>
        <Link href={MY_INVESTOR_WORKSPACE_HREF} className="text-sm font-semibold text-[var(--ith-navy)] underline">
          {MY_INVESTOR_WORKSPACE_LABEL}
        </Link>
        {parentHandoff && releaseAdmitted && accountEntry ? (
          <a
            href={MY_TRUSTHUB_ACCOUNT_ENTRY_HREF}
            className="text-sm font-semibold text-[var(--ith-navy)] underline"
            onClick={(event) => {
              event.preventDefault();
              void beginHandoff('save_signin').then((left) => {
                if (!left) window.location.assign(MY_TRUSTHUB_ACCOUNT_ENTRY_HREF);
              });
            }}
          >
            Sign in to My TrustHub
          </a>
        ) : null}
      </div>
      {keepOpen ? (
        <p className="mt-2 text-xs text-slate-600" role="status">Keep this page open</p>
      ) : null}
      {note ? (
        <p className="mt-2 text-xs text-slate-700" role="status">
          {note} Saved firms are research only. Saving does not create a Watch.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-rose-700" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
