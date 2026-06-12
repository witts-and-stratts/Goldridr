import type { NotificationDeliveryRecord } from "./types";

export interface NotificationQueue {
  claim( limit?: number, leaseMs?: number ): Promise<NotificationDeliveryRecord[]>;
}

export class SqliteNotificationQueue implements NotificationQueue {
  async claim( limit?: number, leaseMs?: number ): Promise<NotificationDeliveryRecord[]> {
    const { getDb } = await import( "@/lib/db" );
    const { claimDeliveries } = await import( "./store" );
    return claimDeliveries( getDb(), limit, leaseMs );
  }
}
