"use client";

import { Button } from "@workspace/ui/components/button";
import { Package } from "lucide-react";
import { useState } from "react";
import { createOrderFromAlert } from "@/features/orders/actions/order-actions";

interface CreateOrderFromAlertButtonProps {
  alertId: number;
  disabled?: boolean;
}

export function CreateOrderFromAlertButton({
  alertId,
  disabled = false,
}: CreateOrderFromAlertButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateOrder = async () => {
    setIsLoading(true);
    try {
      const result = await createOrderFromAlert(alertId);
      if (result.success) {
        // Show success message or redirect to order
        alert("Order created successfully! Check the Orders page.");
      } else {
        alert(`Failed to create order: ${result.message}`);
      }
    } catch (error) {
      console.error("Error creating order from alert:", error);
      alert("Failed to create order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleCreateOrder}
      disabled={disabled || isLoading}
    >
      <Package className="w-4 h-4 mr-2" />
      {isLoading ? "Creating..." : "Create Order"}
    </Button>
  );
}