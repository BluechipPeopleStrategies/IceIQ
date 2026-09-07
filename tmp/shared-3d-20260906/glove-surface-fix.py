from pathlib import Path
p=Path('src/one-on-one/hockeyPlayerRig.js');s=p.read_text();old="for (let finger = 0; finger < 3; finger++) rounded('glove-finger-roll', [.03, .024, .11], 'jersey', [hand[0] - .045 + finger * .043, hand[1] + .035, hand[2] - .025], [-.25, 0, 0], .008);";new="""// External segmented knuckle protection: the shell top is handY+.065.
      // The earlier +.035 rolls were buried inside the shell and invisible.
      for (let finger = 0; finger < 3; finger++) rounded('glove-finger-roll', [.038, .035, .105], 'jersey', [hand[0] - .045 + finger * .045, hand[1] + .075, hand[2] - .025], [-.25, 0, 0], .012);
      rounded('glove-thumb', [.06, .075, .095], 'pants', [hand[0] - side*.073, hand[1]-.012, hand[2]-.029], [.25, side*.20, side*.25], .024);
      rounded('glove-thumb-padding', [.043, .026, .07], 'jersey', [hand[0] - side*.075, hand[1]+.023, hand[2]-.035], [.25, side*.20, side*.25], .012);""";assert old in s;s=s.replace(old,new);p.write_text(s)
