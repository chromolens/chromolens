///<reference path="focusView.ts" />

//800 chromosome bands mapped to golden path by Terry Furey using fish data from BAC Resource Consortium

//Column 1:"chrom"
    //string    Chromosome
//Column 2:"chromStart"
    //integer   Start position in chromosome sequence
//Column 3:"chromEnd"
    //integer   End position in chromosome sequence
//Column 4:"name"
    //string    Name of cytonametic band
//Column 5:"gieStain"
    //string    Giemsa stain results. Recognized stain values: gneg, gpos50, gpos75, gpos25, gpos100, acen, gvar, stalk (I added gpos33 gpos66 wich could be find sometimes)

/**
 * Handling Cytoband files.
 * @namespace Cytoband
 */
module Cytoband {
// chrom chromStart chromEnd name gieStain

    enum BandType {
        band = 1,
        centromer_start = 2,
        centromer_end = 4,
        stalk = 8
    }

    /**
     * Features of Cytoband data.
     * @class Cytoband.CytobandFeature
     * @extends Model.NamedFeature
     */
    class CytobandFeature implements Model.NamedFeature {
        start: number;
        end: number;
        name: string;
        intensity: number;
        type: BandType;
        constructor(start:number, end:number, name: string, intensity:number, type: BandType) {
            this.start = start;
            this.end = end;
            this.name = name;
            this.intensity = intensity;
            this.type = type;
        }
        public width():number {
            return this.end - this.start;
        }
    }

    /**
     * A Cytoband chromosome
     * @class Cytoband.CytobandChromosomeModel
     * @extends Model.AbstractChromosomeModel
     */
    class CytobandChromosomeModel implements Model.AbstractChromosomeModel {
        public name: string;
        public values: CytobandFeature[] = [];
        public values_by_name = d3.map();
        public start: number = 0;
        public end: number = 1;

        constructor (name:string) {
            this.name = name;
        }

        public getFeatureNames(): string[] {
            var names: string[] = [];
            this.values.forEach(
                function(val:CytobandFeature) {
                    names.push(val.name);
                });
            return names;
        }

        public getNamedFeature(name:string): Model.NamedFeature {
            return this.values_by_name.get(name);
        }

        public getFeatures(): CytobandFeature[] {
            return this.values;
        }

        public addValue(v:CytobandFeature) {
            this.values.push(v);
            this.values_by_name.set(v.name, v);
        }

        public optimize():void {
            this.values.sort(Model.compareFeatures);
            if (this.values.length > 0) {
                this.start = this.values[0].start;
                this.end = this.values[this.values.length-1].end;
            }
        }
    }

    /**
     * Iterator for the cytoband model
     * @class Cytoband.CytobandIterator
     * @extends Model.AbstractIterator
     */
    class CytobandIterator extends Model.AbstractIterator<any[]> {
        initialValue():any[] {
            return [0, 0, "None"];
        }
        addValue(v:CytobandFeature) {
            this.accumulator[0] = Math.max(this.accumulator[0], v.intensity);
            this.accumulator[1] = this.accumulator[1] | v.type;
            this.accumulator[2] = v.name;
        }
    }


    /**
     * A Cytoband chromosome set
     * @class Cytoband.CytobandChromosomeSet
     * @extends Model.ChromosomeSet
     */
    class CytobandChromosomeSet implements Model.ChromosomeSet {
        public id: string;
        public type: string = "Cytoband";
        private chromosomes: D3.Map = d3.map();
        constructor(id:string, d: D3.Map) {
            this.chromosomes = d;
        }
        public getChromosome(name:string): CytobandChromosomeModel {
            return this.chromosomes.get(name);
        }
        public getChromosomeNames(): string[] {
            return this.chromosomes.keys();
        }
    }

    /**
     * The parser for Cytoband data
     * @class Cytoband.CytobandParser
     * @extends Parsers.Parser
     */
    class CytobandParser implements Parsers.Parser {
        private time:number;

        public parse_str(lines:Parsers.LineReader, id: string, desired_chroname?:string) : Model.ChromosomeSet {
            this.time = (new Date()).getTime();
            var chromosomes: D3.Map = d3.map();
            var chro:CytobandChromosomeModel;
            var centromer_first = 0;
            var line:string;
            while ((line = lines.next()) !== null) {
                var components: string[] = line.split('\t');
                assert(components.length == 5);
                var chroname = components[0];
                chro = chromosomes.get(chroname);
                if (chro === undefined) {
                    chro = new CytobandChromosomeModel(chroname);
                    chromosomes.set(chroname, chro);
                }
                var start = parseInt(components[1]);
                var end = parseInt(components[2]);
                var name = components[3];
                var intensity = 0;
                var type:BandType;

                if (components[4] == "acen") {
                    if (centromer_first == 0) {
                        type = BandType.centromer_start;
                        centromer_first = 1;
                    } else {
                        type = BandType.centromer_end;
                        centromer_first = 0;
                    }
                } else if (components[4] == "stalk") {
                    type = BandType.stalk;
                } else {
                    type = BandType.band;
                    if (components[4] == "gneg") {
                    } else if (components[4] == "gpos25") {
                        intensity = 25;
                    } else if (components[4] == "gpos33") {
                        intensity = 33;
                    } else if (components[4] == "gpos50") {
                        intensity = 50;
                    } else if (components[4] == "gpos66") {
                        intensity = 66;
                    } else if (components[4] == "gpos75") {
                        intensity = 75;
                    } else if (components[4] == "gpos100") {
                        intensity = 100;
                    }
                }
                chro.addValue(new CytobandFeature(start, end, name, intensity, type));
            }
            chromosomes.forEach(function(key: string, chro: CytobandChromosomeModel) {
                chro.optimize();
            });
            return new CytobandChromosomeSet(id, chromosomes);
        }
    }
    Parsers.registry.register('cytoband', new CytobandParser());

