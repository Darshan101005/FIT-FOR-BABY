
import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every
 * web page during static rendering.
 * The contents of this function will be rendered in the <head> of the HTML.
 */
export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

                {/* 
          This is the critical Google Verification Tag.
          Placed here to ensure it exists in the initial static HTML.
        */}
                <meta name="google-site-verification" content="OZ1fHfsqBmfx2MLJIc1EIpJlYt5WnC5YAx9mVBu9S6g" />

                {/* Structured Data (JSON-LD) for SEO Enhancements */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "SoftwareApplication",
                            "name": "Fit For Baby | Pregnancy Wellness App",
                            "applicationCategory": "HealthApplication",
                            "operatingSystem": "Android, Web (PWA)",
                            "author": {
                                "@type": "Organization",
                                "name": "Sri Ramachandra Faculty of Nursing"
                            },
                            "description": "A comprehensive pregnancy wellness app. Track your health, get expert advice, and stay fit during your journey."
                        })
                    }}
                />

                {/* Link the PWA manifest */}
                <link rel="manifest" href="/manifest.json" />

                {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
                <ScrollViewStyleReset />

                {/* Add any additional <head> elements that you want globally available on web... */}
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}
