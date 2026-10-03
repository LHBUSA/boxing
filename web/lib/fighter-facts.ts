// Fighter-profile bio facts (owner rule 2026-10-03): a fact appears only with a sourced value for that field; an
// absent fact is omitted, never rendered as "Not verified", "Unknown", "N/A" or "—". A verified bout verifies none of
// these: each keeps its own evidence path (profile column, or the identity-proven sourced bio). DOB is never shown;
// age only through the identity-proven path.

export interface ProfileBio { stance?: string | null; height_cm?: number | null; reach_cm?: number | null; nationality?: string | null }
export interface SourcedBioFacts { age_years?: number | null; height_cm?: number | null; nationality?: string[] | null }

export function bioFacts(f: ProfileBio, bio: SourcedBioFacts | null, stanceLabel: Record<string, string> = {}): [string, string][] {
  const out: [string, string][] = [];
  if (f.stance) out.push(["Stance", stanceLabel[f.stance] ?? f.stance]);
  if (f.height_cm || f.reach_cm) {
    out.push(["Height · reach", [f.height_cm ? `${Math.round(f.height_cm)} cm` : null, f.reach_cm ? `${Math.round(f.reach_cm)} cm reach` : null].filter(Boolean).join(" · ")]);
  } else if (bio?.height_cm) {
    out.push(["Height", `${Math.round(bio.height_cm)} cm (identity-proven)`]);
  }
  if (bio?.age_years) out.push(["Age", `${bio.age_years} (identity-proven)`]);
  if (f.nationality) out.push(["Nationality", f.nationality]);
  else if (bio?.nationality?.length) out.push(["Nationality", `${bio.nationality.join(" / ")} (identity-proven)`]);
  return out;
}
