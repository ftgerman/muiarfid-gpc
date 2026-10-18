# Hockey de mesa

Juego de dos jugadores en el mismo teclado, integrado en la base del profesor.

## Estructura

- `index.html`: acceso que redirige al hockey.
- `hockey.html`: entrada del juego, menú, marcador y estilos CSS.
- `js/hockey.js`: escena, iluminación, controles, física y reglas.
- `images/ice2.jpg`: textura del suelo utilizada por el juego.
- `lib/`: bibliotecas que ya incluye la base: Three.js r140, Cannon.js 0.6.2, lil-gui y Stats.
- `test.html` y `js/test.js`: ejemplo original del profesor, conservado.

Las demás carpetas y recursos de la base se conservan. El juego no necesita archivos de carpetas superiores ni una instalación de `node_modules`.

## Abrir el juego

Abre esta carpeta en VS Code y utiliza Live Server sobre `index.html`.

También puedes iniciar un servidor desde esta carpeta:

```sh
python3 -m http.server 8000
```

Después abre <http://localhost:8000/>. El juego requiere un servidor HTTP para cargar sus módulos y textura.

## Controles

- Jugador azul: W, A, S, D.
- Jugador rojo: flechas.
- Gana el primero en llegar a 5 puntos.
- El menú permite elegir el modo noche. El panel Focos permite ajustar la iluminación.
- Menú principal reinicia la partida y restaura la iluminación inicial.

## Adaptación a la base

El juego se ha copiado desde `gpc/proyecto` sin cambiar sus reglas ni los parámetros de la física. Los imports apuntan a `lib/` y la textura a `images/`.

Three.js r140 utiliza `texture.encoding` y `renderer.outputEncoding` para configurar sRGB. También se activa `physicallyCorrectLights` y se desactiva `ColorManagement.legacyMode` para conservar el criterio de color e iluminación usado por el juego.

La raíz del repositorio contiene el selector de proyectos. En GitHub Pages el hockey se abre en `webgl/index.html` (o directamente en `webgl/hockey.html`), manteniendo `js/`, `images/` y `lib/` dentro de `webgl/`.
