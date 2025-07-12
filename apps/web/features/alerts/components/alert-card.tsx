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
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Bell, CheckCircle, Clock, XCircle } from "lucide-react";
import { useState } from "react";
import {
  acknowledgeAlert,
  dismissAlert,
  markAlertAsRead,
} from "../actions/alert-actions";
import { CreateOrderFromAlertButton } from "./create-order-from-alert-button";

export interface AlertCardProps {
  alert: {
    id: number;
    drugId: number;
    drugName: string;
    type: string;
    severity: string;
    status: string;
    title: string;
    message: string;
    threshold: number | null;
    currentValue: number | null;
    recommendedAction: string | null;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
    acknowledgedAt?: Date | null;
    acknowledgedBy?: string | null;
    resolvedAt?: Date | null;
  };
  onUpdate?: () => void;
}

const severityColors = {
  low: "bg-blue-100 text-blue-800 border-blue-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const statusColors = {
  active: "bg-red-100 text-red-800",
  acknowledged: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
};

const typeIcons = {
  low_stock: AlertTriangle,
  predicted_stockout: Clock,
  overstock: CheckCircle,
  expiry_warning: Bell,
};

export function AlertCard({ alert, onUpdate }: AlertCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const Icon = typeIcons[alert.type as keyof typeof typeIcons] || AlertTriangle;

  const handleAcknowledge = async () => {
    setIsLoading(true);
    try {
      await acknowledgeAlert({ alertId: alert.id });
      onUpdate?.();
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    setIsLoading(true);
    try {
      await dismissAlert({ alertId: alert.id });
      onUpdate?.();
    } catch (error) {
      console.error("Error dismissing alert:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!alert.isRead) {
      await markAlertAsRead(alert.id);
      onUpdate?.();
    }
  };

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${
        !alert.isRead ? "border-l-4 border-l-blue-500" : ""
      }`}
      onClick={handleMarkAsRead}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg ${severityColors[alert.severity as keyof typeof severityColors]}`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-lg">{alert.title}</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                {alert.drugName} •{" "}
                {formatDistanceToNow(new Date(alert.createdAt), {
                  addSuffix: true,
                })}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge
              variant="secondary"
              className={
                statusColors[alert.status as keyof typeof statusColors]
              }
            >
              {alert.status}
            </Badge>
            <Badge
              variant="outline"
              className={
                severityColors[alert.severity as keyof typeof severityColors]
              }
            >
              {alert.severity}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700">{alert.message}</p>

        {alert.threshold && alert.currentValue !== null && (
          <div className="flex justify-between text-sm bg-gray-50 p-3 rounded-lg">
            <span>
              Current Value: <strong>{alert.currentValue}</strong>
            </span>
            <span>
              Threshold: <strong>{alert.threshold}</strong>
            </span>
          </div>
        )}

        {alert.recommendedAction && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-1">
              Recommended Action:
            </p>
            <p className="text-sm text-blue-700">{alert.recommendedAction}</p>
          </div>
        )}

        {alert.status === "active" && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcknowledge}
              disabled={isLoading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Acknowledge
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              disabled={isLoading}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Dismiss
            </Button>
            <CreateOrderFromAlertButton alertId={alert.id} disabled={isLoading} />
          </div>
        )}

        {alert.status === "acknowledged" && alert.acknowledgedAt && (
          <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
            Acknowledged{" "}
            {formatDistanceToNow(new Date(alert.acknowledgedAt), {
              addSuffix: true,
            })}
            {alert.acknowledgedBy && ` by ${alert.acknowledgedBy}`}
          </div>
        )}

        {alert.status === "resolved" && alert.resolvedAt && (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
            Resolved{" "}
            {formatDistanceToNow(new Date(alert.resolvedAt), {
              addSuffix: true,
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
