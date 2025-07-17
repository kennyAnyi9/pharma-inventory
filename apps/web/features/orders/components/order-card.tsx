"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { formatDistanceToNow, format } from "date-fns";
import {
  Package,
  Calendar,
  User,
  FileText,
  CheckCircle,
  Clock,
  Truck,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { updateOrderStatus } from "../actions/order-actions";
import { useState } from "react";

export interface OrderCardProps {
  order: {
    id: number;
    orderNumber: string;
    supplierId: number;
    supplierName: string;
    status: string;
    orderDate: Date;
    expectedDeliveryDate: Date | null;
    actualDeliveryDate: Date | null;
    totalAmount: string;
    notes: string | null;
    createdBy: string | null;
    approvedBy: string | null;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  onUpdate?: () => void;
}

const statusColors = {
  draft: "bg-muted/50 text-muted-foreground",
  pending: "bg-info/15 text-info",
  approved: "bg-success/15 text-success",
  ordered: "bg-primary/15 text-primary",
  delivered: "bg-warning/15 text-warning",
  completed: "bg-success/20 text-success",
  cancelled: "bg-critical/15 text-critical",
};

const statusIcons = {
  draft: FileText,
  pending: Clock,
  approved: CheckCircle,
  ordered: Package,
  delivered: Truck,
  completed: CheckCircle,
  cancelled: AlertTriangle,
};

const nextStatusMap: Record<string, string> = {
  draft: "pending",
  pending: "approved",
  approved: "ordered",
  ordered: "delivered",
  delivered: "completed",
};

export function OrderCard({ order, onUpdate }: OrderCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const StatusIcon = statusIcons[order.status as keyof typeof statusIcons] || FileText;
  const nextStatus = nextStatusMap[order.status];

  const handleStatusUpdate = async () => {
    if (!nextStatus) return;

    setIsLoading(true);
    try {
      await updateOrderStatus({
        orderId: order.id,
        status: nextStatus as any,
        notes: `Status updated to ${nextStatus}`,
      });
      onUpdate?.();
    } catch (error) {
      console.error("Error updating order status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await updateOrderStatus({
        orderId: order.id,
        status: "cancelled",
        notes: "Order cancelled",
      });
      onUpdate?.();
    } catch (error) {
      console.error("Error cancelling order:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="transition-all duration-200 hover:bg-muted/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg ${
                statusColors[order.status as keyof typeof statusColors]
              }`}
            >
              <StatusIcon className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-lg">
                <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">
                  {order.orderNumber}
                </Link>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {order.supplierName} •{" "}
                {formatDistanceToNow(new Date(order.orderDate), {
                  addSuffix: true,
                })}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge
              variant="secondary"
              className={statusColors[order.status as keyof typeof statusColors]}
            >
              {order.status}
            </Badge>
            <Badge variant="outline" className="font-mono">
              ${parseFloat(order.totalAmount).toFixed(2)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>Order Date: {format(new Date(order.orderDate), "MMM dd, yyyy")}</span>
          </div>
          {order.expectedDeliveryDate && (
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <span>
                Expected: {format(new Date(order.expectedDeliveryDate), "MMM dd, yyyy")}
              </span>
            </div>
          )}
          {order.createdBy && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>Created by: {order.createdBy}</span>
            </div>
          )}
          {order.approvedBy && order.approvedAt && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>
                Approved by {order.approvedBy} on{" "}
                {format(new Date(order.approvedAt), "MMM dd, yyyy")}
              </span>
            </div>
          )}
        </div>

        {order.notes && (
          <div className="bg-muted/50 p-3 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </div>
        )}

        {order.status !== "completed" && order.status !== "cancelled" && (
          <div className="flex gap-2 pt-2">
            {nextStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStatusUpdate}
                disabled={isLoading}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as {nextStatus}
              </Button>
            )}
            {order.status === "draft" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        )}

        {order.actualDeliveryDate && (
          <div className="text-sm text-success bg-success/10 p-2 rounded border border-success/20">
            Delivered on {format(new Date(order.actualDeliveryDate), "MMM dd, yyyy")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}