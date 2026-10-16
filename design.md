# 🎮 NEXUS UI — Design System para Apps Gamer

> Un sistema de diseño **hiper-visual**, **cinético** y con **transiciones en cada interacción**.
> Estética: *Neon Cyberpunk + Glassmorphism + HUD de videojuego*.
> Regla de oro: **nunca un cambio de estado sin transición**. Si algo aparece, se desliza. Si algo cambia, se anima. Si algo carga, respira.

---

## 1. Filosofía de diseño

| Principio | Descripción |
|---|---|
| **Cinético por defecto** | Todo elemento entra, sale o cambia con animación. Nada es instantáneo. |
| **Feedback sensorial** | Cada clic responde con escala, glow, partículas o haptic (vibración en móvil). |
| **Profundidad viva** | Glassmorphism + parallax + sombras de neón que reaccionan al cursor. |
| **Velocidad gamer** | Animaciones rápidas (120–400ms) con *easing* agresivo. Sensación de fluidez, no de lentitud. |
| **Jerarquía HUD** | Elementos parecen sacados de un videojuego: barras, brackets, scanlines, contadores. |

---

## 2. Paleta de color

### Colores base (tema oscuro obligatorio)
```css
--bg-void:        #05060A;  /* Fondo principal, casi negro azulado */
--bg-deep:        #0A0E18;  /* Superficies elevadas */
--bg-panel:       #111526;  /* Paneles y cards */
--bg-glass:       rgba(255,255,255,0.04); /* Glassmorphism */

--text-primary:   #F5F7FF;
--text-secondary: #A8B0CC;
--text-muted:     #5A6484;
```

### Colores de energía (acentos)
```css
--neon-cyan:      #00F0FF;  /* Acento principal / info */
--neon-magenta:   #FF2E9A;  /* Acción crítica / CTA */
--neon-violet:    #8B5CFF;  /* Secundario / progreso */
--neon-lime:      #B4FF39;  /* Éxito / recompensa */
--neon-amber:     #FFB020;  /* Advertencia / XP */
--neon-red:       #FF3B5C;  /* Peligro / daño / error */
```

### Gradientes firma
```css
--grad-hero:     linear-gradient(135deg, #8B5CFF 0%, #FF2E9A 50%, #00F0FF 100%);
--grad-xp:       linear-gradient(90deg, #B4FF39, #00F0FF);
--grad-rage:     linear-gradient(90deg, #FFB020, #FF3B5C);
--grad-glass:    linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01));
--grad-btn:      linear-gradient(135deg, #FF2E9A, #8B5CFF);
```

### Tokens de glow
```css
--glow-cyan:    0 0 12px rgba(0,240,255,.6), 0 0 40px rgba(0,240,255,.25);
--glow-magenta: 0 0 12px rgba(255,46,154,.6), 0 0 44px rgba(255,46,154,.28);
--glow-violet:  0 0 12px rgba(139,92,255,.6), 0 0 40px rgba(139,92,255,.25);
```

---

## 3. Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| **Display / Títulos** | `Orbitron` o `Chakra Petch` | Nombres de sección, logos, HUD |
| **UI / Cuerpo** | `Inter` o `Space Grotesk` | Texto general |
| **Números / Stats** | `JetBrains Mono` o `Rajdhani` | Marcadores, FPS, contadores |

```css
--font-display: "Orbitron", "Chakra Petch", sans-serif;
--font-ui:      "Inter", "Space Grotesk", sans-serif;
--font-mono:    "JetBrains Mono", "Rajdhani", monospace;

--fs-hero:    clamp(2.5rem, 6vw, 5rem);
--fs-h1:      clamp(2rem, 4vw, 3rem);
--fs-body:    1rem;
--fs-caption: 0.8rem;
```

**Efectos de texto:**
- Títulos con `background-clip: text` sobre `--grad-hero`.
- Hover de títulos: desplazamiento glitch de 2px cyan/magenta (chromatic aberration).

---

## 4. Espaciado y radios

```css
--space-1: 4px;  --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-5: 24px; --space-6: 32px;
--space-8: 48px; --space-10: 64px;

--radius-sm: 6px;  --radius-md: 12px; --radius-lg: 20px;
--radius-pill: 999px;

/* Corte biselado estilo HUD */
--clip-bevel: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
```

---

## 5. Sistema de motion (el corazón)

### Duraciones
```css
--dur-instant: 90ms;   /* Feedback de clic */
--dur-fast:    160ms;  /* Hover, ripples */
--dur-base:    260ms;  /* Transiciones estándar */
--dur-slow:    420ms;  /* Modales, drawers */
--dur-hero:    700ms;  /* Entradas de página */
```

### Easing
```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);   /* Entradas */
--ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);  /* Movimientos */
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);/* Rebote tipo gamer */
--ease-snap:     cubic-bezier(0.85, 0, 0.15, 1);  /* Impacto/click */
```

