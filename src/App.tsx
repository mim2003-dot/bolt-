import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Palette,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileUp,
  FileText,
  Download,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { readImageAsDataUrl } from './headerImage';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Room = { id: string; name: string; color?: string; icalUrl?: string };
type IcalBooking = {
  id: string;
  room_id: string;
  uid: string;
  start_date: string;
  end_date: string;
  summary: string;
  local_summary?: string | null;
  color: string;
  check_in: string;
  check_out: string;
  note: string;
};
type Booking = {
  id: string;
  roomId: string;
  guest: string;
  start: string;
  end: string;
  checkIn: string;
  checkOut: string;
  color: string;
  note: string;
};
type AppData = { rooms: Room[]; bookings: Booking[] };
type RoomRow = { id: string; name: string; color: string | null; ical_url: string | null };
type BookingRow = { id: string; room_id: string; guest: string; start: string; end: string; check_in: string; check_out: string; color: string; note: string };

function bookingToRow(booking: Booking): BookingRow {
  return { id: booking.id, room_id: booking.roomId, guest: booking.guest, start: booking.start, end: booking.end, check_in: booking.checkIn, check_out: booking.checkOut, color: booking.color, note: booking.note };
}

function bookingFromRow(row: BookingRow): Booking {
  return { id: row.id, roomId: row.room_id, guest: row.guest, start: row.start, end: row.end, checkIn: row.check_in, checkOut: row.check_out, color: row.color, note: row.note };
}

function roomFromRow(row: RoomRow): Room {
  return { id: row.id, name: row.name, color: row.color ?? undefined, icalUrl: row.ical_url ?? undefined };
}

function roomToRow(room: Room): RoomRow {
  return { id: room.id, name: room.name, color: room.color ?? null, ical_url: room.icalUrl || null };
}

const ICAL_COLOR = '#1b86b5';
type ModalMode = 'booking' | 'room' | 'details' | 'report' | null;
const REPORT_COLORS = ['#1b86b5', '#5c9f4b', '#d28b2d', '#d8665b', '#8661a8', '#2d8f8f', '#c46b9e', '#6b8fc4'];
type ThemeId = 'theme-classic' | 'theme-illustrated' | 'theme-domiki' | 'theme-autumn' | 'theme-winter';

type BookingForm = {
  guest: string;
  roomId: string;
  start: string;
  end: string;
  checkIn: string;
  checkOut: string;
  color: string;
  note: string;
};

const STORAGE_KEY = 'room-booking-data';
const ICAL_STORAGE_KEY = 'room-booking-ical-data';
const THEME_STORAGE_KEY = 'room-booking-theme';
const WINTER_HEADER_STORAGE_KEY = 'room-booking-winter-header';
const PENDING_OPS_KEY = 'room-booking-pending-ops';
const ROOM_WIDTH = 118;
const DAY_WIDTH = 52;
const COLORS = [
  { name: 'Океан', value: '#1b86b5' },
  { name: 'Лес', value: '#5c9f4b' },
  { name: 'Янтарь', value: '#d28b2d' },
  { name: 'Корал', value: '#d8665b' },
  { name: 'Слива', value: '#8661a8' },
];
const APARTMENT_COLORS = [
  { name: 'Белый', value: '#ffffff' },
  { name: 'Голубой', value: '#eaf6fa' },
  { name: 'Зелёный', value: '#eef7ef' },
  { name: 'Янтарный', value: '#fff6e6' },
  { name: 'Коралловый', value: '#fff0ee' },
  { name: 'Серый', value: '#f0f3f4' },
];
const SKEW_OFFSET = 12.33;
const WEEKDAYS = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(start: string, end: string): number {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86400000) + 1;
}

