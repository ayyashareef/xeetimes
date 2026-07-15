'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load the Cloudflare Turnstile widget script (only when configured).
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || document.getElementById('cf-turnstile-script')) return;
    const s = document.createElement('script');
    s.id = 'cf-turnstile-script';
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let turnstileToken = '';
    if (TURNSTILE_SITE_KEY) {
      turnstileToken = (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')?.value || '';
      if (!turnstileToken) {
        setError('Please complete the verification.');
        return;
      }
    }
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        turnstileToken,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
      } else {
        router.push('/admin');
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
      (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-center mb-8">
            <Image
              src="/xt-logo.png"
              alt="XeeTimes"
              width={75}
              height={80}
            />
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-center text-gray-500 mb-8">
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email or Username
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="you@example.com or username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="Enter your password"
              />
            </div>

            {TURNSTILE_SITE_KEY && (
              <div className="cf-turnstile flex justify-center" data-sitekey={TURNSTILE_SITE_KEY} data-theme="light" />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
