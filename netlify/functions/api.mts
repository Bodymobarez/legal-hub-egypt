import serverless from "serverless-http";
import app from "../../artifacts/api-server/src/app.js";

export const handler = serverless(app, {
  request(req: any) {
    // Strip the /.netlify/functions/api prefix so express routes match /api/...
    req.url = req.url?.replace(/^\/?\.netlify\/functions\/api/, "") || "/";
  },
});
