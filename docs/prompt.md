# prompt.md — Especificación de interfaz (UI) de AI WorkTrail

> Este documento es el prompt maestro para construir/rediseñar la interfaz completa del producto.
> Describe el sistema visual, las reglas duras de diseño y, pantalla por pantalla, TODA la
> información que cada vista debe llevar. El backend puede simularse con datos mockup: lo que
> importa acá es la interfaz. Cualquier implementación debe seguir este documento al pie de la letra.

---

## 1. Principio general

Un producto educativo **institucional y maduro**, en la línea de un Moodle moderno: utilitario,
ordenado, sobrio y confiable. La interfaz se entiende en segundos, sin decoración innecesaria.
Todo debe transmitir seriedad académica: es una herramienta que profesores y universidades van a
usar para evaluar, no un juguete ni una startup gamificada.

**Prohibido:** logos generados o dibujados (la marca es tipográfica), emojis en la interfaz,
gradientes llamativos, morado por defecto, modo oscuro, animaciones con rebote, bordes muy
redondeados, sombras pesadas, densidad de dashboard.

---

## 2. Reglas duras de diseño (de aplicación obligatoria)

1. **Una composición por viewport.** La primera pantalla de cada página se lee como una sola
   composición con un propósito, no como un tablero de módulos compitiendo.
2. **La marca va primero.** En la landing, el nombre del producto ("AI WorkTrail") debe ser una
   señal a nivel héroe — tipografía propia de la marca, presente y firme. Ningún titular pisa a la
   marca. Test: si al quitar la navbar la primera pantalla podría ser de otra marca, el branding es
   demasiado débil.
3. **Tipografía con identidad.** Prohibidos Inter, Roboto, Arial y stacks del sistema como fuente
   principal. Usar **IBM Plex Sans** (400/500/600/700) en toda la interfaz; los puntajes y códigos
   numéricos con `font-variant-numeric: tabular-nums`. Tamaño base 15–16px, line-height 1.6,
   titulares con tracking ligeramente negativo.
4. **Fondo blanco con atmósfera sutil.** El fondo base es blanco (`#FFFFFF`). Para que no sea
   plano, alternar secciones con `#F6F8FB` (gris azulado muy tenue) y/o un patrón sutil de líneas
   horizontales al 3% de opacidad azul en el héroe de la landing. Nada de fondos oscuros ni
   gradientes saturados.
5. **Héroe full-bleed solo en la landing.** El héroe ocupa todo el ancho como plano visual
   dominante. Sin imágenes insertadas tipo tarjeta, sin collages, sin bloques flotantes.
6. **Presupuesto del héroe:** solo marca + un titular + una frase corta de apoyo + grupo de CTAs +
   el plano visual dominante. Nada de métricas, listados, direcciones ni contenido secundario en
   el primer viewport.
7. **Sin overlays sobre el héroe:** nada de badges flotantes, chips promocionales ni cajas de
   llamada encima del medio del héroe.
8. **Cards solo donde hay interacción.** Si quitarle borde/fondo/radius a un bloque no afecta su
   uso, no debe ser una card. Las listas de cursos, tareas y entregas son **filas de tabla/lista**
   estilo Moodle, no grillas de tarjetas.
9. **Un trabajo por sección.** Cada sección: un propósito, un título, opcionalmente una frase de
   apoyo corta.
10. **Ancla visual real.** La imagen/atmósfera debe mostrar contexto real (aula, producto, flujo de
    trabajo). Los gradientes decorativos no cuentan como idea visual principal.
11. **Movimiento con jerarquía, no ruido.** Máximo 2–3 movimientos intencionales en toda la app:
    transiciones de hover/focus (150–180ms ease-out), aparición suave del contenido de página
    (fade 200ms), pulso de skeleton en cargas. Nada más.
12. **Paleta azul definida por variables CSS** (ver §3). Sin sesgo morado, sin modo oscuro.
13. **Desktop y móvil impecables.** Breakpoint único de colapso a 768px: navbar colapsa a menú,
    las filas/listas apilan sus metadatos, las formas pasan a una columna.
