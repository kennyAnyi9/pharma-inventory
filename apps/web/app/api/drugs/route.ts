import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { drugs, inventory, reorderCalculations } from '@workspace/database'
import { eq, and, sql } from 'drizzle-orm'
import { getEffectiveReorderLevel } from '@/lib/reorder-level-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await db
      .select({
        id: drugs.id,
        name: drugs.name,
        unit: drugs.unit,
        category: drugs.category,
        reorderLevel: drugs.reorderLevel,
        calculatedReorderLevel: drugs.calculatedReorderLevel,
        intelligentReorderLevel: reorderCalculations.intelligentReorderLevel,
        currentStock: inventory.closingStock,
      })
      .from(drugs)
      .leftJoin(
        inventory,
        and(
          eq(drugs.id, inventory.drugId),
          eq(
            inventory.date,
            sql`(SELECT MAX(date) FROM inventory WHERE drug_id = ${drugs.id})`
          )
        )
      )
      .leftJoin(
        reorderCalculations,
        and(
          eq(drugs.id, reorderCalculations.drugId),
          eq(
            reorderCalculations.calculationDate,
            sql`(SELECT MAX(calculation_date) FROM reorder_calculations WHERE drug_id = ${drugs.id})`
          )
        )
      )
      .orderBy(drugs.name)

    const formattedResult = result.map(drug => ({
      id: drug.id,
      name: drug.name,
      unit: drug.unit,
      category: drug.category,
      reorderLevel: getEffectiveReorderLevel({
        intelligentReorderLevel: drug.intelligentReorderLevel,
        calculatedReorderLevel: drug.calculatedReorderLevel,
        reorderLevel: drug.reorderLevel
      }),
      currentStock: drug.currentStock || 0,
    }))

    return NextResponse.json(formattedResult)
  } catch (error) {
    console.error('Failed to get drugs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drugs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}