# Proyectos GPC

Proyectos de Gráficos por Computador del MUIARFID, con la base de bibliotecas y recursos del profesor.

## Web pública

- [Inicio: elegir proyecto](https://ftgerman.github.io/muiarfid-gpc/)
- [Hockey de mesa](https://ftgerman.github.io/muiarfid-gpc/webgl/index.html)
- [Robot](https://ftgerman.github.io/muiarfid-gpc/webgl/robot.html)

El hockey también se puede abrir directamente en `webgl/hockey.html`. `webgl/index.html` redirige a esa página.

## Estructura

```text
index.html                 Selector de proyectos
webgl/
  index.html               Acceso al hockey
  hockey.html              Menú, marcador y estilos del hockey
  robot.html               Página independiente del segundo proyecto
  js/hockey.js             Juego de hockey
  js/robot.js              Código del segundo proyecto
  lib/                     Bibliotecas compartidas de la base
  images/                  Texturas y recursos de imagen
  models/                  Modelos de la base
  fonts/                   Fuentes de la base
  videos/                  Vídeos de la base
```

La página Robot muestra por ahora la foto del gato y el mensaje «Work in progress». El archivo `js/robot.js` se conserva para desarrollar el segundo proyecto, pero esta pantalla provisional no lo carga. `test.html` y `js/test.js` conservan el ejemplo original.

## Desarrollo local

Abre esta carpeta con VS Code y utiliza Live Server sobre `index.html`.

También puedes iniciar un servidor desde la raíz del repositorio:

```sh
python3 -m http.server 8000
```

Después abre <http://localhost:8000/>. No hace falta instalar dependencias: están en `webgl/lib/`.

## Publicar cambios

GitHub Pages publica automáticamente la raíz de la rama `main`. `.nojekyll` permite servir directamente los archivos estáticos.

Desde esta carpeta, después de modificar y comprobar el proyecto:

```sh
git add .
git commit -m "Actualizar proyectos GPC"
git push
```

La URL se mantiene. Los cambios estarán disponibles cuando termine la publicación de GitHub Pages; guardar archivos localmente no los publica.
