import * as THREE from '../lib/three.module.js';
import GUI from '../lib/lil-gui.module.min.js';
import Stats from '../lib/stats.module.js';
THREE.ColorManagement.legacyMode = false;
const CANNON = window.CANNON;

const LARGO_CAMPO = 10.0
const ANCHO_CAMPO = 5.0
const VELOCIDAD_JUGADORES = 3.6;
const VELOCIDAD_MAXIMA_DISCO = 9; // Unidades por segundo.



const escena = new THREE.Scene();
// El fondo transparente permite ver los colores definidos en el HTML.

const camara = new THREE.PerspectiveCamera(
  60,                                      // Campo de visión vertical, en grados.
  window.innerWidth / window.innerHeight,   // Proporción entre ancho y alto.
  0.1,                                     // Distancia mínima visible.
  100                                      // Distancia máxima visible.
);
camara.position.set(0, 7, 7);
camara.lookAt(0, 0, 0);

// Luz ambiental suave: aporta iluminación uniforme a toda la escena.
//const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.5);
const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.25);
escena.add(luzAmbiente);

// Cuatro focos de estadio, uno sobre cada esquina, dirigidos al centro.
const posicionesFocos = [
  [-4, 6, -2],
  [4, 6, -2],
  [-4, 6, 2],
  [4, 6, 2]
];
const focosEstadio = [];
for (const posicion of posicionesFocos) {
  // Repartimos la intensidad del primer foco entre los cuatro.
  const foco = new THREE.SpotLight(0xffffff, 50);
  foco.position.set(...posicion);
  foco.target.position.set(0, 0, 0);
  //foco.angle = Math.PI / 3;
  //foco.penumbra = 0.4;
  foco.distance = 30;
  foco.decay = 2;
  escena.add(foco);
  escena.add(foco.target);
  focosEstadio.push(foco);
}

// Guardamos las intensidades de arranque para restaurarlas al volver al menú.
const iluminacionInicial = {
  ambiente: luzAmbiente.intensity,
  focos: focosEstadio.map(foco => foco.intensity)
};

// Panel de luces: encendido e intensidad independientes para cada foco.
const panelFocos = new GUI({ title: 'Focos', autoPlace: false });
panelFocos.domElement.classList.add('panel-focos');
document.body.appendChild(panelFocos.domElement);
const interruptorAmbiente = panelFocos.add(luzAmbiente, 'visible').name('Luz ambiente');
const opcionesNeones = { neones: true };
panelFocos.add(opcionesNeones, 'neones').name('Neones:').onChange(() => {
  actualizarAspectoNeones();
});
const controlesFocos = [
  { nombre: 'Azul arriba', foco: focosEstadio[0] },
  { nombre: 'Azul abajo', foco: focosEstadio[2] },
  { nombre: 'Rojo arriba', foco: focosEstadio[1] },
  { nombre: 'Rojo abajo', foco: focosEstadio[3] }
];
const interruptoresLuces = [interruptorAmbiente];
for (const control of controlesFocos) {
  const carpeta = panelFocos.addFolder(control.nombre);
  interruptoresLuces.push(carpeta.add(control.foco, 'visible').name('Encendido'));
  carpeta.add(control.foco, 'intensity', 0, 120, 1).name('Intensidad');
}
panelFocos.close(); // Empieza plegado; se abre pulsando el título «Focos».

// Superficie de la mesa: tras el giro, 10 unidades en X y 5 en Z, con Y = 0.
const geometriaMesa = new THREE.PlaneGeometry(LARGO_CAMPO, ANCHO_CAMPO);
const texturaHielo = new THREE.TextureLoader().load('./images/ice2.jpg');
texturaHielo.encoding = THREE.sRGBEncoding;
// Cada repetición alterna la imagen con su reflejo, en las dos direcciones UV.
texturaHielo.wrapS = THREE.MirroredRepeatWrapping;
texturaHielo.wrapT = THREE.MirroredRepeatWrapping;
texturaHielo.repeat.set(2, 1); // Dos repeticiones a lo largo y una a lo ancho.
const materialMesa = new THREE.MeshStandardMaterial({ color: 0xffffff, map: texturaHielo, roughness: 0.8 });
const mesa = new THREE.Mesh(geometriaMesa, materialMesa);
mesa.rotation.x = -Math.PI / 2;
escena.add(mesa);

// Marcas negras del centro: línea de grosor 0.02 y círculo de radio 1.
const materialMarcas = new THREE.MeshStandardMaterial({ color: 0x000000 });

// El rectángulo fino cruza el campo sobre Z, manteniendo X = 0 en su centro.
const geometriaLineaCentral = new THREE.PlaneGeometry(0.02, ANCHO_CAMPO);
const lineaCentral = new THREE.Mesh(geometriaLineaCentral, materialMarcas);
lineaCentral.rotation.x = -Math.PI / 2;
lineaCentral.position.y = 0.001; // Ligeramente sobre la mesa para evitar parpadeos.
escena.add(lineaCentral);

// Líneas de área: comparten la geometría fina de la línea central.
const materialLineaAzul = new THREE.MeshStandardMaterial({ color: 0x0000ff });
const materialLineaRoja = new THREE.MeshStandardMaterial({ color: 0xff0000 });

