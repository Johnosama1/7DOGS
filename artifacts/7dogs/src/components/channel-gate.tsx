import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCheckChannelMembership } from "@workspace/api-client-react";
import { useLang } from "@/context/language-context";
import { useUser } from "@/context/user-context";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle2, RefreshCw, Lock } from "lucide-react";
import botLogo from "/7dogs-logo.jpeg";

interface ChannelGateProps {
  children: React.ReactNode;
}

export function ChannelGate({ children }: ChannelGateProps) {
  const { user } = useUser();
  const { t, lang } = useLang();
  const [checkKey, setCheckKey] = useState(0);

  const { data: unjoinedChannels, isLoading, refetch, isFetching } = useCheckChannelMembership(
    { telegramId: user?.telegramId || "" },
    { query: { enabled: !!user?.telegramId, queryKey: ["/api/channels/check", user?.telegramId, checkKey] } }
  );

  const handleCheck = () => {
    setCheckKey(k => k + 1);
    refetch();
  };

  // Still loading user or channels
  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // No unjoined channels — show app normally
  if (!unjoinedChannels || unjoinedChannels.length === 0) {
    return <>{children}</>;
  }

  // Gate screen
  const isRTL = lang === "ar";

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-black dark text-foreground">
      <div
        className="w-full max-w-[375px] bg-background relative flex flex-col min-h-[100dvh] shadow-2xl border-x border-primary/10 overflow-hidden"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative z-10">
          {/* Lock icon + logo */}
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.4)]">
              <img src={botLogo} alt="7DOGS" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-destructive border-2 border-background flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFE066] to-[#D4AF37] mb-2 text-center">
            {isRTL ? "انضم للقنوات أولاً" : "Join Channels First"}
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-8 px-2">
            {isRTL
              ? "لازم تنضم في القنوات دي عشان تقدر تفتح البوت"
              : "You must join all required channels to access the bot"}
          </p>

          {/* Channel list */}
          <div className="w-full space-y-3 mb-8">
            {unjoinedChannels.map((ch) => (
              <a
                key={ch.id}
                href={ch.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full bg-card border border-primary/20 hover:border-primary/60 rounded-2xl px-4 py-3 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-black text-sm">
                    {ch.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground truncate">{ch.name}</p>
                  <p className="text-xs text-muted-foreground">@{ch.username}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
              </a>
            ))}
          </div>

          {/* Check again button */}
          <Button
            className="w-full h-14 rounded-full font-black text-base bg-gradient-to-r from-[#D4AF37] to-[#997A00] text-black hover:from-[#FFE066] hover:to-[#D4AF37] border border-[#FFE066]/50 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            onClick={handleCheck}
            disabled={isFetching}
          >
            {isFetching ? (
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-5 h-5 mr-2" />
            )}
            {isRTL ? (isFetching ? "جاري التحقق..." : "تحقق من الاشتراك") : (isFetching ? "Checking..." : "I Joined — Check Again")}
          </Button>

          <p className="text-xs text-muted-foreground mt-4 text-center opacity-60">
            {isRTL
              ? "بعد ما تنضم في كل القنوات، اضغط على الزر فوق"
              : "After joining all channels, press the button above"}
          </p>
        </div>
      </div>
    </div>
  );
}
