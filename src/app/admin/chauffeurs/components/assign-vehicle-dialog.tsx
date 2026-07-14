"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/admin-ui/dialog";
import type { AdminChauffeur, Vehicle } from "../types";

interface AssignVehicleDialogProps {
  target: AdminChauffeur | null;
  onClose: () => void;
  vehicles: Vehicle[];
  vehicleId: string;
  onVehicleIdChange: (v: string) => void;
  saving: boolean;
  onSave: () => void;
}

export function AssignVehicleDialog({
  target,
  onClose,
  vehicles,
  vehicleId,
  onVehicleIdChange,
  saving,
  onSave,
}: AssignVehicleDialogProps) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign vehicle</DialogTitle>
          <DialogDescription>
            Select a vehicle for {target?.name}. Choose None to unassign.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={vehicleId}
            onChange={(e) => onVehicleIdChange(e.target.value)}
          >
            <option value="">None</option>
            {vehicles.filter((v) => v.status === "active").map((v) => (
              <option key={v.id} value={String(v.id)}>
                {[v.year, v.make, v.model].filter(Boolean).join(" ")}{v.plate ? ` · ${v.plate}` : ""}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
