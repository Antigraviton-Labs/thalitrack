'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Navbar, Footer } from '@/components/layouts';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { register } = useAuth();

    const initialRole = searchParams.get('role') === 'messOwner' ? 'messOwner' : 'student';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: initialRole as 'student' | 'messOwner',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name || !formData.email || !formData.password) {
            setError('Please fill in all required fields');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        const result = await register({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone || undefined,
            role: formData.role,
        });

        setIsLoading(false);

        if (result.success) {
            // Redirect based on role
            if (formData.role === 'messOwner') {
                router.push('/dashboard/mess-owner');
            } else {
                router.push('/discover');
            }
        } else {
            setError(result.error || 'Registration failed');
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
                            <h1 className="text-2xl font-bold mb-2">Create Your Account</h1>
                            <p className="text-muted">
                                {formData.role === 'messOwner'
                                    ? 'Start your 1-month free trial'
                                    : 'Find the best messes near you'}
                            </p>
                        </div>

                        {/* Role Toggle */}
                        <div className="flex rounded-lg overflow-hidden mb-6 border border-border">
                            <button
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, role: 'student' }))}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${formData.role === 'student'
                                    ? 'bg-primary text-white'
                                    : 'bg-card text-muted hover:text-foreground'
                                    }`}
                            >
                                🎓 I'm a Student
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, role: 'messOwner' }))}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${formData.role === 'messOwner'
                                    ? 'bg-primary text-white'
                                    : 'bg-card text-muted hover:text-foreground'
                                    }`}
                            >
                                🍳 I'm a Mess Owner
                            </button>
                        </div>

                        {error && (
                            <div className="bg-error/10 text-error text-sm p-3 rounded-lg mb-4">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Full Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Email *</label>
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
                                <label className="label">Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="10-digit mobile number"
                                    pattern="[6-9][0-9]{9}"
                                />
                            </div>

                            <div>
                                <label className="label">Password *</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="At least 8 characters"
                                    minLength={8}
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Confirm Password *</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Repeat your password"
                                    required
                                />
                            </div>

                            {formData.role === 'messOwner' && (
                                <div className="bg-success/10 text-success text-sm p-3 rounded-lg">
                                    🎁 <strong>1 Month Free Trial!</strong> No credit card required.
                                    Cancel anytime.
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary w-full py-3"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating account...
                                    </span>
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        </form>

                        <p className="text-center text-sm text-muted mt-6">
                            Already have an account?{' '}
                            <Link href="/login" className="text-primary hover:underline">
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}