### Principios de motion
1. **Entradas** → `ease-out-expo`, desde abajo + fade (nunca desde la nada).
2. **Salidas** → más rápidas que las entradas (60% de duración), `ease-in`.
3. **Rebote** para recompensas, badges y logros.
4. **Stagger** de 40–60ms entre elementos de listas/grids.

---

## 6. Catálogo de animaciones

### 6.1 Entrada de página
```css
@keyframes pageIn {
  from { opacity: 0; transform: translateY(24px) scale(0.98); filter: blur(8px); }
  to   { opacity: 1; transform: translateY(0) scale(1);      filter: blur(0); }
}
.page-enter { animation: pageIn var(--dur-hero) var(--ease-out-expo) both; }
```

### 6.2 Fade + Slide escalonado (listas)
```css
@keyframes riseIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.stagger > * { animation: riseIn var(--dur-base) var(--ease-out-expo) both; }
.stagger > *:nth-child(1){ animation-delay: 0ms; }
.stagger > *:nth-child(2){ animation-delay: 60ms; }
.stagger > *:nth-child(3){ animation-delay: 120ms; }
.stagger > *:nth-child(4){ animation-delay: 180ms; }
.stagger > *:nth-child(5){ animation-delay: 240ms; }
```

### 6.3 Pulso de neón (respiración)
```css
@keyframes glowPulse {
  0%,100% { box-shadow: 0 0 10px rgba(0,240,255,.5); }
  50%     { box-shadow: 0 0 26px rgba(0,240,255,.9), 0 0 60px rgba(0,240,255,.4); }
}
.pulse { animation: glowPulse 2.4s var(--ease-in-out) infinite; }
```

### 6.4 Shimmer de carga (skeleton)
```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #111526 25%, #1b2138 50%, #111526 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
```

### 6.5 Glitch (hover en títulos)
```css
@keyframes glitch {
  0%   { text-shadow: 2px 0 #00F0FF, -2px 0 #FF2E9A; }
  25%  { text-shadow: -2px 0 #00F0FF, 2px 0 #FF2E9A; }
  50%  { text-shadow: 2px 2px #00F0FF, -2px -2px #FF2E9A; }
  100% { text-shadow: -1px 0 #00F0FF, 1px 0 #FF2E9A; }
}
.title:hover { animation: glitch 240ms steps(2) infinite; }
```

### 6.6 Scanline ambiental (overlay HUD)
```css
@keyframes scan {
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}
.scanline::after {
  content: ""; position: fixed; inset: 0; pointer-events: none;
  background: linear-gradient(transparent, rgba(0,240,255,.06), transparent);
  height: 30%; animation: scan 6s linear infinite;
}
```

### 6.7 Ripple de clic
```css
@keyframes ripple {
  to { transform: scale(4); opacity: 0; }
}
.ripple {
  position: absolute; border-radius: 50%;
  background: rgba(255,255,255,.35);
  transform: scale(0); animation: ripple 600ms var(--ease-out-expo);
}
```

### 6.8 Rebote de logro/recompensa
```css
@keyframes badgePop {
  0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
  60%  { transform: scale(1.2) rotate(6deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); }
}
.badge-pop { animation: badgePop 520ms var(--ease-spring) both; }
```

### 6.9 Barra de XP que se llena
```css
@keyframes fillXP {
  from { width: 0; }
}
.xp-bar > span {
  background: var(--grad-xp);
  animation: fillXP 900ms var(--ease-out-expo) both;
  box-shadow: var(--glow-lime, 0 0 12px rgba(180,255,57,.6));
}
```

### 6.10 Flip de card (3D)
```css
@keyframes flipIn {
  from { transform: perspective(1000px) rotateY(90deg); opacity: 0; }
  to   { transform: perspective(1000px) rotateY(0);    opacity: 1; }
}
.flip { animation: flipIn var(--dur-slow) var(--ease-out-expo) both; }
```

### 6.11 Drawer / Modal
```css
@keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalIn {
  from { opacity: 0; transform: scale(.9) translateY(20px); filter: blur(10px); }
  to   { opacity: 1; transform: scale(1)  translateY(0);    filter: blur(0); }
}
.overlay { animation: overlayIn var(--dur-base) var(--ease-out-expo) both;
           backdrop-filter: blur(12px); background: rgba(5,6,10,.7); }
.modal   { animation: modalIn var(--dur-slow) var(--ease-spring) both; }
```

### 6.12 Transición de tabs con indicador deslizante
```css
.tab-indicator {
  transition: transform var(--dur-base) var(--ease-spring),
              width var(--dur-base) var(--ease-out-expo);
}
```

### 6.13 Parallax por cursor (tilt 3D)
```css
.card-tilt {
  transform-style: preserve-3d;
  transition: transform var(--dur-fast) var(--ease-out-expo);
}
/* JS: rotX = (mouseY - cy) / 20; rotY = (cx - mouseX) / 20; */
```

---

## 7. Componentes clave

