import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getGetPropertyQueryOptions } from "@workspace/api-client-react";
import NavBar from "@/components/NavBar";
import TrustBadge from "@/components/TrustBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bed, MapPin, Calendar, Wifi, Zap, Droplets, Shield, Car, ChefHat,
  Star, ShieldCheck, ShieldAlert, MessageSquare, ChevronLeft, ChevronRight,
  FileCheck
} from "lucide-react";

const AMENITY_MAP: Record<string, { label: string; Icon: any }> = {
  wifi: { label: "WiFi", Icon: Wifi },
  electricity_backup: { label: "Power Backup", Icon: Zap },
  water: { label: "Running Water", Icon: Droplets },
  security: { label: "Security", Icon: Shield },
  parking: { label: "Parking", Icon: Car },
  kitchen: { label: "Kitchen", Icon: ChefHat },
};

function formatNGN(amount?: number | null) {
  if (!amount) return "₦—";
  return `₦${amount.toLocaleString("en-NG")}`;
}

function getPhotoUrls(property: any): string[] {
  if (property.photos && property.photos.length > 0) {
    return property.photos.map((p: any) => p.photo_url);
  }
  const seed = property.id?.replace(/-/g, "").substring(0, 8) ?? "house";
  return [
    `https://picsum.photos/seed/${seed}1/800/500`,
    `https://picsum.photos/seed/${seed}2/800/500`,
    `https://picsum.photos/seed/${seed}3/800/500`,
  ];
}

