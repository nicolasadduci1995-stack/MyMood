# MyMood — contexto del proyecto

App que recomienda películas y series según el estado de ánimo del día. El usuario responde 5 preguntas, la app detecta un mood y devuelve 3 películas + 3 series, con poster, rating y plataformas disponibles en Argentina.

- Dueño: Nicolas (no es desarrollador de profesión; explicar los pasos de forma simple y pedir confirmación antes de cambios grandes)
- Idioma: español rioplatense (UI y comunicación)
- Repo: github.com/nicolasadduci1995-stack/MyMood (público, rama `main`)
- Online: https://my-mood-chi.vercel.app (Vercel, conectado al repo; cada commit a `main` redeploya solo)
- Tagline: "Mirá lo que sentís"

## Objetivo y métricas

- Problema: la gente pierde 10-20 min scrolleando sin saber qué ver. Las plataformas recomiendan por historial, no por cómo estás hoy.
- Métrica de éxito: el usuario elige algo del PRIMER set de recomendaciones.
- Métrica de no-éxito: el usuario regenera varias veces sin encontrar nada.
- Otras: tasa de regeneración, tiempo hasta decidir, abandono por pregunta, retorno a 3 y 7 días.
- Monetización: gratis por ahora. Luego afiliados. Freemium solo si hay tracción. Nicolas pidió seguir gratis por el momento.

## Stack y estructura

```
/
├── index.html      App completa (HTML + CSS + JS en un solo archivo)
├── api/claude.js   Proxy serverless (Node) hacia la API de Anthropic
├── api/tmdb.js     Proxy serverless (Node) hacia TMDb (agrega TMDB_API_KEY)
├── vercel.json     Config de Vercel (builds + routes explícitos)
└── README.md
```

- Frontend: HTML/CSS/JS vanilla en `index.html`. Destino futuro: React Native + Expo.
- IA: Claude API, modelo `claude-haiku-4-5-20251001` (barato, ~USD 0.0003 por consulta).
- Datos de contenido: TMDb API v3 (búsqueda, poster, rating, `watch/providers` región AR).
- Proxy: el browser llama a `/api/claude`; el servidor agrega `ANTHROPIC_API_KEY` (variable de entorno en Vercel). La key NUNCA va en el HTML ni en el repo.
- Hosting: Vercel. GitHub Pages NO sirve (no soporta backend, da 404 en `/api/claude`).

## Flujo de la app

1. Splash (logo SVG cara + claqueta, wordmark MYMOOD multicolor)
2. 5 preguntas con barra de progreso
3. Detección de mood (local, en JS)
4. Llamada a Claude con el mood ya resuelto
5. Resultados con tabs Todo / Películas / Series y chips de época
6. Por cada título: búsqueda en TMDb → poster, rating y plataformas AR (en segundo plano, con skeleton)

### Las 5 preguntas (valores internos)

1. Energía: `agotado` | `tranquilo` | `acelerado` | `nostalgico` (pensativo)
2. Necesidad: `reir` | `emocion` | `adrenalina` | `desconectar`
3. Esfuerzo: `cero` | `algo` | `full` | `visual`
4. Universo: `real` | `fantasia` | `terror` | `documental`
5. Compañía: `solo` | `pareja` | `amigos` | `familia`

### Motor de moods (`detectMood()` en index.html)

- P1 × P2 × P3 definen el mood. P4 y P5 son modificadores que afinan género y tono en el prompt (`buildContentInstructions()`).
- Overrides con prioridad: familia → "Para todos en casa"; terror+solo → "Modo miedo en soledad"; agotado+adrenalina → "Despertame de a poco"; pensativo+full → "Bajar al fondo"; acelerado+desconectar → "Activo pero sin drama".
- Moods core: Modo automático, Llorar sin culpa, Reírme sin pensar, Noche tranquila en casa, Sentir algo lindo, Buena onda nomás, Quiero acción ya, Modo fuga total, Que me explote la cabeza, Procesar en silencio, Contemplar y flotar, Sacudirme el bajón.
- Claude recibe el mood ya detectado, no las respuestas crudas. Se le pide diversidad dentro del mood (para que al menos una opción pegue). En regeneración se le pasan los títulos previos para no repetir.
- Filtro de época: chips Todas / Últimos 5 años / 2010-2019 / Clásicos. Cambiar el chip re-consulta a Claude con la restricción de años dentro del prompt (`buildYearInstructions()`).

