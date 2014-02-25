///<reference path="interfaces.d.ts" />
///<reference path="powerfocus.d.ts" />

/**
  * False Assert function.
  * Throws the message if the truth value is false.
  * @param {boolean} t The truth value
  * @param {string} [msg] An optional message
  */
function assert(t: boolean, msg?: string) {
    if (!t) throw (msg || "failed assertion");
}

/**
 * Get the DOM Event at the origin of the current D3.Event
 * @function sourceEvent
 * @return {Event}     The DOM Event
 */
function sourceEvent():Event {
    var e:any = d3.event;
    var s;
    while (s = e.sourceEvent) e = s;
    return <Event>e;
}

/**
 * The View classes
 * @namespace Views
 */
module Views {

    /**
     * The singleton registry of known views.
     * Each view has an ID (its classname) and may know about certain filetypes.
     * @class Views.ViewRegistry
     */
    export class ViewRegistry {
        private viewRegistry: D3.Map = d3.map(); // of Views.ViewFactory
        private modelViewRegistry : D3.Map = d3.map(); // of string[]

        /**
         * Register a view (through its view factory function) of a given name.
         * @method Views.ViewRegistry#registerVF
         * @param {Views.ViewFactory} vf the factory function
         * @param {string} name the name for the view type
         * @param {string} forModel the file types this view can handle (optional)
         */
        public registerVF(vf: ViewFactory, name:string, forModel?:string) {
            this.viewRegistry.set(name, vf);
            if (forModel !== undefined) {
                if (!this.modelViewRegistry.has(forModel)) {
                    this.modelViewRegistry.set(forModel, [name]);
                } else {
                    this.modelViewRegistry.get(forModel).push(name);
                }
            }
        }

        /**
         * Get the view factory function for a given view name.
         * @method Views.ViewRegistry#getVF
         * @param {string} name the view (class) name
         * @return {Views.ViewFactory} a factory function
         */
        public getVF(name:string): ViewFactory {
            return this.viewRegistry.get(name);
        }

        /**
         * get the name of views that can be used to display a model of a given type.
         * @method Views.ViewRegistry#getVFsForModel
         * @param {string} name the model type name (as registered with the {Parsers.registry})
         * @return {string[]} a set of view type names that can display that model type.
         */
        public getVFsForModel(name:string): string[] {
            return this.modelViewRegistry.get(name);
        }
    }
    /**
     * The {Views.ViewRegistry} singleton
     * @variable {Views.registry}
     */
    export var registry: ViewRegistry = new ViewRegistry();
    export var mainView: View;

    /**
     * Abstract base class for all views on a chromosome.
     * @class Views.BaseView
     * @extends Views.View
     */
    export class BaseView implements View {

        /**
         * a parent view, if any
         * @member Views.BaseView#parent
         * @type {Views.View}
         */
        parent: View;

        /**
         * The chromosome displayed by that view
         * @member Views.BaseView#chromosome
         * @type {Model.AbstractChromosomeModel}
         */
        chromosome: Model.AbstractChromosomeModel;

        /**
         * The name of the view. Unique among siblings.
         * @member Views.BaseView#name
         * @type {string}
         */
        name: string;

        /**
         * The role of the view in its parent.
         * @member Views.BaseView#role
         * @type {string}
         */
        role: string;

        /**
         * Sub-views, dictionary by view ID.
         * @member Views.BaseView#viewsByName
         * @type {Object}
         * @private
         */
        private viewsByName: D3.Map = d3.map();

        /**
         * Create a new BaseView
         * @constructor Views.BaseView
         * @param {Views.View} parent the parent view
         * @param {string} name the name of this view
         * @param {string} role the role of this view in its parent
         */
        constructor(parent: View, name:string, role:string, args?:string[]) {
            this.parent = parent;
            this.name = name;
            this.role = role;
        }

        /**
         * Add a child view
         * @method Views.BaseView#addView
         * @param {Views.View} view the child view
         */
        public addView(view: View) {
            var old: View = this.viewsByName.get(view.name);
            if (old !== view) {
                if (old !== undefined) {
                    this.removeView(old);
                }
                this.viewsByName.set(view.name, view);
            }
        }

