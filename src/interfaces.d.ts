///<reference path="../node_modules/DefinitelyTyped/d3/d3.d.ts" />

interface HTMLFileInputElement extends HTMLInputElement {
    files: FileList;
}

/**
 * The model base classes
 * @namespace Model
 */
declare module Model {

    /**
     * A feature that has a position on the chromosome.
     * @class Model.Feature
     * @abstract
     */
    export interface Feature {

        /**
         * The feature's starting position
         * @member Model.Feature#start
         * @type {number}
         */
        start:number;

        /**
         * The feature's ending position
         * @member Model.Feature#end
         * @type {number}
         */
        end: number;
    }

    /**
     * A feature that has a name and position on the chromosome.
     * @class Model.NamedFeature
     * @extends Model.Feature
     * @abstract
     */
    export interface NamedFeature extends Feature {

        /**
         * The feature's name. It may not be unique.
         * @member Model.NamedFeature#name
         * @type {string}
         */
        name: string;
    }


    /**
     * A chromosome which contains other {@linkcode Model.Feature}s.
     * @class Model.AbstractChromosomeModel
     * @extends Model.NamedFeature
     * @abstract
     */
    export interface AbstractChromosomeModel extends NamedFeature {

        /**
         * Get the name of all {@linkcode Model.NamedFeature}s in the chromosome.
         * @method Model.AbstractChromosomeModel#getFeatureNames
         * @return {string[]} the names
         */
        getFeatureNames(): string[];

        /**
         * Get a {@linkcode Model.NamedFeature} by name. Since it is not unique, may be a random instance.
         * @method Model.AbstractChromosomeModel#getNamedFeature
         * @param {string} name the name of the feature
         * @return {Model.NamedFeature} the NamedFeature
         */
        getNamedFeature(name:string): NamedFeature;

        /**
         * Get all the {@linkcode Model.Feature}s of the chromosome. Should be sorted by {@linkcode Model.compareFeatures}.
         * @method Model.AbstractChromosomeModel#getFeatures
         * @return {Array<Model.Feature>} the {@linkcode Model.Feature}s as an array.
         */
        getFeatures(): Feature[];
    }

    /**
     * A collection of chromosomes, accessible by name.
     * @class Model.ChromosomeSet
     * @abstract
     */
    export interface ChromosomeSet {

        /**
         * The id of the set, often the originating filename.
         * @type {string}
         * @member Model.ChromosomeSet#id
         */
        id: string;

        /**
         * The type of the set, corresponds to file type
         * @type {string}
         * @member Model.ChromosomeSet#type
         */
        type: string;

        /**
         * get a chromosome by name
         * @method Model.ChromosomeSet#getChromosome
         * @param {string} name
         * @return {Model.AbstractChromosomeModel}
         */
        getChromosome(name:string): AbstractChromosomeModel;

        /**
         * get all chromosome names in this set
         * @method Model.ChromosomeSet#getChromosomeNames
         * @return {string[]}
         */
        getChromosomeNames(): string[];
    }

    /**
     * Iterates over a chromosome model for histogram/density maps.
     * @class Model.ChromosomeIterator
     * @abstract
     */
    export interface ChromosomeIterator<T> {

        /**
         * Set the Chromosome for the iterator.
         * @method Model.ChromosomeIterator#setChromosome
         * @param {Model.AbstractChromosomeModel} chro the chromosome
         */
        setChromosome(chro:AbstractChromosomeModel);

        /**
         * Set the position of the iterator
         * @method Model.ChromosomeIterator#setPos
         * @param {number} pos the position of the iterator (in chromosome coordinates)
         */
        setPos(pos:number): void;

        /**
         * Move to a new position and calculate a value for the interval from the current to the new position.
         * @method Model.ChromosomeIterator#moveTo
         * @param {number} pos the new chromosome position (in chromosome coordinates)
         * @return {T} the computed value for that interval.
         */
        moveTo(pos:number): T;

        /**
         * Compute the position for the next "natural" break in values.
         * A moveTo within that position is guaranteed to have a uniform value.
         * @method Model.ChromosomeIterator#nextBreak
         * @return {number} a chromosome position
         */
        nextBreak(): number;

        /**
         * Reset the iterator to the start of the chromosome.
         * @method Model.ChromosomeIterator#reset
         */
        reset(): void;
    }

}

