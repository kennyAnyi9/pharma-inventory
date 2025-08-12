/**
 * Utility functions for consistent reorder level logic across the application
 */

export interface ReorderLevelData {
  intelligentReorderLevel?: number | null
  calculatedReorderLevel?: number | null
  reorderLevel?: number | null
}

/**
 * Get the effective reorder level using the unified fallback strategy
 * Priority: intelligentReorderLevel → calculatedReorderLevel → reorderLevel → 100 (default)
 */
export function getEffectiveReorderLevel(data: ReorderLevelData): number {
  return data.intelligentReorderLevel || 
         data.calculatedReorderLevel || 
         data.reorderLevel || 
         100
}

/**
 * Determine if the reorder level is ML-optimized
 */
export function isMLOptimizedReorderLevel(data: ReorderLevelData): boolean {
  return !!(data.intelligentReorderLevel || data.calculatedReorderLevel)
}

/**
 * Get the source type of the effective reorder level
 */
export function getReorderLevelSource(data: ReorderLevelData): 'intelligent' | 'calculated' | 'manual' | 'default' {
  if (data.intelligentReorderLevel) return 'intelligent'
  if (data.calculatedReorderLevel) return 'calculated'  
  if (data.reorderLevel) return 'manual'
  return 'default'
}

/**
 * Calculate stock status based on current stock and effective reorder level
 */
export function calculateStockStatus(currentStock: number, effectiveReorderLevel: number): 'critical' | 'low' | 'normal' | 'good' {
  if (currentStock === 0) return 'critical'
  if (currentStock <= effectiveReorderLevel * 0.5) return 'critical'
  if (currentStock <= effectiveReorderLevel) return 'low'
  if (currentStock <= effectiveReorderLevel * 2) return 'normal'
  return 'good'
}

/**
 * Get reorder level variance between different types
 */
export function getReorderLevelVariance(data: ReorderLevelData): {
  calculatedVsManual: number | null
  intelligentVsCalculated: number | null
  intelligentVsManual: number | null
} {
  return {
    calculatedVsManual: data.calculatedReorderLevel && data.reorderLevel 
      ? data.calculatedReorderLevel - data.reorderLevel 
      : null,
    intelligentVsCalculated: data.intelligentReorderLevel && data.calculatedReorderLevel
      ? data.intelligentReorderLevel - data.calculatedReorderLevel
      : null,
    intelligentVsManual: data.intelligentReorderLevel && data.reorderLevel
      ? data.intelligentReorderLevel - data.reorderLevel
      : null,
  }
}