"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Bell, X } from "lucide-react";
import Link from "next/link";
import { markAlertAsRead } from "../actions/alert-actions";

export interface AlertNotificationProps {
  alerts: Array<{
    id: number;
    drugName: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
  }>;
  unreadCount: number;
  onUpdate?: () => void;
}

const severityColors = {
  low: "bg-info",
  medium: "bg-warning",
  high: "bg-warning",
  critical: "bg-critical",
};

export function AlertNotification({
  alerts,
  unreadCount,
  onUpdate,
}: AlertNotificationProps) {
  const handleMarkAsRead = async (alertId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    await markAlertAsRead(alertId);
    onUpdate?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <ScrollArea className="h-96">
          {alerts.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>No alerts</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className={`flex-col items-start p-3 cursor-pointer ${
                  !alert.isRead ? "bg-info/10" : ""
                }`}
                asChild
              >
                <Link href="/dashboard/alerts">
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start gap-2 flex-1">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          severityColors[
                            alert.severity as keyof typeof severityColors
                          ]
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {alert.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {alert.drugName}
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          {formatDistanceToNow(new Date(alert.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>

                    {!alert.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleMarkAsRead(alert.id, e)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>

        {alerts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/alerts" className="w-full text-center">
                View all alerts
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
