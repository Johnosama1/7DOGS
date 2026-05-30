import { useState, useEffect } from "react";
import { useGetSettings, useAdminUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Smartphone, Link2 } from "lucide-react";

export function AdminSettingsPanel() {
  const { data: settings, isLoading } = useGetSettings();
  const updateMutation = useAdminUpdateSettings();
  const [miniAppUrl, setMiniAppUrl] = useState("");
  const [settingMenuBtn, setSettingMenuBtn] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [referralsRequired, setReferralsRequired] = useState(5);
  const [referralRewardType, setReferralRewardType] = useState<"coins" | "spins">("spins");
  const [referralRewardAmount, setReferralRewardAmount] = useState(1);
  const [botUsername, setBotUsername] = useState("mini_7DOGS_bot");

  useEffect(() => {
    if (!settings) return;
    setReferralsRequired(settings.referralsRequired);
    setReferralRewardType(settings.referralRewardType as "coins" | "spins");
    setReferralRewardAmount(settings.referralRewardAmount);
    setBotUsername(settings.botUsername);
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate(
      {
        data: {
          referralsRequired,
          referralRewardType,
          referralRewardAmount,
          botUsername: botUsername.trim() || "mini_7DOGS_bot",
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/settings"] });
          toast({ title: "✅ Settings saved", className: "bg-card" });
        },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      }
    );
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      {/* Referral config */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">👥 Referral System</p>

        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">Referrals needed per reward</label>
          <Input
            type="number"
            min={1}
            value={referralsRequired}
            onChange={(e) => setReferralsRequired(parseInt(e.target.value) || 1)}
            className="bg-background border-border text-sm h-9"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Every {referralsRequired} referrals → user gets a reward
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Reward type</label>
            <select
              value={referralRewardType}
              onChange={(e) => setReferralRewardType(e.target.value as "coins" | "spins")}
              className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm text-foreground"
            >
              <option value="spins">Spins</option>
              <option value="coins">Coins</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Reward amount</label>
            <Input
              type="number"
              min={1}
              value={referralRewardAmount}
              onChange={(e) => setReferralRewardAmount(parseInt(e.target.value) || 1)}
              className="bg-background border-border text-sm h-9"
            />
          </div>
        </div>

        <div className="bg-background rounded-lg p-2.5 text-[11px] text-muted-foreground">
          Current: every <span className="text-foreground font-bold">{referralsRequired}</span> referrals → <span className="text-primary font-bold">+{referralRewardAmount} {referralRewardType}</span>
        </div>
      </div>

      {/* Bot config */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">🤖 Bot Config</p>
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">Bot username (without @)</label>
          <Input
            value={botUsername}
            onChange={(e) => setBotUsername(e.target.value.replace("@", ""))}
            placeholder="mini_7DOGS_bot"
            className="bg-background border-border text-sm h-9"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Used to build referral links: t.me/{botUsername}?start=...
          </p>
        </div>
      </div>

      {/* Mini App button setup */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5" /> Deployment Config
        </p>

        <div className="bg-background rounded-lg p-2.5 text-[11px] text-muted-foreground space-y-0.5">
          <p className="font-semibold text-foreground">Auto-detected from environment:</p>
          <p>Set <code className="text-primary">SERVER_URL</code> in Vercel → Environment Variables</p>
          <p>e.g. <code className="text-primary/80">https://your-app.vercel.app</code></p>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">Mini App URL (override — leave blank to auto-detect)</label>
          <Input
            value={miniAppUrl}
            onChange={(e) => setMiniAppUrl(e.target.value)}
            placeholder="https://your-app.vercel.app"
            className="bg-background border-border text-sm h-9"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Sets the "🎰 Open 7DOGS App" button in Telegram bot chat
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={async () => {
              setSettingMenuBtn(true);
              try {
                const token = localStorage.getItem("admin_token") ?? "";
                const res = await fetch("/api/admin/set-menu-button", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ miniAppUrl: miniAppUrl.trim() || undefined }),
                });
                const data = await res.json() as { ok?: boolean; url?: string; error?: string };
                if (data.ok) {
                  toast({ title: "✅ Menu button updated!", description: `URL: ${data.url}`, className: "bg-card" });
                } else {
                  toast({ title: "Failed: " + (data.error ?? "Unknown"), variant: "destructive" });
                }
              } catch {
                toast({ title: "Network error", variant: "destructive" });
              } finally {
                setSettingMenuBtn(false);
              }
            }}
            disabled={settingMenuBtn}
            size="sm"
            className="bg-sky-500 hover:bg-sky-600 text-white font-bold h-9"
          >
            {settingMenuBtn ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Smartphone className="w-4 h-4 mr-1" />}
            {settingMenuBtn ? "Setting..." : "Set App Button"}
          </Button>

          <Button
            onClick={async () => {
              setSettingWebhook(true);
              try {
                const res = await fetch("/api/telegram/set-webhook", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: miniAppUrl.trim() || undefined }),
                });
                const data = await res.json() as { ok?: boolean; registered_to?: string; description?: string; error?: string };
                if (data.ok) {
                  toast({ title: "✅ Webhook registered!", description: data.registered_to, className: "bg-card" });
                } else {
                  toast({ title: "Failed: " + (data.description ?? data.error ?? "Unknown"), variant: "destructive" });
                }
              } catch {
                toast({ title: "Network error", variant: "destructive" });
              } finally {
                setSettingWebhook(false);
              }
            }}
            disabled={settingWebhook}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold h-9"
          >
            {settingWebhook ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Link2 className="w-4 h-4 mr-1" />}
            {settingWebhook ? "Registering..." : "Register Webhook"}
          </Button>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full bg-primary text-black hover:bg-primary/90 font-bold h-11"
      >
        {updateMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Save Settings
      </Button>
    </div>
  );
}
