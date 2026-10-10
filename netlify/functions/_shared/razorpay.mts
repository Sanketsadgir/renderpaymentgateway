export const MIN_RUPEES = 1;
export const MAX_RUPEES = 10_000_000;

export function getKeys() {
  const keyId = Netlify.env.get("RAZORPAY_KEY_ID");
  const keySecret = Netlify.env.get("RAZORPAY_KEY_SECRET");
  return keyId && keySecret ? { keyId, keySecret } : null;
}

export function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 8192) throw new Error("Request too large.");
  try {
    const data = JSON.parse(text || "{}");
    return data && typeof data === "object" ? data : {};
  } catch {
    throw new Error("Invalid JSON.");
  }
}

// Converts a rupee amount to integer paise, rejecting more than 2 decimal places.
// Uses a tolerance because values like 1.29 * 100 are not exact in floating point.
export function toPaise(amount: unknown): number | null {
  const rupees = Number(amount);
  if (!Number.isFinite(rupees) || rupees < MIN_RUPEES || rupees > MAX_RUPEES) return null;
  const paise = Math.round(rupees * 100);
  return Math.abs(paise - rupees * 100) < 1e-6 ? paise : null;
}
