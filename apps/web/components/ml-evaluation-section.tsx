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
  AlertCircle,
  BarChart3,
  CheckCircle,
  Loader2,
  Play,
  Target,
  TrendingUp,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";

interface MLEvaluationProps {
  className?: string;
}

interface EvaluationMetrics {
  rSquared: number;
  rmse: number;
  mae: number;
  totalPredictions: number;
  meetsRSquaredThreshold: boolean;
  meetsRmseThreshold: boolean;
  overallGrade: string;
  categorizedResults: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  lastEvaluation?: string;
}

interface EvaluationResult {
  success: boolean;
  data?: {
    evaluation: EvaluationMetrics;
    summary: {
      meetsTargets: boolean;
      rSquaredTarget: number;
      rmseTarget: number;
      actualRSquared: number;
      actualRMSE: number;
      overallGrade: string;
      recommendations: string[];
    };
  };
  error?: string;
}

export function MLEvaluationSection({ className }: MLEvaluationProps) {
  const { data: session } = useSession();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState<EvaluationMetrics | null>(null);

  const userRole = session?.user?.role;
  const showTechnicalDetails = isSuperAdmin(userRole || "operator");

  const handleRunEvaluation = async () => {
    if (!showTechnicalDetails) return;

    setIsEvaluating(true);
    setEvaluationResult(null);

    try {
      // Use last 7 days for evaluation
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const response = await fetch("/api/ml/evaluation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "evaluate",
          periodStart: startDate.toISOString(),
          periodEnd: endDate.toISOString(),
          algorithm: "xgboost"
        }),
      });

      const result = await response.json();
      setEvaluationResult(result);

      if (result.success && result.data?.evaluation) {
        setCurrentMetrics(result.data.evaluation);
      }
    } catch (error) {
      setEvaluationResult({
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      });
    } finally {
      setIsEvaluating(false);
    }
  };



  const getMetricStatus = (value: number, threshold: number, isRSquared = false) => {
    const meets = isRSquared ? value >= threshold : value < threshold;
    return {
      meets,
      color: meets ? "text-green-600" : "text-red-600",
      icon: meets ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />
    };
  };

  // Simple view for regular admins
  if (!showTechnicalDetails) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Model Performance
          </CardTitle>
          <CardDescription>AI prediction accuracy monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Performance Monitoring Active</span>
            <Badge variant="secondary" className="ml-2">
              Automated
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            The system continuously monitors ML model accuracy and alerts administrators when performance thresholds are not met.
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
          <BarChart3 className="h-5 w-5 text-primary" />
          ML Model Evaluation
        </CardTitle>
        <CardDescription>
          Comprehensive model performance assessment (R² ≥ 0.85, RMSE &lt; 0.10)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target Thresholds */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">R² Target</span>
            </div>
            <div className="text-xl font-bold text-primary">≥ 0.85</div>
            <div className="text-xs text-muted-foreground">Coefficient of Determination</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">RMSE Target</span>
            </div>
            <div className="text-xl font-bold text-primary">&lt; 0.10</div>
            <div className="text-xs text-muted-foreground">Root Mean Square Error</div>
          </div>
        </div>

        {/* Current Metrics */}
        {currentMetrics && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Current Performance</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-3 rounded-lg border ${
                currentMetrics.meetsRSquaredThreshold 
                  ? "bg-green-50 border-green-200" 
                  : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">R² Score</span>
                  {getMetricStatus(currentMetrics.rSquared, 0.85, true).icon}
                </div>
                <div className={`text-xl font-bold ${
                  getMetricStatus(currentMetrics.rSquared, 0.85, true).color
                }`}>
                  {currentMetrics.rSquared.toFixed(3)}
                </div>
              </div>
              
              <div className={`p-3 rounded-lg border ${
                currentMetrics.meetsRmseThreshold 
                  ? "bg-green-50 border-green-200" 
                  : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">RMSE</span>
                  {getMetricStatus(currentMetrics.rmse, 0.10).icon}
                </div>
                <div className={`text-xl font-bold ${
                  getMetricStatus(currentMetrics.rmse, 0.10).color
                }`}>
                  {currentMetrics.rmse.toFixed(3)}
                </div>
              </div>
            </div>



          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            size="sm"
            className="gap-2"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Evaluation
              </>
            )}
          </Button>
        </div>

        {/* Results Display */}
        {evaluationResult && (
          <div className="mt-4">
            {evaluationResult.success && evaluationResult.data ? (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg border ${
                  evaluationResult.data.summary.meetsTargets
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {evaluationResult.data.summary.meetsTargets ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">
                      {evaluationResult.data.summary.meetsTargets 
                        ? "✅ Model meets all performance targets"
                        : "❌ Model performance below targets"}
                    </span>
                  </div>
                </div>

                {/* Recommendations */}
                {evaluationResult.data.summary.recommendations.length > 0 && (
                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                    <h5 className="text-sm font-medium text-blue-800 mb-2">
                      📋 Recommendations:
                    </h5>
                    <div className="text-xs text-blue-700 space-y-1">
                      {evaluationResult.data.summary.recommendations.map(
                        (rec, index) => (
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
                  <span className="text-sm font-medium">Evaluation Failed</span>
                </div>
                <p className="text-xs">
                  {evaluationResult.error || "Unknown error occurred"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Note */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p>
            <strong>Note:</strong> Evaluation compares ML predictions against actual consumption data from the last 7 days.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}