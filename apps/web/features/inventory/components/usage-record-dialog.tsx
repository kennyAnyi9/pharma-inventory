'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { useToast } from '@workspace/ui/hooks/use-toast'
import { recordUsage } from '../actions/inventory-actions'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
})

interface UsageRecordDialogProps {
  drug: {
    drugId: number
    drugName: string
    unit: string
    currentStock: number
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsageRecordDialog({ drug, open, onOpenChange }: UsageRecordDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 0,
      notes: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.quantity > drug.currentStock) {
      form.setError('quantity', {
        type: 'manual',
        message: `Cannot use more than current stock (${drug.currentStock} ${drug.unit})`,
      })
      return
    }

    setIsLoading(true)
    try {
      await recordUsage({
        drugId: drug.drugId,
        quantity: values.quantity,
        notes: values.notes,
      })

      toast({
        title: 'Usage recorded',
        description: `Used ${values.quantity} ${drug.unit} of ${drug.drugName}`,
      })

      form.reset()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record usage. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Usage</DialogTitle>
          <DialogDescription>
            Record daily consumption for {drug.drugName}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm">
                Current Stock: <span className="font-medium">{drug.currentStock} {drug.unit}</span>
              </p>
            </div>
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Used</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the quantity in {drug.unit}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Department, patient info..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Usage
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}