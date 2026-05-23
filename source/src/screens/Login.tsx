import type { FormEvent } from 'react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppButton } from '../components/ui/AppButton';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';

export function Login() {
  const { org, loading: orgLoading, error: orgError } = useOrg();
  const { user, login, registerUser, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [agentCode, setAgentCode] = useState('');
  const [leaderCode, setLeaderCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/home" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    let success = false;
    if (mode === 'login') {
      success = await login(name, pin);
    } else {
      success = await registerUser({ name, pin, agentCode, leaderCode });
    }
    if (!success) setSubmitting(false);
  }

  return (
    <main className="min-h-dvh bg-[var(--color-bg)] px-5 py-8 text-[var(--color-text)]">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--color-primary)]">Pulsenow</p>
          <h1 className="mt-3 text-4xl font-black tracking-normal">{org.name}</h1>
          <p className="mt-3 text-base leading-7 text-[var(--color-sub)]">Know who to call. Right now.</p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-[var(--color-card)] p-5 shadow-2xl shadow-black/20">
          <div className="mb-5 grid grid-cols-2 rounded-2xl bg-black/20 p-1">
            <button
              type="button"
              className={'min-h-11 rounded-xl text-sm font-bold ' + (mode === 'login' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-sub)]')}
              onClick={() => {
                clearError();
                setMode('login');
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={'min-h-11 rounded-xl text-sm font-bold ' + (mode === 'register' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-sub)]')}
              onClick={() => {
                clearError();
                setMode('register');
              }}
            >
              Register
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-base outline-none focus:border-[var(--color-primary)]" placeholder="Your name" />
            </label>

            {mode === 'register' ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Agent Code</span>
                  <input value={agentCode} onChange={(event) => setAgentCode(event.target.value)} className="min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-base outline-none focus:border-[var(--color-primary)]" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Leader Code</span>
                  <input value={leaderCode} onChange={(event) => setLeaderCode(event.target.value)} className="min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-base outline-none focus:border-[var(--color-primary)]" />
                </label>
              </div>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">4-digit PIN</span>
              <input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" className="min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-base outline-none focus:border-[var(--color-primary)]" placeholder="0000" />
            </label>

            {error || orgError ? <p className="rounded-xl border border-[var(--color-red)]/30 bg-[var(--color-red)]/10 p-3 text-sm text-[var(--color-text)]">{error || orgError}</p> : null}

            <AppButton className="w-full" type="submit" disabled={submitting || orgLoading}>
              {submitting ? 'Checking...' : mode === 'login' ? 'Log In' : 'Create Account'}
            </AppButton>
          </form>
        </section>
      </div>
    </main>
  );
}
