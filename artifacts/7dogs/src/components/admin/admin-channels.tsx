import { useState } from "react";
import {
  useAdminGetChannels,
  useAdminAddChannel,
  useAdminDeleteChannel,
  useAdminToggleChannel,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";

const CHANNELS_KEY = ["/api/admin/channels"];

export function ChannelsManager({ token: _token }: { token: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: channels, isLoading } = useAdminGetChannels();
  const addMutation = useAdminAddChannel();
  const deleteMutation = useAdminDeleteChannel();
  const toggleMutation = useAdminToggleChannel();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: CHANNELS_KEY });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;
    const cleanUser = username.replace("@", "").trim();
    addMutation.mutate(
      { data: { name: name.trim(), username: cleanUser, link: `https://t.me/${cleanUser}` } },
      {
        onSuccess: () => {
          toast({ title: "✅ Channel added", className: "bg-card" });
          setName(""); setUsername("");
          refresh();
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ channelId: id }, {
      onSuccess: () => { toast({ title: "Deleted" }); refresh(); },
    });
  };

  const handleToggle = (id: number, enabled: boolean) => {
    toggleMutation.mutate({ channelId: id, data: { enabled: !enabled } }, {
      onSuccess: () => refresh(),
    });
  };

  return (
    <div className="space-y-3">
      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-background border border-border rounded-xl p-3 space-y-2">
        <Input
          placeholder="Channel name (e.g. 7DOGS Official)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-card border-border text-sm h-9"
        />
        <Input
          placeholder="Username (e.g. @7dogs_channel)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="bg-card border-border text-sm h-9"
        />
        <Button
          type="submit"
          className="w-full bg-sky-500 hover:bg-sky-600 text-white text-sm h-9"
          disabled={addMutation.isPending || !name.trim() || !username.trim()}
        >
          <Plus className="w-4 h-4 mr-1" />
          {addMutation.isPending ? "Adding..." : "Add Channel"}
        </Button>
      </form>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : !channels || channels.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
          No required channels yet
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className={`flex items-center gap-3 bg-card rounded-xl border px-3 py-2.5 transition-all ${
                ch.enabled ? "border-sky-500/20" : "border-border opacity-60"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
                <span className="text-sky-400 font-black text-sm">{ch.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{ch.name}</p>
                <p className="text-xs text-muted-foreground">@{ch.username}</p>
              </div>
              <button
                onClick={() => handleToggle(ch.id, ch.enabled)}
                className={`p-1.5 rounded-lg transition-colors ${ch.enabled ? "text-sky-400 hover:text-sky-400/70" : "text-muted-foreground hover:text-sky-400"}`}
              >
                {ch.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleDelete(ch.id)}
                className="p-1.5 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-center opacity-60">
            {channels.length} channel(s) · 👁 = shown to users
          </p>
        </div>
      )}
    </div>
  );
}
