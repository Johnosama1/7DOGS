import { useState } from "react";
import { useUser } from "@/context/user-context";
import { useLang } from "@/context/language-context";
import { useGetReferrals } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Users, Link as LinkIcon, Gift } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ReferralsPage() {
  const { user } = useUser();
  const { t } = useLang();
  const { data: referrals } = useGetReferrals(
    { userId: user?.id || 0 },
    { query: { enabled: !!user?.id } as never }
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (referrals?.referralLink && !copied) {
      navigator.clipboard.writeText(referrals.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user || !referrals) {
    return <div className="p-8 text-center text-muted-foreground">{t.loading}</div>;
  }

  const progressPercentage = Math.min(
    100,
    (referrals.totalReferrals / referrals.referralsRequired) * 100
  );

  return (
    <div className="flex flex-col items-center w-full px-4 pt-6 pb-8">
      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 gold-glow">
        <Users className="w-8 h-8 text-primary" />
      </div>

      <h1 className="text-2xl font-black text-primary tracking-wide uppercase mb-2">{t.inviteTitle}</h1>
      <p className="text-muted-foreground text-center text-sm px-4 mb-8">{t.inviteSubtitle}</p>

      <div className="w-full bg-card border border-primary/20 rounded-2xl p-5 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px]" />
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          {t.nextReward}
        </h3>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">{t.progress}</span>
          <span className="font-bold text-primary">{referrals.totalReferrals} / {referrals.referralsRequired}</span>
        </div>
        <Progress value={progressPercentage} className="h-2 mb-4 bg-background" />
        <p className="text-sm text-muted-foreground">
          {t.reward}: <strong className="text-foreground">{referrals.rewardAmount} {referrals.rewardType}</strong>
        </p>
      </div>

      <div className="w-full flex gap-2 mb-8">
        <div className="flex-1 bg-background border border-primary/30 rounded-xl px-4 py-3 flex items-center overflow-hidden">
          <LinkIcon className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
          <span className="text-sm truncate text-muted-foreground">{referrals.referralLink}</span>
        </div>
        <Button
          onClick={handleCopy}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-auto px-6 rounded-xl transition-all"
        >
          {copied
            ? <Check className="w-4 h-4 text-black" />
            : <Copy className="w-4 h-4" />
          }
        </Button>
      </div>

      <div className="w-full">
        <h3 className="font-bold text-lg mb-4 border-b border-border pb-2">{t.yourNetwork}</h3>
        {referrals.referralList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm bg-card rounded-xl border border-border">
            {t.noInvites}
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.referralList.map((ref) => (
              <div key={ref.id} className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-background border border-primary/30 flex items-center justify-center text-primary font-bold">
                    {ref.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{ref.firstName}</p>
                    {ref.username && <p className="text-xs text-muted-foreground">@{ref.username}</p>}
                  </div>
                </div>
                <div className="text-xs text-primary/60 bg-primary/10 px-2 py-1 rounded">
                  {new Date(ref.joinedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
