/**
 * CJS shim for node:sqlite.
 *
 * Node's own CJS `require` is bypassed by bundlers, so we obtain a real
 * require via `createRequire` (from node:module, a well-known external) and
 * use it to load `node:sqlite`. Works under Node, Vitest (Vite), and
 * Turbopack (Next.js). Node >= 22.13 provides the module; no native
 * compilation needed.
 */
"use strict";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRequire } = require("node:module");

const req = createRequire(__filename);

const { DatabaseSync } = req("node:sqlite");

module.exports = { DatabaseSync };
