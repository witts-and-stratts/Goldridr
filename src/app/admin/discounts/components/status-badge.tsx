"use client";

import { Badge } from "@/components/admin-ui/badge";
import type { DiscountCode } from "../types";
import { discountStatus } from "../utils";

export function StatusBadge({ discount }: { discount: DiscountCode }) {
  const status = discountStatus(discount);
  if (status === "active") {
    return <Badge className="border-green-500/30 bg-green-500/15 text-green-700 hover:bg-green-500/20">Active</Badge>;
  }
  if (status === "expired") return <Badge variant="outline">Expired</Badge>;
  if (status === "exhausted") return <Badge variant="outline">Limit reached</Badge>;
  return <Badge variant="secondary">Disabled</Badge>;
}
