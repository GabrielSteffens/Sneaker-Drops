"use client";

import Link from 'next/link';
import styles from './Header.module.css';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Header() {
    const { t, toggleLanguage, language } = useLanguage();

    return (
        <header className={styles.header}>
            <div className={`container ${styles.container}`}>
                <Link href="/" className={styles.logo}>
                    SNEAKER<span className="text-accent">DROPS</span>.
                </Link>
                <nav className={styles.nav}>
                    <Link href="/new-releases" className={styles.link}>{t.nav.releases}</Link>
                    <Link href="/promotions" className={styles.link}>{t.nav.promotions}</Link>
                    <div className={styles.langSwitch} onClick={toggleLanguage}>
                        <span>{t.common.toggle}</span>
                    </div>
                </nav>
            </div>
        </header>
    );
}
