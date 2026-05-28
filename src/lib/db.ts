import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join( process.cwd(), "bookings.db" );

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if ( !dbInstance ) {
    dbInstance = new Database( DB_PATH );
    
    // Create bookings, blocked slots, and chauffeurs tables
    dbInstance.exec( `
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT UNIQUE NOT NULL,
        tripType TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        duration INTEGER,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        tripDetails TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS blocked_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        duration INTEGER NOT NULL,
        recurring TEXT DEFAULT 'none',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chauffeurs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        status TEXT DEFAULT 'active'
      );
    ` );

    // Alter table migrations to add columns safely if they do not exist
    try {
      dbInstance.exec( "ALTER TABLE blocked_slots ADD COLUMN endDate TEXT;" );
    } catch ( e ) {}
    try {
      dbInstance.exec( "ALTER TABLE blocked_slots ADD COLUMN isFullDay INTEGER DEFAULT 0;" );
    } catch ( e ) {}
    try {
      dbInstance.exec( "ALTER TABLE bookings ADD COLUMN chauffeurId INTEGER;" );
    } catch ( e ) {}
    try {
      dbInstance.exec( "ALTER TABLE blocked_slots ADD COLUMN chauffeurId INTEGER;" );
    } catch ( e ) {}

    // Auto-seed chauffeurs if empty
    try {
      const rowCount = dbInstance.prepare( "SELECT COUNT(*) as count FROM chauffeurs" ).get() as { count: number };
      if ( rowCount.count === 0 ) {
        const insertChauffeur = dbInstance.prepare(
          "INSERT INTO chauffeurs (name, email, phone) VALUES (?, ?, ?)"
        );
        insertChauffeur.run( "James Mercer", "james@goldridr.com", "+1 (713) 555-0199" );
        insertChauffeur.run( "Sarah Connor", "sarah@goldridr.com", "+1 (713) 555-0211" );
        insertChauffeur.run( "Michael Vance", "michael@goldridr.com", "+1 (713) 555-0288" );
      }
    } catch ( e ) {
      console.error( "Failed to seed chauffeurs:", e );
    }
  }
  return dbInstance;
}

export interface ChauffeurRecord {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
}

export interface BookingRecord {
  id: number;
  reference: string;
  tripType: string;
  date: string;
  time: string;
  duration: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  status: string;
  tripDetails: string; // JSON string
  chauffeurId?: number | null;
  createdAt: string;
}

export function getAllChauffeurs(): ChauffeurRecord[] {
  const db = getDb();
  return db.prepare( "SELECT * FROM chauffeurs WHERE status = 'active'" ).all() as ChauffeurRecord[];
}

export function saveBooking( booking: Omit<BookingRecord, "id" | "createdAt"> ): BookingRecord {
  const db = getDb();
  const stmt = db.prepare( `
    INSERT INTO bookings (
      reference, tripType, date, time, duration, name, email, phone, notes, status, tripDetails, chauffeurId
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  ` );

  stmt.run(
    booking.reference,
    booking.tripType,
    booking.date,
    booking.time,
    booking.duration,
    booking.name,
    booking.email,
    booking.phone,
    booking.notes,
    booking.status,
    booking.tripDetails,
    booking.chauffeurId || null
  );

  const row = db.prepare( "SELECT * FROM bookings WHERE reference = ?" ).get( booking.reference ) as BookingRecord;
  return row;
}

export function getAllBookings(): BookingRecord[] {
  const db = getDb();
  return db.prepare( "SELECT * FROM bookings ORDER BY createdAt DESC" ).all() as BookingRecord[];
}

export function updateBookingStatus( reference: string, status: string ): boolean {
  const db = getDb();
  const stmt = db.prepare( "UPDATE bookings SET status = ? WHERE reference = ?" );
  const result = stmt.run( status, reference );
  return result.changes > 0;
}

export function updateBookingChauffeur( reference: string, chauffeurId: number | null ): boolean {
  const db = getDb();
  const stmt = db.prepare( "UPDATE bookings SET chauffeurId = ? WHERE reference = ?" );
  const result = stmt.run( chauffeurId, reference );
  return result.changes > 0;
}

export function deleteBooking( reference: string ): boolean {
  const db = getDb();
  const stmt = db.prepare( "DELETE FROM bookings WHERE reference = ?" );
  const result = stmt.run( reference );
  return result.changes > 0;
}

export function checkBookingClash(
  date: string,
  time: string,
  durationMinutes: number,
  chauffeurId?: number | null
): { clash: boolean; conflictingBooking?: BookingRecord } {
  try {
    const db = getDb();
    
    // Fetch active/confirmed bookings on the date
    let bookingsOnDate: BookingRecord[];
    if ( chauffeurId !== undefined && chauffeurId !== null ) {
      bookingsOnDate = db.prepare(
        "SELECT * FROM bookings WHERE date = ? AND chauffeurId = ? AND status IN ('confirmed', 'accepted')"
      ).all( date, chauffeurId ) as BookingRecord[];
    } else {
      bookingsOnDate = db.prepare(
        "SELECT * FROM bookings WHERE date = ? AND status IN ('confirmed', 'accepted')"
      ).all( date ) as BookingRecord[];
    }

    const requestedStart = new Date( `${ date }T${ time }:00` ).getTime();
    const requestedEnd = requestedStart + durationMinutes * 60 * 1000;

    for ( const b of bookingsOnDate ) {
      try {
        const existingStart = new Date( `${ b.date }T${ b.time }:00` ).getTime();
        const existingEnd = existingStart + b.duration * 60 * 1000;

        // Check overlap: start A < end B AND end A > start B
        if ( requestedStart < existingEnd && requestedEnd > existingStart ) {
          return { clash: true, conflictingBooking: b };
        }
      } catch ( err ) {
        console.error( "Error parsing existing booking date for clash:", err );
      }
    }
  } catch ( err ) {
    console.error( "Database error in checkBookingClash:", err );
  }

  return { clash: false };
}

