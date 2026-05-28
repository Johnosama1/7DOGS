import { useGetSettings, useAdminUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type ToggleDef = {
  key: keyof SettingsUpdate;
  label: string;
  emoji: string;
};

type SettingsUpdate = {
  maintenanceMode?: boolean;
  wheelEnabled?: boolean;
  giftsEnabled?: boolean;
  referralsEnabled?: boolean;
  redeemEnabled?: boolean;
  accountEnabled?: boolean;
};

const TOGGLES: ToggleDef[] = [
  { key: "maintenanceMode", label: "Maintenance Mode", emoji: "🚧" },
  { key: "wheelEnabled", label: "Spin Wheel", emoji: "🎰" },
  { key: "giftsEnabled", label: "Gifts Shop", emoji: "🎁" },
  { key: "referralsEnabled", label: "Referrals", emoji: "👥" },
  { key: "redeemEnabled", label: "Redeem", emoji: "✨" },
  { key: "accountEnabled", label: "Account Page", emoji: "👤" },
];

export function AdminToggles() {
  const { data: settings, isLoading } = useGetSettings();
  const updateMutation = useAdminUpdateSettings();
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleToggle = (key: keyof SettingsUpdate, current: boolean) => {
    updateMutation.mutate(
      { data: { [key]: !current } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/settings"] });
          toast({ title: `${key} → ${!current ? "ON" : "OFF"}`, className: "bg-card border-primary/40 text-sm" });
        },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const getValue = (key: string): boolean => {
    if (!settings) return false;
    return (settings as unknown as Record<string, boolean>)[key];
  };

  return (
    <div className="space-y-2">
      {TOGGLES.map(({ key, label, emoji }) => {
        const value = getValue(key as string);
        const isMaintenance = key === "maintenanceMode";
        return (
          <div
            key={key}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
              isMaintenance && value
                ? "border-destructive/40 bg-destructive/5"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{emoji}</span>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {value ? (isMaintenance ? "Users see maintenance page" : "Enabled for users") : "Hidden from users"}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle(key, value)}
              disabled={updateMutation.isPending}
              className={`relative w-12 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
                value
                  ? isMaintenance
                    ? "bg-destructive"
                    : "bg-primary"
                  : "bg-border"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  value ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
