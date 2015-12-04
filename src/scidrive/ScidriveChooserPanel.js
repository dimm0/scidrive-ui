define([
  "dojo/_base/declare", 
  "dojo/_base/array", 
  "dojo/_base/lang",
  "dojo/query",
  "dojo/dom-style",
  "dojo/dom-construct",
  "dojo/keys",
  "dojo/on",
  "dojo/fx/Toggler",
  "dojo/fx",
  "dojo/data/ItemFileWriteStore",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "dijit/_WidgetsInTemplateMixin",
  "dijit/layout/BorderContainer",
  "dijit/layout/TabContainer",
  "dijit/layout/ContentPane",
  "dijit/Toolbar",
  "dijit/Tooltip",
  "dijit/ProgressBar",
  "dijit/form/Button",
  "dijit/form/Select",
  "dijit/form/MultiSelect",
  "dijit/form/ToggleButton",
  "dijit/form/TextBox",
  "dijit/form/CheckBox",
  "dijit/Dialog",
  "dojox/layout/TableContainer",
  "scidrive/ChooserFilePanel",
  "scidrive/DataGrid",
  "scidrive/VosyncReadStore",
  "dojox/grid/DataGrid",
  "dojo/text!./templates/ScidriveChooserPanel.html"
  ],
  function(declare, array, lang, query, domStyle, domConstruct, keys, on, Toggler, coreFx, ItemFileWriteStore, WidgetBase, TemplatedMixin, WidgetsInTemplateMixin,
    BorderContainer, TabContainer, ContentPane, Toolbar, Tooltip, ProgressBar, Button, Select, MultiSelect, ToggleButton, TextBox, CheckBox, Dialog, TableContainer,
    FilePanel, DataGrid, VosyncReadStore, DojoDataGrid, template) {
    return declare([WidgetBase, TemplatedMixin, WidgetsInTemplateMixin], {
        templateString: template,

        panel1: null,

        uploadPanelToggler: null,
        uploadPanelTogglerState: false,

        updateCurrentPanel: function(panel) {

          var that = this;
          var path = this.panel1.gridWidget._currentPath;
          var pathTokens = path.split('/');

          function elmToHref(element, index, array){
              if(index > 0)
                  return "<span class='pathelm' name='"+element+"'>"+element+"</span>";
              else
                  return "<span class='pathelm' name=''>Root</span>";
          }

          var pathHtml = pathTokens.map(elmToHref);

          var curPath = pathHtml.join(" ▸ ");
          this.pathSelect2.innerHTML = curPath;

          query(".pathelm").forEach(function(item, num) {
              item.onclick = function(evt) {
                  var path = pathTokens.slice(0,num+1).join("/");
                  if(path.length == 0)
                      path = "/";
                  that.panel1._updateStore(path);
              };
          });
        },

        postCreate: function() {
            this.inherited(arguments);
            var panel = this;
        },

        startup: function() {
          this.inherited(arguments);
          this.uploadPanelToggler = new Toggler({
            node: this.fileuploads.id,
            showFunc: coreFx.wipeIn,
            hideFunc: coreFx.wipeOut
          });
          this.uploadPanelToggler.hide();
        },

        _logout: function() {
          if(null != this.current_panel)
            this.current_panel._logout();
          else
            console.error("Not logged in.");
        },

        _refresh: function() {
          this.panel1._refresh();
        },

        loginToVO: function(vospace, component) {
            if(!vospace) {
                console.error("Unknown vospace "+id);
                return;
            }

            var panel = this;

            var store = new VosyncReadStore({
                vospace: vospace,
                numRows: "items"
            });

            if(!vospace.credentials) {
                vospace.login(component, true);
            } else {
              if(component != null) {
                  store.parentPanel = component;
                  component.setStore(store);
              } else {
                  this.panel1 = new FilePanel({
                      login: this.loginToVO,
                      store: store,
                      parentPanel: this
                      }).placeAt(this.panel1contentpane);
                  this.panel1.store.parentPanel = this.panel1;
                  this.updateCurrentPanel(this.panel1);
              }
            }
        },


        hideUploadPanel: function() {
          var haveUploads = (this.panel1 != undefined && this.panel1._isUploading) || (this.panel2 != undefined && this.panel2._isUploading);


          if(this.uploadPanelTogglerState && !haveUploads) {
            this.uploadPanelTogglerState = false;
            this.uploadPanelToggler.hide();
          }
        },

        showUploadPanel: function() {
          if(!this.uploadPanelTogglerState) {
            this.uploadPanelTogglerState = true;
            this.uploadPanelToggler.show();
          }
        },

        _refreshRegions: function() {
          if(this.loginSelect.getOptions().length == 0) {
            this.loginSelect.addOption(this._getCurrentRegions());
          } else {
            this.loginSelect.updateOption(this._getCurrentRegions());
          }
        }

    });

});