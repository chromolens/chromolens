///<reference path="histogram.ts" />

/**
 * Handling adjacency files.
 * @namespace Adjacency
 */
module Adjacency {

    /**
     * a single binding in the adjacency model
     * @class Adjacency.BindingFeature
     * @extends Model.Feature
     */
    class BindingFeature implements Model.Feature {
        public start: number;
        public end: number;
        public direct: boolean;
        public score: number;

        constructor(start:number, end:number, direct:string, score:number) {
            this.start = start - 0;
            this.end = end - 0;
            this.direct = (direct=="TRUE")?true:false;
            this.score = score - 0.0;
        }

        public midpoint() {
            return (this.start+this.end)/2;
        }

        public scaledMidpoint(scale: D3.Scale.LinearScale): number {
            // TODO: Maybe memoize the scaled values?
            //return (scale(this.start)+scale(this.end))/2;
            return scale((this.start+this.end)/2);
        }
    }

    /**
     * An adjacency chromosome
     * @class Adjacency.AdjacencyChromosomeModel
     * @extends Model.AbstractChromosomeModel
     */
    class AdjacencyChromosomeModel implements Model.AbstractChromosomeModel {
        public start: number;
        public end:number;
        public name: string;
        public bindings: BindingFeature[];
        private pre_clusters: {[cluster_id: number]: BindingFeature[];};
        public clusters: BindingFeature[][];

        constructor (name:string) {
            this.name = name;
            this.bindings = [];
            this.pre_clusters = <any>{}
            this.start = 0;
            this.end = 1;
        }

        public getFeatureNames(): string[] {
            return [];
        }

        public getNamedFeature(name:string): Model.NamedFeature {
            return undefined;
        }

        public getFeatures(): BindingFeature[] {
            return this.bindings;
        }

        public addBinding(start:number, end:number , cluster:number, direct:string, score:number) {
            var binding = new BindingFeature(start, end, direct, score);
            this.bindings.push(binding);
            if (this.pre_clusters[cluster] === undefined) {
                this.pre_clusters[cluster] = [];
            }
            this.pre_clusters[cluster].push(binding);
        }

        public optimize() {
            // TODO: check assumption that binding sites always differ by their start.
            this.bindings.sort(Model.compareFeatures);
            if (this.bindings.length > 0) {
                this.end = this.bindings[this.bindings.length-1].end;
            }
            var clusters: BindingFeature[][] = [];
            for (var name in this.pre_clusters) {
                var cluster: BindingFeature[] = this.pre_clusters[name];
                if (cluster.length > 1) {
                    cluster.sort(Model.compareFeatures);
                    clusters.push(cluster);
                }
            }
            delete this.pre_clusters;
            this.clusters = clusters;
        }
    }

    /**
     * An iterator that returns the maximum binding score over iterated bindings
     * @class Adjacency.MaxBindingIterator
     * @extends Model.AbstractIterator
     */
    class MaxBindingIterator extends Model.AbstractIterator<number> {
        addValue(b:BindingFeature) {
            this.accumulator = Math.max(this.accumulator, Math.abs(b.score));
        }
        initialValue():number {
            return 0;
        }
    };

    /**
     * An Adjacency chromosome set
     * @class Adjacency.AdjacencyChromosomeSet
     * @extends Model.ChromosomeSet
     */
    class AdjacencyChromosomeSet implements Model.ChromosomeSet {
        public id: string;
        public type:string = "adjacency";
        private chromosomes: D3.Map;
        constructor(id:string, d: D3.Map) {
            this.chromosomes = d;
        }
        public getChromosome(name:string): AdjacencyChromosomeModel {
            return this.chromosomes.get(name);
        }
        public getChromosomeNames(): string[] {
            return this.chromosomes.keys();
        }
    }

