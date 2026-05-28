import { useState } from "react";
import { useUser } from "@/context/user-context";
import { useLang, Lang } from "@/context/language-context";
import { useGetWheelSegments, useSpinWheel, getGetMeQueryKey } from "@workspace/api-client-react";
import { SpinningWheel } from "@/components/wheel/spinning-wheel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Coins, Sparkles, ChevronDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function WheelPage() {
  const { user } = useUser();
  const { t, lang, setLang } = useLang();
  const { data: segments } = useGetWheelSegments();
  const spinMutation = useSpinWheel();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isSpinning, setIsSpinning] = useState(false);
  const [landingSegmentId, setLandingSegmentId] = useState<number>();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [winLabel, setWinLabel] = useState<string | null>(null);

  const handleSpin = () => {
    if (!user) return;
    if (user.spins <= 0) {
      toast({ title: t.noSpins, description: t.noSpinsDesc, variant: "destructive" });
      return;
    }
    setIsSpinning(true);
    spinMutation.mutate({ data: { userId: user.id } }, {
      onSuccess: (result) => setLandingSegmentId(result.segmentId),
      onError: (err) => {
        setIsSpinning(false);
        toast({ title: t.spinError, description: err.message, variant: "destructive" });
      },
    });
  };

  const handleSpinEnd = () => {
    setIsSpinning(false);
    if (user) {
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey({ telegramId: user.telegramId }) });
    }
    if (spinMutation.data) {
      setWinLabel(`+${spinMutation.data.label}`);
      setTimeout(() => setWinLabel(null), 2200);
    }
  };

  const avatarUrl = user
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName || user.username || "U")}&background=1a1a1a&color=D4AF37&size=64&bold=true`
    : null;

  const langOptions: { value: Lang; label: string; flag: string }[] = [
    { value: "en", label: "English", flag: "🇬🇧" },
    { value: "ar", label: "العربية", flag: "🇸🇦" },
  ];

  return (
    <div className="flex flex-col w-full min-h-full">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 relative">
        {/* Left: Avatar + name — clickable for language picker */}
        <div className="relative">
          <button
            className="flex items-center gap-2 focus:outline-none"
            onClick={() => setShowLangPicker((v) => !v)}
          >
            {avatarUrl && (
              <div className="relative w-10 h-10 rounded-full border-2 border-primary overflow-hidden shadow-[0_0_8px_rgba(212,175,55,0.5)]">
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                {/* Small flag badge */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background flex items-center justify-center text-[9px] border border-primary/30">
                  {lang === "ar" ? "🇸🇦" : "🇬🇧"}
                </div>
              </div>
            )}
            <div className="flex flex-col leading-none items-start">
              <div className="flex items-center gap-1">
                <span className="text-foreground font-bold text-sm">{user?.firstName || "..."}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </div>
              {user?.username && (
                <span className="text-muted-foreground text-xs">@{user.username}</span>
              )}
            </div>
          </button>

          {/* Language picker dropdown */}
          {showLangPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
              <div className="absolute top-full mt-2 left-0 z-50 bg-card border border-primary/30 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] min-w-[160px]">
                <p className="text-xs text-muted-foreground px-3 pt-3 pb-1 font-medium uppercase tracking-wider">
                  {t.chooseLanguage}
                </p>
                {langOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-sm transition-colors hover:bg-primary/10 ${
                      lang === opt.value ? "text-primary font-bold bg-primary/5" : "text-foreground"
                    }`}
                    onClick={() => { setLang(opt.value); setShowLangPicker(false); }}
                  >
                    <span className="text-base">{opt.flag}</span>
                    <span>{opt.label}</span>
                    {lang === opt.value && <span className="ml-auto text-primary">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: Coins */}
        <div className="flex items-center gap-1.5 bg-card border border-primary/40 px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(212,175,55,0.2)]">
          <Coins className="w-4 h-4 text-primary" />
          <span className="font-bold text-foreground text-sm">{user?.coins?.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* Wheel */}
      <div className="flex-1 flex flex-col items-center px-2 relative">
        {/* Floating win animation */}
        {winLabel && (
          <div
            key={winLabel + Date.now()}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none
                       flex items-center gap-1.5 bg-primary text-black font-black text-3xl
                       px-6 py-3 rounded-full shadow-[0_0_30px_rgba(212,175,55,0.8)]
                       animate-[floatUp_2.2s_ease-out_forwards]"
          >
            🪙 {winLabel}
          </div>
        )}
        <SpinningWheel
          segments={segments || []}
          isSpinning={isSpinning}
          landingSegmentId={landingSegmentId}
          onSpinEnd={handleSpinEnd}
        />

        {/* Spin button + spins count */}
        <div className="w-full px-4 mt-2 flex items-center gap-3">
          <Button
            size="lg"
            className="flex-1 h-14 rounded-full text-base font-black bg-gradient-to-r from-[#D4AF37] to-[#997A00] text-black hover:from-[#FFE066] hover:to-[#D4AF37] border border-[#FFE066]/50 shadow-[0_0_20px_rgba(212,175,55,0.4)] shimmer tracking-widest uppercase"
            onClick={handleSpin}
            disabled={isSpinning || !user || user.spins <= 0}
          >
            {isSpinning ? t.spinning : t.spinBtn}
          </Button>

          <div className="flex flex-col items-center bg-card border border-primary/40 rounded-2xl px-3 py-2 min-w-[60px] shadow-[0_0_10px_rgba(212,175,55,0.15)]">
            <Sparkles className="w-4 h-4 text-primary mb-0.5" />
            <span className="text-foreground font-black text-lg leading-none">{user?.spins ?? 0}</span>
            <span className="text-muted-foreground text-[10px] mt-0.5">{t.spinsLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
