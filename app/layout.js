import { Outfit } from "next/font/google";
import "./globals.css";

import Providers from "@/components/Providers";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata = {
    title: "Sneaker Drops | All Releases in One Place",
    description: "The ultimate sneaker discovery hub. New releases from Nike, Adidas, Vans and more.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={outfit.className}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
