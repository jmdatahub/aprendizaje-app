/**
 * SM-2 "lite" — algoritmo de repetición espaciada puro (sin efectos secundarios).
 *
 * Calcula cuándo conviene repasar un aprendizaje para maximizar la RETENCIÓN,
 * basándose en una versión simplificada del algoritmo SM-2 (SuperMemo 2).
 *
 * Todo es determinista y libre de estado externo: las funciones reciben la
 * fecha `now` como argumento (nunca llaman a `new Date()` internamente, salvo
 * que se les pase). Así son fácilmente testeables y reproducibles.
 *
 * Persistencia: el campo `srs` se guarda dentro de cada item de
 * `sector_data_<sectorId>` en localStorage. Es ADITIVO: los lectores antiguos
 * que ignoran el campo siguen funcionando igual.
 */

/** Estado SRS persistido junto a cada aprendizaje. */
export type SrsState = {
  /** Nº de repasos exitosos consecutivos (se reinicia a 0 con 'again'). */
  reps: number;
  /** Intervalo actual en días hasta el próximo repaso (>= 1 una vez programado). */
  intervalDays: number;
  /** Factor de facilidad SM-2, acotado a [1.3, 3.0]. */
  ease: number;
  /** Fecha (ISO) en la que el item vuelve a estar "due" (pendiente de repaso). */
  dueDate: string;
  /** Fecha (ISO) del último repaso registrado, o null si nunca se ha repasado. */
  lastReviewed: string | null;
};

/** Calidad del repaso indicada por el usuario. */
export type ReviewGrade = 'again' | 'good' | 'easy';

// --- Constantes del algoritmo ---
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const DEFAULT_EASE = 2.5;
const MIN_INTERVAL_DAYS = 1;
/** Techo del intervalo (1 año): evita crecimiento descontrolado y overflow de fechas. */
const MAX_INTERVAL_DAYS = 365;
/** Bonus multiplicativo aplicado al intervalo cuando el grado es 'easy'. */
const EASY_BONUS = 1.3;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Acota un número al rango [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Devuelve una nueva fecha = base + `days` días. */
function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * MS_PER_DAY);
}

/**
 * Crea el estado SRS inicial para un aprendizaje recién guardado.
 *
 * Decisión documentada: `dueDate = now` (debido YA). Un aprendizaje recién
 * creado conviene reforzarlo pronto; al estar "due" desde el inicio aparecerá
 * en "Repasar hoy" hasta que el usuario haga su primer repaso, momento en el
 * que el intervalo empezará a crecer.
 */
export function initSrs(now: Date): SrsState {
  return {
    reps: 0,
    intervalDays: 0,
    ease: DEFAULT_EASE,
    dueDate: now.toISOString(),
    lastReviewed: null,
  };
}

/**
 * Aplica un repaso al estado SRS y devuelve el NUEVO estado (no muta el original).
 *
 * - `again`: el usuario falló/olvidó. Reinicia reps a 0, intervalo a ~1 día y
 *   baja el ease en 0.2 (acotado a MIN_EASE). Vuelve a estar due mañana.
 * - `good`: recuerdo correcto. Progresión de intervalos: reps 0 -> 1 día,
 *   reps 1 -> 3 días, después `intervalDays * ease`. El ease se mantiene.
 * - `easy`: recuerdo muy fácil. Igual que 'good' pero con bonus en el intervalo
 *   y subiendo el ease en 0.15 (acotado a MAX_EASE).
 *
 * Si `state` es undefined (aprendizaje sin SRS previo), se parte de un estado
 * inicial — así el primer repaso siempre programa correctamente el siguiente.
 *
 * Determinista: dadas las mismas entradas devuelve siempre el mismo resultado.
 */
export function reviewSrs(state: SrsState | undefined, grade: ReviewGrade, now: Date): SrsState {
  const prev = state ?? initSrs(now);

  if (grade === 'again') {
    const ease = clamp(prev.ease - 0.2, MIN_EASE, MAX_EASE);
    const intervalDays = MIN_INTERVAL_DAYS;
    return {
      reps: 0,
      intervalDays,
      ease,
      dueDate: addDays(now, intervalDays).toISOString(),
      lastReviewed: now.toISOString(),
    };
  }

  // grade === 'good' | 'easy'
  const reps = prev.reps + 1;
  let ease = prev.ease;
  if (grade === 'easy') {
    ease = clamp(prev.ease + 0.15, MIN_EASE, MAX_EASE);
  }

  let intervalDays: number;
  if (reps === 1) {
    intervalDays = 1;
  } else if (reps === 2) {
    intervalDays = 3;
  } else {
    intervalDays = prev.intervalDays * ease;
  }

  if (grade === 'easy') {
    intervalDays *= EASY_BONUS;
  }

  // Acota a [1, MAX_INTERVAL_DAYS] y redondea a días enteros para intervalos
  // predecibles y para evitar overflow de fechas tras muchos repasos seguidos.
  intervalDays = clamp(Math.round(intervalDays), MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS);

  return {
    reps,
    intervalDays,
    ease,
    dueDate: addDays(now, intervalDays).toISOString(),
    lastReviewed: now.toISOString(),
  };
}

/**
 * ¿Está el item pendiente de repaso (due) en el instante `now`?
 *
 * Decisión documentada: si `state` es undefined (el item NUNCA fue programado
 * con SRS) devolvemos `false`. Así NO marcamos como pendientes de golpe todos
 * los aprendizajes antiguos creados antes de existir el SRS; solo cuentan los
 * que ya tienen estado SRS y cuya `dueDate` ya pasó.
 */
export function isDue(state: SrsState | undefined, now: Date): boolean {
  if (!state) return false;
  const due = new Date(state.dueDate);
  if (isNaN(due.getTime())) return false;
  return due.getTime() <= now.getTime();
}

/**
 * Días que faltan hasta que el item vuelva a estar due.
 * Negativo si ya está vencido; 0 si vence hoy. Si no hay state, devuelve 0
 * (interpretación neutra: no hay nada programado que esperar).
 */
export function daysUntilDue(state: SrsState | undefined, now: Date): number {
  if (!state) return 0;
  const due = new Date(state.dueDate);
  if (isNaN(due.getTime())) return 0;
  return Math.ceil((due.getTime() - now.getTime()) / MS_PER_DAY);
}
