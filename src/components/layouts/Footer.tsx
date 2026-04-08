import Link from 'next/link';

export default function Footer() {
    return (
        <footer style={{ backgroundColor: '#0A0A0A' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🍽️</span>
                            <span className="text-xl font-bold">
                                <span style={{ color: '#FFFFFF' }}>Thali</span>
                                <span style={{ color: '#E8861A' }}>Track</span>
                            </span>
                        </Link>
                        <p style={{ color: '#A0A0A0' }} className="text-sm leading-relaxed max-w-xs">
                            The easiest way for students to discover nearby messes, check daily menus,
                            and find the best place to eat without running around.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: '#FFFFFF' }}>Quick Links</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/discover" className="text-sm transition-colors hover:underline" style={{ color: '#A0A0A0' }}>
                                    Find Messes
                                </Link>
                            </li>
                            <li>
                                <Link href="/register?role=messOwner" className="text-sm transition-colors hover:underline" style={{ color: '#A0A0A0' }}>
                                    List Your Mess
                                </Link>
                            </li>
                            <li>
                                <Link href="/#features" className="text-sm transition-colors hover:underline" style={{ color: '#A0A0A0' }}>
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link href="/#pricing" className="text-sm transition-colors hover:underline" style={{ color: '#A0A0A0' }}>
                                    Pricing
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: '#FFFFFF' }}>Get in Touch</h3>
                        <div className="space-y-3">
                            <a
                                href="mailto:thalitrack@gmail.com"
                                className="flex items-center gap-2 text-sm transition-colors hover:underline"
                                style={{ color: '#A0A0A0' }}
                            >
                                <span>📧</span>
                                thalitrack@gmail.com
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Divider & Credits */}
                <div
                    className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
                    style={{ borderTop: '1px solid #222222' }}
                >
                    <p className="text-xs" style={{ color: '#707070' }}>
                        © {new Date().getFullYear()} ThaliTrack. All rights reserved.
                    </p>
                    <p className="text-xs" style={{ color: '#707070' }}>
                        Made by{' '}
                        <span style={{ color: '#E8861A', fontWeight: 600 }}>Anexus Web Solutions</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}
