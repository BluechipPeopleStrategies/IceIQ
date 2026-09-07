from pathlib import Path
p=Path('src/one-on-one/hockeyPlayerRig.js')
s=p.read_text()
s=s.replace("import { CARRY_OFFSET }", "import { characterProportions, resolveCharacterStage } from '../visuals/characterPresentation.js';\nimport { CARRY_OFFSET }")
s=s.replace('showStick = true, accent','showStick = true, ageBand, stage')
s=s.replace("const trimColour = accent || (jerseyColour === GOLD ? NAVY : GOLD);", "const trimColour = jerseyColour;\n  const proportions = characterProportions(ageBand, stage);\n  const bodyY = y => y <= .3 ? y : .3 + (y - .3) * proportions.bodyScale;\n  const mapPoint = (point, head = false) => head ? [point[0] * proportions.headScale, bodyY(1.35) + (point[1] - 1.35) * proportions.headScale, -.052 + (point[2] + .052) * proportions.headScale] : [point[0] * proportions.widthScale, bodyY(point[1]), point[2]];\n  const bones = Array.from({length: 12}, (_, i) => { const bone = new THREE.Bone(); bone.name = ['root','left-thigh','left-shin','left-skate','right-thigh','right-shin','right-skate','left-upper-arm','left-forearm','right-upper-arm','right-forearm','head'][i]; return bone; });\n  const skeleton = new THREE.Skeleton(bones);\n  let activeBone = 0;")
s=s.replace('geometry.applyMatrix4(matrix);', '''geometry.applyMatrix4(matrix);
    const vertices = geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const point = [vertices.getX(i), vertices.getY(i), vertices.getZ(i)];
      const mapped = name.startsWith('stick-') ? [point[0], name.includes('blade') ? point[1] : .075 + (point[1] - .075) * (bodyY(1.11) - .075) / (1.11 - .075), point[2]] : mapPoint(point, activeBone === 11);
      vertices.setXYZ(i, ...mapped);
    }
    geometry.computeVertexNormals();
    const indices = new Uint16Array(vertices.count * 4), weights = new Float32Array(vertices.count * 4);
    for (let i = 0; i < vertices.count; i++) { indices[i * 4] = activeBone; weights[i * 4] = 1; }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));''')