14. Si se trabaja sobre código existente, preservar patrones y lenguaje visual ya establecidos.

---

## 3. Sistema visual

### 3.1 Paleta (variables CSS)

```css
:root {
  /* Azul institucional */
  --color-primary:        #1E5AA8;
  --color-primary-hover:  #174A8C;
  --color-primary-active: #123B75;
  --color-primary-subtle: #EAF1F9;  /* fondos de filas seleccionadas, chips */

  /* Texto */
  --color-ink:            #1A2332;  /* texto principal */
  --color-ink-secondary:  #4A5568;  /* texto secundario */
  --color-ink-muted:      #8B95A5;  /* metadatos, placeholders */

  /* Superficies y bordes */
  --color-surface:        #FFFFFF;
  --color-surface-alt:    #F6F8FB;
  --color-border:         #D9E0EA;

  /* Semánticos (desaturados, institucionales) */
  --color-success:        #1F7A4D;
  --color-success-bg:     #E8F4EE;
  --color-warning:        #B45309;
  --color-warning-bg:     #FBF3E7;
  --color-danger:         #B3372F;
  --color-danger-bg:      #FBEDEB;

  /* Perfiles de uso de IA */
  --color-profile-passenger:  #A63D33;  /* Pasajero productivo  */
  --color-profile-optimizer:  #9C6B1F;  /* Optimizador reacio   */
  --color-profile-marathoner: #1F7A4D;  /* Maratonista mental   */

  /* Forma */
  --radius-sm: 6px;   /* botones, inputs, chips */
  --radius-md: 10px;  /* cards, paneles, modales — nada por encima de 12px */

  /* Elevación: bordes primero, sombra apenas insinuada */
  --shadow-rest:  none;
  --shadow-hover: 0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.08);
}
```

### 3.2 Componentes base

| Elemento | Especificación |
|---|---|
| Botón primario | Fondo `--color-primary`, texto blanco, `radius-sm`, padding 10px 18px, peso 600. Hover: `--color-primary-hover`. |
| Botón secundario | Blanco, borde 1px `--color-border`, texto `--color-ink`. Hover: borde `--color-primary`, texto `--color-primary`. |
| Botón fantasma/enlace | Solo texto `--color-primary` subrayado en hover. Para acciones terciarias ("Cancelar solicitud"). |
| Inputs | Blanco, borde 1px `--color-border`, `radius-sm`, altura 38px. Focus: borde `--color-primary` + ring `--color-primary-subtle` de 3px. Labels arriba del input, 13px, `--color-ink-secondary`. |
| Tablas/filas | Filas blancas separadas por borde inferior 1px `--color-border`; hover de fila: `--color-surface-alt`. Cabecera en mayúsculas pequeñas 12px `--color-ink-muted`. |
| Chips/badges | Píldora discreta `radius-sm`, fondo subtle del color semántico, texto 12px del mismo tono oscuro. Sin saturación. |
| Barras de rating | Altura 6px, pista `#E5EAF1`, relleno del color según tramo (<40 peligro, <70 advertencia, ≥70 éxito), `radius-sm`. |
| Modales | Panel blanco `radius-md`, overlay negro al 40%, ancho máx 480–560px. |
| Iconografía | Set de línea fina (Lucide), 16px, solo donde aporta; prohibido abusar. |

### 3.3 Movimiento

- Hover/focus: 150–180ms ease-out (color de fondo, borde, texto).
- Contenido de página: fade-in de 200ms al montar (una sola vez).
- Skeletons: pulso de opacidad estándar mientras carga.
- Prohibido: parallax, rebotes, escalados, confeti, contadores animados.

---

## 4. Estructura global

### 4.1 Navbar (todas las páginas)

Barra blanca, borde inferior 1px `--color-border`, altura 56px, sticky.

- **Marca (izquierda):** wordmark tipográfico "**AI WorkTrail**" — 16px, peso 700, color
  `--color-ink`, precedido de un pequeño cuadrado sólido `--color-primary` de 10×10px con radio
  2px como único elemento gráfico de marca. **No generar un logo.**
