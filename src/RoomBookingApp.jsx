import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Calendar,
    Clock,
    User,
    Plus,
    X,
    Edit2,
    Trash2,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Grid,
    List,
    Settings,
    Users,
    AlertCircle,
    CheckCircle,
    RefreshCw
} from 'lucide-react';

const RoomBookingApp = () => {
    // Haupt-State
    const [currentUser, setCurrentUser] = useState(null);
    const [showLogin, setShowLogin] = useState(true);
    const [bookings, setBookings] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // UI-State
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingBooking, setEditingBooking] = useState(null);
    const [currentView, setCurrentView] = useState('calendar');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showAdminPanel, setShowAdminPanel] = useState(false);

    // Notification State
    const [notification, setNotification] = useState(null);

    // 15 Demo-Benutzer für den Verein
    const demoUsers = useMemo(() => [
        { id: 1, name: 'Anna Schmidt', email: 'anna@verein.de', password: 'demo123', role: 'user' },
        { id: 2, name: 'Max Müller', email: 'max@verein.de', password: 'demo123', role: 'admin' },
        { id: 3, name: 'Lisa Weber', email: 'lisa@verein.de', password: 'demo123', role: 'user' },
        { id: 4, name: 'Thomas Klein', email: 'thomas@verein.de', password: 'demo123', role: 'user' },
        { id: 5, name: 'Sarah Fischer', email: 'sarah@verein.de', password: 'demo123', role: 'user' },
        { id: 6, name: 'Michael Wagner', email: 'michael@verein.de', password: 'demo123', role: 'user' },
        { id: 7, name: 'Julia Becker', email: 'julia@verein.de', password: 'demo123', role: 'user' },
        { id: 8, name: 'David Hoffmann', email: 'david@verein.de', password: 'demo123', role: 'user' },
        { id: 9, name: 'Laura Schulz', email: 'laura@verein.de', password: 'demo123', role: 'user' },
        { id: 10, name: 'Stefan Meyer', email: 'stefan@verein.de', password: 'demo123', role: 'user' },
        { id: 11, name: 'Nina Richter', email: 'nina@verein.de', password: 'demo123', role: 'user' },
        { id: 12, name: 'Marco Fischer', email: 'marco@verein.de', password: 'demo123', role: 'user' },
        { id: 13, name: 'Eva Zimmermann', email: 'eva@verein.de', password: 'demo123', role: 'user' },
        { id: 14, name: 'Paul Krüger', email: 'paul@verein.de', password: 'demo123', role: 'user' },
        { id: 15, name: 'Sophie Wolf', email: 'sophie@verein.de', password: 'demo123', role: 'user' }
    ], []);

    // Demo-Buchungen für die nächsten Tage
    const generateDemoBookings = useCallback(() => {
        const today = new Date();
        return [
            {
                id: 1,
                userId: 1,
                userName: 'Anna Schmidt',
                title: 'Yoga-Kurs',
                date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                startTime: '18:00',
                endTime: '19:30',
                description: 'Wöchentlicher Yoga-Kurs für Anfänger',
                isRecurring: true,
                recurringGroup: 'yoga-series-1'
            },
            {
                id: 2,
                userId: 2,
                userName: 'Max Müller',
                title: 'Vorstandssitzung',
                date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                startTime: '19:00',
                endTime: '21:00',
                description: 'Monatliche Vorstandssitzung'
            },
            {
                id: 3,
                userId: 3,
                userName: 'Lisa Weber',
                title: 'Buchclub',
                date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                startTime: '15:00',
                endTime: '17:00',
                description: 'Monatliches Treffen des Buchclubs'
            }
        ];
    }, []);

    // Initialisierung beim App-Start
    useEffect(() => {
        setUsers(demoUsers);
        setBookings(generateDemoBookings());
    }, [demoUsers, generateDemoBookings]);

    const handleLogin = async (email, password) => {
        try {
            setLoading(true);

            // Demo-Login
            const user = demoUsers.find(u => u.email === email && u.password === password);
            if (user) {
                setCurrentUser(user);
                setShowLogin(false);
                showNotification(`Willkommen, ${user.name}!`, 'success');
            } else {
                showNotification('Ungültige Anmeldedaten', 'error');
            }
        } catch (error) {
            console.error('Login-Fehler:', error);
            showNotification('Anmeldung fehlgeschlagen', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = useCallback(() => {
        setCurrentUser(null);
        setShowLogin(true);
        setShowAdminPanel(false);
        showNotification('Erfolgreich abgemeldet', 'success');
    }, []);

    const addBooking = async (bookingData) => {
        if (bookingData.isRecurring) {
            return await addRecurringBookings(bookingData);
        } else {
            return await addSingleBooking(bookingData);
        }
    };

    const addSingleBooking = async (bookingData) => {
        // Lokale Konfliktprüfung
        const hasConflict = bookings.some(booking =>
            booking.date === bookingData.date &&
            booking.id !== (editingBooking?.id || 0) &&
            (
                (bookingData.startTime >= booking.startTime && bookingData.startTime < booking.endTime) ||
                (bookingData.endTime > booking.startTime && bookingData.endTime <= booking.endTime) ||
                (bookingData.startTime <= booking.startTime && bookingData.endTime >= booking.endTime)
            )
        );

        if (hasConflict) {
            showNotification('Konflikt: Der Raum ist zu dieser Zeit bereits gebucht!', 'error');
            return false;
        }

        if (editingBooking) {
            // Buchung bearbeiten
            const updatedBookings = bookings.map(b =>
                b.id === editingBooking.id ? { ...b, ...bookingData } : b
            );
            setBookings(updatedBookings);
            showNotification('Buchung erfolgreich aktualisiert', 'success');
        } else {
            // Neue Buchung erstellen
            const newBooking = {
                id: Date.now(),
                userId: currentUser.id,
                userName: currentUser.name,
                ...bookingData
            };
            setBookings([...bookings, newBooking]);
            showNotification('Buchung erfolgreich erstellt', 'success');
        }

        setEditingBooking(null);
        setShowBookingForm(false);
        return true;
    };

    const addRecurringBookings = async (bookingData) => {
        const result = createRecurringBookingsLocally(bookingData);
        if (result.success) {
            setBookings([...bookings, ...result.bookings]);
            showNotification(result.message, 'success');
        } else {
            return false;
        }

        setShowBookingForm(false);
        return true;
    };

    const createRecurringBookingsLocally = (bookingData) => {
        const startDate = new Date(bookingData.date);
        const endOfYear = new Date(startDate.getFullYear(), 11, 31);
        const newBookings = [];
        const conflicts = [];
        const recurringGroup = `recurring_${Date.now()}_${currentUser.id}`;

        let currentDate = new Date(startDate);
        let weekCount = 0;

        while (currentDate <= endOfYear) {
            const dateStr = currentDate.toISOString().split('T')[0];

            const hasConflict = bookings.some(booking =>
                booking.date === dateStr &&
                (
                    (bookingData.startTime >= booking.startTime && bookingData.startTime < booking.endTime) ||
                    (bookingData.endTime > booking.startTime && bookingData.endTime <= booking.endTime) ||
                    (bookingData.startTime <= booking.startTime && bookingData.endTime >= booking.endTime)
                )
            );

            if (hasConflict) {
                conflicts.push(dateStr);
            } else {
                newBookings.push({
                    id: Date.now() + weekCount,
                    userId: currentUser.id,
                    userName: currentUser.name,
                    title: bookingData.title,
                    date: dateStr,
                    startTime: bookingData.startTime,
                    endTime: bookingData.endTime,
                    description: bookingData.description,
                    isRecurring: true,
                    recurringGroup: recurringGroup
                });
            }

            currentDate.setDate(currentDate.getDate() + 7);
            weekCount++;
        }

        if (conflicts.length > 0 && newBookings.length === 0) {
            showNotification('Alle Termine haben Konflikte', 'error');
            return { success: false };
        }

        return {
            success: true,
            bookings: newBookings,
            message: `${newBookings.length} wiederkehrende Termine bis Jahresende erstellt${conflicts.length > 0 ? `, ${conflicts.length} übersprungen` : ''}`
        };
    };

    const deleteBooking = async (id) => {
        const bookingToDelete = bookings.find(b => b.id === id);

        if (bookingToDelete?.isRecurring && bookingToDelete.recurringGroup) {
            const isDeleteSeries = window.confirm(
                'Dies ist ein wiederkehrender Termin. Möchten Sie alle Termine dieser Serie löschen?\n\n' +
                'OK = Ganze Serie löschen\n' +
                'Abbrechen = Nur diesen Termin löschen'
            );

            if (isDeleteSeries) {
                const updatedBookings = bookings.filter(b => b.recurringGroup !== bookingToDelete.recurringGroup);
                const deletedCount = bookings.length - updatedBookings.length;
                setBookings(updatedBookings);
                showNotification(`${deletedCount} Termine der Serie gelöscht`, 'success');
                return;
            }
        }

        if (window.confirm('Buchung wirklich löschen?')) {
            const updatedBookings = bookings.filter(b => b.id !== id);
            setBookings(updatedBookings);
            showNotification('Termin gelöscht', 'success');
        }
    };

    const startEdit = (booking) => {
        setEditingBooking(booking);
        setShowBookingForm(true);
    };

    // Notification System
    const showNotification = useCallback((message, type = 'info') => {
        setNotification({ message, type, id: Date.now() });

        // Auto-hide nach 4 Sekunden
        setTimeout(() => {
            setNotification(null);
        }, 4000);
    }, []);

    // Helper Functions
    const getBookingsForDate = useCallback((date) => {
        return bookings
            .filter(b => b.date === date)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [bookings]);

    const formatTime = useCallback((time) => {
        return time.slice(0, 5);
    }, []);

    const formatDate = useCallback((dateStr) => {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, []);

    // Calendar Functions
    const getDaysInMonth = useCallback((date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Leere Zellen vor Monatsbeginn
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Tage des Monats
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    }, []);

    const getBookingsForDay = useCallback((date) => {
        if (!date) return [];
        const dateStr = date.toISOString().split('T')[0];
        return bookings.filter(b => b.date === dateStr);
    }, [bookings]);

    const navigateMonth = useCallback((direction) => {
        setCurrentMonth(prev => {
            const newMonth = new Date(prev);
            newMonth.setMonth(prev.getMonth() + direction);
            return newMonth;
        });
    }, []);

    const selectDate = useCallback((date) => {
        setSelectedDate(date.toISOString().split('T')[0]);
        setCurrentView('day');
    }, []);

    const refreshData = () => {
        showNotification('Daten aktualisiert', 'success');
    };

    // Render Login wenn nicht angemeldet
    if (showLogin) {
        return (
            <LoginForm
                onLogin={handleLogin}
                users={demoUsers}
                loading={loading}
                showNotification={showNotification}
            />
        );
    }

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 mt-4">Lädt...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Notification */}
                {notification && (
                    <Notification
                        message={notification.message}
                        type={notification.type}
                        onClose={() => setNotification(null)}
                    />
                )}

                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-8 w-8 text-blue-600 flex-shrink-0" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Vereinsraum Buchung</h1>
                                <p className="text-gray-600">
                                    Willkommen, {currentUser.name}
                                    {currentUser.role === 'admin' && (
                                        <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                            Administrator
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={refreshData}
                                className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Aktualisieren</span>
                            </button>

                            <button
                                onClick={() => setCurrentView(currentView === 'calendar' ? 'day' : 'calendar')}
                                className="flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                {currentView === 'calendar' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                                <span className="hidden sm:inline">
                                    {currentView === 'calendar' ? 'Tagesansicht' : 'Kalender'}
                                </span>
                            </button>

                            <button
                                onClick={() => setShowBookingForm(true)}
                                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">Neue Buchung</span>
                            </button>

                            {currentUser.role === 'admin' && (
                                <button
                                    onClick={() => setShowAdminPanel(true)}
                                    className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    <Users className="h-4 w-4" />
                                    <span className="hidden sm:inline">Verwaltung</span>
                                </button>
                            )}

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Abmelden</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                {currentView === 'calendar' ? (
                    <CalendarView
                        currentMonth={currentMonth}
                        navigateMonth={navigateMonth}
                        getDaysInMonth={getDaysInMonth}
                        getBookingsForDay={getBookingsForDay}
                        selectDate={selectDate}
                        selectedDate={selectedDate}
                        formatTime={formatTime}
                    />
                ) : (
                    <DayView
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        getBookingsForDate={getBookingsForDate}
                        formatTime={formatTime}
                        formatDate={formatDate}
                        currentUser={currentUser}
                        startEdit={startEdit}
                        deleteBooking={deleteBooking}
                    />
                )}
            </div>

            {/* Modals */}
            {showBookingForm && (
                <BookingForm
                    onSubmit={addBooking}
                    onCancel={() => {
                        setShowBookingForm(false);
                        setEditingBooking(null);
                    }}
                    initialData={editingBooking}
                    selectedDate={selectedDate}
                    currentUser={currentUser}
                />
            )}

            {showAdminPanel && currentUser.role === 'admin' && (
                <AdminPanel
                    users={users}
                    bookings={bookings}
                    onClose={() => setShowAdminPanel(false)}
                    showNotification={showNotification}
                />
            )}
        </div>
    );
};

// Calendar View Component
const CalendarView = ({
                          currentMonth,
                          navigateMonth,
                          getDaysInMonth,
                          getBookingsForDay,
                          selectDate,
                          selectedDate,
                          formatTime
                      }) => (
    <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
                {currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-2">
                <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 bg-gray-200 rounded-lg overflow-hidden">
            {/* Day Headers */}
            {['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'].map((day) => (
                <div key={day} className="bg-gray-100 p-2 text-center text-sm font-medium text-gray-700">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 2)}</span>
                </div>
            ))}

            {/* Calendar Days */}
            {getDaysInMonth(currentMonth).map((date, index) => {
                const bookingsForDay = getBookingsForDay(date);
                const isToday = date && date.toDateString() === new Date().toDateString();
                const isSelected = date && date.toISOString().split('T')[0] === selectedDate;
                const isWeekend = date && (date.getDay() === 0 || date.getDay() === 6);

                return (
                    <div
                        key={index}
                        className={`min-h-[80px] sm:min-h-[100px] p-1 bg-white border border-gray-100 ${
                            date ? 'hover:bg-gray-50 cursor-pointer transition-colors' : ''
                        } ${isToday ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-300' : ''} ${
                            isSelected ? 'bg-blue-100 border-blue-300' : ''
                        } ${isWeekend ? 'bg-gray-25' : ''}`}
                        onClick={() => date && selectDate(date)}
                    >
                        {date && (
                            <>
                                <div className={`text-sm font-medium mb-1 ${
                                    isToday ? 'text-blue-600 font-bold' : 'text-gray-900'
                                } ${isWeekend ? 'text-gray-600' : ''}`}>
                                    {date.getDate()}
                                </div>
                                <div className="space-y-1">
                                    {bookingsForDay.slice(0, 2).map(booking => (
                                        <div
                                            key={booking.id}
                                            className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer transition-colors ${
                                                booking.isRecurring
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                            }`}
                                            title={`${booking.title}\n${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}\nVon: ${booking.userName}${booking.description ? '\n' + booking.description : ''}`}
                                        >
                                            <span className="font-medium">{formatTime(booking.startTime)}</span>
                                            <span className="ml-1">{booking.title}</span>
                                        </div>
                                    ))}
                                    {bookingsForDay.length > 2 && (
                                        <div className="text-xs text-gray-500 font-medium">
                                            +{bookingsForDay.length - 2} weitere
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

// Day View Component
const DayView = ({
                     selectedDate,
                     setSelectedDate,
                     getBookingsForDate,
                     formatTime,
                     formatDate,
                     currentUser,
                     startEdit,
                     deleteBooking
                 }) => (
    <>
        {/* Datum-Auswahl */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <label className="text-lg font-medium text-gray-700">Datum auswählen:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="text-sm text-gray-500">
                    {getBookingsForDate(selectedDate).length} Buchung(en)
                </div>
            </div>
        </div>

        {/* Buchungen für gewähltes Datum */}
        <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Buchungen für {formatDate(selectedDate)}
            </h2>

            <div className="space-y-3">
                {getBookingsForDate(selectedDate).length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg mb-2">Keine Buchungen für dieses Datum</p>
                        <p className="text-gray-400 text-sm">Der Vereinsraum ist frei verfügbar</p>
                    </div>
                ) : (
                    getBookingsForDate(selectedDate).map(booking => (
                        <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                        <span className="font-medium text-gray-900">
                                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                                        </span>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                            {booking.title}
                                        </span>
                                        {booking.isRecurring && (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                                🔄 Wöchentliche Serie
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                        <User className="h-4 w-4 flex-shrink-0" />
                                        <span>{booking.userName}</span>
                                        {booking.userId === currentUser.id && (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                                Ihre Buchung
                                            </span>
                                        )}
                                    </div>
                                    {booking.description && (
                                        <div className="bg-gray-50 rounded p-3 mt-2">
                                            <p className="text-gray-700 text-sm">{booking.description}</p>
                                        </div>
                                    )}
                                </div>

                                {booking.userId === currentUser.id && (
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => startEdit(booking)}
                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                            title="Buchung bearbeiten"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteBooking(booking.id)}
                                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            title="Buchung löschen"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </>
);

// Login Form Component
const LoginForm = ({ onLogin, users, loading, showNotification }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!loading && email && password) {
            onLogin(email, password);
        }
    };

    const handleDemoLogin = (demoEmail) => {
        if (!loading) {
            setEmail(demoEmail);
            setPassword('demo123');
            onLogin(demoEmail, 'demo123');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-6">
                    <Calendar className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Vereinsraum Buchung</h1>
                    <p className="text-gray-600">Melden Sie sich an, um den Raum zu buchen</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            E-Mail-Adresse
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="ihre@email.de"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Passwort
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                                placeholder="Ihr Passwort"
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                disabled={loading}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !email || !password}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Anmelden...
                            </>
                        ) : (
                            'Anmelden'
                        )}
                    </button>
                </form>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-3 text-center">
                        💡 <strong>Schnell-Anmeldung</strong> (Klick zum Anmelden):
                    </p>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                        {users.slice(0, 5).map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleDemoLogin(user.email)}
                                disabled={loading}
                                className="text-left text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="font-medium text-gray-900">{user.name}</span>
                                <span className="text-gray-500 ml-2">({user.email})</span>
                                {user.role === 'admin' && (
                                    <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                        Admin
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 text-center">
                        <p className="text-xs text-gray-500">
                            Alle Passwörter: <strong>demo123</strong>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Weitere {users.length - 5} Benutzer verfügbar
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Booking Form Component
const BookingForm = ({ onSubmit, onCancel, initialData, selectedDate, currentUser }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [date, setDate] = useState(initialData?.date || selectedDate);
    const [startTime, setStartTime] = useState(initialData?.startTime || '');
    const [endTime, setEndTime] = useState(initialData?.endTime || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title || !date || !startTime || !endTime) {
            alert('Bitte füllen Sie alle Pflichtfelder aus');
            return;
        }

        if (startTime >= endTime) {
            alert('Die Endzeit muss nach der Startzeit liegen');
            return;
        }

        // Prüfe ob Datum in der Vergangenheit liegt
        const bookingDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (bookingDate < today) {
            alert('Buchungen in der Vergangenheit sind nicht erlaubt');
            return;
        }

        setSubmitting(true);

        try {
            const success = await onSubmit({
                ...(initialData && { id: initialData.id }),
                title,
                date,
                startTime,
                endTime,
                description,
                isRecurring: initialData ? initialData.isRecurring : isRecurring
            });

            if (success !== false) {
                // Reset form only if submission was successful
                setTitle('');
                setDate(selectedDate);
                setStartTime('');
                setEndTime('');
                setDescription('');
                setIsRecurring(false);
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Berechne Anzahl der wiederkehrenden Termine
    const getRecurringCount = () => {
        if (!isRecurring || !date) return 0;
        const startDate = new Date(date);
        const endOfYear = new Date(startDate.getFullYear(), 11, 31);
        let count = 0;
        let currentDate = new Date(startDate);

        while (currentDate <= endOfYear) {
            count++;
            currentDate.setDate(currentDate.getDate() + 7);
        }

        return count;
    };

    const getDuration = () => {
        if (!startTime || !endTime) return '';

        const start = new Date(`2000-01-01T${startTime}:00`);
        const end = new Date(`2000-01-01T${endTime}:00`);
        const diffMs = end - start;

        if (diffMs <= 0) return '';

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 0 && diffMinutes > 0) {
            return `${diffHours}h ${diffMinutes}min`;
        } else if (diffHours > 0) {
            return `${diffHours}h`;
        } else {
            return `${diffMinutes}min`;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {initialData ? 'Buchung bearbeiten' : 'Neue Buchung'}
                    </h2>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        disabled={submitting}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Titel *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="z.B. Yoga-Kurs, Vorstandssitzung, Meeting..."
                            required
                            disabled={submitting}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Datum *
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                            disabled={submitting}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {new Date(date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long' })}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Startzeit *
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                disabled={submitting}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Endzeit *
                            </label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                disabled={submitting}
                            />
                        </div>
                    </div>

                    {startTime && endTime && getDuration() && (
                        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                            <strong>Dauer:</strong> {getDuration()}
                        </div>
                    )}

                    {/* Wiederholung Option - nur bei neuen Buchungen */}
                    {!initialData && (
                        <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center gap-3 mb-3">
                                <input
                                    type="checkbox"
                                    id="recurring"
                                    checked={isRecurring}
                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    disabled={submitting}
                                />
                                <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
                                    🔄 Wöchentlich wiederholen bis Jahresende
                                </label>
                            </div>
                            {isRecurring && date && (
                                <div className="text-sm text-gray-600 bg-white p-3 rounded border-l-4 border-blue-400">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                        <span className="font-medium">
                                            Erstellt {getRecurringCount()} Termine jeden {new Date(date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        📅 Vom {new Date(date + 'T00:00:00').toLocaleDateString('de-DE')} bis 31.12.{new Date(date).getFullYear()}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        ⏰ Jeweils {startTime && endTime ? `${startTime} - ${endTime}` : 'zur gewählten Zeit'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Beschreibung
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows="3"
                            placeholder="Zusätzliche Informationen zur Buchung (optional)..."
                            disabled={submitting}
                            maxLength="500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {description.length}/500 Zeichen
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            disabled={submitting}
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !title || !date || !startTime || !endTime}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Speichert...
                                </>
                            ) : (
                                isRecurring && !initialData ? `${getRecurringCount()} Termine erstellen` :
                                    initialData ? 'Änderungen speichern' : 'Buchung erstellen'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Notification Component
const Notification = ({ message, type, onClose }) => {
    const icons = {
        success: <CheckCircle className="h-5 w-5" />,
        error: <AlertCircle className="h-5 w-5" />,
        warning: <AlertCircle className="h-5 w-5" />,
        info: <AlertCircle className="h-5 w-5" />
    };

    const styles = {
        success: 'bg-green-50 text-green-800 border-green-200',
        error: 'bg-red-50 text-red-800 border-red-200',
        warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        info: 'bg-blue-50 text-blue-800 border-blue-200'
    };

    return (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right">
            <div className={`flex items-center gap-3 p-4 border rounded-lg shadow-lg max-w-sm ${styles[type]}`}>
                {icons[type]}
                <span className="flex-1 text-sm font-medium">{message}</span>
                <button
                    onClick={onClose}
                    className="text-current opacity-70 hover:opacity-100 transition-opacity"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

// Admin Panel Component
const AdminPanel = ({ users, bookings, onClose, showNotification }) => {
    const [activeTab, setActiveTab] = useState('users');

    const userStats = users.map(user => ({
        ...user,
        bookingCount: bookings.filter(b => b.userId === user.id).length,
        lastBooking: bookings
            .filter(b => b.userId === user.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date
    }));

    const totalBookings = bookings.length;
    const recurringBookings = bookings.filter(b => b.isRecurring).length;
    const todayBookings = bookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Settings className="h-6 w-6" />
                        Vereins-Verwaltung
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row">
                    {/* Sidebar */}
                    <div className="w-full sm:w-48 bg-gray-50 p-4 border-b sm:border-b-0 sm:border-r border-gray-200">
                        <nav className="flex sm:flex-col gap-2">
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`flex-1 sm:w-full text-left px-3 py-2 rounded-lg transition-colors ${
                                    activeTab === 'users' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                                }`}
                            >
                                <Users className="h-4 w-4 inline mr-2" />
                                Benutzer
                            </button>
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`flex-1 sm:w-full text-left px-3 py-2 rounded-lg transition-colors ${
                                    activeTab === 'stats' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                                }`}
                            >
                                <Calendar className="h-4 w-4 inline mr-2" />
                                Statistiken
                            </button>
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto max-h-[70vh]">
                        {activeTab === 'users' && (
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Benutzer-Übersicht</h3>
                                <div className="space-y-3">
                                    {userStats.map(user => (
                                        <div key={user.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="font-medium text-gray-900">{user.name}</span>
                                                        {user.role === 'admin' && (
                                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                                                Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600">{user.email}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {user.bookingCount} Buchung(en)
                                                        {user.lastBooking && (
                                                            <span className="ml-2">
                                                                • Letzte: {new Date(user.lastBooking + 'T00:00:00').toLocaleDateString('de-DE')}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'stats' && (
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Buchungs-Statistiken</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calendar className="h-5 w-5 text-blue-600" />
                                            <span className="font-medium text-blue-900">Gesamt</span>
                                        </div>
                                        <p className="text-2xl font-bold text-blue-900">{totalBookings}</p>
                                        <p className="text-sm text-blue-600">Buchungen insgesamt</p>
                                    </div>

                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <RefreshCw className="h-5 w-5 text-green-600" />
                                            <span className="font-medium text-green-900">Serien</span>
                                        </div>
                                        <p className="text-2xl font-bold text-green-900">{recurringBookings}</p>
                                        <p className="text-sm text-green-600">Wiederkehrende Termine</p>
                                    </div>

                                    <div className="bg-yellow-50 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="h-5 w-5 text-yellow-600" />
                                            <span className="font-medium text-yellow-900">Heute</span>
                                        </div>
                                        <p className="text-2xl font-bold text-yellow-900">{todayBookings}</p>
                                        <p className="text-sm text-yellow-600">Termine heute</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-3">Aktivste Benutzer</h4>
                                    <div className="space-y-2">
                                        {userStats
                                            .sort((a, b) => b.bookingCount - a.bookingCount)
                                            .slice(0, 5)
                                            .map((user, index) => (
                                                <div key={user.id} className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-bold flex items-center justify-center">
                                                            {index + 1}
                                                        </span>
                                                        <span className="text-sm font-medium">{user.name}</span>
                                                    </div>
                                                    <span className="text-sm text-gray-600">{user.bookingCount} Buchungen</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>

                                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-3">Nächste Termine</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {bookings
                                            .filter(b => new Date(b.date) >= new Date())
                                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                                            .slice(0, 10)
                                            .map((booking) => (
                                                <div key={booking.id} className="flex justify-between items-center text-sm">
                                                    <div>
                                                        <span className="font-medium">{booking.title}</span>
                                                        <span className="text-gray-500 ml-2">- {booking.userName}</span>
                                                    </div>
                                                    <span className="text-gray-600">
                                                        {new Date(booking.date + 'T00:00:00').toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomBookingApp;