import { z } from 'zod';

export const homeSectionKeys = [
  'spotlights',
  'finder',
  'saved',
  'iphones',
  'ecosystem',
  'why',
  'trade-in',
  'repair',
  'network',
  'intelligence',
  'journey',
  'reviews',
  'news',
  'final',
] as const;

export const contentFields = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(300),
  published: z.boolean(),
  blocks: z
    .array(
      z
        .object({
          type: z.enum(['hero', 'text', 'faq', 'cta', 'section']),
          key: z.enum(homeSectionKeys).optional(),
          enabled: z.boolean().optional(),
          title: z.string().max(200),
          body: z.string().max(5000),
          href: z
            .string()
            .max(500)
            .regex(/^\/(?!\/)/)
            .refine(
              (value) => !/[\\\u0000-\u001f\u007f]/.test(value),
              'Use an internal path without backslashes or control characters.',
            )
            .optional(),
        })
        .refine((block) => block.type !== 'section' || Boolean(block.key), {
          path: ['key'],
          message: 'Choose a homepage section.',
        })
        .refine((block) => block.type === 'section' || block.enabled === undefined, {
          path: ['enabled'],
          message: 'Visibility applies to homepage sections only.',
        }),
    )
    .max(30)
    .superRefine((blocks, context) => {
      const keys = new Set<string>();
      blocks.forEach((block, index) => {
        if (block.type !== 'section' || !block.key) return;
        if (keys.has(block.key))
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, 'key'],
            message: 'Only one block is allowed for each homepage section.',
          });
        keys.add(block.key);
      });
    }),
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
