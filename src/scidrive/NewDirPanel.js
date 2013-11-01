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
    "dojox/layout/TableContainer",
    "scidrive/XMLWriter",
    "scidrive/OAuth",
    "dojo/text!./templates/NewDirPanel.html"
],

function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, on, keys, Form, Button, ValidationTextBox, TableContainer, XMLWriter, OAuth, template) {
  return declare( "scidrive.NewDirPanel", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
    // summary:
    //      Widget building the form for new directory creation dialog

    templateString: template,

    postCreate: function(args) {
        this.inherited(arguments);
        var that = this;
        on(this.submitButton, "click", function(evt) {
            if(that.newDirForm.validate()) {
                that.newDirForm.execute();
            }
        });

    },

    startup: function() {
        this.inherited(arguments);
    },

    _mkdir: function() {
      var that = this;
      var nodeid = this.current_panel.store.getNodeVoId(this.current_panel.gridWidget._currentPath+"/"+this.newContNodeName.get('value'));
      var writer = new XMLWriter();
      var nodeTemplate = writer.formatXml(writer.createNewNodeXml("ContainerNode", nodeid, this.current_panel.store.vospace.id));

      dojo.xhrPut(scidrive.OAuth.sign("PUT", {
       url: encodeURI(this.current_panel.store.vospace.url+"/nodes"+this.current_panel.gridWidget._currentPath+"/"+this.newContNodeName.get('value')),
       putData: nodeTemplate,
       headers: { "Content-Type": "application/xml"},
       handleAs: "text",
       load: function(data){
          that.current_panel._refresh();
        },
        error: function(data, ioargs) {
          console.error(data);
        }
      }, this.current_panel.store.vospace.credentials));

      this.getParent().hide();
    },

    _onMkDirKey: function(evt) {
      if(!evt.altKey && !evt.metaKey && evt.keyCode === keys.ENTER){
        if(this.newDirForm.validate()) {
            this.newDirForm.execute();
        }
      }
    }
  });
});