    /**
     * The parser class for adjacency files
     * @class Adjacency.AdjacencyParser
     * @extends Parsers.Parser
     */
    class AdjacencyParser implements Parsers.Parser {
        public parse_str(lines:Parsers.LineReader, id: string, chro?:string) : Model.ChromosomeSet {
            //try {
                var headers = lines.next().split('\t');
                var has_chro = (headers[0] == 'Chr');
                assert(has_chro || (chro !== undefined), '');
                assert(headers.length == (has_chro?6:5), '');
                var chromosomes : D3.Map = d3.map();
                var current_chro = chro;
                var chroModel;
                if (chro !== undefined) {
                    chroModel = new AdjacencyChromosomeModel(chro);
                    chromosomes.set(chro, chroModel);
                }
                var line:string;
                while ((line = lines.next()) !== null) {
                    var vals = line.split('\t');
                    if (has_chro) {
                        current_chro = vals.shift();
                    }
                    if (chro === undefined) {
                        if (!chromosomes.has(current_chro)) {
                            chromosomes.set(current_chro, new AdjacencyChromosomeModel(current_chro));
                        }
                        chroModel = chromosomes.get(current_chro);
                        chroModel.addBinding.apply(chroModel, vals);
                    } else if (chro == current_chro) {
                        chroModel.addBinding.apply(chroModel, vals);
                    }
                }
                chromosomes.forEach(function(key: string, chro: AdjacencyChromosomeModel) {
                    chro.optimize();
                });
                return new AdjacencyChromosomeSet(id, chromosomes);
            //} catch (Exception) {

            //}
        }
    }
    Parsers.registry.register('adjacency', new AdjacencyParser());

    // Adjacency view class

    function bindFill(d: BindingFeature) {
        return d.direct?"black":"white";
    }

    function peakColor(d: BindingFeature) {
        return d3.hcl(0, 0, 100-2*d.score);
    }


    function num_direct(d: BindingFeature[]) {
        var n = 0;
        d.forEach(function(b) {
            if (b.direct) {n++;}
        });
        return n;
    }

    function num_indirect(d: BindingFeature[]) {
        var n = 0;
        d.forEach(function(b) {
            if (!b.direct) {n++;}
        });
        return n;
    }

    interface scaledArcPath {
        (d: BindingFeature[], scale:D3.Scale.LinearScale, height: number): string;
    }

    function arcPathWithScale(d: BindingFeature[], scale:D3.Scale.LinearScale, height: number): string {
        var path = [];
        var start = d[0].scaledMidpoint(scale);
        path.push("M", start, 0);
        for (var i = 1; i < d.length; i++) {
            var end = d[i].scaledMidpoint(scale);
            var xradius = (end - start) / 2;
            var yradius = Math.min(Math.max(4,(end - start) / 3), height/2);
            path.push("A", xradius, yradius, 0, 0, 1, end, 0);
            start = end;
        }
        return path.join(' ');
    }


    function arcDDPathWithScale(d: BindingFeature[], scale:D3.Scale.LinearScale, height: number): string {
        var path = [];
        var directSubset = [];
        d.forEach(function (b) {
            if (b.direct) {
                directSubset.push(b);
            }
        });
        var start = directSubset[0].scaledMidpoint(scale);
        path.push("M", start, 0);
        for (var i = 1; i < directSubset.length; i++) {
            var end = directSubset[i].scaledMidpoint(scale);
            var xradius = (end - start) / 2;
            var yradius = Math.min(Math.max(4,(end - start) / 3), height/2);
            path.push("A", xradius, yradius, 0, 0, 1, end, 0);
            start = end;
        }
        return path.join(' ');
    }

    function arcDIPathWithScale(d: BindingFeature[], scale:D3.Scale.LinearScale, height: number): string {
        var path = [];
        var directSubset = [];
        var indirectSubset = [];
        d.forEach(function (b) {
            if (b.direct) {
                directSubset.push(b);
            } else {
                indirectSubset.push(b);
            }
        });
        directSubset.forEach(function(direct_binding) {
            var start = direct_binding.scaledMidpoint(scale);
            indirectSubset.forEach(function(indirect_binding) {
                path.push("M", start, 0);
                var end = indirect_binding.scaledMidpoint(scale);
                var xradius = Math.abs(end - start) / 2;
                var yradius = Math.min(Math.max(4,Math.abs(end - start) / 3), height/2);
                path.push("A", xradius, yradius, 0, 0, (end > start)?1:0, end, 0);
            });
        });
        return path.join(' ');
    }

    function showBinding(b: BindingFeature) {
        d3.select("#binding_start").text(b.start);
        d3.select("#binding_end").text(b.end);
        d3.select("#binding_peak").text(b.score);
        d3.select("#binding_direct").style("display", b.direct?"inline":"none");
        var event = <MouseEvent>sourceEvent();
        d3.select("#binding_info").style("display", "block");
    }

