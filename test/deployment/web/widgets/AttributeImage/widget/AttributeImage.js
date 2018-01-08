/*global logger*/
/*
    AttributeImage
    ========================

    @file      : AttributeImage.js
    @version   : 1.0.0
    @author    : Fabian Recktenwald
    @date      : 2017-04-07
    @copyright : Mansystems 2017
    @license   : Apache 2

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "dojo/_base/lang",
    "dojo/_base/event",

    "dojo/text!AttributeImage/widget/template/AttributeImage.html"
], function (declare, _WidgetBase, _TemplatedMixin, lang, dojoEvent, widgetTemplate) {
    "use strict";

    // Declare widget's prototype.
    return declare("AttributeImage.widget.AttributeImage", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        imageNode: null,

        // Parameters configured in the Modeler.
        mfToExecute: "",
        attribute: "",
        imageMapping: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _contextObj: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            logger.debug(this.id + ".constructor");
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            logger.debug(this.id + ".postCreate");

            this._imageMap = {};
            this._imageDefault = {
              'image' : '',
              'title' : ''
            };

            this.imageMapping.forEach( function( mapentry ) {
              var entry = {
                'image' : './'+mapentry.image,
                'title' : mapentry.title
              };
              this._imageMap[ mapentry.value ] = entry;
              if ( mapentry.isDefault ) {
                this._imageDefault = entry;
              }
            }, this);

            this._updateRendering();

            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();

            this._updateRendering(callback); // We're passing the callback to updateRendering to be called after DOM-manipulation
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
          logger.debug(this.id + ".uninitialize");
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function (e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Attach events to HTML dom elements
        _setupEvents: function () {
            logger.debug(this.id + "._setupEvents");

            this.connect(this.imageNode, "click", function (e) {
                // Only on mobile stop event bubbling!
                this._stopBubblingEventOnMobile(e);

                // If a microflow has been set execute the microflow on a click.
                if (this.mfToExecute !== "") {
                  dojoEvent.stop(e);
                  this._execMf(this.mfToExecute, this._contextObj.getGuid());
                }
            });
        },

        _execMf: function (mf, guid, cb) {
            logger.debug(this.id + "._execMf");
            if (mf && guid) {
                mx.ui.action(mf, {
                    params: {
                        applyto: "selection",
                        guids: [guid]
                    },
                    scope: this.mxform,
                    callback: lang.hitch(this, function (objs) {
                        if (cb && typeof cb === "function") {
                            cb(objs);
                        }
                    }),
                    error: function (error) {
                        console.debug(error.description);
                    }
                }, this);
            }
        },

        // Rerender the interface.
        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");

            var entry = this._imageDefault;

            if (this._contextObj !== null) {
              var value = this._contextObj.get( this.attribute );
              if ( value && this._imageMap[ value ] ) {
                entry = this._imageMap[ value ];
              }
            }

            this.imageNode.src = entry.image;
            this.imageNode.title = entry.title;

            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            this._executeCallback(callback, "_updateRendering");
        },


        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this.unsubscribeAll();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.attribute,
                    callback: lang.hitch(this, function (guid, attr, attrValue) {
                        this._updateRendering();
                    })
                });
            }
        },

        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["AttributeImage/widget/AttributeImage"]);
