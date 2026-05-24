import { useUser } from "@/context/user-context";
import { useGetMyRedemptions } from "@workspace/api-client-react";
import { PackageOpen, Clock, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function MyGiftsPage() {
  const { user } = useUser();
  const { data: redemptions, isLoading } = useGetMyRedemptions(
    { userId: user?.id || 0 },
    { query: { enabled: !!user?.id } }
  );

  return (
    <div className="flex flex-col w-full px-4 pt-6 pb-8">
      <div className="flex items-center mb-6">
        <Link href="/account" className="mr-3">
          <div className="p-2 bg-card rounded-full hover:bg-card/80 text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </div>
        </Link>
        <h1 className="text-2xl font-black text-primary tracking-wide uppercase">My Gifts</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2].map(i => <div key={i} className="h-24 bg-card rounded-2xl animate-pulse" />)}
        </div>
      ) : redemptions?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageOpen className="w-16 h-16 text-muted mb-4" />
          <h3 className="text-lg font-bold mb-2">No gifts yet</h3>
          <p className="text-muted-foreground text-sm px-8">You haven't redeemed any gifts. Head over to the Boutique to spend your coins!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {redemptions?.map((item) => (
            <div key={item.id} className="bg-card border border-border p-4 rounded-2xl flex gap-4 items-center">
              <div className="w-16 h-16 bg-background rounded-xl flex items-center justify-center shrink-0 border border-border">
                {item.giftImageUrl ? (
                  <img src={item.giftImageUrl} alt={item.giftName} className="w-12 h-12 object-contain" />
                ) : (
                  <PackageOpen className="w-8 h-8 text-primary/40" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm truncate">{item.giftName}</h4>
                <p className="text-xs text-muted-foreground mt-1">Cost: <span className="text-primary">{item.coinsCost.toLocaleString()}</span></p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>

              <div className="shrink-0">
                {item.status === 'pending' && <Clock className="w-5 h-5 text-yellow-500" />}
                {item.status === 'fulfilled' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {item.status === 'cancelled' && <XCircle className="w-5 h-5 text-destructive" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