    function hideBinding(b: BindingFeature) {
        d3.select("#binding_info").style("display", "none");
    }


    /**
     * A panel that displays an adjacency model
     * @class Adjacency.AdjacencyPanel
     * @extends Views.BasePanel
     */
    class AdjacencyPanel extends Views.BasePanel {
        public chromosome : AdjacencyChromosomeModel;
        /**
         * Do we show arcs for all pairs of bindings in a cluster,
         * or only a winding arc for consecutive indirect bindings,
         * and all pairs involving direct bindings.
         * @member Adjacency.AdjacencyPanel#complexArcs
         * @type boolean
         */
        private complexArcs : boolean;
        /**
         * Do we hide bindings whose arcs are not shown
         * @member Adjacency.AdjacencyPanel#showAllBindings
         * @type boolean
         */
        private showAllBindings: boolean;
        /**
         * The ID3 selection of the arcs between bindings in a cluster.
         * According to complexArcs, may only concern direct-indirect bindings.
         * @member Adjacency.AdjacencyPanel#g_arcs
         * @type D3.Selection
         */
        private g_arcs : D3.Selection;
        /**
         * The ID3 selection of the arcs between direct bindings in a cluster.
         * @member Adjacency.AdjacencyPanel#g_dd_arcs
         * @type D3.Selection
         */
        private g_dd_arcs : D3.Selection;
        /**
         * The ID3 selection of the arcs between indirect bindings in a cluster.
         * @member Adjacency.AdjacencyPanel#g_ii_arcs
         * @type D3.Selection
         */
        private g_ii_arcs : D3.Selection;
        /**
         * The ID3 selection of the bindings
         * @member Adjacency.AdjacencyPanel#g_bindings
         * @type D3.Selection
         */
        private g_bindings : D3.Selection;

        private g_line : D3.Selection;

        constructor(parent: Views.View, name:string, role:string, args) {
            super(parent, name, role, args);
            this.complexArcs = (args['complexArcs'] === undefined)?true:false;
            this.showAllBindings = (args['showAllBindings'] === undefined)?false:true;
            this.g_line = this.svg.append("line").
                attr("x1", 0).
                attr("x2", this.width).
                attr("y1", 0).
                attr("y2", 0).
                attr("style", "stroke:rgb(255,0,0);stroke-width:2");
            this.g_arcs = this.svg.append("g")
                .attr("class", "arcs");
            this.g_dd_arcs = this.svg.append("g")
                .attr("class", "dd_arcs");
            this.g_ii_arcs = this.svg.append("g")
                .attr("class", "ii_arcs");
            this.g_bindings = this.svg.append("g")
                .attr("class", "bindings");
        }

        public setSize(w:number, h:number) {
            super.setSize(w, h);
            if (this.g_line !== undefined)
                this.g_line.attr("x2", w);
        }

        public getMinSize():number[] {
            return [600, 55];
        }

        // TODO: Optimize calculations
        public arcSize(d: BindingFeature[]) {
            if (d.length<2) {
                return 0;
            }
            var start = this.scale(d[0].start);
            var end = this.scale(d[d.length-1].end);
            return end - start;
        }

        public setComplexArcs(complexArcs: boolean) {
            this.complexArcs = complexArcs;
        }

        public setChromosome(chromosome: Model.AbstractChromosomeModel) {
            super.setChromosome(chromosome);
            var scale = this.scale;
            scale.domain([chromosome.start, chromosome.end]);
            scale.exponent(1);
            scale.focus(chromosome.start);
            this.setScale(scale);
            if (this.showAllBindings) {
                var selection = this.g_bindings.selectAll("circle")
                    .data(this.chromosome.bindings);

                selection.exit().remove();

                function correctedPos(binding) {
                    return binding.scaledMidpoint(scale);
                }

                selection
                    .enter().append("circle")
                    .attr("cx", correctedPos)
                    .attr("cy", 0)
                    .attr("r", 2)
                    .attr("fill", bindFill)
                    .attr("stroke", peakColor)
                    //.attr("id", function(d) { return "b_"+d[0]})
                    .on("mouseover", showBinding)
                    .on("mouseout", hideBinding);
            }
        }

