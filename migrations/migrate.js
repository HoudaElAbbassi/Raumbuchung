// migrations/migrate.js - Ihre leere Datei vervollständigen
import { neon } from '@netlify/neon';

const sql = neon(process.env.DATABASE_URL);

// Datenbank-Schema erstellen
const createTables = async () => {
    console.log('🔧 Erstelle Datenbank-Tabellen...');

    // Users Tabelle
    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Bookings Tabelle
    await sql`
        CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            is_recurring BOOLEAN DEFAULT FALSE,
            recurring_group VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Indizes erstellen
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;

    console.log('✅ Tabellen erfolgreich erstellt');
};

// Demo-Daten einfügen
const insertDemoData = async () => {
    console.log('📝 Füge Demo-Daten ein...');

    // Prüfe ob bereits Benutzer existieren
    const existingUsers = await sql`SELECT COUNT(*) as count FROM users`;

    if (existingUsers[0].count === '0') {
        // Demo-Benutzer
        const demoUsers = [
            { name: 'Anna Schmidt', email: 'anna@verein.de', password: 'demo123', role: 'user' },
            { name: 'Max Müller', email: 'max@verein.de', password: 'demo123', role: 'admin' },
            { name: 'Lisa Weber', email: 'lisa@verein.de', password: 'demo123', role: 'user' },
            { name: 'Thomas Klein', email: 'thomas@verein.de', password: 'demo123', role: 'user' },
            { name: 'Sarah Fischer', email: 'sarah@verein.de', password: 'demo123', role: 'user' }
        ];

        for (const user of demoUsers) {
            await sql`
                INSERT INTO users (name, email, password_hash, role)
                VALUES (${user.name}, ${user.email}, ${user.password}, ${user.role})
            `;
        }

        console.log(`✅ ${demoUsers.length} Demo-Benutzer eingefügt`);

        // Demo-Buchungen
        await sql`
            INSERT INTO bookings (user_id, title, description, date, start_time, end_time)
            VALUES 
            (1, 'Yoga-Kurs', 'Wöchentlicher Yoga-Kurs', '2025-01-15', '18:00', '19:30'),
            (2, 'Vorstandssitzung', 'Monatliche Vorstandssitzung', '2025-01-16', '19:00', '21:00'),
            (3, 'Buchclub', 'Monatliches Treffen', '2025-01-17', '15:00', '17:00')
        `;

        console.log('✅ Demo-Buchungen eingefügt');
    } else {
        console.log('ℹ️ Benutzer bereits vorhanden - überspringe Demo-Daten');
    }
};

// Hauptfunktion
const runMigration = async () => {
    try {
        console.log('🚀 Starte Datenbank-Migration...');

        await createTables();
        await insertDemoData();

        console.log('🎉 Migration erfolgreich abgeschlossen!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration fehlgeschlagen:', error);
        process.exit(1);
    }
};

// CLI-Ausführung
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigration();
}