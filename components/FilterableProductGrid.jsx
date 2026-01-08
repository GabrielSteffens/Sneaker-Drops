"use client";

import { useState } from 'react';
import ProductCard from './ProductCard';
import styles from './ProductGrid.module.css';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FilterableProductGrid({ title, titleKey, products }) {
    const { t } = useLanguage();
    const [selectedBrand, setSelectedBrand] = useState('All');

    // Extract unique brands
    const brands = ['All', ...new Set(products.map(p => p.brand))].sort();

    const displayTitle = titleKey ? t.pages[titleKey] : title;

    const filteredProducts = selectedBrand === 'All'
        ? products
        : products.filter(p => p.brand === selectedBrand);

    return (
        <section className={styles.section}>
            <div className={`container ${styles.container}`}>
                <div className={styles.header}>
                    {displayTitle && <h2 className={styles.title}>{displayTitle}</h2>}

                    <div className={styles.filters}>
                        {brands.map(brand => (
                            <button
                                key={brand}
                                onClick={() => setSelectedBrand(brand)}
                                className={`${styles.filterButton} ${selectedBrand === brand ? styles.activeFilter : ''}`}
                            >
                                {brand}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.grid}>
                    {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>

                {filteredProducts.length === 0 && (
                    <p className={styles.emptyState}>No products found for {selectedBrand}.</p>
                )}
            </div>
        </section>
    );
}
