The CI dependency audit requires minimatch 11.0.1 or newer for
GHSA-g3hv-75wg-m249. Existing ESLint and React lint plugins use the callable
CommonJS API from minimatch 3; forcing minimatch 11 directly breaks those calls.

This adapter exports the patched package's `minimatch` function with its named
exports attached, supporting both old callable imports and modern property
imports. It contains no matching implementation. The aliased dependency is
still audited by npm. Remove the override and adapter when the upstream lint
packages use the patched modern API themselves.
