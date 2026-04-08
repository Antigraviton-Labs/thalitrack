'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user } = useAuth();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl">🍽️</span>
                        <span className="text-xl font-bold"><span style={{ color: '#1A1208' }}>Thali</span><span style={{ color: '#E8861A' }}>Track</span></span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            href="/discover"
                            className="text-muted hover:text-foreground transition-colors"
                        >
                            Discover Messes
                        </Link>
                        <Link
                            href="/#features"
                            className="text-muted hover:text-foreground transition-colors"
                        >
                            Features
                        </Link>
                        <Link
                            href="/#pricing"
                            className="text-muted hover:text-foreground transition-colors"
                        >
                            Pricing
                        </Link>
                        <div className="flex items-center gap-3 ml-4">
                            {user ? (
                                <Link
                                    href={user.role === 'student' ? '/dashboard/student' : '/dashboard/mess-owner'}
                                    className="btn btn-primary"
                                >
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link href="/login" className="btn btn-secondary">
                                        Log In
                                    </Link>
                                    <Link href="/register" className="btn btn-primary">
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-card"
                        aria-label="Toggle menu"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {isMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-border animate-fadeIn">
                        <div className="flex flex-col gap-4">
                            <Link
                                href="/discover"
                                className="text-foreground hover:text-primary transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Discover Messes
                            </Link>
                            <Link
                                href="/#features"
                                className="text-foreground hover:text-primary transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Features
                            </Link>
                            <Link
                                href="/#pricing"
                                className="text-foreground hover:text-primary transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Pricing
                            </Link>
                            <div className="flex flex-col gap-2 pt-4 border-t border-border">
                                {user ? (
                                    <Link
                                        href={user.role === 'student' ? '/dashboard/student' : '/dashboard/mess-owner'}
                                        className="btn btn-primary w-full text-center"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Go to Dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link href="/login" className="btn btn-secondary w-full text-center" onClick={() => setIsMenuOpen(false)}>
                                            Log In
                                        </Link>
                                        <Link href="/register" className="btn btn-primary w-full text-center" onClick={() => setIsMenuOpen(false)}>
                                            Get Started
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
