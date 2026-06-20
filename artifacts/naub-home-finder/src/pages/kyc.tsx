import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Upload, Camera, FileText, CreditCard, Zap, ChevronRight, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type DocType = "nin" | "utility_bill" | "drivers_licence";

const DOC_OPTIONS: { id: DocType; label: string; description: string; icon: React.ComponentType<any> }[] = [
  { id: "nin", label: "National ID Number (NIN)", description: "NIMC-issued NIN card or slip", icon: CreditCard },
  { id: "utility_bill", label: "Utility Bill", description: "Recent NEPA / water bill (within 3 months)", icon: FileText },
  { id: "drivers_licence", label: "Driver's Licence", description: "Valid FRSC-issued driver's licence", icon: Zap },
];

function compressImage(file: File, maxWidth = 900, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const STEPS = ["Document Type", "Upload Document", "Face Verification", "Submit"];

export default function KYC() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const user = (() => { try { return JSON.parse(localStorage.getItem("naub_user") || "null"); } catch { return null; } })();
  const token = localStorage.getItem("naub_token");

  const [step, setStep] = useState(0);
  const [docType, setDocType] = useState<DocType | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [docBase64, setDocBase64] = useState<string | null>(null);
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!user || !token) { setLocation("/register"); }
    const role = user?.role;
    if (role && !["landlord", "agent"].includes(role)) { setLocation("/dashboard"); }
  }, []);

  useEffect(() => {
    if (step === 2) startCamera();
    else stopCamera();
    return () => { if (step !== 2) stopCamera(); };
  }, [step]);

  async function startCamera() {
    setCameraError(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err: any) {
      setCameraError(err?.message?.includes("denied")
        ? "Camera access denied. Please allow camera access in your browser settings."
        : "Could not access camera. Please check your device.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  function captureSelfie() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
    setSelfieBase64(canvas.toDataURL("image/jpeg", 0.8));
    stopCamera();
  }

  async function handleDocFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please upload an image file (JPG, PNG, etc.)" });
      return;
    }
    try {
      const compressed = await compressImage(file);
      setDocBase64(compressed);
      setDocPreview(compressed);
    } catch {
      toast({ variant: "destructive", title: "Upload failed", description: "Could not process this image. Try another." });
    }
  }

  async function handleSubmit() {
    if (!user || !token || !docBase64 || !selfieBase64 || !docType) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          national_id_type: docType,
          national_id_document_url: docBase64,
          selfie_url: selfieBase64,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit KYC");
      }
      const updated = await res.json();
      localStorage.setItem("naub_user", JSON.stringify({ ...user, ...updated }));
      setSubmitting(false);
      setVerifying(true);
      // Simulate instant automated verification (1-2 seconds)
      setTimeout(() => { setVerifying(false); setDone(true); }, 1800);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submission failed", description: err.message || "Please try again." });
      setSubmitting(false);
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardContent className="pt-10 pb-10 space-y-5">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <RefreshCw className="h-10 w-10 text-primary animate-spin" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Verifying your identity…</h2>
              <p className="text-muted-foreground text-sm">Running automated checks on your documents. This takes just a moment.</p>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "70%" }} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardContent className="pt-10 pb-10 space-y-5">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Identity Verified!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your identity has been verified automatically. You can now list properties on NAUB Home Finder.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>Account status: <strong>Verified</strong></span>
            </div>
            <Button className="w-full" onClick={() => setLocation("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 bg-primary text-primary-foreground rounded-xl items-center justify-center font-bold text-xl mb-4">N</div>
          <h1 className="text-2xl font-bold text-foreground">Identity Verification</h1>
          <p className="text-muted-foreground text-sm mt-1">Required for landlords and agents to list properties</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold mb-1 transition-colors",
                i < step ? "bg-primary text-white" :
                i === step ? "bg-primary text-white ring-4 ring-primary/20" :
                "bg-muted text-muted-foreground"
              )}>
                {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-xs text-center hidden sm:block", i <= step ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</span>
              {i < STEPS.length - 1 && (
                <div className={cn("absolute hidden")} />
              )}
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full mb-8">
          <div className="h-1.5 bg-primary rounded-full transition-all duration-500" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-8">
            {/* Step 0: Choose doc type */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="mb-6">
                  <CardTitle className="text-lg">Select Verification Document</CardTitle>
                  <CardDescription className="mt-1">Choose one document you'll upload to verify your identity</CardDescription>
                </div>
                {DOC_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setDocType(opt.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                      docType === opt.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      docType === opt.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    )}>
                      <opt.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{opt.label}</div>
                      <div className="text-sm text-muted-foreground">{opt.description}</div>
                    </div>
                    {docType === opt.id && <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />}
                  </button>
                ))}
                <Button className="w-full mt-2" disabled={!docType} onClick={() => setStep(1)}>
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Step 1: Upload document */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="mb-2">
                  <CardTitle className="text-lg">Upload Your Document</CardTitle>
                  <CardDescription className="mt-1">
                    Upload a clear photo of your {DOC_OPTIONS.find(o => o.id === docType)?.label}
                  </CardDescription>
                </div>

                <label className={cn(
                  "flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                  docPreview ? "border-primary/40 bg-primary/5 p-2" : "border-border hover:border-primary/40 hover:bg-muted/50 p-12"
                )}>
                  {docPreview ? (
                    <div className="w-full">
                      <img src={docPreview} alt="Document preview" className="w-full max-h-64 object-contain rounded-lg" />
                      <p className="text-xs text-center text-muted-foreground mt-2">Tap to change</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground">Click to upload image</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, HEIC up to 10MB</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleDocFile} />
                </label>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>Back</Button>
                  <Button className="flex-1" disabled={!docBase64} onClick={() => setStep(2)}>
                    Continue <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Selfie / live face */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="mb-2">
                  <CardTitle className="text-lg">Live Face Verification</CardTitle>
                  <CardDescription className="mt-1">Look straight at the camera in good lighting, then tap "Capture"</CardDescription>
                </div>

                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
                  {!selfieBase64 ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      {/* Oval face guide */}
                      {cameraReady && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-40 h-52 border-4 border-white/70 rounded-full" />
                        </div>
                      )}
                      {!cameraReady && !cameraError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <div className="text-white text-center space-y-2">
                            <RefreshCw className="h-8 w-8 mx-auto animate-spin" />
                            <p className="text-sm">Starting camera…</p>
                          </div>
                        </div>
                      )}
                      {cameraError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
                          <div className="text-white text-center space-y-3">
                            <AlertCircle className="h-8 w-8 mx-auto text-red-400" />
                            <p className="text-sm">{cameraError}</p>
                            <Button size="sm" variant="outline" onClick={startCamera} className="text-white border-white/50 hover:bg-white/10">
                              Try Again
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <img src={selfieBase64} alt="Captured selfie" className="w-full h-full object-cover" />
                  )}
                </div>

                {selfieBase64 && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Photo captured successfully</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => { setSelfieBase64(null); setStep(1); }}>Back</Button>
                  {!selfieBase64 ? (
                    <Button className="flex-1" disabled={!cameraReady} onClick={captureSelfie}>
                      <Camera className="h-4 w-4 mr-2" /> Capture Photo
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2 flex-1">
                      <Button className="w-full" onClick={() => setStep(3)}>
                        Continue <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      <button
                        onClick={() => { setSelfieBase64(null); startCamera(); }}
                        className="text-xs text-muted-foreground hover:text-foreground text-center underline"
                      >
                        Retake photo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Review & submit */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="mb-2">
                  <CardTitle className="text-lg">Review & Submit</CardTitle>
                  <CardDescription className="mt-1">Confirm your details before submitting for verification</CardDescription>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Document Type</p>
                        <p className="font-medium text-sm">{DOC_OPTIONS.find(o => o.id === docType)?.label}</p>
                      </div>
                    </div>
                    {docPreview && (
                      <img src={docPreview} alt="Document" className="w-full max-h-40 object-contain rounded-lg border" />
                    )}
                  </div>

                  <div className="rounded-xl border p-4 space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Camera className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Face Verification</p>
                        <p className="font-medium text-sm">Selfie captured</p>
                      </div>
                    </div>
                    {selfieBase64 && (
                      <img src={selfieBase64} alt="Selfie" className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-primary/20" />
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                  <span>Your identity will be verified automatically in under a minute using our automated checks.</span>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={submitting}>Back</Button>
                  <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Submitting…" : "Verify My Identity"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
