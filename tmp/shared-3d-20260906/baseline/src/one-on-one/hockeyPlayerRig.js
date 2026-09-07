import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CARRY_OFFSET } from './simulation.js';

const NAVY = '#0B1A33', GOLD = '#C9A24B';
const UP = new THREE.Vector3(0, 1, 0);
const lerp = (a, b, t) => a.map((value, index) => value + (b[index] - value) * t);

// A rounded rectangular cross-section gives the jersey a shoulder/waist shape
// without ballooning into a sphere. Sections are baked once, never per frame.
function jerseySection(bottom, top, widthA, widthB, depthA, depthB, leanA = 0, leanB = 0) {
  const count = 24, vertices = [], uvs = [], indices = [];
  const ring = (y, width, depth, lean) => {
    for (let index = 0; index < count; index++) {
      const angle = index / count * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle);
      vertices.push(Math.sign(c) * Math.pow(Math.abs(c), .52) * width / 2, y, Math.sign(s) * Math.pow(Math.abs(s), .52) * depth / 2 + lean);
      uvs.push(index / count, y);
    }
  };
  ring(bottom, widthA, depthA, leanA); ring(top, widthB, depthB, leanB);
  for (let index = 0; index < count; index++) {
    const next = (index + 1) % count;
    indices.push(index, count + index, next, next, count + index, count + next);
  }
  // Close the hidden ends as well, so lower cameras cannot see through sleeves.
  for (let index = 1; index < count - 1; index++) {
    indices.push(0, index, index + 1, count, count + index + 1, count + index);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function bladeGeometry() {
  // Flat upright blade with a hooked toe in the ground plane. Its taped face
  // remains adjacent to the simulation's exact carried-puck offset.
  const outline = [[.545, -.795], [.578, -.780], [.732, -.959], [.816, -1.115], [.783, -1.137], [.702, -.993], [.549, -.829]];
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .075, bevelEnabled: true, bevelThickness: .005, bevelSize: .004, bevelSegments: 1, steps: 1 });
  geometry.rotateX(-Math.PI / 2); geometry.translate(0, .035, 0);
  return geometry;
}

