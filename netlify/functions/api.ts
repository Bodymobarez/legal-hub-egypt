import serverless from "serverless-http";
import app from "../../artifacts/api-server/src/app.js";

// Netlify Functions v1 — CommonJS handler export
module.exports.handler = serverless(app, {
  request(req: any) {
    req.url = req.url?.replace(/^\/?\.netlify\/functions\/api/, "") || "/";
  },
});
