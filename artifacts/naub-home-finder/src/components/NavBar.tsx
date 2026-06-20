import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, User, LogOut, LayoutDashboard, Home, PlusCircle, MessageSquare, Shield } from "lucide-react";

interface StoredUser {
  id: string;
  email: string;
  role: string;
  first_name?: string | null;
  last_name?: string | null;
}

export default function NavBar() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("naub_user");
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch {}
    }
    const handleStorage = () => {
      const raw2 = localStorage.getItem("naub_user");
      setUser(raw2 ? JSON.parse(raw2) : null);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("naub_token");
    localStorage.removeItem("naub_user");
    setUser(null);
    setLocation("/");
    window.dispatchEvent(new Event("storage"));
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || user.email[0].toUpperCase()
    : "";

  const canListProperty = user && ["landlord", "agent"].includes(user.role);
  const isAdmin = user?.role === "escrow_officer";

  return (
    <header
      className="sticky top-0 z-50 bg-white border-b border-[#EBEBEB] transition-shadow"
      style={{ boxShadow: scrolled ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 cursor-pointer">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-lg text-white"
               style={{ background: "linear-gradient(135deg, #FF5A5F 0%, #e8272d 100%)" }}>
            N
          </div>
          <span className="font-bold text-lg hidden sm:block" style={{ color: "#222222" }}>
            NAUB Homes
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/properties"
            className="text-sm font-medium transition-colors hover:text-primary"
            style={{ color: "#222222" }}>
            Browse Listings
          </Link>
          {canListProperty && (
            <Link href="/properties/new"
              className="text-sm font-medium transition-colors hover:text-primary"
              style={{ color: "#222222" }}>
              List a Property
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin"
              className="text-sm font-medium transition-colors hover:text-primary"
              style={{ color: "#222222" }}>
              Admin Panel
            </Link>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Messages */}
              <Link href="/messages">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 border border-[#EBEBEB] rounded-full px-3 py-1.5 hover:shadow-md transition-shadow"
                  >
                    <Menu className="h-4 w-4 text-muted-foreground" />
                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                         style={{ background: "#FF5A5F" }}>
                      {initials}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium truncate">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role.replace("_", " ")}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {canListProperty && (
                    <DropdownMenuItem asChild>
                      <Link href="/properties/new" className="cursor-pointer">
                        <PlusCircle className="h-4 w-4 mr-2" /> List a Property
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="h-4 w-4 mr-2" /> Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/messages" className="cursor-pointer">
                      <MessageSquare className="h-4 w-4 mr-2" /> Messages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="font-medium">Log in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="font-medium" style={{ background: "#FF5A5F", color: "#fff", border: "none" }}>
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