        public setScale(newScale: powerfocusI, duration?: number) {
            // bring height into the closure for the next fns.
            var height = this.height;
            var scaleInterpolator = newScale.scaleInterpolate()(this.scale);
            if (duration === undefined) {
                duration = 250;
            }
            super.setScale(newScale, duration);

            function arc_tween(arcFunction) {
                return function(datum, index, attrvalue) { // tween
                    return function(t) { // interpolator
                        var scale = scaleInterpolator(t);
                        return arcFunction(datum, scale, height);
                    }
                }
            }
            function cx_tween(binding, index, attrvalue) {
                return function(t) {
                    return binding.scaledMidpoint(scaleInterpolator(t));
                }
            }
            function correctedPos(binding: BindingFeature): number {
                return binding.scaledMidpoint(newScale);
            }


            function arcSize(d: BindingFeature[]) {
                if (d.length<2) {
                    return 0;
                }
                var start = newScale(d[0].start);
                var end = newScale(d[d.length-1].end);
                return end - start;
            }

            function filterArcs(d: BindingFeature[]) {
                return arcSize(d) > 3;
            }

            var somearcs: BindingFeature[][] = this.chromosome.clusters.filter(filterArcs);
            if (!this.showAllBindings) {
                var selectedBindings:BindingFeature[] = d3.merge(somearcs);

                var selection = this.g_bindings.selectAll("circle")
                    .data(selectedBindings);

                selection.exit()
                    .transition()
                    .duration(duration)
                    .attrTween("cx", cx_tween)
                    .style("opacity", 0)
                    .remove();

                selection
                    .style("opacity", 1)
                    .transition()
                    .duration(duration)
                    .attrTween("cx", cx_tween);

                selection.enter()
                    .append("circle")
                    .attr("cy", 0)
                    .attr("r", 2)
                    .attr("fill", bindFill)
                    .attr("stroke", peakColor)
                    //.attr("id", function(d) { return "b_"+d[0]})
                    .on("mouseover", showBinding)
                    .on("mouseout", hideBinding)
                    .transition()
                    .duration(duration)
                    .attrTween("cx", cx_tween);
            } else {
                this.g_bindings.selectAll("circle")
                    .transition()
                    .duration(duration)
                    .attrTween("cx", cx_tween);
            }
            function drawArcs(region: D3.Selection, arcFunc: scaledArcPath, subset: BindingFeature[][]) {
                    var selection = region.selectAll("path")
                        .data(subset);
                    selection.exit()
                        .transition()
                        .duration(duration)
                        .style("opacity", 0)
                        .attrTween("d", arc_tween(arcFunc))
                        .remove();
                    selection
                        .style("opacity", 1)
                        .transition()
                        .duration(duration)
                        .attrTween("d", arc_tween(arcFunc));
                    selection
                        .enter().append("path")
                        .transition()
                        .duration(duration)
                        .style("opacity", 1)
                        .attrTween("d", arc_tween(arcFunc));
            }

            if (this.complexArcs) {
                var subset1 : BindingFeature[][] = somearcs.filter(function(d:BindingFeature[]){return num_direct(d) > 1;});
                drawArcs(this.g_dd_arcs, arcDDPathWithScale, subset1);
                drawArcs(this.g_ii_arcs, arcPathWithScale, somearcs.filter(function(d){return num_direct(d) === 0;}));
                drawArcs(this.g_arcs, arcDIPathWithScale, somearcs.filter(function(d){return num_direct(d) > 0 && num_indirect(d) > 0;}));
            } else {
                drawArcs(this.g_arcs, arcPathWithScale, somearcs);
            }

        }

        public getOffset(): number[] {
            return [0, 50];
        }

        static create(parent: Views.View, name:string, role:string, args?): AdjacencyPanel {
            return new AdjacencyPanel(parent, name, role, args);
        }
    }

    Views.registry.registerVF(AdjacencyPanel.create, "AdjacencyPanel", "adjacency");

    /**
     * A panel that displays a histogram of binding density
     * @class Adjacency.BindingDensityPanel
     * @extends Histogram.DensityPanel
     */
    class BindingDensityPanel extends Histogram.DensityPanel {
        constructor(parent: Views.View, name:string, role:string, args) {
            super(parent, name, role, new MaxBindingIterator());
        }

        static create(parent: Views.View, name:string, role:string, args?): BindingDensityPanel {
            return new BindingDensityPanel(parent, name, role, args);
        }
    }

    Views.registry.registerVF(BindingDensityPanel.create, "BindingDensityPanel", "adjacency");

}
