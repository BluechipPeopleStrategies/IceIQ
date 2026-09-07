from pathlib import Path
p=Path('src/one-on-one/hockeyPlayerRig.js');s=p.read_text();s=s.replace('''    const original = geometry;
    if (geometry.index) { geometry = geometry.toNonIndexed(); original.dispose(); }
''','');s=s.replace("    const vertices = geometry.getAttribute('position');", "    let vertices = geometry.getAttribute('position');\n    const normals = geometry.getAttribute('normal');")
s=s.replace('''      vertices.setXYZ(i, ...mapped);
    }
    geometry.computeVertexNormals();''','''      vertices.setXYZ(i, ...mapped);
      // RoundedBoxGeometry already supplies non-indexed smooth normals. Preserve
      // those and apply the age deformation's inverse-transpose scale.
      if (!geometry.index && normals) {
        const stick = name.startsWith('stick-'), head = activeBone === 11;
        const sx = stick ? 1 : head ? proportions.headScale : proportions.widthScale;
        const sy = stick ? (name.includes('blade') ? 1 : (bodyY(1.11)-.075)/(1.11-.075)) : head ? proportions.headScale : point[1] <= .3 ? 1 : proportions.bodyScale;
        const sz = head ? proportions.headScale : 1;
        const normal = new THREE.Vector3(normals.getX(i)/sx,normals.getY(i)/sy,normals.getZ(i)/sz).normalize();
        normals.setXYZ(i,normal.x,normal.y,normal.z);
      }
    }
    // Compute while indexed so adjacent sphere/ring faces share their normals.
    // Deindex only afterward for material merging; flat boxes retain split verts.
    if (geometry.index) {
      geometry.computeVertexNormals();
      const indexed = geometry; geometry = indexed.toNonIndexed(); indexed.dispose();
      vertices = geometry.getAttribute('position');
    }''')
p.write_text(s)
