import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users.js';
import { stores } from './stores.js';
import { products } from './products.js';

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  customerId: uuid('customer_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  totalAmount: integer('total_amount').notNull(), // в копейках/центах
  deliveryAddress: text('delivery_address'),
  contactPhone: varchar('contact_phone', { length: 50 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).default('card').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: varchar('product_name', { length: 255 }).notNull(),
  unitPrice: integer('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
  totalPrice: integer('total_price').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const insertOrderSchema = createInsertSchema(orders);
export const selectOrderSchema = createSelectSchema(orders);
export const insertOrderItemSchema = createInsertSchema(orderItems);
export const selectOrderItemSchema = createSelectSchema(orderItems);

export type OrderRecord = typeof orders.$inferSelect;
export type NewOrderRecord = typeof orders.$inferInsert;
export type OrderItemRecord = typeof orderItems.$inferSelect;
export type NewOrderItemRecord = typeof orderItems.$inferInsert;
