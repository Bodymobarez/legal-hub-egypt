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
fs.writeFileSync('netlify/functions/api.js', code);
console.log('patched pg-native shim in netlify/functions/api.js');
"