/** Local forward is -Z. Positions and facing belong exclusively to the caller. */
export function buildHockeyPlayerRig({ goalie = false, colour = NAVY, number = '', showStick = true, accent } = {}) {
  const group = new THREE.Group();
  const jerseyColour = new THREE.Color(colour).getHexString().toUpperCase() === 'C9A24B' ? GOLD : NAVY;
  const trimColour = accent || (jerseyColour === GOLD ? NAVY : GOLD);
  const materials = {
    jersey: new THREE.MeshStandardMaterial({ color: jerseyColour, roughness: .83 }),
    helmet: new THREE.MeshStandardMaterial({ color: jerseyColour, roughness: .3, metalness: .12 }),
    trim: new THREE.MeshStandardMaterial({ color: trimColour, roughness: .72 }),
    pants: new THREE.MeshStandardMaterial({ color: '#101D30', roughness: .82 }),
    carbon: new THREE.MeshStandardMaterial({ color: '#14202A', roughness: .42, metalness: .1 }),
    cream: new THREE.MeshStandardMaterial({ color: '#F5EFE0', roughness: .72 }),
    skin: new THREE.MeshStandardMaterial({ color: '#E7B996', roughness: .83 }),
    metal: new THREE.MeshStandardMaterial({ color: '#ADBEC9', roughness: .24, metalness: .72 }),
    inset: new THREE.MeshStandardMaterial({ color: '#07111B', roughness: .74 }),
    leather: new THREE.MeshStandardMaterial({ color: '#BB946A', roughness: .87 }),
  };
  const buckets = new Map(), partNames = new Set(), resources = [];
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
  const part = (name, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
    partNames.add(name);
    const original = geometry;
    if (geometry.index) { geometry = geometry.toNonIndexed(); original.dispose(); }
    quaternion.setFromEuler(new THREE.Euler(...rotation));
    matrix.compose(new THREE.Vector3(...position), quaternion, new THREE.Vector3(...scale));
    geometry.applyMatrix4(matrix);
    if (!buckets.has(material)) buckets.set(material, []);
    buckets.get(material).push(geometry);
  };
  const rounded = (name, size, material, position, rotation = [0, 0, 0], radius = .025) =>
    part(name, new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(value => value * .45))), material, position, rotation);
  const box = (name, size, material, position, rotation = [0, 0, 0]) => part(name, new THREE.BoxGeometry(...size), material, position, rotation);
  const sphere = (name, size, material, position) => part(name, new THREE.SphereGeometry(1, 16, 12), material, position, [0, 0, 0], size);
  const rod = (name, a, b, radius, material, radiusTop = radius, sides = 8) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(radiusTop, radius, direction.length(), sides, 1);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()));
    geometry.translate(...start.add(end).multiplyScalar(.5).toArray());
    part(name, geometry, material);
  };
  const bandedArm = (name, from, to, radius) => {
    rod(name, from, to, radius, 'jersey', radius * .9, 12);
    rod(`${name}-stripe`, lerp(from, to, .73), lerp(from, to, .83), radius + .004, 'trim', radius + .004, 12);
    rod(`${name}-piping`, lerp(from, to, .70), lerp(from, to, .73), radius + .006, 'cream', radius + .006, 12);
  };

  // Weight is evenly carried by two skates. Modest knee bend reads as ready,
  // not a stride, lunge, shot animation or diving-save silhouette.
  for (const side of [-1, 1]) {
    const stance = goalie ? .255 : .185;
    const foot = [side * stance, .16, .015], knee = [side * stance, .47, -.075], hip = [side * .15, .83, .015];
    rod('shin-sock', foot, knee, .088, goalie ? 'pants' : 'jersey', .105, 12);
    if (!goalie) {
      rod('sock-stripe', lerp(foot, knee, .36), lerp(foot, knee, .58), .100, 'trim', .104, 12);
      rod('sock-piping', lerp(foot, knee, .29), lerp(foot, knee, .35), .101, 'cream', .103, 12);
    }
    rod('padded-short-leg', knee, hip, .125, 'pants', .16, 12);
    rounded('knee-cap', [.20, .14, .115], 'pants', [knee[0], knee[1], knee[2] - .045]);
    rounded('shorts-side-panel', [.06, .26, .20], 'jersey', [side * .265, .73, .015], [0, 0, side * .08]);
    rounded('shorts-side-stripe', [.015, .22, .205], 'trim', [side * .296, .73, .015], [0, 0, side * .08], .005);
    // Boot, toe cap, heel, laced tongue, runner holders and steel are separate
    // surfaces but will share one mesh per material after construction.
    rounded('skate-boot', [.155, .18, .30], 'carbon', [foot[0], .17, -.015], [.04, side * -.055, 0], .035);
    rounded('skate-toe', [.157, .10, .135], 'inset', [foot[0], .145, -.165], [0, side * -.055, 0], .034);
    rounded('skate-tongue', [.105, .16, .037], 'pants', [foot[0], .22, -.158], [-.28, 0, 0], .014);
    for (let lace = 0; lace < 4; lace++) box('skate-laces', [.09, .011, .009], 'cream', [foot[0], .173 + lace * .027, -.184 + lace * .005]);
    rounded('skate-holder', [.038, .050, .265], 'cream', [foot[0], .071, -.024], [0, side * -.055, 0], .014);
    for (const z of [-.11, .075]) rounded('skate-holder-strut', [.052, .035, .035], 'carbon', [foot[0], .1, z], [0, 0, 0], .008);
    rounded('skate-steel', [.015, .028, .325], 'metal', [foot[0], .029, -.035], [0, side * -.055, 0], .006);
    if (goalie) {
      rounded('goalie-pad', [.285, .66, .205], 'cream', [foot[0], .42, -.137], [-.09, 0, side * -.035], .034);
      rounded('goalie-pad-edge', [.040, .61, .218], 'jersey', [foot[0] + side * .122, .425, -.143], [-.09, 0, side * -.035], .014);
      rounded('goalie-pad-stripe', [.042, .56, .009], 'trim', [foot[0] - side * .06, .425, -.249], [-.09, 0, side * -.035], .003);
      for (let channel = 0; channel < 5; channel++) rounded('goalie-pad-channels', [.228, .013, .02], 'leather', [foot[0], .18 + channel * .092, -.25], [-.09, 0, 0], .004);
      rounded('goalie-knee-roll', [.26, .09, .045], 'cream', [foot[0], .52, -.265], [-.12, 0, 0], .022);
    }
  }
  rounded('hip-padding', [.46, .25, .335], 'pants', [0, .845, .02], [0, 0, 0], .07);
  const width = goalie ? 1.1 : 1;
  const levels = [
    [.955, .99, .49, .495, .34, .343, .005, .003, 'cream'],
    [.99, 1.067, .495, .505, .343, .35, .003, 0, 'trim'],
    [1.067, 1.265, .505, .62, .35, .345, 0, -.032, 'jersey'],
    [1.265, 1.325, .62, .51, .345, .31, -.032, -.045, 'jersey'],
  ];
  for (const [a, b, wa, wb, da, db, la, lb, material] of levels) part('tailored-jersey', jerseySection(a, b, wa * width, wb * width, da, db, la, lb), material);
  // The yoke is broad and fully exposed from rink cameras. Keeping it in the
  // jersey colour makes the team readable at child/phone player sizes; contrast
  // stays in the small collar, crest, cuffs and narrow sleeve/crown stripes.
  rounded('shoulder-yoke', [.22, .070, .30], 'jersey', [-.225 * width, 1.305, -.042], [0, 0, -.1], .025);
  rounded('shoulder-yoke', [.22, .070, .30], 'jersey', [.225 * width, 1.305, -.042], [0, 0, .1], .025);
  rod('neck', [0, 1.30, -.055], [0, 1.43, -.07], .068, 'skin', .071, 12);
  part('jersey-collar', new THREE.TorusGeometry(.083, .018, 6, 20), 'trim', [0, 1.337, -.052], [Math.PI / 2, 0, 0]);
  rounded('chest-crest-border', [.117, .135, .008], 'cream', [0, 1.194, -.194], [0, 0, 0], .027);
  rounded('chest-crest', [.096, .11, .01], 'trim', [0, 1.194, -.201], [0, 0, 0], .023);
  box('crest-bar', [.057, .018, .01], 'jersey', [0, 1.2, -.208]);

  const hands = goalie ? [[-.43, 1.04, -.30], [.31, .95, -.31]] : [[-.225, 1.05, -.369], [.022, .755, -.516]];
  for (const [index, side] of [-1, 1].entries()) {
    const shoulder = [side * .28 * width, 1.267, -.042], elbow = [side * (goalie ? .40 : .38), 1.035, -.14], hand = hands[index];
    bandedArm('upper-sleeve', shoulder, elbow, goalie ? .126 : .107);
    bandedArm('forearm-sleeve', elbow, hand, goalie ? .108 : .087);
    if (!goalie) {
      rounded('hockey-glove', [.15, .13, .16], 'pants', hand, [-.25, 0, side * .16], .035);
      rounded('glove-cuff', [.16, .045, .13], 'trim', [hand[0], hand[1] + .062, hand[2] + .015], [-.25, 0, side * .16], .012);
      for (let finger = 0; finger < 3; finger++) rounded('glove-finger-roll', [.03, .024, .11], 'jersey', [hand[0] - .045 + finger * .043, hand[1] + .035, hand[2] - .025], [-.25, 0, 0], .008);
    } else if (side === 1) {
      rounded('goalie-blocker', [.255, .33, .095], 'cream', [hand[0] + .022, hand[1] - .008, hand[2] - .06], [.12, -.16, -.08], .035);
      rounded('blocker-face-stripe', [.055, .29, .015], 'jersey', [hand[0] + .08, hand[1] - .007, hand[2] - .116], [.12, -.16, -.08], .008);
      rounded('blocker-face-trim', [.035, .28, .014], 'trim', [hand[0] + .015, hand[1] - .007, hand[2] - .127], [.12, -.16, -.08], .008);
    } else {
      sphere('catching-glove', [.185, .20, .105], 'cream', [hand[0], hand[1], hand[2] - .04]);
      sphere('catching-pocket', [.127, .145, .026], 'leather', [hand[0], hand[1], hand[2] - .135]);
      part('catching-glove-edge', new THREE.TorusGeometry(.145, .027, 6, 20), 'trim', [hand[0], hand[1], hand[2] - .12], [0, 0, -.2], [1, 1.14, 1]);
      for (let thread = -1; thread <= 1; thread++) {
        rod('catching-web', [hand[0] - .09, hand[1] + thread * .045, hand[2] - .163], [hand[0] + .09, hand[1] + thread * .045, hand[2] - .163], .006, 'pants', .006, 6);
        rod('catching-web', [hand[0] + thread * .045, hand[1] - .10, hand[2] - .163], [hand[0] + thread * .045, hand[1] + .10, hand[2] - .163], .006, 'pants', .006, 6);
      }
    }
  }

  // Light face remains visible inside a genuine open-bar youth cage.
  sphere('face', [.137, .168, .124], 'skin', [0, 1.503, -.069]);
  for (const side of [-1, 1]) {
    sphere('eye', [.012, .009, .006], 'inset', [side * .048, 1.545, -.188]);
    rounded('helmet-ear-guard', [.047, .165, .13], 'helmet', [side * .162, 1.497, -.034], [0, 0, side * -.06], .018);
    sphere('ear-vent', [.008, .017, .025], 'inset', [side * .187, 1.515, -.058]);
    rod('chin-strap', [side * .167, 1.455, -.015], [side * .072, 1.352, -.135], .011, 'inset', .011, 6);
  }
  sphere('nose', [.022, .026, .022], 'skin', [0, 1.504, -.193]);
  part('helmet-shell', new THREE.SphereGeometry(.184, 24, 14, 0, Math.PI * 2, 0, Math.PI * .44), 'helmet', [0, 1.547, -.044], [0, 0, 0], [1.04, .99, 1.12]);
  rounded('helmet-back', [.29, .15, .085], 'helmet', [0, 1.524, .092], [0, 0, 0], .032);
  rounded('helmet-brow', [.337, .040, .059], 'helmet', [0, 1.581, -.213], [.04, 0, 0], .015);
  // A slim curved crown stripe, not a second balloon laid over the helmet.
  part('helmet-crown-stripe', new THREE.SphereGeometry(.186, 12, 12, -Math.PI / 2 - .075, .15, 0, Math.PI * .44), 'trim', [0, 1.547, -.044], [0, 0, 0], [1.04, .99, 1.12]);
  for (const side of [-1, 1]) for (let vent = 0; vent < 3; vent++) {
    rounded('helmet-vent', [.016, .008, .051], 'inset', [side * (.051 + vent * .021), 1.721 - vent * .010, -.071], [-.12, 0, side * -.15], .005);
  }
  if (goalie) for (const side of [-1, 1]) {
    rounded('goalie-mask-cheek', [.067, .185, .07], 'helmet', [side * .145, 1.473, -.185], [0, side * .2, side * -.13], .021);
    rounded('goalie-mask-trim', [.02, .145, .074], 'trim', [side * .167, 1.465, -.19], [0, side * .2, side * -.13], .007);
  }
  for (let row = 0; row < 4; row++) {
    const y = 1.574 - row * .059, span = .176 - row * .009;
    const points = [[-span, y, -.165], [-span * .56, y, -.241], [span * .56, y, -.241], [span, y, -.165]];
    for (let index = 0; index < points.length - 1; index++) rod('face-cage-horizontal', points[index], points[index + 1], .0062, 'metal', .0062, 6);
  }
  for (const x of [-.14, -.05, .05, .14]) rod('face-cage-vertical', [x, 1.598, -.225], [x * .86, 1.383, -.229], .0058, 'metal', .0058, 6);
  rounded('chin-cup', [.115, .036, .045], 'cream', [0, 1.373, -.185], [.10, 0, 0], .015);

  if (showStick) {
    const high = goalie ? [.31, 1.04, -.30] : [-.27, 1.11, -.34], heel = [.56, .075, -.80];
    rod('stick-shaft', heel, high, .014, 'carbon', .014, 6);
    rod('stick-top-tape', lerp(heel, high, .89), lerp(heel, high, 1.02), .020, 'cream', .020, 6);
    if (goalie) {
      const start = lerp(heel, high, .04), end = lerp(heel, high, .46);
      const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
      const paddle = new RoundedBoxGeometry(.09, direction.length(), .036, 2, .012);
      paddle.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()));
      paddle.translate(...lerp(start, end, .5)); part('stick-goalie-paddle', paddle, 'cream');
    }
    part('stick-flat-hooked-blade', bladeGeometry(), 'carbon');
    for (let tape = 0; tape < 3; tape++) rounded('stick-blade-tape', [.034, .077, .024], 'cream', [.688 + tape * .023, .072, -.960 - tape * .035], [0, -.6, 0], .004);
  }

  for (const [material, geometries] of buckets) {
    const geometry = mergeGeometries(geometries, false);
    for (const source of geometries) source.dispose();
    if (!geometry) throw new Error(`Could not assemble player equipment: ${material}`);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere(); resources.push(geometry);
    const mesh = new THREE.Mesh(geometry, materials[material]); mesh.name = `equipment-${material}`;
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }
  let numberTexture = null, numberMaterial = null;
  if (typeof document !== 'undefined' && number !== '' && number !== null) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#F5EFE0'; context.font = '900 90px Arial'; context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillText(String(number).replace(/[^0-9]/g, '').slice(0, 2), 64, 69);
      numberTexture = new THREE.CanvasTexture(canvas); numberTexture.colorSpace = THREE.SRGBColorSpace;
      numberMaterial = new THREE.MeshBasicMaterial({ map: numberTexture, transparent: true, depthWrite: false });
      const geometry = new THREE.PlaneGeometry(.265, .265); resources.push(geometry);
      const numberMesh = new THREE.Mesh(geometry, numberMaterial); numberMesh.name = 'jersey-number'; numberMesh.position.set(0, 1.18, .172); group.add(numberMesh);
    }
  }
  group.userData = { pose: 'balanced-ready', parts: [...partNames], palette: { jersey: jerseyColour, helmet: jerseyColour, trim: trimColour },
    carryContact: showStick ? { x: CARRY_OFFSET.lateral, y: .052, z: -CARRY_OFFSET.forward } : null };
  let disposed = false;
  return { group,
    // The latest owner direction requests a generalized stance. Translation and
    // facing still animate through callers; limb animation is deliberately held.
    update() {},
    dispose() {
      if (disposed) return; disposed = true;
      for (const geometry of resources) geometry.dispose();
      for (const material of Object.values(materials)) material.dispose();
      numberMaterial?.dispose(); numberTexture?.dispose();
    },
  };
}
