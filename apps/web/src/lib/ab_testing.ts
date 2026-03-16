export function getABTestVariant(experimentName: string, requestFingerprint: string): 'control' | 'variant_a' {
  // Simple deterministic hash based on IP/Fingerprint
  const hash = Array.from(requestFingerprint).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  if (experimentName === 'PDP_HERO_IMAGE_SIZE') {
    return hash % 2 === 0 ? 'control' : 'variant_a';
  }
  
  if (experimentName === 'PDP_BUY_BUTTON_COLOR') {
    return hash % 2 === 0 ? 'control' : 'variant_a';
  }

  return 'control';
}
