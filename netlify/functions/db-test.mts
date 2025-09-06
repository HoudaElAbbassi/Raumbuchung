// netlify/functions/db-test.mts
import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

const sql = neon();

export default async (req: Request, context: Context) => {
    const url = new URL(req.url);
    const method = req.method;

    // CORS Headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    try {
        console.log('🔍 Starte Datenbankverbindungstest...');

        const testResults = {
            timestamp: new Date().toISOString(),
            tests: [],
            overall: 'unknown'
        };

        // Test 1: Einfache Verbindung
        try {
            console.log('Test 1: Einfache Datenbankverbindung...');
            const result = await sql`SELECT 1 as test_value, NOW() as current_time`;

            testResults.tests.push({
                name: 'Datenbankverbindung',
                status: 'success',
                message: 'Erfolgreich verbunden',
                data: result[0]
            });

            console.log('✅ Test 1 erfolgreich:', result[0]);
        } catch (error) {
            console.error('❌ Test 1 fehlgeschlagen:', error);
            testResults.tests.push({
                name: 'Datenbankverbindung',
                status: 'error',
                message: error.message,
                error: error.toString()
            });
        }

        // Test 2: Tabellen-Existenz prüfen
        try {
            console.log('Test 2: Prüfe Tabellen-Existenz...');
            const tables = await sql`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `;

            const tableNames = tables.map(t => t.table_name);
            const requiredTables = ['users', 'bookings'];
            const missingTables = requiredTables.filter(table => !tableNames.includes(table));

            if (missingTables.length === 0) {
                testResults.tests.push({
                    name: 'Tabellen-Existenz',
                    status: 'success',
                    message: 'Alle erforderlichen Tabellen gefunden',
                    data: { tables: tableNames, required: requiredTables }
                });
                console.log('✅ Test 2 erfolgreich - Tabellen:', tableNames);
            } else {
                testResults.tests.push({
                    name: 'Tabellen-Existenz',
                    status: 'warning',
                    message: `Fehlende Tabellen: ${missingTables.join(', ')}`,
                    data: { tables: tableNames, missing: missingTables }
                });
                console.log('⚠️ Test 2 - Fehlende Tabellen:', missingTables);
            }
        } catch (error) {
            console.error('❌ Test 2 fehlgeschlagen:', error);
            testResults.tests.push({
                name: 'Tabellen-Existenz',
                status: 'error',
                message: error.message,
                error: error.toString()
            });
        }

        // Test 3: Users Tabelle prüfen (falls vorhanden)
        try {
            console.log('Test 3: Prüfe Users Tabelle...');
            const userCount = await sql`SELECT COUNT(*) as count FROM users`;
            const sampleUsers = await sql`SELECT id, name, email, role FROM users LIMIT 3`;

            testResults.tests.push({
                name: 'Users Tabelle',
                status: 'success',
                message: `${userCount[0].count} Benutzer gefunden`,
                data: {
                    count: userCount[0].count,
                    sample: sampleUsers
                }
            });

            console.log(`✅ Test 3 erfolgreich - ${userCount[0].count} Benutzer, Sample:`, sampleUsers);
        } catch (error) {
            console.error('❌ Test 3 fehlgeschlagen:', error);
            testResults.tests.push({
                name: 'Users Tabelle',
                status: 'error',
                message: 'Users Tabelle nicht verfügbar oder fehlerhaft',
                error: error.toString()
            });
        }

        // Test 4: Bookings Tabelle prüfen (falls vorhanden)
        try {
            console.log('Test 4: Prüfe Bookings Tabelle...');
            const bookingCount = await sql`SELECT COUNT(*) as count FROM bookings`;
            const sampleBookings = await sql`
                SELECT id, title, date, start_time, end_time 
                FROM bookings 
                ORDER BY date DESC 
                LIMIT 3
            `;

            testResults.tests.push({
                name: 'Bookings Tabelle',
                status: 'success',
                message: `${bookingCount[0].count} Buchungen gefunden`,
                data: {
                    count: bookingCount[0].count,
                    sample: sampleBookings
                }
            });

            console.log(`✅ Test 4 erfolgreich - ${bookingCount[0].count} Buchungen, Sample:`, sampleBookings);
        } catch (error) {
            console.error('❌ Test 4 fehlgeschlagen:', error);
            testResults.tests.push({
                name: 'Bookings Tabelle',
                status: 'error',
                message: 'Bookings Tabelle nicht verfügbar oder fehlerhaft',
                error: error.toString()
            });
        }

        // Test 5: Schreibberechtigung testen
        try {
            console.log('Test 5: Teste Schreibberechtigung...');
            const testTableQuery = `
                CREATE TEMP TABLE test_write_permissions (
                    id SERIAL PRIMARY KEY,
                    test_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            await sql(testTableQuery, []);
            await sql`INSERT INTO test_write_permissions (test_data) VALUES ('test')`;
            const testData = await sql`SELECT * FROM test_write_permissions`;

            testResults.tests.push({
                name: 'Schreibberechtigung',
                status: 'success',
                message: 'Schreiben und Lesen funktioniert',
                data: { testRecord: testData[0] }
            });

            console.log('✅ Test 5 erfolgreich - Schreibberechtigung OK');
        } catch (error) {
            console.error('❌ Test 5 fehlgeschlagen:', error);
            testResults.tests.push({
                name: 'Schreibberechtigung',
                status: 'error',
                message: 'Keine Schreibberechtigung',
                error: error.toString()
            });
        }

        // Gesamtergebnis bewerten
        const errorCount = testResults.tests.filter(t => t.status === 'error').length;
        const warningCount = testResults.tests.filter(t => t.status === 'warning').length;

        if (errorCount === 0 && warningCount === 0) {
            testResults.overall = 'success';
        } else if (errorCount === 0 && warningCount > 0) {
            testResults.overall = 'warning';
        } else {
            testResults.overall = 'error';
        }

        console.log('📊 Testergebnisse:', {
            gesamt: testResults.overall,
            erfolgreich: testResults.tests.filter(t => t.status === 'success').length,
            warnungen: warningCount,
            fehler: errorCount
        });

        return new Response(JSON.stringify({
            success: true,
            message: 'Datenbanktest abgeschlossen',
            results: testResults
        }), {
            status: 200,
            headers
        });

    } catch (error) {
        console.error('💥 Allgemeiner Fehler beim Datenbanktest:', error);

        return new Response(JSON.stringify({
            success: false,
            error: 'Datenbanktest fehlgeschlagen',
            message: error.message,
            details: error.toString(),
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers
        });
    }
};

// Netlify Function Konfiguration
export const config: Config = {
    path: "/api/db-test"
};