## Problemas conocidos (diagnóstico del 17/11/2026)

Ordenados por prioridad:

1. **Key de TMDb**: ya vive en el servidor (`api/tmdb.js`). Falta cargar `TMDB_API_KEY` en Vercel (se saca gratis en themoviedb.org).
2. **Mapa de moods incompleto.** Probadas las 1.024 combinaciones: ~33% cae en "Noche tranquila en casa" y 38 de 64 combinaciones P1×P2×P3 no tienen mapeo propio (caen al fallback). "Familia" fuerza ~25% de los casos a "Para todos". Hay que completar el mapa con una regla para todas las combinaciones y reducir el peso del override de familia.
3. **Proxy abierto.** `api/claude.js` tiene CORS `*` y acepta cualquier modelo y `max_tokens` del cliente: cualquiera con la URL puede gastar el saldo. Fijar modelo y `max_tokens` en el servidor, validar largo del prompt y agregar límite por IP.
4. **Falta atribución a TMDb.** Es obligatoria: mostrar en una sección "Acerca de/Créditos": "This product uses the TMDb API but is not endorsed or certified by TMDb."
5. **UX:** "Ver ahora" abre la ficha de TMDb, no la plataforma. "Ya tengo cuenta" no hace nada. "Saltar" deja avanzar sin responder y el mood sale del fallback.
6. **Créditos de Anthropic.** La API es de pago, independiente de la suscripción a Claude.ai. Si el error dice "credit balance is too low", hay que cargar saldo en console.anthropic.com (USD 5 alcanzan para miles de consultas con Haiku).

## Licencia de TMDb

- Gratis para uso no comercial, con atribución.
- Al monetizar (publicidad, afiliados, cobro) pasa a uso comercial y requiere licencia. Un comparador de APIs menciona USD 149/mes para empresas chicas; es dato de un tercero, confirmar con TMDb antes de monetizar.

## Pendientes

- [ ] Poner key real de TMDb
- [ ] Completar mapa de moods
- [ ] Blindar el proxy
- [x] Agregar atribución a TMDb
- [ ] Testear con 5-10 personas (amigos y familia): medir elección en primer set vs regeneración
- [ ] Corregir los detalles de UX listados arriba
- [ ] Convertir en PWA antes de ir a stores (validar retención primero)
- [ ] App móvil (React Native + Expo), reutilizando mood engine, prompt e integración TMDb
- [ ] Idea futura: sección de bares/restaurantes según antojo (mismo motor, Google Places API). Falta decidir si es sección de MyMood o app separada.

## Cómo desplegar

1. Hacer commit a `main` en GitHub. Vercel redeploya en 1-2 minutos.
2. Variables de entorno requeridas en Vercel: `ANTHROPIC_API_KEY` y `TMDB_API_KEY`.
3. Probar SIEMPRE desde https://my-mood-chi.vercel.app, no abriendo `index.html` como archivo local (ahí `/api/claude` no existe y da 404).
4. Si el proxy devuelve 404: verificar que `api/claude.js` esté dentro de la carpeta `api` y que `vercel.json` no esté roto.

## Identidad visual

- Fondo `#0C0C0F`, acento naranja `#FF6B35`, color de mood `#C026D3`
- Gradiente del logo: violeta → rosa → naranja → amarillo, con celeste
- Tipografías: Syne (títulos) + DM Sans (cuerpo)
- Estilo oscuro, mobile-first (ancho máximo ~390px)

## Competencia

- Moveme.tv: el más serio (base neurocientífica, UK), entrada por emoji, solo películas.
- MovieWiser: texto libre + historial, freemium.
- Movies by Mood: moods fijos, sin combinaciones.
- Diferencial de MyMood: mood compuesto por 5 preguntas (energía + necesidad + esfuerzo + universo + compañía), con series y películas, y disponibilidad en AR.

## Reglas de trabajo

- Cambios chicos y probables. Antes de tocar algo grande, explicar qué se va a hacer.
- Nunca poner API keys en el código ni en el repo.
- Después de cada cambio, verificar sintaxis del JS y probar el flujo completo (5 preguntas → resultados).
- Respuestas prácticas, concisas y directas; marcar problemas con franqueza.
