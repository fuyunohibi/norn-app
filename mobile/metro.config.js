const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// react-native-svg imports `buffer`; Metro blocks Node built-ins unless we resolve the polyfill.
// Node's core `buffer` shadows the npm package, so require.resolve("buffer") is wrong — use explicit path.
const bufferPolyfill = path.join(__dirname, "node_modules", "buffer", "index.js");

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "buffer") {
    return {
      filePath: bufferPolyfill,
      type: "sourceFile",
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
