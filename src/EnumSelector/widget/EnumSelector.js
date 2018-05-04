/*global logger*/
/*
    EnumSelector
    ========================

    @file      : EnumSelector.js
    @version   : 0.0.1
    @author    : Robbert Hagendoorn
    @date      : Fri, 10 Mar 2017 17:39:13 GMT
    @copyright :
    @license   :

    Documentation
    ========================
    Describe your widget here.
*/

define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text!EnumSelector/widget/template/EnumSelector.html"

], function (declare, _WidgetBase, _TemplatedMixin, dojoClass, dojoConstruct,
        dojoArray, lang, widgetTemplate) {
    "use strict"

    // Declare widget's prototype.
    return declare("EnumSelector.widget.EnumSelector",
            [ _WidgetBase, _TemplatedMixin ], {

        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements set by the template
        inputNode: null,
        widgetNode: null,

        // Parameters configured in the Modeler.
        enumAttribute: "",
        enumOptions: "",
        emptyCaption: "",

        // Internal variables. Non-primitives created in the prototype are
        // shared between all widget instances.
        _handles: null,
        _alertDiv: null,
        _contextObj: null,
        _labelContainer: null,
        _options: null,

        // dojo.declare.constructor is called to construct
        // the widget instance. Implement to initialize
        // non-primitive properties.
        constructor: function () {
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing
        // the widget. Implement to do extra setup work.
        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            this._addLabel();
            this._addOptions();
        },

        // mxui.widget._WidgetBase.update is called when context
        // is changed or initialized. Implement to re-render
        // and / or fetch data.
        update: function (obj, callback) {
            logger.debug(this.id + ".update");
            this._contextObj = obj;
            this._updateRendering(callback); 
        },

        // Rerender the interface.
        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");
            this._resetValue();
            this._resetSubscriptions();
            this._setupEvents();
            this._setEnabledDisabled();
            this._executeCallback(callback);
        },

        _setEnabledDisabled: function() {
            if (!this.get("disabled") 
                && this._contextObj
                && !this._contextObj.isReadonlyAttr(this.enumAttribute)) {
                this.inputNode.removeAttribute("disabled");
            } else {
                this.inputNode.setAttribute("disabled","");
            }
        },

        _unsubscribe: function () {
          if (this._handles) {
              dojoArray.forEach(this._handles, function (handle) {
                  this.unsubscribe(handle);
              });
              this._handles = [];
          }
        },

        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this._unsubscribe();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                var validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, this._handleValidation)
                });
                var subscription = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.enumAttribute,
                    callback: lang.hitch(this, this._resetValue)
                });
                var contextSubscription = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, this._resetValue)
                });
                this._handles = [validationHandle, subscription, contextSubscription];
            }
        },

        // Updates the dropdown to reflect the attribute value
        _resetValue: function() {
            var enumValue = this._contextObj.get(this.enumAttribute);        
            var key = this.enumOptions.find( function(obj) {
                    return obj.enumKey === enumValue;
                });
            if (key && key !== "") {
                this.inputNode.value = key.enumKey;
            } else {
                this.inputNode.value = "";
            }
        },

        // Adds validation
        _handleValidation: function (validations) {
            var validation = validations[0];
            var message = validation.getReasonByAttribute(this.enumAttribute);
            validation.removeAttribute(this.enumAttribute);
            if (message) {
                this._showError(message);
            } else {
                this._removeError();
            }

        },

        // Constructs the validation message
        _showError: function (message) {
            if (this._alertDiv) {
                this._alertDiv.innerHTML = message;
            } else {
                this._alertDiv = dojoConstruct.create("div", {
                        "class": "alert alert-danger",
                        "innerHTML": message
                    });
            }
            var alertParent = (this.showLabel) ? this._labelContainer
                : this.widgetNode;
            dojoConstruct.place(this._alertDiv, alertParent);
            dojoClass.add(alertParent, "has-error");
        },

        // Is called whenever the dropdown changes to
        // remove the validation message
        _removeError: function() {
            if (this._alertDiv) {
                dojoConstruct.destroy(this._alertDiv);
                var alertParent = (this.showLabel) ? this._labelContainer
                    : this.widgetNode;
                dojoClass.remove(alertParent, "has-error");
                this._alertDiv = false;
            }
        },

        // This function adds the <option> elements to the dropdown,
        // first for the empty value and then for the selected values
        _addOptions: function () {
            this._addSingleOption( this.emptyCaption, "");
            for (var i = 0; i < this.enumOptions.length; i++) {
                this._addSingleOption(this.enumOptions[i].enumCaption,
                        this.enumOptions[i].enumKey);
            }
        },

        // Adds an option to the select node
        _addSingleOption: function(text, key) {
            dojoConstruct.create("option", {
                    "innerHTML": text,
                    "value": key
                }, this.inputNode);
        },

        // If a label is configured, add it and set the direction
        _addLabel: function() {
            if (this.showLabel === false) { return; }

            dojoConstruct.create("label", {
                    "class": (this.labelDirection === "Vertical") ?
                        "control-label" : "control-label col-sm-3",
                    "innerHTML": this.label
                }, this.widgetNode);

            this._labelContainer = dojoConstruct.create("div", {
                    "class": (this.labelDirection === "Vertical") ?
                        "" : "col-sm-9",
                }, this.widgetNode);
            this._labelContainer.appendChild(this.inputNode);

            dojoClass.toggle(this.widgetNode, "form-group");
        },

        // Add the listeners to the select node
        _setupEvents: function () {
            this.connect(this.inputNode, 'change',
                this._setAttributeValue);
        },

        // Remove the validation errors, and change the attribute
        // value to the selected option. If an onchange microflow
        // is selected kick it off
        _setAttributeValue: function (event) {
            this._removeError();
            var key = event.target.value;
            this._contextObj.set(this.enumAttribute, key);
            if (this.onChangeMF) {
                this._executeMicroflow(this.onChangeMF);
            }
        },

        // Perform callback function to let the update know its finished
        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback");
            if (cb && typeof cb === "function") {
                cb();
            }
        },

        // Execute microflow action
        _executeMicroflow: function (microflowName) {
            mx.ui.action(microflowName, {
                params: {
                    applyto: "selection",
                    guids: [this._contextObj.getGuid()]
                },
                scope: this.mxform,
            }, this);
        }
    });
});

require(["EnumSelector/widget/EnumSelector"]);

// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
     // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return kValue.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return undefined.
      return undefined;
    }
  });
}