export default function PropertyDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [photoIdx, setPhotoIdx] = useState(0);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("naub_user") ?? "null"); } catch { return null; }
  })();

  const { data: property, isLoading, error } = useQuery(
    getGetPropertyQueryOptions(params.id)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F7]">
        <NavBar />
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="animate-pulse space-y-4">
            <div className="aspect-[16/7] bg-gray-200 rounded-2xl" />
            <div className="h-8 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#F7F7F7]">
        <NavBar />
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-4">🏚️</div>
          <h2 className="text-xl font-bold mb-2">Property not found</h2>
          <Link href="/properties">
            <Button variant="outline">Back to listings</Button>
          </Link>
        </div>
      </div>
    );
  }

  const photos = getPhotoUrls(property);
  const amenities = (property.amenities ?? {}) as Record<string, boolean>;
  const activeAmenities = Object.entries(amenities).filter(([, v]) => v);
  const landlord = property.landlord as any;
  const trustScore = property.trust_score ?? 0;
  const isOwnListing = user && landlord && user.id === landlord.id;
  const canBook = user?.role === "student" && property.listing_status === "live" && !isOwnListing;

  const handleBook = () => {
    if (!user) { setLocation("/login"); return; }
    setLocation(`/properties/${property.id}/book`);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <NavBar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back */}
        <Link href="/properties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 cursor-pointer">
          <ChevronLeft className="h-4 w-4" /> Back to listings
        </Link>

        {/* Photo gallery */}
        <div className="relative rounded-2xl overflow-hidden aspect-[16/7] bg-gray-200 mb-8 shadow-sm">
          <img
            src={photos[photoIdx]}
            alt="Property"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/house/800/500`; }}
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow hover:bg-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow hover:bg-white transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className="w-2 h-2 rounded-full transition-colors"
                    style={{ background: i === photoIdx ? "#fff" : "rgba(255,255,255,0.5)" }}
                  />
                ))}
              </div>
            </>
          )}
          {/* Status badge */}
          <div className="absolute top-4 left-4">
            <Badge
              style={{
                background: property.listing_status === "live" ? "#34A853" : property.listing_status === "occupied" ? "#FF5A5F" : "#717171",
                color: "#fff",
              }}
              className="capitalize text-xs"
            >
              {property.listing_status?.replace("_", " ")}
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & trust */}
            <div>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-1">{property.address}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Bed className="h-4 w-4" />
                    <span>{property.rooms ?? 1} {(property.rooms ?? 1) === 1 ? "room" : "rooms"}</span>
                  </div>
                </div>
                <TrustBadge score={trustScore} size="md" />
              </div>
            </div>

            <Separator />

            {/* Description */}
            {property.description && (
              <div>
                <h2 className="text-lg font-semibold mb-3">About this property</h2>
                <p className="text-muted-foreground leading-relaxed">{property.description}</p>
              </div>
            )}

            {/* Amenities */}
            {activeAmenities.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activeAmenities.map(([key]) => {
                    const amenity = AMENITY_MAP[key];
                    if (!amenity) return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <span className="capitalize">{key.replace(/_/g, " ")}</span>
                      </div>
                    );
                    return (
                      <div key={key} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[#EBEBEB]">
                        <amenity.Icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{amenity.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* House rules */}
            {property.house_rules && (
              <div>
                <h2 className="text-lg font-semibold mb-3">House Rules</h2>
                <div className="bg-[#FFF8E1] rounded-xl p-4 text-sm text-[#F57F17]">
                  {property.house_rules}
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Location</h2>
              <div className="bg-white rounded-xl border border-[#EBEBEB] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{property.address}</span>
                </div>
                {property.latitude && property.longitude ? (
                  <div className="aspect-video bg-[#F7F7F7] rounded-lg overflow-hidden">
                    <iframe
                      title="Property location"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={`https://maps.google.com/maps?q=${property.latitude},${property.longitude}&z=15&output=embed`}
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-[#F7F7F7] rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Map coordinates not available</p>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(property.address ?? "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline mt-1 block"
                      >
                        View on Google Maps →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reviews */}
            {(property as any).ratings?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  Reviews ({(property as any).ratings.length})
                </h2>
                <div className="space-y-4">
                  {((property as any).ratings as any[]).slice(0, 3).map((r: any) => (
                    <div key={r.id} className="bg-white rounded-xl p-4 border border-[#EBEBEB]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                            {r.rater?.first_name?.[0] ?? "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{r.rater?.first_name} {r.rater?.last_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-4 w-4 ${s <= r.stars ? "fill-primary text-primary" : "text-gray-200"}`} />
                          ))}
                        </div>
                      </div>
                      {r.review_text && <p className="text-sm text-muted-foreground">{r.review_text}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Booking sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl border border-[#EBEBEB] shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-foreground">
                    {formatNGN(property.rent_amount_ngn)}
                    <span className="text-base font-normal text-muted-foreground"> /month</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Deposit: {formatNGN(property.deposit_amount_ngn)}
                  </div>
                  {property.lease_duration_days && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {Math.ceil(property.lease_duration_days / 30)}-month lease
                    </div>
                  )}
                </div>

                {canBook ? (
                  <Link href={`/bookings/new?property_id=${property.id}`}>
                    <Button
                      className="w-full rounded-xl py-3 font-semibold"
                      style={{ background: "#FF5A5F", color: "#fff", border: "none" }}
                    >
                      Reserve This Property
                    </Button>
                  </Link>
                ) : property.listing_status === "occupied" ? (
                  <Button disabled className="w-full rounded-xl py-3 font-semibold">
                    Currently Occupied
                  </Button>
                ) : !user ? (
                  <Link href="/login">
                    <Button
                      className="w-full rounded-xl py-3 font-semibold"
                      style={{ background: "#FF5A5F", color: "#fff", border: "none" }}
                    >
                      Log in to Book
                    </Button>
                  </Link>
                ) : isOwnListing ? (
                  <Link href={`/dashboard`}>
                    <Button variant="outline" className="w-full rounded-xl py-3 font-semibold">
                      Manage Listing
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="w-full rounded-xl py-3 font-semibold">
                    Not Available
                  </Button>
                )}

                {/* Message landlord */}
                {user && landlord && !isOwnListing && (
                  <Link href={`/messages/${landlord.id}`}>
                    <Button variant="outline" className="w-full mt-3 rounded-xl gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Message Landlord
                    </Button>
                  </Link>
                )}

                {/* Escrow guarantee */}
                <div className="mt-4 pt-4 border-t border-[#EBEBEB]">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <FileCheck className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Your payment is protected by NAUB Homes escrow. Funds release only after you confirm occupancy.</span>
                  </div>
                </div>
              </div>

              {/* Landlord info */}
              {landlord && (
                <div className="border-t border-[#EBEBEB] p-4 bg-[#F7F7F7]">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-3">Listed by</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {landlord.first_name?.[0] ?? "L"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{landlord.first_name} {landlord.last_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{landlord.role}</p>
                      {landlord.verification_status === "verified" ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-0.5">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs text-amber-500">Pending verification</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {trustScore > 0 && (
                    <div className="mt-3">
                      <TrustBadge score={trustScore} size="sm" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
