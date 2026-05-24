import { useUser } from "@/context/user-context";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { UserRound, Gift, Settings, ShieldAlert } from "lucide-react";

export default function AccountPage() {
  const { user } = useUser();

  if (!user) return <div className="p-8 text-center">Loading...</div>;

  const isAdmin = user.username === "J_O_H_N8" || user.username === "demo_user";

  return (
    <div className="flex flex-col w-full px-4 pt-8 pb-8">
      <div className="flex items-center flex-col mb-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-[40px] pointer-events-none" />
        <div className="w-24 h-24 rounded-full bg-card border-2 border-primary flex items-center justify-center mb-4 z-10 gold-glow">
          <UserRound className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-xl font-bold">{user.firstName} {user.lastName}</h1>
        {user.username && <p className="text-muted-foreground text-sm">@{user.username}</p>}
        <p className="text-xs text-muted-foreground mt-1 opacity-50">ID: {user.telegramId}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Coins</span>
          <span className="text-xl font-bold text-primary">{user.coins.toLocaleString()}</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Spins</span>
          <span className="text-xl font-bold text-primary">{user.spins.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-3">
        <Link href="/my-gifts" className="block w-full">
          <Button variant="outline" className="w-full justify-start h-14 bg-card hover:bg-card/80 border-border hover:border-primary/50 text-foreground px-4 rounded-xl">
            <Gift className="w-5 h-5 mr-3 text-primary" />
            My Redeemed Gifts
          </Button>
        </Link>
        
        <Link href="/gifts" className="block w-full">
          <Button variant="outline" className="w-full justify-start h-14 bg-card hover:bg-card/80 border-border hover:border-primary/50 text-foreground px-4 rounded-xl">
            <Settings className="w-5 h-5 mr-3 text-primary" />
            Spend Coins
          </Button>
        </Link>

        {isAdmin && (
          <Link href="/admin" className="block w-full mt-8">
            <Button variant="outline" className="w-full justify-start h-14 bg-destructive/10 hover:bg-destructive/20 border-destructive/30 text-destructive px-4 rounded-xl">
              <ShieldAlert className="w-5 h-5 mr-3" />
              Admin Dashboard
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