/**
 * The base classes for the parsers for the various file formats.
 * @namespace Parsers
 */
 declare module Parsers {

    export interface LineReader {
        next(): string;
        reset():void;
        setStartPoint(regex: RegExp):void;
        getFirstLines():string[];
    }

    /**
     * A parser for a file format.
     * @class Parsers.Parser
     * @abstract
     *
     */
    export interface Parser {

        /**
         * Parse the content of a file into a ChromosomeSet.
         * @member Parsers.Parser#parse_str
         * @param {string} content the content of a file
         * @param {string} id the id of the file, will become id of the ChromosomeSet
         * @param {string} [chro] only return a single chromosome in the set.
         * @return {Model.ChromosomeSet} the chromosome set as read from content.
         */
        parse_str(content:LineReader, id: string, chro?:string) : Model.ChromosomeSet;
    }
}

/**
 * The View classes
 * @namespace Views
 */
 declare module Views {
    /**
     * A view on a given chromosome
     * @class Views.View
     * @abstract
     */
    export interface View {

        /**
         * a parent view, if any
         * @member Views.View#parent
         * @type {Views.View}
         */
        parent: View;

        /**
         * The name of the view. Unique among siblings.
         * @member Views.View#name
         * @type {string}
         */
        name: string;

        /**
         * The role of the view in its parent.
         * @member Views.View#role
         * @type {string}
         */
        role: string;

        /**
         * The chromosome displayed by that view
         * @member Views.View#parent
         * @type {Model.AbstractChromosomeModel}
         */
        chromosome: Model.AbstractChromosomeModel;

        /**
         * Called for setup after the chromosome is set or changed.
         * @method Views.View#setChromosome
         * @param {Model.AbstractChromosomeModel} chromosome the chromosome model for this view
         */
        setChromosome(chromosome: Model.AbstractChromosomeModel);

        /**
         * get the root of the view hierarchy
         * @method Views.View#getRootView
         * @return {Views.View} the root of the view hierarchy
         */
        getRootView(): View;

        /**
         * get a direct child view by identifier
         * An identifier can be either # + the view ID, the role name, or @ + the view type name.
         * @method Views.View#getSubView
         * @param {any} id the view ID or position
         * @return {Views.View} the child view
         */
        getSubView(id): View;

        /**
         * get a descendant view through a path of identifiers.
         * @method Views.View#getViewPath
         * @param {string[]} path the sequence of view identifiers.
         * @return {Views.View} the descendant view
         */
        getViewPath(path: string[]): View;

        /**
         * Add a child view
         * @method Views.View#addView
         * @param {Views.View} view the child view
         */
        addView(view: View);

        /**
         * Remove a child view
         * @method Views.View#removeView
         * @param {Views.View} view the child view
         * @return {boolean} whether the view was found.
         */
        removeView(view: View): boolean;

        /**
         * create a subview of a given type on this view.
         * @method Views.View#createSubView
         * @param {string} typename the view type
         * @param {string} name the proposed name of the view. May be changed by the parent to preserve uniqueness.
         * @param {string} role the name of the "role" of the view. Many subviews can have the same role.
         * @param [args] extra arguments for creating the view
         * @return {Views.View} the resulting view
         */
        createSubView(typename: string, name:string, role:string, args?);

        /**
         * A view may define a setup, that is a specification of subviews that it creates at construction.
         * Each subview is specified with a string of the following syntax:
         * id.id.id:typename:argn=argv:argn=argv
         *
         * A view of type typename (registered in the ViewManager) will be created with given argument values
         * at a position in the view hierarchy given by the id path. The IDs are relative to the current view,
         * unless prefixed with a '.' (absolute path.) Sub-subviews should be created after the subview, obviously.
         *
         * @method Views.View#getViewSetup
         * @return {string[]}
         */
        getViewSetup(): string[];

        /**
         * Define the existing roles for subviews of this view.
         * @method Views.View#getViewRoles
         * @return {string[]}
         */
        getViewRoles(): string[];

        /**
         * create subviews according to getViewSetup
         * @method Views.View#setupViews
         */
        setupViews();

        /**
         * Get the type name of this view. Defaults to the class name.
         * @method Views.View#getTypeName
         * @return {string}
         */
        getTypeName(): string;

        /**
         * Called on a view when it is removed from its parent
         * @method Views.View#remove
         */
        remove();
    }

    /**
     * Panels, those chromosome views that have a 2d manifestation.
     * @class Views.Panel
     * @extends Views.View
     * @abstract
     */
    export interface Panel extends View {

        /**
         * get the scale used by this panel
         * @method Views.Panel#getScale
         * @return {D3.Scale.LinearScale} the scale
         */
        getScale(): D3.Scale.LinearScale;

        /**
         * (re)set the scale used by this panel
         * @method Views.Panel#setScale
         * @param {D3.Scale.LinearScale} scale    the scale
         * @param {number}               [duration] the duration for the visual transition (ms)
         */
        setScale(scale: D3.Scale.LinearScale, duration?: number);

        /**
         * Create a SVG group for a child panel
         * @method Views.Panel#createViewPort
         * @param  {Views.Panel}        child the child panel
         * @return {D3.Selection}       the {@linkcode D3.Selection} of the SVG group
         */
        createViewPort(child: Panel): D3.Selection;

        /**
         * Get the root panel, i.e. the topmost container in the visual hierarchy
         * @method Views.Panel#getRootPanel
         * @return {Views.Panel} the root panel
         */
        getRootPanel(): Panel;

        /**
         * Get the current position in the panel relative to the container panel
         * @method Views.Panel#getPos
         * @return {number[]} The x and y coordinates, in pixels.
         */
        getPos():number[];

        /**
         * Set the current position of the panel, relative to the container panel
         * @method Views.Panel#setPos
         * @param  {number} x pixels
         * @param  {number} y pixels
         */
        setPos(x:number, y:number);

        /**
         * An offset for the data within this panel. Will be added to the translate operator.
         * @method Views.Panel#getOffset
         * @return {number[]} The [x, y] offsets, in pixels. Usually [0, 0].
         */
        getOffset():number[];

        /**
         * Get a margin that will be applied around this panel.
         * @method Views.Panel#getMargin
         * @return {number[]} The [left, top, right, bottom] margins, in pixels.
         */
        getMargin():number[];

        /**
         * Get the current size of this panel. (excluding the margin.)
         * @method Views.Panel#getSize
         * @return {number[]} The [width, height] of the panel.
         */
        getSize(): number[];

        /**
         * Get the current size of this panel. (including the margin.)
         * @method Views.Panel#getOuterSize
         * @return {number[]}   The [width, height] of the panel.
         */
        getOuterSize(): number[];

        /**
         * Get the minimum (inner) size that the panel expects to occupy.
         * Actual size will depend on the parent's layout algorithm.
         * @method Views.Panel#getMinSize
         * @return {number[]} The minimum [width, height] of the panel.
         */
        getMinSize(): number[];

        /**
         * Set the actual inner size of the panel.
         * @method Views.Panel#setSize
         * @param  {number} w width
         * @param  {number} h [description]
         */
        setSize(width:number, height:number);

        /**
         * Mark this panel (and all its ancestors) as in need of re-layout.
         * @method Views.Panel#invalidate
         */
        invalidate();

        /**
         * Layout this panel. If this panel was invalidated, it will layout its descendants and call doLayout.
         * @method Views.Panel#layout
         * @param  {number}   [width]  The suggested width for this panel
         * @param  {number}   [height] The suggested height for this panel
         * @return {number[]}        The effective [width, height] of this panel after layout
         */
        layout(width?:number, height?:number): number[];

        /**
         * Actually do the layout, assuming the descendants are laid out properly.
         * @method Views.Panel#doLayout
         * @param  {number} width  The suggested width for this panel
         * @param  {number} height The suggested height for this panel
         */
        doLayout(width:number, height:number);

        /**
         * Whether this panel has subpanels. Disregard "structural" subpanels.
         * @method Views.Panel#isEmpty
         * @return {boolean}
         */
        isEmpty():boolean;

        /**
         * When a child panel is added, this method may propose to wrap it
         * in a "decorator" panel in the containment hierarchy.
         * @method Views.Panel#getDecorator
         * @param  {string}     name the name of the child panel
         * @param  {string}     role the role of the child panel
         * @return {Panel}      the decorator Panel, or undefined.
         */
        getDecorator(name:string, role:string): Panel;
    }

    /**
     * Signature of factory functions for views and panels.
     * @class Views.ViewFactory
     * @abstract
     */
    export interface ViewFactory {

        /**
         * The factory function
         * @method Views.ViewFactory#call
         * @param {Views.View} parent the parent view
         * @param {string} name the name of the view that will be created. Must be unique within parent.
         * @param {string} role the role of the child view within parent.
         * @param [args] {any} optional arguments
         * @return {Views.View} the created view.
         */
        (parent: View, name:string, role:string, args?): View;
    }
}
