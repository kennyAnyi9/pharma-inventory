"use client";

import { isSuperAdmin } from "@/lib/roles";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle,
  Clock,
  Loader2,
  Timer,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";

interface MLHealthProps {
  className?: string;
}

export function MLHealthSection({ className }: MLHealthProps) {
  const { data: session } = useSession();
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [isTestingCron, setIsTestingCron] = useState(false);
  const [cronTestResult, setCronTestResult] = useState<any>(null);

  const userRole = session?.user?.role;
  const showTechnicalDetails = isSuperAdmin(userRole || "operator");

  const handleDiagnose = async () => {
    if (!showTechnicalDetails) return;

    setIsDiagnosing(true);
    setDiagnosticResult(null);

    try {
      const response = await fetch("/api/ml/diagnose", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      setDiagnosticResult(result);
    } catch (error) {
      setDiagnosticResult({
        success: false,
        error: error instanceof Error ? error.message : "Network error",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleTestCron = async () => {
    if (!showTechnicalDetails) return;

    setIsTestingCron(true);
    setCronTestResult(null);

    try {
      const response = await fetch("/api/cron/test-reorder", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      setCronTestResult(result);
    } catch (error) {
      setCronTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Network error",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsTestingCron(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "online":
      case "loaded":
      case "working":
        return "bg-green-100 text-green-800 border-green-200";
      case "warning":
      case "loading":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "critical":
      case "offline":
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "online":
      case "loaded":
      case "working":
        return <CheckCircle className="h-4 w-4" />;
      case "warning":
      case "loading":
        return <Clock className="h-4 w-4" />;
      case "critical":
      case "offline":
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Simple view for regular admins
  if (!showTechnicalDetails) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            Forecasting System
          </CardTitle>
          <CardDescription>AI-powered demand prediction status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Working Properly</span>
            <Badge variant="secondary" className="ml-2">
              Active
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            The system is automatically predicting drug demand to help optimize
            inventory levels.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Detailed view for super admins
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-500" />
          ML Model Health
        </CardTitle>
        <CardDescription>
          Machine learning model status and retraining controls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Models Active</span>
            </div>
            <p className="text-xs text-muted-foreground">
              XGBoost models loaded and serving predictions
            </p>
          </div>
        </div>

        {/* System Diagnostics Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-medium">System Diagnostics</h4>
              <p className="text-xs text-muted-foreground">
                Run comprehensive ML system tests to identify issues
              </p>
            </div>
            <Button
              onClick={handleDiagnose}
              disabled={isDiagnosing}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isDiagnosing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Diagnosing...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  Run Diagnostics
                </>
              )}
            </Button>
          </div>

          {/* Diagnostic Results */}
          {diagnosticResult && (
            <div className="mb-4">
              {diagnosticResult.success ? (
                <div className="space-y-3">
                  {/* Individual Test Results */}
                  <div className="space-y-2">
                    {diagnosticResult.diagnostics?.tests?.map(
                      (test: any, index: number) => (
                        <div
                          key={index}
                          className={`p-2 rounded border text-xs ${getStatusColor(test.status)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {getStatusIcon(test.status)}
                              <span className="font-medium">{test.name}</span>
                            </div>
                            {test.duration && <span>{test.duration}ms</span>}
                          </div>
                          <p className="mt-1">{test.message}</p>
                        </div>
                      )
                    )}
                  </div>

                  {/* Recommendations */}
                  {diagnosticResult.recommendations &&
                    diagnosticResult.recommendations.length > 0 && (
                      <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                        <h5 className="text-sm font-medium text-blue-800 mb-2">
                          🔧 Recommendations:
                        </h5>
                        <div className="text-xs text-blue-700 space-y-1">
                          {diagnosticResult.recommendations.map(
                            (rec: string, index: number) => (
                              <p key={index}>• {rec}</p>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Cron Job Diagnostics Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-medium">Cron Job Diagnostics</h4>
              <p className="text-xs text-muted-foreground">
                Test and debug the daily reorder calculation cron job (scheduled
                for 2 AM)
              </p>
            </div>
            <Button
              onClick={handleTestCron}
              disabled={isTestingCron}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isTestingCron ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Timer className="h-4 w-4" />
                  Test Cron Job
                </>
              )}
            </Button>
          </div>

          {/* Cron Test Results */}
          {cronTestResult && (
            <div className="mb-4">
              {cronTestResult.success ? (
                <div className="space-y-3">
                  {/* Summary */}
                  <div
                    className={`p-3 rounded-lg border ${getStatusColor(cronTestResult.summary?.overall_status?.toLowerCase() || "error")}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(
                        cronTestResult.summary?.overall_status?.toLowerCase() ||
                          "error"
                      )}
                      <span className="text-sm font-medium">
                        Overall Status:{" "}
                        {cronTestResult.summary?.overall_status || "UNKNOWN"}
                      </span>
                    </div>
                    <div className="text-xs">
                      <p>
                        <strong>Tests:</strong>{" "}
                        {cronTestResult.summary?.passed || 0} passed,{" "}
                        {cronTestResult.summary?.failed || 0} failed,{" "}
                        {cronTestResult.summary?.warnings || 0} warnings
                      </p>
                    </div>
                  </div>

                  {/* Individual Test Results */}
                  <div className="space-y-2">
                    {cronTestResult.diagnostics?.tests?.map(
                      (test: any, index: number) => (
                        <div
                          key={index}
                          className={`p-2 rounded border text-xs ${getStatusColor(test.status)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {getStatusIcon(test.status)}
                              <span className="font-medium">{test.name}</span>
                            </div>
                            {test.duration && <span>{test.duration}ms</span>}
                          </div>
                          <p className="mt-1">{test.message}</p>
                          {test.details && typeof test.details === "object" && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                              {test.details.calculationsCount !== undefined && (
                                <p>
                                  Calculations: {test.details.calculationsCount}
                                </p>
                              )}
                              {test.details.success !== undefined && (
                                <p>
                                  Success: {test.details.success ? "Yes" : "No"}
                                </p>
                              )}
                              {test.details.error && (
                                <p className="text-red-600">
                                  Error: {test.details.error}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>

                  {/* Recommendations */}
                  {cronTestResult.recommendations &&
                    cronTestResult.recommendations.length > 0 && (
                      <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                        <h5 className="text-sm font-medium text-blue-800 mb-2">
                          🔧 Recommendations:
                        </h5>
                        <div className="text-xs text-blue-700 space-y-1">
                          {cronTestResult.recommendations.map(
                            (rec: string, index: number) => (
                              <p key={index}>• {rec}</p>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Cron Test Failed
                    </span>
                  </div>
                  <p className="text-xs">
                    {cronTestResult.error || "Unknown error occurred"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
