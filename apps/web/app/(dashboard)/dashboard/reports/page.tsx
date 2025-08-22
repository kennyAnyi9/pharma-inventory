"use client";

import { MLHealthSection } from "@/components/ml-health-section";
import { MLPerformanceTestSection } from "@/components/ml-performance-test-section";
import { MLEvaluationSection } from "@/components/ml-evaluation-section";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle,
  Download,
  Package,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface AnalyticsReport {
  reportDate: string;
  timestamp: string;
  mlServiceHealth: {
    status: string;
    message: string;
    healthCheckResponseTime: number;
    predictionResponseTime: number;
    predictionCount: number;
    lastChecked: string;
    serviceUrl: string;
  };
  dailyMovements: {
    summary: {
      totalDrugsWithMovements: number;
      totalReceived: number;
      totalUsed: number;
      averageUsage: number;
      drugsWithHighUsage: number;
      drugsReceived: number;
    };
    movements: Array<{
      drugId: number;
      drugName: string;
      unit: string;
      quantityReceived: number;
      quantityUsed: number;
      closingStock: number;
    }>;
  };
  mlPerformance: {
    totalCalculations: number;
    mlSuccessRate: number;
    mlCalculations: number;
    fallbackCalculations: number;
  };
  stockAnalysis: {
    summary: {
      totalDrugs: number;
      critical: number;
      low: number;
      normal: number;
      good: number;
    };
    criticalDrugs: Array<{
      drugName: string;
      currentStock: number;
      effectiveReorderLevel: number;
      unit: string;
    }>;
  };
  summary: {
    systemHealth: string;
    keyMetrics: {
      mlServiceStatus: string;
      totalDailyMovements: number;
      criticalStockItems: number;
      mlSuccessRate: number;
    };
    alerts: string[];
    recommendations: string[];
  };
}

