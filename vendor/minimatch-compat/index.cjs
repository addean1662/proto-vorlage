// ESLint 9 and its React plugins call require('minimatch') as a function.
// minimatch 11 exports that function as .minimatch. Preserve both APIs while
// routing all matching to the patched implementation, with no vendored engine.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS entry point for legacy ESLint consumers.
const modern = require('minimatch-modern');
module.exports = Object.assign(modern.minimatch, modern);
