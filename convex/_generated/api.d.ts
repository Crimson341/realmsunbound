/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as abilities from "../abilities.js";
import type * as ai from "../ai.js";
import type * as bounty from "../bounty.js";
import type * as camp from "../camp.js";
import type * as conditions from "../conditions.js";
import type * as contextOptimization from "../contextOptimization.js";
import type * as dice from "../dice.js";
import type * as forge from "../forge.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_context from "../lib/context.js";
import type * as lib_embedding_backfill from "../lib/embedding_backfill.js";
import type * as lib_embeddings from "../lib/embeddings.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_memory from "../lib/memory.js";
import type * as lib_memory_storage from "../lib/memory_storage.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as lib_openrouter_env from "../lib/openrouter_env.js";
import type * as lib_utils from "../lib/utils.js";
import type * as map from "../map.js";
import type * as mapGenerator from "../mapGenerator.js";
import type * as messages from "../messages.js";
import type * as npcs from "../npcs.js";
import type * as shops from "../shops.js";
import type * as sprites from "../sprites.js";
import type * as world from "../world.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  abilities: typeof abilities;
  ai: typeof ai;
  bounty: typeof bounty;
  camp: typeof camp;
  conditions: typeof conditions;
  contextOptimization: typeof contextOptimization;
  dice: typeof dice;
  forge: typeof forge;
  http: typeof http;
  inventory: typeof inventory;
  "lib/constants": typeof lib_constants;
  "lib/context": typeof lib_context;
  "lib/embedding_backfill": typeof lib_embedding_backfill;
  "lib/embeddings": typeof lib_embeddings;
  "lib/helpers": typeof lib_helpers;
  "lib/memory": typeof lib_memory;
  "lib/memory_storage": typeof lib_memory_storage;
  "lib/openrouter": typeof lib_openrouter;
  "lib/openrouter_env": typeof lib_openrouter_env;
  "lib/utils": typeof lib_utils;
  map: typeof map;
  mapGenerator: typeof mapGenerator;
  messages: typeof messages;
  npcs: typeof npcs;
  shops: typeof shops;
  sprites: typeof sprites;
  world: typeof world;
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
