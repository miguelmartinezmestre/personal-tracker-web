#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const argv = process.argv.slice(2);

const helpRequested = argv.includes("-h") || argv.includes("--help");
if (helpRequested) {
  const scriptName = process.argv[1] ? path.basename(process.argv[1]) : "clean.mjs";
  // Keep output minimal and stable: this script is used inside `pnpm run clean`.
  console.log(`Usage: node ${scriptName} <path> [path...]

Deletes files/directories recursively with retries.
Intended to replace "npx rimraf ..." in workspace clean scripts.`);
  process.exit(0);
}

if (argv.length === 0) {
  console.error("Missing paths to delete. Try: node scripts/clean.mjs node_modules .next .turbo");
  process.exit(1);
}

const RETRY_CODES = new Set([
  "ENOTEMPTY",
  "EBUSY",
  "EPERM",
  "EACCES",
  "EMFILE",
  "ENFILE",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function assertSafeTarget(absPath, originalArg) {
  if (!originalArg || originalArg === "." || originalArg === "..") {
    throw new Error(`Refusing to delete unsafe target "${originalArg}"`);
  }
  const root = path.parse(absPath).root;
  if (absPath === root) {
    throw new Error(`Refusing to delete filesystem root "${absPath}"`);
  }
}

async function rmWithRetries(absPath, attempts = 8) {
  for (let i = 0; i < attempts; i++) {
    try {
      await rm(absPath, {
        recursive: true,
        force: true,
        // Node already supports retries, but we add our own backoff too.
        maxRetries: 10,
        retryDelay: 50,
      });
      return;
    } catch (err) {
      const code = err?.code;
      const canRetry = code && RETRY_CODES.has(code);
      if (!canRetry || i === attempts - 1) {
        throw err;
      }
      await sleep(50 * 2 ** i);
    }
  }
}

async function rmWithPosixFallback(absPath) {
  try {
    await rmWithRetries(absPath);
    return;
  } catch (err) {
    // If we're on a POSIX-like OS, attempt a best-effort fallback.
    if (process.platform !== "win32") {
      const res = spawnSync("rm", ["-rf", absPath], { stdio: "ignore" });
      if (res.status === 0) {
        return;
      }
    }
    throw err;
  }
}

async function removeOnce(absPath) {
  if (!existsSync(absPath)) return;

  // Renaming before deleting reduces race conditions (e.g. Next dev cache churn).
  const parent = path.dirname(absPath);
  const base = path.basename(absPath);
  const tmp = path.join(parent, `.delete-${base}-${Date.now()}-${crypto.randomUUID()}`);

  let toDelete = absPath;
  try {
    await rename(absPath, tmp);
    toDelete = tmp;
  } catch {
    // If rename fails (e.g. already gone / permissions), fall back to deleting in place.
    toDelete = absPath;
  }

  await rmWithPosixFallback(toDelete);
}

async function removeFully(absPath) {
  // A small loop to handle "directory keeps changing" races.
  for (let i = 0; i < 5; i++) {
    if (!existsSync(absPath)) return;
    await removeOnce(absPath);
    if (!existsSync(absPath)) return;
    await sleep(100 * (i + 1));
  }
  throw new Error(
    `Failed to fully remove "${absPath}". Make sure no dev server is using it (e.g. stop \`next dev\`).`,
  );
}

try {
  for (const target of argv) {
    const abs = path.resolve(process.cwd(), target);
    assertSafeTarget(abs, target);
    await removeFully(abs);
  }
} catch (err) {
  console.error(err?.message ?? err);
  process.exit(1);
}


