import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { chatStream } from "./ai";

const http = httpRouter();

http.route({
  path: "/api/stream-narrative",
  method: "POST",
  handler: chatStream,
});

http.route({
  path: "/api/stream-narrative",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
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