- **Navegación (junto a la marca):** enlaces 14px peso 500 — `Mis cursos` · `Evaluador de
  pruebas`. Enlace activo: texto `--color-primary` con subrayado de 2px bajo el ítem.
- **Derecha:** menú de usuario (avatar/inicial + nombre en desktop). Al abrir: Perfil, Cerrar sesión.

### 4.2 Contenido

- Contenedor centrado `max-width: 1040px`, padding lateral 24px, aire vertical 32px.
- **Breadcrumbs** en páginas internas (14px, separador `/`, último nivel en `--color-ink`,
  anteriores en `--color-ink-secondary` con hover `--color-primary`).
- **Footer** mínimo: línea superior 1px, texto 12px `--color-ink-muted`: nombre del producto a la
  izquierda, enlaces "Diagnóstico" y "Evaluador de pruebas" a la derecha.

### 4.3 Estados transversales

- **Carga:** skeletons con forma real del contenido (fila de tabla, bloque de texto), pulso sutil.
- **Vacío:** bloque centrado con título 14px `--color-ink-secondary` y hint 13px
  `--color-ink-muted`, borde punteado `--color-border`, padding generoso. Sin ilustraciones.
- **Error:** banner de ancho completo del contenedor, fondo `--color-danger-bg`, borde izquierdo
  3px `--color-danger`, texto 14px `--color-ink`.
- **Éxito/info:** mismas formas con verde/azul respectivamente.

---

## 5. Páginas

### 5.1 Landing (`/`) — profesional, una composición

**Primer viewport (héroe full-bleed):**
- Plano visual dominante de fondo blanco con patrón sutil de cuadrícula/líneas azules al 3% y un
  degradado radial casi imperceptible hacia `--color-surface-alt` en la parte inferior.
- Marca "AI WorkTrail" grande como señal principal del bloque (peso 700, tamaño mayor que cualquier
  otro texto, color `--color-ink`, con el cuadrado azul de marca al lado).
- Debajo, UN titular: *"Evalúa cómo piensan con la IA, no solo qué entregan."*
- UNA frase de apoyo (máx 2 líneas): explicación del producto en lenguaje de docente.
- Grupo de CTAs: primario "Comenzar ahora" → login/cursos; secundario "Conocer cómo funciona"
  (ancla a la sección siguiente).
- Nada más en este viewport: sin métricas, sin logos de clientes, sin chips.

**Secciones siguientes (cada una con un trabajo):**
1. **Cómo funciona** — tres pasos numerados en filas horizontales (01 Entrega de enlaces → 02
   Evaluación con evidencia → 03 Perfil y recomendaciones). Filas, no tarjetas; número en azul,
   título 16px, descripción 14px.
2. **Qué evalúa** — lista de los cinco criterios con su peso, presentados como tabla simple
   (criterio / qué observa / peso). Transmite rigor académico.
3. **Para quién** — dos columnas de texto plano: docentes e instituciones. Sin cards.
4. **Cierre** — franja `--color-surface-alt` con un CTA final y el wordmark pequeño.

### 5.2 Login (`/login`)

