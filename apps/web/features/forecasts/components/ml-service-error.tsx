'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { AlertCircle, RefreshCw, Settings } from 'lucide-react'

export function MLServiceError() {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-900 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          ML Service Unavailable
        </CardTitle>
        <CardDescription className="text-red-700">
          Unable to fetch demand forecasts. The ML service may be offline or misconfigured.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-red-800">
          <p>Possible causes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>ML service is not running on port 8000</li>
            <li>API key is incorrect or missing</li>
            <li>Network connection issues</li>
            <li>Service is overloaded or timing out</li>
          </ul>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('http://localhost:8000/health', '_blank')}
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <Settings className="mr-2 h-4 w-4" />
            Check Service
          </Button>
        </div>
        
        <div className="text-xs text-red-600 bg-red-100 p-3 rounded border">
          <p className="font-medium">For developers:</p>
          <p>Make sure the ML service is running with: <code>cd apps/ml-service && ./run.sh</code></p>
        </div>
      </CardContent>
    </Card>
  )
}