const lineaAreaAzul = new THREE.Mesh(geometriaLineaCentral, materialLineaAzul);
lineaAreaAzul.rotation.x = -Math.PI / 2;
lineaAreaAzul.position.set((-LARGO_CAMPO / 4) -1, 0.001, 0);
escena.add(lineaAreaAzul);

const lineaAreaRoja = new THREE.Mesh(geometriaLineaCentral, materialLineaRoja);
lineaAreaRoja.rotation.x = -Math.PI / 2;
lineaAreaRoja.position.set((LARGO_CAMPO / 4) + 1, 0.001, 0);
escena.add(lineaAreaRoja);

// RingGeometry dibuja solo el anillo, dejando vacío el interior.
const geometriaCirculoCentral = new THREE.RingGeometry(0.99, 1.01, 64);
const circuloCentral = new THREE.Mesh(geometriaCirculoCentral, materialMarcas);
circuloCentral.rotation.x = -Math.PI / 2;
circuloCentral.position.y = 0.002; // También evita coincidir con la línea en los cruces.
escena.add(circuloCentral);

// Laterales largos: longitud en X, altura en Y y grosor en Z.
const geometriaLateral = new THREE.BoxGeometry(LARGO_CAMPO, 0.5, 0.15);
const materialLateral = new THREE.MeshStandardMaterial({ color: 0x000000 });

// Centro en Y = 0.25; la cara interior queda en Z = -ANCHO_CAMPO / 2 + 0.075.
const lateralNegativo = new THREE.Mesh(geometriaLateral, materialLateral);
lateralNegativo.position.set(0, 0.25, -ANCHO_CAMPO/2);
escena.add(lateralNegativo);

// El lateral opuesto tiene su cara interior en Z = ANCHO_CAMPO / 2 - 0.075.
const lateralPositivo = new THREE.Mesh(geometriaLateral, materialLateral);
lateralPositivo.position.set(0, 0.25, ANCHO_CAMPO/2);
escena.add(lateralPositivo);


const geometriaFondo = new THREE.BoxGeometry(ANCHO_CAMPO / 3, 0.5, 0.15);
const materialFondo = new THREE.MeshStandardMaterial({ color: 0x000000 });

// Fondos del extremo X negativo, a ambos lados de la portería.
const fondoNegativoZNegativo = new THREE.Mesh(geometriaFondo, materialFondo);
fondoNegativoZNegativo.rotation.y = Math.PI / 2;
fondoNegativoZNegativo.position.set(-LARGO_CAMPO / 2, 0.25, -ANCHO_CAMPO / 3);
escena.add(fondoNegativoZNegativo);

const fondoNegativoZPositivo = new THREE.Mesh(geometriaFondo, materialFondo);
fondoNegativoZPositivo.rotation.y = Math.PI / 2;
fondoNegativoZPositivo.position.set(-LARGO_CAMPO / 2, 0.25, ANCHO_CAMPO / 3);
escena.add(fondoNegativoZPositivo);

// Fondos del extremo X positivo, a ambos lados de la portería.
const fondoPositivoZNegativo = new THREE.Mesh(geometriaFondo, materialFondo);
fondoPositivoZNegativo.rotation.y = Math.PI / 2;
fondoPositivoZNegativo.position.set(LARGO_CAMPO / 2, 0.25, -ANCHO_CAMPO / 3);
escena.add(fondoPositivoZNegativo);

const fondoPositivoZPositivo = new THREE.Mesh(geometriaFondo, materialFondo);
fondoPositivoZPositivo.rotation.y = Math.PI / 2;
fondoPositivoZPositivo.position.set(LARGO_CAMPO / 2, 0.25, ANCHO_CAMPO / 3);
escena.add(fondoPositivoZPositivo);

// Tiras blancas: altura 0.03 y grosor 0.05, sobre las vallas.
const geometriaNeonLateral = new THREE.BoxGeometry(LARGO_CAMPO, 0.03, 0.05);
const geometriaNeonFondo = new THREE.BoxGeometry(ANCHO_CAMPO / 3, 0.03, 0.05);
const materialNeon = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 2
});
function actualizarAspectoNeones() {
  // Todas las tiras comparten el material: al apagarlas dejan de dibujarse.
  materialNeon.visible = !modoNoche && opcionesNeones.neones;
}

let temporizadorNeon;
function colorearNeonPorGol(jugador) {
  const colorJugador = jugador === 'azul' ? materialPorteriaAzul.color : materialPorteriaRoja.color;
  // Todas las tiras comparten este material: cambian juntas.
  materialNeon.color.copy(colorJugador);
  materialNeon.emissive.copy(colorJugador);

  // Otro gol cancela la vuelta a blanco anterior y comienza sus propios 5 segundos.
  clearTimeout(temporizadorNeon);
  temporizadorNeon = setTimeout(() => {
    materialNeon.color.set(0xffffff);
    materialNeon.emissive.set(0xffffff);
  }, 3000);
}

// Centro en Y = 0.515: la base de la tira queda en Y = 0.5.
const neonLateralNegativo = new THREE.Mesh(geometriaNeonLateral, materialNeon);
neonLateralNegativo.position.set(0, 0.515, -ANCHO_CAMPO / 2);
escena.add(neonLateralNegativo);

