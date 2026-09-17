"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  linkWithPhoneNumber,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import {
  Building2,
  KeyRound,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquareText,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CountrySelect } from "./CountrySelect";
import { AddressSearch } from "./AddressSearch";
import { firebaseAuth, googleProvider } from "@/lib/firebase";
import { findCountry, getCountryList, Country } from "@/lib/countries";
import { detectLocation } from "@/lib/geo";
import { AddressResult } from "@/lib/address";
import {
  AccountType,
  AppUser,
  COMPANY_SIZES,
  CompanySize,
  INTERESTS,
  Interest,
  completeProfile,
  devLinkPhone,
  skipOnboarding,
  syncSession,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const INTEREST_ICONS: Record<Interest, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  email: Mail,
  sms: MessageSquareText,
  otp: KeyRound,
};

type Step = "account" | "phone" | "otp" | "profile";
type AccountMode = "login" | "signup" | "forgot";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_PHONE_BYPASS === "true";
const DEV_OTP = "123456";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35.4 27 36.3 24 36.3c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.6 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

export function AuthModal() {
  const { loginModalOpen, closeLoginModal, setSession, updateUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("account");
  const [accountMode, setAccountMode] = useState<AccountMode>("signup");
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [country, setCountry] = useState<Country>(
    () => findCountry("US") ?? getCountryList()[0],
  );
  const [userPickedCountry, setUserPickedCountry] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState<CompanySize | "">("");
  const [interests, setInterests] = useState<Interest[]>([]);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressData, setAddressData] = useState<AddressResult>({ label: "" });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firebaseUserRef = useRef<FirebaseUser | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  // Detect approximate location once, to preselect a sensible default phone
  // country and give the address search a starting query to refine from.
  useEffect(() => {
    if (!loginModalOpen) return;
    detectLocation().then((loc) => {
      if (!loc) return;
      setAddressQuery((prev) => prev || [loc.city, loc.countryName].filter(Boolean).join(", "));
      if (!userPickedCountry) {
        const detected = findCountry(loc.countryIso2);
        if (detected) setCountry(detected);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginModalOpen]);

  useEffect(() => {
    if (!loginModalOpen) {
      setStep("account");
      setAccountMode("signup");
      setEmailInput("");
      setPassword("");
      setForgotSent(false);
      setPhoneNumber("");
      setOtp("");
      setName("");
      setAccountType("individual");
      setCompanyName("");
      setCompanySize("");
      setInterests([]);
      setAddressQuery("");
      setAddressData({ label: "" });
      setError(null);
      setLoading(false);
      firebaseUserRef.current = null;
      confirmationRef.current = null;
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    }
  }, [loginModalOpen]);

  function routeAfterSync(user: AppUser) {
    if (user.phoneNumber && user.onboarded) {
      closeLoginModal();
      router.push("/dashboard");
    } else if (user.phoneNumber) {
      setStep("profile");
    } else {
      setStep("phone");
    }
  }

  async function afterFirebaseAuth(firebaseUser: FirebaseUser) {
    firebaseUserRef.current = firebaseUser;
    const idToken = await firebaseUser.getIdToken();
    const res = await syncSession(idToken);
    setSession(res.token, res.user);
    routeAfterSync(res.user);
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(firebaseAuth, googleProvider);
      await afterFirebaseAuth(cred.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in with Google.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit() {
    setError(null);
    if (!emailInput.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      if (accountMode === "signup") {
        const cred = await createUserWithEmailAndPassword(
          firebaseAuth,
          emailInput.trim(),
          password,
        );
        sendEmailVerification(cred.user).catch(() => {});
        await afterFirebaseAuth(cred.user);
      } else {
        const cred = await signInWithEmailAndPassword(
          firebaseAuth,
          emailInput.trim(),
          password,
        );
        await afterFirebaseAuth(cred.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign you in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    if (!emailInput.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, emailInput.trim()).catch(() => {});
      setForgotSent(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendCode() {
    setError(null);
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 4) {
      setError("Enter a valid phone number.");
      return;
    }
    const fullNumber = `${country.dialCode}${digits}`;

    if (DEV_BYPASS) {
      // Dev-only: skip real Firebase SMS/reCAPTCHA entirely.
      setStep("otp");
      return;
    }

    const firebaseUser = firebaseUserRef.current ?? firebaseAuth.currentUser;
    if (!firebaseUser) {
      setError("Your session expired. Please sign in again.");
      setStep("account");
      return;
    }

    setLoading(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
          size: "invisible",
        });
      }
      confirmationRef.current = await linkWithPhoneNumber(
        firebaseUser,
        fullNumber,
        recaptchaRef.current,
      );
      setStep("otp");
    } catch (err) {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      setError(err instanceof Error ? err.message : "Could not send verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    setError(null);
    if (otp.trim().length < 4) {
      setError("Enter the code you received.");
      return;
    }

    setLoading(true);
    try {
      if (DEV_BYPASS) {
        const digits = phoneNumber.replace(/\D/g, "");
        if (otp.trim() !== DEV_OTP) {
          throw new Error(`Dev mode: use code ${DEV_OTP}.`);
        }
        const user = await devLinkPhone(`${country.dialCode}${digits}`, otp.trim());
        updateUser(user);
        routeAfterSync(user);
      } else {
        if (!confirmationRef.current) return;
        const credential = await confirmationRef.current.confirm(otp.trim());
        // Force-refresh so the new token carries the phone_number claim.
        const idToken = await credential.user.getIdToken(true);
        const res = await syncSession(idToken);
        setSession(res.token, res.user);
        routeAfterSync(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleInterest(value: Interest) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value],
    );
  }

  async function handleCompleteProfile() {
    setError(null);
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (accountType === "business" && !companyName.trim()) {
      setError("Enter your company name.");
      return;
    }

    setLoading(true);
    try {
      const user = await completeProfile({
        name: name.trim(),
        accountType,
        companyName: accountType === "business" ? companyName.trim() : undefined,
        companySize: accountType === "business" && companySize ? companySize : undefined,
        interests,
        address: addressData.label || undefined,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode,
        country: addressData.country || country.name,
        countryIso2: addressData.countryIso2 || country.iso2,
        countryDialCode: country.dialCode,
      });
      updateUser(user);
      closeLoginModal();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    setError(null);
    setLoading(true);
    try {
      const user = await skipOnboarding();
      updateUser(user);
      closeLoginModal();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not skip right now.");
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Step, string> = {
    account: accountMode === "forgot" ? "Reset your password" : "Log in or sign up",
    phone: "Verify your number",
    otp: "Enter the code",
    profile: "Tell us about you",
  };

  return (
    <Modal open={loginModalOpen} onClose={closeLoginModal} title={titles[step]}>
      {error && (
        <p
          data-testid="auth-error"
          className="mb-4 rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent"
        >
          {error}
        </p>
      )}

      {step === "account" && accountMode !== "forgot" && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-sm font-medium text-ink transition-colors hover:border-ink-muted disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <div className="h-px flex-1 bg-line" />
            or continue with email
            <div className="h-px flex-1 bg-line" />
          </div>

          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            type="email"
            placeholder="Email address"
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
            type="password"
            placeholder="Password"
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />

          {accountMode === "login" && (
            <button
              type="button"
              onClick={() => {
                setAccountMode("forgot");
                setForgotSent(false);
                setError(null);
              }}
              className="-mt-2 self-end text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Forgot password?
            </button>
          )}

          <Button onClick={handleEmailSubmit} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : accountMode === "signup" ? (
              "Create account"
            ) : (
              "Log In"
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setAccountMode(accountMode === "signup" ? "login" : "signup");
              setError(null);
            }}
            className="text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            {accountMode === "signup"
              ? "Already have an account? Log in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      )}

      {step === "account" && accountMode === "forgot" && (
        <div className="flex flex-col gap-4">
          {forgotSent ? (
            <p className="text-sm text-ink-soft">
              If an account exists for {emailInput}, a reset link is on its way — check your
              inbox.
            </p>
          ) : (
            <>
              <p className="text-sm text-ink-soft">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                type="email"
                placeholder="Email address"
                className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
              />
              <Button onClick={handleForgotPassword} disabled={loading} className="w-full">
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Send reset link"}
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setAccountMode("login");
              setForgotSent(false);
              setError(null);
            }}
            className="text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Back to log in
          </button>
        </div>
      )}

      {step === "phone" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            We&apos;ll text you a one-time code to verify your number.
          </p>
          <div className="flex h-11 items-stretch overflow-hidden rounded-xl border border-line bg-cream transition-colors focus-within:border-accent">
            <CountrySelect
              value={country}
              onChange={(c) => {
                setCountry(c);
                setUserPickedCountry(true);
              }}
            />
            <div className="my-2 w-px shrink-0 bg-line" />
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
              inputMode="numeric"
              placeholder="Phone number"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
          <Button onClick={handleSendCode} disabled={loading} className="w-full">
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Send code"}
          </Button>
          <div id="recaptcha-container" />
        </div>
      )}

      {step === "otp" && (
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <ShieldCheck size={16} className="text-accent" />
            Code sent to {country.dialCode} {phoneNumber}
          </p>
          {DEV_BYPASS && (
            <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-xs font-medium text-accent">
              Dev mode — no SMS sent, enter {DEV_OTP}
            </p>
          )}
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
            inputMode="numeric"
            autoFocus
            placeholder="6-digit code"
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-center text-lg tracking-[0.3em] text-ink outline-none focus:border-accent"
          />
          <Button onClick={handleVerifyCode} disabled={loading} className="w-full">
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
          </Button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Use a different number
          </button>
        </div>
      )}

      {step === "profile" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "individual" as const, label: "Individual", Icon: UserIcon },
                { value: "business" as const, label: "Business", Icon: Building2 },
              ]
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccountType(value)}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors ${
                  accountType === value
                    ? "border-accent bg-accent-soft/40 text-accent"
                    : "border-line text-ink-soft hover:text-ink"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />
          {accountType === "business" && (
            <>
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
            </>
          )}
          <AddressSearch initialQuery={addressQuery} onSelect={setAddressData} />

          <div>
            <p className="mb-2 text-xs font-medium text-ink-muted">
              What are you interested in?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {INTERESTS.map(({ value, label }) => {
                const Icon = INTEREST_ICONS[value];
                const active = interests.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleInterest(value)}
                    className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent-soft/40 text-accent"
                        : "border-line text-ink-soft hover:text-ink"
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={handleCompleteProfile} disabled={loading} className="w-full">
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Finish"}
          </Button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={loading}
            className="text-sm text-ink-soft underline underline-offset-2 hover:text-ink disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      )}
    </Modal>
  );
}