Página blanca, columna central (max 380px): wordmark arriba, tarjeta blanca con borde que contiene
el formulario de Clerk, y debajo una línea 12px `--color-ink-muted` ("Evalúa el uso de IA con
evidencia, no con sospecha."). Nada más.

### 5.3 Mis cursos (`/courses`)

- **Cabecera:** "Mis cursos" (22px bold) + subtítulo de una línea.
- **Acciones agrupadas en una sola fila de formulario inline** (no cards): input "Nombre del
  curso" + select "Modo de inscripción" (Abierto / Requiere aprobación / Lista blanca) + botón
  "Crear curso"; separado por divisor vertical, input "Código" (mono, uppercase) + botón "Unirse".
- **Listas estilo Moodle** (filas, no tarjetas), dos secciones con contador a la derecha del
  título: **Docencia** y **Inscripto**. Cada fila lleva:
  - Nombre del curso (15px, peso 600, `--color-primary`, enlace).
  - Código de invitación como chip mono con acción copiar (icono clipboard; feedback "Copiado").
  - Modo de inscripción en chip neutro.
  - Chevron derecho indicando navegación.
- Estados: skeletons con forma de fila; vacíos con EmptyState ("Aún no dictas ningún curso" /
  "Pide un código a tu profesor").
- Mensajes de éxito/error como banner superior (ver §4.3).

### 5.4 Detalle de curso (`/courses/:id`)

- **Breadcrumb:** Mis cursos / {nombre}.
- **Cabecera:** nombre del curso (24px bold) + fila de metadatos: chip mono con el `join_code`
  (copiable), chip violeta suave con modo de inscripción, texto 13px "Comparte este código para
  que tus estudiantes se unan".
- **Formulario nueva tarea (solo docente):** panel con borde, campos en grid 2 columnas — Nombre
  (ancho completo), checkbox "Tarea grupal" estilizado, select "Disparo de evaluación IA" (Al
  entregar / A demanda), si es grupal aparecen: select "Calificación grupal" (Compartida /
  Individual) e input "Tamaño máximo". Botón "Crear tarea".
- **Listado de tareas (filas):** cada fila lleva nombre (enlace), chip de estado
  (`abierta`=verde / `cerrada`=gris), tipo (Individual / Grupo · modo), disparo de IA en texto
  secundario, chevron. Ordenadas de más reciente a más antigua, con contador junto al título.

### 5.5 Detalle de tarea (`/courses/:cid/tasks/:tid`) — la vista central del producto

Es la pantalla más importante: aquí vive la calificación. Densidad cómodo-utilitaria, mucha
jerarquía tipográfica, cero ruido.

- **Breadcrumb:** Mis cursos / {curso} / {tarea}.
- **Cabecera de tarea:** nombre (24px bold) + chips de metadatos: Individual o Grupo·modo,
  Disparo de IA, estado (abierta/cerrada).
- **Formulario de entrega (estudiante, tarea abierta):** panel "Entregar chats" con textarea mono
  para una o más URLs (placeholder con ejemplo), select de plataforma, campo condicional de
  instrucciones de Gema (opcional), botón primario "Enviar". Texto de ayuda: "Pega los enlaces
  compartidos de tus conversaciones. Deben ser públicos."
- **Listado de entregas (filas expandibles o bloques planos):** cada entrega encabezada por
  `v{n}` · fecha/hora · estudiante o grupo. Acciones del docente a la derecha: botón
  "Evaluar"/"Re-evaluar" (primario pequeño).
  - **Chats de la entrega:** cada uno en sub-fila con URL truncada en mono (enlace externo),
    plataforma, estado de gema (chip: *Gema verificada* verde / *Gema no verificada* ámbar) y, si
    falló la lectura, banner inline rojo con el motivo accionable.
  - **Panel "Ver prompts" (docente):** botón terciario por chat; despliega los mensajes del
    estudiante numerados `[C1-M1]`, `[C1-M2]`… en bloque mono sobre fondo `--color-surface-alt`.
- **Bloque de calificación (uno por análisis):**
  - Cabecera: **score grande** (28px, tabular-nums, color según tramo), chip del perfil (Pasajero
    productivo = rojo desaturado / Optimizador reacio = ámbar / Maratonista mental = verde), chip
    "requiere revisión" si `flagged`, y a quién corresponde (estudiante/grupo).
  - **Resumen** (justificación) como párrafo 15px `--color-ink`.
  - **Interruptor "Mostrar criterios"** (toggle switch accesible): controla la visibilidad de todo
    el desglose de criterios. Estado persistente durante la sesión (localStorage). Por defecto:
    expandido para el docente, contraído para el estudiante.
  - **Desglose (visible con el switch activo):** una fila por criterio — nombre legible, rating
    numérico (tabular-nums), barra de 6px, badge de banda (ej. "41–60"), descripción corta de la
    banda en 13px `--color-ink-secondary`, explicación del evaluador, y citas de evidencia en
    blockquote con borde izquierdo 2px + chip mono `Chat 1 · M3` antes de la cita en cursiva.
  - **Fortalezas** y **Para mejorar:** dos listas con viñetas discretas, títulos 12px uppercase
    `--color-ink-muted`.
  - Compatibilidad: análisis antiguos sin desglose muestran solo score + resumen, sin el switch.

### 5.6 Evaluador de pruebas (`/dev/evaluate`)

Misma mecánica de calificación, para testear sin guardar nada.

- **Cabecera:** título + subtítulo ("Pega URLs para calificar cada chat por separado y todos
  combinados. No se guarda nada.").
- **Entrada:** textarea mono (hasta 8 URLs) + botón "Evaluar" con estado de progreso textual.
- **Resultados:** primero bloque **Combinado** (destacado con borde azul y etiqueta), luego lista
  **Chats individuales**. Cada resultado usa exactamente el bloque de calificación de §5.5
  (score, perfil, resumen, switch de criterios, bandas, mejoras). Errores por URL se muestran en
  su fila sin romper el resto.
- Enlace accesible desde la navbar ("Evaluador de pruebas") y el footer.

### 5.7 Diagnóstico (`/dev/rls`)

Herramienta interna: misma estructura sobria, lista de checks con pass/fail en chips semánticos y
botón "Ejecutar comprobaciones". Sin protagonismo visual.

---

## 6. Datos mockup (para construir sin backend)

Objetos de ejemplo suficientes para poblar todas las pantallas:

```ts
// Curso
{ id, name: "Gestión de Procesos — 2026-I", join_code: "A3F8C2",
  enrollment_mode: "open" }

// Tarea
{ id, name: "Process Landscape Model", is_group_task: false,
  ai_evaluation_mode: "on_demand", status: "open",
  group_grading_mode: "shared" }

// Entrega
{ id, version: 2, submitted_at: "2026-08-24T18:39:00Z",
  student: { name: "María Fernanda Ruiz" },
  chats: [
    { url: "https://share.gemini.google/fYqkYQtLtT0p", platform: "gemini",
      gem_status: null, extraction_error: null },
    { url: "https://gemini.google.com/share/d/…", platform: "gemini",
      gem_status: "unverified",
      extraction_error: "El enlace no es públicamente accesible…" }
  ] }

// Análisis
{ score: 84, flagged: false,
  profile: "mental_marathoner",
  summary: "La estudiante estructuró su propio modelo antes de consultar…",
  criteria: [
    { key: "ownership", rating: 85,
      band: { level: 5, label: "81–100",
              description: "Produjo su propio trabajo; la IA solo verificó." },
      explanation: "Aportó material propio y pidió crítica explícita…",
      evidence: [{ chat: 1, message: 1, quote: "Esto es lo que tenemos…" }] },
    // … critical_engagement, ai_as_tutor, integration_originality, process_awareness
  ],
  strengths: ["Conserva la agencia del trabajo intelectual…"],
  improvements: ["Profundizar el diálogo pidiendo justificación de criterios…"] }

// Segundo análisis de contraste (para probar estados)
{ score: 30, flagged: true, profile: "productive_passenger", … }
```

Incluir también estados: carga (skeletons), error de red, entrega sin evaluar ("Aún no evaluada"),
chat ilegible, lista vacía de cursos/tareas.

---

## 7. Checklist de aceptación

- [ ] Fondo blanco en todas las páginas; sin modo oscuro; sin morado.
- [ ] Tipografía IBM Plex Sans en toda la app; ninguna fuente por defecto.
- [ ] Radios ≤ 10px; bordes 1px dominan sobre sombras; sombras solo en hover/elevación menor.
- [ ] Cero emojis, cero logos dibujados, cero gradientes saturados, cero animaciones con rebote.
- [ ] Landing: marca protagonista, héroe full-bleed con presupuesto correcto, secciones con un trabajo cada una.
- [ ] Cursos y tareas como listas/filas estilo Moodle, no grillas de tarjetas.
- [ ] Vista de calificación cómoda: score prominente, perfil claro, interruptor "Mostrar criterios" funcional y persistente, evidencias con referencia `Chat N · Mk`.
- [ ] Todos los estados cubiertos: carga, vacío, error, éxito, chat ilegible, no evaluada.
- [ ] Responsive verificado a 375px y 1440px.
- [ ] Contraste AA en textos y focos visibles con teclado.
