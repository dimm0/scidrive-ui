define( [
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojox/grid/DataGrid",
    "dojo/request/xhr",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dijit/form/Button",
    "dijit/Tooltip",
    "dojo/text!./templates/AccountSettings.html"
],

function(declare, _WidgetBase, _TemplatedMixin, ContentPane, xhr, domConstruct, domStyle, Button, Tooltip, template) {
    return declare( "scidrive.AccountSettings", [_WidgetBase, _TemplatedMixin], {

        templateString: template,
        accountName: "account",
        layout: [{
            'rows': [
                {'name': "name", 'field': "name", 'width': "200px"},
                {'name': "id", 'field': "id"}
            ]
        }],

        postCreate: function(args) {
            var that = this;
            this.inherited(arguments);

            var addButton1 = new Button({
                label: "Link VAO OpenID",
                style: "margin-top: 15px; margin-left: 15px;",
                onClick: function() {
                    var url = that.panel.current_panel.store.vospace.url + "/1/account/info/identity?provider=vao";

                    that.panel.current_panel.store.vospace.request(
                        url, 
                        'PUT'
                    ).then(function(redirect) {
                        console.debug(redirect);
                        that._popupAuthWindow = window.open(
                            redirect, "",
                            "width=" + 400 + ",height=" + 400 +
                            ",status=1,location=1,resizable=yes");
                        that._authCheckInterval = window.setInterval(function() {
                            console.debug("Checking window to close");
                            if (!that._popupAuthWindow || that._popupAuthWindow.closed) {
                                that._popupAuthWindow = null;
                                // var darkCover = window.document.getElementById(window.popupManager.constants['darkCover']);
                                // if (darkCover) {
                                //     darkCover.style.visibility = 'hidden';
                                // }
                                if ((null !== that._authCheckInterval)) {
                                    window.clearInterval(that._authCheckInterval);
                                    that._authCheckInterval = null;
                                }
                                console.debug("Done!");
                                that._loadAliases();
                            }
                        }, 80);
                    },
                    function(error) {
                        console.debug("error");
                        console.debug(error.xhr);
                    });
                }
            }, this.addButton1Elm);
            that._loadAliases();
        },

        _loadAliases: function() {
            var that = this;
            domConstruct.empty(that.aliasesDiv);
            var url = this.panel.current_panel.store.vospace.url + "/1/account/info";
            that.panel.current_panel.store.vospace.request(
                url, 
                'GET',
                {'handleAs': 'json'}
            ).then(function(identities) {
                identities.aliases.map(function(identity) {
                    var identDiv = domConstruct.create("div");
                    var removeButton = new Button({
                        label: "&#10060;",
                        style: "margin: 15px;",
                        onClick: function(){
                            var url = that.panel.current_panel.store.vospace.url + "/1/account/info/identity/"+identity;
                            that.panel.current_panel.store.vospace.request(
                                url, 
                                'DELETE'
                            ).then(function(result) {
                                that._loadAliases();
                            }, function(error) {
                                console.error(error);
                            })
                        }
                    }, domConstruct.create('span', {}, identDiv));

                    domConstruct.create('span', {innerHTML: identity}, identDiv);

                    domConstruct.create('div', {
                        'class':"dijitHidden"

                    }, identDiv);

                    domConstruct.place(identDiv, that.aliasesDiv);
                });
            });
        }
    });
}
);