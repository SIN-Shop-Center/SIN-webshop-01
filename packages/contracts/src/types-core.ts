import { z } from 'zod';

export const OrderSchema = z.object({
  id: z.string().uuid(),
  status: z.string().min(1),
  totalAmount: z.number().nonnegative(),
  currency: z.string().length(3),
  createdAt: z.string().datetime()
});

export const CatalogCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const CatalogProductSchema = z.object({
  id: z.string().min(1),
  sku: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().optional(),
  images: z.array(z.string()).default([]),
  stock: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  categorySlug: z.string().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  reviewCount: z.number().int().nonnegative().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const CatalogProductListSchema = z.object({
  items: z.array(CatalogProductSchema),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});

export const CatalogCategoryListSchema = z.object({
  items: z.array(CatalogCategorySchema),
});

export const AIConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'groq', 'mistral', 'gemini', 'puter']),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2)
});

export const FulfillmentEventSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['started', 'ordered_from_supplier', 'shipped', 'delivered', 'failed']),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  occurredAt: z.string().datetime(),
});

export const PaymentSucceededEventSchema = z.object({
  orderId: z.string().uuid(),
  paymentReference: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  occurredAt: z.string().datetime(),
});

export const ShipmentUpdatedEventSchema = z.object({
  orderId: z.string().uuid(),
  shipmentId: z.string().uuid(),
  status: z.enum(['label_created', 'shipped', 'delivered', 'failed']),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  occurredAt: z.string().datetime(),
});

export const CustomerSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const PromotionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['percentage', 'fixed', 'free_shipping', 'buy_x_get_y']),
  code: z.string().optional(),
  isActive: z.boolean(),
});

export const PageSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  isPublished: z.boolean(),
});

export const BlogPostSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['draft', 'published', 'scheduled']),
  publishedAt: z.string().datetime().optional(),
});

export const SettingSchema = z.object({
  key: z.string().min(1),
  value: z.record(z.any()),
  updatedAt: z.string().datetime().optional(),
});

export type Order = z.infer<typeof OrderSchema>;
export type CatalogCategory = z.infer<typeof CatalogCategorySchema>;
export type CatalogProduct = z.infer<typeof CatalogProductSchema>;
export type CatalogProductList = z.infer<typeof CatalogProductListSchema>;
export type CatalogCategoryList = z.infer<typeof CatalogCategoryListSchema>;
export type AIConfig = z.infer<typeof AIConfigSchema>;
export type FulfillmentEvent = z.infer<typeof FulfillmentEventSchema>;
export type PaymentSucceededEvent = z.infer<typeof PaymentSucceededEventSchema>;
export type ShipmentUpdatedEvent = z.infer<typeof ShipmentUpdatedEventSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type Promotion = z.infer<typeof PromotionSchema>;
export type Page = z.infer<typeof PageSchema>;
export type BlogPost = z.infer<typeof BlogPostSchema>;
export type Setting = z.infer<typeof SettingSchema>;
