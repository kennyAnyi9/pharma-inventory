import {
  generateAlerts,
  getAlertCounts,
  getAlerts,
} from "@/features/alerts/actions/alert-actions";
import { AlertCard } from "@/features/alerts/components/alert-card";
import { AlertStats } from "@/features/alerts/components/alert-stats";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";

// Force dynamic rendering - no caching for real-time alerts
export const dynamic = 'force-dynamic'

export default async function AlertsPage() {
  const [allAlerts, alertCounts] = await Promise.all([
    getAlerts(),
    getAlertCounts(),
  ]);

  const activeAlerts = allAlerts.filter((alert) => alert.status === "active");
  const acknowledgedAlerts = allAlerts.filter(
    (alert) => alert.status === "acknowledged"
  );
  const resolvedAlerts = allAlerts.filter(
    (alert) => alert.status === "resolved"
  );

  async function handleGenerateAlerts() {
    "use server";
    await generateAlerts();
    revalidatePath("/alerts");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-gray-600">
            Monitor and manage inventory alerts and notifications
          </p>
        </div>

        <form action={handleGenerateAlerts}>
          <Button type="submit" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Generate Alerts
          </Button>
        </form>
      </div>

      {/* Stats */}
      <Suspense fallback={<AlertStatsSkeleton />}>
        <AlertStats stats={alertCounts} />
      </Suspense>

      {/* Alert Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Active ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="acknowledged">
            Acknowledged ({acknowledgedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({resolvedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="all">All ({allAlerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <AlertsList alerts={activeAlerts} emptyMessage="No active alerts" />
        </TabsContent>

        <TabsContent value="acknowledged" className="space-y-4">
          <AlertsList
            alerts={acknowledgedAlerts}
            emptyMessage="No acknowledged alerts"
          />
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          <AlertsList
            alerts={resolvedAlerts}
            emptyMessage="No resolved alerts"
          />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <AlertsList alerts={allAlerts} emptyMessage="No alerts found" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AlertsList({
  alerts,
  emptyMessage,
}: {
  alerts: any[];
  emptyMessage: string;
}) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">{emptyMessage}</h3>
        <p className="text-gray-500">Check back later or generate new alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  );
}

function AlertStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
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
