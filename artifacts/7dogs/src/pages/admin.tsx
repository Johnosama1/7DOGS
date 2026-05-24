import { useState } from "react";
import { useUser } from "@/context/user-context";
import { useLang } from "@/context/language-context";
import { Redirect } from "wouter";
import {
  useAdminVerify, useGetUserStats, useGetSettings,
  useAdminGetChannels, useAdminAddChannel, useAdminDeleteChannel, useAdminToggleChannel,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Users, Coins, Database, List, Radio, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminPage() {
  const { user, isLoading: userLoading } = useUser();
  const { t } = useLang();
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [password, setPassword] = useState("");
  const verifyMutation = useAdminVerify();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    verifyMutation.mutate({ data: { password } }, {
      onSuccess: (res) => {
        setToken(res.token);
        localStorage.setItem("admin_token", res.token);
        setAuthTokenGetter(() => res.token);
      },
      onError: () => {
        toast({ title: t.accessDenied, description: t.invalidPassword, variant: "destructive" });
      },
    });
  };

  if (userLoading) return null;
  const isAdmin = user?.username === "J_O_H_N8";
  if (!isAdmin) return <Redirect to="/" />;
  if (token) setAuthTokenGetter(() => token);

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-6" />
        <h1 className="text-2xl font-bold mb-6">{t.restrictedArea}</h1>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <Input type="password" placeholder={t.adminPassword} value={password}
            onChange={(e) => setPassword(e.target.value)} className="bg-card border-border" />
          <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>
            {verifyMutation.isPending ? t.verifying : t.enter}
          </Button>
        </form>
      </div>
    );
  }

  return <AdminDashboard token={token} onLogout={() => {
    setToken(null);
    localStorage.removeItem("admin_token");
    setAuthTokenGetter(null);
  }} />;
}

function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const { t } = useLang();
  const { data: stats } = useGetUserStats();
  const { data: settings } = useGetSettings();

  return (
    <div className="flex flex-col w-full px-4 pt-6 pb-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-destructive flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" /> {t.adminTitle}
        </h1>
        <Button variant="ghost" size="sm" onClick={onLogout}>{t.logout}</Button>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="w-full h-auto grid grid-cols-4 bg-card mb-6">
          <TabsTrigger value="stats" className="py-2 text-xs">Stats</TabsTrigger>
          <TabsTrigger value="channels" className="py-2 text-xs">Channels</TabsTrigger>
          <TabsTrigger value="wheel" className="py-2 text-xs">Wheel</TabsTrigger>
          <TabsTrigger value="settings" className="py-2 text-xs">Config</TabsTrigger>
        </TabsList>

        {/* Stats */}
        <TabsContent value="stats" className="space-y-4 mt-0">
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Users, label: "Total Users", value: stats?.totalUsers },
              { icon: Coins, label: "Coins Issued", value: stats?.totalCoinsIssued },
              { icon: Database, label: "Total Spins", value: stats?.totalSpins },
              { icon: List, label: "Redemptions", value: stats?.totalRedemptions },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className="bg-card border-border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                    <Icon className="w-3 h-3" /> {label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <span className="text-2xl font-bold text-primary">{value?.toLocaleString() ?? "—"}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-card border-border p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Maintenance Mode</span>
              <span className={settings?.maintenanceMode ? "text-destructive font-bold" : "text-primary"}>
                {settings?.maintenanceMode ? "ON" : "OFF"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Wheel Enabled</span>
              <span className="text-primary">{settings?.wheelEnabled ? "ON" : "OFF"}</span>
            </div>
          </Card>
        </TabsContent>

        {/* Channels Manager */}
        <TabsContent value="channels" className="mt-0">
          <ChannelsManager token={token} />
        </TabsContent>

        {/* Wheel placeholder */}
        <TabsContent value="wheel">
          <Card className="bg-card border-border p-4 text-center text-xs text-muted-foreground border-dashed">
            Wheel segment editor — coming soon
          </Card>
        </TabsContent>

        {/* Settings placeholder */}
        <TabsContent value="settings">
          <Card className="bg-card border-border p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span>Maintenance Mode</span>
              <span className={settings?.maintenanceMode ? "text-destructive font-bold" : "text-primary"}>
                {settings?.maintenanceMode ? "ON" : "OFF"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Wheel</span>
              <span className="text-primary">{settings?.wheelEnabled ? "ON" : "OFF"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Referrals per reward</span>
              <span className="text-primary">{settings?.referralsRequired}</span>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChannelsManager({ token }: { token: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: channels, isLoading } = useAdminGetChannels();
  const addMutation = useAdminAddChannel();
  const deleteMutation = useAdminDeleteChannel();
  const toggleMutation = useAdminToggleChannel();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  const CHANNELS_KEY = ["/api/admin/channels"];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;
    const cleanUser = username.replace("@", "").trim();
    addMutation.mutate(
      { data: { name: name.trim(), username: cleanUser, link: `https://t.me/${cleanUser}` } },
      {
        onSuccess: () => {
          toast({ title: "✅ تمت الإضافة", className: "bg-primary text-black" });
          setName(""); setUsername("");
          qc.invalidateQueries({ queryKey: CHANNELS_KEY });
        },
        onError: () => toast({ title: "خطأ", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ channelId: id }, {
      onSuccess: () => {
        toast({ title: "تم الحذف" });
        qc.invalidateQueries({ queryKey: CHANNELS_KEY });
      },
    });
  };

  const handleToggle = (id: number, enabled: boolean) => {
    toggleMutation.mutate({ channelId: id, data: { enabled: !enabled } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: CHANNELS_KEY }),
    });
  };

  return (
    <div className="space-y-4">
      {/* Add form */}
      <Card className="bg-card border-primary/20 p-4">
        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
          <Radio className="w-3 h-3 text-primary" /> إضافة قناة جديدة
        </p>
        <form onSubmit={handleAdd} className="space-y-2">
          <Input
            placeholder="اسم القناة (مثلاً: قناة 7DOGS)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-background border-border text-sm"
          />
          <Input
            placeholder="يوزر القناة (مثلاً: @7dogs_channel)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-background border-border text-sm"
          />
          <Button
            type="submit"
            className="w-full bg-primary text-black hover:bg-primary/90 text-sm"
            disabled={addMutation.isPending || !name.trim() || !username.trim()}
          >
            <Plus className="w-4 h-4 mr-1" />
            {addMutation.isPending ? "جاري الإضافة..." : "إضافة القناة"}
          </Button>
        </form>
      </Card>

      {/* Channels list */}
      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">جاري التحميل...</div>
      ) : !channels || channels.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
          مفيش قنوات مضافة لحد دلوقتي
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className={`flex items-center gap-3 bg-card rounded-xl border px-3 py-3 transition-all ${
                ch.enabled ? "border-primary/20" : "border-border opacity-60"
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary font-black text-sm">{ch.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{ch.name}</p>
                <p className="text-xs text-muted-foreground">@{ch.username}</p>
              </div>
              <button
                onClick={() => handleToggle(ch.id, ch.enabled)}
                className={`p-1.5 rounded-lg transition-colors ${ch.enabled ? "text-primary hover:text-primary/70" : "text-muted-foreground hover:text-primary"}`}
                title={ch.enabled ? "تعطيل" : "تفعيل"}
              >
                {ch.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleDelete(ch.id)}
                className="p-1.5 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center pt-1 opacity-70">
            {channels.length} قناة • العين = مرئية للمستخدمين
          </p>
        </div>
      )}
    </div>
  );
}