function dateLabel(value: string): string {
  return parseDate(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const VIEW_DAYS = 60;

function getViewDays(startDate: Date, count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date(startDate);
  for (let i = 0; i < count; i++) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function getMonthDays(date: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(date.getFullYear(), date.getMonth(), 1);
  while (cursor.getMonth() === date.getMonth()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function CalendarPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [calMonth, setCalMonth] = useState(parseDate(value));
  const days = getMonthDays(calMonth);
  const offset = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay();
  const cells = Array.from({ length: offset + days.length }, (_, index) => days[index - offset]);

  return (
    <div className="calendar-picker">
      <div className="calendar-header">
        <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="icon-button-small">
          <ChevronLeft size={18} color="#66717d" />
        </button>
        <span className="calendar-title">{MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</span>
        <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="icon-button-small">
          <ChevronRight size={18} color="#66717d" />
        </button>
      </div>
      <div className="week-row">
        {WEEKDAYS.slice(1).concat(WEEKDAYS.slice(0, 1)).map((day, i) => (
          <span key={day} className={`week-label${i > 4 ? ' weekend-text' : ''}`}>{day}</span>
        ))}
      </div>
      <div className="days-grid">
        {cells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="day-cell" />;
          const dayValue = formatDate(day);
          const selected = value === dayValue;
          const weekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <button
              key={dayValue}
              onClick={() => onChange(dayValue)}
              className={`day-cell${selected ? ' selected-day' : ''}`}
            >
              <span className={`day-text${weekend ? ' weekend-text' : ''}${selected ? ' selected-day-text' : ''}`}>
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type PendingOp =
  | { kind: 'upsert'; table: 'bookings' | 'rooms'; row: BookingRow | RoomRow }
  | { kind: 'delete'; table: 'bookings' | 'rooms' | 'ical_bookings'; id: string }
  | { kind: 'ical_update'; id: string; updates: Record<string, unknown> };

export default function App() {
  const [viewStart, setViewStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
  const [data, setData] = useState<AppData>({
    rooms: [
      { id: 'luna', name: 'Luna' },
      { id: 'lenina', name: 'Lenina' },
      { id: 'mano', name: 'Mano' },
    ],
    bookings: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedIcalBooking, setSelectedIcalBooking] = useState<IcalBooking | null>(null);
  const [roomBeingEdited, setRoomBeingEdited] = useState<Room | null>(null);
  const [message, setMessage] = useState('');
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    guest: '',
    roomId: 'luna',
    start: formatDate(new Date()),
    end: formatDate(new Date()),
    checkIn: '',
    checkOut: '',
    color: COLORS[0].value,
    note: '',
  });
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editingIcalBookingId, setEditingIcalBookingId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [dateField, setDateField] = useState<'start' | 'end' | null>(null);
  const [roomColor, setRoomColor] = useState(APARTMENT_COLORS[0].value);
  const [scrollToToday, setScrollToToday] = useState(false);
  const [icalBookings, setIcalBookings] = useState<IcalBooking[]>([]);
  const [syncingRoom, setSyncingRoom] = useState<string | null>(null);
  const [roomIcalUrl, setRoomIcalUrl] = useState('');
  const [theme, setTheme] = useState<ThemeId>('theme-classic');
  const [winterHeader, setWinterHeader] = useState<string | null>(null);
  const [reportMonth, setReportMonth] = useState<string>('all');
  const [reportRoom, setReportRoom] = useState<string>('all');
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const pendingOpsRef = useRef<PendingOp[]>([]);

  function loadPendingOps() {
    try {
      const stored = localStorage.getItem(PENDING_OPS_KEY);
      if (stored) pendingOpsRef.current = JSON.parse(stored) as PendingOp[];
    } catch { /* ignore */ }
  }

  function savePendingOps() {
    localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(pendingOpsRef.current));
  }

  function queueOp(op: PendingOp) {
    pendingOpsRef.current = [...pendingOpsRef.current, op];
    savePendingOps();
  }

  async function flushPendingOps() {
    const ops = [...pendingOpsRef.current];
    if (ops.length === 0) return;
    const remaining: PendingOp[] = [];
    for (const op of ops) {
      let success = false;
      if (op.kind === 'upsert') {
        const { error } = op.table === 'bookings'
          ? await supabase.from('bookings').upsert(op.row as BookingRow)
          : await supabase.from('rooms').upsert(op.row as RoomRow);
        success = !error;
      } else if (op.kind === 'delete') {
        const { error } = await supabase.from(op.table).delete().eq('id', op.id);
        success = !error;
      } else if (op.kind === 'ical_update') {
        const { error } = await supabase.from('ical_bookings').update(op.updates).eq('id', op.id);
        success = !error;
      }
      if (!success) remaining.push(op);
    }
    pendingOpsRef.current = remaining;
    savePendingOps();
    if (remaining.length === 0 && ops.length > 0) {
      supabase.from('bookings').select('*').then(({ data: rows, error }) => {
        if (!error && rows) setData((current) => ({ ...current, bookings: (rows as BookingRow[]).map(bookingFromRow) }));
      });
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AppData;
        if (Array.isArray(parsed.rooms) && Array.isArray(parsed.bookings)) setData(parsed);
      } catch {
        setMessage('Не удалось прочитать сохранённые данные.');
      }
    }

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (storedTheme === 'theme-classic' || storedTheme === 'theme-illustrated' || storedTheme === 'theme-domiki' || storedTheme === 'theme-autumn' || storedTheme === 'theme-winter') {
      setTheme(storedTheme);
    }

    const storedWinterHeader = localStorage.getItem(WINTER_HEADER_STORAGE_KEY);
    if (storedWinterHeader) setWinterHeader(storedWinterHeader);

    const storedIcal = localStorage.getItem(ICAL_STORAGE_KEY);
    if (storedIcal) {
      try {
        const parsed = JSON.parse(storedIcal) as IcalBooking[];
        if (Array.isArray(parsed)) setIcalBookings(parsed);
      } catch {
        setMessage('Не удалось прочитать сохранённые бронирования Booking.com.');
      }
    }
    setLoaded(true);
    loadPendingOps();
    if (navigator.onLine) flushPendingOps();
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(ICAL_STORAGE_KEY, JSON.stringify(icalBookings));
  }, [icalBookings, loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, loaded]);

  useEffect(() => {
    if (!loaded) return;
    let active = true;
    supabase.from('bookings').select('*').then(({ data: rows, error }) => {
      if (active && !error && rows) {
        setData((current) => ({ ...current, bookings: (rows as BookingRow[]).map(bookingFromRow) }));
      }
    });
    return () => {
      active = false;
    };
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    const channel = supabase
      .channel('bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as BookingRow;
          setData((current) => ({ ...current, bookings: current.bookings.filter((b) => b.id !== oldRow.id) }));
        } else {
          const row = payload.new as BookingRow;
          setData((current) => {
            const exists = current.bookings.some((b) => b.id === row.id);
            const booking = bookingFromRow(row);
            return { ...current, bookings: exists ? current.bookings.map((b) => b.id === row.id ? booking : b) : [...current.bookings, booking] };
          });
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    const channel = supabase
      .channel('ical-bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ical_bookings' }, () => {
        supabase.from('ical_bookings').select('*').then(({ data: rows, error }) => {
          if (!error && rows) setIcalBookings(rows as IcalBooking[]);
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    const channel = supabase
      .channel('rooms-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        supabase.from('rooms').select('*').order('created_at').then(({ data: rows, error }) => {
          if (!error && rows) setData((current) => ({ ...current, rooms: (rows as RoomRow[]).map(roomFromRow) }));
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    let active = true;
    supabase.from('rooms').select('*').order('created_at').then(async ({ data: rows, error }) => {
      if (!active) return;
      if (error) {
        setMessage('Не удалось загрузить квартиры из базы.');
        return;
      }
      if (rows && rows.length > 0) {
        setData((current) => ({ ...current, rooms: (rows as RoomRow[]).map(roomFromRow) }));
        return;
      }
      if (data.rooms.length === 0) return;
      const { error: uploadError } = await supabase.from('rooms').upsert(data.rooms.map(roomToRow), { onConflict: 'id', ignoreDuplicates: true });
      if (active && uploadError) setMessage('Не удалось сохранить квартиры в базе.');
    });
    return () => {
      active = false;
    };
  }, [loaded]);

  const days = useMemo(() => getViewDays(viewStart, VIEW_DAYS), [viewStart]);
  const timelineWidth = days.length * DAY_WIDTH;
  const contentWidth = ROOM_WIDTH + timelineWidth;
  const monthLabel = `${MONTHS[viewStart.getMonth()]} ${viewStart.getFullYear()}`;
  const todayValue = formatDate(new Date());

  useLayoutEffect(() => {
    if (!scrollToToday) return;
    timelineScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    setScrollToToday(false);
  }, [scrollToToday]);

  function goToToday() {
    const now = new Date();
    setViewStart(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    setScrollToToday(true);
  }

  function openNewBooking() {
    const firstRoom = data.rooms[0];
    const today = new Date();
    const start = viewStart <= today ? today : viewStart;
    setBookingForm({ guest: '', roomId: firstRoom?.id ?? '', start: formatDate(start), end: formatDate(start), checkIn: '', checkOut: '', color: COLORS[0].value, note: '' });
    setEditingBookingId(null);
    setEditingIcalBookingId(null);
    setDateField(null);
    setModal('booking');
  }

  function openNewBookingOnDate(roomId: string, date: string) {
    setBookingForm({ guest: '', roomId, start: date, end: date, checkIn: '', checkOut: '', color: COLORS[0].value, note: '' });
    setEditingBookingId(null);
    setEditingIcalBookingId(null);
    setDateField(null);
    setModal('booking');
  }

  function openEditBooking(booking: Booking) {
    setBookingForm({ guest: booking.guest, roomId: booking.roomId, start: booking.start, end: booking.end, checkIn: booking.checkIn || '', checkOut: booking.checkOut || '', color: booking.color, note: booking.note });
    setEditingBookingId(booking.id);
    setEditingIcalBookingId(null);
    setSelectedBooking(null);
    setDateField(null);
    setModal('booking');
  }

  function openEditIcalBooking(booking: IcalBooking) {
    setBookingForm({
      guest: booking.local_summary ?? booking.summary,
      roomId: booking.room_id,
      start: booking.start_date,
      end: booking.end_date,
      checkIn: booking.check_in || '',
      checkOut: booking.check_out || '',
      color: booking.color || ICAL_COLOR,
      note: booking.note || '',
    });
    setEditingBookingId(null);
    setEditingIcalBookingId(booking.id);
    setSelectedIcalBooking(null);
    setDateField(null);
    setModal('booking');
  }

  async function saveBooking() {
    if (!bookingForm.roomId) {
      setMessage('Выберите квартиру.');
      return;
    }
    if (bookingForm.end < bookingForm.start) {
      setMessage('Дата выезда не может быть раньше даты заезда.');
      return;
    }
    if (editingIcalBookingId) {
      const updates = {
        local_summary: bookingForm.guest.trim() || null,
        color: bookingForm.color,
        check_in: bookingForm.checkIn,
        check_out: bookingForm.checkOut,
        note: bookingForm.note.trim(),
      };
      setIcalBookings((current) => current.map((booking) => booking.id === editingIcalBookingId ? { ...booking, ...updates } : booking));
      const op: PendingOp = { kind: 'ical_update', id: editingIcalBookingId, updates };
      if (navigator.onLine) {
        const { error } = await supabase.from('ical_bookings').update(updates).eq('id', editingIcalBookingId);
        if (error) queueOp(op);
      } else {
        queueOp(op);
      }
      setEditingIcalBookingId(null);
      setModal(null);
      setMessage('Изменения импортированной брони сохранены.');
    } else if (editingBookingId) {
      const updated: Booking = { ...bookingForm, id: editingBookingId, guest: bookingForm.guest.trim(), checkIn: bookingForm.checkIn, checkOut: bookingForm.checkOut };
      setData((current) => ({ ...current, bookings: current.bookings.map((b) => b.id === editingBookingId ? { ...b, ...updated } : b) }));
      const op: PendingOp = { kind: 'upsert', table: 'bookings', row: bookingToRow(updated) };
      if (navigator.onLine) {
        const { error } = await supabase.from('bookings').upsert(bookingToRow(updated));
        if (error) queueOp(op);
      } else {
        queueOp(op);
      }
      setEditingBookingId(null);
      setModal(null);
      setMessage('Бронирование обновлено.');
    } else {
      const newBooking: Booking = { ...bookingForm, id: `booking-${Date.now()}`, guest: bookingForm.guest.trim(), checkIn: bookingForm.checkIn, checkOut: bookingForm.checkOut };
      setData((current) => ({ ...current, bookings: [...current.bookings, newBooking] }));
      const op: PendingOp = { kind: 'upsert', table: 'bookings', row: bookingToRow(newBooking) };
      if (navigator.onLine) {
        const { error } = await supabase.from('bookings').upsert(bookingToRow(newBooking));
        if (error) queueOp(op);
      } else {
        queueOp(op);
      }
      setModal(null);
      setMessage('Бронирование добавлено.');
    }
  }

  async function saveRoom() {
    const name = roomName.trim();
    if (!name) {
      setMessage('Введите название квартиры.');
      return;
    }
    const icalUrl = roomIcalUrl.trim();
    if (roomBeingEdited) {
      const updatedRoom: Room = { ...roomBeingEdited, name, color: roomColor, icalUrl };
      setData((current) => ({ ...current, rooms: current.rooms.map((room) => room.id === roomBeingEdited.id ? updatedRoom : room) }));
      const op: PendingOp = { kind: 'upsert', table: 'rooms', row: roomToRow(updatedRoom) };
      if (navigator.onLine) {
        const { error } = await supabase.from('rooms').update({ name, color: roomColor, ical_url: icalUrl || null }).eq('id', roomBeingEdited.id);
        if (error) queueOp(op);
      } else {
        queueOp(op);
      }
    } else {
      const room: Room = { id: `room-${Date.now()}`, name, color: roomColor, icalUrl };
      setData((current) => ({ ...current, rooms: [...current.rooms, room] }));
      const op: PendingOp = { kind: 'upsert', table: 'rooms', row: roomToRow(room) };
      if (navigator.onLine) {
        const { error } = await supabase.from('rooms').insert(roomToRow(room));
        if (error) queueOp(op);
      } else {
        queueOp(op);
      }
    }
    setModal(null);
  }

  async function removeRoom(room: Room) {
    setData((current) => ({ rooms: current.rooms.filter((item) => item.id !== room.id), bookings: current.bookings.filter((booking) => booking.roomId !== room.id) }));
    const op: PendingOp = { kind: 'delete', table: 'rooms', id: room.id };
    if (navigator.onLine) {
      const { error } = await supabase.from('rooms').delete().eq('id', room.id);
      if (error) {
        queueOp(op);
      } else {
        supabase.from('ical_bookings').delete().eq('room_id', room.id).then();
      }
    } else {
      queueOp(op);
    }
  }

  async function syncRoom(room: Room) {
    if (!room.icalUrl) {
      setMessage('У этой квартиры нет ссылки iCal. Добавьте её в настройках квартиры.');
      return;
    }
    setSyncingRoom(room.id);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/ical-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({ roomId: room.id, icalUrl: room.icalUrl }),
      });
      if (!res.ok) throw new Error(`Sync failed (${res.status})`);
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      const { data: rows } = await supabase.from('ical_bookings').select('*').eq('room_id', room.id);
      if (rows) setIcalBookings((current) => {
        const others = current.filter((b) => b.room_id !== room.id);
        return [...others, ...(rows as IcalBooking[])];
      });
      setMessage(`Синхронизация завершена: добавлено ${result.inserted}, удалено ${result.deleted}.`);
    } catch {
      setMessage('Не удалось синхронизировать календарь. Проверьте ссылку iCal.');
    }
    setSyncingRoom(null);
  }

  function syncAll() {
    const roomsWithIcal = data.rooms.filter((r) => r.icalUrl);
    if (roomsWithIcal.length === 0) {
      setMessage('Нет квартир с подключённым iCal.');
      return;
    }
    roomsWithIcal.forEach((room) => syncRoom(room));
  }

  useEffect(() => {
    const handleOnline = () => {
      flushPendingOps();
      data.rooms.filter((room) => room.icalUrl).forEach((room) => syncRoom(room));
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [data.rooms]);

  async function removeBooking(booking: Booking) {
    setData((current) => ({ ...current, bookings: current.bookings.filter((item) => item.id !== booking.id) }));
    setSelectedBooking(null);
    setModal(null);
    setMessage('Бронирование удалено.');
    const op: PendingOp = { kind: 'delete', table: 'bookings', id: booking.id };
    if (navigator.onLine) {
      const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
      if (error) queueOp(op);
    } else {
      queueOp(op);
    }
  }

  async function removeIcalBooking(booking: IcalBooking) {
    setIcalBookings((current) => current.filter((item) => item.id !== booking.id));
    setSelectedIcalBooking(null);
    setModal(null);
    setMessage('Импортированная бронь удалена локально.');
    const op: PendingOp = { kind: 'delete', table: 'ical_bookings', id: booking.id };
    if (navigator.onLine) {
      const { error } = await supabase.from('ical_bookings').delete().eq('id', booking.id);
      if (error) queueOp(op);
    } else {
      queueOp(op);
    }
  }

  function downloadBackup() {
    const contents = JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
    try {
      const blob = new Blob([contents], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `room-booking-${formatDate(new Date())}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Бэкап готов к сохранению.');
    } catch {
      setMessage('Не удалось создать бэкап.');
    }
  }

  function openReport() {
    setModal('report');
  }

  function downloadReportCsv() {
    const rows = filteredReport;
    const sep = ';';
    const header = ['Квартира', 'Гость', 'Заезд', 'Выезд', 'Ночей', 'Источник', 'Примечание'].join(sep);
    const csvRows = rows.map((r) => [r.room, r.guest, r.start, r.end, String(r.nights), r.source, r.note].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(sep));
    const csv = '\ufeff' + [header, ...csvRows].join('\r\n');
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${formatDate(new Date())}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Отчёт сохранён в CSV.');
    } catch {
      setMessage('Не удалось создать CSV.');
    }
  }

  function restoreBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const restored = JSON.parse(text) as AppData;
        if (!Array.isArray(restored.rooms) || !Array.isArray(restored.bookings)) throw new Error('invalid');
        setData({ rooms: restored.rooms, bookings: restored.bookings });
        setMessage('Данные восстановлены из бэкапа.');
        if (navigator.onLine) {
          await supabase.from('rooms').upsert(restored.rooms.map(roomToRow), { onConflict: 'id' });
          await supabase.from('bookings').upsert(restored.bookings.map(bookingToRow), { onConflict: 'id' });
        } else {
          restored.rooms.forEach((room) => queueOp({ kind: 'upsert', table: 'rooms', row: roomToRow(room) }));
          restored.bookings.forEach((booking) => queueOp({ kind: 'upsert', table: 'bookings', row: bookingToRow(booking) }));
        }
      } catch {
        setMessage('Файл бэкапа не распознан.');
      }
    };
    input.click();
  }

  async function changeWinterHeader(file: File) {
    try {
      const dataUrl = await readImageAsDataUrl(file);
      localStorage.setItem(WINTER_HEADER_STORAGE_KEY, dataUrl);
      setWinterHeader(dataUrl);
    } catch {
      setMessage('Не удалось сохранить фото шапки. Попробуйте другое фото.');
    }
  }

  function resetWinterHeader() {
    localStorage.removeItem(WINTER_HEADER_STORAGE_KEY);
    setWinterHeader(null);
  }

  function shiftMonth(amount: number) {
    setViewStart(new Date(viewStart.getFullYear(), viewStart.getMonth() + amount, 1));
  }

  const filteredReport = useMemo(() => {
    type ReportRow = { room: string; roomId: string; guest: string; start: string; end: string; nights: number; note: string; source: string; month: string };
    const rows: ReportRow[] = [];
    for (const room of data.rooms) {
      if (reportRoom !== 'all' && room.id !== reportRoom) continue;
      for (const b of data.bookings.filter((b) => b.roomId === room.id)) {
        const month = b.start.slice(0, 7);
        if (reportMonth !== 'all' && month !== reportMonth) continue;
        rows.push({ room: room.name, roomId: room.id, guest: b.guest || '—', start: b.start, end: b.end, nights: Math.max(daysBetween(b.start, b.end) - 1, 0), note: b.note || '', source: 'ручная', month });
      }
      for (const ib of icalBookings.filter((ib) => ib.room_id === room.id)) {
        const month = ib.start_date.slice(0, 7);
        if (reportMonth !== 'all' && month !== reportMonth) continue;
        rows.push({ room: room.name, roomId: room.id, guest: ib.local_summary || ib.summary || '—', start: ib.start_date, end: ib.end_date, nights: Math.max(daysBetween(ib.start_date, ib.end_date) - 1, 0), note: ib.note || '', source: 'iCal', month });
      }
    }
    return rows.sort((a, b) => a.start.localeCompare(b.start));
  }, [data, icalBookings, reportMonth, reportRoom]);

  const reportMonths = useMemo(() => {
    const set = new Set<string>();
    for (const b of data.bookings) set.add(b.start.slice(0, 7));
    for (const ib of icalBookings) set.add(ib.start_date.slice(0, 7));
    return Array.from(set).sort();
  }, [data.bookings, icalBookings]);

  const reportByRoom = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredReport) map.set(r.roomId, (map.get(r.roomId) ?? 0) + r.nights);
    return data.rooms.map((room) => ({ name: room.name, nights: map.get(room.id) ?? 0 }));
  }, [filteredReport, data.rooms]);

  const reportByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredReport) map.set(r.month, (map.get(r.month) ?? 0) + r.nights);
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([m, n]) => ({ month: m, nights: n }));
  }, [filteredReport]);

  const totalNights = filteredReport.reduce((s, r) => s + r.nights, 0);
  const maxRoomNights = Math.max(1, ...reportByRoom.map((r) => r.nights));
  const maxMonthNights = Math.max(1, ...reportByMonth.map((r) => r.nights));

  return (
    <div className={`screen ${theme}${theme === 'theme-domiki' || theme === 'theme-autumn' || theme === 'theme-winter' ? ' theme-illustrated' : ''}`}>
      <div
        className={theme === 'theme-winter' && winterHeader ? 'top-bar photo-top-bar' : 'top-bar'}
        style={theme === 'theme-winter' && winterHeader ? { backgroundImage: `url('${winterHeader}')` } : undefined}
      >
        <div className="brand-row">
          <div className="brand-mark"><CalendarDays size={22} color="#ffffff" /></div>
          <div>
            <span className="brand">RoomBooking</span>
            <span className="brand-subtitle">личный календарь квартир</span>
          </div>
        </div>
        <div className="top-actions">
          <div className="theme-report-group">
            <label className="theme-picker theme-picker-compact">
              <Palette size={16} />
              <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeId)} aria-label="Выбрать вид приложения">
                <option value="theme-classic">Исходный</option>
                <option value="theme-illustrated">Иллюстрированный</option>
                <option value="theme-domiki">Домики</option>
                <option value="theme-autumn">Осень</option>
                <option value="theme-winter">Фото</option>
              </select>
            </label>
            <button onClick={openReport} className="outline-button outline-button-compact"><FileText size={17} color="#17212b" /><span>Отчёт</span></button>
          </div>
          <button onClick={syncAll} className="outline-button"><RefreshCw size={17} color="#17212b" /><span>Синхронизировать iCal</span></button>
          <button onClick={restoreBackup} className="outline-button"><FileUp size={17} color="#17212b" /><span>Восстановить</span></button>
          <button onClick={downloadBackup} className="outline-button"><FileDown size={17} color="#17212b" /><span>Скачать бэкап</span></button>
          {theme === 'theme-winter' && (
            <>
              <label className="outline-button">
                <ImagePlus size={17} color="#17212b" /><span>Фото шапки</span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) changeWinterHeader(file);
                    event.target.value = '';
                  }}
                />
              </label>
              {winterHeader && <button onClick={resetWinterHeader} className="outline-button"><span>Вернуть фото</span></button>}
            </>
          )}
          <button onClick={openNewBooking} className="primary-button"><Plus size={18} color="#ffffff" /><span>Новая бронь</span></button>
        </div>
      </div>

      <div className="vertical-scroll">
        <div className="page">
          <div className="intro-row">
            <div>
              <span className="page-title">Бронирования</span>
              <span className="page-caption">Планируйте размещение гостей по дням без накладок</span>
            </div>
          </div>

          <div className="month-bar">
            <button onClick={() => shiftMonth(-1)} className="month-arrow"><ChevronLeft size={21} color="#17212b" /></button>
            <div className="month-center"><span className="month-title">{monthLabel}</span></div>
            <button onClick={goToToday} className="today-button">Сегодня</button>
            <button onClick={() => shiftMonth(1)} className="month-arrow"><ChevronRight size={21} color="#17212b" /></button>
          </div>

          <div className="timeline-scroll" ref={timelineScrollRef}>
            <div style={{ width: contentWidth }}>
              <div className="timeline-header">
                <div className="room-header" style={{ width: ROOM_WIDTH }}><span className="header-text">Квартиры</span></div>
                <div className="day-header-row" style={{ width: timelineWidth }}>
                  {days.map((day) => {
                    const dayValue = formatDate(day);
                    const weekend = day.getDay() === 0 || day.getDay() === 6;
                    const past = dayValue < todayValue;
                    return (
                      <div key={dayValue} className={`day-header${weekend ? ' weekend-header' : ''}${past ? ' past-day' : ''}`} style={{ width: DAY_WIDTH }}>
                        <span className={`weekday${weekend ? ' weekend-text' : ''}`}>{WEEKDAYS[day.getDay()]}</span>
                        <span className={`day-number${weekend ? ' weekend-text' : ''}`}>{`${day.getDate()}.${day.getMonth() + 1}`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {data.rooms.map((room) => {
                const roomBookings = data.bookings.filter((booking) => booking.roomId === room.id);
                const roomIcalBookings = icalBookings.filter((ib) => ib.room_id === room.id);
                return (
                  <div key={room.id} className="room-row">
                    <div className="room-cell" style={{ width: ROOM_WIDTH, backgroundColor: room.color ?? '#ffffff' }}>
                      <div className="room-cell-info">
                        <span className="room-name">{room.name}</span>
                        {room.icalUrl && <span className="room-ical-badge">iCal</span>}
                      </div>
                      <div className="room-actions">
                        {room.icalUrl && <button onClick={() => syncRoom(room)} disabled={syncingRoom === room.id} className={`icon-btn${syncingRoom === room.id ? ' spin' : ''}`}><RefreshCw size={14} color={syncingRoom === room.id ? '#c0c8cf' : '#66717d'} /></button>}
                        <button onClick={() => { setRoomBeingEdited(room); setRoomName(room.name); setRoomColor(room.color ?? APARTMENT_COLORS[0].value); setRoomIcalUrl(room.icalUrl ?? ''); setModal('room'); }} className="icon-btn"><Pencil size={15} color="#66717d" /></button>
                        <button onClick={() => removeRoom(room)} className="icon-btn"><Trash2 size={15} color="#c76c65" /></button>
                      </div>
                    </div>
                    <div className="timeline" style={{ width: timelineWidth }}>
                      {days.map((day) => {
                        const weekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <button
                            key={formatDate(day)}
                            onClick={() => openNewBookingOnDate(room.id, formatDate(day))}
                            className={`day-cell-timeline${weekend ? ' weekend-cell' : ''}`}
                            style={{ width: DAY_WIDTH }}
                          />
                        );
                      })}
                      {roomBookings.map((booking, bookingIndex) => {
                        const start = parseDate(booking.start);
                        const first = days[0];
                        const offset = Math.round((start.getTime() - first.getTime()) / 86400000);
                        const span = daysBetween(booking.start, booking.end);
                        if (offset + span <= 0 || offset >= days.length) return null;
                        const startCenter = offset * DAY_WIDTH + DAY_WIDTH / 2;
                        const endCenter = (offset + span - 1) * DAY_WIDTH + DAY_WIDTH / 2;
                        const barLeft = startCenter + SKEW_OFFSET;
                        const barWidth = Math.max(endCenter - startCenter - SKEW_OFFSET, 30);
                        const overlapCount = roomBookings.slice(0, bookingIndex).filter((other) => {
                          const sharesStayDate = other.start < booking.end && other.end > booking.start;
                          const isSameSingleDayBooking = other.start === booking.start && other.end === booking.end;
                          return sharesStayDate || isSameSingleDayBooking;
                        }).length;
                        return (
                          <button
                            key={booking.id}
                            onClick={() => { setSelectedBooking(booking); setSelectedIcalBooking(null); setModal('details'); }}
                            className="booking-bar"
                            style={{ backgroundColor: booking.color, left: barLeft, width: barWidth, top: overlapCount > 0 ? 3 : 18, zIndex: bookingIndex + 1 }}
                          >
                            <span className="booking-text">{booking.guest}</span>
                            <span className="booking-time booking-time-in">{booking.checkIn}</span>
                            <span className="booking-time booking-time-out">{booking.checkOut}</span>
                          </button>
                        );
                      })}
                      {roomIcalBookings.map((ib) => {
                        const start = parseDate(ib.start_date);
                        const first = days[0];
                        const offset = Math.round((start.getTime() - first.getTime()) / 86400000);
                        const span = daysBetween(ib.start_date, ib.end_date);
                        if (offset + span <= 0 || offset >= days.length) return null;
                        const startCenter = offset * DAY_WIDTH + DAY_WIDTH / 2;
                        const endCenter = (offset + span - 1) * DAY_WIDTH + DAY_WIDTH / 2;
                        const barLeft = startCenter + SKEW_OFFSET;
                        const barWidth = Math.max(endCenter - startCenter - SKEW_OFFSET, 30);
                        return (
                          <button
                            key={`ical-${ib.id}`}
                            onClick={() => { setSelectedIcalBooking(ib); setSelectedBooking(null); setModal('details'); }}
                            className="booking-bar ical-bar"
                            style={{ backgroundColor: ib.color || ICAL_COLOR, left: barLeft, width: barWidth, top: 3, zIndex: 0 }}
                          >
                            <span className="booking-text">{ib.local_summary || ib.summary}</span>
                            <span className="booking-time booking-time-in">{ib.check_in || ''}</span>
                            <span className="booking-time booking-time-out">{ib.check_out || ''}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="legend-row">
            <div className="legend-item"><div className="legend-dot" /><span className="legend-text">Нажмите на дату для новой брони или на бронь для деталей</span></div>
            <span className="swipe-hint">Смахните в сторону, чтобы увидеть все дни</span>
          </div>
          {message && (
            <button onClick={() => setMessage('')} className="message">
              <span className="message-text">{message}</span>
              <X size={16} color="#1b86b5" />
            </button>
          )}

          <div className="rooms-section">
            <div className="section-header">
              <div><span className="section-title">Квартиры</span><span className="section-caption">Добавляйте и переименовывайте свои пространства</span></div>
              <button onClick={() => { setRoomBeingEdited(null); setRoomName(''); setRoomColor(APARTMENT_COLORS[0].value); setRoomIcalUrl(''); setModal('room'); }} className="add-room-button"><Plus size={16} color="#1b86b5" /><span>Добавить квартиру</span></button>
            </div>
            <div className="room-chips">
              {data.rooms.map((room) => (
                <div key={room.id} className="room-chip"><div className="chip-dot" /><span className="chip-text">{room.name}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modal !== null && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className={`modal-card${modal === 'booking' ? ' booking-modal-card' : ''}`} onClick={(e) => e.stopPropagation()}>
            {modal === 'booking' && (
              <div className="form-content">
                <div className="modal-header">
                  <div><span className="modal-title">{editingBookingId ? 'Изменить бронь' : 'Новая бронь'}</span><span className="modal-subtitle">{editingBookingId ? 'Внесите изменения в размещение' : 'Заполните детали размещения'}</span></div>
                  <button onClick={() => setModal(null)} className="close-button"><X size={20} color="#66717d" /></button>
                </div>
                <label className="field-label">Имя гостя <span className="optional">(необязательно)</span></label>
                <input
                  value={bookingForm.guest}
                  onChange={(e) => setBookingForm((c) => ({ ...c, guest: e.target.value }))}
                  placeholder="Например, Ирина Маслова"
                  className="text-input"
                />
                <label className="field-label">Квартира</label>
                <div className="option-row">
                  {data.rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => !editingIcalBookingId && setBookingForm((c) => ({ ...c, roomId: room.id }))}
                      disabled={Boolean(editingIcalBookingId)}
                      className={`option-pill${bookingForm.roomId === room.id ? ' option-pill-active' : ''}${editingIcalBookingId ? ' option-pill-locked' : ''}`}
                    >
                      <span className={`option-text${bookingForm.roomId === room.id ? ' option-text-active' : ''}`}>{room.name}</span>
                    </button>
                  ))}
                </div>
                <label className="field-label">Даты проживания</label>
                <div className="date-inputs">
                  <button onClick={() => !editingIcalBookingId && setDateField('start')} disabled={Boolean(editingIcalBookingId)} className={`date-input${dateField === 'start' ? ' date-input-active' : ''}${editingIcalBookingId ? ' date-input-locked' : ''}`}>
                    <span className="date-caption">Заезд</span>
                    <span className="date-value">{dateLabel(bookingForm.start)}</span>
                  </button>
                  <div className="date-dash" />
                  <button onClick={() => !editingIcalBookingId && setDateField('end')} disabled={Boolean(editingIcalBookingId)} className={`date-input${dateField === 'end' ? ' date-input-active' : ''}${editingIcalBookingId ? ' date-input-locked' : ''}`}>
                    <span className="date-caption">Выезд</span>
                    <span className="date-value">{dateLabel(bookingForm.end)}</span>
                  </button>
                </div>
                {dateField && !editingIcalBookingId ? (
                  <CalendarPicker
                    value={bookingForm[dateField]}
                    onChange={(value) => {
                      setBookingForm((c) => ({ ...c, [dateField]: value, ...(dateField === 'start' && value > c.end ? { end: value } : {}) }));
                      setDateField(null);
                    }}
                  />
                ) : (
                  <span className="helper-text">{editingIcalBookingId ? 'Даты импортированы из Booking.com и не меняются локально' : 'Нажмите на дату, чтобы открыть календарь'}</span>
                )}
                <div className="time-inputs">
                  <div className="time-input-block">
                    <label className="time-label">Заезд</label>
                    <input
                      type="time"
                      value={bookingForm.checkIn}
                      onChange={(e) => setBookingForm((c) => ({ ...c, checkIn: e.target.value }))}
                      className="time-input"
                    />
                  </div>
                  <div className="time-input-block">
                    <label className="time-label">Выезд</label>
                    <input
                      type="time"
                      value={bookingForm.checkOut}
                      onChange={(e) => setBookingForm((c) => ({ ...c, checkOut: e.target.value }))}
                      className="time-input"
                    />
                  </div>
                </div>
                <label className="field-label">Цвет полосы</label>
                <div className="color-row">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setBookingForm((c) => ({ ...c, color: color.value }))}
                      className={`color-choice${bookingForm.color === color.value ? ' color-choice-selected' : ''}`}
                      style={{ backgroundColor: color.value }}
                    >
                      <span className="color-choice-text">{color.name}</span>
                    </button>
                  ))}
                </div>
                <label className="field-label">Примечание <span className="optional">(необязательно)</span></label>
                <textarea
                  value={bookingForm.note}
                  onChange={(e) => setBookingForm((c) => ({ ...c, note: e.target.value }))}
                  placeholder="Например, поздний заезд"
                  className="text-input note-input"
                  rows={3}
                />
                <button onClick={saveBooking} className="save-button">
                  <span className="save-button-text">{editingBookingId || editingIcalBookingId ? 'Сохранить изменения' : 'Сохранить бронь'}</span>
                </button>
              </div>
            )}

            {modal === 'room' && (
              <div>
                <div className="modal-header">
                  <div><span className="modal-title">{roomBeingEdited ? 'Переименовать квартиру' : 'Новая квартира'}</span><span className="modal-subtitle">Название будет видно в шахматке</span></div>
                  <button onClick={() => setModal(null)} className="close-button"><X size={20} color="#66717d" /></button>
                </div>
                <label className="field-label">Название</label>
                <input
                  autoFocus
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Например, Aurora"
                  className="text-input"
                />
                <label className="field-label">Цвет квартиры</label>
                <div className="room-color-row">
                  {APARTMENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      title={color.name}
                      aria-label={color.name}
                      onClick={() => setRoomColor(color.value)}
                      className={`room-color-choice${roomColor === color.value ? ' room-color-choice-selected' : ''}`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
                <label className="field-label">Ссылка iCal от Booking.com <span className="optional">(необязательно)</span></label>
                <input
                  value={roomIcalUrl}
                  onChange={(e) => setRoomIcalUrl(e.target.value)}
                  placeholder="https://admin.booking.com/..."
                  className="text-input"
                />
                <span className="helper-text">Вставьте ссылку экспорта календаря из Booking.com</span>
                <button onClick={saveRoom} className="save-button"><span className="save-button-text">Сохранить</span></button>
              </div>
            )}

            {modal === 'details' && selectedBooking && (
              <div>
                <div className="modal-header">
                  <div><span className="modal-title">{selectedBooking.guest || 'Бронирование без имени'}</span><span className="modal-subtitle">Детали бронирования</span></div>
                  <button onClick={() => setModal(null)} className="close-button"><X size={20} color="#66717d" /></button>
                </div>
                <div className="detail-color" style={{ backgroundColor: selectedBooking.color }}>
                  <span className="detail-color-text">{data.rooms.find((r) => r.id === selectedBooking.roomId)?.name ?? 'Квартира'}</span>
                </div>
                <div className="detail-line">
                  <span className="detail-label">Проживание</span>
                  <span className="detail-value">{dateLabel(selectedBooking.start)} — {dateLabel(selectedBooking.end)}</span>
                </div>
                <div className="detail-line">
                  <span className="detail-label">Время заезда / выезда</span>
                  <span className="detail-value">{selectedBooking.checkIn || '—'} / {selectedBooking.checkOut || '—'}</span>
                </div>
                {selectedBooking.note && (
                  <div className="detail-line">
                    <span className="detail-label">Примечание</span>
                    <span className="detail-value">{selectedBooking.note}</span>
                  </div>
                )}
                <div className="detail-actions">
                  <button onClick={() => openEditBooking(selectedBooking)} className="edit-button"><Pencil size={17} color="#176681" /><span>Изменить</span></button>
                  <button onClick={() => removeBooking(selectedBooking)} className="delete-button"><Trash2 size={17} color="#bd554e" /><span>Удалить бронь</span></button>
                </div>
              </div>
            )}

            {modal === 'details' && !selectedBooking && selectedIcalBooking && (
              <div>
                <div className="modal-header">
                  <div><span className="modal-title">{selectedIcalBooking.local_summary || selectedIcalBooking.summary || 'Бронирование без имени'}</span><span className="modal-subtitle">Импортировано из Booking.com</span></div>
                  <button onClick={() => setModal(null)} className="close-button"><X size={20} color="#66717d" /></button>
                </div>
                <div className="detail-color" style={{ backgroundColor: selectedIcalBooking.color || ICAL_COLOR }}>
                  <span className="detail-color-text">{data.rooms.find((r) => r.id === selectedIcalBooking.room_id)?.name ?? 'Квартира'}</span>
                </div>
                <div className="detail-line">
                  <span className="detail-label">Проживание</span>
                  <span className="detail-value">{dateLabel(selectedIcalBooking.start_date)} — {dateLabel(selectedIcalBooking.end_date)}</span>
                </div>
                <div className="detail-line">
                  <span className="detail-label">Время заезда / выезда</span>
                  <span className="detail-value">{selectedIcalBooking.check_in || '—'} / {selectedIcalBooking.check_out || '—'}</span>
                </div>
                {selectedIcalBooking.note && (
                  <div className="detail-line">
                    <span className="detail-label">Примечание</span>
                    <span className="detail-value">{selectedIcalBooking.note}</span>
                  </div>
                )}
                <div className="detail-actions">
                  <button onClick={() => openEditIcalBooking(selectedIcalBooking)} className="edit-button"><Pencil size={17} color="#176681" /><span>Изменить</span></button>
                  <button onClick={() => removeIcalBooking(selectedIcalBooking)} className="delete-button"><Trash2 size={17} color="#bd554e" /><span>Удалить</span></button>
                </div>
              </div>
            )}

            {modal === 'report' && (
              <div className="report-modal-content">
                <div className="modal-header">
                  <div><span className="modal-title">Отчёт по бронированиям</span><span className="modal-subtitle">Аналитика и выгрузка</span></div>
                  <button onClick={() => setModal(null)} className="close-button"><X size={20} color="#66717d" /></button>
                </div>

                <div className="report-filters">
                  <label className="field-label">Месяц</label>
                  <select value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="text-input report-select">
                    <option value="all">Все месяцы</option>
                    {reportMonths.map((m) => {
                      const [y, mo] = m.split('-');
                      return <option key={m} value={m}>{MONTHS[Number(mo) - 1]} {y}</option>;
                    })}
                  </select>
                  <label className="field-label">Квартира</label>
                  <select value={reportRoom} onChange={(e) => setReportRoom(e.target.value)} className="text-input report-select">
                    <option value="all">Все квартиры</option>
                    {data.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                  </select>
                  <button onClick={downloadReportCsv} className="save-button report-csv-btn"><Download size={16} color="#fff" /><span className="save-button-text">Скачать CSV</span></button>
                </div>

                <div className="report-stats">
                  <div className="report-stat-card">
                    <span className="report-stat-number">{filteredReport.length}</span>
                    <span className="report-stat-label">бронирований</span>
                  </div>
                  <div className="report-stat-card">
                    <span className="report-stat-number">{totalNights}</span>
                    <span className="report-stat-label">ночей всего</span>
                  </div>
                  <div className="report-stat-card">
                    <span className="report-stat-number">{data.rooms.length}</span>
                    <span className="report-stat-label">квартир</span>
                  </div>
                </div>

                {reportByRoom.length > 0 && (
                  <div className="report-chart-section">
                    <span className="report-chart-title">Ночи по квартирам</span>
                    <div className="report-bars">
                      {reportByRoom.map((r, i) => (
                        <div key={r.name} className="report-bar-row">
                          <span className="report-bar-label">{r.name}</span>
                          <div className="report-bar-track">
                            <div className="report-bar-fill" style={{ width: `${(r.nights / maxRoomNights) * 100}%`, backgroundColor: REPORT_COLORS[i % REPORT_COLORS.length] }} />
                            <span className="report-bar-value">{r.nights}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportByMonth.length > 0 && (
                  <div className="report-chart-section">
                    <span className="report-chart-title">Ночи по месяцам</span>
                    <div className="report-chart-months">
                      {reportByMonth.map((r, i) => {
                        const [y, mo] = r.month.split('-');
                        return (
                          <div key={r.month} className="report-month-col">
                            <div className="report-month-bar-wrap">
                              <div className="report-month-bar" style={{ height: `${(r.nights / maxMonthNights) * 100}%`, backgroundColor: REPORT_COLORS[i % REPORT_COLORS.length] }} />
                            </div>
                            <span className="report-month-label">{MONTHS[Number(mo) - 1].slice(0, 3)}</span>
                            <span className="report-month-value">{r.nights}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Квартира</th>
                        <th>Гость</th>
                        <th>Заезд</th>
                        <th>Выезд</th>
                        <th>Ночей</th>
                        <th>Источник</th>
                        <th>Примечание</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReport.length === 0 ? (
                        <tr><td colSpan={7} className="report-empty">Нет данных для выбранных фильтров</td></tr>
                      ) : filteredReport.map((r, i) => (
                        <tr key={i} className={r.source === 'iCal' ? 'report-row-ical' : ''}>
                          <td><span className="report-room-tag" style={{ backgroundColor: REPORT_COLORS[data.rooms.findIndex((rm) => rm.id === r.roomId) % REPORT_COLORS.length] }}>{r.room}</span></td>
                          <td>{r.guest}</td>
                          <td>{dateLabel(r.start)}</td>
                          <td>{dateLabel(r.end)}</td>
                          <td className="report-nights-cell">{r.nights}</td>
                          <td><span className={`report-source-badge ${r.source === 'iCal' ? 'report-source-ical' : 'report-source-manual'}`}>{r.source}</span></td>
                          <td className="report-note-cell">{r.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
