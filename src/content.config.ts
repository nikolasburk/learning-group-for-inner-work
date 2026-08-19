import { defineCollection, z } from 'astro:content';
import { qaLoader, rulesLoader, sectionsLoader } from './content/loaders';

const copy = defineCollection({
  loader: sectionsLoader('./src/content/copy.md'),
});

const faq = defineCollection({
  loader: qaLoader('./src/content/faq.md'),
  schema: z.object({
    question: z.string(),
    order: z.number(),
  }),
});

const rules = defineCollection({
  loader: rulesLoader('./src/content/rules.md'),
  schema: z.object({
    title: z.string(),
    text: z.string(),
    order: z.number(),
  }),
});

export const collections = { copy, faq, rules };
