"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  DollarSign,
  FileText,
  AlertTriangle,
} from "lucide-react";

export interface OrderStatsProps {
  stats: {
    draft: number;
    pending: number;
    approved: number;
    ordered: number;
    delivered: number;
    completed: number;
    cancelled: number;
    totalOrders: number;
    totalValue: number;
  };
}

export function OrderStats({ stats }: OrderStatsProps) {
  const statItems = [
    {
      label: "Draft Orders",
      value: stats.draft,
      icon: FileText,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      description: "Orders being prepared",
    },
    {
      label: "Pending Approval",
      value: stats.pending,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Awaiting approval",
    },
    {
      label: "Active Orders",
      value: stats.approved + stats.ordered,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Approved & ordered",
    },
    {
      label: "In Delivery",
      value: stats.delivered,
      icon: Truck,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Out for delivery",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Successfully delivered",
    },
    {
      label: "Total Value",
      value: `$${stats.totalValue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      description: "All time order value",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <CardDescription className="text-xs text-gray-500">
                {item.description}
              </CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}