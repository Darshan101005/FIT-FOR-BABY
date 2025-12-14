
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

                {/* Primary SEO Meta Tags */}
                <title>Fit For Baby | FitForBaby - Pregnancy Wellness & Fertility Health App</title>
                <meta name="title" content="Fit For Baby | FitForBaby - Pregnancy Wellness & Fertility Health App" />
                <meta name="description" content="Fit For Baby (FitForBaby) - Your comprehensive pregnancy wellness app. Track health, diet, exercise, fertility, and couple wellness. Developed by Sri Ramachandra Faculty of Nursing. Download the fit for baby app today!" />
                <meta name="keywords" content="fit for baby, fitforbaby, fit-for-baby, fit 4 baby, pregnancy app, pregnancy wellness, fertility tracking, couple health app, pregnancy health tracker, maternity app, prenatal care, pregnancy diet, pregnancy exercise, IUI tracking, fertility app, pregnancy nutrition, expecting parents app, pregnancy fitness, maternal health, baby health, pregnancy tracker India, fit for baby app, fitforbaby app, sri ramachandra nursing" />
                <meta name="author" content="Sri Ramachandra Faculty of Nursing" />
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
                <meta name="language" content="English, Tamil" />
                <meta name="revisit-after" content="3 days" />
                <meta name="rating" content="general" />
                <link rel="canonical" href="https://fitforbaby.site" />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://fitforbaby.site/" />
                <meta property="og:title" content="Fit For Baby | FitForBaby - Pregnancy Wellness App" />
                <meta property="og:description" content="Fit For Baby - Your comprehensive pregnancy wellness app. Track health, diet, exercise & fertility. Download the fit for baby app today!" />
                <meta property="og:image" content="https://fitforbaby.site/assets/images/withbg.png" />
                <meta property="og:site_name" content="Fit For Baby" />
                <meta property="og:locale" content="en_IN" />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content="https://fitforbaby.site/" />
                <meta property="twitter:title" content="Fit For Baby | FitForBaby - Pregnancy Wellness App" />
                <meta property="twitter:description" content="Fit For Baby - Your comprehensive pregnancy wellness app. Track health, diet, exercise & fertility." />
                <meta property="twitter:image" content="https://fitforbaby.site/assets/images/withbg.png" />

                {/* Structured Data (JSON-LD) for SEO Enhancements */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "SoftwareApplication",
                            "name": "Fit For Baby",
                            "alternateName": ["FitForBaby", "Fit-For-Baby", "Fit 4 Baby", "FitForBaby App"],
                            "applicationCategory": "HealthApplication",
                            "operatingSystem": "Android, Web (PWA)",
                            "author": {
                                "@type": "Organization",
                                "name": "Sri Ramachandra Faculty of Nursing",
                                "url": "https://fitforbaby.site"
                            },
                            "description": "Fit For Baby is a comprehensive pregnancy wellness app. Track your health, diet, exercise, fertility, and stay fit during your pregnancy journey. Developed by Sri Ramachandra Faculty of Nursing.",
                            "url": "https://fitforbaby.site",
                            "downloadUrl": "https://fitforbaby.site",
                            "screenshot": "https://fitforbaby.site/assets/images/withbg.png",
                            "softwareVersion": "1.0.0",
                            "offers": {
                                "@type": "Offer",
                                "price": "0",
                                "priceCurrency": "INR"
                            },
                            "aggregateRating": {
                                "@type": "AggregateRating",
                                "ratingValue": "4.8",
                                "ratingCount": "100"
                            },
                            "keywords": "fit for baby, fitforbaby, pregnancy app, fertility tracking, pregnancy wellness, couple health, maternal health"
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
