import Header from '@/components/Header';
import Hero from '@/components/Hero';
import styles from './page.module.css';

// Force dynamic rendering since we are reading from a local file that changes
export const dynamic = 'force-dynamic';

export default function Home() {
    return (
        <main className={styles.main}>
            <Header />
            <Hero />

            <footer className={styles.footer} style={{ marginTop: 'auto' }}>
                <div className="container">
                    <p>© 2026 SneakerDrops. The Discovery Hub.</p>
                </div>
            </footer>
        </main>
    );
}
