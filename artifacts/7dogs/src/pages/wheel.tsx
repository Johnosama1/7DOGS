import { useState } from "react";
import { useUser } from "@/context/user-context";
import { useGetWheelSegments, useSpinWheel, getGetMeQueryKey } from "@workspace/api-client-react";
import { SpinningWheel } from "@/components/wheel/spinning-wheel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Coins, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function WheelPage() {
  const { user } = useUser();
  const { data: segments } = useGetWheelSegments();
  const spinMutation = useSpinWheel();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isSpinning, setIsSpinning] = useState(false);
  const [landingSegmentId, setLandingSegmentId] = useState<number>();

  const handleSpin = () => {
    if (!user) return;
    if (user.spins <= 0) {
      toast({
        title: "مفيش لفات!",
        description: "ادعو أصحابك عشان تكسب لفات مجانية!",
        variant: "destructive",
      });
      return;
    }

    setIsSpinning(true);
    spinMutation.mutate({ data: { userId: user.id } }, {
      onSuccess: (result) => {
        setLandingSegmentId(result.segmentId);
      },
      onError: (err) => {
        setIsSpinning(false);
        toast({
          title: "حصل خطأ",
          description: err.message || "حاول تاني",
          variant: "destructive",
        });
      },
    });
  };

  const handleSpinEnd = () => {
    setIsSpinning(false);
    if (user) {
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey({ telegramId: user.telegramId }) });
    }
    if (spinMutation.data) {
      const reward = spinMutation.data;
      toast({
        title: "🎉 مبروك!",
        description: `كسبت ${reward.label} عملة!`,
        className: "bg-primary border-none text-primary-foreground",
      });
    }
  };

  const avatarUrl = user
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName || user.username || "U")}&background=1a1a1a&color=D4AF37&size=64&bold=true`
    : null;

  return (
    <div className="flex flex-col w-full min-h-full">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        {/* Left: Avatar + name */}
        <div className="flex items-center gap-2">
          {avatarUrl && (
            <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden shadow-[0_0_8px_rgba(212,175,55,0.5)]">
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col leading-none">
            <span className="text-foreground font-bold text-sm">{user?.firstName || "..."}</span>
            {user?.username && (
              <span className="text-muted-foreground text-xs">@{user.username}</span>
            )}
          </div>
        </div>

        {/* Right: Coins */}
        <div className="flex items-center gap-1.5 bg-card border border-primary/40 px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(212,175,55,0.2)]">
          <Coins className="w-4 h-4 text-primary" />
          <span className="font-bold text-foreground text-sm">{user?.coins?.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* Wheel */}
      <div className="flex-1 flex flex-col items-center px-2">
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
            {isSpinning ? "جاري اللف..." : "العب دلوقتي"}
          </Button>

          {/* Spins badge */}
          <div className="flex flex-col items-center bg-card border border-primary/40 rounded-2xl px-3 py-2 min-w-[60px] shadow-[0_0_10px_rgba(212,175,55,0.15)]">
            <Sparkles className="w-4 h-4 text-primary mb-0.5" />
            <span className="text-foreground font-black text-lg leading-none">{user?.spins ?? 0}</span>
            <span className="text-muted-foreground text-[10px] mt-0.5">لفات</span>
          </div>
        </div>
      </div>
    </div>
  );
}
