# Cómo funciona

La interfaz React/TypeScript vive en `src/`; Rust y Tauri en `src-tauri/`.
`protocol.rs` codifica y valida los paquetes del X11. `device.rs` serializa todo
el acceso HID en un hilo para evitar operaciones simultáneas.

Los dispositivos comprobados usan VID `1D57`, PID `FA55` por cable y `FA60` por radio.
El hilo usa la colección de comandos y una colección de eventos. Antes de leer un
reporte solicita permiso, espera la respuesta y lee la longitud real. Los comandos
se espacian 300 ms. No se emplean comandos de reinicio o desconexión del ratón.

Al conectar se prepara una caché de perfil, DPI, iluminación, botones y sondeo.
Navegar entre pantallas lee esa caché. Una escritura se comprueba contra el firmware
y actualiza la caché solo si la verificación es correcta. `settingsQueue.ts` agrupa
los cambios de un control por tipo y perfil y conserva los cambios pendientes al navegar.

Los eventos actualizan batería, perfil y etapa DPI. En radio una comprobación en
reposo cada 15 segundos ayuda a detectar apagado y recuperación aunque el receptor
permanezca conectado. Al recuperar se reabre la colección de comandos y se prepara
la caché; una lectura fallida tiene un reintento con una colección nueva.
Esto no es un reinicio USB y no se realiza al navegar.

`MouseVisual.tsx` dibuja las vistas superior y lateral con paths SVG, gradientes,
patrón de rueda y zonas accesibles. La selección, las pulsaciones, la inclinación
y el LED se animan con CSS/React respetando movimiento reducido. La vista comparte
los cinco índices del firmware con el selector de acciones. Las ranuras restantes
y el desplazamiento de la rueda se conservan al editar una asignación.

`tray.rs` construye el icono de batería. La opción de inicio escribe una entrada
por usuario con la ruta entre comillas y `--background`; nunca se habilita por defecto.
El instalador actualiza la ruta si la opción ya estaba activada. Solo una instancia
se ejecuta; abrir otra vez el acceso muestra la ventana existente.

La app no incluye actualizador automático ni servidor de telemetría. Las descargas
versionadas y sus fuentes se conservan en GitHub Releases.