        /**
         * Remove a child view
         * @method Views.BaseView#removeView
         * @param {Views.View} view the child view
         * @return Whether this view should be removed as a result.
         */
        public removeView(view: View):boolean {
            var old:View = this.viewsByName.get(view.name);
            if (old !== undefined) {
                old.remove();
                this.viewsByName.remove(view.name);
            }
            return false;
        }

        /**
         * Obtain the ancestor view (the furthest parent)
         * @method Views.BaseView#getRootView
         * @return {Views.View} the ancestor
         */
        public getRootView(): View {
            return this.parent.getRootView();
        }

        /**
         * Called on a view when it is removed from its parent
         * @method Views.BaseView#remove
         */
        public remove() {}

        /**
         * Called for setup after the chromosome is set or changed.
         * @method Views.BaseView#setChromosome
         * @param {Model.AbstractChromosomeModel} chromosome the chromosome
         */
        public setChromosome(chromosome: Model.AbstractChromosomeModel) {
            this.chromosome = chromosome;
            this.viewsByName.forEach(function(id, view:Views.View) {
                view.setChromosome(chromosome);
            });
        }

        /**
         * get a direct child view by identifier
         * An identifier can be either # + the view ID, the role name, or @ + the view type name.
         * @method Views.BaseView#getSubView
         * @param {string} name the identifier
         * @return {Views.View} the child view
         */
        public getSubView(name:string): View {
            var view:View = undefined;
            if (name.length == 0) {
                return this.getRootView();
            } else if (name.charAt(0) == '#') {
                return this.viewsByName.get(name.substring(1));
            } else if (name.charAt(0) == '@') {
                name = name.substring(1);
                this.viewsByName.forEach(function(n, v:View){
                    if (v.getTypeName() == name) { view = v;}
                    });
            } else {
                this.viewsByName.forEach(function(n, v:View){
                    if (v.role == name) { view = v; }
                    });
            }
            return view;
        }

        /**
         * get a view through a path of identifiers (as per getSubView)
         * @method Views.BaseView#getViewPath
         * @param {string[]} path the sequence of view IDs. (consumed)
         * @return {Views.View} the view
         */
        public getViewPath(path: string[]): View {
            if (path.length == 0) {
                return this;
            }
            var step:string = path.shift();
            var view: View = this.getSubView(step);
            if (view !== undefined) {
                return view.getViewPath(path);
            }
            return undefined;
        }

        /**
         * A view may define a setup, that is a specification of subviews that it creates at construction.
         * Each subview is specified with a string of the following syntax:
         * id.id.id:typename:argn=argv:argn=argv
         *
         * A view of type typename (registered in the ViewManager) will be created with given argument values
         * at a position in the view hierarchy given by the id path. The IDs are relative to the current view,
         * unless prefixed with a '.' (absolute path.) Sub-subviews should be created after the subview, obviously.
         *
         * @method Views.BaseView#getViewSetup
         * @return {string[]}
         */
        public getViewSetup(): string[] {
            return [];
        }

        /**
         * Define the existing roles for subviews of this view. Ordered.
         * @method Views.View#getViewRoles
         * @return {string[]}
         */
        public getViewRoles(): string[] {
            return [];
        }

        /**
         * create subviews according to getViewSetup
         * @method Views.BaseView#setupViews
         */
        public setupViews() {
            // syntax: id.id.id:typename:argn=argv:argn=argv
            var setupDef: string[] = this.getViewSetup();
            var this_in_closure: View = this;
            setupDef.forEach(function(s: string) {
                var frag:string[] = s.split(':');
                assert(frag.length >= 2, "at least a : in view setup");
                var args = {};
                var typename:string = frag[1];
                var path:string[] = frag[0].split('.');
                assert(path.length > 0);
                var role:string = path.pop();
                var dest = this_in_closure.getViewPath(path);
                for (var i = 2; i<frag.length; i++) {
                    var frag2:string[] = frag[i].split('=');
                    assert(frag2.length == 2);
                    args[frag2[0]] = frag2[1];
                }
                dest.createSubView(typename, typename, role, args);
            });
        }

