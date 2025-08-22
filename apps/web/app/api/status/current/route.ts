import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { serviceStatus, serviceConfig } from '@workspace/database'
import { eq, desc, sql, and, gte } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get current status for each service (most recent check)
    const currentStatuses = await db
      .select({
        serviceName: serviceConfig.serviceName,
        description: serviceConfig.description,
        category: serviceConfig.category,
        status: serviceStatus.status,
        responseTime: serviceStatus.responseTime,
        statusCode: serviceStatus.statusCode,
        errorMessage: serviceStatus.errorMessage,
        checkedAt: serviceStatus.checkedAt,
      })
      .from(serviceConfig)
      .leftJoin(
        serviceStatus,
        and(
          eq(serviceConfig.serviceName, serviceStatus.serviceName),
          eq(
            serviceStatus.checkedAt,
            sql`(SELECT MAX(checked_at) FROM service_status WHERE service_name = ${serviceConfig.serviceName})`
          )
        )
      )
      .where(eq(serviceConfig.isActive, true))
      .orderBy(serviceConfig.serviceName)

    // Calculate uptime for last 24 hours for each service
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const servicesWithUptime = await Promise.all(
      currentStatuses.map(async (service) => {
        // Get all checks in the last 24 hours
        const recentChecks = await db
          .select({
            status: serviceStatus.status,
            checkedAt: serviceStatus.checkedAt,
          })
          .from(serviceStatus)
          .where(
            and(
              eq(serviceStatus.serviceName, service.serviceName),
              gte(serviceStatus.checkedAt, twentyFourHoursAgo)
            )
          )
          .orderBy(desc(serviceStatus.checkedAt))

        // Calculate uptime percentage
        const totalChecks = recentChecks.length
        const upChecks = recentChecks.filter(check => check.status === 'up').length
        const uptime = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 0

        // Get average response time for the last 10 checks
        const recentResponseTimes = await db
          .select({
            responseTime: serviceStatus.responseTime,
          })
          .from(serviceStatus)
          .where(
            and(
              eq(serviceStatus.serviceName, service.serviceName),
              sql`${serviceStatus.responseTime} IS NOT NULL`
            )
          )
          .orderBy(desc(serviceStatus.checkedAt))
          .limit(10)

        const avgResponseTime = recentResponseTimes.length > 0
          ? Math.round(recentResponseTimes.reduce((sum, check) => sum + (check.responseTime || 0), 0) / recentResponseTimes.length)
          : null

        return {
          ...service,
          uptime: Math.round(uptime * 100) / 100, // Round to 2 decimal places
          totalChecks,
          avgResponseTime,
          lastChecked: service.checkedAt,
        }
      })
    )

    // Overall system status
    const allUp = servicesWithUptime.every(s => s.status === 'up')
    const anyDown = servicesWithUptime.some(s => s.status === 'down')
    const overallStatus = allUp ? 'operational' : anyDown ? 'down' : 'degraded'
    
    const totalServices = servicesWithUptime.length
    const upServices = servicesWithUptime.filter(s => s.status === 'up').length
    const downServices = servicesWithUptime.filter(s => s.status === 'down').length
    const degradedServices = servicesWithUptime.filter(s => s.status === 'degraded').length

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overallStatus,
      summary: {
        total: totalServices,
        up: upServices,
        down: downServices,
        degraded: degradedServices,
      },
      services: servicesWithUptime,
    })

  } catch (error) {
    console.error('❌ Failed to get current status:', error)
    return NextResponse.json(
      {
        error: 'Failed to get current status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}