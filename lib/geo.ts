export type GeoLocation = {
  countryIso2: string;
  countryName: string;
  city?: string;
};

export async function detectLocation(): Promise<GeoLocation | null> {
  try {
    const res = await fetch("https://ipwho.is/");
    const data = await res.json();

    if (!data.success || !data.country_code) return null;

    return {
      countryIso2: data.country_code,
      countryName: data.country,
      city: data.city,
    };
  } catch {
    return null;
  }
}
