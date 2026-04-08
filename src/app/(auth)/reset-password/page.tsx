'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar, Footer } from '@/components/layouts';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';
    const token = searchParams.get('token') || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (!email || !token) {
            router.replace('/login');
        }
    }, [email, token, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, resetToken: token, newPassword }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccessMsg('Your password has been successfully reset! Redirecting to login...');
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            } else {
                setError(data.error || 'Failed to reset password. Token may have expired.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!email || !token) return null;

    return (
        <div className="w-full max-w-md card">
            <div className="text-center mb-8">
                <span className="text-4xl mb-4 block">🔑</span>
                <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
                <p className="text-muted">
                    Enter a new secure password for your account.
                </p>
            </div>

            {error && (
                <div className="bg-error/10 text-error text-sm p-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="bg-green-100 text-green-700 text-sm p-3 rounded-lg mb-4 text-center font-medium">
                    {successMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="label">New Password</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input w-full"
                        placeholder="Minimum 8 characters"
                        disabled={!!successMsg}
                        required
                    />
                </div>

                <div>
                    <label className="label">Confirm New Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input w-full"
                        placeholder="Re-enter your password"
                        disabled={!!successMsg}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !!successMsg}
                    className="btn btn-primary w-full py-3"
                >
                    {isLoading ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <>
            <Navbar />
            <main className="min-h-screen flex items-center justify-center pt-20 pb-10 px-4">
                <Suspense fallback={<div className="text-center p-12 card"><span className="animate-spin text-4xl block mb-2">⏳</span>Loading...</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </main>
            <Footer />
        </>
    );
}
