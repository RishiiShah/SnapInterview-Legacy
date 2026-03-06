type BraveNavigator = Navigator & {
  brave?: {
    isBrave?: () => Promise<boolean>;
  };
};

export async function getInterviewBlockReason(): Promise<string | null> {
  if (typeof navigator === "undefined") return null;

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("firefox")) {
    return "Firefox is currently not supported for starting interviews.";
  }

  const braveNavigator = navigator as BraveNavigator;
  try {
    if (typeof braveNavigator.brave?.isBrave === "function") {
      const isBrave = await braveNavigator.brave.isBrave();
      if (isBrave) {
        return "Brave is currently not supported for starting interviews.";
      }
    }
  } catch {
    // Ignore Brave detection errors and continue.
  }

  if (userAgent.includes("brave")) {
    return "Brave is currently not supported for starting interviews.";
  }

  return null;
}