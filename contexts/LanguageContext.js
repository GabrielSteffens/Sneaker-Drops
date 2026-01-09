"use client";

import { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

const dictionary = {
    en: {
        nav: {
            releases: "New Releases",
            promotions: "Promotions",
            subscribe: "Subscribe"
        },
        hero: {
            title1: "ALL DROPS.",
            title2: "ONE PLACE.",
            subtitle: "Track new releases and promotions from Nike, Vans & Puma. Stop browsing. Start coping.",
            ctaPrimary: "Explore New Drops",
            ctaSecondary: "View Promotions",
            status: "Nike, Vans & Puma (Live Automation)"
        },
        pages: {
            newReleases: "New Releases",
            promotions: "Current Promotions",
            deals: "Deals & Steals"
        },
        common: {
            toggle: "BR",
            searchPlaceholder: "Search by model..."
        }
    },
    pt: {
        nav: {
            releases: "Lançamentos",
            promotions: "Promoções",
            subscribe: "Inscrever-se"
        },
        hero: {
            title1: "TODOS OS DROPS.",
            title2: "UM SÓ LUGAR.",
            subtitle: "Acompanhe lançamentos e promoções da Nike, Vans & Puma. Pare de procurar. Comece a comprar.",
            ctaPrimary: "Explorar Lançamentos",
            ctaSecondary: "Ver Promoções",
            status: "Nike, Vans & Puma (Automação ao Vivo)"
        },
        pages: {
            newReleases: "Lançamentos",
            promotions: "Promoções Atuais",
            deals: "Ofertas Imperdíveis"
        },
        common: {
            toggle: "EN",
            searchPlaceholder: "Buscar por modelo..."
        }
    }
};

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState('en');

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'pt' : 'en');
    };

    const t = dictionary[language];

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