        /**
         * create a view of a given type at a given position in the view hierarchy.
         * @method Views.BaseView#createSubView
         * @param {string} typename the view type
         * @param {string} name the proposed name of the view. May be changed by the parent to preserve uniqueness.
         * @param {string} role the name of the "role" of the view. Many subviews can have the same role.
         * @param [args] extra arguments for creating the view
         * @return {Views.View} the resulting view
         */
        public createSubView(typename: string, name:string, role:string, args?): Views.View {
            var factory: ViewFactory = registry.getVF(typename);
            // TODO: Add args?
            var name = this.getUniqueChildName(name);
            var decorator = this.getDecorator(name, role);
            // view's parent is decorator or this.
            var parent = (decorator !== undefined)?<View>decorator:<View>this;
            var subview: View = factory(parent, name, role, args);
            var view = subview;
            if (subview !== undefined) {
                parent.addView(subview);
                subview.setupViews();
                if (decorator !== undefined) {
                    view = decorator;
                    this.addView(view);
                }
            }

            return view; // might be decorator
        }

        /**
         * When a child panel is added, this method may propose to wrap it
         * in a "decorator" panel in the containment hierarchy.
         * @method Views.BasePanel#getDecorator
         * @param  {string}     name the name of the child panel
         * @param  {string}     role the role of the child panel
         * @return {Panel}      the decorator Panel, or undefined.
         */
        public getDecorator(name:string, role:string): Panel {
            return undefined;
        }

        /**
         * Get a unique name for a view, from the base view name.
         * @method Views.BasePanel#getUniqueChildName
         * @param  {string}           basis base name
         * @return {string}                 unique name
         */
        public getUniqueChildName(basis: string):string {
            var counter:number = 2;
            var name = basis;
            while (this.viewsByName.has(name)) {
                name = basis + ' ' + counter++;
            }
            return name;
        }

        /**
         * Get the type name of this view. Defaults to the class name.
         * @method Views.BaseView#getTypeName
         * @return {string}
         */
        public getTypeName(): string {
            return this['constructor'].name;
        }

    }

    /**
     * Abstract class for Panels, those chromosome views that have a 2d manifestation.
     * @class Views.BasePanel
     * @extends Views.BaseView
     * @extends Views.Panel
     */
    export class BasePanel extends BaseView implements Panel {

        /**
         * The list of child panels
         * @member Views.BasePanel#panels
         * @type {Panel[]}
         */
        height: number;
        width: number;
        pos: number[] = [0, 0];
        svg: D3.Selection;
        panels: Panel[] = [];
        invalidated: boolean = true;
        public scale : powerfocusI;

        /**
         * Create a BasePanel
         * @constructor Views.BasePanel
         * @param {Views.View} parent the parent view
         * @param {string} name the name of this view
         * @param {string} role the role of this view in its parent
         * @param args extra arguments
         */
        constructor(parent: Views.View, name:string, role:string, args?:string[]) {
            super(parent, name, role, args);
            if (parent instanceof BasePanel) {
                var parentPanel = <BasePanel>parent;
                this.svg = parentPanel.createViewPort(this);
                this.scale = <powerfocusI>parentPanel.getScale();
                this.setSize(1,1); // we want it to be wrong to force a recalc
            }
        }

        /**
         * Add a new child panel at a given position
         * @method Views.BasePanel#addPanelAt
         * @param {Panels.Panel} panel the child panel
         * @param {number} pos the position at which to add the panel
         */
        public addPanelAt(panel: Panel, pos: number) {
            super.addView(panel);
            if (pos < 0) {
                pos = pos + this.panels.length;
            }
            this.panels.splice(pos, 0, panel);
        }

        /**
         * Add a child view
         * @method Views.BasePanel#addView
         * @param {Views.View} view the child view
         */
        public addView(view:View) {
            super.addView(view);
            // silly typescript does not allow checking instanceof interface
            if (view instanceof BasePanel) {
                var panel:Panel = <Panel>view;
                var roles:string[] = this.getViewRoles();
                var pos = this.panels.length;
                // not best way to do this, but position must respect role order.
                while (pos > 0 && roles.indexOf(this.panels[pos-1].role) > roles.indexOf(panel.role)) {
                    pos--;
                }
                this.panels.splice(pos, 0, panel);
            }
        }

