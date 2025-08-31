import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

const sql = neon();

export default async (req: Request, context: Context) => {
    const url = new URL(req.url);
    const method = req.method;

    // CORS Headers für Cross-Origin Requests
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle preflight requests (OPTIONS)
    if (method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    try {
        // Extrahiere den Pfad (login, register, verify, users)
        const pathParts = url.pathname.split('/');
        const action = pathParts[pathParts.length - 1];

        console.log(`Auth API - Method: ${method}, Action: ${action}`);

        switch (method) {
            case 'POST':
                if (action === 'login') {
                    // Benutzer-Login
                    const { email, password } = await req.json();

                    if (!email || !password) {
                        return new Response(JSON.stringify({
                            error: 'E-Mail und Passwort sind erforderlich'
                        }), {
                            status: 400,
                            headers
                        });
                    }

                    try {
                        // Benutzer aus Datenbank suchen
                        const users = await sql`
              SELECT id, name, email, role, created_at 
              FROM users 
              WHERE email = ${email} AND password_hash = ${password}
              LIMIT 1
            `;

                        if (users.length === 0) {
                            return new Response(JSON.stringify({
                                error: 'Ungültige Anmeldedaten'
                            }), {
                                status: 401,
                                headers
                            });
                        }

                        const user = users[0];

                        // Erfolgreiche Anmeldung
                        return new Response(JSON.stringify({
                            success: true,
                            user: {
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                role: user.role,
                                createdAt: user.created_at
                            },
                            token: `netlify-token-${user.id}-${Date.now()}`, // Einfacher Token
                            message: 'Erfolgreich angemeldet'
                        }), {
                            status: 200,
                            headers
                        });

                    } catch (dbError) {
                        console.error('Datenbank-Fehler beim Login:', dbError);
                        return new Response(JSON.stringify({
                            error: 'Anmeldung fehlgeschlagen - Datenbankfehler'
                        }), {
                            status: 500,
                            headers
                        });
                    }
                }

                if (action === 'register') {
                    // Neuen Benutzer registrieren (für Admins)
                    const { name, email, password, role = 'user' } = await req.json();

                    if (!name || !email || !password) {
                        return new Response(JSON.stringify({
                            error: 'Name, E-Mail und Passwort sind erforderlich'
                        }), {
                            status: 400,
                            headers
                        });
                    }

                    try {
                        // Prüfe ob E-Mail bereits existiert
                        const existingUsers = await sql`
              SELECT id FROM users WHERE email = ${email} LIMIT 1
            `;

                        if (existingUsers.length > 0) {
                            return new Response(JSON.stringify({
                                error: 'Diese E-Mail-Adresse ist bereits registriert'
                            }), {
                                status: 409,
                                headers
                            });
                        }

                        // Neuen Benutzer erstellen
                        const newUsers = await sql`
              INSERT INTO users (name, email, password_hash, role)
              VALUES (${name}, ${email}, ${password}, ${role})
              RETURNING id, name, email, role, created_at
            `;

                        const newUser = newUsers[0];

                        return new Response(JSON.stringify({
                            success: true,
                            user: {
                                id: newUser.id,
                                name: newUser.name,
                                email: newUser.email,
                                role: newUser.role,
                                createdAt: newUser.created_at
                            },
                            message: 'Benutzer erfolgreich erstellt'
                        }), {
                            status: 201,
                            headers
                        });

                    } catch (dbError) {
                        console.error('Datenbank-Fehler bei Registrierung:', dbError);
                        return new Response(JSON.stringify({
                            error: 'Registrierung fehlgeschlagen - Datenbankfehler'
                        }), {
                            status: 500,
                            headers
                        });
                    }
                }

                break;

            case 'GET':
                if (action === 'users') {
                    // Alle Benutzer abrufen (für Admin-Panel)
                    try {
                        const users = await sql`
              SELECT id, name, email, role, created_at 
              FROM users 
              ORDER BY name ASC
            `;

                        return new Response(JSON.stringify(users), {
                            status: 200,
                            headers
                        });

                    } catch (dbError) {
                        console.error('Datenbank-Fehler beim Abrufen der Benutzer:', dbError);
                        return new Response(JSON.stringify({
                            error: 'Fehler beim Laden der Benutzerliste'
                        }), {
                            status: 500,
                            headers
                        });
                    }
                }

                if (action === 'verify') {
                    // Token verifizieren
                    const authHeader = req.headers.get('Authorization');
                    const token = authHeader?.replace('Bearer ', '');

                    if (!token || !token.startsWith('netlify-token-')) {
                        return new Response(JSON.stringify({
                            error: 'Ungültiger oder fehlender Token'
                        }), {
                            status: 401,
                            headers
                        });
                    }

                    try {
                        // Extrahiere User-ID aus Token
                        const tokenParts = token.split('-');
                        const userId = parseInt(tokenParts[2]);

                        if (isNaN(userId)) {
                            return new Response(JSON.stringify({
                                error: 'Ungültiges Token-Format'
                            }), {
                                status: 401,
                                headers
                            });
                        }

                        // Benutzer aus Datenbank laden
                        const users = await sql`
              SELECT id, name, email, role, created_at 
              FROM users 
              WHERE id = ${userId}
              LIMIT 1
            `;

                        if (users.length === 0) {
                            return new Response(JSON.stringify({
                                error: 'Benutzer nicht gefunden'
                            }), {
                                status: 401,
                                headers
                            });
                        }

                        const user = users[0];

                        return new Response(JSON.stringify({
                            success: true,
                            user: {
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                role: user.role,
                                createdAt: user.created_at
                            }
                        }), {
                            status: 200,
                            headers
                        });

                    } catch (dbError) {
                        console.error('Datenbank-Fehler bei Token-Verifikation:', dbError);
                        return new Response(JSON.stringify({
                            error: 'Token-Verifikation fehlgeschlagen'
                        }), {
                            status: 500,
                            headers
                        });
                    }
                }

                if (action === 'profile') {
                    // Benutzerprofil abrufen
                    const authHeader = req.headers.get('Authorization');
                    const token = authHeader?.replace('Bearer ', '');

                    if (!token || !token.startsWith('netlify-token-')) {
                        return new Response(JSON.stringify({
                            error: 'Authentifizierung erforderlich'
                        }), {
                            status: 401,
                            headers
                        });
                    }

                    try {
                        const tokenParts = token.split('-');
                        const userId = parseInt(tokenParts[2]);

                        const users = await sql`
              SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.role, 
                u.created_at,
                COUNT(b.id) as booking_count
              FROM users u
              LEFT JOIN bookings b ON u.id = b.user_id
              WHERE u.id = ${userId}
              GROUP BY u.id, u.name, u.email, u.role, u.created_at
              LIMIT 1
            `;

                        if (users.length === 0) {
                            return new Response(JSON.stringify({
                                error: 'Benutzer nicht gefunden'
                            }), {
                                status: 404,
                                headers
                            });
                        }

                        return new Response(JSON.stringify({
                            success: true,
                            profile: users[0]
                        }), {
                            status: 200,
                            headers
                        });

                    } catch (dbError) {
                        console.error('Datenbank-Fehler beim Abrufen des Profils:', dbError);
                        return new Response(JSON.stringify({
                            error: 'Profil konnte nicht geladen werden'
                        }), {
                            status: 500,
                            headers
                        });
                    }
                }

                break;

            case 'PUT':
                if (action === 'profile') {
                    // Benutzerprofil aktualisieren
                    const authHeader = req.headers.get('Authorization');
                    const token = authHeader?.replace('Bearer ', '');

                    if (!token || !token.startsWith('netlify-token-')) {
                        return new Response(JSON.stringify({
                            error: 'Authentifizierung erforderlich'
                        }), {
                            status: 401,
                            headers
                        });
                    }

                    const { name, email } = await req.json();

                    if (!name || !email) {
                        return new Response(JSON.stringify({
                            error: 'Name und E-Mail sind erforderlich'
                        }), {
                            status: 400,
                            headers
                        });
                    }

                    try {
                        const tokenParts = token.split('-');
                        const userId = parseInt(tokenParts[2]);

                        // Prüfe ob neue E-Mail bereits von anderem Benutzer verwendet wird
                        const existingUsers = await sql`
              SELECT id FROM users WHERE email = ${email} AND id != ${userId} LIMIT 1
            `;

                        if (existingUsers.length > 0) {
                            return new Response(JSON.stringify({
                                error: 'Diese E-Mail-Adresse wird bereits verwendet'
                            }), {
                                status: 409,
                                headers
                            });
                        }

                        // Benutzerdaten aktualisieren
                        const updatedUsers = await sql`
              UPDATE users 
              SET name = ${name}, email = ${email}, updated_at = CURRENT_TIMESTAMP
              WHERE id = ${userId}
              RETURNING id, name, email, role, created_at, updated_at
            `;

                        if (updatedUsers.length === 0) {
                            return new Response(JSON.stringify({
                                error: 'Benutzer nicht gefunden'
                            }), {
                                status: 404,
                                headers
                            });
                        }

                        return new Response(JSON.stringify({
                            success: true,
                            user: updatedUsers[0],
                            message: 'Profil erfolgreich aktualisiert'
                        }), {
                            status: 200,
                            headers
                        });

                    } catch (dbError) {
                        console.error('Datenbank-Fehler beim Aktualisieren des Profils:', dbError);
                        return new Response(JSON.stringify({
                            error: 'Profil konnte nicht aktualisiert werden'
                        }), {
                            status: 500,
                            headers
                        });
                    }
                }

                break;

            case 'DELETE':
                if (action === 'user') {
                    // Benutzer löschen (nur für Admins)
                    const authHeader = req.headers.get('Authorization');
                    const token = authHeader?.replace('Bearer ', '');
                    const userIdToDelete = parseInt(url.searchParams.get('id') || '0');

                    if (!token || !token.startsWith('netlify-token-')) {
                        return new Response(JSON.stringify({
                            error: 'Authentifizierung erforderlich'
                        }), {
                            status: 401,
                            headers
                        });
                    }

                    try {
                        // Prüfe Admin-Berechtigung
                        const tokenParts = token.split('-');
                        const currentUserId = parseInt(tokenParts[2]);

                        const currentUsers = await sql`
              SELECT role FROM users WHERE id = ${currentUserId} LIMIT 1
            `;

                        if (currentUsers.length === 0 || currentUsers[0].role !== 'admin') {
                            return new Response(JSON.stringify({
                                error: 'Admin-Berechtigung erforderlich'
                            }), {
                                status: 403,
                                headers
                            });
                        }

                        // Verhindere Selbstlöschung
                        if (currentUserId === userIdToDelete) {
                            return new Response(JSON.stringify({
                                error: 'Sie können sich nicht selbst löschen'
                            }), {
                                status: 400,
                                headers
                            });
                        }

                        // Benutzer löschen (CASCADE löscht auch alle Buchungen)
                        const deletedUsers = await sql`
              DELETE FROM users 
              WHERE id = ${userIdToDelete}
              RETURNING name
            `;

                        if (deletedUsers.length === 0) {
                            return new Response(JSON.stringify({
                                error: 'Benutzer nicht gefunden'
                            }), {
                                status: 404,
                                headers
                            });
                        }

                        return new Response(JSON.stringify({
                            success: true,
                            message: `Benutzer ${deletedUsers[0].name} wurde gelöscht`
                        }), {
                            status: 200,
                            headers
                        });

                    } catch (dbError) {
                        console.error('Datenbank-Fehler beim Löschen des Benutzers:', dbError);
                        return new Response(JSON.stringify({
                            error: 'Benutzer konnte nicht gelöscht werden'
                        }), {
                            status: 500,
                            headers
                        });
                    }
                }

                break;

            default:
                return new Response(JSON.stringify({
                    error: `HTTP-Methode ${method} nicht unterstützt`
                }), {
                    status: 405,
                    headers
                });
        }

        // Wenn kein Endpunkt gefunden wurde
        return new Response(JSON.stringify({
            error: `Endpunkt '${action}' nicht gefunden`,
            availableEndpoints: ['login', 'register', 'verify', 'users', 'profile']
        }), {
            status: 404,
            headers
        });

    } catch (error) {
        console.error('Auth API - Allgemeiner Fehler:', error);

        return new Response(JSON.stringify({
            error: 'Interner Serverfehler',
            message: 'Bitte versuchen Sie es später erneut'
        }), {
            status: 500,
            headers
        });
    }
};

// Netlify Function Konfiguration
export const config: Config = {
    path: "/api/auth/*"
};