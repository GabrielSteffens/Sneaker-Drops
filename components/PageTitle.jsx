"use client";

import { useLanguage } from '@/contexts/LanguageContext';

export default function PageTitle({ pageKey }) {
    const { t } = useLanguage();

    return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', textTransform: 'uppercase' }}>
                {t.pages[pageKey]}
            </h1>
        </div>
    );
}
