SRCS		= core.ts mainView.ts featureFinder.ts focusView.ts histogram.ts cytoband.ts adjacency.ts isf.ts bedGraph.ts gff3.ts modelView.ts
INTERFACES	= interfaces.d.ts powerfocus.d.ts
OBJS		= ${SRCS:.ts=.js}
ITFDOC		= ${SRCS:.ts=.itf.js}
MAPS		= ${SRCS:.ts=.js.map}

all: genome.min.js

clean:
	rm -rf ${OBJS} ${MAPS} genome.min.js genome.min.js.map all_interfaces.js doc

%.js: %.ts
	tsc --sourcemap $<

genome.js.map: ${OBJS}
	mapcat ${MAPS} -m $@

doc: doc/index.html

all_interfaces.js: ${SRCS} ${INTERFACES}
	python commentblocks.py ${SRCS} ${INTERFACES}

doc/index.html: ${OBJS} all_interfaces.js
	jsdoc -d ./doc/ ${OBJS} all_interfaces.js

#uglifyjs powerfocus.js ${OBJS} --in-source-map genome.js.map --source-map genome.min.js.map -c -m -o $@
genome.min.js: powerfocus.js ${OBJS}
	uglifyjs powerfocus.js ${OBJS} --source-map genome.min.js.map -c -m -o $@
