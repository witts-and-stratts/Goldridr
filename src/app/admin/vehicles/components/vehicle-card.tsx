"use client";
import { Car, PencilLine, Trash2 } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Badge } from "@/components/admin-ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/admin-ui/card";
import { Separator } from "@/components/admin-ui/separator";
import type { Vehicle } from "../types";

export function VehicleCard({
  vehicle,
  assignedTo,
  onEdit,
  onDelete,
}: {
  vehicle: Vehicle;
  assignedTo: { name: string } | undefined;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="hover:border-border/80 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-secondary flex items-center justify-center">
            <Car className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">
              {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
            </CardTitle>
            <CardDescription className="truncate">{vehicle.plate ?? "No plate"}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4 space-y-3">
        {vehicle.colour && (
          <p className="text-xs text-muted-foreground">{vehicle.colour}</p>
        )}
        <div className="flex items-center justify-between">
          {assignedTo ? (
            <Badge variant="outline" className="text-xs">
              {assignedTo.name ?? "Assigned"}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">Unassigned</Badge>
          )}
          <div className="flex gap-1.5">
            <Button variant="outline" size="icon" className="size-9" onClick={onEdit}>
              <PencilLine className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
