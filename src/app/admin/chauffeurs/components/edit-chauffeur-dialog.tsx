"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/admin-ui/dialog";
import type { AdminChauffeur } from "../types";

interface EditForm {
  name: string;
  email: string;
  phone: string;
}

interface EditChauffeurDialogProps {
  editTarget: AdminChauffeur | null;
  onClose: () => void;
  form: EditForm;
  onFormChange: (f: EditForm) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function EditChauffeurDialog({
  editTarget,
  onClose,
  form,
  onFormChange,
  saving,
  onSubmit,
}: EditChauffeurDialogProps) {
  return (
    <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Edit chauffeur</DialogTitle>
            <DialogDescription>Update driver contact details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Name
              <Input
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                placeholder="Full name"
                autoComplete="name"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Email
              <Input
                type="email"
                value={form.email}
                onChange={(e) => onFormChange({ ...form, email: e.target.value })}
                placeholder="driver@goldridr.com"
                autoComplete="email"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
                placeholder="+1 (713) 555-0100"
                autoComplete="tel"
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