const neonLateralPositivo = new THREE.Mesh(geometriaNeonLateral, materialNeon);
neonLateralPositivo.position.set(0, 0.515, ANCHO_CAMPO / 2);
escena.add(neonLateralPositivo);

// Los cuatro tramos de fondo comparten geometría y se orientan sobre Z.
const neonFondoNegativoZNegativo = new THREE.Mesh(geometriaNeonFondo, materialNeon);
neonFondoNegativoZNegativo.rotation.y = Math.PI / 2;
neonFondoNegativoZNegativo.position.set(-LARGO_CAMPO / 2, 0.515, -ANCHO_CAMPO / 3);
escena.add(neonFondoNegativoZNegativo);

const neonFondoNegativoZPositivo = new THREE.Mesh(geometriaNeonFondo, materialNeon);
neonFondoNegativoZPositivo.rotation.y = Math.PI / 2;
neonFondoNegativoZPositivo.position.set(-LARGO_CAMPO / 2, 0.515, ANCHO_CAMPO / 3);
escena.add(neonFondoNegativoZPositivo);

const neonFondoPositivoZNegativo = new THREE.Mesh(geometriaNeonFondo, materialNeon);
neonFondoPositivoZNegativo.rotation.y = Math.PI / 2;
neonFondoPositivoZNegativo.position.set(LARGO_CAMPO / 2, 0.515, -ANCHO_CAMPO / 3);
escena.add(neonFondoPositivoZNegativo);

const neonFondoPositivoZPositivo = new THREE.Mesh(geometriaNeonFondo, materialNeon);
neonFondoPositivoZPositivo.rotation.y = Math.PI / 2;
neonFondoPositivoZPositivo.position.set(LARGO_CAMPO / 2, 0.515, ANCHO_CAMPO / 3);
escena.add(neonFondoPositivoZPositivo);

const materialPorteriaAzul = new THREE.MeshStandardMaterial({ color: 0x0000ff, roughness: 0.65 });
const materialPorteriaRoja = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.65 });

const PROFUNDIDAD_PORTERIA = 0.8;
const ANCHO_PORTERIA = ANCHO_CAMPO / 3;
// Ambas porterías comparten las geometrías del suelo y de sus paredes laterales.
const geometriaSueloPorteria = new THREE.PlaneGeometry(PROFUNDIDAD_PORTERIA, ANCHO_PORTERIA);
const geometriaLateralPorteria = new THREE.BoxGeometry(PROFUNDIDAD_PORTERIA, 0.5, 0.15);

const sueloPorteriaAzul = new THREE.Mesh(geometriaSueloPorteria, materialPorteriaAzul);
sueloPorteriaAzul.rotation.x = -Math.PI / 2;
sueloPorteriaAzul.position.set(-LARGO_CAMPO / 2 - PROFUNDIDAD_PORTERIA / 2, 0, 0);
escena.add(sueloPorteriaAzul);

const sueloPorteriaRoja = new THREE.Mesh(geometriaSueloPorteria, materialPorteriaRoja);
sueloPorteriaRoja.rotation.x = -Math.PI / 2;
sueloPorteriaRoja.position.set(LARGO_CAMPO / 2 + PROFUNDIDAD_PORTERIA / 2, 0, 0);
escena.add(sueloPorteriaRoja);

// Cara interior en Z = ±ANCHO_PORTERIA / 2; las paredes quedan fuera del hueco.
const lateralPorteriaAzulNegativo = new THREE.Mesh(geometriaLateralPorteria, materialFondo);
lateralPorteriaAzulNegativo.position.set(sueloPorteriaAzul.position.x, 0.25, -ANCHO_PORTERIA / 2 - 0.075);
escena.add(lateralPorteriaAzulNegativo);

const lateralPorteriaAzulPositivo = new THREE.Mesh(geometriaLateralPorteria, materialFondo);
lateralPorteriaAzulPositivo.position.set(sueloPorteriaAzul.position.x, 0.25, ANCHO_PORTERIA / 2 + 0.075);
escena.add(lateralPorteriaAzulPositivo);

const lateralPorteriaRojaNegativo = new THREE.Mesh(geometriaLateralPorteria, materialFondo);
lateralPorteriaRojaNegativo.position.set(sueloPorteriaRoja.position.x, 0.25, -ANCHO_PORTERIA / 2 - 0.075);
escena.add(lateralPorteriaRojaNegativo);

const lateralPorteriaRojaPositivo = new THREE.Mesh(geometriaLateralPorteria, materialFondo);
lateralPorteriaRojaPositivo.position.set(sueloPorteriaRoja.position.x, 0.25, ANCHO_PORTERIA / 2 + 0.075);
escena.add(lateralPorteriaRojaPositivo);

// Los antiguos bloques de entrada pasan a ser las paredes negras del fondo.
// La entrada en X = ±5 queda abierta; tocar estas paredes cuenta como gol.
const porteriaAzul = new THREE.Mesh(geometriaFondo, materialFondo);
porteriaAzul.rotation.y = Math.PI / 2;
porteriaAzul.position.set(-LARGO_CAMPO / 2 - PROFUNDIDAD_PORTERIA, 0.25, 0);
escena.add(porteriaAzul);

