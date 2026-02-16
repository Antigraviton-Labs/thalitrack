'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Navbar, Footer } from '@/components/layouts';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.password) {
            setError('Please enter both email and password');
            return;
        }

        setIsLoading(true);

        const result = await login(formData.email, formData.password);

        setIsLoading(false);

        if (result.success) {
            // Get user role and redirect accordingly
            const storedToken = localStorage.getItem('thalitrack_token');
            if (storedToken) {
                try {
                    const response = await fetch('/api/auth/me', {
                        headers: { Authorization: `Bearer ${storedToken}` },
                    });
                    const data = await response.json();

                    if (data.success) {
                        switch (data.data.user.role) {
                            case 'admin':
                                router.push('/dashboard/admin');
                                break;
                            case 'messOwner':
                                router.push('/dashboard/mess-owner');
                                break;
                            case 'student':
                                router.push('/dashboard/student');
                                break;
                            default:
                                router.push('/discover');
                        }
                    }
                } catch {
                    router.push('/discover');
                }
            }
        } else {
            setError(result.error || 'Login failed');
        }
    };

    return (
        <>
            <Navbar />
            <main className="min-h-screen flex items-center justify-center pt-20 pb-10 px-4">
                <div className="w-full max-w-md">
                    <div className="card">
                        <div className="text-center mb-8">
                            <span className="text-4xl mb-4 block">🍽️</span>
                            <h1 className="text-2xl font-bold mb-2">Welcome Back!</h1>
                            <p className="text-muted">
                                Log in to continue finding great food
                            </p>
                        </div>

                        {error && (
                            <div className="bg-error/10 text-error text-sm p-3 rounded-lg mb-4">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" className="rounded border-border" />
                                    <span className="text-muted">Remember me</span>
                                </label>
                                <Link href="/forgot-password" className="text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary w-full py-3"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Logging in...
                                    </span>
                                ) : (
                                    'Log In'
                                )}
                            </button>
                        </form>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-card px-4 text-muted">or</span>
                            </div>
                        </div>

                        <p className="text-center text-sm text-muted">
                            Don't have an account?{' '}
                            <Link href="/register" className="text-primary hover:underline">
                                Create one
                            </Link>
                        </p>
                    </div>

                    {/* Quick Access Cards */}
                    <div className="mt-6 grid grid-cols-2 gap-4">
                        <Link href="/register" className="card text-center hover:border-primary transition-colors">
                            <span className="text-2xl mb-2 block">🎓</span>
                            <span className="text-sm font-medium">Student Signup</span>
                        </Link>
                        <Link href="/register?role=messOwner" className="card text-center hover:border-primary transition-colors">
                            <span className="text-2xl mb-2 block">🍳</span>
                            <span className="text-sm font-medium">List Your Mess</span>
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
