// Get status color based on recommendation
export function getStatusColor(recommendation: string): 'red' | 'yellow' | 'green' {
  if (recommendation.includes('URGENT') || recommendation.includes('Critical')) {
    return 'red'
  } else if (recommendation.includes('Warning')) {
    return 'yellow'
  } else {
    return 'green'
  }
}

// Get status badge variant
export function getStatusVariant(recommendation: string): 'destructive' | 'secondary' | 'default' {
  const color = getStatusColor(recommendation)
  switch (color) {
    case 'red':
      return 'destructive'
    case 'yellow':
      return 'secondary'
    case 'green':
      return 'default'
    default:
      return 'default'
  }
}