const porteriaRoja = new THREE.Mesh(geometriaFondo, materialFondo);
porteriaRoja.rotation.y = Math.PI / 2;
porteriaRoja.position.set(LARGO_CAMPO / 2 + PROFUNDIDAD_PORTERIA, 0.25, 0);
escena.add(porteriaRoja);

// Neones de las porterías: prolongamos las tiras para unirlas en las esquinas.
const geometriaNeonLateralPorteria = new THREE.BoxGeometry(PROFUNDIDAD_PORTERIA + 0.1, 0.03, 0.05);
const geometriaNeonFondoPorteria = new THREE.BoxGeometry(ANCHO_PORTERIA + 0.2, 0.03, 0.05);

function crearNeonPorteria(pared, geometria) {
  const tira = new THREE.Mesh(geometria, materialNeon);
  tira.position.copy(pared.position);
  tira.position.y = 0.515; // La base de la tira queda sobre la pared, en Y = 0.5.
  tira.quaternion.copy(pared.quaternion);
  escena.add(tira);
  return tira;
}

// Las cuatro tiras laterales comparten geometría y el material blanco existente.
crearNeonPorteria(lateralPorteriaAzulNegativo, geometriaNeonLateralPorteria);
crearNeonPorteria(lateralPorteriaAzulPositivo, geometriaNeonLateralPorteria);
crearNeonPorteria(lateralPorteriaRojaNegativo, geometriaNeonLateralPorteria);
crearNeonPorteria(lateralPorteriaRojaPositivo, geometriaNeonLateralPorteria);

// Las dos tiras de fondo copian también el giro de sus paredes sobre Z.
crearNeonPorteria(porteriaAzul, geometriaNeonFondoPorteria);
crearNeonPorteria(porteriaRoja, geometriaNeonFondoPorteria);

// Geometrías compartidas por ambos jugadores.
// CylinderGeometry(radio superior, radio inferior, altura, segmentos del contorno).
const geometriaBaseMango = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 32);
const geometriaAgarreMango = new THREE.CylinderGeometry(0.15, 0.15, 0.35, 32);

// Las posiciones de las piezas son relativas al grupo que las contiene.
const mangoAzul = new THREE.Group();
const baseAzul = new THREE.Mesh(geometriaBaseMango, materialPorteriaAzul);
baseAzul.position.y = 0.075; // Base desde Y = 0 hasta Y = 0.15.
const agarreAzul = new THREE.Mesh(geometriaAgarreMango, materialPorteriaAzul);
agarreAzul.position.y = 0.35; // Desde Y = 0.10 hasta Y = 0.60: entra en la base.
mangoAzul.add(baseAzul, agarreAzul);
mangoAzul.position.set(-3, 0, 0);
escena.add(mangoAzul);

const mangoRojo = new THREE.Group();
const baseRoja = new THREE.Mesh(geometriaBaseMango, materialPorteriaRoja);
baseRoja.position.y = 0.075;
const agarreRojo = new THREE.Mesh(geometriaAgarreMango, materialPorteriaRoja);
agarreRojo.position.y = 0.35;
mangoRojo.add(baseRoja, agarreRojo);
mangoRojo.position.set(3, 0, 0);
escena.add(mangoRojo);

// Focos nocturnos: un cono pequeño sobre cada jugador, apagado en modo normal.
const ALTURA_FOCOS_JUGADORES = 3;
const RADIO_LUZ_JUGADORES = 2; // Radio aproximado de la zona iluminada sobre la mesa.
function crearFocoJugador() {
  const foco = new THREE.SpotLight(0xffffff, 30);
  foco.angle = Math.atan(RADIO_LUZ_JUGADORES / ALTURA_FOCOS_JUGADORES);
  foco.penumbra = 0.35;
  foco.distance = 6;
  foco.decay = 2;
  foco.visible = false;
  escena.add(foco);
  escena.add(foco.target);
  return foco;
}
const focoJugadorAzul = crearFocoJugador();
const focoJugadorRojo = crearFocoJugador();

function actualizarFocosJugadores() {
  // La luz está arriba en Y; su objetivo es el suelo bajo el mango.
  focoJugadorAzul.position.set(mangoAzul.position.x, ALTURA_FOCOS_JUGADORES, mangoAzul.position.z);
  focoJugadorAzul.target.position.set(mangoAzul.position.x, 0, mangoAzul.position.z);
  focoJugadorRojo.position.set(mangoRojo.position.x, ALTURA_FOCOS_JUGADORES, mangoRojo.position.z);
  focoJugadorRojo.target.position.set(mangoRojo.position.x, 0, mangoRojo.position.z);
}
actualizarFocosJugadores();

// Disco visible: radio 0.25 y altura 0.05.
const radioDisco = 0.25;
const geometriaDisco = new THREE.CylinderGeometry(radioDisco, radioDisco, 0.05, 32);
const materialDisco = new THREE.MeshStandardMaterial({ color: 0x000000 });
const disco = new THREE.Mesh(geometriaDisco, materialDisco);
disco.position.set(0, 0.025, 0); // La base apoya en Y = 0.
escena.add(disco);