        /**
         * Remove a child view
         * @method Views.BasePanel#removeView
         * @param {Views.View} view the child view
         * @return {boolean} whether the view was found.
         */
        public removeView(view:View):boolean {
            var remove = super.removeView(view);
            if (view instanceof BasePanel) {
                var panel:Panel = <Panel>view;
                var remainder: Panel[] = [];
                this.panels.forEach(function (p:Panel) {
                    var remove = p.removeView(panel);
                    if (!remove) remainder.push(p);
                    });
                this.panels = remainder;
            }
            return this.panels.length == 0;
        }

        /**
         * Called on a view when it is removed from its parent
         * @method Views.BasePanel#remove
         */
        public remove() {
            this.svg.remove();
        }

        /**
         * Whether this panel has subpanels. Disregard "structural" subpanels.
         * @method Views.BasePanel#isEmpty
         * @return {boolean}
         */
        public isEmpty() {
            return this.panels.length == 0;
        }

        /**
         * Create a SVG group for a child panel
         * @method Views.BasePanel#createViewPort
         * @param  {Views.Panel}        child the child panel
         * @return {D3.Selection}       the {@linkcode D3.Selection} of the SVG group
         */
        public createViewPort(child: Panel): D3.Selection {
            var port: D3.Selection = this.svg.append("g").
                attr("class", child.getTypeName()+" r_"+child.role).
                attr("id", child.name);
            (<any>port.node()).view = child;
            return port;
        }

        /**
         * Get the current position in the panel relative to the container panel
         * @method Views.BasePanel#getPos
         * @return {number[]} The x and y coordinates, in pixels.
         */
        public getPos():number[] {
            return this.pos;
        }

        /**
         * An offset for the data within this panel. Will be added to the translate operator.
         * @method Views.BasePanel#getOffset
         * @return {number[]} The [x, y] offsets, in pixels. Usually [0, 0].
         */
        public getOffset(): number[] {
            return [0, 0];
        }

        /**
         * Set the current position of the panel, relative to the container panel
         * @method Views.BasePanel#setPos
         * @param  {number} x pixels
         * @param  {number} y pixels
         */
        public setPos(x:number, y:number) {
            this.pos = [x, y];
            var margin = this.getMargin();
            var offset = this.getOffset();
            this.svg.attr("transform", "translate("+(x+offset[0]+margin[0])+","+(y+offset[1]+margin[1])+")");
        }

        /**
         * Get the current size of this panel. (excluding the margin.)
         * @method Views.BasePanel#getSize
         * @return {number[]} The [width, height] of the panel.
         */
        public getSize(): number[] {
            return [this.width, this.height];
        }

        /**
         * Get the current size of this panel. (including the margin.)
         * @method Views.BasePanel#getOuterSize
         * @return {number[]}   The [width, height] of the panel.
         */
        public getOuterSize(): number[] {
            var margin = this.getMargin();
            return [this.width + margin[0] + margin[2],
                    this.height + margin[1] + margin[3]];
        }

        /**
         * Set the actual inner size of the panel.
         * @method Views.BasePanel#setSize
         * @param  {number} w width
         * @param  {number} h [description]
         */
        public setSize(w:number, h:number) {
            this.width = w;
            this.height = h;
            var outer = this.getOuterSize();
            this.svg.attr("width", outer[0]);
            this.svg.attr("height", outer[1]);
        }

        /**
         * Get the minimum (inner) size that the panel expects to occupy.
         * Actual size will depend on the parent's layout algorithm.
         * @method Views.BasePanel#getMinSize
         * @return {number[]} The minimum [width, height] of the panel.
         */
        public getMinSize(): number[] {
            return [600, 10];
        }

        /**
         * Get the root panel, i.e. the topmost container in the visual hierarchy
         * @method Views.BasePanel#getRootPanel
         * @return {Views.Panel} the root panel
         */
        public getRootPanel(): Panel {
            return (<Panel>this.parent).getRootPanel();
        }

        /**
         * Get a margin that will be applied around this panel.
         * @method Views.BasePanel#getMargin
         * @return {number[]} The [left, top, right, bottom] margins, in pixels.
         */
        getMargin(): number[] {
            return [0, 0, 0, 0];
        }

