/** True when this click is still the latest toggle on that control. */
export function acceptSaveResult(clickGeneration: number, latestGeneration: number) {
  return clickGeneration === latestGeneration;
}
