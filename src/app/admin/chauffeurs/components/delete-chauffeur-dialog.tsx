"use client";

import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/admin-ui/dialog";

interface DeleteChauffeurDialogProps {
  target: { name: string } | null;
  onClose: () => void;
  deleting: boolean;
  onConfirm: () => void;
}

export function DeleteChauffeurDialog({ target, onClose, deleting, onConfirm }: DeleteChauffeurDialogProps) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete chauffeur?</DialogTitle>
          <DialogDescription>
            {target?.name} will be removed from assignments. Their existing bookings will become unassigned.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Delete chauffeur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
