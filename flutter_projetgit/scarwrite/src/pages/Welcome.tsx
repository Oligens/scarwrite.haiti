import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Lock } from "@/lib/lucide-react";
import { getPIN, verifyPIN } from "@/lib/storage";

export default function Welcome() {
  const navigate = useNavigate();
  const [pinInput, setPinInput] = useState("");
  const [showPinError, setShowPinError] = useState(false);
  const hasPIN = getPIN() !== null;

  const handleEnter = () => {
    if (hasPIN) {
      if (verifyPIN(pinInput)) {
        navigate("/dashboard");
      } else {
        setShowPinError(true);
        setTimeout(() => setShowPinError(false), 3000);
      }
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-star-dust flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background effects - subtle gold accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md mx-auto">
        {/* Logo */}
        <div className="mb-8 relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-xl shadow-xl">
            <img src="/scarwrite.png" alt="ScarWrite" className="h-24 w-24 object-contain" />
          </div>
        </div>

        {/* App Name */}
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">
          <span className="text-gradient-gold">ScarWrite</span>
        </h1>

        {/* Subtitle */}
        <p className="text-muted-foreground text-base max-w-sm mb-10 leading-relaxed">
          Gestion financière premium pour entreprises internationales
        </p>

        {/* PIN Input if required */}
        {hasPIN && (
          <div className="mb-6 w-full max-w-xs space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Entrer le code PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEnter()}
                className="pl-10 bg-white border-silver-light text-center text-card-foreground focus:border-primary"
              />
            </div>
            {showPinError && (
              <p className="text-destructive text-xs animate-fade-in">
                Code PIN incorrect
              </p>
            )}
          </div>
        )}

        {/* Enter Button */}
        <Button
          onClick={handleEnter}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
        >
          Entrer dans l'application
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <div className="mt-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs text-emerald-600 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Application hors ligne – Données stockées localement
          </span>
        </div>
      </div>
    </div>
  );
}
