define([
    "dojo/ready",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/Deferred",
    "dojo/_base/array",
    "dojo/dom",
    "dojo/aspect",
    
    "dijit/form/Button",
    
    "dijit/registry",
    "dijit/_Widget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/Dialog",
    "dojo/text!./templates/ConfirmOverwriteDialog.html"
], function(
    ready,
    declare,
    lang,
    Deferred,
    array,
    dom,
    aspect,
        
    Button,

    registry,
    _Widget,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    Dialog,
    template){

    var ConfirmDialog = declare("scidrive.ConfirmDialog", [Dialog, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
      title: "Confirm",
      message: "Are you sure?",

        constructor: function(/*Object*/ kwArgs) {
            declare.safeMixin(this, kwArgs);
            
            //var template = dojo.cache("my.ConfirmDialog", "templates/ConfirmDialog.html");
            var message = this.message;
            
            var contentWidget = new (declare(
                [_Widget, _TemplatedMixin, _WidgetsInTemplateMixin],
                {
                    'templateString': template,
                    'message': message,
                    'class': "ConfirmDialog"
                }
            )); 
            contentWidget.startup();
            this.content = contentWidget;
        },
    
        postCreate: function() {
            this.inherited(arguments);
            this.connect(this.content.cancelButton, "onClick", "onCancel");
            this.connect(this.content.cancelAllButton, "onClick", "onCancelAll");
            this.connect(this.content.submitButton, "onClick", "onExecute");
            this.connect(this.content.submitAllButton, "onClick", "onExecuteAll");
        },
 
        onExecute: function() {
            // console.log("OK");
        },
        onExecuteAll: function() {
            // console.log("OK all");
        },
        
        onCancel: function() {
            // console.log("Cancel");
        },
        onCancelAll: function() {
            // console.log("Cancel All");
        }
    
    });

    OverwriteMessageBox = {
        confirm: function(kwArgs) {
            var confirmDialog = new ConfirmDialog(kwArgs);
            confirmDialog.startup();
            
            var deferred = new Deferred();
            var signal, signals = [];
            var destroyDialog = function() {
                array.forEach(signals, function(signal) {
                    signal.remove();
                });
                delete signals;
                confirmDialog.destroyRecursive();
            }
            
            signal = aspect.after(confirmDialog, "onExecute", function() {
                destroyDialog();
                deferred.resolve('OverwriteMessageBox.OK');
            });
            signals.push(signal);
        
            signal = aspect.after(confirmDialog, "onCancel", function() {
                destroyDialog();   
                deferred.resolve('OverwriteMessageBox.Cancel');            
            });
            signals.push(signal);

            signal = aspect.after(confirmDialog, "onExecuteAll", function() {
                destroyDialog();
                deferred.resolve('OverwriteMessageBox.OKAll');
            });
            signals.push(signal);
        
            signal = aspect.after(confirmDialog, "onCancelAll", function() {
                destroyDialog();   
                deferred.resolve('OverwriteMessageBox.CancelAll');   
            });
            signals.push(signal);
            
            confirmDialog.show();
            return deferred;
        }
       };


    return OverwriteMessageBox;

});