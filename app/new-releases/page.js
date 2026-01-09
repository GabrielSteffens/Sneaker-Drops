import { getProducts } from '@/lib/data';
import Header from '@/components/Header';
import FilterableProductGrid from '@/components/FilterableProductGrid';
import styles from '../page.module.css';

// Force dynamic rendering since we are reading from a local file that changes
export const dynamic = 'force-dynamic';

export default async function NewReleases() {
    const products = await getProducts();

    // Filter products
    const newReleases = products.filter(p => p.type === 'release');

    return (
        <main className={styles.main}>
            <Header />

            <div className={styles.content}>
                <div id="new-releases">
                    <FilterableProductGrid titleKey="newReleases" products={newReleases} />
                </div>
            </div>

            <footer className={styles.footer}>
                <div className="container">
                    <p>© 2026 SneakerDrops. The Discovery Hub.</p>
                </div>
            </footer>
        </main>
    );
}
