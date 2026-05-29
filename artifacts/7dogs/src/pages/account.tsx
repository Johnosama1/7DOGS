import { useUser } from "@/context/user-context";
import { useLang } from "@/context/language-context";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Gift, ShoppingBag, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

function useTelegramPhoto(telegramId: string | undefined) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!telegramId) return;
    fetch(`/api/users/photo/${telegramId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.photoUrl) setPhotoUrl(data.photoUrl);
      })
      .catch(() => {});
  }, [telegramId]);

  return photoUrl;
}

export default function AccountPage() {
  const { user } = useUser();
  const { t } = useLang();
  const telegramPhoto = useTelegramPhoto(user?.telegramId);

  if (!user) return <div className="p-8 text-center text-muted-foreground">{t.loading}</div>;

  const isAdmin = user.username === "J_O_H_N8";

  const avatarUrl =
    telegramPhoto ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.firstName || user.username || "U"
    )}&background=1a1a1a&color=D4AF37&size=128&bold=true`;

  return (
    <div className="flex flex-col w-full px-4 pt-8 pb-8">
      <div className="flex items-center flex-col mb-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-primary/20 rounded-full blur-[50px] pointer-events-none" />
        <div className="w-24 h-24 rounded-full border-2 border-primary overflow-hidden mb-4 z-10 gold-glow shadow-[0_0_20px_rgba(212,175,55,0.4)]">
          <img
            src={avatarUrl}
            alt="avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              // fallback to initials avatar if photo fails to load
              const name = encodeURIComponent(user.firstName || "U");
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${name}&background=1a1a1a&color=D4AF37&size=128&bold=true`;
            }}
          />
        </div>
        <h1 className="text-xl font-bold">{user.firstName} {user.lastName}</h1>
        {user.username && <p className="text-muted-foreground text-sm">@{user.username}</p>}
        <p className="text-xs text-muted-foreground mt-1 opacity-50">ID: {user.telegramId}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t.totalCoins}</span>
          <span className="text-xl font-bold text-primary">{user.coins.toLocaleString()}</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t.totalSpins}</span>
          <span className="text-xl font-bold text-primary">{user.spins.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-3">
        <Link href="/my-gifts" className="block w-full">
          <Button variant="outline" className="w-full justify-start h-14 bg-card hover:bg-card/80 border-border hover:border-primary/50 text-foreground px-4 rounded-xl">
            <Gift className="w-5 h-5 mr-3 text-primary" />
            {t.myGifts}
          </Button>
        </Link>

        <Link href="/gifts" className="block w-full">
          <Button variant="outline" className="w-full justify-start h-14 bg-card hover:bg-card/80 border-border hover:border-primary/50 text-foreground px-4 rounded-xl">
            <ShoppingBag className="w-5 h-5 mr-3 text-primary" />
            {t.spendCoins}
          </Button>
        </Link>

        {isAdmin && (
          <Link href="/admin" className="block w-full mt-6">
            <Button variant="outline" className="w-full justify-start h-14 bg-destructive/10 hover:bg-destructive/20 border-destructive/30 text-destructive px-4 rounded-xl">
              <ShieldAlert className="w-5 h-5 mr-3" />
              {t.adminDashboard}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
