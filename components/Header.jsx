"use client";

import { useState } from 'react';
import Link from 'next/link';
import styles from './Header.module.css';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Header() {
    const { t, toggleLanguage } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <header className={styles.header}>
            <div className={`container ${styles.container}`}>
                <Link href="/" className={styles.logo}>
                    SNEAKER<span className="text-accent">DROPS</span>.
                </Link>

                <div className={styles.rightSection}>
                    {/* Desktop Navigation */}
                    <nav className={styles.desktopNav}>
                        <Link href="/new-releases" className={styles.link}>{t.nav.releases}</Link>
                        <Link href="/promotions" className={styles.link}>{t.nav.promotions}</Link>
                    </nav>

                    {/* Language Switcher - Always Visible */}
                    <div className={styles.langSwitch} onClick={toggleLanguage}>
                        <span>{t.common.toggle}</span>
                    </div>

                    {/* Mobile Menu Button */}
                    <button className={styles.hamburger} onClick={toggleMenu} aria-label="Menu">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {isMenuOpen ? (
                                <path d="M18 6L6 18M6 6l12 12" />
                            ) : (
                                <path d="M3 12h18M3 6h18M3 18h18" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className={styles.mobileMenu}>
                    <nav className={styles.mobileNav}>
                        <Link href="/new-releases" className={styles.mobileLink} onClick={toggleMenu}>
                            {t.nav.releases}
                        </Link>
                        <Link href="/promotions" className={styles.mobileLink} onClick={toggleMenu}>
                            {t.nav.promotions}
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
}
