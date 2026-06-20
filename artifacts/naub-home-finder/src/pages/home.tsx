import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getGetPropertiesQueryOptions } from "@workspace/api-client-react";
import NavBar from "@/components/NavBar";
import PropertyCard from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Shield, Star, MapPin, ArrowRight,
  Lock, CheckCircle, Home as HomeIcon, Building2, Bed, Wifi,
  BadgeCheck, Navigation, ChevronRight
} from "lucide-react";

const STATS = [
  { value: "1,200+", label: "Student Residents" },
  { value: "320+", label: "Verified Landlords" },
  { value: "500+", label: "Active Listings" },
  { value: "4.8/5", label: "Average Rating" },
];

const CATEGORIES = [
  { label: "Self-Contained", icon: HomeIcon, href: "/properties?type=self_contained" },
  { label: "Single Room", icon: Bed, href: "/properties?rooms=1" },
  { label: "2 Bedroom", icon: Building2, href: "/properties?rooms=2" },
  { label: "Furnished", icon: Wifi, href: "/properties?furnished=true" },
];

const CORE_FEATURES = [
  {
    icon: Lock,
    color: "#FF5A5F",
    bg: "#FFF0F0",
    title: "Escrow Payment Protection",
    desc: "Your rent is held securely until you physically confirm you've moved in. No landlord receives a kobo before you're settled.",
  },
  {
    icon: BadgeCheck,
    color: "#10B981",
    bg: "#ECFDF5",
    title: "Trust Score System",
    desc: "Every landlord and student earns a verified trust score based on identity checks, completed transactions, and peer ratings.",
  },
  {
    icon: Navigation,
    color: "#3B82F6",
    bg: "#EFF6FF",
    title: "GPS Occupancy Verification",
    desc: "Share your location and enter your unique 6-character code on move-in day to confirm occupancy and release funds.",
  },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Create Your Account",
    desc: "Register as a student, landlord, or agent. Upload your ID to get verified and build your trust score.",
  },
  {
    num: "02",
    title: "Browse & Shortlist",
    desc: "Filter by price, rooms, location, and trust rating. Every listing is reviewed before going live.",
  },
  {
    num: "03",
    title: "Book & Pay Safely",
    desc: "Send a booking request. Rent goes into escrow — secure until you're in your new home.",
  },
  {
    num: "04",
    title: "Move In & Confirm",
    desc: "Use your occupancy code and GPS to confirm move-in. Funds release to the landlord automatically.",
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

      {/* ── Hero ── */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-4">
              Student Housing Near NAUB Campus
            </p>
            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground leading-tight tracking-tight mb-5">
              Find Your Perfect<br />
              <span style={{ color: "#FF5A5F" }}>Student Home</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mb-10">
              Browse hundreds of verified, affordable listings near Nigerian Army University Biu. 
              Safe, transparent, and built for students.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="max-w-2xl">
              <div className="flex items-center bg-white border-2 border-[#EBEBEB] rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 flex-1 px-5 py-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by area, street, or neighbourhood..."
                    className="border-0 shadow-none p-0 h-auto text-base focus-visible:ring-0 bg-transparent"
                  />
                </div>
                <Button
                  type="submit"
                  className="m-2 rounded-xl px-6 py-3 h-auto font-semibold"
                  style={{ background: "#FF5A5F", color: "#fff", border: "none" }}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </form>

            {/* Quick filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              {[
                { label: "Under ₦30k/mo", href: "/properties?rent_max=30000" },
                { label: "Under ₦50k/mo", href: "/properties?rent_max=50000" },
                { label: "Self-Contained", href: "/properties?type=self_contained" },
                { label: "Top Rated", href: "/properties?sort=most_trusted" },
              ].map(f => (
                <Link key={f.label} href={f.href}>
                  <button className="text-sm bg-white border border-[#EBEBEB] rounded-full px-4 py-1.5 hover:border-primary hover:text-primary transition-colors font-medium cursor-pointer">
                    {f.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
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

      {/* ── Browse by Category ── */}
      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground mb-8">Browse by Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map(cat => (
              <Link key={cat.label} href={cat.href}>
                <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-[#EBEBEB] bg-[#FAFAFA] hover:border-primary hover:shadow-md transition-all cursor-pointer group">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                       style={{ background: "#FFF0F0" }}>
                    <cat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{cat.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Listings ── */}
      <section className="py-16 bg-[#F7F7F7]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Latest Listings</h2>
              <p className="text-muted-foreground text-sm">Newly added, verified properties near campus</p>
            </div>
            <Link href="/properties">
              <Button variant="outline" className="hidden md:flex gap-2 rounded-full font-medium text-sm">
                View all listings <ArrowRight className="h-4 w-4" />
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
              <h3 className="text-lg font-semibold mb-2">Listings coming soon</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Landlords are setting up their profiles. Check back soon or be the first to list.
              </p>
              {user && ["landlord", "agent"].includes(user.role ?? "") && (
                <Link href="/properties/new">
                  <Button style={{ background: "#FF5A5F", color: "#fff", border: "none" }}>
                    List Your Property
                  </Button>
                </Link>
              )}
            </div>
          )}

          <div className="flex justify-center mt-8 md:hidden">
            <Link href="/properties">
              <Button variant="outline" className="flex gap-2 rounded-full font-medium text-sm">
                See all listings <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Core Features ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Why NAUB Home Finder</p>
            <h2 className="text-3xl font-bold text-foreground mb-3">Built Different, For Your Safety</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              We go beyond a simple listing board. Every feature is designed to protect NAUB students from fraud and bad landlords.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {CORE_FEATURES.map(f => (
              <div key={f.title} className="rounded-2xl border border-[#EBEBEB] p-8 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                     style={{ background: f.bg }}>
                  <f.icon className="h-7 w-7" style={{ color: f.color }} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 bg-[#F7F7F7]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              From search to settled — a clear, safe process for every student.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.num} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-0.5 z-0"
                       style={{ background: "#EBEBEB", width: "calc(100% - 3rem)", left: "calc(50% + 1.5rem)" }} />
                )}
                <div className="bg-white rounded-2xl p-6 border border-[#EBEBEB] relative z-10 text-center">
                  <div className="text-3xl font-extrabold mb-3" style={{ color: "rgba(255,90,95,0.2)" }}>{step.num}</div>
                  <h3 className="text-sm font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section className="py-10 bg-white border-t border-b border-[#EBEBEB]">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
          {[
            { icon: Shield, text: "Verified landlords only" },
            { icon: Lock, text: "Escrow-protected payments" },
            { icon: Star, text: "4.8/5 student satisfaction" },
            { icon: CheckCircle, text: "Fraud dispute resolution" },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2">
              <item.icon className="h-4 w-4 text-primary" />
              <span className="font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      {!user && (
        <section className="py-20 bg-[#F7F7F7]">
          <div className="max-w-4xl mx-auto px-4">
            <div className="rounded-3xl overflow-hidden grid md:grid-cols-2">
              {/* Student side */}
              <div className="p-10 flex flex-col justify-between" style={{ background: "#FF5A5F" }}>
                <div>
                  <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-3">For Students</p>
                  <h3 className="text-2xl font-bold text-white mb-3">Find Your Room Today</h3>
                  <p className="text-white/80 text-sm mb-8">
                    Browse verified listings, book safely, and move in with full protection.
                  </p>
                </div>
                <Link href="/register">
                  <Button className="rounded-full bg-white font-bold hover:bg-gray-50 w-full sm:w-auto"
                          style={{ color: "#FF5A5F" }}>
                    Register as Student <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              {/* Landlord side */}
              <div className="p-10 flex flex-col justify-between bg-[#222222]">
                <div>
                  <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-3">For Landlords</p>
                  <h3 className="text-2xl font-bold text-white mb-3">List Your Property</h3>
                  <p className="text-white/60 text-sm mb-8">
                    Reach thousands of verified NAUB students. Get paid securely through our escrow system.
                  </p>
                </div>
                <Link href="/register">
                  <Button variant="outline"
                          className="rounded-full border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                    List a Property <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="py-10" style={{ background: "#222222" }}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded flex items-center justify-center font-bold text-sm text-white"
                 style={{ background: "#FF5A5F" }}>N</div>
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
