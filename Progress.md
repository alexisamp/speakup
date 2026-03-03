# SpeakUp — Progress Log

## Sesión de hoy (2026-03-02)

### v2 — Completado previamente
- `components/ConversationPanel.tsx` — reescrito con ElevenLabs `useConversation`, feedback estructurado (pronunciation/fluency/phrases/focus)
- `components/TopicSelector.tsx` — selector de temas con 6 cards
- `components/PreSessionBrief.tsx` — brief pre-sesión con historial, streak, input de contexto con detección de URLs
- `components/SessionHistory.tsx` — historial de sesiones con sparkline (recharts)
- `components/SaveSessionPanel.tsx` — panel de guardado con upsert de vocabulario
- `components/Heatmap.tsx` — heatmap de actividad mensual
- `components/VocabularyView.tsx` — tracker de frases con filtros y categorías
- `app/api/fetch-url/route.ts` — endpoint para extraer título/texto de URLs
- `app/page.tsx` — reescrito con tabs (Practice / History / Vocabulary) y máquina de estados (topic → brief → session → save)
- `mcp/index.ts` — servidor MCP con 5 herramientas (get_sessions, get_vocabulary, get_streak, get_transcripts, get_progress_summary)

---

### v3 — Completado hoy

#### Archivos nuevos
| Archivo | Descripción |
|---------|-------------|
| `lib/partners.ts` | 4 perfiles DISC (Jordan/D, Sam/I, Alex/S, Morgan/C) con voice IDs de ElevenLabs |
| `lib/syncAgents.ts` | Auto-sync de partners a tabla `agents` en Supabase, cache disc→UUID |
| `components/PronunciationReplay.tsx` | TTS "Hear it" (ElevenLabs API) + grabación 4s con countdown |
| `extension/manifest.json` | Chrome Extension MV3 |
| `extension/content.js` | Extrae título + 600 chars de article/main de cualquier página |
| `extension/popup.html` | UI del popup (320px, dark) con selector de partner y botón de apertura |
| `extension/popup.js` | Lógica: obtiene contexto de la tab, arma URL con `?context=&partner=` |
| `extension/background.js` | Service worker mínimo |
| `extension/README.md` | Instrucciones de instalación y configuración |

#### Archivos modificados
| Archivo | Cambios |
|---------|---------|
| `components/TopicSelector.tsx` | Reescrito: fila de partners (4 cards con borde de color) + grid de temas; `onStart(partner, topic)` |
| `components/ConversationPanel.tsx` | Prop `partner: Partner`; usa `partner.agentId`; incluye `partnerDisc/Name/VoiceId/topicSelected/contextInput` en `SessionEndData` |
| `components/SessionHistory.tsx` | Pill de partner en cada fila (`🔴 Jordan · Mar 1 · 14 min · 7/10`) |
| `components/SaveSessionPanel.tsx` | Guarda `agent_id`, `partner_name`, `partner_disc`, `topic_selected`, `context_input`; renderiza `<PronunciationReplay>` |
| `components/PreSessionBrief.tsx` | Props `fromExtension?` + `initialContext?`; banner "📖 Context loaded from Chrome extension" |
| `app/page.tsx` | Estado `selectedPartner`, `fromExtension`, `extensionContext`; lee URL params `?context=&partner=`; llama `syncAgents()` al montar; pill de partner en header durante sesión |
| `.env.local` | Agregadas 4 vars vacías: `NEXT_PUBLIC_AGENT_D/I/S/C` |

---

## Pendiente para la próxima sesión

### 🔴 Bloqueante — necesita acción manual
1. **Migraciones Supabase** — ejecutar en el SQL Editor del dashboard:
   ```sql
   CREATE TABLE IF NOT EXISTS agents (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     elevenlabs_agent_id text UNIQUE NOT NULL,
     name text NOT NULL,
     disc_profile text NOT NULL,
     color text, emoji text, label text, description text, voice_id text,
     is_active boolean DEFAULT true,
     created_at timestamp with time zone DEFAULT now()
   );

   ALTER TABLE sessions
     ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES agents(id),
     ADD COLUMN IF NOT EXISTS partner_name text,
     ADD COLUMN IF NOT EXISTS partner_disc text,
     ADD COLUMN IF NOT EXISTS topic_selected text,
     ADD COLUMN IF NOT EXISTS context_input text;
   ```

2. ✅ **Agentes ElevenLabs creados y configurados** — IDs en `.env.local` y en Vercel (production + preview):
   - `NEXT_PUBLIC_AGENT_D=agent_5101kjra4rh6em4vxy7w6t37az3b` → Jordan (🔴 Direct)
   - `NEXT_PUBLIC_AGENT_I=agent_2801kjrwt695fh0v44gbtrhp4012` → Sam (🟡 Energetic)
   - `NEXT_PUBLIC_AGENT_S=agent_4101kjtayvhnennts8e45x8t1r2v` → Alex (🟢 Patient)
   - `NEXT_PUBLIC_AGENT_C=agent_2501kjtb2xwjf0abm2eskxzp3mm3` → Morgan (🔵 Analytical)

3. **Instalar la extensión de Chrome** para probarla:
   - Ir a `chrome://extensions` → Developer mode → Load unpacked → seleccionar `extension/`

### 🟡 Mejoras opcionales para próxima sesión
- Hacer el icono de la extensión (`extension/icon.png`) — actualmente el manifest lo referencia pero no existe
- Probar el flujo completo end-to-end: extensión → SpeakUp → sesión → guardado con partner info
- Verificar que `PronunciationReplay` parsea correctamente los distintos formatos de feedback de ElevenLabs
- Añadir tooltip o label al seleccionar partner en TopicSelector (label completo: "Direct & Fast")
- Considerar persistir el partner seleccionado en `localStorage` para pre-seleccionarlo en la próxima visita
