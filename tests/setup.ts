import "@testing-library/jest-dom";

// @microsoft/signalr's Platform.isBrowser is `!isNode && window/document exist`,
// and Platform.isNode is `process.release?.name === "node"`. Under vitest+jsdom
// the DOM globals (window/document) are present AND we're still a real Node
// process, so SignalR misdetects itself as non-browser Node and
// HttpConnection._resolveUrl throws `Cannot resolve '<path>'` for any relative
// hub URL (see node_modules/@microsoft/signalr/src/Utils.ts Platform.isNode,
// HttpConnection.ts _resolveUrl) before ever touching a URL parser. Undefine
// `process.release` for the test run so SignalR's own environment check takes
// the browser branch and resolves the hub URL against jsdom's document
// location (set via vitest.config.ts `environmentOptions.jsdom.url`) instead.
Object.defineProperty(process, "release", {
  value: undefined,
  configurable: true,
});
