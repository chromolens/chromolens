///<reference path="core.ts" />

/**
 * Main view classes of the genome viewer
 * @namespace GenomeViewer
 */
module GenomeViewer {

    /**
     * The root view of the view hierarchy.
     * @class GenomeViewer.ChromosomeViewer
     */
    export class ChromosomeViewer extends Views.BaseView {
        
        private mainPanel: MainPanel;
        
        constructor() {
            super(null, "main", "main");
            this.setupViews();
            Views.mainView = this;
        }

        public setScale(scale: powerfocusI, duration?:number) {
            assert(false, "viewer has no scale");
        }

        public getViewSetup(): string[] {
            return ["mainPanel:MainPanel", "modelsView:ModelsView"];
        }

        public addView(view: Views.Panel) {
            super.addView(view);
            if (view.name == "mainPanel") {
                this.mainPanel = <MainPanel>view;
            }
        }
        
        /**
         * Obtain the ancestor view (the furthest parent)
         * @method GenomeViewer.ChromosomeViewer#getRootView
         * @return {Views.View} the ancestor
         */
        public getRootView(): Views.View {
            return this;
        }
    }

    /**
     * The root panel of the panel hierarchy. Not associated with a specific chromosome.
     * @class GenomeViewer.MainPanel
     */
    class MainPanel extends Views.BasePanel {

        constructor(parent: Views.View, name:string, role:string, args?) {
            super(parent, name, role, args);
            this.svg = d3.selectAll("svg").filter(".genome");
            var svgNode = this.svg.node();
            var margin = this.getMargin();
            this.setSize(svgNode.clientWidth - margin[0] - margin[2],
                svgNode.clientHeight - margin[1] - margin[3]);
        }

        /**
         * Obtain the ancestor panel (the furthest parent)
         * @method GenomeViewer.MainPanel#getRootPanel
         * @return {Views.Panel} the ancestor
         */
        public getRootPanel(): Views.Panel {
            return this;
        }

        public layout(w?:number, h?:number):number[] {
            if (w === undefined) {
                var svgNode = this.svg.node();
                var margin = this.getMargin();
                w = svgNode.clientWidth;
            }
            if (h === undefined)
                h = 60;
            return super.layout(w, h);
        }

        public doLayout(w:number, h:number) {
            var margin = this.getMargin();
            var x = margin[0];
            var y = margin[1];
            this.panels.forEach(function (p:Views.Panel) {
                p.setPos(x, y);
                var psize = p.getOuterSize();
                y += psize[1];
                });
        }

        public getScale(): powerfocusI {
            return undefined;
        }

        public setScale(newScale: powerfocusI, duration?:number) {
            assert(false, "main panel has no scale");
        }

        public remove() {
            throw "Cannot remove the main panel";
        }

        getMargin(): number[] {return [20, 20, 20, 20];}

        public invalidate() {
            this.invalidated = true;
        }

        public isEmpty() {
            return false;
        }

        static create(parent: Views.View, name:string, role:string, args?): MainPanel {
            return new MainPanel(parent, name, role, args);
        }
    }

    Views.registry.registerVF(MainPanel.create, "MainPanel");
}
