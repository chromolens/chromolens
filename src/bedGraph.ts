///<reference path="histogram.ts" />

/**
 * Handling Bedgraph files.
 * @namespace BedGraph
 */
module BedGraph {
//  chrom chromStart chromEnd dataValue

    /**
     * A bedgraph feature, with a simple intensity value
     * @class BedGraph.BedGraphFeature
     */
    class BedGraphFeature implements Model.Feature {
        start: number;
        end: number;
        value: number;
        constructor(start:number, end:number, value:number) {
            this.start = start;
            this.end = end;
            this.value = value;
        }
        public width():number {
            return this.end - this.start;
        }
    }

    /**
     * A BedGraph chromosome
     * @class BedGraph.BedGraphChromosomeModel
     */
    class BedGraphChromosomeModel implements Model.AbstractChromosomeModel {
        public name: string;
        public values: BedGraphFeature[] = [];
        public start: number = 0;
        public end: number = 1;

        constructor (name:string) {
            this.name = name;
        }

        public getFeatureNames(): string[] {
            return [];
        }

        public getNamedFeature(name:string): Model.NamedFeature {
            return undefined;
        }

        public getFeatures(): BedGraphFeature[] {
            return this.values;
        }

        public addValue(v:BedGraphFeature) {
            this.values.push(v);
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
     * A BedGraph chromosome set
     * @class BedGraph.BedGraphChromosomeSet
     * @extends Model.ChromosomeSet
     */
    class BedGraphChromosomeSet extends Parsers.MultiPhaseChromosomeSet implements Model.ChromosomeSet {
        public type: string = "bedGraph";
        public getChromosome(name:string): BedGraphChromosomeModel {
            return <BedGraphChromosomeModel>super.getChromosome(name);
        }
    }

    /**
     * An iterator that returns the maximum of the absolute values of the graph
     * @class BedGraph.MaxAbsIterator
     * @extends Model.AbstractIterator
     */
    class MaxAbsIterator extends Model.AbstractIterator<number> {
        addValue(v:BedGraphFeature) {
            this.accumulator = Math.max(this.accumulator, Math.abs(v.value));
        }
        initialValue():number {
            return 0.0;
        }
    };

    /**
     * An iterator that returns an array with the [minimum, maximum] of the values of the graph
     * @class BedGraph.MinMaxIterator
     * @extends Model.AbstractIterator
     */
    class MinMaxIterator extends Model.AbstractIterator<number[]> {
        initialValue():number[] {
            return [0,0];
        }
        addValue(v:BedGraphFeature) {
            this.accumulator[0] = Math.min(this.accumulator[0], v.value);
            this.accumulator[1] = Math.max(this.accumulator[1], v.value);
        }
    }

    /**
     * An iterator that returns the integral of the values of the graph (i.e. sum/length)
     * @class BedGraph.IntegralIterator
     * @extends Model.AbstractIterator
     */
    class IntegralIterator extends Model.AbstractIterator<number> {
        addValue(v:BedGraphFeature) {
            var width:number = Math.min(this.nextPos, v.end) - Math.max(this.pos, v.start);
            this.accumulator += (width * v.value);
        }
        finalValue():number {
            return this.accumulator / (this.nextPos - this.pos);
        }
        initialValue():number {
            return 0.0;
        }
    }

    /**
     * An iterator that returns the integral of the absolute values of the graph (i.e. sum/length)
     * @class BedGraph.MagIntegralIterator
     * @extends Model.AbstractIterator
     */
    class MagIntegralIterator extends Model.AbstractIterator<number> {
        addValue(v:BedGraphFeature) {
            var width:number = Math.min(this.nextPos, v.end) - Math.max(this.pos, v.start);
            this.accumulator += (width * Math.abs(v.value));
        }
        finalValue():number {
            return this.accumulator / (this.nextPos - this.pos);
        }
        initialValue():number {
            return 0.0;
        }
    }

    /**
     * A Parser for bedgraph files.
     * @class BedGraph.BedGraphParser
     * @extends Parsers.Parser
     */
    class BedGraphParser implements Parsers.Parser {
        private time:number;
        
        /**
         * Parsers the given string and returns the Model.ChromosomeSet
         * 
         * @return {Model.ChromosomeSet}
         */
        public parse_str(lines:Parsers.LineReader, id:string, desired_chroname?:string) : Model.ChromosomeSet {
            var cset: BedGraphChromosomeSet = new BedGraphChromosomeSet(id, this, lines);
            if (desired_chroname == undefined) {
                cset.parseNames();
                return cset;
            }

            var chro:BedGraphChromosomeModel = new BedGraphChromosomeModel(desired_chroname);
            var line:string;
            lines.setStartPoint( new RegExp(desired_chroname+"\\s") );

            while ((line = lines.next()) !== null) {
                if (line.charAt(0) == '#') {
                    continue;
                }
                var components: string[] = line.split(' ');
                if (components.length == 1 && line.indexOf('\t') >= 0) {
                    components = line.split('\t');
                }
                if (components[0] == 'browser') {
                    continue;
                }
                if (components[0] == 'track') {
                    assert(components.indexOf('type=bedGraph') > 0);
                    // get parameters, parse differently
                    continue;
                }
                assert(components.length == 4);
                var chroname = components[0];
                if (chroname == desired_chroname){
                    chro.addValue(new BedGraphFeature(parseInt(components[1]), parseInt(components[2]), parseFloat(components[3])));
                } else {
                    break;
                }
            }
            chro.optimize();
            cset.addChromosome(desired_chroname, chro);
            return cset;
        }
    }
    Parsers.registry.register('bedGraph', new BedGraphParser());

    /**
     * A panel that shows histogram views on Bedgraph data
     * @class BedGraph.BedGraphHistogramPanel
     * @extends Histogram.HistogramPanel
     */
    class BedGraphHistogramPanel extends Histogram.HistogramPanel {
        constructor(parent: Views.View, name:string, role:string, args) {
            super(parent, name, role, new MinMaxIterator());
        }

        static create(parent: Views.View, name:string, role:string, args?): BedGraphHistogramPanel {
            return new BedGraphHistogramPanel(parent, name, role, args);
        }
    }

    Views.registry.registerVF(BedGraphHistogramPanel.create, "BedGraphHistogramPanel", "bedGraph");

    /**
     * A panel that shows density views on Bedgraph data
     * @class BedGraph.BedGraphDensityPanel
     * @extends Histogram.DensityPanel
     */
    class BedGraphDensityPanel extends Histogram.DensityPanel {
        constructor(parent: Views.View, name:string, role:string, args) {
            super(parent, name, role, new MaxAbsIterator());
        }

        static create(parent: Views.View, name:string, role:string, args?): BedGraphDensityPanel {
            return new BedGraphDensityPanel(parent, name, role, args);
        }
    }

    Views.registry.registerVF(BedGraphDensityPanel.create, "BedGraphDensityPanel", "bedGraph");
}
