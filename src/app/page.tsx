import Link from 'next/link';
import { Navbar, Footer } from '@/components/layouts';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <div className="animate-fadeIn">
              <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                🎉 Your Tiffin Search Ends Here
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                Find Your <span className="gradient-text">Perfect Thali</span>
                <br />
                Without Running Around
              </h1>
              <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10">
                Discover nearby messes, check daily veg thali menus, see ratings from fellow students,
                and decide where to eat — all from your phone.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/discover" className="btn btn-primary text-lg px-8 py-4">
                  🔍 Find Messes Near Me
                </Link>
                <Link href="/register?role=messOwner" className="btn btn-outline text-lg px-8 py-4">
                  List Your Mess
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '500+', label: 'Messes Listed' },
                { value: '10K+', label: 'Active Students' },
                { value: '4.8★', label: 'Avg Rating' },
                { value: '₹500', label: 'Monthly for Owners' },
              ].map((stat, index) => (
                <div
                  key={stat.label}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-3xl sm:text-4xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-muted">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Why Choose <span className="gradient-text">ThaliTrack</span>?
              </h2>
              <p className="text-muted max-w-2xl mx-auto">
                We make finding the perfect mess incredibly simple for students
                and help mess owners reach more hungry customers.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: '📍',
                  title: 'Location-Based Search',
                  description: 'Find messes nearest to you using GPS. See distance in km and get directions instantly.',
                },
                {
                  icon: '📋',
                  title: 'Daily Menu Updates',
                  description: "Check today's thali menu before you go. No more surprises — know exactly what you'll eat.",
                },
                {
                  icon: '⭐',
                  title: 'Authentic Ratings',
                  description: 'Real ratings from real students. Rate the mess and daily thali to help others decide.',
                },
                {
                  icon: '💬',
                  title: 'Student Feedback',
                  description: 'Share suggestions with mess owners. Help improve the food you eat every day.',
                },
                {
                  icon: '📊',
                  title: 'Owner Analytics',
                  description: 'Mess owners get insights — how many students viewed the menu, ratings, and trends.',
                },
                {
                  icon: '💳',
                  title: 'Simple Pricing',
                  description: 'Just ₹500/month for mess owners. 1-month free trial. No hidden charges.',
                },
              ].map((feature, index) => (
                <div
                  key={feature.title}
                  className="card hover:scale-105 transition-transform"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <span className="text-4xl mb-4 block">{feature.icon}</span>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works - Students */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="badge badge-primary mb-4">For Students</span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Finding Food Made <span className="gradient-text">Effortless</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: '1', icon: '📍', title: 'Allow Location', desc: 'Enable GPS to find messes near you' },
                { step: '2', icon: '🔍', title: 'Browse Messes', desc: 'See nearby options with ratings & distance' },
                { step: '3', icon: '📋', title: 'Check Menu', desc: "View today's thali menu before going" },
                { step: '4', icon: '🍽️', title: 'Go & Eat!', desc: 'Navigate there and enjoy your meal' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl mx-auto mb-4">
                    {item.icon}
                  </div>
                  <div className="badge badge-primary mb-2">Step {item.step}</div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Simple, Transparent <span className="gradient-text">Pricing</span>
              </h2>
              <p className="text-muted">for Mess Owners</p>
            </div>

            <div className="max-w-lg mx-auto">
              <div className="card border-2 border-primary relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                  MOST POPULAR
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">Pro Plan</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-4">
                    <span className="text-5xl font-bold gradient-text">₹500</span>
                    <span className="text-muted">/month</span>
                  </div>
                  <p className="text-success font-medium mb-6">🎁 First Month FREE!</p>

                  <ul className="text-left space-y-3 mb-8">
                    {[
                      'List your mess on ThaliTrack',
                      'Upload daily thali menus',
                      'Upload up to 10 photos',
                      'View student analytics',
                      'Get ratings & feedback',
                      'WhatsApp contact visibility',
                      'Priority support',
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="text-success">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link href="/register?role=messOwner" className="btn btn-primary w-full">
                    Start Free Trial
                  </Link>
                  <p className="text-sm text-muted mt-4">No credit card required for trial</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="rounded-2xl p-10 sm:p-14 text-center"
              style={{
                background: 'linear-gradient(135deg, #1A1208 0%, #2D1E0E 50%, #1A1208 100%)',
                border: '1.5px solid #E8DCC8',
              }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                Ready to Find Your Next Meal?
              </h2>
              <p className="mb-8 max-w-xl mx-auto text-base sm:text-lg" style={{ color: '#C4B396' }}>
                Join thousands of students who have already discovered the easier way
                to find great food near them.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/discover"
                  className="text-lg px-8 py-4 rounded-lg font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: '#E8861A', color: '#FFFFFF' }}
                >
                  Find Messes Now
                </Link>
                <Link
                  href="/register"
                  className="text-lg px-8 py-4 rounded-lg font-semibold transition-all hover:opacity-80"
                  style={{ border: '2px solid #E8861A', color: '#E8861A', backgroundColor: 'transparent' }}
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
