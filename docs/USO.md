# Guía de uso

## Instalar y abrir

Descarga el instalador `AS-x11-0.3.2-setup.exe` desde
[Releases](https://github.com/minysito/AS-x11/releases/latest).
También se publica un MSI y un ejecutable portable. Ejecuta una sola versión a la vez.
Para uso habitual se recomienda instalar y abrir el acceso directo creado por el instalador.
Una versión portable no actualiza una instalación antigua por sí sola.

El receptor de 2,4 GHz debe estar conectado y el ratón encendido. Para cable usa
un USB de datos. Cierra el configurador original mientras cambias ajustes.

## Controles

| Sección | Función |
| --- | --- |
| Inicio | Enlace, DPI actual, sondeo, batería y perfil |
| DPI | Etapas, resolución y colores asociados |
| Iluminación | Efecto, color, brillo, velocidad y tiempos de energía |
| Botones | Izquierdo, derecho, central y dos laterales |
| Rendimiento | 125, 250, 500 o 1000 Hz |
| Perfiles | Selección y copias JSON de la configuración |
| Ajustes | Inicio con Windows, avisos y funciones auxiliares |

Los controles se aplican automáticamente. Los deslizadores agrupan cambios rápidos
durante 300 ms. Cada escritura se verifica leyendo de nuevo el paquete del firmware;
un error se comunica en pantalla. No hay que pulsar Guardar.

En Botones cambia entre **Superior** y **Lateral**. Pulsa una zona numerada para
asignar su acción. Enter y Espacio activan las zonas con foco. Desplazar sobre la
rueda mueve sus estrías en la ilustración; no cambia su asignación. El clic central
es el botón 3. El LED de la ilustración abre Iluminación y refleja los ajustes activos.

Los modos Fijo y Respiración usan el color elegido. Los ciclos multicolor y los
modos por DPI pueden usar su propia paleta. La iluminación de la base no se configura
con el control del LED del ratón. La ilustración no controla la base de carga.

## Inicio con Windows y bandeja

Marca **Ajustes → Iniciar con Windows**: el cambio es inmediato y opcional.
La app arranca oculta en la bandeja, no abre automáticamente la ventana principal.
El icono numérico indica la batería; Windows puede colocarlo entre los iconos ocultos.
Pulsa el icono para abrir y usa su menú **Salir** para terminar la app. Cerrar la
ventana solo la oculta.

El instalador y la aplicación conservan la elección de inicio y actualizan la ruta
al actualizar. No marques esta opción en un portable que luego vas a mover o borrar.

## Si no detecta el ratón

1. Comprueba la versión del lateral: usa 0.3.2 o posterior. Un acceso antiguo puede
   abrir la 0.1.0 aunque hayas descargado un portable nuevo.
2. En 2,4 GHz, enciende y mueve el ratón para despertarlo. Que Windows vea el receptor
   no demuestra que el ratón esté despierto. La app reintenta automáticamente.
3. Comprueba el receptor o usa un cable de datos. Pulsa Reconectar si cambiaste físicamente
   el enlace y no se actualiza; no es necesario al cambiar de sección.
4. Cierra otras versiones de AS x11 y el configurador original para evitar acceso simultáneo.

## Límites de esta versión

Probado en un X11 por cable y 2,4 GHz. No se garantiza X11SE, R1, Bluetooth ni todas
las revisiones de firmware. La edición de macros no está implementada; se pueden
asignar macros almacenadas. Google Drive requiere un cliente OAuth propio y no se
ha validado con una cuenta externa en esta entrega. Las copias JSON son la alternativa local.
