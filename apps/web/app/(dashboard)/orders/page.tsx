import { Suspense } from "react";
import { Package, Plus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  getOrders,
  getOrderStats,
  getSuppliers,
} from "@/features/orders/actions/order-actions";
import { OrderCard } from "@/features/orders/components/order-card";
import { OrderStats } from "@/features/orders/components/order-stats";
import { CreateOrderDialog } from "@/features/orders/components/create-order-dialog";

export default async function OrdersPage() {
  const [allOrders, orderStats, suppliers, drugs] = await Promise.all([
    getOrders(),
    getOrderStats(),
    getSuppliers(),
    // Get drugs for order creation
    getDrugsForOrders(),
  ]);

  const draftOrders = allOrders.filter((order) => order.status === "draft");
  const pendingOrders = allOrders.filter((order) => order.status === "pending");
  const activeOrders = allOrders.filter((order) =>
    ["approved", "ordered"].includes(order.status)
  );
  const deliveredOrders = allOrders.filter((order) => order.status === "delivered");
  const completedOrders = allOrders.filter((order) => order.status === "completed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-gray-600">
            Manage purchase orders and supplier relationships
          </p>
        </div>

        <CreateOrderDialog
          suppliers={suppliers}
          drugs={drugs}
        />
      </div>

      {/* Stats */}
      <Suspense fallback={<OrderStatsSkeleton />}>
        <OrderStats stats={orderStats} />
      </Suspense>

      {/* Order Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="draft" className="gap-2">
            Draft ({draftOrders.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            Pending ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Package className="w-4 h-4" />
            Active ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="delivered">
            Delivered ({deliveredOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedOrders.length})
          </TabsTrigger>
          <TabsTrigger value="all">All ({allOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="draft" className="space-y-4">
          <OrdersList orders={draftOrders} emptyMessage="No draft orders" />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <OrdersList orders={pendingOrders} emptyMessage="No pending orders" />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <OrdersList orders={activeOrders} emptyMessage="No active orders" />
        </TabsContent>

        <TabsContent value="delivered" className="space-y-4">
          <OrdersList orders={deliveredOrders} emptyMessage="No delivered orders" />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <OrdersList orders={completedOrders} emptyMessage="No completed orders" />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <OrdersList orders={allOrders} emptyMessage="No orders found" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrdersList({
  orders,
  emptyMessage,
}: {
  orders: any[];
  emptyMessage: string;
}) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">{emptyMessage}</h3>
        <p className="text-gray-500">Create your first order to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

function OrderStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <Skeleton className="h-8 w-12 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

// Helper function to get drugs for order creation
async function getDrugsForOrders() {
  const { db } = await import("@/lib/db");
  const { drugs } = await import("@workspace/database/schema");

  try {
    const drugsData = await db
      .select({
        id: drugs.id,
        name: drugs.name,
        unit: drugs.unit,
        unitPrice: drugs.unitPrice,
        reorderQuantity: drugs.reorderQuantity,
      })
      .from(drugs)
      .orderBy(drugs.name);

    return drugsData;
  } catch (error) {
    console.error("Error fetching drugs:", error);
    return [];
  }
}