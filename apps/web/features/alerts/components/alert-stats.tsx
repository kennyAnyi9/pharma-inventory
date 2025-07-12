"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";

export interface AlertStatsProps {
  stats: {
    active: number;
    acknowledged: number;
    resolved: number;
    total: number;
  };
}

export function AlertStats({ stats }: AlertStatsProps) {
  const statItems = [
    {
      label: "Active Alerts",
      value: stats.active,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      description: "Require immediate attention",
    },
    {
      label: "Acknowledged",
      value: stats.acknowledged,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      description: "Being addressed",
    },
    {
      label: "Resolved",
      value: stats.resolved,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Completed this week",
    },
    {
      label: "Total",
      value: stats.total,
      icon: XCircle,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      description: "All time alerts",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.label}
              </CardTitle>
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
