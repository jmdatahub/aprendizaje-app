// /api/sorpresas
// Devuelve un chiste y una curiosidad (“sorpresa”) del sector pedido, con rotación simple por cookie.
// Además, si hay OPENAI_API_KEY y USE_STUB_AI !== '1', pule ligeramente ambos textos con gpt-4o-mini.

import { NextResponse } from 'next/server'
import { getOpenAIClient, isStubMode } from '@/lib/openai'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

// Util: quitar acentos y normalizar
function slug(s = '') {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizaSector(nombre = '') {
  const n = slug(nombre)
  const table = [
    { key: 'historia', match: [/histori/, /filosof/, /pensam/, /antigu/, /clasico/] },
    { key: 'salud', match: [/salud/, /rendimiento/, /bienestar/, /sueno/, /suenos/, /deporte/, /ejercicio/] },
    { key: 'naturales', match: [/natur/, /biolog/, /ecolog/, /ambient/, /botan/, /zoolog/, /ciencias-naturales/] },
    { key: 'fisicas', match: [/fisic/, /energia/, /fuerza/, /termo/, /mecanica/, /cuant/] },
    { key: 'mates', match: [/mate/, /algebra/, /logica/, /calculo/, /estad/, /probab/] },
    { key: 'tecnologia', match: [/tecno/, /comput/, /codigo/, /program/, /software/, /(^|-)ia(-|$)/, /redes/, /inteligencia-artificial/] },
    { key: 'artes', match: [/arte/, /musica/, /pintur/, /escult/, /cine/, /teatro/, /cultura/] },
    { key: 'economia', match: [/econom/, /negocio/, /empresa/, /finanz/, /mercad/] },
    { key: 'sociedad', match: [/socied/, /psicolo/, /comunic/, /lengua/, /idioma/, /gramat/] },
  ]
  for (const t of table) if (t.match.some((r) => r.test(n))) return t.key
  return 'general'
}

// 1) Gran pool local (15 entradas por sector)
// Nota: chistes blancos (1-2 líneas) y curiosidades seguras.
const JOKES: Record<string, string[]> = {
  salud: [
    'Mi smartwatch dice que debo moverme… así que voy a por un snack más lejos.',
    'Hice una plancha… de 15 segundos, pero con actitud épica.',
    'Mi dieta es equilibrada: equilibrio el antojo con una siesta.',
    'Correr despeja la mente; yo la despejo pensando en correr mañana.',
    'Dormir 8 horas seguidas es mi deporte favorito.',
    'Hoy hice 10.000 pasos… mentales, cuenta ¿no?',
    'Hidratarse es clave: brindo con agua por recordarlo.',
    'Estiré los músculos… al alcanzar el mando a distancia.',
    'Respira profundo: el estrés se asusta si bostezas fuerte.',
    'La mejor proteína: esa que te hace sonreír al cocinar.',
    'Mi pulsómetro dijo “tranqui”: fue medirme viendo memes.',
    'Un descanso corto a tiempo es salud a largo plazo.',
    'Fui al gimnasio… a preguntar por la tarifa; cuenta como cardio social.',
    'Mi meta del día: subir escaleras sin que lo note el ego.',
    'Hoy entrené la paciencia: esperé a que enfriara el café.',
  ],
  naturales: [
    'Las plantas conversan… con selfies de sol y agua cada mañana.',
    'Un bosque es un chat grupal de raíces con buen Wi‑Fi subterráneo.',
    'Las abejas hacen “delivery” premium: polen en 30 minutos o menos.',
    'El océano es tímido: se sonroja cada atardecer.',
    'Los volcanes tienen mal despertar; por eso café… ¡de lava no!',
    'La fotosíntesis: cocina verde con energía solar incluida.',
    'Las nubes son artistas: pintan sombras en 8K dinámico.',
    'Los ríos escriben poesía, línea a línea, en dirección al mar.',
    'La lluvia es un aplauso suave de la atmósfera.',
    'Las montañas guardan secretos y selfies geológicas.',
    'Los desiertos son bibliotecas de silencio por capítulos.',
    'El viento es DJ: mezcla hojas, silba y cambia de pista.',
    'Los corales son ciudades brillantes con toque nocturno.',
    'Las rocas coleccionan eras; tú colecciona momentos.',
    'La Tierra tiene humor: llama “fallas” a sus bromas tectónicas.',
  ],
  fisicas: [
    'La física cuántica: donde “tal vez” es respuesta oficial.',
    'La gravedad nunca falla… salvo con mis intenciones de dieta.',
    'Relatividad del tiempo: el microondas tarda más con hambre.',
    'La entropía explica mi escritorio: tendencia al caos elegante.',
    'Un láser: foco total; yo con café, casi.',
    'La fricción es tímida: aparece cuando dos se rozan.',
    'El fotón no lleva mochila: viaja ligero.',
    'Una onda: saludo de la materia cuando se siente creativa.',
    'El vacío perfecto… como mi agenda un viernes por la tarde.',
    'Superposición: cuando quieres siesta y productividad a la vez.',
    'Tiro parabólico: mis planes del lunes empezando bien y…',
    'Superconductor: café en taza sin resistencia.',
    'Inercia: sofá + manta = equilibrio estable.',
    'Energía potencial: ideas guardadas para sorprender mañana.',
    'Difracción: cuando “doblas la esquina” del pensamiento.',
  ],
  mates: [
    'Sumar hábitos pequeños da grandes resultados (matemática pura).',
    'Probabilidad de olvidar las llaves: 100% cuando tienes prisa.',
    'Geometría del día: triángulo café‑pantalla‑silla.',
    'Álgebra emocional: despeja X y te quedas con paz.',
    'El infinito es modesto: nunca presume de su tamaño.',
    'Estadística: si sonríes, sube la media del día.',
    'Un vector: flecha con sentido y dirección… como tu plan.',
    'El 0 es zen: todo y nada a la vez.',
    'Un conjunto vacío, pero con buenas intenciones.',
    'Serie convergente: pasos pequeños hacia el objetivo.',
    'Un logaritmo: crecimiento que sabe respirar.',
    'Matrices: tablas que practican coreografías.',
    'Teorema del bocadillo: entre dos panes, todo mejora.',
    'Topología hogareña: el sofá es equivalente a una nube.',
    'Funciones: instrucciones para convertir ganas en resultados.',
  ],
  tecnologia: [
    'Mi repositorio favorito: recuerdos bien versionados.',
    'El bug más raro: el que desaparece al compartir pantalla.',
    'Algoritmo de la vida: iterar, medir, mejorar.',
    'La nube también necesita siestas (mantenimiento).',
    'Refactor del día: ordenar ideas antes de compilar.',
    'La batería baja inspira eficiencia ninja.',
    'Commit temprano, café temprano: CI pasa feliz.',
    'El cable correcto siempre aparece al reiniciar la esperanza.',
    'La latencia del microondas a veces es subjetiva.',
    'Mi CPU mental sube con música de fondo.',
    'Pull request: invitar a mirar con ojos nuevos.',
    'Cachear abrazos: acceso O(1) a buen humor.',
    'Sistema distribuido: grupo de amigos puntuales.',
    'Modo oscuro: porque la elegancia también compila.',
    'El mejor feature: el que simplifica tu día.',
  ],
  historia: [
    'Los mapas antiguos tenían dragones; mis notas, garabatos.',
    'La filosofía es gimnasia para preguntas valientes.',
    'La historia repite chistes… con variaciones locales.',
    'Un pergamino moderno: la libreta que no sueltas.',
    'Los archivos guardan susurros de ayer para hoy.',
    'El reloj de arena es el primer “progress bar”.',
    'Una cita clásica: recordatorio de que no somos los primeros.',
    'El índice alfabético, primo del orden mental.',
    'Museos: tutoriales en 3D del pasado.',
    'La cronología ayuda a que la memoria haga zoom.',
    'La ética es brújula; el debate, el mapa.',
    'El papiro del presente es el markdown.',
    'Sofistas 2.0: todos opinamos, algunos argumentan mejor.',
    'Aristóteles aprobaba las listas bien hechas (probablemente).',
    'Un ensayo es un pull request de ideas.',
  ],
  artes: [
    'Mi cuadro favorito: el que me mira de vuelta.',
    'Un acorde bien tocado ordena el día.',
    'El teatro es debug emocional en vivo.',
    'Esculturas: piedras con excelente autoestima.',
    'Un poema cabe en el bolsillo y en la luna.',
    'Bailar: algoritmo del cuerpo con música compilando.',
    'El cine es un sueño con palomitas.',
    'Museo ideal: entradas cortas con salida feliz.',
    'Un boceto a tiempo vale mil borradores.',
    'El silencio también compone.',
    'La paleta es un arcoíris portátil.',
    'Una melodía guarda instrucciones para sonreír.',
    'El libro abierto ventila la imaginación.',
    'Retratos: selfies de larga exposición.',
    'Coreografías: arrays de pasos con estilo.',
  ],
  economia: [
    'Mi cartera practica minimalismo… por obligación.',
    'Oferta y demanda: yo ofrezco café, mi cuerpo demanda más.',
    'El presupuesto fit: recortar caprichos, no sonrisas.',
    'El interés compuesto aplica a hábitos y a plantas.',
    'Inflación emocional: cuando todo te parece enorme sin café.',
    'Mercado alcista: cuando tu ánimo mira hacia arriba.',
    'Diversificar: probar hobbies nuevos reduce el riesgo.',
    'Liquidez: agua cerca y decisiones claras.',
    'Coste hundido: deja a tiempo el mal plan.',
    'Ahorro automático: truco favorito del yo futuro.',
    'Micro‑inversiones: minutos bien usados cada día.',
    'Señales de precio: tus ganas marcan prioridades.',
    'Externalidades positivas: risas contagiosas.',
    'Ciclo económico: siesta y productividad a turnos.',
    'Eficiencia: hacer simple lo importante.',
  ],
  sociedad: [
    'La empatía es Wi‑Fi: mejora con buena señal.',
    'Una palabra amable es un bugfix social.',
    'Escuchar es multitarea premium.',
    'Un buen chiste sincroniza sonrisas en cluster.',
    'La paciencia es un semáforo interno.',
    'Conversar con pausa baja la latencia emocional.',
    'Rituales pequeños unen equipos grandes.',
    'Los idiomas son sistemas distribuidos de ideas.',
    'Una libreta vacía es una red social silenciosa.',
    'Los hábitos son contratos con tu yo futuro.',
    'La cortesía escala sin conflictos.',
    'La risa es open‑source: comparte y mejora.',
    'Una historia breve cabe en un paseo.',
    'Decir “gracias” es rendimiento compuesto social.',
    'Curiosidad: el mejor protocolo de descubrimiento.',
  ],
  general: [
    'Hoy el clima: 100% de posibilidades de aprender algo.',
    'Mi brújula apunta a donde hay calma y café.',
    'Un paso pequeño ahora vale por diez intenciones mañana.',
    'El botón “reiniciar” del ánimo: respirar profundo.',
    'Mi lista de tareas incluye “sonreír gratis”.',
    'El mejor atajo es preguntar bien.',
    'Guardar cambios antes de cambiar de tema: consejo universal.',
    'Silencio corto, ideas largas.',
    'Modo avión del estrés: activar 5 minutos.',
    'Progreso invisible también cuenta.',
    'Haz zoom out: la vista mejora.',
    'El día compila si tú descansas.',
    'Las buenas preguntas tienen eco.',
    'Todo tutorial empieza con un clic.',
    'Micro‑victorias: commits del ánimo.',
  ],
}

const FACTS: Record<string, string[]> = {
  salud: [
    'Dormir 7‑9 horas favorece memoria y estado de ánimo.',
    'Exponerse a la luz matinal ayuda a regular el ritmo circadiano.',
    'Pausas breves cada hora reducen tensión muscular y mental.',
    'Hidratarse mejora atención y rendimiento físico moderado.',
    'Caminar 20‑30 minutos diarios ya aporta beneficios claros.',
    'La fuerza muscular se adapta incluso con cargas ligeras y constancia.',
    'Respirar profundamente activa el sistema parasimpático.',
    'Un entorno ordenado facilita el inicio de tareas saludables.',
    'La música puede modular la percepción del esfuerzo.',
    'La siesta corta (10‑20 min) puede mejorar el enfoque.',
    'El sol de la mañana sincroniza relojes biológicos.',
    'La cafeína tiene mayor efecto si se retrasa tras despertar.',
    'Estirar suave alivia rigidez tras periodos sentados.',
    'Pequeños objetivos aumentan adherencia a hábitos.',
    'La risa reduce marcadores de estrés de forma puntual.',
  ],
  naturales: [
    'Los bosques almacenan carbono y regulan ciclos de agua.',
    'Las abejas polinizan gran parte de los cultivos del mundo.',
    'Los arrecifes de coral son hábitats de enorme biodiversidad.',
    'Las corrientes oceánicas redistribuyen calor por el planeta.',
    'Algunas plantas se comunican químicamente ante amenazas.',
    'Los suelos vivos albergan microbios esenciales para nutrir plantas.',
    'La fotosíntesis convierte luz en energía química utilizable.',
    'El permafrost almacena grandes reservas de carbono.',
    'Los humedales filtran agua y sirven de refugio a aves.',
    'Las nubes influyen en el balance energético de la Tierra.',
    'La migración de animales sigue rutas asombrosas guiadas por señales.',
    'Las montañas crean climas locales y corredores ecológicos.',
    'Los incendios controlados pueden regenerar ciertos ecosistemas.',
    'La diversidad genética aumenta la resiliencia de especies.',
    'Los líquenes son simbiosis entre hongos y algas.',
  ],
  fisicas: [
    'La luz se comporta como partícula y como onda según el experimento.',
    'La energía se conserva: se transforma de una forma a otra.',
    'La entropía mide el desorden o número de microestados.',
    'La gravedad curva el espacio‑tiempo alrededor de la masa.',
    'Los superconductores conducen sin resistencia a bajas temperaturas.',
    'La presión y el volumen están ligados (ley de Boyle) en gases ideales.',
    'La resonancia ocurre cuando fuerzas coinciden con frecuencias propias.',
    'La difracción explica patrones de interferencia en rendijas.',
    'El efecto fotoeléctrico apoya la naturaleza cuántica de la luz.',
    'Los imanes surgen de espines y corrientes a escala atómica.',
    'La inercia mantiene el movimiento si no hay fuerzas netas.',
    'El momento angular se conserva en sistemas cerrados.',
    'El sonido es una onda de presión en un medio material.',
    'La fricción convierte movimiento en calor microscópico.',
    'El láser emite luz coherente de una sola longitud de onda.',
  ],
  mates: [
    'Los números primos son la base de muchos sistemas criptográficos.',
    'Las derivadas miden cambios instantáneos; integrales acumulan.',
    'Las matrices representan transformaciones y sistemas lineales.',
    'La probabilidad modela incertidumbre para decidir mejor.',
    'Un grafo describe redes de conexiones (de rutas a redes sociales).',
    'Las series convergentes se acercan a un valor finito.',
    'La topología estudia propiedades que no cambian al deformar.',
    'Los logaritmos convierten productos en sumas para simplificar.',
    'La estadística inferencial extrae conclusiones de muestras.',
    'Los vectores combinan magnitud y dirección.',
    'La combinatoria cuenta formas de organizar elementos.',
    'Las distribuciones normales aparecen en muchos fenómenos.',
    'La optimización busca el mejor resultado dado un criterio.',
    'El infinito tiene distintos tamaños (cardinalidades).',
    'Las funciones describen relaciones entrada‑salida.',
  ],
  tecnologia: [
    'Los algoritmos son recetas finitas para resolver problemas.',
    'La complejidad mide recursos necesarios (tiempo y memoria).',
    'La caché acelera al guardar resultados de uso frecuente.',
    'Las bases de datos transaccionales garantizan integridad (ACID).',
    'Los protocolos definen cómo se comunican sistemas en red.',
    'El control de versiones ayuda a colaborar y revertir cambios.',
    'La virtualización aísla aplicaciones para portabilidad.',
    'El cifrado protege datos en tránsito y en reposo.',
    'La nube permite escalar recursos bajo demanda.',
    'Las pruebas automatizadas previenen regresiones.',
    'Los microservicios separan funciones para escalar equipos.',
    'La observabilidad ayuda a entender sistemas vivos.',
    'El diseño simple reduce deuda técnica futura.',
    'Los contenedores empaquetan dependencias de forma consistente.',
    'El “principio KISS” favorece lo simple y claro.',
  ],
  historia: [
    'Los archivos históricos preservan memoria colectiva y lecciones.',
    'La imprenta impulsó la difusión masiva del conocimiento.',
    'Las rutas comerciales facilitaron intercambios culturales.',
    'Las ideas filosóficas evolucionan dialogando con su tiempo.',
    'La cronología ayuda a ver causas y consecuencias.',
    'Los museos conservan patrimonio y contextos de significado.',
    'La democracia ha tomado formas muy distintas según épocas.',
    'Los códices y pergaminos son tecnologías del texto antiguas.',
    'La ética reflexiona sobre el buen actuar y sus fundamentos.',
    'Los mitos explican el mundo antes que la ciencia moderna.',
    'Las revoluciones tecnológicas redefinen trabajos y costumbres.',
    'El contacto entre culturas produce mestizajes e innovaciones.',
    'La filosofía del lenguaje explora cómo significamos.',
    'Los calendarios ordenan tiempo social y ritual.',
    'El estudio del pasado ilumina decisiones presentes.',
  ],
  artes: [
    'La perspectiva cambió la forma de representar el espacio.',
    'La música organiza el tiempo con ritmo, melodía y armonía.',
    'El color influye en la emoción percibida de una obra.',
    'El teatro combina texto, cuerpo y espacio en directo.',
    'El cine une imagen, sonido y montaje narrativo.',
    'Los museos curan obras para contar historias.',
    'La danza es lenguaje del movimiento humano.',
    'La fotografía captura luz sobre un soporte sensible.',
    'La escultura trabaja volumen y materia.',
    'La poesía condensa imágenes y ritmo verbal.',
    'El diseño equilibra forma, función y contexto.',
    'Los cómics combinan viñetas, texto e imaginación.',
    'La caligrafía es dibujo de letras con intención.',
    'El retrato investiga identidades en una mirada.',
    'La crítica analiza y comunica lecturas posibles.',
  ],
  economia: [
    'La oferta y la demanda influyen en los precios de mercado.',
    'Los incentivos moldean comportamientos y decisiones.',
    'El coste de oportunidad es lo que renuncias al elegir.',
    'La inflación reduce poder adquisitivo con el tiempo.',
    'La diversificación reparte riesgos entre activos.',
    'La información asimétrica puede distorsionar mercados.',
    'Los presupuestos ayudan a planificar y priorizar.',
    'Los bancos centrales gestionan la política monetaria.',
    'Los aranceles afectan al comercio internacional.',
    'El interés compuesto hace crecer inversiones a largo plazo.',
    'La productividad sostiene el crecimiento económico.',
    'Las externalidades pueden ser positivas o negativas.',
    'Los ciclos económicos alternan expansiones y contracciones.',
    'El ahorro protege ante imprevistos y da opciones.',
    'La competencia incentiva eficiencia e innovación.',
  ],
  sociedad: [
    'El lenguaje facilita cooperación y transmisión cultural.',
    'La psicología estudia mente, emoción y conducta.',
    'La empatía mejora relaciones y resolución de conflictos.',
    'Las normas sociales coordinan expectativas en grupos.',
    'Los sesgos cognitivos afectan nuestras decisiones.',
    'La educación amplía oportunidades y capital social.',
    'Las redes sociales conectan pero también requieren pausa.',
    'El juego simbólico apoya el desarrollo infantil.',
    'Los hábitos se consolidan con repetición y contexto.',
    'La escucha activa construye confianza.',
    'El humor fortalece vínculos en equipos.',
    'Las tradiciones transmiten valores y pertenencia.',
    'La diversidad enriquece perspectivas y soluciones.',
    'La cooperación resuelve tareas que solos no podríamos.',
    'Los idiomas cambian con el uso y el tiempo.',
  ],
  general: [
    'La curiosidad impulsa el aprendizaje continuo.',
    'Pequeñas prácticas diarias suman mucho a largo plazo.',
    'Los descansos estratégicos mejoran la creatividad.',
    'Las preguntas buenas abren caminos nuevos.',
    'Organizar el entorno reduce fricción para avanzar.',
    'Compartir conocimiento acelera a todos.',
    'Un paseíto activa ideas dormidas.',
    'Aprender en voz alta crea comunidad.',
    'Tomar notas limpia la mente para pensar.',
    'Iterar permite mejorar sin perfeccionismo.',
    'Alternar foco y pausa equilibra la energía.',
    'Cuidar el sueño cuida todo lo demás.',
    'Registrar progresos motiva para continuar.',
    'Una conversación breve puede ser decisiva.',
    'Simplificar es una forma de inteligencia.',
  ],
}

function pick(arr: string[], i: number) {
  if (!arr || !arr.length) return ''
  return arr[((i % arr.length) + arr.length) % arr.length]
}

interface SorpresasResponse extends ApiResponse {
  chiste?: string;
  sorpresa?: string;
  seed?: number;
  sector?: string;
}

export async function GET(request: Request) {
  try {
    // 2) Leer sector y normalizar a clave
    const url = new URL(request.url)
    const rawSector = url.searchParams.get('sector') || 'General'
    const key = normalizaSector(rawSector)
    const cookieKey = `sur_hist_${key}`

    // Rotación sin repetición inmediata (por cookie)
    const cookieHeader = request.headers.get('cookie') || ''
    const prev = (() => {
      const m = cookieHeader.match(new RegExp(`${cookieKey}=([^;]+)`))
      const v = m ? parseInt(m[1], 10) : NaN
      return Number.isFinite(v) ? v : -1
    })()

    const jokes = JOKES[key] || JOKES.general
    const facts = FACTS[key] || FACTS.general
    const len = Math.max(jokes.length, facts.length)
    const seedBump = Math.floor(Math.random() * 3) // 0..2
    const idx = ((prev + 1 + seedBump) % len)

    let chiste = pick(jokes, idx)
    let sorpresa = pick(facts, idx)

    // 3) Modo pulido opcional con OpenAI
    const openai = getOpenAIClient()
    const isStub = isStubMode()

    if (openai && !isStub) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          messages: [
            { role: 'system', content: 'Pulir texto, mantener idea; 1-2 frases, tono amable, sin datos discutibles. Responde JSON con claves chiste y sorpresa.' },
            { role: 'user', content: `Pulir manteniendo sentido.\nchiste: ${chiste}\nsorpresa: ${sorpresa}` },
          ],
        })
        const text = completion.choices?.[0]?.message?.content || ''
        try {
          const parsed = JSON.parse(text)
          if (parsed?.chiste) chiste = String(parsed.chiste)
          if (parsed?.sorpresa) sorpresa = String(parsed.sorpresa)
        } catch (_) {
          // si no es JSON, intenta separar líneas
          const lines = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
          if (lines[0]) chiste = lines[0]
          if (lines[1]) sorpresa = lines[1]
        }
      } catch (_) {
        // fallback: mantener local
      }
    }

    // Construir respuesta y setear cookie (1 día)
    const res = NextResponse.json<ApiResponse<{ chiste: string, sorpresa: string, seed: number, sector: string }>>({ 
      success: true,
      data: {
        chiste, 
        sorpresa, 
        seed: idx, 
        sector: rawSector 
      }
    })
    res.cookies.set(cookieKey, String(idx), { path: '/', maxAge: 60 * 60 * 24 })
    return res
  } catch (e: any) {
    const msg = e?.message || 'Error del servidor'
    return NextResponse.json<ApiResponse>({ 
      success: false,
      error: 'INTERNAL_ERROR',
      message: msg 
    }, { status: 500 })
  }
}

