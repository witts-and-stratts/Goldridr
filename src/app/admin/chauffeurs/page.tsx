"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";
import { User, RefreshCw, Loader2, Clock, Plus } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import { Card, CardContent } from "@/components/admin-ui/card";
import { Skeleton } from "@/components/admin-ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/admin-ui/dialog";
import { useAdmin } from "../context";
import Link from "next/link";
import type { AdminChauffeur, Booking, Vehicle } from "./types";
import { getStats } from "./utils";
import { ChauffeurCard } from "./components/chauffeur-card";
import { AddChauffeurDialog } from "./components/add-chauffeur-dialog";
import { EditChauffeurDialog } from "./components/edit-chauffeur-dialog";
import { AssignVehicleDialog } from "./components/assign-vehicle-dialog";
import { DeleteChauffeurDialog } from "./components/delete-chauffeur-dialog";

export default function ChauffeursPage() {
  const queryClient = useQueryClient();
  const { chauffeurs: rawChauffeurs } = useAdmin();
  const chauffeurs = rawChauffeurs as AdminChauffeur[];

  const { data: bookingsData, isPending: bookingsPending } = useQuery({
    queryKey: qk.bookings(),
    queryFn: async () => {
      const res = await fetch("/api/admin/bookings");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.bookings as Booking[];
    },
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/vehicles");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.vehicles as Vehicle[];
    },
  });

  const vehicles = vehiclesData ?? [];
  const bookings = bookingsData ?? [];
  const loading = bookingsPending;

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [assignVehicleTarget, setAssignVehicleTarget] = useState<AdminChauffeur | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState<string>("");
  const [assigningSaving, setAssigningSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<AdminChauffeur | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [pwTarget, setPwTarget] = useState<AdminChauffeur | null>(null);
  const [pwForm, setPwForm] = useState({ password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploadTarget, setAvatarUploadTarget] = useState<AdminChauffeur | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("name", form.name);
      formData.set("email", form.email);
      formData.set("phone", form.phone);
      formData.set("password", form.password);
      if (avatarFile) formData.set("avatar", avatarFile);
      const res = await fetch("/api/admin/chauffeurs", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to add chauffeur");
      await queryClient.invalidateQueries({ queryKey: qk.chauffeurs() });
      setForm({ name: "", email: "", phone: "", password: "" });
      setAvatarFile(null);
      setAddOpen(false);
      toast.success("Chauffeur added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add chauffeur");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (chauffeur: AdminChauffeur, file: File | null) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.set("id", chauffeur.id);
      formData.set("avatar", file);
      const res = await fetch("/api/admin/chauffeurs", { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to upload avatar");
      await queryClient.invalidateQueries({ queryKey: qk.chauffeurs() });
      toast.success("Avatar updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload avatar");
    }
  };

  const handleEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const res = await fetch("/api/admin/chauffeurs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editTarget.id, name: editForm.name, email: editForm.email, phone: editForm.phone || null }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update chauffeur");
      await queryClient.invalidateQueries({ queryKey: qk.chauffeurs() });
      setEditTarget(null);
      setMenuOpenId(null);
      toast.success("Chauffeur updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update chauffeur");
    } finally {
      setEditSaving(false);
    }
  };

  const handleAssignVehicle = async () => {
    if (!assignVehicleTarget) return;
    setAssigningSaving(true);
    try {
      const vehicleId = assignVehicleId === "" ? null : Number(assignVehicleId);
      const url = vehicleId === null ? "/api/admin/chauffeurs" : "/api/admin/vehicles";
      const body = vehicleId === null
        ? { id: assignVehicleTarget.id, vehicleId: null }
        : { id: vehicleId, chauffeurId: assignVehicleTarget.id };
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to assign vehicle");
      await queryClient.invalidateQueries({ queryKey: qk.chauffeurs() });
      setAssignVehicleTarget(null);
      toast.success(vehicleId ? "Vehicle assigned" : "Vehicle unassigned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign vehicle");
    } finally {
      setAssigningSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/chauffeurs?id=${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete chauffeur");
      await queryClient.invalidateQueries({ queryKey: qk.chauffeurs() });
      await queryClient.invalidateQueries({ queryKey: qk.bookings() });
      setDeleteTarget(null);
      toast.success("Chauffeur deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete chauffeur");
    } finally {
      setDeleting(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pwTarget) return;
    if (pwForm.password !== pwForm.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/chauffeurs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pwTarget.id, password: pwForm.password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to change password");
      setPwTarget(null);
      setPwForm({ password: "", confirm: "" });
      toast.success("Password changed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  const openEditDialog = (chauffeur: AdminChauffeur) => {
    setEditTarget(chauffeur);
    setEditForm({ name: chauffeur.name, email: chauffeur.email, phone: chauffeur.phone ?? "" });
    setMenuOpenId(null);
  };

  const openChangePassword = (chauffeur: AdminChauffeur) => {
    setPwTarget(chauffeur);
    setPwForm({ password: "", confirm: "" });
    setMenuOpenId(null);
  };

  const openAvatarPicker = (chauffeur: AdminChauffeur) => {
    setAvatarUploadTarget(chauffeur);
    setMenuOpenId(null);
    avatarInputRef.current?.click();
  };

  const pendingUnassigned = bookings.filter((b) => !b.chauffeurId && b.status === "pending");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Chauffeurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{chauffeurs.length} registered driver{chauffeurs.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            queryClient.invalidateQueries({ queryKey: qk.chauffeurs() });
            queryClient.invalidateQueries({ queryKey: qk.bookings() });
          }} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" />
            Add chauffeur
          </Button>
        </div>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          if (file && avatarUploadTarget) {
            void handleAvatarUpload(avatarUploadTarget, file);
          }
          setAvatarUploadTarget(null);
          event.currentTarget.value = "";
        }}
      />

      {!loading && pendingUnassigned.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="size-4 text-yellow-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">{pendingUnassigned.length} pending booking{pendingUnassigned.length !== 1 ? "s" : ""} unassigned</p>
                <p className="text-xs text-muted-foreground">These pending bookings have no chauffeur assigned yet</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/bookings?status=pending&assignment=unassigned">Assign now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : chauffeurs.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <User className="size-10 opacity-30" />
            <p className="text-sm">No chauffeurs registered</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {chauffeurs.map((c) => (
            <ChauffeurCard
              key={c.id}
              chauffeur={c}
              stats={getStats(bookings, c.id)}
              menuOpenId={menuOpenId}
              onMenuOpenChange={setMenuOpenId}
              onEdit={() => openEditDialog(c)}
              onChangePassword={() => openChangePassword(c)}
              onAvatarPick={() => openAvatarPicker(c)}
              onAssignVehicle={() => {
                setAssignVehicleTarget(c);
                setAssignVehicleId(c.vehicle ? String(c.vehicle.id) : "");
                setMenuOpenId(null);
              }}
              onDelete={() => {
                setDeleteTarget(c);
                setMenuOpenId(null);
              }}
            />
          ))}
        </div>
      )}

      <AddChauffeurDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        form={form}
        onFormChange={setForm}
        avatarFile={avatarFile}
        onAvatarChange={setAvatarFile}
        saving={saving}
        onSubmit={handleAdd}
      />

      <EditChauffeurDialog
        editTarget={editTarget}
        onClose={() => setEditTarget(null)}
        form={editForm}
        onFormChange={setEditForm}
        saving={editSaving}
        onSubmit={handleEdit}
      />

      <AssignVehicleDialog
        target={assignVehicleTarget}
        onClose={() => setAssignVehicleTarget(null)}
        vehicles={vehicles}
        vehicleId={assignVehicleId}
        onVehicleIdChange={setAssignVehicleId}
        saving={assigningSaving}
        onSave={handleAssignVehicle}
      />

      <DeleteChauffeurDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        deleting={deleting}
        onConfirm={handleDelete}
      />

      <Dialog open={Boolean(pwTarget)} onOpenChange={(open) => !open && setPwTarget(null)}>
        <DialogContent>
          <form onSubmit={handleChangePassword} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Change password</DialogTitle>
              <DialogDescription>Set a new password for {pwTarget?.name}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <label className="grid gap-1.5 text-sm font-medium">
                New password
                <Input
                  type="password"
                  value={pwForm.password}
                  onChange={(event) => setPwForm({ ...pwForm, password: event.target.value })}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Confirm password
                <Input
                  type="password"
                  value={pwForm.confirm}
                  onChange={(event) => setPwForm({ ...pwForm, confirm: event.target.value })}
                  placeholder="Repeat the new password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPwTarget(null)} disabled={pwSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={pwSaving}>
                {pwSaving && <Loader2 className="animate-spin" />}
                Change password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