### Botón primario
```css
.btn-primary {
  position: relative; overflow: hidden;
  padding: 14px 28px;
  font: 600 1rem var(--font-display);
  letter-spacing: .06em; text-transform: uppercase;
  color: #05060A;
  background: var(--grad-btn);
  clip-path: var(--clip-bevel);
  border: none; cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-spring),
              box-shadow var(--dur-base) var(--ease-out-expo),
              filter var(--dur-fast);
}
.btn-primary:hover  { transform: translateY(-3px) scale(1.03);
                      box-shadow: var(--glow-magenta); filter: brightness(1.15); }
.btn-primary:active { transform: translateY(0) scale(.97);
                      transition-duration: var(--dur-instant); }
```

### Card glass con borde animado
```css
.card {
  background: var(--grad-glass), var(--bg-panel);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: var(--radius-lg);
  transition: transform var(--dur-base) var(--ease-out-expo),
              border-color var(--dur-base), box-shadow var(--dur-base);
}
.card:hover {
  transform: translateY(-6px);
  border-color: rgba(0,240,255,.5);
  box-shadow: var(--glow-cyan);
}
```

### Badge de estado (online/en partida)
```css
.status-dot { width: 10px; height: 10px; border-radius: 50%; }
.status-dot.online { background: var(--neon-lime);
  box-shadow: 0 0 10px var(--neon-lime);
  animation: glowPulse 1.8s var(--ease-in-out) infinite; }
```

### Barra de progreso de XP
```html
<div class="xp-bar">
  <span style="width:72%"></span>
  <label>72% → NIVEL 45</label>
</div>
```
Con segmentos animados y brillo que recorre la barra al completar.

---

## 8. Efectos de fondo globales

```css
body {
  background: var(--bg-void);
  background-image:
    radial-gradient(600px circle at 20% 0%, rgba(139,92,255,.18), transparent 60%),
    radial-gradient(700px circle at 90% 100%, rgba(0,240,255,.14), transparent 60%),
    linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
  background-size: auto, auto, 40px 40px, 40px 40px;
  color: var(--text-primary);
  font-family: var(--font-ui);
}
```
- **Grid holográfico** de fondo con leve animación de desplazamiento.
- **Auroras** de color que se mueven lento (60s loop).
- **Partículas** flotantes en headers (canvas o CSS).

```css
@keyframes aurora {
  0%   { transform: translate(0,0) scale(1); }
  50%  { transform: translate(40px,-30px) scale(1.1); }
  100% { transform: translate(0,0) scale(1); }
}
```

---

## 9. Micro-interacciones (checklist de feedback)

- [ ] **Hover** en cualquier elemento clicable → elevación + glow.
- [ ] **Click** → ripple + `:active` scale 0.97 + haptic.
- [ ] **Éxito** → destello verde + confeti/partículas + badge pop.
- [ ] **Error** → shake horizontal + borde rojo pulsante.
- [ ] **Carga** → skeleton shimmer o spinner orbital.
- [ ] **Notificación** → entra desde la derecha con spring, se apila.
- [ ] **Subida de nivel** → overlay a pantalla completa, barra de XP, texto glitch.
- [ ] **Cambio de ruta** → fade + slide + View Transitions API.

```css
@keyframes shake {
  10%,90% { transform: translateX(-2px); }
  20%,80% { transform: translateX(4px); }
  30%,50%,70% { transform: translateX(-6px); }
  40%,60% { transform: translateX(6px); }
}
.error { animation: shake 400ms var(--ease-snap); }
```

---

## 10. Accesibilidad (no negociable)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
```
- Contraste mínimo **4.5:1** incluso con neón: usa texto oscuro sobre glows claros.
- Las animaciones **nunca** bloquean la lectura ni el foco.
- Feedback **no solo por color** (usa iconos + texto para estados).
- Navegación completa por teclado con `:focus-visible` de anillo neón.

---

## 11. Stack y performance

| Área | Herramienta |
|---|---|
| Framework | React / Next.js + **Framer Motion** o **GSAP** |
| CSS | Tailwind + tokens + `@keyframes` custom |
| Transiciones de ruta | **View Transitions API** / Framer AnimatePresence |
| 3D / WebGL | Three.js / react-three-fiber (headers hero) |
| Partículas | tsParticles / canvas propio |
| Rendimiento | animar solo `transform` y `opacity`, `will-change` puntual, `content-visibility` |

**Reglas de oro de performance:**
1. Anima **solo** `transform` / `opacity` (compositor-friendly).
2. `backdrop-filter` con moderación (caro en móvil).
3. Máx. 3 capas de glow por vista.
4. `will-change` solo durante la animación; retíralo después.

---

## 12. Tokens listos para copiar — `theme.css`

```css
:root {
  /* Color */  /* (ver sección 2) */
  /* Motion */
  --dur-instant: 90ms; --dur-fast: 160ms; --dur-base: 260ms;
  --dur-slow: 420ms;   --dur-hero: 700ms;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-snap:     cubic-bezier(0.85, 0, 0.15, 1);
}
```

---

> **Firma visual:** fondo de vacío con auroras y grid holográfico → superficies de cristal con borde neón → tipografía HUD → **cada interacción responde con movimiento**.
> Resultado: una app que no se *usa*, se **juega**. 🕹️
