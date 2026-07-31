"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Studio", link: "#studio" },
  { name: "Features", link: "#features" },
  { name: "How it works", link: "#how-it-works" },
  { name: "Get started", link: "#get-started" },
];

const SECTION_IDS = ["studio", "features", "how-it-works", "get-started"] as const;

const mobileLinkClass =
  "w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#C7D2FE] transition-colors hover:bg-white/[0.08] hover:text-[#F5F7FF] cursor-pointer";

/** Pick the last section whose top has crossed the nav probe line. */
function useActiveSection(sectionIds: readonly string[]) {
  const [activeLink, setActiveLink] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const probe = Math.min(120, window.innerHeight * 0.22);
      let current: string | null = null;

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= probe) {
          current = id;
        }
      }

      // Near page bottom, force the last section
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight - scrollBottom < 80) {
        current = sectionIds[sectionIds.length - 1] ?? current;
      }

      setActiveLink(current ? `#${current}` : null);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sectionIds]);

  return activeLink;
}

export default function LandingNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeLink = useActiveSection(SECTION_IDS);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <Navbar>
      <NavBody>
        <NavbarLogo />
        <NavItems items={navItems} activeLink={activeLink} />

        <div className="relative z-20 ml-auto hidden items-center gap-1.5 lg:flex">
          <Link
            href="/login"
            className="inline-flex h-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] px-3.5 text-sm font-medium text-[#F5F7FF] transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9] cursor-pointer"
          >
            Login
          </Link>
          <NavbarButton as={Link} href="/signup">
            Start free
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
              aria-current={activeLink === item.link ? "true" : undefined}
              className={cn(
                mobileLinkClass,
                activeLink === item.link && "bg-white/[0.08] text-[#F5F7FF]",
              )}
            >
              {item.name}
            </a>
          ))}
          <div className="mt-2 flex w-full gap-2 border-t border-white/10 pt-3">
            <Link
              href="/login"
              onClick={closeMobileMenu}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] px-4 text-sm font-medium text-[#F5F7FF] transition-colors hover:bg-white/[0.1] cursor-pointer"
            >
              Login
            </Link>
            <NavbarButton
              as={Link}
              href="/signup"
              className="h-9 flex-1"
            >
              Start free
            </NavbarButton>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
