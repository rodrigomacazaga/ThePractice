import { db } from "@/lib/db";

/**
 * Ocupación y rendimiento del inventario físico.
 *
 * La métrica clave es **RevPAH** (ingreso por hora-sala disponible), el
 * equivalente del RevPAR hotelero: permite comparar salas y sedes de distinto
 * tamaño en la misma escala, algo que el ingreso bruto no permite.
 *
 *   horas disponibles = salas activas × horas de operación × días del periodo
 *   RevPAH            = ingreso del periodo / horas disponibles
 *
 * Las reservas que se pagan con créditos no llevan `priceCents`, así que su
 * ingreso se valora al precio por hora del tipo de sala: sin eso, una sede que
 * opera con membresías parecería no generar nada.
 */

/** Estados que ocupan la sala de verdad (excluye canceladas y no-shows). */
const OCCUPYING = ["CONFIRMED", "CHECKED_IN", "COMPLETED"] as const;

export interface RoomPerformance {
  roomId: string;
  roomName: string;
  roomTypeName: string;
  roomTypeCode: string;
  horasReservadas: number;
  horasDisponibles: number;
  ocupacionPct: number;
  ingresoCents: number;
  revpahCents: number;
  reservas: number;
  incidencias: number;
}

export interface LocationOccupancy {
  locationId: string;
  horasReservadas: number;
  horasDisponibles: number;
  ocupacionPct: number;
  ingresoCents: number;
  revpahCents: number;
  salasActivas: number;
}

function hoursBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / 3_600_000);
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
}

/**
 * Rendimiento por sala de una ubicación en el periodo dado.
 * `openingHour`/`closingHour` de la ubicación definen las horas vendibles.
 */
export async function getRoomPerformance(
  locationId: string,
  from: Date,
  to: Date
): Promise<RoomPerformance[]> {
  const [location, rooms, bookings, incidents] = await Promise.all([
    db.location.findUnique({
      where: { id: locationId },
      select: { openingHour: true, closingHour: true },
    }),
    db.room.findMany({
      where: { locationId, active: true },
      select: {
        id: true,
        name: true,
        hourlyPriceCentsOverride: true,
        roomType: { select: { name: true, code: true, baseHourlyPriceCents: true } },
      },
      orderBy: { slug: "asc" },
    }),
    db.booking.findMany({
      where: {
        locationId,
        status: { in: [...OCCUPYING] },
        startsAt: { gte: from, lt: to },
      },
      select: { roomId: true, startsAt: true, endsAt: true, priceCents: true },
    }),
    db.incident.groupBy({
      by: ["roomId"],
      where: { locationId, createdAt: { gte: from, lt: to } },
      _count: true,
    }),
  ]);

  if (!location) return [];

  const operatingHoursPerDay = Math.max(0, location.closingHour - location.openingHour);
  const horasDisponibles = operatingHoursPerDay * daysBetween(from, to);
  const incidentsByRoom = new Map(incidents.map((i) => [i.roomId, i._count]));

  return rooms.map((room) => {
    const propias = bookings.filter((b) => b.roomId === room.id);
    const horasReservadas = propias.reduce((sum, b) => sum + hoursBetween(b.startsAt, b.endsAt), 0);

    // Precio de referencia para valorar reservas pagadas con créditos.
    const precioHora = room.hourlyPriceCentsOverride ?? room.roomType.baseHourlyPriceCents;
    const ingresoCents = propias.reduce((sum, b) => {
      if (b.priceCents != null) return sum + b.priceCents;
      return sum + Math.round(precioHora * hoursBetween(b.startsAt, b.endsAt));
    }, 0);

    return {
      roomId: room.id,
      roomName: room.name,
      roomTypeName: room.roomType.name,
      roomTypeCode: room.roomType.code,
      horasReservadas: Math.round(horasReservadas * 10) / 10,
      horasDisponibles,
      ocupacionPct: horasDisponibles > 0 ? Math.round((horasReservadas / horasDisponibles) * 100) : 0,
      ingresoCents,
      revpahCents: horasDisponibles > 0 ? Math.round(ingresoCents / horasDisponibles) : 0,
      reservas: propias.length,
      incidencias: incidentsByRoom.get(room.id) ?? 0,
    };
  });
}