const mundoFisico = new CANNON.World();
// Cada grupo usa un bit diferente; las máscaras indican con quién puede chocar.
const GRUPO_PAREDES = 1;
const GRUPO_MANGOS = 2;
const GRUPO_DISCO = 4;
const GRUPO_BARRERA = 8;
mundoFisico.gravity.set(0, 0, 0);
mundoFisico.solver.iterations = 20;
mundoFisico.defaultContactMaterial.friction = 0; // Permite deslizarse por una valla.
mundoFisico.defaultContactMaterial.restitution = 0; // El mango se detiene sin rebotar.
const PASO_FISICA = 1 / 480; // Pasos pequeños para resolver contactos con estabilidad.
let tiempoAcumulado = 0;

// La caja física copia las medidas, posición y giro del bloque visible.
function crearCuerpoValla(valla) {
  const medidas = valla.geometry.parameters;
  const cuerpo = new CANNON.Body({
    mass: 0, // Una masa cero crea un cuerpo estático.
    collisionFilterGroup: GRUPO_PAREDES,
    collisionFilterMask: GRUPO_MANGOS | GRUPO_DISCO,
    shape: new CANNON.Box(new CANNON.Vec3(
      medidas.width / 2,
      medidas.height / 2,
      medidas.depth / 2
    ))
  });
  cuerpo.position.copy(valla.position);
  cuerpo.quaternion.copy(valla.quaternion);
  mundoFisico.addBody(cuerpo);
  
  return cuerpo;
}

crearCuerpoValla(lateralNegativo);
crearCuerpoValla(lateralPositivo);
crearCuerpoValla(fondoNegativoZNegativo);
crearCuerpoValla(fondoNegativoZPositivo);
crearCuerpoValla(fondoPositivoZNegativo);
crearCuerpoValla(fondoPositivoZPositivo);
// Los cuatro laterales cierran los huecos; el suelo solo es visual (sin gravedad).
crearCuerpoValla(lateralPorteriaAzulNegativo);
crearCuerpoValla(lateralPorteriaAzulPositivo);
crearCuerpoValla(lateralPorteriaRojaNegativo);
crearCuerpoValla(lateralPorteriaRojaPositivo);
// Conservamos estas referencias para detectar el gol por contacto con el fondo.
const cuerpoPorteriaAzul = crearCuerpoValla(porteriaAzul);
const cuerpoPorteriaRoja = crearCuerpoValla(porteriaRoja);

// Barrera central invisible: solo existe en Cannon, sin malla de Three.js.
const cuerpoBarreraCentral = new CANNON.Body({
  mass: 0,
  // Grosor 0.15, como las vallas: deja margen para la pequeña penetración del solver.
  shape: new CANNON.Box(new CANNON.Vec3(0.075, 0.25, ANCHO_CAMPO / 2 + 0.15)),
  position: new CANNON.Vec3(0, 0.25, 0),
  collisionFilterGroup: GRUPO_BARRERA,
  collisionFilterMask: GRUPO_MANGOS
});
mundoFisico.addBody(cuerpoBarreraCentral);

function crearCuerpoMango(mango) {
  // Una esfera tiene el mismo contorno circular que la base vista desde arriba.
  const cuerpo = new CANNON.Body({
    mass: 1, // Dinámico: Cannon puede frenarlo al contactar con una valla.
    collisionFilterGroup: GRUPO_MANGOS,
    collisionFilterMask: GRUPO_PAREDES | GRUPO_MANGOS | GRUPO_DISCO | GRUPO_BARRERA,
    shape: new CANNON.Sphere(geometriaBaseMango.parameters.radiusBottom),
    position: new CANNON.Vec3(mango.position.x, 0.075, mango.position.z),
    fixedRotation: true,
    linearDamping: 0,
    allowSleep: false
  });
  // Sin gravedad y con velocidad Y = 0, el movimiento se mantiene sobre XZ.
  mundoFisico.addBody(cuerpo);
  return cuerpo;
}

const cuerpoMangoAzul = crearCuerpoMango(mangoAzul);
const cuerpoMangoRojo = crearCuerpoMango(mangoRojo);

// Disco dinámico: Cannon calcula su movimiento cuando recibe un golpe.
const cuerpoDisco = new CANNON.Body({
  mass: 1,
  collisionFilterGroup: GRUPO_DISCO,
  collisionFilterMask: GRUPO_PAREDES | GRUPO_MANGOS, // Ignora la barrera central.
  shape: new CANNON.Sphere(radioDisco),
  // Misma altura física que los mangos para que los contactos sean horizontales.
  position: new CANNON.Vec3(disco.position.x, 0.075, disco.position.z),
  fixedRotation: true,
  linearDamping: 0,
  allowSleep: false
});
mundoFisico.addBody(cuerpoDisco);

function limitarVelocidadDisco() {
  const rapidez = cuerpoDisco.velocity.length();
  if (rapidez > VELOCIDAD_MAXIMA_DISCO) {
    // Reducimos todos los componentes en la misma proporción: conserva la dirección.
    cuerpoDisco.velocity.scale(VELOCIDAD_MAXIMA_DISCO / rapidez, cuerpoDisco.velocity);
  }
}

