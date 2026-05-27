import { useState } from "react";
import { useUser } from "@/context/user-context";
import { Redirect } from "wouter";
import {
  useAdminVerify,
  useGetUserStats,
  useGetSettings,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert, Users, Coins, Zap, Gift, LogOut,
  Radio, Settings, ToggleLeft, CircleDot, Package, UsersRound,
  ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { AdminToggles } from "@/components/admin/admin-toggles";
import { AdminWheelEditor } from "@/components/admin/admin-wheel-editor";
import { AdminGiftsManager } from "@/components/admin/admin-gifts-manager";
import { AdminBroadcast } from "@/components/admin/admin-broadcast";
import { AdminSettingsPanel } from "@/components/admin/admin-settings-panel";
import { AdminUsersManager } from "@/components/admin/admin-users-manager";
import { ChannelsManager } from "@/components/admin/admin-channels";

// ─── Auth gate ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, isLoading: userLoading } = useUser();
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const verifyMutation = useAdminVerify();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    verifyMutation.mutate(
      { data: { password } },
      {
        onSuccess: (res) => {
          setToken(res.token);
          localStorage.setItem("admin_token", res.token);
          setAuthTokenGetter(() => res.token);
        },
        onError: () =>
          toast({ title: "❌ Access Denied", description: "Wrong password", variant: "destructive" }),
      }
    );
  };

  if (userLoading) return null;
  const isAdmin = user?.username === "J_O_H_N8";
  if (!isAdmin) return <Redirect to="/" />;
  if (token) setAuthTokenGetter(() => token);

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-black">Restricted Area</h1>
            <p className="text-sm text-muted-foreground mt-1">Owner-only access</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-card border-border pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                {showPw ? "hide" : "show"}
              </button>
            </div>
            <Button
              type="submit"
              className="w-full bg-destructive hover:bg-destructive/90 text-white font-bold"
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? "Verifying..." : "Enter Admin Panel"}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <AdminDashboard
      token={token}
      onLogout={() => {
        setToken(null);
        localStorage.removeItem("admin_token");
        setAuthTokenGetter(null);
      }}
    />
  );
}

// ─── Accordion section ────────────────────────────────────────────────────────

function Section({
  id,
  icon: Icon,
  label,
  badge,
  color,
  openId,
  setOpenId,
  children,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  badge?: string | number;
  color: string;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const isOpen = openId === id;
  return (
    <div className={`rounded-2xl border overflow-hidden transition-colors ${isOpen ? "border-primary/30 bg-card" : "border-border bg-card/50"}`}>
      <button
        onClick={() => setOpenId(isOpen ? null : id)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">{label}</p>
        </div>
        {badge !== undefined && (
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/50">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Full dashboard ───────────────────────────────────────────────────────────

function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const { data: stats } = useGetUserStats();
  const { data: settings } = useGetSettings();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>("toggles");

  const statCards = [
    { icon: Users, label: "Users", value: stats?.totalUsers, color: "text-blue-400" },
    { icon: Coins, label: "Coins", value: stats?.totalCoinsIssued, color: "text-primary" },
    { icon: Zap, label: "Spins", value: stats?.totalSpins, color: "text-purple-400" },
    { icon: Gift, label: "Redeemed", value: stats?.totalRedemptions, color: "text-green-400" },
  ];

  return (
    <div className="flex flex-col w-full px-4 pt-5 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            Admin Panel
          </h1>
          <p className="text-[11px] text-muted-foreground">@J_O_H_N8 — Owner</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      {/* Maintenance banner */}
      {settings?.maintenanceMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2.5 text-sm text-destructive font-semibold flex items-center gap-2"
        >
          🚧 Maintenance Mode is ON — users see maintenance screen
        </motion.div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-2.5 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <p className={`text-sm font-black ${color}`}>
              {value !== undefined
                ? value >= 1000
                  ? `${(value / 1000).toFixed(1)}k`
                  : value
                : "—"}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2 py-1">
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Controls</span>
        <div className="flex-1 h-px bg-border/50" />
      </div>

      {/* Accordion sections */}
      <div className="space-y-2.5">
        <Section
          id="toggles"
          icon={ToggleLeft}
          label="Feature Toggles"
          color="bg-blue-500/15 text-blue-400"
          openId={openId}
          setOpenId={setOpenId}
        >
          <div className="pt-2">
            <AdminToggles />
          </div>
        </Section>

        <Section
          id="broadcast"
          icon={Radio}
          label="Broadcast Message"
          badge={stats?.totalUsers ?? 0}
          color="bg-orange-500/15 text-orange-400"
          openId={openId}
          setOpenId={setOpenId}
        >
          <div className="pt-2">
            <AdminBroadcast />
          </div>
        </Section>

        <Section
          id="wheel"
          icon={CircleDot}
          label="Spin Wheel Editor"
          color="bg-primary/15 text-primary"
          openId={openId}
          setOpenId={setOpenId}
        >
          <div className="pt-2">
            <AdminWheelEditor />
          </div>
        </Section>

        <Section
          id="gifts"
          icon={Package}
          label="Gifts Manager"
          color="bg-green-500/15 text-green-400"
          openId={openId}
          setOpenId={setOpenId}
        >
          <div className="pt-2">
            <AdminGiftsManager />
          </div>
        </Section>

        <Section
          id="channels"
          icon={Radio}
          label="Required Channels"
          color="bg-sky-500/15 text-sky-400"
          openId={openId}
          setOpenId={setOpenId}
        >
          <div className="pt-2">
            <ChannelsManager token={token} />
          </div>
        </Section>

        <Section
          id="users"
          icon={UsersRound}
          label="User Management"
          badge={stats?.totalUsers}
          color="bg-purple-500/15 text-purple-400"
          openId={openId}
          setOpenId={setOpenId}
        >
          <div className="pt-2">
            <AdminUsersManager />
          </div>
        </Section>

        <Section
          id="settings"
          icon={Settings}
          label="Settings & Config"
          color="bg-zinc-500/15 text-zinc-400"
          openId={openId}
          setOpenId={setOpenId}
        >
          <div className="pt-2">
            <AdminSettingsPanel />
          </div>
        </Section>
      </div>
    </div>
  );
}
