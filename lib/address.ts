export type AddressResult = {
  label: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  countryIso2?: string;
};

type PhotonProperties = {
  name?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  district?: string;
  locality?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countrycode?: string;
};

type PhotonFeature = { properties: PhotonProperties };
type PhotonResponse = { features: PhotonFeature[] };

function formatLabel(p: PhotonProperties): string {
  const line = p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street || p.name;
  const parts = [line, p.city || p.district || p.locality, p.state, p.postcode, p.country];
  return Array.from(new Set(parts.filter(Boolean))).join(", ");
}

export async function searchAddress(
  query: string,
  signal?: AbortSignal,
): Promise<AddressResult[]> {
  if (query.trim().length < 3) return [];

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];

  const data: PhotonResponse = await res.json();
  return data.features.map(({ properties: p }) => ({
    label: formatLabel(p),
    city: p.city || p.district || p.locality,
    state: p.state,
    postalCode: p.postcode,
    country: p.country,
    countryIso2: p.countrycode,
  }));
}
