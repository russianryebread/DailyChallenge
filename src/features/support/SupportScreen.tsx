'use client';

import { useState } from 'react';

import type { Locale } from '@/src/core/types';
import { messages } from '@/src/i18n/messages';
import { TabBar } from '@/src/features/shell/TabBar';
import { AppMenu } from '@/src/features/shell/AppMenu';

// The publisher's existing support inbox. Absolute cross-origin URL because the
// app is served from app.dailychallenge.me. This is the only network request in
// the app and only fires on an explicit user submit.
const MAIL_ENDPOINT = 'https://dailychallenge.me/api/v1/mail';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; message: string }
  | { kind: 'error'; message: string };

export function SupportScreen({ locale }: { locale: Locale }) {
  const copy = messages(locale);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status.kind === 'sending') {
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus({ kind: 'error', message: copy.support.offline });
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      const response = await fetch(MAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subject: 'Daily Challenge app — support',
          email,
          phone: '',
          note,
        }),
      });
      let serverMessage = '';
      try {
        const data = (await response.json()) as { message?: string };
        serverMessage = data.message ?? '';
      } catch {
        /* non-JSON response */
      }
      if (response.ok) {
        setStatus({ kind: 'sent', message: serverMessage || copy.support.thanks });
        setName('');
        setEmail('');
        setNote('');
      } else {
        setStatus({ kind: 'error', message: serverMessage || copy.support.error });
      }
    } catch {
      setStatus({ kind: 'error', message: copy.support.error });
    }
  }

  const sending = status.kind === 'sending';

  return (
    <main className="app-shell">
      <section className="list-screen" aria-label={copy.support.title}>
        <header className="list-header">
          <div className="list-header-top">
            <p className="eyebrow list-eyebrow">{copy.tabs.settings}</p>
            <AppMenu locale={locale} active="settings" />
          </div>
          <h1>{copy.support.title}</h1>
        </header>

        <div className="support-body">
          <p className="support-intro">{copy.support.intro}</p>

          {status.kind === 'sent' ? (
            <p className="support-status support-success" role="status">
              {status.message}
            </p>
          ) : (
            <form className="support-form" onSubmit={onSubmit} noValidate>
              <label className="support-field">
                <span className="support-label">{copy.support.name}</span>
                <input
                  className="support-input"
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="support-field">
                <span className="support-label">{copy.support.email}</span>
                <input
                  className="support-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="support-field">
                <span className="support-label">{copy.support.message}</span>
                <textarea
                  className="support-input support-textarea"
                  name="note"
                  rows={5}
                  required
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>

              {status.kind === 'error' ? (
                <p className="support-status support-error" role="alert">
                  {status.message}
                </p>
              ) : null}

              <button
                className="support-submit"
                type="submit"
                disabled={sending || note.trim() === '' || email.trim() === ''}
              >
                {sending ? copy.support.sending : copy.support.submit}
              </button>
            </form>
          )}
        </div>

        <TabBar locale={locale} active="settings" />
      </section>
    </main>
  );
}
