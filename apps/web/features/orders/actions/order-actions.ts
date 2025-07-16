"use server";

import { db } from "@/lib/db";
import {
  drugs,
  orderHistory,
  orderItems,
  orders,
  suppliers,
  alerts,
  orderAlerts,
} from "@workspace/database/schema";
import { and, desc, eq, sql, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Types
export interface OrderWithDetails {
  id: number;
  orderNumber: string;
  supplierId: number;
  supplierName: string;
  status: string;
  orderDate: Date;
  expectedDeliveryDate: Date | null;
  actualDeliveryDate: Date | null;
  totalAmount: string | null;
  notes: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemWithDrug[];
}

export interface OrderItemWithDrug {
  id: number;
  drugId: number;
  drugName: string;
  unit: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  quantityReceived: number | null;
  expiryDate: Date | null;
  batchNumber: string | null;
  notes: string | null;
}

// Generate unique order number
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const timestamp = now.getTime().toString().slice(-6);
  return `PO${year}${month}${day}${timestamp}`;
}

// Create order schema
const createOrderSchema = z.object({
  supplierId: z.number(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      drugId: z.number(),
      quantity: z.number().min(1),
      unitPrice: z.number().min(0),
    })
  ),
  alertIds: z.array(z.number()).optional(), // Link to alerts that triggered this order
});

export async function createOrder(data: z.infer<typeof createOrderSchema>) {
  try {
    const { supplierId, expectedDeliveryDate, notes, items, alertIds } =
      createOrderSchema.parse(data);

    // Calculate total amount
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Create the order
    const [newOrder] = await db
      .insert(orders)
      .values({
        orderNumber: generateOrderNumber(),
        supplierId,
        expectedDeliveryDate: expectedDeliveryDate
          ? new Date(expectedDeliveryDate)
          : null,
        totalAmount: totalAmount.toString(),
        notes,
        createdBy: "user", // Will be actual user ID later
      })
      .returning();

    // Create order items
    if (newOrder?.id) {
      for (const item of items) {
        const totalPrice = item.quantity * item.unitPrice;
        await db.insert(orderItems).values({
          orderId: newOrder.id,
        drugId: item.drugId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: totalPrice.toString(),
        });
      }
    }

    // Link to alerts if provided
    if (alertIds && alertIds.length > 0 && newOrder?.id) {
      for (const alertId of alertIds) {
        await db.insert(orderAlerts).values({
          orderId: newOrder.id,
          alertId,
        });
      }
    }

    // Add to history
    if (newOrder?.id) {
      await db.insert(orderHistory).values({
        orderId: newOrder.id,
        toStatus: "draft",
        notes: "Order created",
        changedBy: "user",
      });
    }

    revalidatePath("/orders");
    return {
      success: true,
      message: "Order created successfully",
      orderId: newOrder?.id || 0,
    };
  } catch (error) {
    console.error("Error creating order:", error);
    return { success: false, message: "Failed to create order" };
  }
}

// Update order status
const updateOrderStatusSchema = z.object({
  orderId: z.number(),
  status: z.enum([
    "draft",
    "pending",
    "approved",
    "ordered",
    "delivered",
    "completed",
    "cancelled",
  ]),
  notes: z.string().optional(),
});

export async function updateOrderStatus(
  data: z.infer<typeof updateOrderStatusSchema>
) {
  try {
    const { orderId, status, notes } = updateOrderStatusSchema.parse(data);

    // Get current order to track status change
    const currentOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (currentOrder.length === 0) {
      return { success: false, message: "Order not found" };
    }

    const fromStatus = currentOrder[0]?.status;

    // Update order
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Set additional fields based on status
    if (status === "approved") {
      updateData.approvedBy = "user"; // Will be actual user ID later
      updateData.approvedAt = new Date();
    } else if (status === "delivered") {
      updateData.actualDeliveryDate = new Date();
    }

    await db.update(orders).set(updateData).where(eq(orders.id, orderId));

    // Add to history
    await db.insert(orderHistory).values({
      orderId,
      fromStatus,
      toStatus: status,
      notes: notes || `Status changed from ${fromStatus} to ${status}`,
      changedBy: "user",
    });

    revalidatePath("/orders");
    return { success: true, message: "Order status updated successfully" };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, message: "Failed to update order status" };
  }
}

// Get all orders with supplier and item details
export async function getOrders(status?: string) {
  try {
    const whereClause = status ? eq(orders.status, status) : undefined;

    const ordersData = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        supplierId: orders.supplierId,
        supplierName: suppliers.name,
        status: orders.status,
        orderDate: orders.orderDate,
        expectedDeliveryDate: orders.expectedDeliveryDate,
        actualDeliveryDate: orders.actualDeliveryDate,
        totalAmount: orders.totalAmount,
        notes: orders.notes,
        createdBy: orders.createdBy,
        approvedBy: orders.approvedBy,
        approvedAt: orders.approvedAt,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(suppliers, eq(orders.supplierId, suppliers.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt));

    return ordersData;
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
}

// Get single order with full details
export async function getOrderById(orderId: number): Promise<OrderWithDetails | null> {
  try {
    // Get order with supplier
    const [orderData] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        supplierId: orders.supplierId,
        supplierName: suppliers.name,
        status: orders.status,
        orderDate: orders.orderDate,
        expectedDeliveryDate: orders.expectedDeliveryDate,
        actualDeliveryDate: orders.actualDeliveryDate,
        totalAmount: orders.totalAmount,
        notes: orders.notes,
        createdBy: orders.createdBy,
        approvedBy: orders.approvedBy,
        approvedAt: orders.approvedAt,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(suppliers, eq(orders.supplierId, suppliers.id))
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!orderData) return null;

    // Get order items with drug details
    const items = await db
      .select({
        id: orderItems.id,
        drugId: orderItems.drugId,
        drugName: drugs.name,
        unit: drugs.unit,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
        quantityReceived: orderItems.quantityReceived,
        expiryDate: orderItems.expiryDate,
        batchNumber: orderItems.batchNumber,
        notes: orderItems.notes,
      })
      .from(orderItems)
      .innerJoin(drugs, eq(orderItems.drugId, drugs.id))
      .where(eq(orderItems.orderId, orderId))
      .orderBy(drugs.name);

    return {
      ...orderData,
      items,
    };
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return null;
  }
}

