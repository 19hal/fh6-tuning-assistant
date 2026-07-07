// Recommended gear, shown per Input Device (Controller / Wheel).
//
// AFFILIATE_TAG: leave blank until an affiliate program (e.g. Amazon
// Associates) is approved. Once approved, set it here and every link below
// gets the tracking parameter appended automatically — no other changes needed.
const AFFILIATE_TAG = ""; // e.g. "yourtag-20"

function affiliateUrl(amazonSearchQuery) {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(amazonSearchQuery)}`;
  return AFFILIATE_TAG ? `${base}&tag=${encodeURIComponent(AFFILIATE_TAG)}` : base;
}

const GEAR_RECOMMENDATIONS = {
  pad: [
    {
      name: "Xbox Elite Wireless Controller Series 2",
      blurb: "Adjustable-tension thumbsticks and shorter hair-trigger locks give finer throttle/brake modulation than a stock pad — the biggest single upgrade for controller tuning.",
      query: "Xbox Elite Wireless Controller Series 2",
    },
    {
      name: "SCUF Instinct Pro",
      blurb: "Rear paddles for shifting without taking your thumbs off the sticks, plus swappable grips for a more precise hold on long sessions.",
      query: "SCUF Instinct Pro controller",
    },
    {
      name: "KontrolFreek Precision Thumbsticks",
      blurb: "Cheap, drop-on grips that add height and texture to the sticks — small but real gain in fine steering input precision.",
      query: "KontrolFreek thumbsticks Xbox",
    },
  ],
  wheel: [
    {
      name: "Logitech G923 (Xbox/PC)",
      blurb: "The standard entry-level force-feedback wheel and pedal set — TRUEFORCE FFB gives the road/tire feel this app's Wheel tuning assumes.",
      query: "Logitech G923 racing wheel Xbox",
    },
    {
      name: "Thrustmaster T248",
      blurb: "Hybrid belt-magnetic FFB with a built-in dash display; a strong alternative to the G923 at a similar price.",
      query: "Thrustmaster T248 racing wheel",
    },
    {
      name: "Thrustmaster T-LCM Load Cell Pedals",
      blurb: "Pressure-based brake pedal instead of a spring — the single biggest upgrade for consistent, modulated threshold braking on a wheel.",
      query: "Thrustmaster T-LCM load cell pedals",
    },
  ],
};
