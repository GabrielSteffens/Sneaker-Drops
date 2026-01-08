import { getProducts } from '@/lib/data';
import Header from '@/components/Header';
import FilterableProductGrid from '@/components/FilterableProductGrid';
import PageTitle from '@/components/PageTitle';
import styles from '../page.module.css';

// Force dynamic rendering since we are reading from a local file that changes
export const dynamic = 'force-dynamic';

export default async function Promotions() {
    const products = await getProducts();

    // Filter products
    const promotions = products.filter(p => p.type === 'promotion');

    return (
        <main className={styles.main}>
            <Header />

            <PageTitle pageKey="promotions" />

            <div className={styles.content}>
                <div className={styles.promotionsSection} style={{ background: 'transparent' }}>
                    <FilterableProductGrid titleKey="deals" products={promotions} />
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
