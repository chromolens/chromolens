///<reference path="mainView.ts" />

/**
 * Main view classes of the genome viewer
 * @namespace GenomeViewer
 */
module GenomeViewer {
    /**
     * The HTML-based view that shows all the available models.
     * @class GenomeViewer.ModelsView
     */
    class ModelsView extends Views.BaseView {
        fileLoadWidget: D3.Selection;
        fileNamesSelect: D3.Selection;
        parsersSelect: D3.Selection;
        chroSelect: D3.Selection;
        addButton: D3.Selection;
        forgetButton: D3.Selection;
        destViewSelect: D3.Selection;
        viewTypeSelect: D3.Selection;
        filenames: string[] = [];
        constructor(parent: Views.View, name:string, role:string, args?) {
            super(parent, name, role, args);
            var this_in_closure: ModelsView = this;
            var form: D3.Selection = d3.selectAll("#ModelsView");
            this.parsersSelect = form.select("#parsers");
            var parsers: D3.UpdateSelection = this.parsersSelect.selectAll("input").data(Parsers.registry.parserNames());
            var input_spans = parsers.enter().append("span").attr("class", function(d){return d;});
            input_spans.append("input")
                .attr("type", "radio")
                .attr("name", "parsers_choice")
                .attr("value", function(d){return d;});
            input_spans.append("span").text(function(d){return String(d);});

            this.fileLoadWidget = form.select("#file");
            this.fileLoadWidget.on("change", function() {
                document.getElementById("Loading").style.display = "block";
                this_in_closure.fileLoad();
            })
            this.fileNamesSelect = form.select("#filenames").on("change", function(){this_in_closure.setChroView();});
            this.chroSelect = form.select("#chromosomes");
            this.chroSelect.on("change", function() { this_in_closure.adjustViewSelect(); });
            this.destViewSelect = form.select("#dest_view");
            this.viewTypeSelect = form.select("#view_type");
            this.forgetButton = form.select("#forget");
            this.forgetButton.attr("disable", true).on("click", function(){this_in_closure.forgetFile();});
            this.addButton = form.select("#add").on("click", function(){
                document.getElementById("Loading").style.display = "block";
                this_in_closure.doAddView();
            })
        }

        public setChroView(filename?: string) {
            if (filename === undefined) {
                var opt = <HTMLOptionElement>this.fileNamesSelect.selectAll("option").filter(function(d){return this.selected;}).node();
                filename = opt.value;
            }
            var cSet: Model.ChromosomeSet = Model.manager.getChromosomeSet(filename);
            var names:string[] = cSet.getChromosomeNames();
            var chro: D3.UpdateSelection = this.chroSelect.selectAll("option").data(names);
            chro.enter().append("option");
            chro.text(function(d){return d;});
            chro.exit().remove();
            var viewNames:string[] = Views.registry.getVFsForModel(cSet.type);
            var sel: D3.UpdateSelection = this.viewTypeSelect.selectAll("option").data(viewNames);
            sel.enter().append("option");
            sel.text(function(d){return d;});
            sel.exit().remove();
        }

        public adjustViewSelect() {
            var opt = <HTMLOptionElement>this.chroSelect.selectAll("option").filter(function(d){return this.selected;}).node();
            var chromosome = opt.value;
            assert(chromosome !== undefined);
            var existingViews = this.destViewSelect.selectAll("option");
            var selectedView = <HTMLOptionElement>existingViews.filter(function(d){return (<HTMLOptionElement>this).selected;}).node();
            var correspondingView = <HTMLOptionElement>existingViews.filter(function(d){return this.value == chromosome;}).node();
            if (correspondingView === null) {
                correspondingView = <HTMLOptionElement>existingViews.node(); // new view
            }
            if (selectedView !== undefined && correspondingView != selectedView) {
                selectedView.selected = null;
            }
            correspondingView.selected = true;
        }

