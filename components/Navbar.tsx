"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Container } from "./ui/Container";
import { Button } from "./ui/Button";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { useAuth } from "@/context/AuthContext";

const links = [
  { label: "Products", href: "#platform" },
  { label: "Solutions", href: "#use-cases" },
  { label: "Developers", href: "#developers" },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#footer" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, loading, openLoginModal, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-cream/85 backdrop-blur-md">
      <Container className="flex h-18 items-center justify-between py-4">
        <a href="#top">
          <Logo />
        </a>

        <nav className="hidden items-center gap-9 lg:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          {!loading && user ? (
            <>
              <Button href="/dashboard" variant="outline" className="px-5 py-2.5">
                Dashboard
              </Button>
              <button
                onClick={logout}
                className="px-3 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openLoginModal}
                className="px-3 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                Log In
              </button>
              <Button onClick={openLoginModal} variant="primary" className="px-5 py-2.5">
                Sign Up
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </Container>

      {open && (
        <div className="border-t border-line/70 bg-cream lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-ink-soft hover:bg-cream-secondary hover:text-ink"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t border-line/70 pt-4">
              {!loading && user ? (
                <>
                  <Button href="/dashboard" variant="outline" className="flex-1">
                    Dashboard
                  </Button>
                  <button
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                    className="flex-1 rounded-full border border-line px-4 py-2.5 text-center text-sm font-medium text-ink"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      openLoginModal();
                      setOpen(false);
                    }}
                    className="flex-1 rounded-full border border-line px-4 py-2.5 text-center text-sm font-medium text-ink"
                  >
                    Log In
                  </button>
                  <Button
                    onClick={() => {
                      openLoginModal();
                      setOpen(false);
                    }}
                    variant="primary"
                    className="flex-1"
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
