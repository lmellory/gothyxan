'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useSessionStore } from '@/store/use-session-store';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

type Mode = 'login' | 'register' | 'verify' | 'reset-request' | 'reset-confirm';

export function AuthPanel() {
  const router = useRouter();
  const session = useSessionStore();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const title = useMemo(() => {
    if (mode === 'register') return 'Create account';
    if (mode === 'verify') return 'Verify email';
    if (mode === 'reset-request') return 'Request reset';
    if (mode === 'reset-confirm') return 'Set new password';
    return 'Sign in';
  }, [mode]);

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const response = await api.register({ email, password, name: name || undefined });
      setInfo(`${response.message}. Check your inbox or console email logs.`);
      setMode('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const tokens = await api.verifyEmail({ email, code });
      session.setTokens(tokens);
      await session.fetchMe();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const tokens = await api.login({ email, password });
      session.setTokens(tokens);
      await session.fetchMe();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function onRequestReset(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const response = await api.requestPasswordReset({ email });
      setInfo(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset request failed');
    } finally {
      setLoading(false);
      setMode('reset-confirm');
    }
  }

  async function onResetPassword(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const response = await api.resetPassword({ email, code, newPassword });
      setInfo(response.message);
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full max-w-lg"
    >
      <Card>
        <CardHeader>
          <Badge>GOTHYXAN Account</Badge>
          <CardTitle className="mt-3">{title}</CardTitle>
          <CardDescription>
            Email verification and secure JWT session for Web and API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="rounded-md bg-[#3a1c1f] p-3 text-sm text-[#f7b9be]">{error}</p> : null}
          {info ? <p className="rounded-md bg-[#1f3428] p-3 text-sm text-[#b7f5ca]">{info}</p> : null}

          {(mode === 'login' || mode === 'register' || mode === 'verify' || mode === 'reset-request' || mode === 'reset-confirm') && (
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </div>
          )}

          {mode === 'register' ? (
            <form className="space-y-4" onSubmit={onRegister}>
              <div>
                <Label>Name (optional)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars"
                />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? 'Creating...' : 'Create account'}
              </Button>
            </form>
          ) : null}

          {mode === 'verify' ? (
            <form className="space-y-4" onSubmit={onVerify}>
              <div>
                <Label>6-digit code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify and continue'}
              </Button>
            </form>
          ) : null}

          {mode === 'login' ? (
            <form className="space-y-4" onSubmit={onLogin}>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          ) : null}

          {mode === 'reset-request' ? (
            <form className="space-y-4" onSubmit={onRequestReset}>
              <Button className="w-full" disabled={loading}>
                {loading ? 'Requesting...' : 'Send reset code'}
              </Button>
            </form>
          ) : null}

          {mode === 'reset-confirm' ? (
            <form className="space-y-4" onSubmit={onResetPassword}>
              <div>
                <Label>Reset code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
              </div>
              <div>
                <Label>New password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => setMode('login')}>
              Sign in
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setMode('register')}>
              Register
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setMode('verify')}>
              Verify
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setMode('reset-request')}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
