// Monorepo-aware Metro config for the Expo app (pnpm workspace).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo (so @crafted/shared edits hot-reload).
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from the app's node_modules first, then the root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. supabase-js compatibility: its "exports" map points Metro at builds that
//    expect Node globals; disable package-exports resolution.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
