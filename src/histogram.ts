///<reference path="focusView.ts" />

/**
 * Views for Histogram maps
 * @namespace Histogram
 */
module Histogram {

    /**
     * A panel for various kinds of horizontal graph functions.
     * @class Histogram.AbstractHistogramPanel
     * @extends Views.BasePanel
     */
    export class AbstractHistogramPanel<T> extends Views.BasePanel {
        public chromosome : Model.AbstractChromosomeModel;
        private canvas: D3.Selection;
        drawContext: CanvasRenderingContext2D;
        iter: Model.ChromosomeIterator<T>;
        globalMax: T;

        constructor(parent: Views.View, name:string, role:string, iter:Model.ChromosomeIterator<T>, args?) {
            super(parent, name, role, args);
            var ob = this.svg.append("foreignObject")
                .attr("width", this.width).attr("height", this.height);
            this.canvas = ob.append("xhtml:canvas")
                .attr("width", this.width).attr("height", this.height);
            this.drawContext = (<HTMLCanvasElement>(this.canvas.node())).getContext("2d");
            this.iter = iter;
        }

        public getMinSize():number[] {
            return [600, 40];
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
            this.globalMax = this.iter.moveTo(chromosome.end);
            this.scale.domain([chromosome.start, chromosome.end]);
            this.scale.exponent(1);
            this.scale.focus(chromosome.start);
            this.setScale(this.scale);
        }

        draw(pos:number, end:number, value:T) {}

        public setScale(newScale: powerfocusI, duration?: number) {
            var scaleInterpolator = newScale.scaleInterpolate()(this.scale);
            if (duration === undefined) {
                duration = 250;
            }
            super.setScale(newScale, duration);
            var ctx:CanvasRenderingContext2D = this.drawContext;
            var width = this.width;
            var iter:Model.ChromosomeIterator<T> = this.iter;
            var globalMax = this.globalMax;
            var this_in_closure = this;
            ctx.fillStyle = "black";
            var canvas = <HTMLCanvasElement>this.canvas.node();
            this.canvas.transition().duration(duration).tween("canvas", function() {
                return function(t) { // interpolator
                    var scale = scaleInterpolator(t);
                    var pos:number = 0;
                    iter.reset();
                    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
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
                        var magI=iter.moveTo(endChro);
                        this_in_closure.draw(pos, end, magI);
                        pos = end;
                    }
                    canvas.style.display='none';
                    canvas.offsetHeight = canvas.offsetHeight;
                    canvas.style.display='block';
                };
            });
        }
    }

    /**
     * A panel that shows a min-max histogram using tick height
     * @class Histogram.HistogramPanel
     * @extends Histogram.AbstractHistogramPanel
     */
    export class HistogramPanel extends AbstractHistogramPanel<number[]> {
        draw(pos:number, end:number, value:number[]) {
            if (value[0] < 0 || value[1] > 0) {
                var min:number = -value[0]/this.globalMax[0];
                if ( value[0] == 0) { min = 0; }
                var max:number = value[1]/this.globalMax[1];
                this.drawContext.fillRect(pos, 20 - 20 * max, end-pos, (max-min)*20);
            }
            pos = end;
        }
    }

    /**
     * A panel that shows a histogram using tick brightness
     * @class Histogram.DensityPanel
     * @extends Histogram.AbstractHistogramPanel
     */
    export class DensityPanel extends AbstractHistogramPanel<number> {
        draw(pos:number, end:number, value:number) {
            if (value > 0) {
                var mag:number = 1-(value/this.globalMax);
                this.drawContext.fillStyle = "hsl(0,0%,"+Math.floor(100*mag)+"%)";
                this.drawContext.fillRect(pos, 0, end-pos, 10);
            }
        }
    }
}
