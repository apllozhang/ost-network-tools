/**
 * Re-export AppRouter type so client can import without crossing the server boundary.
 * This file must NOT import any server runtime code.
 */
export type { AppRouter } from "../server/_core/index.js";
