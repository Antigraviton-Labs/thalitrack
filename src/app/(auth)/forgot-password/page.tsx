'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar, Footer } from '@/components/layouts';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Navigate to verify-otp page with the email in query parameter
                router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
            } else {
                setError(data.error || 'Failed to send OTP. Please try again.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="min-h-screen flex items-center justify-center pt-20 pb-10 px-4">
                <div className="w-full max-w-md card">
                    <div className="text-center mb-8">
                        <span className="text-4xl mb-4 block">📧</span>
                        <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
                        <p className="text-muted">
                            Enter your email to receive a 6-digit OTP to reset your password.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-error/10 text-error text-sm p-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="label">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input w-full"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full py-3"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2 justify-center">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending...
                                </span>
                            ) : (
                                'Send OTP'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link href="/login" className="text-primary hover:underline text-sm font-medium">
                            &larr; Back to Login
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
