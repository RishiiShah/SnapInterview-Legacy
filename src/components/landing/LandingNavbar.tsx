"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  Navbar,
  NavbarButton,
  NavbarLogo,
  NavBody,
  NavItems,
} from "./ScrollMorphingNavbar";

const navItems = [
  { name: "Features", link: "#features" },
  { name: "How it works", link: "#how-it-works" },
  { name: "Get started", link: "#get-started" },
];

const mobileLinkClass =
  "w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-[#C7D2FE] transition-colors hover:bg-white/[0.08] hover:text-[#F5F7FF]";

export default function LandingNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <Navbar>
      <NavBody>
        <NavbarLogo />
        <NavItems items={navItems} />

        <div className="relative z-20 ml-auto hidden items-center gap-2 sm:gap-3 lg:flex">
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] px-4 text-sm font-medium text-[#F5F7FF] transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9]"
          >
            Login
          </Link>
          <NavbarButton as={Link} href="/signup">
            Get Started Free
          </NavbarButton>
        </div>
      </NavBody>

      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo />
          <MobileNavToggle
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
          />
        </MobileNavHeader>

        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          onClose={closeMobileMenu}
        >
          {navItems.map((item) => (
            <a
              key={item.link}
              href={item.link}
              onClick={closeMobileMenu}
              className={mobileLinkClass}
            >
              {item.name}
            </a>
          ))}
          <div className="mt-2 flex w-full gap-2 border-t border-white/10 pt-3">
            <Link
              href="/login"
              onClick={closeMobileMenu}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] px-4 text-sm font-medium text-[#F5F7FF] transition-colors hover:bg-white/[0.1]"
            >
              Login
            </Link>
            <NavbarButton
              as={Link}
              href="/signup"
              className="h-10 flex-1"
            >
              Get started
            </NavbarButton>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