// Materiales físicos de los mangos y del disco.
const materialFisicoMangos = new CANNON.Material('mangos');
const materialFisicoDisco = new CANNON.Material('disco');

cuerpoMangoAzul.material = materialFisicoMangos;
cuerpoMangoRojo.material = materialFisicoMangos;
cuerpoDisco.material = materialFisicoDisco;

// Comportamiento del contacto mango-disco.
const RESTITUCION_INICIAL = 2;
const contactoMangoDisco = new CANNON.ContactMaterial(
  materialFisicoMangos,
  materialFisicoDisco,
  {
    friction: 0,       // Sin rozamiento.
    restitution: RESTITUCION_INICIAL // Golpe con ganancia de energía.
  }
);

mundoFisico.addContactMaterial(contactoMangoDisco);

let temporizadorRestitucion;
function iniciarAumentoRestitucion() {
  clearInterval(temporizadorRestitucion);
  contactoMangoDisco.restitution = RESTITUCION_INICIAL;
  // Tiempo real desde el inicio de la partida, incluso si nadie se mueve.
  temporizadorRestitucion = setInterval(() => {
    if (!juegoIniciado) return;
    contactoMangoDisco.restitution = Math.min(contactoMangoDisco.restitution + 0.05, 2.5);
  }, 5000);
}

const materialFisicoParedes = new CANNON.Material('paredes');

// Los cuerpos estáticos actuales son las vallas, fondos y porterías.
for (const cuerpo of mundoFisico.bodies) {
  if (cuerpo.type === CANNON.Body.STATIC) { // mass: 0 = estático.
    cuerpo.material = materialFisicoParedes;
  }
}

// Comportamiento del contacto disco-pared.
const contactoDiscoPared = new CANNON.ContactMaterial(
  materialFisicoDisco,
  materialFisicoParedes,
  {
    friction: 0,
    restitution: 1
  }
);

mundoFisico.addContactMaterial(contactoDiscoPared);


const renderizador = new THREE.WebGLRenderer({ alpha: true, antialias: true });
// Equivalentes en r140 a la salida sRGB y las luces de la versión anterior del juego.
renderizador.outputEncoding = THREE.sRGBEncoding;
renderizador.physicallyCorrectLights = true;
// setPixelRatio: Adapta la resolución del dibujo a la pantalla. En pantallas con mayor densidad de píxeles, hace que se vea más definido. El límite de 2 evita aumentar demasiado el trabajo de la gráfica.
renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
renderizador.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderizador.domElement);

// Stats: solo FPS, abajo a la izquierda; no intercepta clics del juego.
const estadisticas = new Stats();
estadisticas.showPanel(0);
estadisticas.dom.style.cssText = 'position: fixed; left: 16px; bottom: 16px; z-index: 1; pointer-events: none;';
document.body.appendChild(estadisticas.dom);


const teclasPulsadas = new Set();
const teclasMovimiento = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'
]);

// La física y los controles arrancan al elegir dos jugadores.
let juegoIniciado = false;
let modoNoche = false;
let estadoLucesAntesNoche;
const menuInicio = document.getElementById('menu-inicio');
const marcador = document.getElementById('marcador');
const botonJugar = document.getElementById('boton-jugar');
const botonModoNoche = document.getElementById('boton-modo-noche');
const botonCambiarFondo = document.getElementById('boton-cambiar-fondo');
const ventanaVictoria = document.getElementById('ventana-victoria');
const mensajeVictoria = document.getElementById('mensaje-victoria');
const botonMenuPrincipal = document.getElementById('boton-menu-principal');
const botonVolverMenu = document.getElementById('boton-volver-menu');

let puntosAzul = 0;
let puntosRojo = 0;
const textoPuntosAzul = document.getElementById('puntos-azul');
const textoPuntosRojo = document.getElementById('puntos-rojo');
let jugadorQueMarca = null;

// Cannon avisa del contacto. Guardamos el gol para resolverlo al terminar el paso físico.
cuerpoDisco.addEventListener('collide', (evento) => {
  if (!juegoIniciado || jugadorQueMarca !== null) return;
  if (evento.body === cuerpoPorteriaRoja) jugadorQueMarca = 'azul';
  if (evento.body === cuerpoPorteriaAzul) jugadorQueMarca = 'rojo';
});

function reiniciarCuerpo(cuerpo, x, z) {
  cuerpo.position.set(x, 0.075, z);
  cuerpo.previousPosition.copy(cuerpo.position);
  cuerpo.interpolatedPosition.copy(cuerpo.position);
  cuerpo.velocity.set(0, 0, 0);
  cuerpo.angularVelocity.set(0, 0, 0);
  cuerpo.force.set(0, 0, 0);
  cuerpo.torque.set(0, 0, 0);
  cuerpo.aabbNeedsUpdate = true;
  cuerpo.wakeUp();
}

