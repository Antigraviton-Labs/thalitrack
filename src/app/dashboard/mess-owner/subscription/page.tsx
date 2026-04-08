'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';

interface SubscriptionData {
    status: 'trial' | 'active' | 'expired' | 'cancelled';
    trialEndsAt: string;
    currentPeriodEnd: string;
    daysLeft: number;
    isValid: boolean;
}

export default function SubscriptionPage() {
    const router = useRouter();
    const { user, token, isLoading: authLoading } = useAuth();

    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const fetchSubscription = async () => {
            if (!token) return;

            try {
                const response = await fetch('/api/mess-owner/analytics', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const result = await response.json();

                if (result.success && result.data.subscription) {
                    setSubscription(result.data.subscription);
                }
            } catch (err) {
                console.error('Failed to fetch subscription:', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && user?.role === 'messOwner' && token) {
            fetchSubscription();
        } else if (!authLoading && (!user || user.role !== 'messOwner')) {
            router.push('/login');
        }
    }, [authLoading, user, token, router]);

    const handleSubscribe = async () => {
        setIsProcessing(true);

        try {
            const response = await fetch('/api/subscriptions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ plan: 'monthly' }),
            });

            const result = await response.json();

            if (result.success && result.data.orderUrl) {
                window.location.href = result.data.orderUrl;
            } else {
                alert(result.error || 'Failed to create subscription');
            }
        } catch (err) {
            alert('Something went wrong. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <span className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin inline-block mb-4" />
                    <p className="text-muted">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="bg-card border-b border-border sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/dashboard/mess-owner" className="flex items-center gap-2">
                            <span className="text-2xl">🍽️</span>
                            <span className="text-xl font-bold"><span style={{ color: '#1A1208' }}>Thali</span><span style={{ color: '#E8861A' }}>Track</span></span>
                        </Link>
                        <Link href="/dashboard/mess-owner" className="btn btn-secondary text-sm">
                            ← Back
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold mb-8 text-center">💳 Subscription</h1>

                {/* Current Status */}
                <div className="card mb-8">
                    <h2 className="font-semibold mb-4">Current Plan</h2>

                    {subscription ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                                <div>
                                    <div className="font-medium capitalize">
                                        {subscription.status === 'trial' ? '🎁 Free Trial' :
                                            subscription.status === 'active' ? '✅ Active Subscription' :
                                                subscription.status === 'expired' ? '❌ Expired' :
                                                    '⚠️ Cancelled'}
                                    </div>
                                    {subscription.status === 'trial' && (
                                        <div className="text-sm text-muted mt-1">
                                            Ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}
                                            {subscription.daysLeft <= 7 && (
                                                <span className="text-warning ml-2">
                                                    ({subscription.daysLeft} days left!)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {subscription.status === 'active' && (
                                        <div className="text-sm text-muted mt-1">
                                            Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                                <div className={`badge ${subscription.isValid ? 'badge-success' : 'badge-error'
                                    }`}>
                                    {subscription.isValid ? 'Valid' : 'Inactive'}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted">No subscription found</p>
                    )}
                </div>

                {/* Pricing */}
                <div className="card">
                    <h2 className="font-semibold mb-4">Pricing</h2>

                    <div className="border border-primary rounded-xl p-6 text-center">
                        <div className="text-4xl font-bold gradient-text mb-2">₹500</div>
                        <div className="text-muted mb-4">per month</div>

                        <ul className="text-left space-y-2 mb-6">
                            <li className="flex items-center gap-2">
                                <span className="text-success">✓</span>
                                <span>List your mess on ThaliTrack</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-success">✓</span>
                                <span>Daily menu updates</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-success">✓</span>
                                <span>Analytics dashboard</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-success">✓</span>
                                <span>Student suggestions & feedback</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-success">✓</span>
                                <span>Unlimited photo uploads</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-success">✓</span>
                                <span>Priority support</span>
                            </li>
                        </ul>

                        {subscription?.status === 'active' ? (
                            <div className="bg-success/10 text-success p-3 rounded-lg">
                                ✓ You&apos;re subscribed!
                            </div>
                        ) : (
                            <button
                                onClick={handleSubscribe}
                                disabled={isProcessing}
                                className="btn btn-primary w-full"
                            >
                                {isProcessing ? 'Processing...' :
                                    subscription?.status === 'trial' ? 'Upgrade Now' : 'Subscribe Now'}
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-muted text-center mt-4">
                        Secure payment powered by Razorpay. Cancel anytime.
                    </p>
                </div>
            </div>
        </div>
    );
}
