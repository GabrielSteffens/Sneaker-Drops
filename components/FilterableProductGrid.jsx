"use client";

import { useState } from 'react';
import ProductCard from './ProductCard';
import styles from './ProductGrid.module.css';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FilterableProductGrid({ title, titleKey, products }) {
    const { t } = useLanguage();
    const [selectedBrand, setSelectedBrand] = useState('All');
    const [selectedSize, setSelectedSize] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 15;

    // Extract unique brands
    const brands = ['All', ...new Set(products.map(p => p.brand))].sort();

    // Extract unique sizes
    const allSizes = new Set();
    products.forEach(p => {
        if (p.availableSizes) {
            p.availableSizes.forEach(s => allSizes.add(s));
        }
    });
    const sizes = ['All', ...Array.from(allSizes).sort((a, b) => a - b)];

    const displayTitle = titleKey ? t.pages[titleKey] : title;

    // Filter Logic
    const filteredProducts = products.filter(p => {
        const brandMatch = selectedBrand === 'All' || p.brand === selectedBrand;
        const sizeMatch = selectedSize === 'All' || (p.availableSizes && p.availableSizes.includes(parseInt(selectedSize)));
        const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
        return brandMatch && sizeMatch && searchMatch;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleBrandChange = (brand) => {
        setSelectedBrand(brand);
        setCurrentPage(1);
    };

    const handleSizeChange = (size) => {
        setSelectedSize(size);
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <section className={styles.section}>
            <div className={`container ${styles.container}`}>
                <div className={styles.header}>
                    {displayTitle && (
                        <div className={styles.titleContainer}>
                            <h2 className={styles.title}>{displayTitle}</h2>
                            <span className={styles.productCount}>
                                {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
                            </span>
                        </div>
                    )}

                    <div className={styles.searchContainer}>
                        <input
                            type="text"
                            placeholder={t.common?.searchPlaceholder || 'Search...'}
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className={styles.searchInput}
                        />
                    </div>

                    <div className={styles.filtersContainer}>
                        <div className={styles.filterGroup}>
                            <span className={styles.filterLabel}>{t.ui?.brand || 'Brand'}:</span>
                            <div className={styles.filters}>
                                {brands.map(brand => (
                                    <button
                                        key={brand}
                                        onClick={() => handleBrandChange(brand)}
                                        className={`${styles.filterButton} ${selectedBrand === brand ? styles.activeFilter : ''}`}
                                    >
                                        {brand}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {sizes.length > 1 && (
                            <div className={styles.filterGroup}>
                                <span className={styles.filterLabel}>{t.ui?.size || 'Size'}:</span>
                                <div className={styles.filters}>
                                    {sizes.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => handleSizeChange(size)}
                                            className={`${styles.filterButton} ${selectedSize === size ? styles.activeFilter : ''}`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.grid}>
                    {paginatedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>

                {filteredProducts.length === 0 ? (
                    <p className={styles.emptyState}>No products found for the selected filters.</p>
                ) : (
                    totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={styles.pageButton}
                            >
                                &lt;
                            </button>
                            <span className={styles.pageInfo}>
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={styles.pageButton}
                            >
                                &gt;
                            </button>
                        </div>
                    )
                )}
            </div>
        </section>
    );
}