export default function ReportsPage() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]!
  );
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (date: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/daily-analytics?date=${date}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.status}`);
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
      console.error("Report fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate]);

  const downloadReport = () => {
    if (!report) return;

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pharmacy-report-${report.reportDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-success/20 text-success border border-success/30";
      case "error":
        return "bg-critical/20 text-critical border border-critical/30";
      case "warning":
        return "bg-warning/20 text-warning border border-warning/30";
      default:
        return "bg-muted text-muted-foreground border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4" />;
      case "error":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-lg">
            Generating comprehensive report...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Error loading report: {error}</span>
            </div>
            <Button onClick={() => fetchReport(selectedDate)} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Analytics Report</h1>
          <p className="text-muted-foreground">
            Comprehensive inventory and ML system performance analysis
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button onClick={() => fetchReport(selectedDate)} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={downloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Executive Summary
          </CardTitle>
          <CardDescription>
            Report generated on {new Date(report.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/10">
              <div className="text-2xl font-bold text-primary">
                {report.summary.keyMetrics.mlSuccessRate}%
              </div>
              <div className="text-sm text-muted-foreground">
                ML Success Rate
              </div>
            </div>
            <div className="text-center p-4 bg-success/5 rounded-lg border border-success/10">
              <div className="text-2xl font-bold text-success">
                {report.summary.keyMetrics.totalDailyMovements}
              </div>
              <div className="text-sm text-muted-foreground">
                Daily Movements
              </div>
            </div>
            <div className="text-center p-4 bg-critical/5 rounded-lg border border-critical/10">
              <div className="text-2xl font-bold text-critical">
                {report.summary.keyMetrics.criticalStockItems}
              </div>
              <div className="text-sm text-muted-foreground">
                Critical Stock Items
              </div>
            </div>
            <div className="text-center p-4 bg-muted/5 rounded-lg border">
              <Badge className={getStatusColor(report.summary.systemHealth)}>
                {getStatusIcon(report.summary.systemHealth)}
                <span className="ml-1">{report.summary.systemHealth}</span>
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">
                System Status
              </div>
            </div>
          </div>

          {/* Alerts */}
          {report.summary.alerts.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-critical mb-2">⚠️ Alerts</h4>
              <div className="space-y-1">
                {report.summary.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className="text-sm bg-critical/10 text-critical p-3 rounded-lg border border-critical/20"
                  >
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.summary.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold text-info mb-2">
                💡 Recommendations
              </h4>
              <div className="space-y-1">
                {report.summary.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="text-sm bg-info/10 text-info p-3 rounded-lg border border-info/20"
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ML Health Section */}
      <MLHealthSection className="mb-6" />

      {/* ML Performance Test Section */}
      <MLPerformanceTestSection className="mb-6" />

      {/* ML Evaluation Section */}
      <MLEvaluationSection className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ML Service Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              ML Service Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Service Status</span>
              <Badge className={getStatusColor(report.mlServiceHealth.status)}>
                {getStatusIcon(report.mlServiceHealth.status)}
                <span className="ml-1">{report.mlServiceHealth.status}</span>
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Health Check Response</span>
              <span className="text-sm">
                {report.mlServiceHealth.healthCheckResponseTime}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Prediction Response</span>
              <span className="text-sm">
                {report.mlServiceHealth.predictionResponseTime}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Active Models</span>
              <span className="text-sm">
                {report.mlServiceHealth.predictionCount} drugs
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Service URL: {report.mlServiceHealth.serviceUrl}
            </div>
          </CardContent>
        </Card>

        {/* Stock Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-critical/10 border border-critical/20 rounded-lg">
                <div className="text-2xl font-bold text-critical">
                  {report.stockAnalysis.summary.critical}
                </div>
                <div className="text-sm text-muted-foreground">Critical</div>
              </div>
              <div className="text-center p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="text-2xl font-bold text-warning">
                  {report.stockAnalysis.summary.low}
                </div>
                <div className="text-sm text-muted-foreground">Low Stock</div>
              </div>
              <div className="text-center p-4 bg-info/10 border border-info/20 rounded-lg">
                <div className="text-2xl font-bold text-info">
                  {report.stockAnalysis.summary.normal}
                </div>
                <div className="text-sm text-muted-foreground">Normal</div>
              </div>
              <div className="text-center p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="text-2xl font-bold text-success">
                  {report.stockAnalysis.summary.good}
                </div>
                <div className="text-sm text-muted-foreground">
                  Well Stocked
                </div>
              </div>
            </div>

            {report.stockAnalysis.criticalDrugs.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-critical mb-3">
                  Critical Stock Items
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {report.stockAnalysis.criticalDrugs.map((drug, index) => (
                    <div
                      key={index}
                      className="text-sm flex justify-between bg-critical/5 p-3 rounded-lg border border-critical/10"
                    >
                      <span className="font-medium">{drug.drugName}</span>
                      <span className="text-critical font-semibold">
                        {drug.currentStock} {drug.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Movements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Daily Movements Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="text-xl font-bold text-success">
                  {report.dailyMovements.summary.totalReceived}
                </div>
                <div className="text-sm text-muted-foreground">
                  Units Received
                </div>
              </div>
              <div className="text-center p-4 bg-info/10 border border-info/20 rounded-lg">
                <div className="text-xl font-bold text-info">
                  {report.dailyMovements.summary.totalUsed}
                </div>
                <div className="text-sm text-muted-foreground">Units Used</div>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <span>Drugs with Activity</span>
              <span>
                {report.dailyMovements.summary.totalDrugsWithMovements}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Average Daily Usage</span>
              <span>
                {report.dailyMovements.summary.averageUsage.toFixed(1)} units
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>High Usage Drugs</span>
              <span>{report.dailyMovements.summary.drugsWithHighUsage}</span>
            </div>
          </CardContent>
        </Card>

        {/* ML Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              ML Calculation Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="text-3xl font-bold text-primary">
                {Math.round(report.mlPerformance.mlSuccessRate)}%
              </div>
              <div className="text-sm text-muted-foreground">
                ML Success Rate
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm p-2 rounded bg-muted/50">
                <span>Total Calculations</span>
                <span className="font-semibold">
                  {report.mlPerformance.totalCalculations}
                </span>
              </div>
              <div className="flex justify-between text-sm p-2 rounded bg-success/5">
                <span>ML Predictions</span>
                <span className="text-success font-semibold">
                  {report.mlPerformance.mlCalculations}
                </span>
              </div>
              <div className="flex justify-between text-sm p-2 rounded bg-warning/5">
                <span>Statistical Fallbacks</span>
                <span className="text-warning font-semibold">
                  {report.mlPerformance.fallbackCalculations}
                </span>
              </div>
            </div>

            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${report.mlPerformance.mlSuccessRate}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements Detail */}
      {report.dailyMovements.movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Inventory Movements
            </CardTitle>
            <CardDescription>
              Detailed view of today's stock movements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Drug</th>
                    <th className="text-right p-2">Received</th>
                    <th className="text-right p-2">Used</th>
                    <th className="text-right p-2">Current Stock</th>
                    <th className="text-left p-2">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {report.dailyMovements.movements.map((movement, index) => (
                    <tr
                      key={index}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3 font-medium">{movement.drugName}</td>
                      <td className="p-3 text-right text-success font-semibold">
                        {movement.quantityReceived > 0
                          ? `+${movement.quantityReceived}`
                          : "-"}
                      </td>
                      <td className="p-3 text-right text-critical font-semibold">
                        {movement.quantityUsed > 0
                          ? `-${movement.quantityUsed}`
                          : "-"}
                      </td>
                      <td className="p-3 text-right font-bold">
                        {movement.closingStock}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {movement.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Report Date: {report.reportDate}</span>
            <span>
              Generated: {new Date(report.timestamp).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
