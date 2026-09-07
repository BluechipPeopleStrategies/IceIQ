from pathlib import Path
p=Path('src/one-on-one/hockeyPlayerRig.js');s=p.read_text()
s=s.replace('length: 12','length: 13').replace("'right-forearm','head'", "'right-forearm','head','torso'")
s=s.replace("  const width = goalie ? 1.1 : 1;", "  activeBone = 12;\n  const width = goalie ? 1.1 : 1;")
s=s.replace("const stride = goalie ? 0", "const stride = goalie ? 0")
s=s.replace("ankle.x += side * Math.max(0,wave) * stride * .14;\n      ankle.z += (pose.backward ? -.065 : .065) * wave * stride;\n      ankle.y += Math.max(0,-wave) * stride * .045;", """if (pose.mode === 'lateral') {
        ankle.x += finite(pose.lateral,-1,1) * wave * stride * .10;
        ankle.y += Math.max(0,-wave) * stride * .022;
      } else if (pose.backward || pose.mode === 'backward') {
        ankle.x += side * (1 - Math.cos(phase + index * Math.PI)) * stride * .06;
        ankle.z += Math.sin(phase + index * Math.PI) * stride * .045;
      } else {
        ankle.x += side * Math.max(0,wave) * stride * .14;
        ankle.z += .065 * wave * stride;
        ankle.y += Math.max(0,-wave) * stride * .045;
      }""")
s=s.replace("    // Head scanning is independent", """    const torsoPivot = v(mapPoint([0,.94,0]));
    const torsoRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-lean*.10,finite(pose.turn,-1,1)*.10,-finite(pose.turn,-1,1)*.075));
    bones[12].quaternion.copy(torsoRotation); bones[12].position.copy(torsoPivot).sub(torsoPivot.clone().applyQuaternion(torsoRotation)); bones[12].updateMatrix();
    const torsoPoint = point => point.clone().sub(torsoPivot).applyQuaternion(torsoRotation).add(torsoPivot);
    // Both gloves and the complete stick remain at their authoritative sockets.
    // Upper/forearm rigid segments solve back from those hands to the turning torso.
    for (const [index,side] of [-1,1].entries()) {
      const shoulder = v(mapPoint([side*.28*width,1.267,-.042]));
      const elbow = v(mapPoint([side*(goalie?.40:.38),1.035,-.14]));
      const hand = v(mapPoint(hands[index]));
      const nextShoulder = torsoPoint(shoulder);
      const axis = hand.clone().sub(nextShoulder), distance=axis.length(); axis.normalize();
      const upper=shoulder.distanceTo(elbow), lower=elbow.distanceTo(hand);
      const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
      const sideBend=elbow.clone().sub(shoulder).addScaledVector(axis,-elbow.clone().sub(shoulder).dot(axis)).normalize();
      const nextElbow=nextShoulder.clone().addScaledVector(axis,along).addScaledVector(sideBend,Math.sqrt(Math.max(0,upper*upper-along*along)));
      if (lean !== 0 || finite(pose.turn,-1,1) !== 0) {
        segment(bones[7+index*2],shoulder,elbow,nextShoulder,nextElbow);
        segment(bones[8+index*2],elbow,hand,nextElbow,hand);
      }
    }
    // Head scanning is independent""")
s=s.replace("bones[11].position.copy(pivot).sub(pivot.clone().applyQuaternion(rotation));", "bones[11].position.copy(torsoPoint(pivot)).sub(pivot.clone().applyQuaternion(rotation));")
s=s.replace("// The latest owner direction requests a generalized stance. Translation and\n    // facing still animate through callers; limb animation is deliberately held.", "// Legacy update retains its static ready stance. Explicit pose data enters\n    // through applyPose; the factory never infers puck contacts or root motion.")
p.write_text(s)
p=Path('src/visuals/characterPresentation.test.mjs');s=p.read_text().replace('x:.72','x:.7');p.write_text(s)
