import { defineCollection, z } from 'astro:content';
import { cardsLoader, qaLoader, rulesLoader, sectionsLoader } from './content/loaders';

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

const sessionElements = defineCollection({
  loader: cardsLoader('./src/content/session-elements.md'),
  schema: z.object({
    title: z.string(),
    order: z.number(),
  }),
});

const preparation = defineCollection({
  loader: cardsLoader('./src/content/preparation.md'),
  schema: z.object({
    title: z.string(),
    order: z.number(),
  }),
});

const howItWorks = defineCollection({
  loader: cardsLoader('./src/content/how-it-works.md'),
  schema: z.object({
    title: z.string(),
    order: z.number(),
  }),
});

export const collections = { copy, faq, rules, sessionElements, preparation, howItWorks };
