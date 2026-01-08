import { getProducts } from '@/lib/data';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import ProductGrid from '@/components/ProductGrid';
import styles from './page.module.css';

// Force dynamic rendering since we are reading from a local file that changes
export const dynamic = 'force-dynamic';

export default async function Home() {
    return (
        <main className={styles.main}>
            <Header />
            <Hero />

            <footer className={styles.footer} Style={{ marginTop: 'auto' }}>
                <div className="container">
                    <p>© 2026 SneakerDrops. The Discovery Hub.</p>
                </div>
            </footer>
        </main>
    );
}
