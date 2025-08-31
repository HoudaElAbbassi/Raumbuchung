import React from 'react'
import ReactDOM from 'react-dom/client'
import RoomBookingApp from './RoomBookingApp.jsx'
import './index.css'

// Error Boundary für bessere Fehlerbehandlung
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        console.error('Vereinsraum App Error:', error);
        console.error('Error Info:', errorInfo);

        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
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

// Service Worker Registration für PWA Features (optional)
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
    // Messe App-Ladezeit
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const loadTime = performance.now();
                console.log(`Vereinsraum App geladen in ${Math.round(loadTime)}ms`);

                // Optional: Sende Metriken an Analytics
                if (loadTime > 3000) {
                    console.warn('App-Ladezeit über 3 Sekunden - Performance prüfen');
                }
            }, 0);
        });
    }
};

// Initialize App State Recovery
const initStateRecovery = () => {
    // Stelle App-State nach Absturz wieder her
    window.addEventListener('beforeunload', () => {
        // Speichere kritische App-Daten
        const appState = {
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        sessionStorage.setItem('vereinsraum_recovery', JSON.stringify(appState));
    });

    // Prüfe auf vorherigen Absturz
    const recoveryData = sessionStorage.getItem('vereinsraum_recovery');
    if (recoveryData) {
        const data = JSON.parse(recoveryData);
        const timeDiff = Date.now() - data.timestamp;

        // Wenn weniger als 30 Sekunden vergangen, könnte es ein Absturz gewesen sein
        if (timeDiff < 30000) {
            console.log('App Recovery: Möglicher vorheriger Absturz erkannt');
        }

        // Cleanup
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

        // Zeige Warnung für sehr alte Browser
        if (missingFeatures.includes('fetch') || missingFeatures.includes('Promise')) {
            const warningDiv = document.createElement('div');
            warningDiv.innerHTML = `
        <div style="background-color: #fef3c7; color: #92400e; padding: 1rem; text-align: center; font-family: sans-serif;">
          <strong>⚠️ Browser-Warnung:</strong> Ihr Browser ist möglicherweise zu alt. 
          Bitte aktualisieren Sie auf eine neuere Version für die beste Erfahrung.
        </div>
      `;
            document.body.insertBefore(warningDiv, document.body.firstChild);
        }
    }
};

// Development Helpers
const initDevelopmentHelpers = () => {
    if (process.env.NODE_ENV === 'development') {
        // React DevTools Nachricht
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
            }
        };

        console.log(
            '%cDebug-Funktionen verfügbar unter window.vereinsraumDebug',
            'color: #7c3aed; font-size: 12px;'
        );
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

        // Service Worker (für PWA Features)
        registerServiceWorker();

        // React App rendern
        const root = ReactDOM.createRoot(document.getElementById('root'));

        root.render(
            <React.StrictMode>
                <ErrorBoundary>
                    <RoomBookingApp />
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