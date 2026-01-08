"use client";

import styles from './Hero.module.css';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Hero() {
    const { t } = useLanguage();

    return (
        <section className={styles.hero}>
            <div className={`container ${styles.container}`}>
                <h1 className={styles.title}>
                    {t.hero.title1} <br />
                    <span className="text-accent">{t.hero.title2}</span>
                </h1>
                <p className={styles.subtitle}>
                    {t.hero.subtitle}
                </p>

                <div className={styles.disclaimer}>
                    <span className={styles.statusDot}></span>
                    <p>
                        <strong>System Status:</strong> {t.hero.status}
                    </p>
                </div>
                <div className={styles.actions}>
                    <a href="/new-releases" className={styles.primaryButton}>{t.hero.ctaPrimary}</a>
                    <a href="/promotions" className={styles.secondaryButton}>{t.hero.ctaSecondary}</a>
                </div>
            </div>
        </section>
    );
}
