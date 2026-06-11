/**
 * The Crafted MFG logo: "Crafted" in Comfortaa (rounded geometric, matching
 * the brand wordmark) with the stacked M/F/G at the right, and optionally the
 * "HEADWEAR, APPAREL & LIVE EVENTS" tagline underneath.
 */
export function BrandWordmark({
  size = "sm",
  tagline = false,
}: {
  size?: "sm" | "lg";
  tagline?: boolean;
}) {
  const crafted = size === "lg" ? "text-4xl" : "text-2xl";
  const mfg = size === "lg" ? "text-[11px]" : "text-[8px]";

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-stretch text-stone-900 dark:text-stone-100">
        <span
          className={`${crafted} font-bold leading-none tracking-tight`}
          style={{ fontFamily: "var(--font-logo)" }}
        >
          Crafted
        </span>
        <span
          className={`${mfg} ml-1 flex flex-col justify-between py-px font-extrabold leading-none`}
          aria-hidden="true"
        >
          <span>M</span>
          <span>F</span>
          <span>G</span>
        </span>
        <span className="sr-only">MFG</span>
      </div>
      {tagline ? (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
          Headwear, Apparel &amp; Live Events
        </p>
      ) : null}
    </div>
  );
}
