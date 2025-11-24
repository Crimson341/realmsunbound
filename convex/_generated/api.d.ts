/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as forge from "../forge.js";
import type * as http from "../http.js";
import type * as lib_context from "../lib/context.js";
import type * as lib_embeddings from "../lib/embeddings.js";
import type * as lib_memory from "../lib/memory.js";
import type * as lib_memory_storage from "../lib/memory_storage.js";
import type * as lib_utils from "../lib/utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  forge: typeof forge;
  http: typeof http;
  "lib/context": typeof lib_context;
  "lib/embeddings": typeof lib_embeddings;
  "lib/memory": typeof lib_memory;
  "lib/memory_storage": typeof lib_memory_storage;
  "lib/utils": typeof lib_utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
