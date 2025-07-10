"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import {
  CheckCircle,
  Package,
  Truck,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { updateOrderStatus, OrderWithDetails } from "../actions/order-actions";

interface OrderStatusActionsProps {
  order: OrderWithDetails;
}

const statusActions = {
  draft: [
    { status: "pending", label: "Submit for Approval", icon: Clock, variant: "default" },
    { status: "cancelled", label: "Cancel Order", icon: XCircle, variant: "destructive" },
  ],
  pending: [
    { status: "approved", label: "Approve Order", icon: CheckCircle, variant: "default" },
    { status: "cancelled", label: "Cancel Order", icon: XCircle, variant: "destructive" },
  ],
  approved: [
    { status: "ordered", label: "Place Order", icon: Package, variant: "default" },
    { status: "cancelled", label: "Cancel Order", icon: XCircle, variant: "destructive" },
  ],
  ordered: [
    { status: "delivered", label: "Mark as Delivered", icon: Truck, variant: "default" },
  ],
  delivered: [
    { status: "completed", label: "Complete Order", icon: CheckCircle, variant: "default" },
  ],
  completed: [],
  cancelled: [],
};

export function OrderStatusActions({ order }: OrderStatusActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const availableActions = statusActions[order.status as keyof typeof statusActions] || [];

  const handleActionClick = (action: any) => {
    setSelectedAction(action);
    setNotes("");
    setIsDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedAction) return;

    setIsLoading(true);
    try {
      const result = await updateOrderStatus({
        orderId: order.id,
        status: selectedAction.status,
        notes: notes || `Order ${selectedAction.label.toLowerCase()}`,
      });

      if (result.success) {
        setIsDialogOpen(false);
        setSelectedAction(null);
        setNotes("");
        // Refresh the page
        window.location.reload();
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (availableActions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Order Status
          </CardTitle>
          <CardDescription>
            This order is {order.status} and no further actions are available.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Update the order status or take action on this order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {availableActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.status}
                variant={action.variant as any}
                className="w-full justify-start gap-2"
                onClick={() => handleActionClick(action)}
              >
                <Icon className="w-4 h-4" />
                {action.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAction && <selectedAction.icon className="w-5 h-5" />}
              Confirm Action
            </DialogTitle>
            <DialogDescription>
              {selectedAction &&
                `Are you sure you want to ${selectedAction.label.toLowerCase()}? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this status change..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant={selectedAction?.variant as any}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : selectedAction?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}