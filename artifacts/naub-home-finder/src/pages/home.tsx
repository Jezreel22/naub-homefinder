import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getGetPropertiesQueryOptions } from "@workspace/api-client-react";
import NavBar from "@/components/NavBar";
import PropertyCard from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Shield, CreditCard, CheckCircle, Star, MapPin, ArrowRight } from "lucide-react";

const STATS = [
  { value: "1,200+", label: "Student Residents" },
  { value: "320+", label: "Verified Landlords" },
  { value: "₦0", label: "Fraud Losses" },
  { value: "4.8/5", label: "Average Rating" },
];

const STEPS = [
  {
    icon: Search,
    title: "Browse Verified Listings",
    desc: "Search properties near NAUB campus. Every listing is reviewed by our Escrow Officer before going live.",
  },
  {
    icon: CreditCard,
    title: "Pay Safely into Escrow",
    desc: "Your rent is held in a secure escrow account — never released until you confirm you've moved in.",
  },
  {
    icon: CheckCircle,
    title: "Verify Occupancy & Move In",
    desc: "Enter your 6-character occupancy code and share your GPS location to unlock escrow release.",
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<{ first_name?: string; role?: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("naub_user");
    if (raw) try { setUser(JSON.parse(raw)); } catch {}
  }, []);

  const { data: propertiesData } = useQuery(
    getGetPropertiesQueryOptions({ sort: "newest", page_size: 6 })
  );

  const featured = propertiesData?.data ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation(`/properties${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <NavBar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
               style={{ background: "rgba(255,90,95,0.1)" }}>
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Escrow-Protected Housing Marketplace</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-4 leading-tight tracking-tight">
            Find Safe Housing Near<br />
            <span style={{ color: "#FF5A5F" }}>NAUB Campus</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            The only student housing platform where your money is held in escrow until you physically confirm you've moved into your new home.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex items-center bg-white border-2 border-[#EBEBEB] rounded-full shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 flex-1 px-5 py-3">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by address or neighbourhood..."
                  className="border-0 shadow-none p-0 h-auto text-base focus-visible:ring-0 bg-transparent"
                />
              </div>
              <Button
                type="submit"
                className="m-2 rounded-full px-6 py-3 h-auto font-semibold"
                style={{ background: "#FF5A5F", color: "#fff", border: "none" }}
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </form>

          {/* Quick filters */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {[
              { label: "1 Room", href: "/properties?rooms=1" },
              { label: "2 Rooms", href: "/properties?rooms=2" },
              { label: "Under ₦50k/mo", href: "/properties?rent_max=50000" },
              { label: "Most Trusted", href: "/properties?sort=most_trusted" },
            ].map(f => (
              <Link key={f.label} href={f.href}>
                <button className="text-sm bg-white border border-[#EBEBEB] rounded-full px-4 py-1.5 hover:border-primary hover:text-primary transition-colors font-medium cursor-pointer">
                  {f.label}
                </button>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-8" style={{ background: "#FF5A5F" }}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold">{s.value}</div>
              <div className="text-sm opacity-80 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-3">How NAUB Homes Works</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Transparent, secure, and built specifically for NAUB students.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="relative mx-auto mb-6 w-16 h-16">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#FFF0F0" }}>
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured listings */}
      <section className="py-20 bg-[#F7F7F7]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-1">Live Listings Near Campus</h2>
              <p className="text-muted-foreground">All verified and ready to book</p>
            </div>
            <Link href="/properties">
              <Button variant="outline" className="hidden md:flex gap-2 rounded-full font-medium">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-[#EBEBEB]">
              <div className="text-5xl mb-4">🏠</div>
              <h3 className="text-lg font-semibold mb-2">No live listings yet</h3>
              <p className="text-muted-foreground mb-6">Landlords are currently listing their properties. Check back soon!</p>
              {user && ["landlord", "agent"].includes(user.role ?? "") && (
                <Link href="/properties/new">
                  <Button style={{ background: "#FF5A5F", color: "#fff", border: "none" }}>List Your Property</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Trust section */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Your Money is Always Protected</h2>
              <p className="text-muted-foreground mb-6">
                Unlike other platforms, NAUB Homes holds your rent in a secure escrow account.
                Funds are never released to the landlord until you physically move in and confirm occupancy
                using your unique 6-character code.
              </p>
              <div className="space-y-3">
                {[
                  "GPS-verified occupancy confirmation",
                  "6-character code system prevents fraud",
                  "Dispute resolution by certified Escrow Officers",
                  "Full refund if property doesn't match listing",
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link href="/register">
                  <Button style={{ background: "#FF5A5F", color: "#fff", border: "none" }} className="rounded-full px-8">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
            <div className="bg-[#F7F7F7] rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">🔒</div>
              <div className="text-2xl font-bold text-foreground mb-2">100% Escrow Protected</div>
              <p className="text-sm text-muted-foreground">
                Every payment flows through our certified escrow system.
                No landlord receives funds without your approval.
              </p>
              <div className="mt-6 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">4.8/5 from 200+ student reviews</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA for guests */}
      {!user && (
        <section className="py-16 text-center" style={{ background: "#FF5A5F" }}>
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Find Your Home?</h2>
            <p className="mb-8" style={{ color: "rgba(255,255,255,0.8)" }}>Join 1,200+ NAUB students already on the platform</p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/register">
                <Button size="lg" className="rounded-full bg-white text-primary font-bold hover:bg-gray-50">
                  Register as Student
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="rounded-full border-white text-white hover:bg-white/10">
                  List Your Property
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-10" style={{ background: "#222222" }}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded flex items-center justify-center font-bold text-sm text-white" style={{ background: "#FF5A5F" }}>N</div>
            <span className="text-white font-semibold">NAUB Home Finder</span>
          </div>
          <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
            © {new Date().getFullYear()} NAUB Home Finder. Safe housing for Nigerian Army University Biu students.
          </p>
          <div className="flex gap-6 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