        /**
         * get the scale used by this panel
         * @method Views.BasePanel#getScale
         * @return {D3.Scale.LinearScale} the scale
         */
        public getScale(): powerfocusI {
            return this.scale;
        }

        /**
         * (re)set the scale used by this panel
         * @method Views.BasePanel#setScale
         * @param {D3.Scale.LinearScale} scale    the scale
         * @param {number}               [duration] the duration for the visual transition (ms)
         */
        public setScale(newScale:powerfocusI, duration?:number) {
            this.scale = newScale;
            this.panels.forEach(function(view) {
                view.setScale(newScale, duration);
                });
        }

        /**
         * Mark this panel (and all its ancestors) as in need of re-layout.
         * @method Views.BasePanel#invalidate
         */
        public invalidate() {
            this.invalidated = true;
            (<Panel>this.parent).invalidate();
        }

        /**
         * Layout this panel. If this panel was invalidated, it will layout its descendants and call doLayout.
         * @method Views.BasePanel#layout
         * @param  {number}   [width]  The suggested width for this panel
         * @param  {number}   [height] The suggested height for this panel
         * @return {number[]}        The effective [width, height] of this panel after layout
         */
        public layout(w?:number, h?:number):number[] {
            if (this.invalidated) {
                var margin = this.getMargin();
                var minSize = this.getMinSize();
                if (w === undefined)
                    w = 0;
                else
                    w -= (margin[0]+margin[2]);
                if (h === undefined)
                    h = 0;
                else
                    h -= (margin[1]+margin[3]);

                w = Math.max(w, minSize[0]);
                h = Math.max(h, minSize[1]);
                this.panels.forEach(function (p:Panel) {
                    p.layout(w, h);
                    })
                this.doLayout(w, h);
                this.panels.forEach(function (p:Panel) {
                    var ppos = p.getPos();
                    var psize = p.getOuterSize();
                    w = Math.max(w, ppos[0] + psize[0] - margin[0]);
                    h = Math.max(h, ppos[1] + psize[1] - margin[1]);
                    });
                this.setSize(w, h);
                this.invalidated = false;
            }
            return this.getSize();
        }

        /**
         * Actually do the layout, assuming the descendants are laid out properly.
         * @method Views.BasePanel#doLayout
         * @param  {number} width  The suggested width for this panel
         * @param  {number} height The suggested height for this panel
         */
        doLayout(w:number, h:number) {
        }
    }

    /**
     * A base class for panel "decorators".
     * These are panels that add functionality to their child panels.
     * Strictly speaking not decorators, as they find a place in the composition hierarchy.
     * @class Views.PanelDecorator
     * @extends Views.BasePanel
     */
    export class PanelDecorator extends BasePanel {
        decoratedPanel: Panel;
        constructor(parent: View, name:string, role:string, args?: string[]) {
            super(parent, name, role, args);
        }

        public addView(view: View) {
            super.addView(view);
            assert(this.panels.length < 2);
            if (this.panels.length != 0)
                this.decoratedPanel = this.panels[0];
        }

        public getMinSize():number[] {
            if (this.decoratedPanel !== undefined) {
                var sub = this.decoratedPanel.getMinSize();
                var margins = this.getMargin();
                sub[0] += margins[0] + margins[2];
                sub[1] += margins[1] + margins[3];
                return sub;
            }
            return super.getMinSize();
        }
        public getOffset(): number[] {
            if (this.decoratedPanel !== undefined) {
                return this.decoratedPanel.getOffset();
            }
            return super.getOffset();
        }
    }
}

/**
 * The model base classes
 * @namespace Model
 */
module Model {
    /**
     * The model manager; a singleton that manages all known chromosome sets.
     * @class Model.ModelManager
     */
    export class ModelManager {

        /**
         * the chromosome sets, indexed by Id.
         * @member Model.ModelManager#chromosomeSets
         * @type {{string: ChromosomeSet}}
         * @private
         */
        private chromosomeSets: D3.Map;

        /**
         * @constructor Model.ModelManager
         * @protected
         */
        constructor() {
            this.chromosomeSets = d3.map();
        }

        /**
         * Get a ChromosomeSet by its Id
         * @method Model.ModelManager#getChromosomeSet
         * @param {string} id the Id of the set, often a filename.
         * @return {Model.ChromosomeSet} the chromosome set
         */
        public getChromosomeSet(id: string): ChromosomeSet {
            return this.chromosomeSets.get(id);
        }