// Get order statistics
export async function getOrderStats() {
  try {
    const stats = await db
      .select({
        status: orders.status,
        count: sql<number>`count(*)`.mapWith(Number),
        totalAmount: sql<number>`sum(${orders.totalAmount}::numeric)`.mapWith(
          Number
        ),
      })
      .from(orders)
      .groupBy(orders.status);

    const totalOrders = stats.reduce((sum, stat) => sum + stat.count, 0);
    const totalValue = stats.reduce((sum, stat) => sum + (stat.totalAmount || 0), 0);

    return {
      draft: stats.find((s) => s.status === "draft")?.count || 0,
      pending: stats.find((s) => s.status === "pending")?.count || 0,
      approved: stats.find((s) => s.status === "approved")?.count || 0,
      ordered: stats.find((s) => s.status === "ordered")?.count || 0,
      delivered: stats.find((s) => s.status === "delivered")?.count || 0,
      completed: stats.find((s) => s.status === "completed")?.count || 0,
      cancelled: stats.find((s) => s.status === "cancelled")?.count || 0,
      totalOrders,
      totalValue,
    };
  } catch (error) {
    console.error("Error fetching order stats:", error);
    return {
      draft: 0,
      pending: 0,
      approved: 0,
      ordered: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0,
      totalOrders: 0,
      totalValue: 0,
    };
  }
}

// Get all suppliers
export async function getSuppliers() {
  try {
    const suppliersData = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.status, "active"))
      .orderBy(suppliers.name);

    return suppliersData;
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return [];
  }
}

// Create supplier
const createSupplierSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryDays: z.number().min(1).default(7),
  notes: z.string().optional(),
});

export async function createSupplier(data: z.infer<typeof createSupplierSchema>) {
  try {
    const supplierData = createSupplierSchema.parse(data);

    const [newSupplier] = await db
      .insert(suppliers)
      .values(supplierData)
      .returning();

    revalidatePath("/orders");
    return {
      success: true,
      message: "Supplier created successfully",
      supplierId: newSupplier?.id || 0,
    };
  } catch (error) {
    console.error("Error creating supplier:", error);
    return { success: false, message: "Failed to create supplier" };
  }
}

// Update order item received quantity
const updateOrderItemSchema = z.object({
  orderItemId: z.number(),
  quantityReceived: z.number().min(0),
  expiryDate: z.string().optional(),
  batchNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function updateOrderItem(data: z.infer<typeof updateOrderItemSchema>) {
  try {
    const { orderItemId, quantityReceived, expiryDate, batchNumber, notes } =
      updateOrderItemSchema.parse(data);

    await db
      .update(orderItems)
      .set({
        quantityReceived,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        batchNumber,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(orderItems.id, orderItemId));

    revalidatePath("/orders");
    return { success: true, message: "Order item updated successfully" };
  } catch (error) {
    console.error("Error updating order item:", error);
    return { success: false, message: "Failed to update order item" };
  }
}

// Get order history
export async function getOrderHistory(orderId: number) {
  try {
    const history = await db
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, orderId))
      .orderBy(desc(orderHistory.createdAt));

    return history;
  } catch (error) {
    console.error("Error fetching order history:", error);
    return [];
  }
}

// Create order from alert (quick action)
export async function createOrderFromAlert(alertId: number) {
  try {
    // Get alert details
    const [alert] = await db
      .select({
        id: alerts.id,
        drugId: alerts.drugId,
        drugName: drugs.name,
        reorderQuantity: drugs.reorderQuantity,
        unitPrice: drugs.unitPrice,
        supplier: drugs.supplier,
      })
      .from(alerts)
      .innerJoin(drugs, eq(alerts.drugId, drugs.id))
      .where(eq(alerts.id, alertId))
      .limit(1);

    if (!alert) {
      return { success: false, message: "Alert not found" };
    }

    // Find supplier (for now, use the first active supplier)
    // In production, you'd match by supplier name or have a supplier relationship
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.status, "active"))
      .limit(1);

    if (!supplier) {
      return { success: false, message: "No active suppliers found" };
    }

    // Create order with recommended quantities
    const result = await createOrder({
      supplierId: supplier.id,
      items: [
        {
          drugId: alert.drugId,
          quantity: alert.reorderQuantity || 100,
          unitPrice: parseFloat(alert.unitPrice || "0"),
        },
      ],
      alertIds: [alertId],
      notes: `Auto-generated from alert: ${alert.drugName} low stock`,
    });

    return result;
  } catch (error) {
    console.error("Error creating order from alert:", error);
    return { success: false, message: "Failed to create order from alert" };
  }
}