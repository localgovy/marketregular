/** True while `next build` is prerendering. Workers inherit `NEXT_PHASE`. */
export function isProductionBuild() {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}
