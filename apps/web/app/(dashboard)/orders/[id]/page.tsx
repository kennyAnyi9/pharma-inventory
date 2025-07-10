import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Package, User, Calendar, Truck, FileText } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  getOrderById,
  getOrderHistory,
  updateOrderStatus,
} from "@/features/orders/actions/order-actions";
import { OrderStatusActions } from "@/features/orders/components/order-status-actions";

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  ordered: "bg-purple-100 text-purple-800",
  delivered: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const orderId = parseInt(params.id);
  if (isNaN(orderId)) {
    notFound();
  }

  const [order, history] = await Promise.all([
    getOrderById(orderId),
    getOrderHistory(orderId),
  ]);

  if (!order) {
    notFound();
  }

  const totalAmount = parseFloat(order.totalAmount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/orders">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{order.orderNumber}</h1>
          <p className="text-gray-600">Purchase Order Details</p>
        </div>
        <Badge
          variant="secondary"
          className={`${statusColors[order.status as keyof typeof statusColors]} text-lg px-3 py-1`}
        >
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Supplier</div>
                  <div className="text-lg">{order.supplierName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Order Date</div>
                  <div className="text-lg">
                    {format(new Date(order.orderDate), "MMMM dd, yyyy")}
                  </div>
                </div>
                {order.expectedDeliveryDate && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      Expected Delivery
                    </div>
                    <div className="text-lg">
                      {format(new Date(order.expectedDeliveryDate), "MMMM dd, yyyy")}
                    </div>
                  </div>
                )}
                {order.actualDeliveryDate && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      Actual Delivery
                    </div>
                    <div className="text-lg text-green-600">
                      {format(new Date(order.actualDeliveryDate), "MMMM dd, yyyy")}
                    </div>
                  </div>
                )}
              </div>

              {order.notes && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">Notes</div>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    {order.notes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Items
              </CardTitle>
              <CardDescription>
                {order.items.length} item{order.items.length !== 1 ? "s" : ""} in this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug</TableHead>
                    <TableHead className="text-right">Qty Ordered</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Qty Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.drugName}</div>
                          <div className="text-sm text-gray-500">per {item.unit}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        ${parseFloat(item.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${parseFloat(item.totalPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            item.quantityReceived >= item.quantity
                              ? "default"
                              : item.quantityReceived > 0
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {item.quantityReceived} / {item.quantity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Actions */}
          <OrderStatusActions order={order} />

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.map((event, index) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          index === 0 ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      />
                      {index < history.length - 1 && (
                        <div className="w-px h-8 bg-gray-300 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {event.fromStatus
                          ? `Changed from ${event.fromStatus} to ${event.toStatus}`
                          : `Status set to ${event.toStatus}`}
                      </div>
                      {event.notes && (
                        <div className="text-xs text-gray-600 mt-1">{event.notes}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(event.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                        {event.changedBy && ` by ${event.changedBy}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Order Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.createdBy && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Created by:</span>
                  <span className="text-sm font-medium">{order.createdBy}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Created:</span>
                <span className="text-sm">
                  {format(new Date(order.createdAt), "MMM dd, yyyy")}
                </span>
              </div>
              {order.approvedBy && order.approvedAt && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Approved by:</span>
                    <span className="text-sm font-medium">{order.approvedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Approved:</span>
                    <span className="text-sm">
                      {format(new Date(order.approvedAt), "MMM dd, yyyy")}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Last updated:</span>
                <span className="text-sm">
                  {format(new Date(order.updatedAt), "MMM dd, yyyy")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}