        /**
         * remove a chromosome set
         * @method Model.ModelManager#removeCSet
         * @param {Model.ChromosomeSet} cs the chromosome set
         */
        public removeCSet(cs: ChromosomeSet) {
            this.chromosomeSets.remove(cs.id);
        }

        /**
         * remove a chromosome set, by name
         * @method Model.ModelManager#removeCSetById
         * @param {string} id the chromosome set ID
         */
        public removeCSetById(id: string) {
            this.chromosomeSets.remove(id);
        }
        public load_str(content: string, id:string, type: string, chro?: string): ChromosomeSet {
            var parser : Parsers.Parser = Parsers.registry.getParser(type);
            assert(parser !== undefined);
            if (chro !== undefined && chro != '') {
                id += id + '#' + chro;
            }
            var lr:Parsers.LineReader = new Parsers.LineReaderImpl(content);
            var cs :ChromosomeSet = parser.parse_str(lr, id, chro);
            this.chromosomeSets.set(id, cs);
            return cs;
        }
        public load_url(url: string, type: string, chro?: string): ChromosomeSet {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.open( "GET", url, false);
            xmlHttp.send( null );
            return this.load_str(xmlHttp.responseText, url, type, chro);
        }

        /**
         * get a Chromosome, defined by chromosome set name and chromosome name.
         * @method Model.ModelManager#getChromosome
         * @param {string} chro the chromosome set ID
         * @param {string} modelId the chromosome ID (optional)
         * @return {Model.AbstractChromosomeModel} the chromosome
         */
        public getChromosome(chro: string, modelId?: string): AbstractChromosomeModel {
            if (modelId !== undefined) {
                var cs: ChromosomeSet = this.chromosomeSets.get(modelId);
                return cs.getChromosome(chro);
            } else {
                this.chromosomeSets.forEach(function(id, cs: ChromosomeSet) {
                    var chrom: AbstractChromosomeModel = cs.getChromosome(chro);
                    if (chrom !== undefined) {
                        return chrom;
                    }
                });
            }
            return undefined;
        }
    }
    export var manager: ModelManager = new ModelManager();

    /**
     * A comparator used to sort {@linkcode Model.Feature} by start and end.
     * @function Model.compareFeatures
     * @param  {Model.Feature}       a first feature
     * @param  {Model.Feature}       b second feature
     * @return {number}          a signed number indicating relative position
     */
    export function compareFeatures(a: Feature, b:Feature): number {
      var r:number = a.start - b.start;
      if (r != 0) return r;
      return a.end - b.end;
    }

    /**
     * Iterates over a chromosome model for histogram/density maps.
     * @class Model.AbstractIterator
     * @extends Model.ChromosomeIterator
     * @abstract
     */
    export class AbstractIterator<T> implements ChromosomeIterator<T> {
        private chro:AbstractChromosomeModel;
        private features:Feature[];
        private idx: number;
        private bisect = d3.bisector(function(f:Feature) {return f.start;}).left;
        accumulator: T;
        pos: number;
        nextPos: number;

        /**
         * @constructor Model.AbstractIterator
         */
        constructor() {
        }

        /**
         * Set the Chromosome for the iterator.
         * @method Model.AbstractIterator#setChromosome
         * @param {Model.AbstractChromosomeModel} chro the chromosome
         */
        public setChromosome(chro: AbstractChromosomeModel) {
            this.chro = chro;
            this.features = this.chro.getFeatures();
            this.reset();
        }

        /**
         * Reset the iterator to the start of the chromosome.
         * @method Model.AbstractIterator#reset
         */
        public reset() {
            this.idx = 0;
            this.pos = this.chro.start;
        }

        /**
         * Set the position of the iterator
         * @method Model.AbstractIterator#setPos
         * @param {number} pos the position of the iterator (in chromosome coordinates)
         */
        public setPos(pos:number): void {
            this.pos = pos;
            this.idx = this.bisect(this.features, pos);
        }

        /**
         * Compute the returned value after a step of iteration
         * @method Model.AbstractIterator#finalValue
         * @return {T}        the value accumulated during the iteration step
         */
        public finalValue(): T {
            return this.accumulator;
        }

