import path from "node:path";

import serverlessExpress from "@vendia/serverless-express";
import type { APIGatewayProxyEventV2, Context } from "aws-lambda";

import { loadConfig } from "./util.js";

const commonBinaryMimeTypes = [
  "application/octet-stream",
  // Docs
  "application/epub+zip",
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.amazon.ebook",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Fonts
  "font/otf",
  "font/woff",
  "font/woff2",
  // Images
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "image/webp",
  // Audio
  "audio/3gpp",
  "audio/aac",
  "audio/basic",
  "audio/mpeg",
  "audio/ogg",
  "audio/wavaudio/webm",
  "audio/x-aiff",
  "audio/x-midi",
  "audio/x-wav",
  // Video
  "video/3gpp",
  "video/mp2t",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  // Archives
  "application/java-archive",
  "application/vnd.apple.installer+xml",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/x-bzip",
  "application/x-bzip2",
  "application/x-gzip",
  "application/x-java-archive",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-zip",
  "application/zip",
];

const NEXT_DIR = path.join(__dirname, ".next");
const config = loadConfig(NEXT_DIR);

export const nextHandler = () =>
  require("next/dist/server/next.js")
    .default({
      conf: {
        ...config,
        // Next.js compression should be disabled because of a bug in the bundled
        // `compression` package — https://github.com/vercel/next.js/issues/11669
        compress: false,
        // By default, Next.js uses local disk to store ISR cache. We will use
        // our own cache handler to store the cache on S3.
        experimental: {
          ...config.experimental,
          // This uses the request.headers.host as the URL
          // https://github.com/vercel/next.js/blob/canary/packages/next/src/server/next-server.ts#L1749-L1754
          // trustHostHeader: true, not used anymore?
          incrementalCacheHandlerPath: `${process.env.LAMBDA_TASK_ROOT}/cache.cjs`,
        },
      },
      customServer: false,
      dev: false,
      dir: __dirname,
    })
    .getRequestHandler();

/*
  This is a implementation of Next's `run` function that is used to handle requests.
  We wrap it with custom server logic to avoid starting-up Next's own server, which takes LOOOONG time.
  See: `/next/src/server/lib/render-server.ts`

  Next uses following request properties:
    req.method
    req.url
    req.cookies
    req.body
    req.query
    req.on('error')
    req.headers
        x-now-route-matches
        x-matched-path
        x-invoke-query
        x-middleware-invoke
        user-agent
        x-nextjs-data
        x-middleware-prefetch
        rsc
        next-router-prefetch
        purpose
        x-invoke-output
        x-forwarded-proto
        host
        content-type
        next-router-state-tree
        *acl headers
*/

/*
Following process is executed upon request:
    - const app = next()
    - A const req = transformToRequest(event)
    - A const res = mockResponse()
    - await app.getRequestHandler()(req, res)
    - A return transformToResponse(res)
*/

// For streaming, we are waiting for https://github.com/vendia/serverless-express/issues/655

type ResponseStream = any;

// @TODO: Handle warmer event.
const requestHandler = async (
  event: APIGatewayProxyEventV2,
  arg: Context | ResponseStream,
  ...args: [Context | undefined]
) => {
  // Handle warmer event
  if ("type" in event || event.headers.warmer === "true") {
    return {
      statusCode: 200,
      body: "OK",
    };
  }

  // Map stream and/or context from args
  const _responseStream = (args?.[0] ? arg : undefined) as
    | ResponseStream
    | undefined;

  const context = (args?.[0] ? args[0] : arg) as Context;

  // Convert event to HTTP request
  // Response is automaticaly converted to lambda-compatible object
  const httpHandler = serverlessExpress({
    app: nextHandler,
    binaryMimeTypes: [...commonBinaryMimeTypes],
    respondWithErrors: true,
  });

  return httpHandler(event, context, () => null);
};

export const handler = process.env.STREAMIFY
  ? (globalThis as any).awslambda.streamifyResponse(requestHandler)
  : requestHandler;

/*
  Warmer function is not necessary. We can use Cloudwatch events to warm up the function.

*/
