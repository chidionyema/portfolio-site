import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const deepDives = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/deep-dives' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    readingTime: z.number().int().positive(),
    iconKey: z.enum(['outbox', 'cqrs', 'circuit', 'vault', 'testing', 'architecture', 'saga']),
    related: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    company: z.string(),
    role: z.string(),
    period: z.string(),
    description: z.string(),
    technologies: z.array(z.string()),
    publishedAt: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  'deep-dives': deepDives,
  'work': work,
};
