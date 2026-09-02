/**
 * City = ein VHS-Standort (Stadt/Verbund). Alle stadt-spezifischen Angaben leben
 * hier, damit Agent, Retrieval und die öffentlichen Seiten stadt-agnostisch bleiben.
 * Eine neue Stadt = eine neue Datei unter lib/cities/ + Eintrag in index.ts.
 */
export type City = {
  /** URL-Segment und interne id, z. B. "berlin" */
  slug: string;
  /** Kurzname, z. B. "Berlin" */
  name: string;
  /** Anbieter-Bezeichnung im Fließtext, z. B. "die Berliner Volkshochschulen" */
  displayName: string;
  /** Pinecone-Namespace des Kurskatalogs, z. B. "vhs/berlin" */
  namespace: string;
  /** processed-Datei / source id der Pipeline, z. B. "berlin" */
  sourceId: string;
  /** grobe Region, z. B. "Berlin" */
  region: string;
  /** wie ein Sub-Anbieter heißt: "Bezirks-VHS" (Berlin) bzw. "Volkshochschule" */
  providerLabel: string;
  /** wie die Untergliederung heißt: "Bezirk" (Berlin) bzw. "Ort" */
  districtLabel: string;
  /** gültige district-Werte (== Course.region); für Filter + Prompt */
  districts: string[];
  /** ungefähre Kurszahl im aktuellen Semester (für Copy/Prompt) */
  approxCourseCount: number;
  /** stadt-spezifischer Block für den System-Prompt (Träger, Recht, Ermäßigungen …) */
  primer: string;
  /** SEO-Basistexte */
  seo: {
    tagline: string;
    metaDescription: string;
  };
  /** Datenherkunft (Attribution ist bei CC-BY Pflicht) */
  data: {
    licenseLabel: string;
    attribution: string;
    sourceName: string;
    sourceUrl: string;
  };
};