        /**
         * Give an initial empty value of the required type for an iteration step.
         * @method Model.AbstractIterator#initialValue
         * @abstract
         * @return {T}          the initial value
         */
        initialValue(): T {
            return undefined;
        }

        /**
         * Add data from the feature to the accumulator
         * @method Model.AbstractIterator#addValue
         * @abstract
         * @param  {Feature} f the feature
         */
        addValue(f:Feature) {
        }

        /**
         * Move to a new position and calculate a value for the interval from the current to the new position.
         * @method Model.AbstractIterator#moveTo
         * @param {number} pos the new chromosome position (in chromosome coordinates)
         * @return {T} the computed value for that interval.
         */
        moveTo(end:number): T {
            // invariant: values[idx-1].end <= pos <= values[idx].start
            this.nextPos = end;
            this.accumulator = this.initialValue();
            var startI:number = this.idx;
            if (startI >= this.features.length) {
                return this.accumulator;
            }
            var f:Feature = this.features[startI];
            while (startI < this.features.length && f.start < end ) {
                this.addValue(f);
                if (f.end > end) {
                    break;
                }
                startI++;
                f = this.features[startI];
            }
            this.idx = startI;
            var accumulator = this.finalValue();
            this.pos = end;
            return accumulator;
        }

        /**
         * Compute the position for the next "natural" break in values.
         * A moveTo within that position is guaranteed to have a uniform value.
         * @method Model.AbstractIterator#nextBreak
         * @return {number} a chromosome position
         */
        public nextBreak(): number {
            if (this.idx >= this.features.length)
                return this.chro.end;
            var f:Feature = this.features[this.idx];
            if (this.pos <= f.start)
                return f.start;
            if (this.pos < f.end || this.idx+1 >= this.features.length)
                return f.end;
            else
                return this.features[this.idx+1].start;
        }
    }

    /**
     * A chromosome composite that can stand in for a combination of multiple models of (hopefully the same) chromosome
     * @class Model.MultiChromosome
     * @extends Model.AbstractChromosomeModel
     */
    export class MultiChromosome implements AbstractChromosomeModel {
        /**
         * The latest chromosome's name
         * @member Model.MultiChromosome#name
         * @type {string}
         */
        public name: string = "";
        /**
         * The minimum of all chromosome positions
         * @member Model.MultiChromosome#start
         * @type {number}
         */
        public start:number = Number.POSITIVE_INFINITY;
        /**
         * The maximum of all chromosome positions
         * @member Model.MultiChromosome#end
         * @type {number}
         */
        public end: number = 0;

        chromosomes:AbstractChromosomeModel[] = [];

        public addChromosome(chro: AbstractChromosomeModel):boolean {
            if (this.chromosomes.indexOf(chro) !== -1) {
                return false;
            }
            this.chromosomes.push(chro);
            this.name = chro.name;
            var start = Math.min(this.start, chro.start);
            var end = Math.max(this.end, chro.end);
            if (start != this.start || end != this.end) {
                this.start = start;
                this.end = end;
                this.chromosomes.forEach(
                    function(chro: AbstractChromosomeModel) {
                        chro.start = start;
                        chro.end = end;
                    }
                );
            }
            return true;
        }

        public getFeatureNames(): string[] {
            var names: string[] = [];
            this.chromosomes.forEach(
                function(chro: AbstractChromosomeModel) {
                    names = names.concat(chro.getFeatureNames());
                });
            return names;
        }

        public getNamedFeature(name: string): NamedFeature {
            var features: NamedFeature[] = [];
            this.chromosomes.forEach(
                function(chro: AbstractChromosomeModel) {
                    features.push(chro.getNamedFeature(name));
                });
            // TODO: Take widest?
            if (features.length > 0) {
                return features[0];
            }
            return undefined;
        }

        public getFeatures(): Feature[] {
            return [];
        }
    }

}

/**
 * The base classes for the parsers for the various file formats.
 * @namespace Parsers
 */
module Parsers {
    /**
     * A singleton registry for parsers for different file types.
     * @class Parsers.ParserRegistry
     */
    export class ParserRegistry {
        private registry: D3.Map = d3.map();

