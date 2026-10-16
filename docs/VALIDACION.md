# Validación y límites

El 15 de octubre de 2026 se comprobaron en el X11 del usuario las cuatro tasas de
sondeo y escrituras de LED rojo/verde/azul en cable y 2,4 GHz, leyendo después los
paquetes y restaurando la configuración inicial. La lectura confirma lo almacenado;
no mide con un analizador externo la frecuencia física ni confirma por sí sola el LED visible.

La versión 0.3.0 superó ocho pruebas Rust y cuatro pruebas de cola automática. La
prueba nativa de caché realizó 600 lecturas de configuración sin nuevas transferencias
HID, en aproximadamente 2,64 ms. No se mide con ello la continuidad física de cada
evento de movimiento del ratón.

El usuario apagó y encendió físicamente el ratón inalámbrico; se observó recuperación
automática y lectura correcta de iluminación sin pulsar Reconectar. También se comprobó
la recuperación del portable 0.3.0 al despertar el ratón. En 0.3.1 se revisó el SVG
en la ventana y se abrió el selector pulsando un lateral del dibujo.

El 16 de octubre se encontró una instalación 0.1.0 abierta desde un acceso antiguo,
mientras el inicio automático apuntaba al portable 0.3.1. Windows veía el receptor.
Al instalar y abrir 0.3.1, la app detectó 2,4 GHz, 100 %, 4100 DPI y 500 Hz. Se unificó
el acceso por usuario y la entrada de inicio en una ruta instalada estable. Se probó
el lanzamiento con `--background` y la apertura posterior mediante instancia única.
No se ha realizado otro reinicio completo de Windows para comprobar el próximo inicio.

La 0.3.2 añade las vistas superior y lateral según las nuevas referencias y actualiza
la ruta de inicio desde el instalador si ya estaba activada. Las pruebas no cubren
otras revisiones de X11, X11SE, R1, Bluetooth, Google Drive ni la luz de la base.