s=s.replace("rod(`${name}-piping`, lerp(from, to, .70), lerp(from, to, .73), radius + .006, 'cream'", "rod(`${name}-piping`, lerp(from, to, .70), lerp(from, to, .73), radius + .006, 'jersey'")
s=s.replace("rod('sock-piping', lerp(foot, knee, .29), lerp(foot, knee, .35), .101, 'cream'", "rod('sock-piping', lerp(foot, knee, .29), lerp(foot, knee, .35), .101, 'jersey'")
s=s.replace("rod('shin-sock'", "activeBone = side === -1 ? 2 : 5;\n    rod('shin-sock'")
s=s.replace("rod('padded-short-leg'", "activeBone = side === -1 ? 1 : 4;\n    rod('padded-short-leg'")
s=s.replace("rounded('skate-boot'", "activeBone = side === -1 ? 3 : 6;\n    rounded('skate-boot'")
s=s.replace("if (goalie) {\n      rounded('goalie-pad'", "if (goalie) {\n      activeBone = side === -1 ? 2 : 5;\n      rounded('goalie-pad'")
s=s.replace("rounded('hip-padding'", "activeBone = 0;\n  rounded('hip-padding'")
s=s.replace(".003, 'cream']", ".003, 'jersey']")
s=s.replace("rounded('chest-crest-border', [.117, .135, .008], 'cream'", "rounded('chest-crest-border', [.117, .135, .008], 'jersey'")
s=s.replace("bandedArm('upper-sleeve'", "activeBone = side === -1 ? 7 : 9;\n    bandedArm('upper-sleeve'")
s=s.replace("bandedArm('forearm-sleeve'", "activeBone = side === -1 ? 8 : 10;\n    bandedArm('forearm-sleeve'")
s=s.replace("if (!goalie) {\n      rounded('hockey-glove'", "activeBone = 0;\n    if (!goalie) {\n      rounded('hockey-glove'")
s=s.replace("// Light face remains", "activeBone = 11;\n  // Light face remains")
s=s.replace("[.012, .009, .006], 'inset'", "[.012 * proportions.eyeScale, .009 * proportions.eyeScale, .006], 'inset'")
s=s.replace("  if (showStick) {", "  if (proportions.headScale > 1) {\n    const smile = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.045, 1.451, -.185), new THREE.Vector3(0, 1.423, -.197), new THREE.Vector3(.045, 1.451, -.185));\n    part('friendly-smile', new THREE.TubeGeometry(smile, 12, .003, 5, false), 'leather');\n  }\n  activeBone = 0;\n  if (showStick) {")
s=s.replace('new THREE.Mesh(geometry, materials[material])', 'new THREE.SkinnedMesh(geometry, materials[material])')
s=s.replace('mesh.castShadow = true;', 'mesh.bind(skeleton, new THREE.Matrix4()); mesh.frustumCulled = false;\n    mesh.castShadow = true;')
s=s.replace("  let numberTexture", "  for (const bone of bones) group.add(bone);\n  let numberTexture")
s=s.replace("numberMesh.position.set(0, 1.18, .172)", "numberMesh.position.set(0, bodyY(1.18), .172)")
s=s.replace("group.userData = { pose:", "group.userData = { stage: Object.hasOwn({young:1,youth:1,older:1}, stage) ? stage : resolveCharacterStage(ageBand), proportions: {...proportions}, pose:")
s=s.replace("  let disposed = false;", """  // Rigid weighted equipment segments preserve their lengths. In-place IK moves
  // the knees between hip and skate anchors; the scenario alone moves the root.
  const v = a => new THREE.Vector3(...a);
  const restLegs = [-1, 1].map(side => ({
    hip: v(mapPoint([side * .15, .83, .015])), knee: v(mapPoint([side * (goalie ? .255 : .185), .47, -.075])),
    ankle: v(mapPoint([side * (goalie ? .255 : .185), .16, .015])),
  }));
  const finite = (value, min, max) => Number.isFinite(value) ? THREE.MathUtils.clamp(value, min, max) : 0;
  const rotation = new THREE.Quaternion(), translation = new THREE.Vector3(), unit = new THREE.Vector3(1,1,1);
  function segment(bone, start, end, nextStart, nextEnd) {
    rotation.setFromUnitVectors(end.clone().sub(start).normalize(), nextEnd.clone().sub(nextStart).normalize());
    translation.copy(start).applyQuaternion(rotation).negate().add(nextStart);
    bone.position.copy(translation); bone.quaternion.copy(rotation); bone.scale.set(1,1,1); bone.updateMatrix();
  }
  function applyPose(pose = {}) {
    for (const bone of bones) { bone.position.set(0,0,0); bone.quaternion.identity(); bone.scale.set(1,1,1); bone.updateMatrix(); }
    const stride = goalie ? 0 : finite(pose.stride,0,1);
    const phase = finite(pose.phase, -1e6, 1e6), lean = finite(pose.lean,-1,1), look = finite(pose.lookYaw,-Math.PI,Math.PI);
    const active = ['forward','backward','lateral'].includes(pose.mode) && stride > 0;
    if (active) restLegs.forEach((rest, index) => {
      const wave = Math.sin(phase + index * Math.PI), side = index ? 1 : -1;
      const ankle = rest.ankle.clone();
      // Outward power push and lifted recovery. Backward uses a short C-cut,
      // not an inverted forward-running cycle. One skate stays planted.
      ankle.x += side * Math.max(0,wave) * stride * .14;
      ankle.z += (pose.backward ? -.065 : .065) * wave * stride;
      ankle.y += Math.max(0,-wave) * stride * .045;
      const hip = rest.hip, axis = ankle.clone().sub(hip), distance = axis.length(); axis.normalize();
      const upper = rest.hip.distanceTo(rest.knee), lower = rest.knee.distanceTo(rest.ankle);
      const along = (upper*upper - lower*lower + distance*distance)/(2*distance);
      const bend = Math.sqrt(Math.max(0,upper*upper-along*along));
      const forward = new THREE.Vector3(0,0,-1).addScaledVector(axis, axis.z).normalize();
      const knee = hip.clone().addScaledVector(axis,along).addScaledVector(forward,bend);
      segment(bones[1+index*3],rest.hip,rest.knee,hip,knee);
      segment(bones[2+index*3],rest.knee,rest.ankle,knee,ankle);
      bones[3+index*3].position.copy(ankle).sub(rest.ankle); bones[3+index*3].updateMatrix();
    });
    // Head scanning is independent of body/world facing. Equipment and cage move
    // as one true 3D assembly, with no camera-facing geometry or mirrored view.
    const pivot = v(mapPoint([0,1.35,-.052]));
    rotation.setFromEuler(new THREE.Euler(lean*.045,look, -finite(pose.turn,-1,1)*.045));
    bones[11].quaternion.copy(rotation); bones[11].position.copy(pivot).sub(pivot.clone().applyQuaternion(rotation)); bones[11].updateMatrix();
    group.updateMatrixWorld(true); skeleton.update();
  }
  let disposed = false;""")
s=s.replace('return { group,', 'return { group, applyPose,')
s=s.replace('if (disposed) return; disposed = true;', 'if (disposed) return; disposed = true; skeleton.dispose();')
p.write_text(s)
