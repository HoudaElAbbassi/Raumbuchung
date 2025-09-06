// src/main.jsx - Vervollständigt mit DB Test Integration
import React from 'react'
import ReactDOM from 'react-dom/client'
import RoomBookingApp from './RoomBookingApp.jsx'
import '../index.css'

// Error Boundary für bessere Fehlerbehandlung
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Vereinsraum App Error:', error);
        console.error('Error Info:', errorInfo);

        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
                        <div className="text-red-600 mb-4">
                            <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mb-2">
                            Oops! Etwas ist schiefgelaufen
                        </h1>
                        <p className="text-gray-600 mb-4">
                            Die Vereinsraum-App konnte nicht geladen werden.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Seite neu laden
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.reload();
                                }}
                                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Daten zurücksetzen & neu laden
                            </button>
                            <button
                                onClick={() => {
                                    window.location.href = window.location.origin + '?mode=dbtest';
                                }}
                                className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Datenbank-Test öffnen
                            </button>
                        </div>

                        {/* Error Details für Entwicklung */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                                    Fehler-Details (nur in Entwicklung sichtbar)
                                </summary>
                                <div className="bg-gray-100 p-3 rounded text-xs font-mono text-gray-800 overflow-auto max-h-32">
                                    <strong>Error:</strong> {this.state.error.toString()}
                                    <br />
                                    <strong>Stack:</strong> {this.state.error.stack}
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// App Mode Detection
const getAppMode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    // Debug-Modi für Entwicklung
    if (mode === 'dbtest') return 'database-test';
    if (mode === 'debug') return 'debug';

    // Standard-Modus
    return 'app';
};

// Debug Panel Component
const DebugPanel = () => {
    const [debugInfo, setDebugInfo] = React.useState(null);

    React.useEffect(() => {
        const info = {
                timestamp: new Date().toISOString(),
                environment: {
                    nodeEnv: process.env.NODE_ENV,
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    localStorage: {
                        available: typeof Storage !== 'undefined',
                        items: localStorage.length
                    },
                    sessionStorage: {
                        available: typeof sessionStorage !== 'undefined',
                        items: sessionStorage?.length || 0
                    }
                },
                features: {
                    fetch: typeof fetch !== 'undefined',
                    promises: typeof Promise !== 'undefined',
                serviceWorker: 'serviceWorker' in navigator
            }
    };

        setDebugInfo(info);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">🐛 Debug Panel</h1>
                    <div className="flex gap-3 mb-6">
                        <button
                            onClick={() => window.location.href = window.location.origin}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Zur Hauptapp
                        </button>
                        <button
                            onClick={() => window.location.href = window.location.origin + '?mode=dbtest'}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                        >
                            Datenbank-Test
                        </button>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                sessionStorage.clear();
                                window.location.reload();
                            }}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                        >
                            Alle Daten löschen
                        </button>
                    </div>
                </div>

                {debugInfo && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">System-Informationen</h2>
                        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
                            {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

// App Mode Router
const AppModeRouter = () => {
    const mode = getAppMode();

    switch (mode) {
        case 'database-test':
            return (
                <div className="min-h-screen bg-gray-50 p-4">
                    <div className="mb-6 text-center">
                        <button
                            onClick={() => window.location.href = window.location.origin}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            ← Zurück zur Hauptapp
                        </button>
                    </div>
                    <DatabaseTestPanel />
                </div>
            );

        case 'debug':
            return <DebugPanel />;

        default:
            return <RoomBookingApp />;
    }
};

// Service Worker Registration
const registerServiceWorker = () => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then((registration) => {
                    console.log('SW registered: ', registration);
                })
                .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
};

// App Performance Monitoring
const initPerformanceMonitoring = () => {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const loadTime = performance.now();
                console.log(`Vereinsraum App geladen in ${Math.round(loadTime)}ms`);

                if (loadTime > 3000) {
                    console.warn('App-Ladezeit über 3 Sekunden - Performance prüfen');
                }
            }, 0);
        });
    }
};

// Database Connection Test Helper
const quickDatabaseTest = async () => {
    try {
        const response = await fetch('/api/db-test');
        const result = await response.json();

        if (result.success) {
            console.log('✅ Datenbank-Schnelltest erfolgreich');
            return true;
        } else {
            console.warn('⚠️ Datenbank-Schnelltest mit Warnungen');
            return false;
        }
    } catch (error) {
        console.error('❌ Datenbank-Schnelltest fehlgeschlagen:', error);
        return false;
    }
};

