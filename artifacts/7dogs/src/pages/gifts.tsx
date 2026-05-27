import { useUser } from "@/context/user-context";
import { useLang } from "@/context/language-context";
import { useGetGifts, useRedeemGift } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Gift as GiftIcon, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { Gift } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function GiftsPage() {
  const { user } = useUser();
  const { t } = useLang();
  const { data: gifts, isLoading } = useGetGifts();
  const redeemMutation = useRedeemGift();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);

  const handleRedeem = () => {
    if (!user || !selectedGift) return;
    if (user.coins < selectedGift.coinPrice) {
      toast({ title: t.insufficientCoins, description: t.insufficientCoinsDesc, variant: "destructive" });
      setSelectedGift(null);
      return;
    }
    redeemMutation.mutate(
      { giftId: selectedGift.id, data: { userId: user.id } },
      {
        onSuccess: () => {
          toast({ title: t.redeemSuccess, description: t.redeemSuccessDesc, className: "bg-primary text-black" });
          setSelectedGift(null);
          queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="flex flex-col w-full px-4 pt-6 pb-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-black text-primary tracking-wide uppercase">{t.boutiqueTitle}</h1>
        <div className="flex items-center gap-2 bg-card border border-primary/30 px-3 py-1.5 rounded-full gold-glow">
          <Coins className="w-4 h-4 text-primary" />
          <span className="font-bold text-foreground">{user?.coins?.toLocaleString() || 0}</span>
        </div>
      </div>

      <p className="text-muted-foreground text-sm mb-6">{t.boutiqueSubtitle}</p>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !gifts || gifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm gap-3">
          <GiftIcon className="w-14 h-14 text-primary/20" />
          <p>{t.noGifts}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {gifts.map((gift) => (
            <div
              key={gift.id}
              className="bg-card border border-border hover:border-primary/50 transition-colors rounded-2xl overflow-hidden flex flex-col group relative"
            >
              {!gift.enabled && (
                <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-[2px] flex items-center justify-center">
                  <Badge variant="outline" className="border-primary text-primary bg-background shadow-lg rotate-[-12deg]">
                    COMING SOON
                  </Badge>
                </div>
              )}
              <div className="aspect-square bg-background p-4 flex items-center justify-center relative border-b border-border">
                {gift.imageUrl ? (
                  <img src={gift.imageUrl} alt={gift.name} className="object-contain w-full h-full drop-shadow-2xl" />
                ) : (
                  <GiftIcon className="w-12 h-12 text-primary/40 group-hover:text-primary transition-colors" />
                )}
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-bold text-sm leading-tight mb-1">{gift.name}</h3>
                <div className="flex items-center gap-1 text-primary text-sm font-bold mt-auto pt-2">
                  <Coins className="w-3 h-3" />
                  {gift.coinPrice.toLocaleString()}
                </div>
                <Button
                  size="sm"
                  className="w-full mt-3 bg-primary/10 text-primary hover:bg-primary hover:text-black transition-colors text-xs"
                  onClick={() => setSelectedGift(gift)}
                  disabled={!gift.enabled}
                >
                  {t.redeem}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedGift} onOpenChange={(open) => !open && setSelectedGift(null)}>
        <DialogContent className="w-[90%] rounded-2xl bg-card border-primary/30">
          <DialogHeader>
            <DialogTitle>{t.confirmRedeem}</DialogTitle>
            <DialogDescription className="pt-4">
              {selectedGift && t.confirmRedeemDesc(selectedGift.name, selectedGift.coinPrice.toLocaleString())}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-center mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setSelectedGift(null)}>
              {t.cancel}
            </Button>
            <Button
              className="flex-1 bg-primary text-black hover:bg-primary/90"
              onClick={handleRedeem}
              disabled={redeemMutation.isPending}
            >
              {redeemMutation.isPending ? t.processing : t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
