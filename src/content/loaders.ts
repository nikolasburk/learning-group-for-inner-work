import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Loader } from "astro/loaders";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Splits a markdown file into entries separated by top-level (`# `) headings.
 * The heading text becomes the entry id; everything until the next heading
 * becomes its rendered markdown body.
 */
export function sectionsLoader(fileName: string): Loader {
  return {
    name: "sections-loader",
    load: async ({ config, store, parseData, renderMarkdown, generateDigest, watcher, logger }) => {
      const url = new URL(fileName, config.root);
      const filePath = fileURLToPath(url);

      async function sync() {
        const raw = await readFile(filePath, "utf-8");
        const blocks = raw
          .split(/\n(?=# )/)
          .map((block) => block.trim())
          .filter(Boolean);
        store.clear();
        for (const block of blocks) {
          const match = block.match(/^# (.+)\n([\s\S]*)$/);
          if (!match) {
            logger.warn(`Skipping malformed section in ${fileName}`);
            continue;
          }
          const id = match[1].trim();
          const body = match[2].trim();
          const data = await parseData({ id, data: {} });
          const rendered = await renderMarkdown(body);
          store.set({ id, data, body, rendered, digest: generateDigest(body), filePath: fileName });
        }
      }

      await sync();
      watcher?.add(filePath);
      watcher?.on("change", async (changedPath) => {
        if (changedPath === filePath) {
          logger.info(`Reloading ${fileName}`);
          await sync();
        }
      });
    },
  };
}

/**
 * Splits a markdown file into Q&A entries separated by `## ` headings. The
 * heading text becomes `data.question`; the text until the next heading
 * becomes the rendered answer body. `data.order` follows file position.
 */
export function qaLoader(fileName: string): Loader {
  return {
    name: "qa-loader",
    load: async ({ config, store, parseData, renderMarkdown, generateDigest, watcher, logger }) => {
      const url = new URL(fileName, config.root);
      const filePath = fileURLToPath(url);

      async function sync() {
        const raw = await readFile(filePath, "utf-8");
        const blocks = raw
          .split(/\n(?=## )/)
          .map((block) => block.trim())
          .filter(Boolean);
        store.clear();
        let order = 0;
        for (const block of blocks) {
          const match = block.match(/^## (.+)\n([\s\S]*)$/);
          if (!match) {
            logger.warn(`Skipping malformed entry in ${fileName}`);
            continue;
          }
          const question = match[1].trim();
          const body = match[2].trim();
          const id = slugify(question);
          const data = await parseData({ id, data: { question, order: order++ } });
          const rendered = await renderMarkdown(body);
          store.set({ id, data, body, rendered, digest: generateDigest(body), filePath: fileName });
        }
      }

      await sync();
      watcher?.add(filePath);
      watcher?.on("change", async (changedPath) => {
        if (changedPath === filePath) {
          logger.info(`Reloading ${fileName}`);
          await sync();
        }
      });
    },
  };
}

/**
 * Parses top-level `- **Title.** Text` bullet lines into structured entries.
 * `data.order` follows list position.
 */
export function rulesLoader(fileName: string): Loader {
  return {
    name: "rules-loader",
    load: async ({ config, store, parseData, generateDigest, watcher, logger }) => {
      const url = new URL(fileName, config.root);
      const filePath = fileURLToPath(url);

      async function sync() {
        const raw = await readFile(filePath, "utf-8");
        const lines = raw
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("- "));
        store.clear();
        let order = 0;
        for (const line of lines) {
          const match = line.match(/^- \*\*(.+?)\*\*\s*(.*)$/);
          if (!match) {
            logger.warn(`Skipping malformed rule in ${fileName}`);
            continue;
          }
          const [, title, text] = match;
          const id = slugify(title);
          const data = await parseData({ id, data: { title, text, order: order++ } });
          store.set({ id, data, digest: generateDigest(line), filePath: fileName });
        }
      }

      await sync();
      watcher?.add(filePath);
      watcher?.on("change", async (changedPath) => {
        if (changedPath === filePath) {
          logger.info(`Reloading ${fileName}`);
          await sync();
        }
      });
    },
  };
}