        public fileLoad() {
            var evt = d3.event;
            var target: HTMLInputElement = <HTMLInputElement>sourceEvent().target;
            var files: FileList = target.files;
            var this_in_closure: ModelsView = this;
            if (files.length == 1) {
                var file: File = files[0];
                var reader: FileReader = new FileReader();
                reader.onload=function(e: Event) {
                    var radio = <HTMLInputElement>this_in_closure.parsersSelect.selectAll("input").filter(function(d){return this.checked;}).node();
                    var parser_type = radio.value;
                    this_in_closure.loadFile(file.name, parser_type, reader.result);
                    target.value = null;
                    target.files = null;
                }
                reader.readAsText(file);
            }
        }

        public loadFile(filename:string, parser_type:string, content?:string) {
            var self = this;
            if (content === undefined) {
                var req:XMLHttpRequest = new XMLHttpRequest();
                req.onload = function() {
                    self.loadFile(filename, parser_type, this.responseText);
                }
                req.open("get", filename, true);
                try {
                    req.send();
                } catch (e) {
                    alert(e);
                }
                return;
            }
            try {
                var cSet: Model.ChromosomeSet =
                    Model.manager.load_str(content, filename, parser_type);
                this.filenames.push(filename);
                var filenames: D3.UpdateSelection = this.fileNamesSelect.selectAll("option").data(this.filenames);
                filenames.enter().append("option");
                filenames
                    .attr("selected", function(d) {return (d == filename)?"selected":"";})
                    .text(function(d){return d;});
                this.setChroView(filename);
                this.addButton.attr('disabled', null);
                this.forgetButton.attr('disabled', null);
                document.getElementById("Loading").style.display = "none";
            } catch (e) {
                alert(e);
            }
        }

        public forgetFile() {
            var currentFileSel = this.fileNamesSelect.selectAll("option").filter(function(d){return this.selected;});
            var currentFile = <HTMLOptionElement>currentFileSel.node();
            Model.manager.removeCSetById(currentFile.value);
            // TODO: Recompute chroSelect from scratch. Do not try to remove.
            currentFileSel.remove();
            if (this.fileNamesSelect.selectAll("option").empty()) {
                this.addButton.attr('disabled', true);
                this.forgetButton.attr('disabled', true);
            }
        }

        public doAddView() {
            var currentFile = <HTMLOptionElement>this.fileNamesSelect.selectAll("option").filter(function(d){return this.selected;}).node();
            var currentChro = <HTMLOptionElement>this.chroSelect.selectAll("option").filter(function(d){return this.selected;}).node();
            var chro:Model.AbstractChromosomeModel = Model.manager.getChromosome(currentChro.value, currentFile.value);
            assert(chro!=null);
            var viewTypeName = <HTMLOptionElement>this.viewTypeSelect.selectAll("option").filter(function(d){return this.selected;}).node();
            var destViewName = <HTMLOptionElement>this.destViewSelect.selectAll("option").filter(function(d){return this.selected;}).node();
            var panel:Views.View;
            var mainPanel:Views.Panel = <Views.Panel>this.getViewPath(['', '#MainPanel']);
            if (destViewName.value == 'new') {
                panel = mainPanel.createSubView("PowerPanel", chro.name, 'panel');
                this.destViewSelect.append("option").text(panel.name);
            } else {
                panel = mainPanel.getSubView('#'+destViewName.value);
            }
            var view = panel.createSubView(viewTypeName.value, viewTypeName.value, "content", {});
            // sub view first
            view.setChromosome(chro);
            panel.setChromosome(chro);
            view.invalidate();
            mainPanel.layout();
            document.getElementById("Loading").style.display = "none";
        }

        static create(parent: Views.View, name:string, role:string, args?): ModelsView {
            return new ModelsView(parent, name, role, args);
        }
    }
    Views.registry.registerVF(ModelsView.create, "ModelsView");

}
