"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/admin-ui/dialog";

interface AddForm {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface AddChauffeurDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: AddForm;
  onFormChange: (f: AddForm) => void;
  avatarFile: File | null;
  onAvatarChange: (f: File | null) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function AddChauffeurDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  avatarFile,
  onAvatarChange,
  saving,
  onSubmit,
}: AddChauffeurDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Add chauffeur</DialogTitle>
            <DialogDescription>Add a driver to booking assignments and the operations calendar.</DialogDescription>
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
            <label className="grid gap-1.5 text-sm font-medium">
              Initial password
              <Input
                type="password"
                value={form.password}
                onChange={(e) => onFormChange({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Avatar <span className="font-normal text-muted-foreground">(optional)</span>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
              />
              {avatarFile ? (
                <span className="text-xs font-normal text-muted-foreground">{avatarFile.name}</span>
              ) : null}
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Add chauffeur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
