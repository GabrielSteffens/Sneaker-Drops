"use client";

import Image from 'next/image';
import React from 'react';
import styles from './ProductCard.module.css';

const formatPrice = (price) => {
    return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ProductCard({ product }) {
    const { title, price, discountPrice, image, images: rawImages, brand, type } = product;

    // Normalize images: if 'images' array exists use it, otherwise fallback to single 'image' in an array
    const images = rawImages && rawImages.length > 0 ? rawImages : [image];

    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const hasMultipleImages = images.length > 1;

    const nextImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const isPromo = !!discountPrice;

    return (
        <div className={styles.card}>
            <div className={styles.imageWrapper}>
                <Image
                    src={images[currentImageIndex]}
                    alt={`${title} - View ${currentImageIndex + 1}`}
                    width={400}
                    height={400}
                    className={styles.image}
                    key={currentImageIndex} // Force re-render on index change
                    onError={() => {
                        if (currentImageIndex !== 0) {
                            // If a generated image fails, revert to main image
                            setCurrentImageIndex(0);
                        }
                    }}
                />

                {hasMultipleImages && (
                    <>
                        <button className={`${styles.navButton} ${styles.prevButton}`} onClick={prevImage} aria-label="Previous image">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button className={`${styles.navButton} ${styles.nextButton}`} onClick={nextImage} aria-label="Next image">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </>
                )}

                <span className={styles.brandBadge}>{brand}</span>
                {isPromo && <span className={styles.promoBadge}>Sale</span>}
            </div>
            <div className={styles.details}>
                <h3 className={styles.title}>{title}</h3>
                <span className={styles.price}>
                    {discountPrice ? (
                        <>
                            <span className={styles.oldPrice}>R$ {formatPrice(price)}</span>
                            <span className={styles.newPrice}>R$ {formatPrice(discountPrice)}</span>
                        </>
                    ) : (
                        `R$ ${formatPrice(price)}`
                    )}
                </span>
                <a href={product.link} target="_blank" rel="noopener noreferrer" className={styles.button}>
                    View
                </a>
            </div>
        </div>
    );
}
