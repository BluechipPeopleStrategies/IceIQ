from pathlib import Path
p=Path('src/one-on-one/hockeyPlayerRig.js');s=p.read_text().replace('stick-|forearm-sleeve|hockey-glove','stick-|hockey-glove');p.write_text(s)
p=Path('src/visuals/characterPresentation.test.mjs');s=p.read_text().replace("['face','helmet-shell','tailored-jersey','skate-boot']", "['face','helmet-shell','tailored-jersey','skate-boot','forearm-sleeve']");p.write_text(s)
p=Path('src/visuals/FirstPersonEquipment.jsx');s=p.read_text().replace("* the gloves/stick; no billboard", "* the gloves/stick. Camera-intersecting sleeves are visibility-masked;\n * no billboard");p.write_text(s)