export interface BlockedSlotRecord {
  id: number;
  title: string;
  date: string;
  endDate?: string;
  isFullDay: number;
  time: string;
  duration: number;
  recurring: string; // 'none', 'daily', 'weekly', 'weekends'
  chauffeurId?: number | null;
  createdAt: string;
}

export function saveBlockedSlot( block: Omit<BlockedSlotRecord, "id" | "createdAt"> ): BlockedSlotRecord {
  const db = getDb();
  const stmt = db.prepare( `
    INSERT INTO blocked_slots (
      title, date, endDate, isFullDay, time, duration, recurring, chauffeurId
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?
    )
  ` );
  stmt.run( 
    block.title, 
    block.date, 
    block.endDate || null, 
    block.isFullDay ?? 0, 
    block.time, 
    block.duration, 
    block.recurring,
    block.chauffeurId || null
  );
  const row = db.prepare( "SELECT * FROM blocked_slots ORDER BY id DESC LIMIT 1" ).get() as BlockedSlotRecord;
  return row;
}

export function getAllBlockedSlots(): BlockedSlotRecord[] {
  const db = getDb();
  return db.prepare( "SELECT * FROM blocked_slots ORDER BY id DESC" ).all() as BlockedSlotRecord[];
}

export function deleteBlockedSlot( id: number ): boolean {
  const db = getDb();
  const stmt = db.prepare( "DELETE FROM blocked_slots WHERE id = ?" );
  const result = stmt.run( id );
  return result.changes > 0;
}

export function checkBlockedClash(
  date: string,
  time: string,
  durationMinutes: number,
  chauffeurId?: number | null
): { clash: boolean; conflictingBlock?: BlockedSlotRecord } {
  try {
    const db = getDb();
    let blocks: BlockedSlotRecord[];

    if ( chauffeurId !== undefined && chauffeurId !== null ) {
      blocks = db.prepare( "SELECT * FROM blocked_slots WHERE chauffeurId IS NULL OR chauffeurId = ?" ).all( chauffeurId ) as BlockedSlotRecord[];
    } else {
      blocks = db.prepare( "SELECT * FROM blocked_slots" ).all() as BlockedSlotRecord[];
    }

    const requestedStart = new Date( `${ date }T${ time }:00` ).getTime();
    const requestedEnd = requestedStart + durationMinutes * 60 * 1000;

    for ( const b of blocks ) {
      try {
        let isDateOverlap = false;
        const requestedDOW = new Date( `${ date }T00:00:00` ).getDay();

        if ( b.recurring === "none" ) {
          // Date range check if endDate exists, else exact match
          if ( b.endDate ) {
            isDateOverlap = date >= b.date && date <= b.endDate;
          } else {
            isDateOverlap = b.date === date;
          }
        } else if ( b.recurring === "daily" ) {
          // Daily blocks apply to any date
          isDateOverlap = true;
        } else if ( b.recurring === "weekly" ) {
          // Weekly matches if DOW is identical
          const blockDOW = new Date( `${ b.date }T00:00:00` ).getDay();
          isDateOverlap = requestedDOW === blockDOW;
        } else if ( b.recurring === "weekends" ) {
          // Weekends matches Saturday (6) or Sunday (0)
          isDateOverlap = requestedDOW === 0 || requestedDOW === 6;
        }

        if ( isDateOverlap ) {
          // Full-Day block locks the ENTIRE day instantly
          if ( b.isFullDay === 1 ) {
            return { clash: true, conflictingBlock: b };
          }

          // Otherwise, compare normalized time spans
          const [ bHours, bMins ] = b.time.split( ":" );
          const blockStartOnReqDate = new Date( `${ date }T${ bHours.padStart( 2, "0" ) }:${ bMins.padStart( 2, "0" ) }:00` ).getTime();
          const blockEndOnReqDate = blockStartOnReqDate + b.duration * 60 * 1000;

          // Check overlap: requestedStart < blockEnd AND requestedEnd > blockStart
          if ( requestedStart < blockEndOnReqDate && requestedEnd > blockStartOnReqDate ) {
            return { clash: true, conflictingBlock: b };
          }
        }
      } catch ( err ) {
        console.error( "Error in block clash check:", err );
      }
    }
  } catch ( err ) {
    console.error( "Database error in checkBlockedClash:", err );
  }

  return { clash: false };
}

export function findAvailableChauffeur(
  date: string,
  time: string,
  durationMinutes: number
): ChauffeurRecord | null {
  const chauffeurs = getAllChauffeurs();
  for ( const c of chauffeurs ) {
    const bClash = checkBookingClash( date, time, durationMinutes, c.id );
    if ( bClash.clash ) continue;

    const blockClash = checkBlockedClash( date, time, durationMinutes, c.id );
    if ( blockClash.clash ) continue;

    // Chauffeur is completely available!
    return c;
  }
  return null;
}
