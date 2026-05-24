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
        title: "No spins left",
        description: "Invite friends to earn more free spins!",
        variant: "destructive"
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
          title: "Spin failed",
          description: err.message || "An error occurred.",
          variant: "destructive"
        });
      }
    });
  };

  const handleSpinEnd = () => {
    setIsSpinning(false);
    
    // Invalidate user query to update balance
    if (user) {
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey({ telegramId: user.telegramId }) });
    }

    if (spinMutation.data) {
      const reward = spinMutation.data;
      toast({
        title: "You won!",
        description: `You received ${reward.label}.`,
        className: "bg-primary border-none text-primary-foreground",
      });
    }
  };

  return (
    <div className="flex flex-col items-center w-full px-4 pt-6">
      <div className="w-full flex justify-between items-center mb-6 px-2">
        <div className="flex items-center gap-2 bg-card border border-primary/30 px-3 py-1.5 rounded-full gold-glow">
          <Coins className="w-4 h-4 text-primary" />
          <span className="font-bold text-foreground">{user?.coins?.toLocaleString() || 0}</span>
        </div>
        <div className="flex items-center gap-2 bg-card border border-primary/30 px-3 py-1.5 rounded-full">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-bold text-foreground">{user?.spins || 0} Spins</span>
        </div>
      </div>

      <div className="text-center mb-4">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFE066] to-[#D4AF37] tracking-widest uppercase">
          VIP Lounge
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Spin to earn luxury rewards</p>
      </div>

      <SpinningWheel 
        segments={segments || []} 
        isSpinning={isSpinning} 
        landingSegmentId={landingSegmentId}
        onSpinEnd={handleSpinEnd}
      />

      <div className="mt-8 w-full px-4">
        <Button 
          size="lg" 
          className="w-full h-16 rounded-full text-lg font-bold bg-gradient-to-r from-[#D4AF37] to-[#997A00] text-black hover:from-[#FFE066] hover:to-[#D4AF37] border border-[#FFE066]/50 shadow-[0_0_20px_rgba(212,175,55,0.4)] shimmer"
          onClick={handleSpin}
          disabled={isSpinning || !user || user.spins <= 0}
        >
          {isSpinning ? "SPINNING..." : "SPIN THE WHEEL"}
        </Button>
      </div>
    </div>
  );
}
