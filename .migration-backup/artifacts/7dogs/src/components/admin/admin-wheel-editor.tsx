import { useState } from "react";
import {
  useAdminGetWheel,
  useAdminCreateSegment,
  useAdminUpdateSegment,
  useAdminDeleteSegment,
} from "@workspace/api-client-react";
import type { WheelSegment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, X, Pencil, Loader2 } from "lucide-react";

const COLORS = ["#D4AF37", "#FFE066", "#A07800", "#22C55E", "#3B82F6", "#EF4444", "#A855F7", "#F97316"];
const REWARD_TYPES = ["coins", "spins", "gift"] as const;

type RewardType = (typeof REWARD_TYPES)[number];

interface SegmentForm {
  label: string;
  rewardType: RewardType;
  rewardAmount: number;
  probability: number;
  color: string;
  enabled: boolean;
}

const blank = (): SegmentForm => ({
  label: "",
  rewardType: "coins",
  rewardAmount: 100,
  probability: 1,
  color: COLORS[0],
  enabled: true,
});

const WHEEL_KEY = ["/api/admin/wheel"];

export function AdminWheelEditor() {
  const { data: segments, isLoading } = useAdminGetWheel();
  const createMutation = useAdminCreateSegment();
  const updateMutation = useAdminUpdateSegment();
  const deleteMutation = useAdminDeleteSegment();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SegmentForm>(blank());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<SegmentForm>>({});

  const refresh = () => qc.invalidateQueries({ queryKey: WHEEL_KEY });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) return;
    createMutation.mutate(
      { data: { ...form, label: form.label.trim() } },
      {
        onSuccess: () => {
          toast({ title: "✅ Segment added", className: "bg-card" });
          setForm(blank());
          setShowForm(false);
          refresh();
        },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      }
    );
  };

  const startEdit = (seg: WheelSegment) => {
    setEditingId(seg.id);
    setEditForm({
      label: seg.label,
      rewardType: seg.rewardType as RewardType,
      rewardAmount: seg.rewardAmount,
      probability: seg.probability,
      color: seg.color,
      enabled: seg.enabled,
    });
  };

  const saveEdit = (id: number) => {
    updateMutation.mutate(
      { segmentId: id, data: editForm },
      {
        onSuccess: () => {
          toast({ title: "✅ Saved", className: "bg-card" });
          setEditingId(null);
          refresh();
        },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this segment?")) return;
    deleteMutation.mutate(
      { segmentId: id },
      {
        onSuccess: () => {
          toast({ title: "Deleted" });
          refresh();
        },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      }
    );
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const totalWeight = segments?.reduce((s, seg) => s + seg.probability, 0) ?? 0;

  return (
    <div className="space-y-3">
      {/* Add button */}
      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-primary text-black hover:bg-primary/90"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Segment
        </Button>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-card border border-primary/20 rounded-xl p-4 space-y-3"
        >
          <p className="text-xs font-bold text-primary mb-1">New Segment</p>
          <Input
            placeholder="Label (e.g. 100 Coins)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="bg-background border-border text-sm h-9"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.rewardType}
              onChange={(e) => setForm({ ...form, rewardType: e.target.value as RewardType })}
              className="bg-background border border-border rounded-md px-2 py-1.5 text-sm text-foreground"
            >
              {REWARD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="Amount"
              value={form.rewardAmount}
              onChange={(e) => setForm({ ...form, rewardAmount: parseInt(e.target.value) || 0 })}
              className="bg-background border-border text-sm h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.1"
              placeholder="Weight"
              value={form.probability}
              onChange={(e) => setForm({ ...form, probability: parseFloat(e.target.value) || 1 })}
              className="bg-background border-border text-sm h-9 flex-1"
            />
            <span className="text-xs text-muted-foreground">weight</span>
          </div>
          {/* Color picker */}
          <div className="flex gap-1.5 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className="w-6 h-6 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: form.color === c ? "white" : "transparent",
                  transform: form.color === c ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1 bg-primary text-black h-8 text-xs" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => { setShowForm(false); setForm(blank()); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Segments list */}
      {!segments || segments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
          No segments yet
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground px-1">Total weight: {totalWeight.toFixed(1)} — each segment wins proportionally</p>
          {segments.map((seg) => {
            const isEditing = editingId === seg.id;
            const pct = totalWeight > 0 ? ((seg.probability / totalWeight) * 100).toFixed(1) : "0";

            return (
              <div
                key={seg.id}
                className={`bg-card border rounded-xl overflow-hidden transition-all ${
                  seg.enabled ? "border-border" : "border-border/40 opacity-60"
                }`}
              >
                {isEditing ? (
                  <div className="p-3 space-y-2">
                    <Input
                      value={editForm.label ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      className="bg-background border-border text-sm h-8"
                      placeholder="Label"
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      <select
                        value={editForm.rewardType ?? "coins"}
                        onChange={(e) => setEditForm({ ...editForm, rewardType: e.target.value as RewardType })}
                        className="bg-background border border-border rounded px-1.5 py-1 text-xs text-foreground col-span-1"
                      >
                        {REWARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <Input
                        type="number"
                        value={editForm.rewardAmount ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, rewardAmount: parseInt(e.target.value) || 0 })}
                        className="bg-background border-border text-xs h-7 col-span-1"
                      />
                      <Input
                        type="number"
                        step="0.1"
                        value={editForm.probability ?? 1}
                        onChange={(e) => setEditForm({ ...editForm, probability: parseFloat(e.target.value) || 1 })}
                        className="bg-background border-border text-xs h-7 col-span-1"
                      />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, color: c })}
                          className="w-5 h-5 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: c,
                            borderColor: editForm.color === c ? "white" : "transparent",
                            transform: editForm.color === c ? "scale(1.15)" : "scale(1)",
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => saveEdit(seg.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-primary text-black text-xs rounded-lg font-bold"
                        disabled={updateMutation.isPending}
                      >
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 px-3 py-1 bg-border text-foreground text-xs rounded-lg"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <div
                      className="w-3 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{seg.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {seg.rewardType} · {seg.rewardAmount} · ~{pct}%
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(seg)}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(seg.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
