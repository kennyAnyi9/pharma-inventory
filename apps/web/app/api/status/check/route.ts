import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { serviceStatus, serviceConfig } from '@workspace/database'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// Define default services to monitor
const DEFAULT_SERVICES = [
  {
    serviceName: 'Web Application',
    serviceUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}`,
    description: 'Main pharma inventory web application',
    category: 'web'
  },
  {
    serviceName: 'Authentication API',
    serviceUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/signin`,
    description: 'NextAuth authentication service',
    category: 'api'
  },
  {
    serviceName: 'Database Health',
    serviceUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/debug-db`,
    description: 'PostgreSQL database connectivity',
    category: 'database'
  },
  {
    serviceName: 'ML Service Health',
    serviceUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ml/health`,
    description: 'Machine Learning service health check',
    category: 'ml'
  },
  {
    serviceName: 'Drug Management API',
    serviceUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/drugs`,
    description: 'Drug inventory management API',
    category: 'api'
  },
  {
    serviceName: 'Alert System',
    serviceUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cron/daily-alerts`,
    description: 'Automated alert generation system',
    category: 'api'
  }
]

async function checkServiceHealth(url: string, timeout: number = 10000): Promise<{
  status: 'up' | 'down' | 'degraded'
  responseTime: number
  statusCode?: number
  errorMessage?: string
}> {
  const startTime = Date.now()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'PharmaInventory-StatusChecker/1.0',
      }
    })
    
    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime
    
    // Consider different status codes
    if (response.ok || response.status === 401 || response.status === 403) {
      // 401/403 are OK for auth endpoints - means service is responding
      return {
        status: responseTime > 5000 ? 'degraded' : 'up',
        responseTime,
        statusCode: response.status
      }
    } else if (response.status >= 500) {
      return {
        status: 'down',
        responseTime,
        statusCode: response.status,
        errorMessage: `Server error: ${response.status}`
      }
    } else {
      return {
        status: 'degraded',
        responseTime,
        statusCode: response.status,
        errorMessage: `Unexpected status: ${response.status}`
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          status: 'down',
          responseTime,
          errorMessage: `Timeout after ${timeout}ms`
        }
      }
      return {
        status: 'down',
        responseTime,
        errorMessage: error.message
      }
    }
    
    return {
      status: 'down',
      responseTime,
      errorMessage: 'Unknown error occurred'
    }
  }
}

export async function POST() {
  try {
    console.log('🔍 Starting service health checks...')
    
    // Initialize default services if they don't exist
    for (const service of DEFAULT_SERVICES) {
      const existing = await db.select()
        .from(serviceConfig)
        .where(eq(serviceConfig.serviceName, service.serviceName))
        .limit(1)
      
      if (existing.length === 0) {
        await db.insert(serviceConfig).values(service)
        console.log(`✅ Added service config: ${service.serviceName}`)
      }
    }
    
    // Get active services to monitor
    const activeServices = await db.select()
      .from(serviceConfig)
      .where(eq(serviceConfig.isActive, true))
    
    const results = []
    
    // Check each service
    for (const service of activeServices) {
      console.log(`🔍 Checking ${service.serviceName}...`)
      
      const healthCheck = await checkServiceHealth(service.serviceUrl, service.timeout * 1000)
      
      // Save status to database
      await db.insert(serviceStatus).values({
        serviceName: service.serviceName,
        serviceUrl: service.serviceUrl,
        status: healthCheck.status,
        responseTime: healthCheck.responseTime,
        statusCode: healthCheck.statusCode,
        errorMessage: healthCheck.errorMessage,
      })
      
      results.push({
        serviceName: service.serviceName,
        category: service.category,
        description: service.description,
        ...healthCheck,
        checkedAt: new Date().toISOString()
      })
      
      console.log(`${healthCheck.status === 'up' ? '✅' : '❌'} ${service.serviceName}: ${healthCheck.status} (${healthCheck.responseTime}ms)`)
    }
    
    console.log(`🏁 Health check completed. Checked ${results.length} services.`)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checkedServices: results.length,
      results
    })
    
  } catch (error) {
    console.error('❌ Service health check failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Service health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}