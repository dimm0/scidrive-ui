define([
        "dojo/_base/declare",
        "dojo/_base/connect",
        "dojo/_base/fx",
        "dojo/Deferred",
        "dojo/aspect",
        "dojo/_base/array",
        "dojo/on",
        "dojo/html",
        "dojo/keys",
        "dojo/dom-construct",
        "dojo/dom-style",
        "dojo/dom-attr",
        "dojo/store/Memory",
        "dojo/hash",
        "dijit/_WidgetBase",
        "scidrive/DataGrid",
        "dijit/Menu",
        "dojox/image/Lightbox",
        "scidrive/ConfirmOverwriteDialog",
        "scidrive/ConfirmDialog",
        "scidrive/MetadataViewer",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin",
        "dijit/layout/_ContentPaneResizeMixin",
        "dojo/text!./templates/FilePanel.html",
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
        "dijit/TooltipDialog",
        "dijit/ProgressBar",
        "dijit/Dialog",
        "dijit/registry",
        "dijit/popup",
        "dojox/widget/Dialog",
        "dojo/data/ItemFileWriteStore",
        "dijit/TitlePane",
        "gridx/core/model/cache/Async",

        'gridx/modules/Focus',
        'gridx/modules/ColumnResizer',
        'gridx/modules/extendedSelect/Row',
        'gridx/modules/VirtualVScroller',
        'gridx/modules/Menu',
        'gridx/modules/CellWidget',
        'gridx/modules/dnd/Row',
        'gridx/modules/move/Row',


        "scidrive/XMLWriter"
    ],
    function(declare, connect, fx, Deferred, aspect, array, on, html, keys, domConstruct, domStyle, domAttr, Memory, hash, WidgetBase,
        DataGrid, Menu, Lightbox, ConfirmOverwriteDialog, ConfirmDialog, MetadataViewer, TemplatedMixin, WidgetsInTemplateMixin, _ContentPaneResizeMixin, template, BorderContainer, ContentPane, _LayoutWidget,
        Form, Button, Select, CheckBox, ValidationTextBox, TextBox, Textarea,
        FilteringSelect, PopupMenuBarItem, DropDownMenu, InlineEditBox, Toolbar, TooltipDialog, ProgressBar, Dialog, registry, popup, dojox_Dialog, ItemFileWriteStore, TitlePane, Async,
        Focus, ColumnResizer, ExtendedSelectRow, VirtualVScroller, GridMenu, CellWidget, DnDRow, MoveRow, XMLWriter
    ) {
        return declare([WidgetBase, _LayoutWidget, _ContentPaneResizeMixin /* These 2 make it resizing in height on window resize */ , TemplatedMixin, WidgetsInTemplateMixin], {

            templateString: template,
            store: null,
            gridWidget: null,

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
                    var structure =
                            [
                                //{ name: ' ', field: 'is_dir' , formatter: this._formatFileIcon, width: '3%'},
                                {
                                    name: 'Name',
                                    field: 'path',
                                    widgetsInCell: true,
                                    allowEventBubble: true,
                                    formatter: this._getName,
                                    decorator: function(){
                                        return "<span data-dojo-type='dijit.layout.ContentPane' style='position: relative; overflow: hidden;' data-dojo-attach-point='cell_cont' data-dojo-props='maximum: 1' class='gridxHasGridCellValue'>"+
                                                "<span data-dojo-attach-point='textfield' style='width: 100%; white-space:nowrap; overflow: hidden'></span>"+
                                                "<span class='quickToolbarSpan' style='position:absolute; right: 0px;'>"+
                                                "<button data-dojo-type='dijit.form.Button' data-dojo-attach-point='link_btn' baseClass='quickToolbarButtonBase' data-dojo-props='iconClass:\"quickToolbarButton link\", showLabel: false'>External link</button>"+
                                                "<button data-dojo-type='dijit.form.Button' data-dojo-attach-point='share_btn' baseClass='quickToolbarButtonBase' data-dojo-props='iconClass:\"quickToolbarButton share\", showLabel: false'>Share</button>"+
                                                "<button data-dojo-type='dijit.form.Button' data-dojo-attach-point='meta_btn' baseClass='quickToolbarButtonBase' data-dojo-props='iconClass:\"quickToolbarButton meta\", showLabel: false'>Metadata</button>"+
                                                "<button data-dojo-type='dijit.form.Button' data-dojo-attach-point='preview_btn' baseClass='quickToolbarButtonBase' data-dojo-props='iconClass:\"quickToolbarButton preview\", showLabel: false'>Preview</button>"+
                                                "<button data-dojo-type='dijit.form.Button' data-dojo-attach-point='download_btn' baseClass='quickToolbarButtonBase' data-dojo-props='iconClass:\"quickToolbarButton download\", showLabel: false'>Download</button>"+
                                                "<button data-dojo-type='dijit.form.Button' data-dojo-attach-point='delete_btn' baseClass='quickToolbarButtonBase' data-dojo-props='iconClass:\"quickToolbarButton delete\", showLabel: false'>Delete</button>"+
                                                "</span></span>";
                                    },
                                    setCellValue: function(gridData, storeData, cellWidget){
                                        html.set(cellWidget.textfield, gridData);
                                        var data = cellWidget.cell.row.rawData();
                                        if((data.mime_type + "").indexOf("image") < 0)
                                            domStyle.set(cellWidget.preview_btn.domNode, 'display', 'none');
                                        else
                                            domStyle.set(cellWidget.preview_btn.domNode, 'display', 'inline');

                                        if(panel.gridWidget._currentPath == '/' && !panel.store.vospace.isShare)
                                            domStyle.set(cellWidget.share_btn.domNode, 'display', 'inline');
                                        else
                                            domStyle.set(cellWidget.share_btn.domNode, 'display', 'none');
                                    },
                                    getCellWidgetConnects: function(cellWidget, cell){
                                        return [
                                          [cellWidget.link_btn, 'onMouseDown', function(e){


                                            panel.store.vospace.request(
                                                encodeURI(panel.store.vospace.url + "/1/media/sandbox" + cell.row.id),
                                                "GET", {
                                                    handleAs: "json"
                                                }
                                            ).then(
                                                function(data) {
                                                    var myTooltipDialog = new TooltipDialog({
                                                        content: data.url,
                                                        onMouseLeave: function(){
                                                            this._timer = setTimeout(dojo.partial(function(){
                                                                popup.close(myTooltipDialog);
                                                                myTooltipDialog.destroyRecursive();
                                                            }, this.id), 2000);
                                                        },
                                                        onMouseEnter: function(){
                                                            clearTimeout(this._timer);
                                                        }
                                                    });

                                                    popup.open({
                                                        popup: myTooltipDialog,
                                                        around: cell.node()
                                                    });
                                                },
                                                function(error) {
                                                    panel._handleError(error);
                                                }
                                            );

                                            e.stopPropagation();
                                          }],
                                          [cellWidget.meta_btn, 'onMouseDown', function(e){
                                            panel._showMetadata(cell.row.id);
                                            e.stopPropagation();
                                          }],
                                          [cellWidget.delete_btn, 'onMouseDown', function(e){
                                            var selectedItems = panel.gridWidget.select.row.getSelected();
                                            if (typeof selectedItems !== "undefined") {
                                                var selected = selectedItems.filter(function(val) {
                                                    return val == cell.row.id;
                                                });
                                                if(selected.length > 0){
                                                    panel._deleteSelection(selectedItems);
                                                } else {
                                                    panel._deleteSelection(cell.row.id);
                                                }
                                            } else { // nothing is selected
                                                panel._deleteSelection(cell.row.id);
                                            }
                                            panel.gridWidget.select.row.clear();
                                          }],
                                          [cellWidget.preview_btn, 'onMouseDown', function(e){
                                            panel.store.vospace.request(
                                                encodeURI(panel.store.vospace.url + "/1/media/sandbox" + cell.row.id),
                                                "GET", {
                                                    handleAs: "json"
                                                }
                                            ).then(
                                                function(data) {
                                                    var lb = new dojox.image.LightboxDialog({
                                                        hide: function() {
                                                            this.destroyRecursive();
                                                        }
                                                    }).startup();
                                                    setTimeout(function() {
                                                        lb.show({ title:cell.row.id, href: data.url });
                                                    }, 2000);
                                                },
                                                function(error) {
                                                    panel._handleError(error);
                                                }
                                            );
                                            e.stopPropagation();
                                          }],
                                          [cellWidget.download_btn, 'onMouseDown', function(e){
                                            panel.store.vospace.request(
                                                encodeURI(panel.store.vospace.url + "/1/media/sandbox" + cell.row.id),
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

                                          }],
                                          [cellWidget.share_btn, 'onMouseDown', function(e) {
                                            panel.chooseShareGroupDialog.nodepath = cell.row.id;
                                            panel.chooseShareGroupDialog.startup();

                                            // reset the dialog if necessary
                                            panel.chooseShareGroupDialog.show();
                                          }]
                                        ];
                                    },
                                    width: '60%'
                                }, {
                                    name: 'Size',
                                    field: 'size',
                                    width: "10%"
                                },
                                //{ name: 'Modified', field: 'modified' , width: "20%"},
                                {
                                    name: 'Type',
                                    field: 'mime_type',
                                    decorator: this._shortenString,
                                    width: "30%"
                                }
                            ];

                    var cur_path = hash();
                    if(typeof cur_path == "undefined" || cur_path == "")
                        cur_path = "/";

                    this.gridWidget = new DataGrid({
                        id: this.grid.id,
                        store: this.store,
                        cacheClass: Async,
                        structure: structure,
                        canSort: false,
                        _currentPath: cur_path,
                        columnWidthAutoResize: true,
                        modules: [
                            Focus,
                            ColumnResizer,
                            VirtualVScroller,
                            CellWidget,
                            ExtendedSelectRow,
                            DnDRow,
                            MoveRow
                        ],
                        selectRowTriggerOnCell: true,
                        dndRowCanRearrange: false,
                        query: {
                            list: 'true',
                            path: cur_path
                        },
                        pathWidget: this.pathSelect,
                        onRowDblClick: function(e) {
                            var item = this.row(e.rowId).item();
                            if (item.i.is_dir) {
                                this.setCurrentPath(item.i.path);
                                panel.parentPanel.updateCurrentPanel(panel);
                                // hash(item.i.path);
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
                    
                    // connect.subscribe("/dojo/hashchange", this.gridWidget, function(value) {
                    //     console.debug(this);
                    //     this.setCurrentPath(value);
                    //     panel.parentPanel.updateCurrentPanel(panel);
                    // });

                    this.gridWidget.dnd._dnd._source.onDropExternal = function(source, nodes, copy) {
                        for (var i = 0; i < nodes.length; i++) {
                            var nodePath = domAttr.get(nodes[i], "rowid");
                            var nodeId = source.grid.store.getNodeVoId(nodePath);

                            var nodePathArray = nodePath.split('/');
                            var nodeName = nodePathArray[nodePathArray.length - 1];

                            var curPath = panel.gridWidget._currentPath;
                            var curPathArray = curPath.split('/');
                            curPathArray.push(nodeName);
                            curPath = curPathArray.join("/");

                            var store = panel.store;
                            var thisNodeId = store.getNodeVoId(curPath);

                            var args = [store, thisNodeId];

                            console.debug(nodeId);
                            console.debug(thisNodeId);


                            if (source.grid.store.vospace != store.vospace) { // different VOSpaces
                                source.grid.store.pullFromVoJob(nodeId, store.pullToVoJob, args);
                            } else {
                                source.grid.store.moveJob(nodeId, thisNodeId);
                            }
                        }
                    };

                    connect.connect(this.gridWidget, "dokeypress", this, function(e) {
                        if (e.keyCode == keys.DELETE) { // press delete on grid
                            var selectedItems = panel.gridWidget.selection.getSelected("row", true);
                            panel._deleteSelection(selectedItems);
                        }
                    });

                    on(this, "click", function(e) {
                        this.parentPanel.updateCurrentPanel(this);
                    });

                    this.gridWidget.startup();

                    this.parentPanel.updateCurrentPanel(this);
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

            _deleteSelection: function(path) {
                var panel = this;
                MessageBox.confirm({
                    message: "Delete files?"
                }).then(function() {
                    if (path instanceof Array) {
                        for (var i = 0; i < path.length; i++) {
                            panel.store.vospace.request(
                                encodeURI(panel.store.vospace.url + "/nodes" + path[i]),
                                "DELETE", {
                                    handleAs: "text"
                                }
                            ).then(
                                function(data) {
                                    panel._refresh(true);
                                },
                                function(error) {
                                    panel._handleError(error);
                                }
                            );
                        }

                    } else {
                        panel.store.vospace.request(
                            encodeURI(panel.store.vospace.url + "/nodes" + path),
                            "DELETE", {
                                handleAs: "text"
                            }
                        ).then(
                            function(data) {
                                panel._refresh(true);
                            },
                            function(error) {
                                panel._handleError(error);
                            }
                        );
                    }
                });
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

            _getName: function(row, path) {
                var pathTokens = path.split('/');

                var icon = "";
                switch (row.icon) {
                    case "folder_public":
                        icon = "<i class=\"fa fa-folder\" style=\"color: rgb(50,110,183)\"></i>&nbsp;";
                        break;
                    case "file":
                        if(row.mime_type.indexOf("image") == 0)
                            icon = "<i class=\"fa fa-file-image-o\" style=\"color: rgb(50,110,183)\"></i>&nbsp;";
                        else
                            icon = "<i class=\"fa fa-file-o\" style=\"color: rgb(50,110,183)\"></i>&nbsp;";
                        break;
                    case "table":
                        icon = "<i class=\"fa fa-table\" style=\"color: rgb(50,110,183)\"></i>&nbsp;";
                        break;
                }


                var len = 70;
                var name = pathTokens[pathTokens.length - 1];
                if (name && name.length > len) {
                    return "<span title='" + name + "'>" + icon + name + "</span>";
                } else {
                    return icon+name;
                }
            },

            _shortenString: function(mime, rowId, rowIndex) {
                var max_len = 40;
                if (!mime || mime.length < max_len) {
                    return mime;
                } else {
                    return "<span title='" + mime + "'>" + mime.substring(0, max_len) + "...</span>";
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
                            },
                            onHide: function() {
                                this.destroyRecursive();
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
                if(curFileStruct.overwrite !== null){
                    url += "?overwrite="+curFileStruct.overwrite.toString();
                } else {
                    url += "?overwrite=false";
                }

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

                xhr.onreadystatechange = function(evt) {
                    if (this.readyState === 4) {
                        if (this.status === 200) {
                            //all good
                            domConstruct.destroy(curFileStruct.fileUploadNode);
                            panel._refresh(true);
                            if (panel._uploadFilesQueue.length > 0) {
                                panel._uploadFiles();
                            } else {
                                panel._isUploading = false;
                                panel.parentPanel.hideUploadPanel();
                            }
                        } else {
                            if (this.status === 403) {
                                alert("Can't upload the file: Read Only permissions");
                            } else if(this.status === 400) {
                                if(curFileStruct.overwrite == false) { // got conflict for file marked as not overwrite. just continuing from here
                                    domConstruct.destroy(curFileStruct.fileUploadNode);
                                    panel._refresh(true);
                                    if (panel._uploadFilesQueue.length > 0) {
                                        panel._uploadFiles();
                                    } else {
                                        panel._isUploading = false;
                                        panel.parentPanel.hideUploadPanel();
                                    }
                                    return;
                                }
                                OverwriteMessageBox.confirm({
                                    "title":"Overwrite the file",
                                    "message": "Overwrite "+curFileStruct.file.name+"?"
                                }).then(function(evt) {
                                    switch(evt){
                                        case "OverwriteMessageBox.OKAll":
                                            var files = panel._uploadFilesQueue;
                                            for (var i = 0; i < files.length; i++) {
                                                var curFile = files[i];
                                                curFile.overwrite = true;
                                            }
                                            curFileStruct.overwrite = true;
                                            panel._uploadFilesQueue.unshift(curFileStruct);
                                            panel._uploadFiles();
                                            break;
                                        case "OverwriteMessageBox.OK":
                                            curFileStruct.overwrite = true;
                                            panel._uploadFilesQueue.unshift(curFileStruct);
                                            panel._uploadFiles();
                                            break;
                                        case "OverwriteMessageBox.Cancel":
                                            domConstruct.destroy(curFileStruct.fileUploadNode);
                                            panel._refresh(true);
                                            if (panel._uploadFilesQueue.length > 0) {
                                                panel._uploadFiles();
                                            } else {
                                                panel._isUploading = false;
                                                panel.parentPanel.hideUploadPanel();
                                            }
                                            break;
                                        case "OverwriteMessageBox.CancelAll":
                                            var files = panel._uploadFilesQueue;
                                            for (var i = 0; i < files.length; i++) {
                                                var curFile = files[i];
                                                curFile.overwrite = false;
                                            }
                                            domConstruct.destroy(curFileStruct.fileUploadNode);
                                            panel._refresh(true);
                                            if (panel._uploadFilesQueue.length > 0) {
                                                panel._uploadFiles();
                                            } else {
                                                panel._isUploading = false;
                                                panel.parentPanel.hideUploadPanel();
                                            }
                                            break;
                                    }

                                });
                            } else {
                                alert("Can't upload the file: " + this.statusText);
                            }
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
                                vospace: panel.store.vospace,
                                overwrite: null
                            });

                            if (!panel._isUploading) {
                                panel._uploadFiles();
                            }

                        }
                    }
                };
            },

            _createShareKey: function(e) {
                this.chooseShareGroupDialog.hide();
                this._createShare();
            },

            _createShare: function(e) {
                var panel = this;

                panel.store.vospace.request(
                    encodeURI(panel.store.vospace.url + "/1/shares/sandbox"+this.chooseShareGroupDialog.nodepath+"?write_perm=" + !this.readOnlyCheckBox.checked),
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
