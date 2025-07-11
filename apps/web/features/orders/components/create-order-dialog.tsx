"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { Plus, Trash2, Package } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "../actions/order-actions";

export interface CreateOrderDialogProps {
  suppliers: Array<{
    id: number;
    name: string;
    deliveryDays: number | null;
  }>;
  drugs: Array<{
    id: number;
    name: string;
    unit: string;
    unitPrice: string;
    reorderQuantity: number;
  }>;
}

interface OrderItem {
  drugId: number;
  quantity: number;
  unitPrice: number;
}

export function CreateOrderDialog({
  suppliers,
  drugs,
}: CreateOrderDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { drugId: 0, quantity: 1, unitPrice: 0 },
  ]);

  const handleAddItem = () => {
    setItems([...items, { drugId: 0, quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof OrderItem,
    value: string | number
  ) => {
    const newItems = [...items];
    if (field === "drugId" && newItems[index]) {
      newItems[index][field] = Number(value);
      // Auto-fill unit price when drug is selected
      const drug = drugs.find((d) => d.id === Number(value));
      if (drug) {
        newItems[index].unitPrice = parseFloat(drug.unitPrice);
        newItems[index].quantity = drug.reorderQuantity || 1;
      }
    } else if (newItems[index]) {
      newItems[index][field] = Number(value);
    }
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.some((item) => !item.drugId || item.quantity <= 0)) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await createOrder({
        supplierId: Number(supplierId),
        expectedDeliveryDate,
        notes,
        items: items.filter((item) => item.drugId > 0),
      });

      if (result.success) {
        setIsOpen(false);
        setSupplierId("");
        setExpectedDeliveryDate("");
        setNotes("");
        setItems([{ drugId: 0, quantity: 1, unitPrice: 0 }]);
        router.refresh(); // Refresh the page to show the new order
      }
    } catch (error) {
      console.error("Error creating order:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSupplier = suppliers.find((s) => s.id === Number(supplierId));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Create Purchase Order
          </DialogTitle>
          <DialogDescription>
            Create a new purchase order for inventory replenishment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                      {supplier.deliveryDays && (
                        <span className="text-gray-500 ml-2">
                          ({supplier.deliveryDays} days delivery)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
              <Input
                id="expectedDeliveryDate"
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Order Items *</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded-lg"
                >
                  <div className="md:col-span-2">
                    <Label htmlFor={`drug-${index}`}>Drug</Label>
                    <Select
                      value={item.drugId.toString()}
                      onValueChange={(value) =>
                        handleItemChange(index, "drugId", value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select drug" />
                      </SelectTrigger>
                      <SelectContent>
                        {drugs.map((drug) => (
                          <SelectItem key={drug.id} value={drug.id.toString()}>
                            {drug.name} ({drug.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                    <Input
                      id={`quantity-${index}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor={`unitPrice-${index}`}>Unit Price ($)</Label>
                    <Input
                      id={`unitPrice-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleItemChange(index, "unitPrice", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <div className="flex-1">
                      <Label>Total</Label>
                      <div className="flex items-center h-9 px-3 border rounded-md bg-gray-50">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </div>
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-2 h-9 w-9 p-0"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Badge variant="secondary" className="text-lg p-2">
                Total: ${calculateTotal().toFixed(2)}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}