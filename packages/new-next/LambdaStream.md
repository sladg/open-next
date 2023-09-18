https://aws.amazon.com/blogs/compute/introducing-aws-lambda-response-streaming/?ref=serverlessland

```js
exports.handler = awslambda.streamifyResponse(
    async (event, responseStream, context) => {
        responseStream.setContentType(“text/plain”);
        responseStream.write(“Hello, world!”);
        responseStream.end();
    }
);
```

```js
const pipeline = require("util").promisify(require("stream").pipeline);
const zlib = require("zlib");
const { Readable } = require("stream");

exports.gzip = awslambda.streamifyResponse(
  async (event, responseStream, _context) => {
    // As an example, convert event to a readable stream.
    const requestStream = Readable.from(Buffer.from(JSON.stringify(event)));

    await pipeline(requestStream, zlib.createGzip(), responseStream);
  },
);
```

TTFB streamed response
https://gist.github.com/magJ/63bac8198469b6a25d5697ad490d31e6#file-index-mjs-L806

```js
var require_HttpResponseStream = __commonJS({
  "HttpResponseStream.js"(exports, module) {
    "use strict";
    var METADATA_PRELUDE_CONTENT_TYPE =
      "application/vnd.awslambda.http-integration-response";
    var DELIMITER_LEN = 8;
    var HttpResponseStream = class {
      static from(underlyingStream, prelude) {
        underlyingStream.setContentType(METADATA_PRELUDE_CONTENT_TYPE);
        const metadataPrelude = JSON.stringify(prelude);
        underlyingStream._onBeforeFirstWrite = (write) => {
          write(metadataPrelude);
          write(new Uint8Array(DELIMITER_LEN));
        };
        return underlyingStream;
      }
    };
    module.exports.HttpResponseStream = HttpResponseStream;
  },
});
```

- [] TODO: Remove sharp node_modules and use lambda layer or something, instead of having copy of lot of files
