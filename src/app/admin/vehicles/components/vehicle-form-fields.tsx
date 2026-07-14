"use client";
import { Input } from "@/components/admin-ui/input";

interface FormState {
  make: string;
  model: string;
  year: string;
  colour: string;
  plate: string;
}

export function VehicleFormFields({ form, onChange }: { form: FormState; onChange: (f: FormState) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Make
          <Input value={form.make} onChange={(e) => onChange({ ...form, make: e.target.value })} placeholder="BMW" required />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Model
          <Input value={form.model} onChange={(e) => onChange({ ...form, model: e.target.value })} placeholder="7 Series" required />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Year <span className="font-normal text-muted-foreground">(optional)</span>
          <Input type="number" value={form.year} onChange={(e) => onChange({ ...form, year: e.target.value })} placeholder="2024" min={1900} max={2100} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Colour <span className="font-normal text-muted-foreground">(optional)</span>
          <Input value={form.colour} onChange={(e) => onChange({ ...form, colour: e.target.value })} placeholder="Midnight Black" />
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        Plate <span className="font-normal text-muted-foreground">(optional)</span>
        <Input value={form.plate} onChange={(e) => onChange({ ...form, plate: e.target.value })} placeholder="ABC 1234" />
      </label>
    </div>
  );
}
