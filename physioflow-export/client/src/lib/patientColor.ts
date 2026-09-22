const PALETTE = [
  { bg: "bg-positive-50", border: "border-positive-500", text: "text-positive-700" },
  { bg: "bg-brand-50", border: "border-brand-500", text: "text-brand-800" },
  { bg: "bg-attention-50", border: "border-attention-500", text: "text-attention-700" },
  { bg: "bg-purple-50", border: "border-purple-500", text: "text-purple-700" },
  { bg: "bg-pink-50", border: "border-pink-500", text: "text-pink-700" },
  { bg: "bg-teal-50", border: "border-teal-500", text: "text-teal-700" },
  { bg: "bg-indigo-50", border: "border-indigo-500", text: "text-indigo-700" },
  { bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-700" },
];

/** Deterministic color per patient so the same person always gets the same card color
 *  across the whole calendar, without needing an explicit "appointment type" taxonomy. */
export function getPatientColor(patientId: string) {
  let hash = 0;
  for (let i = 0; i < patientId.length; i++) {
    hash = (hash << 5) - hash + patientId.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
