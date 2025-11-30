import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { chatStream, mapStream } from "./ai";

const http = httpRouter();

// Narrative AI stream
http.route({
  path: "/api/stream-narrative",
  method: "POST",
  handler: chatStream,
});

http.route({
  path: "/api/stream-narrative",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

// Map AI stream (dedicated map generation)
http.route({
  path: "/api/map-events",
  method: "POST",
  handler: mapStream,
});

http.route({
  path: "/api/map-events",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

export default http;
