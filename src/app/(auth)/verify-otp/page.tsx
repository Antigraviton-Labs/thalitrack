'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar, Footer } from '@/components/layouts';

function VerifyOtpForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!email) {
            router.replace('/forgot-password');
        }
    }, [email, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Navigate to reset password with the token
                router.push(`/reset-password?email=${encodeURIComponent(email)}&token=${data.data.resetToken}`);
            } else {
                setError(data.error || 'Invalid or expired OTP.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!email) return null;

    return (
        <div className="w-full max-w-md card">
            <div className="text-center mb-8">
                <span className="text-4xl mb-4 block">✅</span>
                <h1 className="text-2xl font-bold mb-2">Verify OTP</h1>
                <p className="text-muted">
                    We sent a 6-digit code to <strong>{email}</strong>
                </p>
            </div>

            {error && (
                <div className="bg-error/10 text-error text-sm p-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="label">6-Digit OTP</label>
                    <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        className="input w-full text-center text-2xl tracking-[0.5em] py-4"
                        placeholder="••••••"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="btn btn-primary w-full py-3"
                >
                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
            </form>
            
            <div className="mt-6 text-center text-sm text-muted">
                Didn't receive the code?{' '}
                <button onClick={() => router.push('/forgot-password')} className="text-primary hover:underline">
                    Try sending again
                </button>
            </div>
        </div>
    );
}

export default function VerifyOtpPage() {
    return (
        <>
            <Navbar />
            <main className="min-h-screen flex items-center justify-center pt-20 pb-10 px-4">
                <Suspense fallback={<div className="text-center p-12 card"><span className="animate-spin text-4xl block mb-2">⏳</span>Loading...</div>}>
                    <VerifyOtpForm />
                </Suspense>
            </main>
            <Footer />
        </>
    );
}
