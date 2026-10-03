const root = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return nextResolve(new URL("./server-only-stub.mjs", import.meta.url).href, context);
  }
  if (specifier.startsWith("@/")) {
    return nextResolve(new URL(`${specifier.slice(2)}.ts`, root).href, context);
  }
  return nextResolve(specifier, context);
}
