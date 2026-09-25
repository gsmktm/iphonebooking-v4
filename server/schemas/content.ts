import { z } from 'zod';

export const contentFields = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(300),
  published: z.boolean(),
  blocks: z
    .array(
      z.object({
        type: z.enum(['hero', 'text', 'faq', 'cta']),
        title: z.string().max(200),
        body: z.string().max(5000),
        href: z
          .string()
          .max(500)
          .regex(/^\/(?!\/)/)
          .optional(),
      }),
    )
    .max(30),
});
export const createContentSchema = contentFields.extend({
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
});
export const updateContentSchema = contentFields.extend({
  expectedUpdatedAt: z.string().datetime().optional(),
});
