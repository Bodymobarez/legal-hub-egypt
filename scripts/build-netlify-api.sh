#!/usr/bin/env bash
# Bundles Express app for Netlify Functions (matches .github/workflows/deploy.yml).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
pnpm exec esbuild netlify/functions/api.ts \
  --bundle --platform=node --target=node20 \
  --format=cjs \
  --external:pg-native \
  --external:@mapbox/node-pre-gyp \
  --define:process.env.NODE_ENV='"production"' \
  --outfile=netlify/functions/api.js
node -e "
const fs = require('fs');
let code = fs.readFileSync('netlify/functions/api.js', 'utf8');
code = code.replace(
  'try {\n      Native = require(\"pg-native\");\n    } catch (e) {\n      throw e;\n    }',
  'try {\n      Native = null;\n    } catch (e) {}'
);
// Stub the optional 'supports-color' require inside the bundled 'debug' package.
// Netlify's zip-it-and-ship-it scans require() calls statically and fails the
// deploy when an unbundled module is referenced, even if guarded by try/catch.
code = code.replace(
  /require\\(\"supports-color\"\\)/g,
  '({ stderr: { level: 0 }, stdout: { level: 0 } })'
);
fs.writeFileSync('netlify/functions/api.js', code);
console.log('patched pg-native + supports-color shims in netlify/functions/api.js');
"