function resolverGol() {
  // Marcar en la portería rival suma un punto.
  if (jugadorQueMarca === 'azul') puntosAzul += 1;
  if (jugadorQueMarca === 'rojo') puntosRojo += 1;
  textoPuntosAzul.textContent = String(puntosAzul);
  textoPuntosRojo.textContent = String(puntosRojo);

  colorearNeonPorGol(jugadorQueMarca);
  // La partida termina al llegar a cinco puntos; la física deja de avanzar.
  if (puntosAzul >= 5 || puntosRojo >= 5) {
    juegoIniciado = false;
    botonVolverMenu.hidden = true;
    clearInterval(temporizadorRestitucion);
    mensajeVictoria.textContent = `Jugador ${jugadorQueMarca} ha ganado!`;
    ventanaVictoria.hidden = false;
    botonMenuPrincipal.focus();
  }
  reiniciarCuerpo(cuerpoDisco, 0, 0);
  reiniciarCuerpo(cuerpoMangoAzul, -3, 0);
  reiniciarCuerpo(cuerpoMangoRojo, 3, 0);
  jugadorQueMarca = null;
  teclasPulsadas.clear();
  tiempoAcumulado = 0;
}

function volverAlMenu() {
  juegoIniciado = false;
  clearInterval(temporizadorRestitucion);
  contactoMangoDisco.restitution = RESTITUCION_INICIAL;
  puntosAzul = 0;
  puntosRojo = 0;
  textoPuntosAzul.textContent = '0';
  textoPuntosRojo.textContent = '0';
  jugadorQueMarca = null;
  // Reiniciamos también el dibujo, porque la física queda detenida en el menú.
  for (const [cuerpo, figura, x] of [
    [cuerpoDisco, disco, 0],
    [cuerpoMangoAzul, mangoAzul, -3],
    [cuerpoMangoRojo, mangoRojo, 3]
  ]) {
    reiniciarCuerpo(cuerpo, x, 0);
    figura.position.x = x;
    figura.position.z = 0;
  }
  actualizarFocosJugadores();
  teclasPulsadas.clear();
  tiempoAcumulado = 0;
  tiempoAnterior = undefined;
  clearTimeout(temporizadorNeon);
  materialNeon.color.set(0xffffff);
  materialNeon.emissive.set(0xffffff);
  reiniciarIluminacion();
  ventanaVictoria.hidden = true;
  marcador.hidden = true;
  menuInicio.hidden = false;
  botonVolverMenu.hidden = true;
  botonJugar.focus();
}
botonMenuPrincipal.addEventListener('click', volverAlMenu);
botonVolverMenu.addEventListener('click', volverAlMenu);

function reiniciarIluminacion() {
  modoNoche = false;
  estadoLucesAntesNoche = undefined;
  document.body.classList.remove('modo-noche');
  document.body.classList.remove('fondo-negro');
  botonCambiarFondo?.setAttribute('aria-pressed', 'false');
  botonModoNoche.textContent = 'Modo noche: No';
  botonModoNoche.setAttribute('aria-pressed', 'false');

  luzAmbiente.visible = true;
  luzAmbiente.intensity = iluminacionInicial.ambiente;
  for (let i = 0; i < focosEstadio.length; i++) {
    focosEstadio[i].visible = true;
    focosEstadio[i].intensity = iluminacionInicial.focos[i];
  }
  focoJugadorAzul.visible = false;
  focoJugadorRojo.visible = false;
  opcionesNeones.neones = true;
  materialNeon.visible = true;
  actualizarAspectoNeones();

  // Actualizamos también las casillas y los valores que muestra lil-gui.
  for (const interruptor of interruptoresLuces) interruptor.enable();
  for (const control of panelFocos.controllersRecursive()) control.updateDisplay();
  for (const carpeta of panelFocos.folders) carpeta.open();
  panelFocos.close();
}

function aplicarModoNoche() {
  document.body.classList.toggle('modo-noche', modoNoche);
  actualizarAspectoNeones();
  focoJugadorAzul.visible = modoNoche;
  focoJugadorRojo.visible = modoNoche;
  if (modoNoche) {
    // Guardamos los interruptores para recuperar la configuración del modo normal.
    estadoLucesAntesNoche = {
      ambiente: luzAmbiente.visible,
      focos: focosEstadio.map(foco => foco.visible)
    };
    luzAmbiente.visible = false;
    for (const foco of focosEstadio) foco.visible = false;
  } else {
    luzAmbiente.visible = estadoLucesAntesNoche.ambiente;
    for (let i = 0; i < focosEstadio.length; i++) {
      focosEstadio[i].visible = estadoLucesAntesNoche.focos[i];
    }
  }

  // El panel refleja el apagado y evita encender los focos de estadio en modo noche.
  for (const interruptor of interruptoresLuces) {
    interruptor.updateDisplay();
    if (modoNoche) interruptor.disable();
    else interruptor.enable();
  }
}

botonCambiarFondo?.addEventListener('click', () => {
  const fondoNegro = document.body.classList.toggle('fondo-negro');
  botonCambiarFondo.setAttribute('aria-pressed', String(fondoNegro));
});

botonModoNoche.addEventListener('click', () => {
  modoNoche = !modoNoche;
  aplicarModoNoche();
  botonModoNoche.textContent = modoNoche ? 'Modo noche: Sí' : 'Modo noche: No';
  botonModoNoche.setAttribute('aria-pressed', String(modoNoche));
  
});


