import Image from 'next/image';
import styles from './ProductCard.module.css';

const formatPrice = (price) => {
    return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ProductCard({ product }) {
    const { title, price, discountPrice, image, brand, type } = product;
    const isPromo = !!discountPrice;

    return (
        <div className={styles.card}>
            <div className={styles.imageWrapper}>
                <Image
                    src={image}
                    alt={title}
                    width={400}
                    height={400}
                    className={styles.image}
                />
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