        /**
         * the names of all parser types
         * @method Parsers.ParserRegistry#parserNames
         * @return {string[]}
         */
        public parserNames(): string[] {
            return this.registry.keys();
        }

        /**
         * Register a parser for a given file type
         * @method Parsers.ParserRegistry#register
         * @param {string} name the name of the parser (and its file type)
         * @param {Parsers.Parser} parser the parser
         */
        public register(name:string, parser:Parser) {
            this.registry.set(name, parser);
        }

        /**
         * get a parser by type
         * @method Parsers.ParserRegistry#getParser
         * @param {string} name the name of the parser
         * @return {Parsers.Parser} the parser
         */
        public getParser(name:string) : Parser {
            return this.registry.get(name);
        }
    }

    export class LineReaderImpl implements LineReader {
        /**
         * The content of the file
         * @type {string}
         */
        private data:string;

        /**
         * Current cursor position
         * @type {Number}
         */
        private pos:number = 0;

        /**
         * File line separator
         * @type {String}
         */
        private separator = '\n';

        /**
         * @constructor
         */
        constructor(data:string) {
            this.data = data;

            var p = data.indexOf(this.separator);
            if (p == -1) {
                this.separator = '\r';
            } else if (p > 0) {
                if (data.charAt(p-1) == '\r')
                    this.separator = '\r';
            }
        }

        /**
         * Returns the next valid line.
         * Null if the last line was already reached.
         *
         * Invalid lines:
         *  - line beginning with # character
         *
         * @return {string}
         */
        public next():string {
            if (this.pos < 0)
                return null;

            var line:string = null;
            var nextPos = this.data.indexOf(this.separator, this.pos);

            while (nextPos == this.pos) {
                this.pos += 1;

                while (this.data.charAt(this.pos) == this.separator){
                    this.pos += 1;
                }

                nextPos = this.data.indexOf(this.separator, this.pos);
            }

            if (nextPos == -1){
                nextPos = this.data.length;
            }

            if (nextPos > this.pos) {
                line = this.data.substring(this.pos, nextPos);
                this.pos = nextPos + 1;

                while (this.data.charAt(this.pos) == this.separator){
                    this.pos += 1;
                }
            } else {
                this.pos = -1;
            }

            return line;
        }

        /**
         * Reset the cursor to the initial position
         */
        public reset() {
            this.pos = 0;
        }

        /**
         * Sets the position to read from the given point.
         * @type {RegExp} regex
         */
        public setStartPoint(regex:RegExp){
            var position = this.data.search(regex);
            if( position >= 0 ){
                this.pos = position;
            }
        }
    }

    export class MultiPhaseChromosomeSet {
        private parser: Parser;
        private file: LineReader;
        public id: string;
        private chromosomes: D3.Map = d3.map();
        private names: D3.Set = d3.set();

        constructor(id:string, parser:Parser, file:LineReader) {
            this.id = id;
            this.parser = parser;
            this.file = file;
        }

        public parseNames() {
            // TODO: Put this in the parsers, so we can vary
            var lines = this.file;
            var line:string;
            lines.next(); // skip first
            while ((line = lines.next()) !== null) {
                if (line.charAt(0) == '#')
                    continue;
                var pos = line.indexOf(' ');
                if (pos == -1)
                    pos = line.indexOf('\t');
                assert (pos > 0);
                this.names.add(line.substring(0, pos));
            }
            lines.reset();
        }
        public addChromosome(name:string, chro:Model.AbstractChromosomeModel) {
            this.chromosomes.set(name, chro);
        }
        public getChromosome(name:string): Model.AbstractChromosomeModel {
            if (this.chromosomes.has(name)) {
                return this.chromosomes.get(name);
            }
            this.file.reset();
            var crSet:Model.ChromosomeSet = this.parser.parse_str(this.file, this.id, name);
            var chro = crSet.getChromosome(name);
            if (chro !== undefined)
                this.chromosomes.set(name, chro);
            return chro;
        }
        public getChromosomeNames(): string[] {
            return this.names.values();
        }
    }

    /**
     * The {Parsers.ParserRegistry} singleton
     * @variable {Parsers.registry}
     */
    export var registry : ParserRegistry = new ParserRegistry();
}
