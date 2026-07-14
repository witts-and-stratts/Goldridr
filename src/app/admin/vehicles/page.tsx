"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";
import { Car, Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Card, CardContent } from "@/components/admin-ui/card";
import { Skeleton } from "@/components/admin-ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/admin-ui/dialog";
import { useAdmin } from "../context";
import type { Vehicle, AdminChauffeur } from "./types";
import { EMPTY_FORM } from "./constants";
import { VehicleFormFields } from "./components/vehicle-form-fields";
import { VehicleCard } from "./components/vehicle-card";

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const { chauffeurs: rawChauffeurs } = useAdmin();
  const chauffeurs = rawChauffeurs as AdminChauffeur[];

  const { data: vehiclesData, isPending } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/vehicles");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.vehicles as Vehicle[];
    },
  });

  const vehicles = vehiclesData ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const assignedTo = (vehicleId: number) =>
    chauffeurs.find((c) => c.vehicle?.id === vehicleId);

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: form.make,
          model: form.model,
          year: form.year ? Number(form.year) : null,
          colour: form.colour || null,
          plate: form.plate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to add vehicle");
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setForm(EMPTY_FORM);
      setAddOpen(false);
      toast.success("Vehicle added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add vehicle");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/vehicles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          make: form.make,
          model: form.model,
          year: form.year ? Number(form.year) : null,
          colour: form.colour || null,
          plate: form.plate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update vehicle");
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      await queryClient.invalidateQueries({ queryKey: qk.chauffeurs() });
      setEditTarget(null);
      toast.success("Vehicle updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update vehicle");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/vehicles?id=${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete vehicle");
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      await queryClient.invalidateQueries({ queryKey: qk.chauffeurs() });
      setDeleteTarget(null);
      toast.success("Vehicle deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete vehicle");
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (v: Vehicle) => {
    setEditTarget(v);
    setForm({
      make: v.make,
      model: v.model,
      year: v.year ? String(v.year) : "",
      colour: v.colour ?? "",
      plate: v.plate ?? "",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Vehicles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} registered</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["vehicles"] });
            queryClient.invalidateQueries({ queryKey: qk.chauffeurs() });
          }} disabled={isPending}>
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}>
            <Plus className="size-3.5" />
            Add vehicle
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6 space-y-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </CardContent></Card>
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Car className="size-10 opacity-30" />
            <p className="text-sm">No vehicles registered</p>
            <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}>
              <Plus className="size-3.5" /> Add first vehicle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              assignedTo={assignedTo(v.id)}
              onEdit={() => openEdit(v)}
              onDelete={() => setDeleteTarget(v)}
            />
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <form onSubmit={handleAdd} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Add vehicle</DialogTitle>
              <DialogDescription>Register a vehicle that can be assigned to a chauffeur.</DialogDescription>
            </DialogHeader>
            <VehicleFormFields form={form} onChange={setForm} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Add vehicle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <form onSubmit={handleEdit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Edit vehicle</DialogTitle>
              <DialogDescription>Update the vehicle details.</DialogDescription>
            </DialogHeader>
            <VehicleFormFields form={form} onChange={setForm} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete vehicle?</DialogTitle>
            <DialogDescription>
              {[deleteTarget?.year, deleteTarget?.make, deleteTarget?.model].filter(Boolean).join(" ")} will be permanently removed and unassigned from any chauffeur.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
