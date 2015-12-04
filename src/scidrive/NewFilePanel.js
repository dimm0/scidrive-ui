define( [
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/on",
    "dojo/keys",
    "dijit/form/Form",
    "dijit/form/Button",
    "dijit/form/ValidationTextBox",
    "dijit/focus",
    "dojox/layout/TableContainer",
    "scidrive/XMLWriter",
    "dojo/text!./templates/NewFilePanel.html"
],

function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, on, keys, Form, Button, ValidationTextBox, focusUtil, TableContainer, XMLWriter, template) {
    return declare( "scidrive.NewFilePanel", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        // summary:
        //      Widget building the form for new file creation dialog

        templateString: template,

        postCreate: function(args) {
            this.inherited(arguments);
            var that = this;
            on(this.autoFilenameCheckbox, "change", function(evt) {
                that.newDataNodeName.set("disabled", evt);
                that.newDataNodeName.set("required", !evt);
                that.urlInput.set("required", evt);
                if(!evt)
                  focusUtil.focus(that.newDataNodeName);
                else
                  focusUtil.focus(that.urlInput);
            });

            on(this.submitButton, "click", function(evt) {
                if(that.newFileForm.validate()) {
                    that.newFileForm.execute();
                }
            });

        },

        startup: function() {
            this.inherited(arguments);
            this.newDataNodeName.set("required", false);
        },

        _mkfile: function() {
          var fileName = ".auto";
          if(!this.autoFilenameCheckbox.get('value')) {
            fileName = this.newDataNodeName.get('value');
          }
          
          var cur_panel = this.current_panel;
          if(this.urlInput.get('value') !== ""){
            cur_panel.store.pullToVoJob(cur_panel.store.getNodeVoId(cur_panel.gridWidget._currentPath+"/"+fileName),
              this.urlInput.get('value'));
          } else { // create empty file
            if(cur_panel.gridWidget._currentPath == '/' && !cur_panel.store.vospace.isShare) {
                alert("Regular files can't be created in root folder.");
            } else {
              var writer = new XMLWriter();
              var nodeid = cur_panel.store.getNodeVoId(cur_panel.gridWidget._currentPath+"/"+this.newDataNodeName.get('value'));
              var nodeTemplate = writer.formatXml(writer.createNewNodeXml("DataNode", nodeid, cur_panel.store.vospace.id));
              cur_panel.store.vospace.request(
                  encodeURI(cur_panel.store.vospace.url+"/nodes"+cur_panel.gridWidget._currentPath+"/"+this.newDataNodeName.get('value')),
                  "PUT", {
                    data: nodeTemplate,
                    headers: { "Content-Type": "application/xml"},
                    handleAs: "text"
                  }
              ).then(
                function(data){
                  cur_panel._refresh();
                },
                function(error) {
                  cur_panel._handleError(error);
                }
              );
            }
          }
          this.getParent().hide();
        },

        _onMkFileKey: function(evt) {
          if(!evt.altKey && !evt.metaKey && evt.keyCode === keys.ENTER){
            if(this.newFileForm.validate()) {
                this.newFileForm.execute();
            }
          }
        }


    });
}
);