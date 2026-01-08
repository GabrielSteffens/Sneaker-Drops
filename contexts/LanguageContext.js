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
            subtitle: "Track new releases and promotions from Nike and Vans. Stop browsing. Start coping.",
            ctaPrimary: "Explore New Drops",
            ctaSecondary: "View Promotions",
            status: "Nike & Vans (Live Automation)"
        },
        pages: {
            newReleases: "New Releases",
            promotions: "Current Promotions",
            deals: "Deals & Steals"
        },
        common: {
            toggle: "BR"
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
            subtitle: "Acompanhe lançamentos e promoções da Nike e Vans. Pare de procurar. Comece a comprar.",
            ctaPrimary: "Explorar Lançamentos",
            ctaSecondary: "Ver Promoções",
            status: "Nike & Vans (Automação ao Vivo)"
        },
        pages: {
            newReleases: "Lançamentos",
            promotions: "Promoções Atuais",
            deals: "Ofertas Imperdíveis"
        },
        common: {
            toggle: "EN"
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
