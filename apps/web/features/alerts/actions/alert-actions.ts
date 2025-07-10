"use server";

import { db } from "@/lib/db";
import {
  alertHistory,
  alerts,
  drugs,
  inventory,
} from "@workspace/database/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Types
export interface AlertData {
  id: number;
  drugId: number;
  drugName: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  threshold: number | null;
  currentValue: number | null;
  recommendedAction: string | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertGenerationResult {
  generated: number;
  resolved: number;
  errors: string[];
}

// Get ML service predictions
async function getMLPredictions() {
  try {
    const ML_SERVICE_URL =
      process.env.ML_SERVICE_URL || "http://localhost:8000";
    const ML_API_KEY = process.env.ML_API_KEY || "ml-service-dev-key-2025";

    const response = await fetch(`${ML_SERVICE_URL}/forecast/all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ML_API_KEY,
      },
      body: JSON.stringify({ days: 7 }),
    });

    if (!response.ok) {
      throw new Error(`ML service error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching ML predictions:", error);
    return null;
  }
}

// Generate alerts based on current inventory and ML predictions
export async function generateAlerts(): Promise<AlertGenerationResult> {
  const result: AlertGenerationResult = {
    generated: 0,
    resolved: 0,
    errors: [],
  };

  try {
    // Get current inventory status
    const inventoryData = await db
      .select({
        drugId: inventory.drugId,
        drugName: drugs.name,
        unit: drugs.unit,
        currentStock: inventory.closingStock,
        reorderLevel: drugs.reorderLevel,
        reorderQuantity: drugs.reorderQuantity,
        date: inventory.date,
      })
      .from(inventory)
      .innerJoin(drugs, eq(inventory.drugId, drugs.id))
      .where(
        sql`${inventory.date} = (
          SELECT MAX(date) 
          FROM ${inventory} AS i2 
          WHERE i2.drug_id = ${inventory.drugId}
        )`
      );

    // Get ML predictions
    const mlPredictions = await getMLPredictions();

    // Generate low stock alerts
    for (const item of inventoryData) {
      await generateLowStockAlert(item, result);
    }

    // Generate predicted stockout alerts if ML data is available
    if (mlPredictions?.forecasts) {
      for (const forecast of mlPredictions.forecasts) {
        await generatePredictedStockoutAlert(forecast, result);
      }
    }

    // Resolve alerts that are no longer relevant
    await resolveOutdatedAlerts(inventoryData, result);

    revalidatePath("/dashboard/alerts");
    return result;
  } catch (error) {
    console.error("Error generating alerts:", error);
    result.errors.push(`Failed to generate alerts: ${error}`);
    return result;
  }
}

async function generateLowStockAlert(item: any, result: AlertGenerationResult) {
  if (item.currentStock <= item.reorderLevel) {
    // Check if this alert already exists
    const existingAlert = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.drugId, item.drugId),
          eq(alerts.type, "low_stock"),
          eq(alerts.status, "active")
        )
      )
      .limit(1);

    if (existingAlert.length === 0) {
      // Create new alert
      const severity =
        item.currentStock === 0
          ? "critical"
          : item.currentStock <= item.reorderLevel * 0.5
            ? "high"
            : "medium";

      await db.insert(alerts).values({
        drugId: item.drugId,
        type: "low_stock",
        severity,
        title: `Low Stock: ${item.drugName}`,
        message: `Stock level (${item.currentStock} ${item.unit}) is below reorder level (${item.reorderLevel} ${item.unit})`,
        threshold: item.reorderLevel,
        currentValue: item.currentStock,
        recommendedAction: `Order ${item.reorderQuantity} ${item.unit} immediately`,
      });

      result.generated++;
    }
  }
}

async function generatePredictedStockoutAlert(
  forecast: any,
  result: AlertGenerationResult
) {
  const totalPredicted7Days = forecast.total_predicted_7_days || 0;
  const currentStock = forecast.current_stock || 0;
  const daysOfStock =
    currentStock > 0 ? currentStock / (totalPredicted7Days / 7) : 0;

  if (daysOfStock <= 3 && daysOfStock > 0) {
    // Check if this alert already exists
    const existingAlert = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.drugId, forecast.drug_id),
          eq(alerts.type, "predicted_stockout"),
          eq(alerts.status, "active")
        )
      )
      .limit(1);

    if (existingAlert.length === 0) {
      const severity =
        daysOfStock <= 1 ? "critical" : daysOfStock <= 2 ? "high" : "medium";

      await db.insert(alerts).values({
        drugId: forecast.drug_id,
        type: "predicted_stockout",
        severity,
        title: `Predicted Stockout: ${forecast.drug_name}`,
        message: `Based on ML forecasts, stock will last only ${Math.round(daysOfStock)} days`,
        threshold: 3,
        currentValue: Math.round(daysOfStock),
        recommendedAction: `Order stock immediately. Predicted demand: ${totalPredicted7Days} ${forecast.unit} over 7 days`,
      });

      result.generated++;
    }
  }
}