botonJugar.addEventListener('click', () => {
  teclasPulsadas.clear();
  tiempoAcumulado = 0;
  tiempoAnterior = undefined;
  juegoIniciado = true;
  iniciarAumentoRestitucion();
  menuInicio.hidden = true;
  marcador.hidden = false;
  botonVolverMenu.hidden = false;
  botonJugar.blur();
});

window.addEventListener('keydown', (evento) => {
  if (!juegoIniciado || !teclasMovimiento.has(evento.code)) return;
  evento.preventDefault(); 
  teclasPulsadas.add(evento.code);
});

window.addEventListener('keyup', (evento) => {
  if (!teclasMovimiento.has(evento.code)) return;
  evento.preventDefault();
  teclasPulsadas.delete(evento.code);
});

// Evita dejar una tecla pulsada si cambiamos de ventana.
window.addEventListener('blur', () => teclasPulsadas.clear());

let tiempoAnterior;
function animar(tiempoActual) {
  estadisticas.update(); // Se actualiza en cada fotograma, también en el menú.
  const segundos = tiempoAnterior === undefined ? 0 : Math.min((tiempoActual - tiempoAnterior) / 1000, 0.05);
  tiempoAnterior = tiempoActual;

  // Mientras se ve el menú, dibujamos el campo sin avanzar la partida.
  if (!juegoIniciado) {
    renderizador.render(escena, camara);
    requestAnimationFrame(animar);
    return;
  }


  // Primero calculamos la dirección del jugador azul.
  let movimientoAzulX = 0;
  let movimientoAzulZ = 0;
  if (teclasPulsadas.has('KeyW')) {
    movimientoAzulZ -= 1;
  }
  if (teclasPulsadas.has('KeyS')) {
    movimientoAzulZ += 1;
  }
  if (teclasPulsadas.has('KeyA')) {
    movimientoAzulX -= 1;
  }
  if (teclasPulsadas.has('KeyD')) {
    movimientoAzulX += 1;
  }

  // En diagonal reducimos ambos componentes para mantener la misma velocidad.
  if (movimientoAzulX !== 0 && movimientoAzulZ !== 0) {
    movimientoAzulX /= Math.sqrt(2);
    movimientoAzulZ /= Math.sqrt(2);
  }

  // Calculamos y corregimos la dirección del jugador rojo de la misma forma.
  let movimientoRojoX = 0;
  let movimientoRojoZ = 0;
  if (teclasPulsadas.has('ArrowUp')) {
    movimientoRojoZ -= 1;
  }
  if (teclasPulsadas.has('ArrowDown')) {
    movimientoRojoZ += 1;
  }
  if (teclasPulsadas.has('ArrowLeft')) {
    movimientoRojoX -= 1;
  }
  if (teclasPulsadas.has('ArrowRight')) {
    movimientoRojoX += 1;
  }

  if (movimientoRojoX !== 0 && movimientoRojoZ !== 0) {
    movimientoRojoX /= Math.sqrt(2);
    movimientoRojoZ /= Math.sqrt(2);
  }

  // Las teclas piden una velocidad; las colisiones deciden cuánto se avanza.
  tiempoAcumulado += segundos;
  while (tiempoAcumulado >= PASO_FISICA) {
    cuerpoMangoAzul.velocity.set(
      movimientoAzulX * VELOCIDAD_JUGADORES, 0, movimientoAzulZ * VELOCIDAD_JUGADORES
    );
    cuerpoMangoRojo.velocity.set(
      movimientoRojoX * VELOCIDAD_JUGADORES, 0, movimientoRojoZ * VELOCIDAD_JUGADORES
    );
    limitarVelocidadDisco(); // Limita la distancia que recorrerá durante el paso.
    mundoFisico.step(PASO_FISICA);
    cuerpoDisco.position.y = 0.075;
    cuerpoDisco.velocity.y = 0;
    cuerpoDisco.force.y = 0;
    cuerpoDisco.aabbNeedsUpdate = true;
    limitarVelocidadDisco(); // Un choque puede haber aumentado su velocidad.
    if (jugadorQueMarca !== null) {
      resolverGol();
      break; // No avanzamos otra vez los jugadores durante este fotograma.
    }
    tiempoAcumulado -= PASO_FISICA;
  }

  // Copiamos el resultado físico al dibujo, conservando la altura de los grupos.
  mangoAzul.position.x = cuerpoMangoAzul.position.x;
  mangoAzul.position.z = cuerpoMangoAzul.position.z;
  mangoRojo.position.x = cuerpoMangoRojo.position.x;
  mangoRojo.position.z = cuerpoMangoRojo.position.z;
  disco.position.x = cuerpoDisco.position.x;
  disco.position.z = cuerpoDisco.position.z; // El dibujo conserva Y = 0.025.

  actualizarFocosJugadores(); // Siguen también el reinicio de posiciones después de un gol.

  renderizador.render(escena, camara);
  requestAnimationFrame(animar);
}
requestAnimationFrame(animar);

window.addEventListener('resize', () => {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderizador.setSize(window.innerWidth, window.innerHeight);
  renderizador.render(escena, camara);
});
