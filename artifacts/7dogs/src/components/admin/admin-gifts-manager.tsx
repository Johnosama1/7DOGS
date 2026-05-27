import { useState } from "react";
import {
  useAdminGetGifts,
  useAdminCreateGift,
  useAdminUpdateGift,
  useAdminDeleteGift,
} from "@workspace/api-client-react";
import type { Gift } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, X, Pencil, Loader2, Eye, EyeOff, Package } from "lucide-react";

const GIFTS_KEY = ["/api/admin/gifts"];

interface GiftForm {
  name: string;
  description: string;
  coinPrice: number;
  imageUrl: string;
  stock: number | null;
  enabled: boolean;
}

const blank = (): GiftForm => ({
  name: "",
  description: "",
  coinPrice: 1000,
  imageUrl: "",
  stock: null,
  enabled: true,
});

export function AdminGiftsManager() {
  const { data: gifts, isLoading } = useAdminGetGifts();
  const createMutation = useAdminCreateGift();
  const updateMutation = useAdminUpdateGift();
  const deleteMutation = useAdminDeleteGift();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GiftForm>(blank());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<GiftForm>>({});

  const refresh = () => qc.invalidateQueries({ queryKey: GIFTS_KEY });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createMutation.mutate(
      {
        data: {
          name: form.name.trim(),
          description: form.description || undefined,
          coinPrice: form.coinPrice,
          imageUrl: form.imageUrl || undefined,
          stock: form.stock,
          enabled: form.enabled,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "✅ Gift added", className: "bg-card" });
          setForm(blank());
          setShowForm(false);
          refresh();
        },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      }
    );
  };

  const startEdit = (g: Gift) => {
    setEditingId(g.id);
    setEditForm({
      name: g.name,
      description: g.description ?? "",
      coinPrice: g.coinPrice,
      imageUrl: g.imageUrl ?? "",
      stock: g.stock,
      enabled: g.enabled,
    });
  };

  const saveEdit = (id: number) => {
    const data: Record<string, unknown> = { ...editForm };
    if (data.imageUrl === "") data.imageUrl = undefined;
    if (data.description === "") data.description = undefined;
    updateMutation.mutate(
      { giftId: id, data: data as Parameters<typeof updateMutation.mutate>[0]["data"] },
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

  const toggleEnabled = (g: Gift) => {
    updateMutation.mutate(
      { giftId: g.id, data: { enabled: !g.enabled } },
      { onSuccess: () => refresh() }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this gift?")) return;
    deleteMutation.mutate(
      { giftId: id },
      {
        onSuccess: () => { toast({ title: "Deleted" }); refresh(); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      }
    );
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="w-full bg-primary text-black hover:bg-primary/90" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Gift
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-primary/20 rounded-xl p-4 space-y-2.5">
          <p className="text-xs font-bold text-primary">New Gift</p>
          <Input
            placeholder="Gift name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-background border-border text-sm h-9"
          />
          <Input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-background border-border text-sm h-9"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Price (coins)</label>
              <Input
                type="number"
                value={form.coinPrice}
                onChange={(e) => setForm({ ...form, coinPrice: parseInt(e.target.value) || 0 })}
                className="bg-background border-border text-sm h-8 mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Stock (blank = ∞)</label>
              <Input
                type="number"
                placeholder="∞"
                value={form.stock ?? ""}
                onChange={(e) => setForm({ ...form, stock: e.target.value ? parseInt(e.target.value) : null })}
                className="bg-background border-border text-sm h-8 mt-0.5"
              />
            </div>
          </div>
          <Input
            placeholder="Image URL (optional)"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="bg-background border-border text-sm h-9"
          />
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

      {!gifts || gifts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
          No gifts yet
        </div>
      ) : (
        <div className="space-y-2">
          {gifts.map((g) => {
            const isEditing = editingId === g.id;
            return (
              <div key={g.id} className={`bg-card border rounded-xl overflow-hidden transition-all ${g.enabled ? "border-border" : "border-border/40 opacity-60"}`}>
                {isEditing ? (
                  <div className="p-3 space-y-2">
                    <Input value={editForm.name ?? ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-background border-border text-sm h-8" placeholder="Name" />
                    <Input value={editForm.description ?? ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="bg-background border-border text-xs h-7" placeholder="Description" />
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input type="number" value={editForm.coinPrice ?? 0} onChange={(e) => setEditForm({ ...editForm, coinPrice: parseInt(e.target.value) || 0 })} className="bg-background border-border text-xs h-7" placeholder="Price" />
                      <Input type="number" value={editForm.stock ?? ""} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value ? parseInt(e.target.value) : null })} className="bg-background border-border text-xs h-7" placeholder="Stock (∞)" />
                    </div>
                    <Input value={editForm.imageUrl ?? ""} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} className="bg-background border-border text-xs h-7" placeholder="Image URL" />
                    <div className="flex gap-1.5">
                      <button onClick={() => saveEdit(g.id)} className="flex items-center gap-1 px-3 py-1 bg-primary text-black text-xs rounded-lg font-bold" disabled={updateMutation.isPending}>
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-1 bg-border text-foreground text-xs rounded-lg">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                      {g.imageUrl ? (
                        <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-primary/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{g.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        🪙 {g.coinPrice.toLocaleString()} {g.stock !== null ? `· ${g.stock} left` : "· ∞ stock"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleEnabled(g)} className={`p-1.5 rounded-lg transition-colors ${g.enabled ? "text-primary hover:text-primary/70" : "text-muted-foreground hover:text-primary"}`}>
                        {g.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => startEdit(g)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors">
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
