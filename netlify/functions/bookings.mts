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
        console.log(`Bookings API - Method: ${method}, URL: ${url.pathname}`);

        switch (method) {
            case 'GET':
                // Alle Buchungen abrufen mit Benutzerinformationen
                try {
                    const dateFilter = url.searchParams.get('date');
                    const userFilter = url.searchParams.get('userId');
                    const limit = parseInt(url.searchParams.get('limit') || '100');
                    const offset = parseInt(url.searchParams.get('offset') || '0');

                    let query = `
            SELECT 
              b.id,
              b.user_id,
              u.name as user_name,
              b.title,
              b.description,
              b.date,
              b.start_time,
              b.end_time,
              b.is_recurring,
              b.recurring_group,
              b.created_at,
              b.updated_at
            FROM bookings b
            JOIN users u ON b.user_id = u.id
          `;

                    const conditions = [];
                    const params = [];

                    // Datum-Filter
                    if (dateFilter) {
                        conditions.push(`b.date = $${params.length + 1}`);
                        params.push(dateFilter);
                    }

                    // Benutzer-Filter
                    if (userFilter) {
                        conditions.push(`b.user_id = $${params.length + 1}`);
                        params.push(parseInt(userFilter));
                    }

                    // WHERE-Klausel hinzufügen falls Filter vorhanden
                    if (conditions.length > 0) {
                        query += ` WHERE ${conditions.join(' AND ')}`;
                    }

                    // Sortierung und Pagination
                    query += ` ORDER BY b.date ASC, b.start_time ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
                    params.push(limit, offset);

                    // Query ausführen
                    const bookings = await sql(query, params);

                    // Formatiere Daten für Frontend
                    const formattedBookings = bookings.map(booking => ({
                        id: booking.id,
                        userId: booking.user_id,
                        userName: booking.user_name,
                        title: booking.title,
                        description: booking.description || '',
                        date: booking.date,
                        startTime: booking.start_time,
                        endTime: booking.end_time,
                        isRecurring: booking.is_recurring,
                        recurringGroup: booking.recurring_group,
                        createdAt: booking.created_at,
                        updatedAt: booking.updated_at
                    }));

                    return new Response(JSON.stringify({
                        success: true,
                        bookings: formattedBookings,
                        total: formattedBookings.length,
                        hasMore: formattedBookings.length === limit
                    }), {
                        status: 200,
                        headers
                    });

                } catch (dbError) {
                    console.error('Datenbank-Fehler beim Abrufen der Buchungen:', dbError);
                    return new Response(JSON.stringify({
                        error: 'Buchungen konnten nicht geladen werden'
                    }), {
                        status: 500,
                        headers
                    });
                }

            case 'POST':
                // Neue Buchung(en) erstellen
                try {
                    const bookingData = await req.json();

                    // Validierung der Pflichtfelder
                    if (!bookingData.title || !bookingData.date || !bookingData.startTime || !bookingData.endTime || !bookingData.userId) {
                        return new Response(JSON.stringify({
                            error: 'Fehlende Pflichtfelder: title, date, startTime, endTime, userId sind erforderlich'
                        }), {
                            status: 400,
                            headers
                        });
                    }

                    // Zeitvalidierung
                    if (bookingData.startTime >= bookingData.endTime) {
                        return new Response(JSON.stringify({
                            error: 'Die Endzeit muss nach der Startzeit liegen'
                        }), {
                            status: 400,
                            headers
                        });
                    }

                    // Datum-Validierung (nicht in der Vergangenheit)
                    const bookingDate = new Date(bookingData.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (bookingDate < today) {
                        return new Response(JSON.stringify({
                            error: 'Buchungen in der Vergangenheit sind nicht erlaubt'
                        }), {
                            status: 400,
                            headers
                        });
                    }

                    // Wiederkehrende Buchungen
                    if (bookingData.isRecurring) {
                        const result = await createRecurringBookings(bookingData);
                        return new Response(JSON.stringify(result), {
                            status: result.success ? 201 : 409,
                            headers
                        });
                    } else {
                        // Einzelne Buchung erstellen
                        const result = await createSingleBooking(bookingData);
                        return new Response(JSON.stringify(result), {
                            status: result.success ? 201 : 409,
                            headers
                        });
                    }

                } catch (error) {
                    console.error('Fehler beim Erstellen der Buchung:', error);
                    return new Response(JSON.stringify({
                        error: 'Buchung konnte nicht erstellt werden',
                        details: error.message
                    }), {
                        status: 500,
                        headers
                    });
                }

            case 'PUT':
                // Buchung aktualisieren
                try {
                    const updateData = await req.json();

                    if (!updateData.id) {
                        return new Response(JSON.stringify({
                            error: 'Buchungs-ID ist erforderlich'
                        }), {
                            status: 400,
                            headers
                        });
                    }

                    // Validierung der Pflichtfelder
                    if (!updateData.title || !updateData.date || !updateData.startTime || !updateData.endTime) {
                        return new Response(JSON.stringify({
                            error: 'Fehlende Pflichtfelder: title, date, startTime, endTime sind erforderlich'
                        }), {
                            status: 400,
                            headers
                        });
                    }

                    // Zeitvalidierung
                    if (updateData.startTime >= updateData.endTime) {
                        return new Response(JSON.stringify({
                            error: 'Die Endzeit muss nach der Startzeit liegen'
                        }), {
                            status: 400,
                            headers
                        });
                    }

                    // Prüfe ob Buchung existiert und dem Benutzer gehört
                    const existingBookings = await sql`
            SELECT user_id, is_recurring, recurring_group 
            FROM bookings 
            WHERE id = ${updateData.id}
            LIMIT 1
          `;

                    if (existingBookings.length === 0) {
                        return new Response(JSON.stringify({
                            error: 'Buchung nicht gefunden'
                        }), {
                            status: 404,
                            headers
                        });
                    }

                    // Konfliktprüfung (außer mit sich selbst)
                    const conflicts = await sql`
            SELECT id FROM bookings 
            WHERE date = ${updateData.date}
            AND id != ${updateData.id}
            AND (
              (${updateData.startTime}::time >= start_time AND ${updateData.startTime}::time < end_time) OR
              (${updateData.endTime}::time > start_time AND ${updateData.endTime}::time <= end_time) OR
              (${updateData.startTime}::time <= start_time AND ${updateData.endTime}::time >= end_time)
            )
          `;

                    if (conflicts.length > 0) {
                        return new Response(JSON.stringify({
                            error: 'Zeitkonflikt: Der Raum ist zu dieser Zeit bereits gebucht'
                        }), {
                            status: 409,
                            headers
                        });
                    }

                    // Buchung aktualisieren
                    const updatedBookings = await sql`
            UPDATE bookings 
            SET 
              title = ${updateData.title},
              description = ${updateData.description || ''},
              date = ${updateData.date},
              start_time = ${updateData.startTime},
              end_time = ${updateData.endTime},
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${updateData.id}
            RETURNING *
          `;

                    const updatedBooking = updatedBookings[0];

                    // Benutzername holen
                    const users = await sql`SELECT name FROM users WHERE id = ${updatedBooking.user_id}`;

                    const formattedBooking = {
                        id: updatedBooking.id,
                        userId: updatedBooking.user_id,
                        userName: users[0]?.name || 'Unbekannt',
                        title: updatedBooking.title,
                        description: updatedBooking.description || '',
                        date: updatedBooking.date,
                        startTime: updatedBooking.start_time,
                        endTime: updatedBooking.end_time,
                        isRecurring: updatedBooking.is_recurring,
                        recurringGroup: updatedBooking.recurring_group,
                        updatedAt: updatedBooking.updated_at
                    };

                    return new Response(JSON.stringify({
                        success: true,
                        booking: formattedBooking,
                        message: 'Buchung erfolgreich aktualisiert'
                    }), {
                        status: 200,
                        headers
                    });

                } catch (dbError) {
                    console.error('Datenbank-Fehler beim Aktualisieren der Buchung:', dbError);
                    return new Response(JSON.stringify({
                        error: 'Buchung konnte nicht aktualisiert werden'
                    }), {
                        status: 500,
                        headers
                    });
                }

            case 'DELETE':
                // Buchung(en) löschen
                try {
                    const deleteId = parseInt(url.searchParams.get('id') || '0');
                    const deleteRecurringGroup = url.searchParams.get('recurringGroup');

                    if (!deleteId && !deleteRecurringGroup) {
                        return new Response(JSON.stringify({
                            error: 'Buchungs-ID oder RecurringGroup-ID ist erforderlich'
                        }), {
                            status: 400,
                            headers
                        });
                    }

                    if (deleteRecurringGroup) {
                        // Ganze Serie löschen
                        const deletedBookings = await sql`
              DELETE FROM bookings 
              WHERE recurring_group = ${deleteRecurringGroup}
              RETURNING id, title, date
            `;

                        if (deletedBookings.length === 0) {
                            return new Response(JSON.stringify({
                                error: 'Keine Buchungen mit dieser Serie gefunden'
                            }), {
                                status: 404,
                                headers
                            });
                        }

                        return new Response(JSON.stringify({
                            success: true,
                            deletedCount: deletedBookings.length,
                            message: `${deletedBookings.length} Termine der Serie wurden gelöscht`
                        }), {
                            status: 200,
                            headers
                        });
                    } else {
                        // Einzelne Buchung löschen
                        const deletedBookings = await sql`
              DELETE FROM bookings 
              WHERE id = ${deleteId}
              RETURNING id, title, date, user_id
            `;

                        if (deletedBookings.length === 0) {
                            return new Response(JSON.stringify({
                                error: 'Buchung nicht gefunden'
                            }), {
                                status: 404,
                                headers
                            });
                        }

                        return new Response(JSON.stringify({
                            success: true,
                            message: `Buchung "${deletedBookings[0].title}" wurde gelöscht`
                        }), {
                            status: 200,
                            headers
                        });
                    }

                } catch (dbError) {
                    console.error('Datenbank-Fehler beim Löschen der Buchung:', dbError);
                    return new Response(JSON.stringify({
                        error: 'Buchung konnte nicht gelöscht werden'
                    }), {
                        status: 500,
                        headers
                    });
                }

            default:
                return new Response(JSON.stringify({
                    error: `HTTP-Methode ${method} nicht unterstützt`,
                    supportedMethods: ['GET', 'POST', 'PUT', 'DELETE']
                }), {
                    status: 405,
                    headers
                });
        }
    } catch (error) {
        console.error('Bookings API - Allgemeiner Fehler:', error);
        return new Response(JSON.stringify({
            error: 'Interner Serverfehler',
            message: 'Bitte versuchen Sie es später erneut'
        }), {
            status: 500,
            headers
        });
    }
};

// Hilfsfunktion: Einzelne Buchung erstellen
async function createSingleBooking(bookingData: any) {
    try {
        // Konfliktprüfung
        const conflicts = await sql`
      SELECT id, title FROM bookings 
      WHERE date = ${bookingData.date}
      AND (
        (${bookingData.startTime}::time >= start_time AND ${bookingData.startTime}::time < end_time) OR
        (${bookingData.endTime}::time > start_time AND ${bookingData.endTime}::time <= end_time) OR
        (${bookingData.startTime}::time <= start_time AND ${bookingData.endTime}::time >= end_time)
      )
    `;

        if (conflicts.length > 0) {
            return {
                success: false,
                error: 'Zeitkonflikt: Der Raum ist zu dieser Zeit bereits gebucht',
                conflictingBookings: conflicts
            };
        }

        // Buchung erstellen
        const newBookings = await sql`
      INSERT INTO bookings (user_id, title, description, date, start_time, end_time, is_recurring)
      VALUES (
        ${bookingData.userId}, 
        ${bookingData.title}, 
        ${bookingData.description || ''}, 
        ${bookingData.date}, 
        ${bookingData.startTime}, 
        ${bookingData.endTime}, 
        false
      )
      RETURNING *
    `;

        const booking = newBookings[0];

        // Benutzername holen
        const users = await sql`SELECT name FROM users WHERE id = ${booking.user_id}`;

        const formattedBooking = {
            id: booking.id,
            userId: booking.user_id,
            userName: users[0]?.name || 'Unbekannt',
            title: booking.title,
            description: booking.description || '',
            date: booking.date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            isRecurring: booking.is_recurring,
            recurringGroup: booking.recurring_group,
            createdAt: booking.created_at
        };

        return {
            success: true,
            booking: formattedBooking,
            message: 'Buchung erfolgreich erstellt'
        };

    } catch (error) {
        console.error('Fehler beim Erstellen der einzelnen Buchung:', error);
        return {
            success: false,
            error: 'Buchung konnte nicht erstellt werden'
        };
    }
}

// Hilfsfunktion: Wiederkehrende Buchungen erstellen
async function createRecurringBookings(bookingData: any) {
    try {
        const startDate = new Date(bookingData.date);
        const endOfYear = new Date(startDate.getFullYear(), 11, 31); // 31. Dezember
        const recurringGroup = `recurring_${Date.now()}_${bookingData.userId}`;
        const newBookings = [];
        const conflicts = [];

        let currentDate = new Date(startDate);

        // Alle potentiellen Termine prüfen
        while (currentDate <= endOfYear) {
            const dateStr = currentDate.toISOString().split('T')[0];

            // Prüfe auf Konflikte für dieses Datum
            const dateConflicts = await sql`
        SELECT id, title, start_time, end_time FROM bookings 
        WHERE date = ${dateStr}
        AND (
          (${bookingData.startTime}::time >= start_time AND ${bookingData.startTime}::time < end_time) OR
          (${bookingData.endTime}::time > start_time AND ${bookingData.endTime}::time <= end_time) OR
          (${bookingData.startTime}::time <= start_time AND ${bookingData.endTime}::time >= end_time)
        )
      `;

            if (dateConflicts.length > 0) {
                conflicts.push({
                    date: dateStr,
                    conflictingBookings: dateConflicts
                });
            } else {
                // Kein Konflikt - Buchung vorbereiten
                const insertedBookings = await sql`
          INSERT INTO bookings (user_id, title, description, date, start_time, end_time, is_recurring, recurring_group)
          VALUES (
            ${bookingData.userId}, 
            ${bookingData.title}, 
            ${bookingData.description || ''}, 
            ${dateStr}, 
            ${bookingData.startTime}, 
            ${bookingData.endTime}, 
            true,
            ${recurringGroup}
          )
          RETURNING *
        `;

                const booking = insertedBookings[0];
                newBookings.push({
                    id: booking.id,
                    userId: booking.user_id,
                    userName: bookingData.userName || 'Unbekannt',
                    title: booking.title,
                    description: booking.description || '',
                    date: booking.date,
                    startTime: booking.start_time,
                    endTime: booking.end_time,
                    isRecurring: booking.is_recurring,
                    recurringGroup: booking.recurring_group
                });
            }

            // Nächste Woche
            currentDate.setDate(currentDate.getDate() + 7);
        }

        if (conflicts.length > 0 && newBookings.length === 0) {
            return {
                success: false,
                error: 'Alle wiederkehrenden Termine haben Konflikte',
                conflicts: conflicts,
                conflictCount: conflicts.length
            };
        }

        return {
            success: true,
            bookings: newBookings,
            createdCount: newBookings.length,
            conflictCount: conflicts.length,
            conflicts: conflicts.length > 0 ? conflicts : undefined,
            message: `${newBookings.length} wiederkehrende Termine bis Jahresende erstellt${conflicts.length > 0 ? `, ${conflicts.length} Termine übersprungen wegen Konflikten` : ''}`
        };

    } catch (error) {
        console.error('Fehler beim Erstellen der wiederkehrenden Buchungen:', error);
        return {
            success: false,
            error: 'Wiederkehrende Buchungen konnten nicht erstellt werden'
        };
    }
}

// Netlify Function Konfiguration
export const config: Config = {
    path: "/api/bookings"
};