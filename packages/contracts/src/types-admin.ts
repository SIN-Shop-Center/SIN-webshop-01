import { z } from 'zod';

export const SupplierSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: z.string().min(1),
  country: z.string().length(2),
  onboardingStatus: z.enum(['new', 'shortlisted', 'applied', 'awaiting_access', 'connected', 'rejected']).default('new'),
  complianceState: z.enum(['unchecked', 'pending', 'approved', 'blocked', 'rejected']).default('unchecked'),
  hasSecret: z.boolean().default(false),
});

export const SupplierOnboardingRunSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  status: z.enum(['queued', 'running', 'awaiting_human', 'succeeded', 'failed', 'cancelled']),
  executionMode: z.enum(['api', 'browser', 'hybrid']),
  skillId: z.string().nullable().optional(),
  dryRun: z.boolean().default(false),
  startedAt: z.string().datetime().nullable().optional(),
  finishedAt: z.string().datetime().nullable().optional(),
  lastError: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const SupplierOnboardingStepSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  supplierId: z.string().uuid(),
  stepOrder: z.number().int().nonnegative(),
  stepType: z.string().min(1),
  status: z.enum(['queued', 'running', 'awaiting_human', 'succeeded', 'failed', 'cancelled']),
  attemptCount: z.number().int().nonnegative().default(0),
  artifactUrls: z.array(z.string()).default([]),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  finishedAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const SupplierCredentialRefSchema = z.object({
  supplierId: z.string().uuid(),
  provider: z.string().min(1),
  username: z.string().nullable().optional(),
  hasSecret: z.boolean().default(false),
  lastRotatedAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
});

export const ProductSupplierMappingSchema = z.object({
  productId: z.string().uuid(),
  supplierId: z.string().uuid(),
  priority: z.number().int().default(100),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
  supplierSku: z.string().nullable().optional(),
  costPrice: z.number().nullable().optional(),
  leadTimeDays: z.number().int().nullable().optional(),
});

export const SupplierCatalogProductSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  externalProductId: z.string().nullable().optional(),
  supplierSku: z.string().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  currency: z.string().length(3).default('EUR'),
  price: z.number().nullable().optional(),
  compareAtPrice: z.number().nullable().optional(),
  minimumOrderQuantity: z.number().nullable().optional(),
  stockHint: z.number().int().nullable().optional(),
  leadTimeDays: z.number().int().nullable().optional(),
  status: z.enum(['new', 'reviewing', 'approved', 'imported', 'rejected', 'archived']).default('new'),
  reviewNote: z.string().nullable().optional(),
  aiScore: z.number().nullable().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
  importedProductId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CRMTaskSchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum(['supplier', 'customer', 'ticket', 'order', 'channel']),
  entityId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(['open', 'in_progress', 'blocked', 'done', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  ownerId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  source: z.string().min(1),
  metadata: z.record(z.string(), z.any()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CRMActivitySchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum(['supplier', 'customer', 'ticket', 'order', 'channel']),
  entityId: z.string().min(1),
  activityType: z.string().min(1),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  actorType: z.string().min(1),
  actorId: z.string().uuid().nullable().optional(),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.any()).default({}),
  createdAt: z.string().datetime(),
});

export type Supplier = z.infer<typeof SupplierSchema>;
export type SupplierOnboardingRun = z.infer<typeof SupplierOnboardingRunSchema>;
export type SupplierOnboardingStep = z.infer<typeof SupplierOnboardingStepSchema>;
export type SupplierCredentialRef = z.infer<typeof SupplierCredentialRefSchema>;
export type ProductSupplierMapping = z.infer<typeof ProductSupplierMappingSchema>;
export type SupplierCatalogProduct = z.infer<typeof SupplierCatalogProductSchema>;
export type CRMTask = z.infer<typeof CRMTaskSchema>;
export type CRMActivity = z.infer<typeof CRMActivitySchema>;
