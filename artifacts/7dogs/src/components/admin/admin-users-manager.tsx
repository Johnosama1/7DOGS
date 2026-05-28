import { useState } from "react";
import { useAdminGetUsers, useAdminAdjustBalance } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Coins, Zap, Plus, Minus } from "lucide-react";

const USERS_KEY = ["/api/admin/users"];

export function AdminUsersManager() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [adjustingUser, setAdjustingUser] = useState<User | null>(null);
  const [adjustType, setAdjustType] = useState<"coins" | "spins">("coins");
  const [adjustAmount, setAdjustAmount] = useState(100);

  const { data, isLoading } = useAdminGetUsers({ search: debouncedSearch || undefined, limit: 20 });
  const adjustMutation = useAdminAdjustBalance();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimer) clearTimeout(searchTimer);
    setSearchTimer(setTimeout(() => setDebouncedSearch(val), 400));
  };

  const handleAdjust = (positive: boolean) => {
    if (!adjustingUser) return;
    const amount = positive ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
    adjustMutation.mutate(
      { userId: adjustingUser.id, data: { type: adjustType, amount } },
      {
        onSuccess: (updated) => {
          toast({
            title: `${positive ? "+" : ""}${amount} ${adjustType} → ${updated.firstName}`,
            className: "bg-card",
          });
          setAdjustingUser(null);
          qc.invalidateQueries({ queryKey: USERS_KEY });
        },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by username or name..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="bg-background border-border pl-9 text-sm h-9"
        />
      </div>

      {/* Results count */}
      {data && (
        <p className="text-[11px] text-muted-foreground px-1">
          {data.total.toLocaleString()} users total {debouncedSearch && `· filtered`}
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !data?.users || data.users.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
          No users found
        </div>
      ) : (
        <div className="space-y-2">
          {data.users.map((u) => (
            <div key={u.id} className="bg-card border border-border rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                  <span className="text-primary font-black text-sm">{u.firstName.charAt(0).toUpperCase()}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">
                    {u.firstName} {u.lastName ?? ""}
                    {u.username && <span className="text-muted-foreground font-normal ml-1 text-[11px]">@{u.username}</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5 text-[11px] text-primary">
                      <Coins className="w-3 h-3" />{u.coins.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <Zap className="w-3 h-3" />{u.spins}
                    </span>
                    <span className="text-[11px] text-muted-foreground">👥 {u.totalReferrals}</span>
                  </div>
                </div>

                <button
                  onClick={() => { setAdjustingUser(u); setAdjustType("coins"); setAdjustAmount(100); }}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors shrink-0"
                  title="Adjust balance"
                >
                  <Coins className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Adjust panel */}
              {adjustingUser?.id === u.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAdjustType("coins")}
                      className={`flex-1 text-xs py-1.5 rounded-lg border font-semibold transition-colors ${adjustType === "coins" ? "bg-primary text-black border-primary" : "bg-background border-border"}`}
                    >
                      🪙 Coins
                    </button>
                    <button
                      onClick={() => setAdjustType("spins")}
                      className={`flex-1 text-xs py-1.5 rounded-lg border font-semibold transition-colors ${adjustType === "spins" ? "bg-primary text-black border-primary" : "bg-background border-border"}`}
                    >
                      ⚡ Spins
                    </button>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Math.abs(parseInt(e.target.value) || 0))}
                    className="bg-background border-border text-sm h-8"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAdjust(true)}
                      disabled={adjustMutation.isPending}
                      className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add {adjustAmount}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAdjust(false)}
                      disabled={adjustMutation.isPending}
                      className="flex-1 h-8 text-xs bg-destructive hover:bg-destructive/90 text-white"
                    >
                      <Minus className="w-3 h-3 mr-1" /> Remove {adjustAmount}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAdjustingUser(null)}
                      className="h-8 text-xs px-2"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
