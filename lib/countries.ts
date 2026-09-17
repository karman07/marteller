import { getCountries, getCountryCallingCode } from "libphonenumber-js";

export type Country = {
  iso2: string;
  name: string;
  dialCode: string;
  flag: string;
};

function flagEmoji(iso2: string) {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

let cached: Country[] | null = null;

export function getCountryList(): Country[] {
  if (cached) return cached;

  const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

  cached = getCountries()
    .map((iso2) => ({
      iso2,
      name: regionNames.of(iso2) ?? iso2,
      dialCode: `+${getCountryCallingCode(iso2)}`,
      flag: flagEmoji(iso2),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return cached;
}

export function findCountry(iso2: string): Country | undefined {
  return getCountryList().find((c) => c.iso2 === iso2.toUpperCase());
}
