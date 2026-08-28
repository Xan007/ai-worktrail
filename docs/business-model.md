# Modelo de Negocio

## 1. Resumen

Venta de dos caras, con el mismo producto:

1. **Institucional** — se le vende a la universidad/colegio como cliente (dirección académica, decanatura, TI), que paga por todos sus profesores.
2. **Profesor independiente** — el profesor se registra y paga por su cuenta, sin pasar por la universidad (porque su institución no lo tiene, o porque quiere probarlo antes de proponerlo formalmente).

Ambos usan la misma plataforma. La diferencia es **quién paga y qué tan grande es la unidad de venta** — un profesor suelto (`courses.tenant_id = NULL`) vs. una institución completa (`courses.tenant_id` apuntando a un `tenant`).

El segmento de profesor independiente no es solo un cliente en sí mismo: es también el **canal de adquisición** hacia el segmento institucional (ver sección 5).

---

## 2. Segmentos de cliente

### A. Institucional (universidades / colegios)
- **Comprador:** decanatura, dirección académica, área de calidad académica o TI — no necesariamente el profesor que lo usa día a día.
- **Usuario final:** varios profesores de la misma institución.
- **Necesidad:** política institucional de integridad académica frente a IA, visibilidad agregada entre facultades/cursos, embebido en Moodle, dominio institucional preconfigurado.
- Un tenant = la institución; agrupa todos los cursos de todos sus profesores bajo un mismo contrato y panel administrativo central.

### B. Profesor independiente
- **Comprador y usuario:** la misma persona.
- Crea sus cursos sin tenant (`courses.tenant_id = NULL`), paga con tarjeta, sin intervención humana en la venta (self-serve).
- Suele ser el punto de entrada: un profesor lo prueba en su clase, y si funciona, se convierte en el "campeón interno" que empuja la venta institucional.

---

## 3. Planes y precios (propuesta)

| | **Gratis** | **Profesor Pro** | **Institucional** |
|---|---|---|---|
| Para quién | Profesor probando el producto | Profesor independiente, uso recurrente | Universidad / colegio |
| Cursos activos | 1 | Ilimitados | Ilimitados |
| Estudiantes | Hasta ~40 | Ilimitados | Ilimitados |
| Momento de evaluación IA | Solo `on_demand` | `on_demand` + `on_submit` | `on_demand` + `on_submit` |
| Gemas aprobadas por curso | 1 | Ilimitadas | Ilimitadas |
| Calificación grupal individual | — | Sí | Sí |
| Panel administrativo institucional (multi-profesor) | — | — | Sí |
| Dominio institucional / whitelist preconfigurada | — | — | Sí |
| Embed en Moodle | Sí | Sí | Sí, con soporte |
| Soporte | Comunidad | Email | Prioritario + SLA |
| Facturación | — | Mensual/anual, por profesor | Anual, por institución |

El límite entre Gratis y Pro está atado a **volumen de evaluación**, no a features cosméticas, porque el costo variable real del producto es el consumo de la API de Gemini (y, en menor medida, Jina Reader) — ver sección 4.

---

## 4. Estructura de costos (referencia)

Ya documentada en [plan.md](plan.md), sección 5:
- Supabase: Free → ~$25/mes (Pro) al escalar.
- Clerk, Cloudflare Pages: free tier suficiente para volumen bajo/medio.
- Jina Reader: gratis sin key (20 RPM, sin tope de requests) o con key gratuita (10M tokens, 500 RPM).
- Gemini: free tier hasta cierto volumen, luego de pago.

El costo variable principal escala con el **número de evaluaciones de IA** (llamadas a Gemini), así que ese es el eje natural para diferenciar planes gratis vs. pagos, más que el número de cursos o estudiantes en sí.

Nota operativa: el motor ya implementa **cadena de fallback de modelos** priorizada por calidad — cuando un modelo agota su cuota diaria, se salta automáticamente al siguiente disponible (cada modelo tiene cuota propia). Esto reduce el riesgo de interrupciones del servicio en tiers gratuitos y suaviza el costo marginal por evaluación (los modelos flash/lite son los más baratos).

---

## 5. Estrategia de adquisición: land-and-expand

1. Un profesor se registra (gratis o Pro) usando su correo institucional (`@universidad.edu.ar`).
2. Si varios profesores del mismo dominio ya están usando la plataforma de forma independiente, es una **señal de oportunidad institucional**: se contacta a la universidad para ofrecer el plan institucional, que agrupa a esos profesores bajo un solo tenant con mejor precio agregado y panel central.
3. Así, cada profesor independiente funciona como canal de distribución hacia la venta institucional completa — no hace falta empezar la venta "desde arriba" (decanatura) sin evidencia de adopción real en el aula.
4. Venta institucional en sí: demo → piloto con una facultad/departamento → contrato anual para toda la institución.

---

## 6. Riesgos y consideraciones

- **Dependencia de tiers gratuitos de terceros:** si Gemini o Jina Reader cambian sus límites o precios, afecta directamente el margen del plan gratis y la viabilidad de mantenerlo tan generoso. Mitigación parcial ya implementada: fallback automático entre modelos de Gemini (cada uno con cuota propia) y reintentos con bypass de caché en Jina Reader.
- **Competencia:** herramientas de integridad académica ya existentes (Turnitin, GPTZero, etc.) podrían agregar detección similar (auditoría de enlaces de chat de IA).
- **Dependencia de la cooperación del estudiante:** el estudiante es quien pega los enlaces; sin una política institucional que lo haga obligatorio, la adopción a nivel de profesor independiente es "best effort" — esto refuerza por qué el segmento institucional es más valioso a largo plazo (puede convertirlo en requisito de la materia).

---

## 7. Nota — implicaciones futuras de schema

No implementado todavía en [schema.md](schema.md); queda como paso siguiente cuando se defina el proveedor de pagos (ej. Stripe):
- `tenants`: agregar `plan` y `billing_email` para el contrato institucional.
- `users`: agregar algo como `individual_plan` para profesores sin tenant que pagan por su cuenta.
- Una tabla de suscripciones/pagos separada, en vez de mezclar el estado de facturación directamente en `tenants`/`users`.
