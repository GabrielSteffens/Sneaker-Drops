"use client";

import { useEffect, useState } from 'react';
import styles from './UpdateStatus.module.css';

export default function UpdateStatus() {
    const [status, setStatus] = useState('idle');

    useEffect(() => {
        // Check status periodically
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/update-status');
                if (res.ok) {
                    const data = await res.json();
                    setStatus(data.status); // 'running' or 'complete'
                }
            } catch (e) {
                console.error("Failed to check status", e);
            }
        };

        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    if (status !== 'running') return null;

    return (
        <div className={styles.statusContainer}>
            <div className={styles.spinner}></div>
            <span>Updating product images...</span>
        </div>
    );
}
