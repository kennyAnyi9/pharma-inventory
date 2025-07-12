import { pgTable, serial, integer, varchar, timestamp, boolean, text, decimal, index } from 'drizzle-orm/pg-core'
import { drugs } from './drugs'
import { alerts } from './alerts'

export const orderStatusEnum = ['draft', 'pending', 'approved', 'ordered', 'delivered', 'completed', 'cancelled'] as const
export const supplierStatusEnum = ['active', 'inactive', 'blocked'] as const

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  paymentTerms: varchar('payment_terms', { length: 100 }), // e.g., "Net 30", "COD"
  deliveryDays: integer('delivery_days').default(7), // Expected delivery time
  rating: decimal('rating', { precision: 3, scale: 2 }), // 0.00 to 5.00
  status: varchar('status', { length: 20 }).notNull().default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  supplierId: integer('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'restrict' }),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  orderDate: timestamp('order_date').notNull().defaultNow(),
  expectedDeliveryDate: timestamp('expected_delivery_date'),
  actualDeliveryDate: timestamp('actual_delivery_date'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).default('0'),
  notes: text('notes'),
  createdBy: varchar('created_by', { length: 100 }), // Will be user ID later
  approvedBy: varchar('approved_by', { length: 100 }),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    supplierIdx: index('order_supplier_idx').on(table.supplierId),
    statusIdx: index('order_status_idx').on(table.status),
    orderDateIdx: index('order_date_idx').on(table.orderDate),
    orderNumberIdx: index('order_number_idx').on(table.orderNumber),
  }
})

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  drugId: integer('drug_id')
    .notNull()
    .references(() => drugs.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
  quantityReceived: integer('quantity_received').default(0),
  expiryDate: timestamp('expiry_date'),
  batchNumber: varchar('batch_number', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    orderDrugIdx: index('order_item_order_drug_idx').on(table.orderId, table.drugId),
  }
})

// Link orders to alerts that triggered them
export const orderAlerts = pgTable('order_alerts', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  alertId: integer('alert_id')
    .notNull()
    .references(() => alerts.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    orderAlertIdx: index('order_alert_idx').on(table.orderId, table.alertId),
  }
})

// Track order status changes
export const orderHistory = pgTable('order_history', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  fromStatus: varchar('from_status', { length: 20 }),
  toStatus: varchar('to_status', { length: 20 }).notNull(),
  notes: text('notes'),
  changedBy: varchar('changed_by', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    orderHistoryIdx: index('order_history_order_idx').on(table.orderId),
    statusChangeIdx: index('order_history_status_idx').on(table.toStatus),
  }
})

export type Supplier = typeof suppliers.$inferSelect
export type NewSupplier = typeof suppliers.$inferInsert
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type OrderItem = typeof orderItems.$inferSelect
export type NewOrderItem = typeof orderItems.$inferInsert
export type OrderAlert = typeof orderAlerts.$inferSelect
export type NewOrderAlert = typeof orderAlerts.$inferInsert
export type OrderHistory = typeof orderHistory.$inferSelect
export type NewOrderHistory = typeof orderHistory.$inferInsert

export type OrderStatus = typeof orderStatusEnum[number]
export type SupplierStatus = typeof supplierStatusEnum[number]