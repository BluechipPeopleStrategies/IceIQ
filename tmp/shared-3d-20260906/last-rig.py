from pathlib import Path
p=Path('src/one-on-one/hockeyPlayerRig.js');s=p.read_text().replace('side * -.055','0').replace('group.add(numberMesh);','bones[12].add(numberMesh);').replace('rotation = new THREE.Quaternion(), translation = new THREE.Vector3(), unit = new THREE.Vector3(1,1,1);','rotation = new THREE.Quaternion(), translation = new THREE.Vector3();');p.write_text(s)
