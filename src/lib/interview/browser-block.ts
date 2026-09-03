type BraveNavigator = Navigator & {
  brave?: {
    isBrave?: () => Promise<boolean>;
  };
};

export type BrowserBlockResult = {
  severity: "block" | "warning";
  reason: string;
} | null;

export async function getInterviewBlockReason(): Promise<BrowserBlockResult> {
  if (typeof navigator === "undefined") return null;

  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes("firefox")) {
    return {
      severity: "warning",
      reason: "Firefox has limited support for speech recognition. For the best experience, we recommend using Chrome or Edge.",
    };
  }

  const braveNavigator = navigator as BraveNavigator;
  let isBrave = false;
  try {
    if (typeof braveNavigator.brave?.isBrave === "function") {
      isBrave = await braveNavigator.brave.isBrave();
    }
  } catch {
    // Ignore Brave detection errors and continue.
  }

  if (isBrave || userAgent.includes("brave")) {
    return {
      severity: "warning",
      reason: "Brave's aggressive privacy settings can sometimes interfere with microphone and camera permissions. If you encounter issues, please disable shields for this site or use Chrome.",
    };
  }

  return null;
}