    /**
     * A panel that displays cytoband data
     * @class Cytoband.CytobandPanel
     * @extends Views.BasePanel
     */
    class CytobandPanel extends Views.BasePanel {
        public chromosome : CytobandChromosomeModel;
        private canvas: D3.Selection;
        public iter: Model.ChromosomeIterator<any[]>;

        constructor(parent: Views.View, name:string, role:string, iter:Model.ChromosomeIterator<any[]>, args?) {
            super(parent, name, role, args);
            var ob = this.svg.append("foreignObject")
                .attr("width", this.width).attr("height", this.height);
            this.canvas = ob.append("xhtml:canvas")
                .attr("width", this.width).attr("height", this.height);
            this.iter = iter;
        }

        public getMinSize():number[] {
            return [600, 15];
        }

        public getMargin(): number[] {
            return [0, 10, 0, 10];
        }

        public setSize(w:number, h:number) {
            super.setSize(w, h);
            if (this.canvas !== undefined) {
                this.canvas.attr("width", w);
                this.canvas.attr("height", h);
                this.canvas.node().parentNode.attributes['width'].value = w;
                this.canvas.node().parentNode.attributes['height'].value = h;
            }
        }

        public setChromosome(chromosome: Model.AbstractChromosomeModel) {
            super.setChromosome(chromosome);
            this.iter.setChromosome(chromosome);
            this.scale.domain([chromosome.start, chromosome.end]);
            this.scale.exponent(1);
            this.scale.focus(chromosome.start);
            this.setScale(this.scale);
        }

        public setScale(newScale: powerfocusI, duration?:number) {
            var scaleInterpolator = newScale.scaleInterpolate()(this.scale);
            if (duration === undefined) {
                duration = 250;
            }
            super.setScale(newScale, duration);
            var width = this.width;
            var iter = this.iter;
            var canvas = <HTMLCanvasElement>this.canvas.node();
            this.canvas.transition().duration(duration).tween("canvas", function() {
                return function(t) { // interpolator
                    var ctx = canvas.getContext("2d");
                    var scale = scaleInterpolator(t);
                    var pos:number = 0;
                    iter.reset();
                    var canvasHeight = ctx.canvas.height;
                    ctx.clearRect(0, 0, ctx.canvas.width, canvasHeight);
                    var fontHeight = Math.floor(0.8*canvasHeight);
                    while (pos < width) {
                        var endChro:number = iter.nextBreak();
                        var end:number = Math.max(pos+1, Math.floor(scale(endChro)));
                        var endChro2 = scale.invert(end);
                        while (endChro2 > endChro && end > pos+1) {
                            // corner case...
                            end--;
                            endChro2 = scale.invert(end);
                        }
                        endChro = endChro2;
                        var band:any[] = iter.moveTo(endChro);
                        var intensity:number = band[0];
                        var band_type:BandType = band[1];
                        var bandName:string = band[2];
                        if (band_type & BandType.centromer_start) {
                            ctx.fillStyle = "red";
                            ctx.beginPath();
                            ctx.moveTo(pos, 0);
                            ctx.lineTo(end, canvasHeight/2);
                            ctx.lineTo(pos, canvasHeight);
                            ctx.lineTo(pos, 0);
                            ctx.fill();
                            ctx.stroke();
                            ctx.closePath();
                        } else if (band_type & BandType.centromer_end) {
                            ctx.fillStyle = "red";
                            ctx.beginPath();
                            ctx.moveTo(pos, canvasHeight/2);
                            ctx.lineTo(end, 0);
                            ctx.lineTo(end, canvasHeight);
                            ctx.lineTo(pos, canvasHeight/2);
                            ctx.fill();
                            ctx.stroke();
                            ctx.closePath();
                        } else if (band_type & BandType.stalk) {
                            ctx.fillStyle = "orange";
                            ctx.fillRect(pos, 0, end-pos,canvasHeight);
                            ctx.strokeStyle = "black";
                            ctx.strokeRect(pos, 0, end-pos, canvasHeight);
                            if (end-pos>35) {
                                ctx.font=fontHeight+"px Georgia";
                                ctx.fillStyle = "black";
                                ctx.fillText(bandName,pos+(end-pos)/2-15,canvasHeight-3, end-pos);
                            }
                        } else if (band_type & BandType.band) {
                            ctx.fillStyle = "hsl(0, 0%, "+intensity+"%)";
                            ctx.fillRect(pos, 0, end-pos, canvasHeight);
                            ctx.strokeStyle = "black";
                            ctx.strokeRect(pos, 0, end-pos, canvasHeight);
                            if (end-pos>35) {
                                ctx.font=fontHeight+"px Georgia";
                                if (intensity>50) {
                                    ctx.fillStyle = "black";
                                } else {
                                    ctx.fillStyle = "white";
                                }
                                ctx.fillText(bandName,pos+(end-pos)/2-15,canvasHeight-3, end-pos);
                            }
                        } else {
                            endChro = endChro2;
                            pos = end;
                            continue;
                        }
                        endChro = endChro2;
                        pos = end;
                    }
                    // thanks http://www.eccesignum.org/blog/solving-display-refreshredrawrepaint-issues-in-webkit-browsers
                    canvas.style.display='none';
                    canvas.offsetHeight = canvas.offsetHeight;
                    canvas.style.display='block';
                };
            });
        }
        static create(parent: Views.View, name:string, role:string, args?): CytobandPanel {
            return new CytobandPanel(parent, name, role, new CytobandIterator(), args);
        }
    }


    Views.registry.registerVF(CytobandPanel.create, "CytobandPanel", "Cytoband");
}
