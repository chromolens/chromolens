///<reference path="../node_modules/DefinitelyTyped/jqueryui/jqueryui.d.ts" />
///<reference path="mainView.ts" />

/**
 * Main view classes of the genome viewer
 * @namespace GenomeViewer
 */
module GenomeViewer {
    /**
     * A text field with autocomplete, that allows access to all {@linkcode Model.NamedFeatures} in a chromosome.
     * When a feature is selected, zooms to the selection.
     *
     * @class GenomeViewer.FeatureFinder
     * @extends Views.BaseView
     */
    class FeatureFinder extends Views.BaseView {
        public names:string[];
        nameSelect:JQuery;
        constructor(parent: Views.View, name:string, role:string, args?) {
            // TODO: get signal from focusView when multiple focusview; or create 1 FeatureFinder/FocusView
            super(parent, name, role, args);
            try {
                this.nameSelect = $("#features");
            } catch (ReferenceError) {
                console.log("no jquery");
            }
        }

        public setChromosome(model: Model.AbstractChromosomeModel) {
            super.setChromosome(model);
            var this_in_closure = this;
            this.names = this.chromosome.getFeatureNames();
            function change(event, ui) {
                if (ui.item !== null && ui.item !== undefined)
                    this_in_closure.changeValue(ui.item.value);
                this_in_closure.changeValue(event.target.value);
            }
            if (this.nameSelect !== undefined) {
                this.nameSelect.autocomplete({
                    'source': this.names,
                    'close': change,
                    'change': change});
            }
        }

        public changeValue(name:string) {
            var feature:Model.NamedFeature = this.chromosome.getNamedFeature(name);
            if (feature !== undefined && feature !== null) {
                var parent = <Views.Panel>this.parent;
                var scale = <powerfocusI>parent.getScale();
                var oldFocus = scale.focus();
                var newScale = scale.copy();
                newScale.regionFocus(feature.start, feature.end, 0.4);
                // TODO : Actually check that it did not come before end of previous change, we get interference with intermediates.
                // We may have to queue changes.
                if (oldFocus != newScale.focus() || scale.exponent() != newScale.exponent()) {
                    if (feature.start <= oldFocus && oldFocus <= feature.end) {
                        parent.setScale(newScale, 2000);
                    } else {
                        var intermediate = newScale.copy();
                        intermediate.regionFocus(Math.min(oldFocus, feature.start), Math.max(oldFocus, feature.end), 0.4);
                        if (intermediate.exponent() >= scale.exponent()) {
                            // don't bother to zoom in to common region!
                            parent.setScale(newScale, 2000);
                        } else {
                            parent.setScale(intermediate, 2000);
                            window.setTimeout(function() {
                                parent.setScale(newScale, 2000);
                                }, 2300);
                        }
                    }
                    // TODO: delay
                }
            }
        }

        static create(parent: Views.View, name:string, role:string, args?): FeatureFinder {
            return new FeatureFinder(parent, name, role, args);
        }
    }
    Views.registry.registerVF(FeatureFinder.create, "FeatureFinder");

}
