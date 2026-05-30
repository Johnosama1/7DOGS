import { useState } from "react";
import { useAdminBroadcast, useGetUserStats } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Radio, Loader2, CheckCircle, XCircle, Image } from "lucide-react";

type Result = { total: number; sent: number; failed: number };

export function AdminBroadcast() {
  const { data: stats } = useGetUserStats();
  const broadcastMutation = useAdminBroadcast();
  const { toast } = useToast();

  const [text, setText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!confirm(`Send to ALL ${stats?.totalUsers ?? "?"} users?`)) return;

    setResult(null);
    broadcastMutation.mutate(
      {
        data: {
          text: text.trim(),
          parseMode: "HTML",
          photoUrl: photoUrl.trim() || null,
        },
      },
      {
        onSuccess: (data) => {
          setResult(data);
          toast({ title: "Broadcast complete", className: "bg-card" });
        },
        onError: () => toast({ title: "Broadcast failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-primary/8 border border-primary/20 rounded-xl p-3 flex gap-2.5">
        <Radio className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Message will be sent to all <span className="text-foreground font-bold">{stats?.totalUsers ?? 0} users</span> via Telegram. Supports HTML formatting: <code className="text-primary">&lt;b&gt;bold&lt;/b&gt;</code>, <code className="text-primary">&lt;i&gt;italic&lt;/i&gt;</code>, <code className="text-primary">&lt;a href=""&gt;link&lt;/a&gt;</code>.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSend} className="space-y-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-1">Message Text (HTML supported)</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="🎰 <b>Big Update!</b>\n\nNew rewards are waiting for you..."
            rows={5}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="text-[10px] text-muted-foreground mt-1">{text.length} characters</p>
        </div>

        {/* Photo URL toggle */}
        <button
          type="button"
          onClick={() => setShowPhoto(!showPhoto)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Image className="w-3.5 h-3.5" />
          {showPhoto ? "Remove photo" : "Attach photo (optional)"}
        </button>

        {showPhoto && (
          <Input
            placeholder="Photo URL (https://...)"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="bg-background border-border text-sm h-9"
          />
        )}

        <Button
          type="submit"
          disabled={broadcastMutation.isPending || !text.trim()}
          className="w-full bg-primary text-black hover:bg-primary/90 font-bold h-11"
        >
          {broadcastMutation.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending... (this may take a while)
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Radio className="w-4 h-4" />
              Send to All Users
            </span>
          )}
        </Button>
      </form>

      {/* Result */}
      {result && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-center">📡 Broadcast Complete</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-background rounded-lg py-2">
              <p className="text-lg font-black text-foreground">{result.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Total</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg py-2">
              <p className="text-lg font-black text-green-400 flex items-center justify-center gap-1">
                <CheckCircle className="w-4 h-4" />{result.sent}
              </p>
              <p className="text-[10px] text-green-400/70 uppercase">Sent</p>
            </div>
            <div className={`rounded-lg py-2 ${result.failed > 0 ? "bg-destructive/10 border border-destructive/20" : "bg-background"}`}>
              <p className={`text-lg font-black flex items-center justify-center gap-1 ${result.failed > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {result.failed > 0 && <XCircle className="w-4 h-4" />}{result.failed}
              </p>
              <p className={`text-[10px] uppercase ${result.failed > 0 ? "text-destructive/70" : "text-muted-foreground"}`}>Failed</p>
            </div>
          </div>
          {result.failed > 0 && (
            <p className="text-[11px] text-muted-foreground text-center">
              Failed usually means users blocked the bot or deactivated their account.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
