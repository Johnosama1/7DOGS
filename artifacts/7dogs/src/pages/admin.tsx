import { useState } from "react";
import { useUser } from "@/context/user-context";
import { useLang } from "@/context/language-context";
import { Redirect } from "wouter";
import { useAdminVerify, useGetUserStats, useGetSettings } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Users, Coins, Database, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { setAuthTokenGetter } from "@workspace/api-client-react";

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
          <Input
            type="password"
            placeholder={t.adminPassword}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-card border-border"
          />
          <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>
            {verifyMutation.isPending ? t.verifying : t.enter}
          </Button>
        </form>
      </div>
    );
  }

  return <AdminDashboard onLogout={() => {
    setToken(null);
    localStorage.removeItem("admin_token");
    setAuthTokenGetter(null);
  }} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
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
        <TabsList className="w-full h-auto flex flex-wrap bg-card mb-6">
          <TabsTrigger value="stats" className="flex-1 py-2">Stats</TabsTrigger>
          <TabsTrigger value="users" className="flex-1 py-2">Users</TabsTrigger>
          <TabsTrigger value="wheel" className="flex-1 py-2">Wheel</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 py-2">Config</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4 mt-0">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> Total Users
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-2xl font-bold">{stats?.totalUsers.toLocaleString()}</span>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <Coins className="w-3 h-3" /> Coins Issued
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-2xl font-bold text-primary">{stats?.totalCoinsIssued.toLocaleString()}</span>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <Database className="w-3 h-3" /> Total Spins
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-2xl font-bold">{stats?.totalSpins.toLocaleString()}</span>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <List className="w-3 h-3" /> Redemptions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-2xl font-bold">{stats?.totalRedemptions.toLocaleString()}</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card className="bg-card border-border p-4">
            <p className="text-sm text-muted-foreground mb-4">User management</p>
            <div className="bg-background rounded p-4 text-center text-xs text-muted-foreground border border-dashed border-border">
              Full table coming soon
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="wheel">
          <Card className="bg-card border-border p-4">
            <p className="text-sm text-muted-foreground mb-4">Wheel segment editor</p>
            <div className="bg-background rounded p-4 text-center text-xs text-muted-foreground border border-dashed border-border">
              Segment builder coming soon
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="bg-card border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Maintenance Mode</span>
              <div className="px-2 py-1 bg-background border border-border rounded text-xs">
                {settings?.maintenanceMode ? "ON" : "OFF"}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Wheel Enabled</span>
              <div className="px-2 py-1 bg-background border border-border rounded text-xs text-primary">
                {settings?.wheelEnabled ? "ON" : "OFF"}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
