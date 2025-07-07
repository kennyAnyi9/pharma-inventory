import { getInventoryStatus } from "@/features/inventory/actions/inventory-actions";
import { InventoryTable } from "@/features/inventory/components/inventory-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export default async function InventoryPage() {
  let inventory: Awaited<ReturnType<typeof getInventoryStatus>> = [];
  let counts: Record<string, number> = { critical: 0, low: 0, normal: 0, good: 0 };

  try {
    inventory = await getInventoryStatus();
    
    // Pre-compute counts for better performance
    counts = inventory.reduce((acc, item) => {
      acc[item.stockStatus] = (acc[item.stockStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  } catch (error) {
    console.error('Failed to load inventory data:', error);
    inventory = [];
    counts = { critical: 0, low: 0, normal: 0, good: 0 };
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Inventory Management
        </h2>
        <p className="text-muted-foreground">
          Track stock levels, record usage, and manage drug inventory
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Drugs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {counts.critical || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {counts.low || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Well Stocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {counts.good || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drug Inventory</CardTitle>
          <CardDescription>
            View and manage stock levels for all drugs in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryTable data={inventory} />
        </CardContent>
      </Card>
    </div>
  );
}
