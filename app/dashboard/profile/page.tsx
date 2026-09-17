"use client";

import { ChangeEvent, useRef, useState } from "react";
import { BadgeCheck, Briefcase, Camera, Loader2, User as UserIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DocumentRequestsCard } from "@/components/dashboard/DocumentRequestsCard";
import { Button } from "@/components/ui/Button";
import { AddressSearch } from "@/components/auth/AddressSearch";
import { CountrySelect } from "@/components/auth/CountrySelect";
import { useAuth } from "@/context/AuthContext";
import { AddressResult } from "@/lib/address";
import {
  AccountType,
  COMPANY_SIZES,
  CompanySize,
  INTERESTS,
  Interest,
  assetUrl,
  completeProfile,
  updatePhoto,
  uploadProfilePhoto,
} from "@/lib/api";
import { Country, findCountry } from "@/lib/countries";

const DEFAULT_COUNTRY: Country = findCountry("IN") ?? {
  iso2: "IN",
  name: "India",
  dialCode: "+91",
  flag: "🇮🇳",
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  // DashboardShell blocks rendering until `user` is loaded, so these lazy
  // initializers already see the real values on first render — no effect
  // needed to sync them in afterward.
  const [name, setName] = useState(user?.name ?? "");
  const [accountType, setAccountType] = useState<AccountType>(user?.accountType ?? "individual");
  const [companyName, setCompanyName] = useState(user?.companyName ?? "");
  const [companySize, setCompanySize] = useState<CompanySize | "">(user?.companySize ?? "");
  const [interests, setInterests] = useState<Interest[]>(user?.interests ?? []);
  const [address, setAddress] = useState(user?.address ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [state, setState] = useState(user?.state ?? "");
  const [postalCode, setPostalCode] = useState(user?.postalCode ?? "");
  const [country, setCountry] = useState<Country>(
    () => (user?.countryIso2 && findCountry(user.countryIso2)) || DEFAULT_COUNTRY,
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleInterest(value: Interest) {
    setInterests((prev) => (prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]));
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const { url } = await uploadProfilePhoto(file);
      const updated = await updatePhoto(url);
      updateUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload your photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleAddressSelect(result: AddressResult) {
    setAddress(result.label);
    if (result.city) setCity(result.city);
    if (result.state) setState(result.state);
    if (result.postalCode) setPostalCode(result.postalCode);
    if (result.countryIso2) {
      const match = findCountry(result.countryIso2);
      if (match) setCountry(match);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const updated = await completeProfile({
        name: name.trim(),
        accountType,
        companyName: companyName.trim() || undefined,
        companySize: companySize || undefined,
        interests,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        country: country.name,
        countryIso2: country.iso2,
        countryDialCode: country.dialCode,
      });
      updateUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  const initials = (name || user.email || user.phoneNumber || "?").trim().charAt(0).toUpperCase();

  return (
    <>
      <PageHeader title="Profile" description="Your account, business, and contact details." />

      <div className="mx-auto max-w-2xl px-8 py-6">
        <div className="flex flex-col gap-8">
          {error && <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}

          <DocumentRequestsCard />

          <section className="flex items-center gap-5 rounded-2xl border border-line bg-surface-2 p-6">
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-accent-soft/40">
                {user.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(user.photoUrl)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold text-accent">{initials}</span>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 size={18} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change photo"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-2 bg-accent text-white transition-colors hover:bg-accent-light"
              >
                <Camera size={12} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-ink">{user.name || "Your account"}</p>
              <p className="truncate text-sm text-ink-soft">{user.email ?? user.phoneNumber}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-cream-secondary px-2.5 py-1 text-xs font-medium capitalize text-ink-soft">
                  {accountType} account
                </span>
                {user.emailVerified && (
                  <span className="flex items-center gap-1 rounded-full bg-[#0ca30c]/10 px-2.5 py-1 text-xs font-medium text-[#0ca30c]">
                    <BadgeCheck size={12} />
                    Verified
                  </span>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <UserIcon size={15} className="text-ink-muted" />
              Account
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-1.5 text-xs text-ink-muted">Full name</p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs text-ink-muted">Email</p>
                  <div className="flex h-11 items-center justify-between rounded-xl border border-line bg-cream-secondary px-3">
                    <span className="truncate text-sm text-ink-soft">{user.email ?? "—"}</span>
                    {user.emailVerified && (
                      <span className="flex items-center gap-1 text-xs font-medium text-[#0ca30c]">
                        <BadgeCheck size={13} />
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs text-ink-muted">Phone number</p>
                  <div className="flex h-11 items-center rounded-xl border border-line bg-cream-secondary px-3">
                    <span className="truncate text-sm text-ink-soft">{user.phoneNumber ?? "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <Briefcase size={15} className="text-ink-muted" />
              Business
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setAccountType("individual")}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  accountType === "individual"
                    ? "border-accent bg-accent-soft/40"
                    : "border-line bg-surface-2 hover:border-ink-muted"
                }`}
              >
                <p className="text-sm font-semibold text-ink">Individual</p>
                <p className="mt-1 text-xs text-ink-soft">Using Marteller on your own.</p>
              </button>
              <button
                type="button"
                onClick={() => setAccountType("business")}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  accountType === "business"
                    ? "border-accent bg-accent-soft/40"
                    : "border-line bg-surface-2 hover:border-ink-muted"
                }`}
              >
                <p className="text-sm font-semibold text-ink">Business</p>
                <p className="mt-1 text-xs text-ink-soft">Sending on behalf of a company.</p>
              </button>
            </div>

            {accountType === "business" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                  className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
                />
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value as CompanySize)}
                  className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="">Company size</option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} employees
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-ink">What are you sending?</h2>
            <p className="mb-3 text-xs text-ink-soft">
              We provide AI-based, WhatsApp, Email, and SMS solutions — tell us which ones you use.
            </p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((opt) => {
                const active = interests.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleInterest(opt.value)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent-soft/40 text-accent"
                        : "border-line text-ink-soft hover:border-ink-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-ink">Address</h2>
            <p className="mb-3 text-xs text-ink-soft">
              Search your address and we&apos;ll fill in the city, state, postal code, and country.
            </p>
            <div className="flex flex-col gap-3">
              <AddressSearch initialQuery={address} onSelect={handleAddressSelect} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
                />
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
                />
                <input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Postal code"
                  className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
                />
                <div className="flex h-11 items-center rounded-xl border border-line bg-cream pr-3">
                  <CountrySelect value={country} onChange={setCountry} />
                  <span className="flex-1 truncate text-sm text-ink-soft">{country.name}</span>
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {saved && <span className="text-sm text-[#0ca30c]">Saved</span>}
          </div>
        </div>
      </div>
    </>
  );
}
