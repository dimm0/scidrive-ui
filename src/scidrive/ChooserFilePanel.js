define([
        "dojo/_base/declare",
        "dojo/_base/connect",
        "dojo/_base/fx",
        "dojo/Deferred",
        "dojo/aspect",
        "dojo/_base/array",
        "dojo/on",
        "dojo/keys",
        "dojo/dom-construct",
        "dojo/dom-style",
        "dojo/dom-attr",
        "dojo/store/Memory",
        "dijit/_WidgetBase",
        "scidrive/DataGrid",
        "dijit/Menu",
        "dojox/image/Lightbox",
        "scidrive/ConfirmDialog",
        "scidrive/MetadataViewer",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin",
        "dijit/layout/_ContentPaneResizeMixin",
        "dojo/text!./templates/ChooserFilePanel.html",
        "dijit/layout/BorderContainer",
        "dijit/layout/ContentPane",
        "dijit/layout/_LayoutWidget",
        "dijit/form/Form",
        "dijit/form/Button",
        "dijit/form/Select",
        "dijit/form/CheckBox",
        "dijit/form/ValidationTextBox",
        "dijit/form/TextBox",
        "dijit/form/Textarea",
        "dijit/form/FilteringSelect",
        "dijit/PopupMenuBarItem",
        "dijit/DropDownMenu",
        "dijit/InlineEditBox",
        "dijit/Toolbar",
        "dijit/ProgressBar",
        "dijit/Dialog",
        "dijit/registry",
        "dojox/widget/Dialog",
        "dojo/data/ItemFileWriteStore",
        "dijit/TitlePane",
        "scidrive/XMLWriter"
    ],
    function(declare, connect, fx, Deferred, aspect, array, on, keys, domConstruct, domStyle, domAttr, Memory, WidgetBase,
        DataGrid, Menu, LightBox, ConfirmDialog, MetadataViewer, TemplatedMixin, WidgetsInTemplateMixin, _ContentPaneResizeMixin, template, BorderContainer, ContentPane, _LayoutWidget,
        Form, Button, Select, CheckBox, ValidationTextBox, TextBox, Textarea,
        FilteringSelect, PopupMenuBarItem, DropDownMenu, InlineEditBox, Toolbar, ProgressBar, Dialog, registry, dojox_Dialog, ItemFileWriteStore, TitlePane, XMLWriter
    ) {
        return declare([WidgetBase, _LayoutWidget, _ContentPaneResizeMixin /* These 2 make it resizing in height on window resize */ , TemplatedMixin, WidgetsInTemplateMixin], {

            templateString: template,
            store: null,
            gridWidget: null,
            _menuItems: null,
            _menuSelectedItem: null,

            _uploadFilesQueue: null,
            _isUploading: false,
            _usersListToggler: null,

            postCreate: function() {
                this.inherited(arguments);
                var domNode = this.domNode;
                this.inherited(arguments);

                var panel = this;

                this._uploadFilesQueue = [];

                if (null != this.store) {
                    var panel = this; // to keep context

                    this._createUploader();

                    var rowMenuObject = new Menu();

                    rowMenuObject.addChild(new dijit.MenuItem({
                        label: "Download",
                        onClick: function(e) {
                            panel.store.vospace.request(
                                encodeURI(panel.store.vospace.url + "/1/media/sandbox" + panel._menuSelectedItem.i.path),
                                "GET", {
                                    handleAs: "json"
                                }
                            ).then(
                                function(data) {
                                    require(["dojo/request/iframe"], function(iframe) {
                                        iframe(data.url, {
                                            method: "GET"
                                        }).then(function(err) {
                                            console.debug(err);
                                        }).cancel();
                                    });
                                },
                                function(error) {
                                    panel._handleError(error);
                                }
                            );
                        }
                    }));
                    rowMenuObject.addChild(new dijit.MenuItem({
                        label: "Metadata...",
                        onClick: function(e) {
                            panel._showMetadata(panel._menuSelectedItem.i.path);
                        }
                    }));

                    this._menuItems = {};

                    this._menuItems['previewMenuItem'] = new dijit.MenuItem({
                        label: "Preview...",
                        onClick: function(e) {
                            panel.store.vospace.request(
                                encodeURI(panel.store.vospace.url + "/1/media/sandbox" + panel._menuSelectedItem.i.path),
                                "GET", {
                                    handleAs: "json"
                                }
                            ).then(
                                function(data) {
                                    var lb = new dojox.image.Lightbox({
                                        title: "Preview",
                                        group: "group",
                                        href: data.url
                                    });
                                    lb.startup();
                                    setTimeout(function() {
                                        lb.show();
                                    }, 2000);
                                },
                                function(error) {
                                    panel._handleError(error);
                                }
                            );
                        }
                    });
                    rowMenuObject.addChild(this._menuItems['previewMenuItem']);
                    rowMenuObject.addChild(new dijit.MenuItem({
                        label: "Delete",
                        onClick: function(e) {
                            var selectedItems = panel.gridWidget.selection.getSelected("row", true);

                            if (selectedItems != undefined) {
                                var selected = selectedItems.filter(function(val) {
                                    return val == panel._menuSelectedItem;
                                });

                                if (selected.length > 0) {
                                    panel._deleteSelection(selectedItems);
                                } else {
                                    panel._deleteSelection(panel._menuSelectedItem);
                                }
                            } else { // nothing is selected
                                panel._deleteSelection(panel._menuSelectedItem);
                            }
                        }
                    }));
                    this._menuItems['pullUrlMenuItem'] = new dijit.MenuItem({
                        label: "Pull from URL...",
                        tooltip: "Pull data from URL to the selected item",
                        onClick: function(e) {
                            panel.transferNode.value = panel._menuSelectedItem.i.path;
                            panel.urlInput.reset();
                            panel.transferUrlDialog.show();
                        }
                    });
                    rowMenuObject.addChild(this._menuItems['pullUrlMenuItem']);

                    this._menuItems['mediaMenuItem'] = new dijit.MenuItem({
                        label: "Quick Share URL...",
                        onClick: function(e) {
                            panel.store.vospace.request(
                                encodeURI(panel.store.vospace.url + "/1/media/sandbox" + panel._menuSelectedItem.i.path),
                                "GET", {
                                    handleAs: "json"
                                }
                            ).then(
                                function(data) {
                                    var infoContent = "<div style='background: #e3e3e3; margin: 30px; padding: 5px;'><a href=\"" + data.url + "\" target=\"_blank\">" + data.url + "</a></div>";
                                    var infoWindow = new dijit.Dialog({
                                        title: "File URL",
                                        autofocus: false,
                                        content: infoContent,
                                        style: "background-color:white;z-index:5;position:relative;",
                                        id: "IndoWindow",
                                        onCancel: function() {
                                            dijit.popup.close(this);
                                            this.destroyRecursive(false);
                                        }
                                    });
                                    infoWindow.show();
                                },
                                function(error) {
                                    panel._handleError(error);
                                }
                            );
                        }
                    });
                    rowMenuObject.addChild(this._menuItems['mediaMenuItem']);

                    this._menuItems['shareMenuItem'] = new dijit.MenuItem({
                        label: "Share...",
                        onClick: function(e) {
                            panel.store.vospace.request(
                                encodeURI(panel.store.vospace.url + "/1/share_groups"),
                                "GET", {
                                    handleAs: "json"
                                }
                            ).then(
                                function(data) {
                                    var sharesStore = new Memory({
                                        data: data
                                    });

                                    panel.shareSelect.store = sharesStore;
                                    connect.connect(panel.shareSelect, "onChange", function(e) {
                                        panel.store.vospace.request(
                                            encodeURI(panel.store.vospace.url + "/1/share_groups/" + this.item.id),
                                            "GET", {
                                                handleAs: "json"
                                            }
                                        ).then(
                                            function(data) {
                                                domConstruct.empty(panel.usersList);
                                                data.forEach(function(item, num) {
                                                    var userDiv = dojo.create("div", {
                                                        innerHTML: item
                                                    });
                                                    domConstruct.place(userDiv, panel.usersList);
                                                });

                                            },
                                            function(error) {
                                                panel._handleError(error);
                                            }
                                        );
                                    });

                                    panel.chooseShareGroupDialog.startup();

                                    // reset the dialog if necessary
                                    panel.chooseShareGroupDialog.show();
                                }
                            );
                        }
                    });
                    rowMenuObject.addChild(this._menuItems['shareMenuItem']);


                    rowMenuObject.startup();

                    this.gridWidget = new DataGrid({
                        id: this.grid.id,
                        store: this.store,
                        structure: [
                            [
                                //{ name: ' ', field: 'is_dir' , formatter: this._formatFileIcon, width: '3%'},
                                {
                                    name: 'Name',
                                    field: 'path',
                                    formatter: this._getName,
                                    width: '62%'
                                }, {
                                    name: 'Size',
                                    field: 'size',
                                    width: "10%"
                                },
                                //{ name: 'Modified', field: 'modified' , width: "20%"},
                                {
                                    name: 'Type',
                                    field: 'mime_type',
                                    formatter: this._shortenString,
                                    width: "30%"
                                }
                            ]
                        ],
                        rowSelector: '0px',
                        canSort: false,
                        plugins: {
                            pagination: {
                                defaultPageSize: 25, // Integer, what page size will be used by default
                                gotoButton: true
                            },
                            dnd: {
                                'dndConfig': {
                                    'out': {
                                        col: false,
                                        row: true,
                                        cell: false
                                    },
                                    'in': {
                                        col: false,
                                        row: true,
                                        cell: false
                                    },
                                    'within': false
                                }
                            },
                            selector: {
                                row: 'multiple',
                                cell: 'disabled',
                                col: 'disabled'
                            },
                            menus: {
                                rowMenu: rowMenuObject.id
                            }
                        },
                        query: {
                            list: 'true'
                        },
                        pathWidget: this.pathSelect,
                        onRowDblClick: function(e) {
                            var item = this.selection.getSelected("row", true)[0];
                            if (item.i.is_dir) {
                                this.setCurrentPath(item.i.path);
                                panel.parentPanel.updateCurrentPanel(panel);
                            } else {
                                panel.store.vospace.request(
                                    encodeURI(panel.store.vospace.url + "/1/media/sandbox" + item.i.path),
                                    "GET", {
                                        handleAs: "json"
                                    }
                                ).then(
                                    function(data) {
                                        require(["dojo/request/iframe"], function(iframe) {
                                            iframe(data.url, {
                                                method: "GET"
                                            }).then(function(err) {
                                                console.debug(err);
                                            }).cancel();
                                        });
                                    },
                                    function(error) {
                                        panel._handleError(error);
                                    }
                                );
                            }
                        }
                    }, this.grid);
                    connect.connect(this.gridWidget.plugin('dnd'), "onDragIn", this, "_dragIn");

                    connect.connect(this.gridWidget, "dokeypress", this, function(e) {
                        if (e.keyCode == keys.DELETE) { // press delete on grid
                            var selectedItems = panel.gridWidget.selection.getSelected("row", true);
                            panel._deleteSelection(selectedItems);
                        }
                    });

                    on(this.parentPanel.selectButton, "click", function(e) {

                        var selectedItems = panel.gridWidget.selection.getSelected("row", true);

                        panel.store.vospace.request(
                            encodeURI(panel.store.vospace.url + "/1/media/sandbox" + selectedItems[0].i.path),
                            "GET", {
                                handleAs: "json"
                            }
                        ).then(
                            function(data) {
                                window.opener.postMessage(JSON.stringify({"url":data.url, "path":selectedItems[0].i.path}), "*");
                            },
                            function(error) {
                                panel._handleError(error);
                            }
                        );
                    });

                    connect.connect(this.gridWidget, "onRowContextMenu", this, "_rowcontextmenu");
                    on(this, "click", function(e) {
                        this.parentPanel.updateCurrentPanel(this);
                    });

                    /*Call startup() to render the grid*/
                    this.gridWidget.startup();

                    // this.parentPanel.updateCurrentPanel(this);
                }

            },

            /*
             * Function reloads the contents of the panel.
             * Parameter notRefreshIfUpdating specifies if the panel should refresh when SSE is available
             */
            _refresh: function(notRefreshIfUpdating) {
                var gridIsUpdating = ((this.gridWidget._eventSource != null) && (this.gridWidget._eventSource.readyState == 1));
                if (!(gridIsUpdating && notRefreshIfUpdating)) {
                    this.gridWidget.model.clearCache();
                    this.gridWidget.body.refresh();
                }
            },

            _dragIn: function(sourcePlugin, isCopy) {
                var selectedArray = sourcePlugin.selector.getSelected("row", true);

                for (var i = 0; i < selectedArray.length; i++) {
                    var nodePath = selectedArray[i].id;
                    var nodeId = sourcePlugin.grid.store.getNodeVoId(nodePath);

                    var nodePathArray = nodePath.split('/');
                    var nodeName = nodePathArray[nodePathArray.length - 1];

                    var curPath = this.gridWidget._currentPath;
                    var curPathArray = curPath.split('/');
                    curPathArray.push(nodeName);
                    curPath = curPathArray.join("/");
                    var thisNodeId = this.store.getNodeVoId(curPath);

                    var store = this.store;
                    var args = [store.vospace, thisNodeId];

                    if (sourcePlugin.grid.store.vospace != this.store.vospace) { // different VOSpaces
                        sourcePlugin.grid.store.pullFromVoJob(sourcePlugin.grid.store.vospace, nodeId, store.pullToVoJob, args);
                    } else {
                        sourcePlugin.grid.store.moveJob(store.vospace, nodeId, thisNodeId);
                    }
                }
            },

            setStore: function(store) {
                this.store = store;
                this.gridWidget.setStore(store);
            },

            _updateStore: function(path) { // to remove
                if (path.length > 0) {
                    this.gridWidget.setCurrentPath(path);
                }
                this.parentPanel.updateCurrentPanel(this);
            },

            _getName: function(path, rowIndex) {
                var pathTokens = path.split('/');
                
                var len = 40;
                var name = pathTokens[pathTokens.length - 1];
                if (name && name.length > len) {
                    name = "<span title='" + name + "'>" + name.substring(0, len) + "...</span>";
                }

                switch (this.grid.getItem(rowIndex).i.icon) {
                    case "folder_public":
                        return "<img src='scidrive/resources/folder.jpg' style='vertical-align:middle' title='Folder' alt='Folder' width='20'/>&nbsp;" + name;
                    case "file":
                        return "<img src='scidrive/resources/file.png' style='vertical-align:middle' title='File' alt='File' width='20'/>&nbsp;" + name;
                    case "table":
                        return "<img src='scidrive/resources/table.png' style='vertical-align:middle' title='File' alt='File' width='20'/>&nbsp;" + name;
                }
            },

            _shortenString: function(name, rowIndex) {
                var len = 20;
                if (!name || name.length < len) {
                    return name;
                } else {
                    return "<span title='" + name + "'>" + name.substring(0, len) + "...</span>";
                }
            },

            _showMetadata: function(path) {
                var panel = this;

                panel.store.vospace.request(
                    encodeURI(this.store.vospace.url + "/nodes/" + path),
                    "GET", {
                        handleAs: "xml"
                    }
                ).then(
                    function(data) {

                        var meta_form = new ContentPane({
                            style: "overflow: auto; width: 700px; height: 500px;"
                        });

                        var editNodeDialog = new Dialog({
                            title: path,
                            content: meta_form,
                            onCancel: function() {
                                dijit.popup.close(this);
                                this.destroyRecursive(false);
                            }
                        });

                        new MetadataViewer().parse(data, meta_form.id);

                        editNodeDialog.show();
                    },
                    function(error) {
                        panel._handleError(error);
                    }
                );
            },

            _pullToVo: function() {
                this.store.pullToVoJob(this.store.vospace,
                    this.store.getNodeVoId(this.transferNode.value),
                    this.urlInput.value);
            },

            _logout: function() {
                this.store.vospace.logout(this);
            },

            getUserInfo: function(updateInfo /* callback */ ) {
                var panel = this;
                panel.store.vospace.request(
                    encodeURI(this.store.vospace.url + "/1/account/info"),
                    "GET", {
                        handleAs: "json"
                    }
                ).then(
                    function(accountInfo) {
                        updateInfo(accountInfo);
                    },
                    function(error) {
                        panel._handleError(error);
                    }
                );
            },

            _uploadFiles: function() {
                var panel = this;

                panel.parentPanel.showUploadPanel();

                this._isUploading = true;

                var curFileStruct = this._uploadFilesQueue.shift();
                var url = encodeURI(curFileStruct.containerUrl + curFileStruct.file.name);

                var headers = curFileStruct.vospace.signRequest(url, "PUT").headers;

                var xhr = new XMLHttpRequest();
                xhr.open('PUT', url, true);

                for (var header in headers){
                    xhr.setRequestHeader(header, headers[header]);
                };

                // Listen to the upload progress.
                xhr.upload.onprogress = function(e) {
                    if (e.lengthComputable) {
                        curFileStruct.fileProgressNode.value = (e.loaded / e.total) * 100;
                        curFileStruct.fileProgressNode.textContent = curFileStruct.fileProgressNode.value; // Fallback for unsupported browsers.
                    }
                };

                on.once(xhr.upload, "loadend", function() {
                    if (panel._uploadFilesQueue.length > 0) {
                        panel._uploadFiles();
                    } else {
                        panel._isUploading = false;
                        panel.parentPanel.hideUploadPanel();
                    }
                    domConstruct.destroy(curFileStruct.fileUploadNode);
                    panel._refresh(true);
                });

                xhr.onreadystatechange = function(evt) {
                    if (this.readyState === 4) {
                        if (this.status === 200) {
                            // upload is OK
                        } else {
                            if (this.status === 403)
                                alert("Can't upload the file: Read Only permissions");
                            else
                                alert("Can't upload the file: " + this.statusText);
                        }
                    }
                };

                xhr.setRequestHeader('Content-Type', 'text/plain; charset=x-user-defined-binary');
                xhr.send(curFileStruct.file);
            },

            _createUploader: function() {
                var panel = this;

                var doc = this.domNode;
                doc.ondragenter = function() {
                    return false;
                };
                doc.ondragover = function() {
                    return false;
                };
                doc.ondragleave = function() {
                    return false;
                };
                doc.ondrop = function(event) {
                    event.preventDefault && event.preventDefault();
                    this.className = '';


                    if (!panel.store.vospace.isShare && panel.gridWidget._currentPath == '/') {
                        alert("Regular files can't be uploaded to root folder.");
                    } else {
                        var files = event.dataTransfer.files;

                        var url = panel.store.vospace.url + "/1/files_put/dropbox" + panel.gridWidget._currentPath + "/";

                        for (var i = 0; i < files.length; i++) {
                            var curFile = files[i];
                            var fname = curFile.name;

                            var uploadNode = dojo.create("div");
                            domConstruct.place(uploadNode, panel.parentPanel.fileuploads.domNode);

                            var uploadNodeText = domConstruct.create("div", {
                                innerHTML: fname
                            });
                            domConstruct.place(uploadNodeText, uploadNode);

                            var progressNode = domConstruct.create("progress", {
                                min: "0",
                                max: "100",
                                value: "0",
                                'class': "fileUploadProgress"
                            })

                            domConstruct.place(progressNode, uploadNode);

                            panel._uploadFilesQueue.push({
                                file: curFile,
                                fileUploadNode: uploadNode,
                                fileProgressNode: progressNode,
                                containerUrl: url,
                                vospace: panel.store.vospace
                            });

                            if (!panel._isUploading) {
                                panel._uploadFiles();
                            }

                        }
                    }
                };
            },

            _createShareKey: function(e) {
                if (this.shareSelect.validate()) { // proper group name
                    this.chooseShareGroupDialog.hide();
                    this._createShare();
                }
            },

            _createShare: function(e) {
                var panel = this;
                var params = "";

                if (this.groupEnable.value == "on")
                    params += "?group=" + this.shareSelect.value;

                params += (params == "") ? "?" : "&";
                params += "write_perm=" + !this.readOnlyCheckBox.checked;

                panel.store.vospace.request(
                    encodeURI(panel.store.vospace.url + "/1/shares/sandbox" + panel._menuSelectedItem.i.path + params),
                    "PUT", {
                        handleAs: "json"
                    }
                ).then(
                    function(data) {

                        var url = location.protocol + '//' + location.host + location.pathname;
                        var infoContent = "<p>Share URL: <a href='" + url + "?share=" + data.id + "'' target='_blank'>" + url + "?share=" + data.id + "</a></p>\n";
                        infoContent += "<p align='center'>Share id: <span style='background: #e3e3e3; padding: 5px;'>" + data.id + " </span></p>"

                        var infoWindow = new dijit.Dialog({
                            title: "Share URL",
                            style: "background-color:white;z-index:5;position:relative;",
                            content: infoContent,
                            onCancel: function() {
                                dijit.popup.close(this);
                                this.destroyRecursive(false);
                            }
                        });
                        infoWindow.show();
                    },
                    function(error) {
                        panel._handleError(error);
                    }
                );
            },

            _rowcontextmenu: function(e) {
                this._menuSelectedItem = this.gridWidget.getItem(e.rowIndex);

                if (this._menuSelectedItem.i.mime_type && this._menuSelectedItem.i.mime_type.indexOf("image") == 0) {
                    this._menuItems["previewMenuItem"].set("disabled", false);
                } else {
                    this._menuItems["previewMenuItem"].set("disabled", true);
                }

                if (!this._menuSelectedItem.i.mime_type) { // folder
                    this._menuItems["pullUrlMenuItem"].set("disabled", true);
                } else {
                    this._menuItems["pullUrlMenuItem"].set("disabled", false);
                }

                if (!this.store.vospace.isShare && this.gridWidget._currentPath == '/') { // root
                    this._menuItems["shareMenuItem"].set("disabled", false);
                } else {
                    this._menuItems["shareMenuItem"].set("disabled", true);
                }

            },

            _enableShareGroup: function(e) {
                var panel = this;

                domStyle.set(this.usersListDiv, "display", "block");
                var anim = fx.animateProperty({
                    node: this.usersList,
                    properties: {
                        height: {
                            end: 150
                        }
                    }
                });
                aspect.after(anim, "onEnd", function() {
                    panel.groupEnable.value = "on";
                    panel.shareSelect.setDisabled(false);
                    panel.shareSelect.loadAndOpenDropDown();
                    //panel.shareSelect.reset();
                }, true);
                anim.play();

            },

            _disableShareGroup: function(e) {
                var panel = this;
                this.shareSelect.closeDropDown();
                var anim = fx.animateProperty({
                    node: this.usersList,
                    properties: {
                        height: {
                            end: 0
                        }
                    }
                });
                aspect.after(anim, "onEnd", function() {
                    domStyle.set(panel.usersListDiv, "display", 'none');
                    panel.groupEnable.value = "off";
                    panel.shareSelect.setDisabled(true);
                    //domConstruct.empty(panel.usersList);
                }, true);
                anim.play();

            },

            _handleError: function(error) {
                // if (ioargs.xhr.status == 401) {
                //     this.parentPanel.app.login(this.store.vospace, this, true);
                // } else {
                //     alert("Error: " + data);
                // }
                console.debug(error);
            }

        });
    });