async function resolveOutdatedAlerts(
  inventoryData: any[],
  result: AlertGenerationResult
) {
  // Get all active alerts
  const activeAlerts = await db
    .select()
    .from(alerts)
    .where(eq(alerts.status, "active"));

  for (const alert of activeAlerts) {
    const inventoryItem = inventoryData.find(
      (item) => item.drugId === alert.drugId
    );

    if (inventoryItem) {
      let shouldResolve = false;

      // Check if low stock alert should be resolved
      if (
        alert.type === "low_stock" &&
        inventoryItem.currentStock > inventoryItem.reorderLevel
      ) {
        shouldResolve = true;
      }

      if (shouldResolve) {
        await db
          .update(alerts)
          .set({
            status: "resolved",
            resolvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(alerts.id, alert.id));

        // Add to history
        await db.insert(alertHistory).values({
          alertId: alert.id,
          action: "resolved",
          performedBy: "system",
          notes: "Auto-resolved - conditions no longer met",
        });

        result.resolved++;
      }
    }
  }
}

// Get all alerts with drug information
export async function getAlerts(status?: string) {
  try {
    const whereClause = status ? eq(alerts.status, status) : undefined;

    const alertsData = await db
      .select({
        id: alerts.id,
        drugId: alerts.drugId,
        drugName: drugs.name,
        type: alerts.type,
        severity: alerts.severity,
        status: alerts.status,
        title: alerts.title,
        message: alerts.message,
        threshold: alerts.threshold,
        currentValue: alerts.currentValue,
        recommendedAction: alerts.recommendedAction,
        isRead: alerts.isRead,
        createdAt: alerts.createdAt,
        updatedAt: alerts.updatedAt,
        acknowledgedAt: alerts.acknowledgedAt,
        acknowledgedBy: alerts.acknowledgedBy,
        resolvedAt: alerts.resolvedAt,
      })
      .from(alerts)
      .innerJoin(drugs, eq(alerts.drugId, drugs.id))
      .where(whereClause)
      .orderBy(desc(alerts.createdAt));

    return alertsData;
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return [];
  }
}

// Get alert counts by status
export async function getAlertCounts() {
  try {
    const counts = await db
      .select({
        status: alerts.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(alerts)
      .groupBy(alerts.status);

    return {
      active: counts.find((c) => c.status === "active")?.count || 0,
      acknowledged: counts.find((c) => c.status === "acknowledged")?.count || 0,
      resolved: counts.find((c) => c.status === "resolved")?.count || 0,
      total: counts.reduce((sum, c) => sum + c.count, 0),
    };
  } catch (error) {
    console.error("Error fetching alert counts:", error);
    return { active: 0, acknowledged: 0, resolved: 0, total: 0 };
  }
}

// Acknowledge an alert
const acknowledgeAlertSchema = z.object({
  alertId: z.number(),
  notes: z.string().optional(),
});

export async function acknowledgeAlert(
  data: z.infer<typeof acknowledgeAlertSchema>
) {
  try {
    const { alertId, notes } = acknowledgeAlertSchema.parse(data);

    await db
      .update(alerts)
      .set({
        status: "acknowledged",
        acknowledgedAt: new Date(),
        acknowledgedBy: "user", // Will be actual user ID later
        isRead: true,
        updatedAt: new Date(),
      })
      .where(eq(alerts.id, alertId));

    // Add to history
    await db.insert(alertHistory).values({
      alertId,
      action: "acknowledged",
      performedBy: "user",
      notes: notes || "Alert acknowledged by user",
    });

    revalidatePath("/dashboard/alerts");
    return { success: true, message: "Alert acknowledged successfully" };
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    return { success: false, message: "Failed to acknowledge alert" };
  }
}

// Dismiss an alert
const dismissAlertSchema = z.object({
  alertId: z.number(),
  notes: z.string().optional(),
});

export async function dismissAlert(data: z.infer<typeof dismissAlertSchema>) {
  try {
    const { alertId, notes } = dismissAlertSchema.parse(data);

    await db
      .update(alerts)
      .set({
        status: "dismissed",
        resolvedAt: new Date(),
        isRead: true,
        updatedAt: new Date(),
      })
      .where(eq(alerts.id, alertId));

    // Add to history
    await db.insert(alertHistory).values({
      alertId,
      action: "dismissed",
      performedBy: "user",
      notes: notes || "Alert dismissed by user",
    });

    revalidatePath("/dashboard/alerts");
    return { success: true, message: "Alert dismissed successfully" };
  } catch (error) {
    console.error("Error dismissing alert:", error);
    return { success: false, message: "Failed to dismiss alert" };
  }
}

// Mark alert as read
export async function markAlertAsRead(alertId: number) {
  try {
    await db
      .update(alerts)
      .set({
        isRead: true,
        updatedAt: new Date(),
      })
      .where(eq(alerts.id, alertId));

    revalidatePath("/dashboard/alerts");
    return { success: true };
  } catch (error) {
    console.error("Error marking alert as read:", error);
    return { success: false, message: "Failed to mark alert as read" };
  }
}

// Get alert history
export async function getAlertHistory(alertId: number) {
  try {
    const history = await db
      .select()
      .from(alertHistory)
      .where(eq(alertHistory.alertId, alertId))
      .orderBy(desc(alertHistory.createdAt));

    return history;
  } catch (error) {
    console.error("Error fetching alert history:", error);
    return [];
  }
}
