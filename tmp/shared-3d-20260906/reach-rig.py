from pathlib import Path
p=Path('src/one-on-one/hockeyPlayerRig.js');s=p.read_text();old='''      const hip = rest.hip, axis = ankle.clone().sub(hip), distance = axis.length(); axis.normalize();
      const upper = rest.hip.distanceTo(rest.knee), lower = rest.knee.distanceTo(rest.ankle);''';new='''      const hip = rest.hip;
      const upper = rest.hip.distanceTo(rest.knee), lower = rest.knee.distanceTo(rest.ankle);
      // Preserve the contact height while limiting the push to this stage's
      // actual limb reach. A short young leg must not separate at the knee.
      const reach = upper + lower - .001;
      const horizontal = Math.hypot(ankle.x-hip.x,ankle.z-hip.z);
      const maxHorizontal = Math.sqrt(Math.max(0,reach*reach-(ankle.y-hip.y)**2));
      if (horizontal > maxHorizontal && horizontal > 0) {
        ankle.x=hip.x+(ankle.x-hip.x)*maxHorizontal/horizontal;
        ankle.z=hip.z+(ankle.z-hip.z)*maxHorizontal/horizontal;
      }
      const axis = ankle.clone().sub(hip), distance = axis.length(); axis.normalize();''';assert old in s;s=s.replace(old,new);p.write_text(s)
