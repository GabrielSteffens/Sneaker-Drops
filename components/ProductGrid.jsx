import ProductCard from './ProductCard';
import styles from './ProductGrid.module.css';

export default function ProductGrid({ title, products }) {
    if (!products || products.length === 0) return null;

    return (
        <section className={styles.section}>
            <div className="container">
                <h2 className={styles.title}>{title}</h2>
                <div className={styles.grid}>
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </section>
    );
}