// Initialize App State Recovery
const initStateRecovery = () => {
    window.addEventListener('beforeunload', () => {
        const appState = {
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        sessionStorage.setItem('vereinsraum_recovery', JSON.stringify(appState));
    });

    const recoveryData = sessionStorage.getItem('vereinsraum_recovery');
    if (recoveryData) {
        const data = JSON.parse(recoveryData);
        const timeDiff = Date.now() - data.timestamp;

        if (timeDiff < 30000) {
            console.log('App Recovery: Möglicher vorheriger Absturz erkannt');
        }

        sessionStorage.removeItem('vereinsraum_recovery');
    }
};

// Browser Compatibility Checks
const checkBrowserCompatibility = () => {
    const requiredFeatures = [
        'localStorage',
        'sessionStorage',
        'fetch',
        'Promise',
        'Map',
        'Set'
    ];

    const missingFeatures = requiredFeatures.filter(feature => !(feature in window));

    if (missingFeatures.length > 0) {
        console.warn('Fehlende Browser-Features:', missingFeatures);

        if (missingFeatures.includes('fetch') || missingFeatures.includes('Promise')) {
            const warningDiv = document.createElement('div');
            warningDiv.innerHTML = `
                <div style="background-color: #fef3c7; color: #92400e; padding: 1rem; text-align: center; font-family: sans-serif; position: fixed; top: 0; left: 0; right: 0; z-index: 9999;">
                    <strong>⚠️ Browser-Warnung:</strong> Ihr Browser ist möglicherweise zu alt. 
                    Bitte aktualisieren Sie auf eine neuere Version für die beste Erfahrung.
                    <button onclick="this.parentElement.parentElement.remove()" style="margin-left: 1rem; padding: 0.25rem 0.5rem; background: #92400e; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">×</button>
                </div>
            `;
            document.body.insertBefore(warningDiv, document.body.firstChild);
        }
    }
};

// Development Helpers
const initDevelopmentHelpers = () => {
    if (process.env.NODE_ENV === 'development') {
        console.log(
            '%c🚀 Vereinsraum Buchungs-App',
            'color: #3b82f6; font-size: 16px; font-weight: bold;'
        );
        console.log(
            '%cEntwicklungsmodus aktiv - React DevTools verfügbar',
            'color: #059669; font-size: 12px;'
        );

        // Global Helper Functions für Debugging
        window.vereinsraumDebug = {
            clearAllData: () => {
                localStorage.clear();
                sessionStorage.clear();
                console.log('Alle lokalen Daten gelöscht');
            },
            showStorageData: () => {
                console.log('LocalStorage:', localStorage);
                console.log('Buchungen:', JSON.parse(localStorage.getItem('vereinsraum_bookings') || '[]'));
                console.log('Aktueller User:', JSON.parse(localStorage.getItem('vereinsraum_currentUser') || 'null'));
            },
            generateTestBookings: () => {
                const testBookings = [];
                const today = new Date();

                for (let i = 0; i < 10; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);

                    testBookings.push({
                        id: Date.now() + i,
                        userId: Math.floor(Math.random() * 5) + 1,
                        userName: `Test User ${i + 1}`,
                        title: `Test Buchung ${i + 1}`,
                        date: date.toISOString().split('T')[0],
                        startTime: `${9 + i}:00`,
                        endTime: `${10 + i}:00`,
                        description: `Test-Beschreibung für Buchung ${i + 1}`
                    });
                }

                localStorage.setItem('vereinsraum_bookings', JSON.stringify(testBookings));
                console.log('Test-Buchungen generiert:', testBookings);
                window.location.reload();
            },
            testDatabase: async () => {
                console.log('🔍 Starte Datenbank-Test...');
                const result = await quickDatabaseTest();
                console.log('Test-Ergebnis:', result);
                return result;
            },
            openDatabaseTest: () => {
                window.location.href = window.location.origin + '?mode=dbtest';
            },
            openDebugPanel: () => {
                window.location.href = window.location.origin + '?mode=debug';
            }
        };

        console.log(
            '%cDebug-Funktionen verfügbar unter window.vereinsraumDebug',
            'color: #7c3aed; font-size: 12px;'
        );

        // Auto-Datenbank-Test beim Start
        setTimeout(() => {
            quickDatabaseTest().then(result => {
                if (!result) {
                    console.log(
                        '%c💡 Tipp: Starten Sie den Datenbank-Test mit window.vereinsraumDebug.openDatabaseTest()',
                        'color: #f59e0b; font-size: 12px;'
                    );
                }
            });
        }, 2000);
    }
};

// Main App Initialization
const initApp = () => {
    try {
        // Browser Compatibility Check
        checkBrowserCompatibility();

        // Performance Monitoring
        initPerformanceMonitoring();

        // State Recovery
        initStateRecovery();

        // Development Helpers
        initDevelopmentHelpers();

        // Service Worker
        registerServiceWorker();

        // React App rendern
        const root = ReactDOM.createRoot(document.getElementById('root'));

        root.render(
            <React.StrictMode>
                <ErrorBoundary>
                    <AppModeRouter />
                </ErrorBoundary>
            </React.StrictMode>
        );

        console.log('✅ Vereinsraum Buchungs-App erfolgreich initialisiert');

    } catch (error) {
        console.error('❌ Fehler beim Initialisieren der App:', error);

        // Fallback: Zeige einfache Fehlermeldung
        document.getElementById('root').innerHTML = `
            <div style="
                min-height: 100vh; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                background-color: #f9fafb;
                font-family: system-ui, sans-serif;
                padding: 1rem;
            ">
                <div style="
                    background-color: white; 
                    padding: 2rem; 
                    border-radius: 0.5rem; 
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    max-width: 400px;
                    width: 100%;
                ">
                    <h1 style="color: #dc2626; margin-bottom: 1rem;">Fehler beim Laden</h1>
                    <p style="color: #6b7280; margin-bottom: 1.5rem;">
                        Die Vereinsraum-App konnte nicht geladen werden.
                    </p>
                    <div style="display: flex; gap: 0.5rem; flex-direction: column;">
                        <button 
                            onclick="window.location.reload()" 
                            style="
                                background-color: #3b82f6; 
                                color: white; 
                                padding: 0.75rem 1.5rem; 
                                border: none; 
                                border-radius: 0.5rem; 
                                cursor: pointer;
                                font-weight: 500;
                            "
                        >
                            Seite neu laden
                        </button>
                        <button 
                            onclick="window.location.href = window.location.origin + '?mode=dbtest'" 
                            style="
                                background-color: #7c3aed; 
                                color: white; 
                                padding: 0.75rem 1.5rem; 
                                border: none; 
                                border-radius: 0.5rem; 
                                cursor: pointer;
                                font-weight: 500;
                            "
                        >
                            Datenbank-Test
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
};

// App starten wenn DOM bereit ist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}