/** Agregado de ocupación por ubicación, para la comparativa del dashboard. */
export async function getOccupancyByLocation(from: Date, to: Date): Promise<LocationOccupancy[]> {
  const locations = await db.location.findMany({
    where: { status: { not: "CLOSED" } },
    select: { id: true },
    orderBy: { sort: "asc" },
  });

  const results: LocationOccupancy[] = [];
  for (const loc of locations) {
    const rooms = await getRoomPerformance(loc.id, from, to);
    const horasReservadas = rooms.reduce((s, r) => s + r.horasReservadas, 0);
    const horasDisponibles = rooms.reduce((s, r) => s + r.horasDisponibles, 0);
    const ingresoCents = rooms.reduce((s, r) => s + r.ingresoCents, 0);
    results.push({
      locationId: loc.id,
      horasReservadas: Math.round(horasReservadas * 10) / 10,
      horasDisponibles,
      ocupacionPct: horasDisponibles > 0 ? Math.round((horasReservadas / horasDisponibles) * 100) : 0,
      ingresoCents,
      revpahCents: horasDisponibles > 0 ? Math.round(ingresoCents / horasDisponibles) : 0,
      salasActivas: rooms.length,
    });
  }
  return results;
}

export interface RoomTypePerformance {
  roomTypeId: string;
  code: string;
  name: string;
  locationId: string;
  salas: number;
  horasReservadas: number;
  horasDisponibles: number;
  ocupacionPct: number;
  ingresoCents: number;
  revpahCents: number;
}

/** Rendimiento agregado por tipo de sala (una ubicación, o toda la red). */
export async function getRoomTypePerformance(
  from: Date,
  to: Date,
  locationId?: string
): Promise<RoomTypePerformance[]> {
  const roomTypes = await db.roomType.findMany({
    where: { active: true, ...(locationId ? { locationId } : {}) },
    select: {
      id: true,
      code: true,
      name: true,
      locationId: true,
      baseHourlyPriceCents: true,
      location: { select: { openingHour: true, closingHour: true } },
      rooms: { where: { active: true }, select: { id: true, hourlyPriceCentsOverride: true } },
    },
    orderBy: { sort: "asc" },
  });

  const roomIds = roomTypes.flatMap((rt) => rt.rooms.map((r) => r.id));
  const bookings = roomIds.length
    ? await db.booking.findMany({
        where: {
          roomId: { in: roomIds },
          status: { in: [...OCCUPYING] },
          startsAt: { gte: from, lt: to },
        },
        select: { roomId: true, startsAt: true, endsAt: true, priceCents: true },
      })
    : [];

  const dias = daysBetween(from, to);

  return roomTypes.map((rt) => {
    const misRooms = new Set(rt.rooms.map((r) => r.id));
    const propias = bookings.filter((b) => b.roomId && misRooms.has(b.roomId));
    const horasReservadas = propias.reduce((s, b) => s + hoursBetween(b.startsAt, b.endsAt), 0);
    const horasPorDia = Math.max(0, rt.location.closingHour - rt.location.openingHour);
    const horasDisponibles = horasPorDia * dias * rt.rooms.length;
    const ingresoCents = propias.reduce((sum, b) => {
      if (b.priceCents != null) return sum + b.priceCents;
      const room = rt.rooms.find((r) => r.id === b.roomId);
      const precio = room?.hourlyPriceCentsOverride ?? rt.baseHourlyPriceCents;
      return sum + Math.round(precio * hoursBetween(b.startsAt, b.endsAt));
    }, 0);

    return {
      roomTypeId: rt.id,
      code: rt.code,
      name: rt.name,
      locationId: rt.locationId,
      salas: rt.rooms.length,
      horasReservadas: Math.round(horasReservadas * 10) / 10,
      horasDisponibles,
      ocupacionPct: horasDisponibles > 0 ? Math.round((horasReservadas / horasDisponibles) * 100) : 0,
      ingresoCents,
      revpahCents: horasDisponibles > 0 ? Math.round(ingresoCents / horasDisponibles) : 0,
    };
  });
}

export interface HourHeatCell {
  weekday: number; // 0 = domingo
  hour: number;
  horas: number;
  reservas: number;
}

/**
 * Mapa de calor de ocupación por día de la semana y hora. Es la base para
 * decidir tarifas por franja y para justificar conversiones de sala.
 */
export async function getHourlyHeatmap(
  locationId: string,
  from: Date,
  to: Date
): Promise<HourHeatCell[]> {
  const bookings = await db.booking.findMany({
    where: { locationId, status: { in: [...OCCUPYING] }, startsAt: { gte: from, lt: to } },
    select: { startsAt: true, endsAt: true },
  });

  const cells = new Map<string, HourHeatCell>();
  for (const b of bookings) {
    // Una reserva de varias horas cuenta en cada hora que ocupa.
    const start = new Date(b.startsAt);
    const totalHoras = Math.max(1, Math.round(hoursBetween(b.startsAt, b.endsAt)));
    for (let i = 0; i < totalHoras; i++) {
      const t = new Date(start.getTime() + i * 3_600_000);
      const weekday = t.getDay();
      const hour = t.getHours();
      const key = `${weekday}-${hour}`;
      const cell = cells.get(key) ?? { weekday, hour, horas: 0, reservas: 0 };
      cell.horas += 1;
      if (i === 0) cell.reservas += 1;
      cells.set(key, cell);
    }
  }
  return [...cells.values()];
}
