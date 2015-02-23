H5P.CollageEditor = (function ($, contentId, Collage) {

    /**
     * Collage Editor widget.
     *
     * @class
     * @namespace H5P
     * @param {Object} parent
     * @param {Object} field
     * @param {Object} params
     * @param {Function} setValue
     */
    function CollageEditor(parent, field, params, setValue) {
      var self = this;

      // Set default params if none is given
      if (params === undefined) {
        params = {
          template: '2-1',
          options: {
            heightRatio: 0.75, // findField('heightRatio', field.fields).default,
            spacing: 0.5
          },
          clips: []
        };

        setValue(field, params);
      }

      // Pass ready callbacks if the editor isn't ready yet
      var readyCallbacks = [];
      var passreadyCallbacks = true;
      parent.ready(function () {
        passreadyCallbacks = false;
      });
      // TODO: Suggest that we use events for this in the future

      $wrapper = $('<div/>');

      var collage = new H5P.Collage(parent.params, contentId);


      /**
       * Handle clips added to collage.
       */
      collage.on('clipAdded', function (event) {
        var clip = event.data;

        var changeImage = function () {
          console.log('Changing image');

          fileUpload({
            name: 'collageClip',
            type: 'image'
          }, function () {
            clip.remove();
          }, function (err, result) {
            console.log(err, result);
            if (!err) {
              clip.updateImage(result);
            }
          });
        };

        var $changeButton = $('<div/>', {
          'class': 'h5p-collage-change-image',
          tabIndex: 0,
          role: 'button',
          text: 'Change Image',
          on: {
            click: function () {
              changeImage();
              return false;
            },
            keypress: function (event) {
              if (event.keyCode === 32) {
                changeImage();
              }
            }
          }
        });

        clip.append($changeButton);

        clip.$img.on('mousewheel', function (event) {
          // TODO: Only with Shift key??
          clip.zoom(event.originalEvent.wheelDelta > 0 ? 0.1 : -0.1);
          return false;
        });


        // TODO: Add keyboard and touch support?
        var start, offset, max;
        var release = function () {
          H5P.$body
            .unbind('mouseup', release)
            .unbind('mouseleave', release)
            .unbind('mousemove', move);

          clip.$img.css('cursor', '');

          // Convert to %
        };
        var move = function (event) {
          var moved = {
            left: (start.left - event.pageX) * 1,
            top: (start.top - event.pageY) * 1,
          };
          var style = {
            marginLeft: offset.left - moved.left,
            marginTop: offset.top - moved.top
          };

          if (style.marginLeft > 0) {
            style.marginLeft = 0;
          }
          else if (style.marginLeft < -max.left) {
            style.marginLeft = -max.left;
          }

          if (style.marginTop > 0) {
            style.marginTop = 0;
          }
          else if (style.marginTop < -max.top) {
            style.marginTop = -max.top;
          }

          clip.$img.css(style);
        };

        clip.$img.on('mousedown', function (event) {
          if (event.button !== 0) {
            return; // Only left click
          }

          offset = {
            left: Number(clip.$img.css('marginLeft').replace('px', '')),
            top: Number(clip.$img.css('marginTop').replace('px', ''))
          };
          max = {
            left: clip.$img.width() - clip.$img.parent().width(),
            top: clip.$img.height() - clip.$img.parent().height()
          };
          start = {
            left: event.pageX,
            top: event.pageY
          };

          H5P.$body
            .bind('mouseup', release)
            .bind('mouseleave', release)
            .bind('mousemove', move);

          clip.$img.css('cursor', '-webkit-grabbing');
        });

        // ,
        // mousedown: function () {
        //   self.trigger('mousedown');
        // }
        // ,
        // touchdown: function () {
        //   self.trigger('touchdown');
        // },

      });

      /**
       *
       *
       * @public
       * @param {jQuery} $container
       */
      this.appendTo = function ($container) {
        // Attach Collage
        collage.attach($wrapper);

        // Attach wrapper to container
        $wrapper.appendTo($container);

        // Resize the collage
        collage.trigger('resize');


        //$container.append('<div>Hello:-)</div>');

        // Attach Editor
        //return H5PEditor.createItem(this.field.widget, '<div class="editor"></div>');
        // this.$item = H5PEditor.$(this.createHtml()).appendTo($wrapper);
        // this.$editor = this.$item.children('.editor');
        // this.$errors = this.$item.children('.h5p-errors');

        // Resize collage?
      };

      /**
       * Collect callbacks to run when the editor is done assembling.
       *
       * @public
       * @param {Function} ready callback
       */
      this.ready = function (ready) {
        if (passreadyCallbacks) {
          parent.ready(ready);
        }
        else {
          readyCallbacks.push(ready);
        }
      };

      /**
       * Checks if this field and all child fields are valid.
       *
       * @public
       * @returns {Boolean}
       */
      this.validate = function () {
        return true;
      };

      /**
       * Remove this field and all child fields from the editor.
       *
       * @public
       */
      this.remove = function () {
        //this.$item.remove();
      };
    }

    /**
     * Get translations for the CollageEditor namespace.
     *
     * @private
     * @param {String} key
     * @param {Object} placeholders
     * @returns {String} placeholders
     */
    var t = function (key, placeholders) {
      return H5PEditor.t('H5P.CollageEditor', key, placeholders);
    };

    /**
     * TODO: Suggest that this is put into core
     * Look for field with given name in given collection.
     *
     * @private
     * @param {String} name of field
     * @param {Array} fields collection to look in
     * @returns {Object} field object
     */
    var findField = function (name, fields) {
      for (var i = 0; i < fields.length; i++) {
        if (fields[i].name === name) {
          return fields[i];
        }
      }
    };

    /**
     * @private
     * @param {Object} field
     * @param {Function} change
     * @param {Function} done
     */
    var fileUpload = function (field, change, done) {
      $('<iframe/>', {
        css: {
          position: 'absolute',
          width: '1px',
          height: '1px',
          top: '-1px',
          border: 0,
          overflow: 'hidden'
        },
        on: {
          load: function () {
            var $body = $(this).contents().find('body');
            var response = $body.text();

            // Try to parse repsonse
            if (response) {
              try {
                var result = JSON.parse(response);
                if (result.error !== undefined) {
                  throw(result.error);
                }

                // Return response
                done(null, result);
                return;
              }
              catch (err) {
                done(err);
              }
            }

            // Create upload form
            var $form = $('<form/>', {
              method: 'post',
              enctype: 'multipart/form-data',
              action: H5PEditor.getAjaxUrl('files')
            });

            // Determine allowed file mimes
            var mimes;
            if (field.mimes) {
              mimes = field.mimes.join(',');
            }
            else if (field.type === 'image') {
              mimes = 'image/jpeg,image/png,image/gif';
            }

            // Create input fields
            $file = $('<input/>', {
              type: 'file',
              name: 'file',
              accept: mimes,
              on: {
                change: function () {
                  change();
                  $form.submit();
                }
              },
              appendTo: $form
            });
            $('<input/>', {
              type: 'hidden',
              name: 'field',
              value: JSON.stringify(field),
              appendTo: $form
            });
            $('<input/>', {
              type: 'hidden',
              name: 'contentId',
              value: contentId ? contentId : 0,
              appendTo: $form
            });

            $form.appendTo($body);
            $file.click();
          }
        },
        appendTo: 'body'
      });
    };

    return CollageEditor;
})(H5P.jQuery, H5PEditor.contentId);

// Register widget
H5PEditor.widgets.collage = H5P.CollageEditor;

// Add strings for l10n
H5PEditor.language['H5P.CollageEditor'] = {
  "libraryStrings": {
    "loading": "Loading..."
  }
};


//
// H5PEditor.CoursePresentation.prototype.addDNBButton = function (library) {
//   var that = this;
//   var id = library.name.split('.')[1].toLowerCase();
//
//   return {
//     id: id,
//     title: H5PEditor.t('H5PEditor.CoursePresentation', 'insertElement', {':type': library.title.toLowerCase()}),
//     createElement: function () {
//       return that.addElement(library.uberName);
//     }
//   };
// };
//
// /**
//  * Initialize the drag and drop menu bar.
//  *
//  * @returns {undefined}
//  */
// H5PEditor.CoursePresentation.prototype.initializeDNB = function () {
//   var that = this;
//
//   this.$bar = H5PEditor.$('<div class="h5p-dragnbar">' + H5PEditor.t('H5PEditor.CoursePresentation', 'loading') + '</div>').insertBefore(this.cp.$boxWrapper);
//   H5PEditor.$.post(H5PEditor.ajaxPath + 'libraries', {libraries: this.field.field.fields[0].field.fields[0].options}, function (libraries) {
//     var buttons = [];
//     for (var i = 0; i < libraries.length; i++) {
//       if (libraries[i].restricted !== true) {
//         buttons.push(that.addDNBButton(libraries[i]));
//       }
//     }
//
//     that.dnb = new H5P.DragNBar(buttons, that.cp.$current);
//
//     // Update params when the element is dropped.
//     that.dnb.stopMovingCallback = function (x, y) {
//       var params = that.params[that.cp.$current.index()].elements[that.dnb.dnd.$element.index()];
//       params.x = x * that.cp.slideWidthRatio;
//       params.y = y;
//     };
//
//     // Edit element when it is dropped.
//     that.dnb.dnd.releaseCallback = function () {
//       var params = that.params[that.cp.$current.index()].elements[that.dnb.dnd.$element.index()];
//
//       if (that.dnb.newElement) {
//         if (H5P.libraryFromString(params.action.library).machineName === 'H5P.ContinuousText') {
//           H5P.ContinuousText.Engine.run(that);
//           if (that.ct.counter === 1) {
//             that.dnb.dnd.$element.dblclick();
//           }
//         }
//         else {
//           that.dnb.dnd.$element.dblclick();
//         }
//         that.dnb.newElement = false;
//       }
//     };
//
//     that.dnb.attach(that.$bar);
//
//     if (that.cp.keywordsWidth) {
//       // Bind keyword interactions.
//       that.initKeywordInteractions();
//     }
//
//     // Add existing items to DNB
//     that.cp.$wrapper.find('.h5p-element').each(function () {
//       that.addToDragNBar(H5PEditor.$(this));
//     });
//   });
// };
//
// /**
//  * Generate element form.
//  *
//  * @param {Object} elementParams
//  * @param {String} machineName
//  * @param {Boolean} isContinuousText
//  * @returns {Object}
//  */
// H5PEditor.CoursePresentation.prototype.generateForm = function (elementParams, machineName, isContinuousText) {
//   var that = this;
//
//   if (isContinuousText && this.ct !== undefined) {
//     // ContinuousText uses the form of the first CT element.
//     this.ct.counter++;
//     this.ct.lastIndex++;
//
//     return {
//       '$form': this.ct.form
//     };
//   }
//
//   var popupTitle = H5PEditor.t('H5PEditor.CoursePresentation', 'popupTitle', {':type': machineName.split('.')[1]});
//   var element = {
//     '$form': H5P.jQuery('<div title="' + popupTitle + '"></div>')
//   };
//   H5PEditor.processSemanticsChunk(this.field.field.fields[0].field.fields, elementParams, element.$form, this);
//   element.children = this.children;
//
//   // Hide library selector
//   element.$form.children('.library:first').children('label, select').hide().next().css('margin-top', '0');
//
//   // Continuous text specific code
//   if (isContinuousText) {
//     // TODO: Clean up and remove unused stuff.
//     this.ct = {
//       form: element.$form,
//       children: element.children,
//       element: elementParams,
//       counter: 1,
//       lastIndex: 0,
//       wrappers: []
//     };
//   }
//
//   // Set correct aspect ratio on new images.
//   var library = element.children[0];
//   var libraryChange = function () {
//     if (library.children[0].field.type === 'image') {
//       library.children[0].changes.push(function (params) {
//         if (params === undefined) {
//           return;
//         }
//
//         if (params.width !== undefined && params.height !== undefined) {
//           elementParams.height = elementParams.width * (params.height / params.width) * that.slideRatio * that.cp.slideWidthRatio;
//         }
//       });
//     }
//   };
//   if (library.children === undefined) {
//     library.changes.push(libraryChange);
//   }
//   else {
//     libraryChange();
//   }
//
//   if (elementParams.action.library.split(' ')[0] !== 'H5P.Text') {
//     element.$form.children('.field.boolean:last').hide();
//   }
//
//   return element;
// };
//
// /**
//  * Callback used by CP when a new element is added.
//  *
//  * @param {Object} elementParams
//  * @param {jQuery} $wrapper
//  * @param {Number} slideIndex
//  * @returns {undefined}
//  */
// H5PEditor.CoursePresentation.prototype.processElement = function (elementParams, $wrapper, slideIndex, elementInstance) {
//   var that = this;
//   var elementIndex = $wrapper.index();
//   var machineName = H5P.libraryFromString(elementParams.action.library).machineName;
//   var isContinuousText = (machineName === 'H5P.ContinuousText');
//   var isDragQuestion = (machineName === 'H5P.DragQuestion');
//
//   if (this.elements[slideIndex] === undefined) {
//     this.elements[slideIndex] = [];
//   }
//
//   if (this.elements[slideIndex][elementIndex] === undefined) {
//     this.elements[slideIndex][elementIndex] = this.generateForm(elementParams, machineName, isContinuousText);
//   }
//   var element = this.elements[slideIndex][elementIndex];
//   element.$wrapper = $wrapper;
//
//   if (isContinuousText) {
//     element.children = [];
//     // Index is needed to later find the correct wrapper:
//     elementParams.index = this.ct.lastIndex;
//     this.ct.wrappers[this.ct.lastIndex] = $wrapper;
//   }
//
//   // Edit when double clicking
//   $wrapper.dblclick(function () {
//     that.showElementForm(element, $wrapper, elementParams);
//   });
//
//   // Make it possible to move the element around
//   this.addToDragNBar($wrapper);
//
//   var elementSize = {};
//
//   var ctReflowRunning = false;
//   var startCTReflowLoop = function () {
//     ctReflowRunning = true;
//     // Note: Not using setInterval because the reflow may be so slow it will
//     // creep across timer boundaries. Better to force a 250ms wait inbetween.
//     setTimeout(function reflowLoop() {
//       H5P.ContinuousText.Engine.run(that);
//
//       // Keep reflowing until stopped.
//       if (ctReflowRunning) {
//         setTimeout(reflowLoop, 250);
//       }
//     }, 250);
//   };
//
//   if (elementParams.displayAsButton === undefined || !elementParams.displayAsButton) {
//     // Allow resize
//     // Calculate minimum height - one line of text + padding:
//     var fontSize = parseInt($wrapper.css('font-size'));
//     var padding = $wrapper.outerHeight() - $wrapper.innerHeight();
//     var minSize = fontSize + padding;
//     $wrapper.resizable({
//       minWidth: minSize,
//       minHeight: minSize,
//       grid: [10, 10],
//       containment: 'parent',
//       stop: function () {
//         elementParams.width = ($wrapper.width() + 2) / (that.cp.$current.innerWidth() / 100);
//         elementParams.height = ($wrapper.height() + 2) / (that.cp.$current.innerHeight() / 100);
//         that.resizing = false;
//         if (isDragQuestion) {
//           that.updateDragQuestion($wrapper, element, elementParams);
//         }
//         if (isContinuousText) {
//           ctReflowRunning = false;
//         }
//         elementInstance.$.trigger('resize');
//       },
//       start: function (event, ui) {
//         if (isContinuousText) {
//           startCTReflowLoop();
//         }
//
//         elementSize = {
//           width: ui.size.width,
//           height: ui.size.height
//         };
//       }
//     }).children('.ui-resizable-handle').mousedown(function (event) {
//       that.resizing = true;
//     });
//
//     // Override resizing snap to grid with Ctrl
//     H5P.$body.keydown(function (event) {
//       if (event.keyCode === 17) {
//         $wrapper.resizable('option', 'grid', false);
//       }
//     }).keyup(function (event) {
//       if (event.keyCode === 17) {
//         $wrapper.resizable('option', 'grid', [10, 10]);
//       }
//     });
//   }
//
//   if (elementInstance.onAdd) {
//     elementInstance.onAdd(elementParams, slideIndex);
//   }
// };
//
// /**
//  * Make sure element can be moved and stop moving while resizing.
//  *
//   * @param {jQuery} $element wrapper
//   * @returns {undefined}
//  */
// H5PEditor.CoursePresentation.prototype.addToDragNBar = function($element) {
//   var self = this;
//
//   if (self.dnb === undefined) {
//     return;
//   }
//
//   $element.mousedown(function (event) {
//     if (self.resizing) {
//       return false; // Disables moving while resizing
//     }
//   });
//
//   self.dnb.add($element);
// };
//
// /**
//  * Removes element from slide.
//  *
//  * @param {Object} element
//  * @param {jQuery} $wrapper
//  * @param {Boolean} isContinuousText
//  * @returns {undefined}
//  */
// H5PEditor.CoursePresentation.prototype.removeElement = function (element, $wrapper, isContinuousText) {
//   var slideIndex = this.cp.$current.index();
//   var elementIndex = $wrapper.index();
//
//   var elementInstance = this.cp.elementInstances[slideIndex][elementIndex];
//
//   if (element.children.length) {
//     H5PEditor.removeChildren(element.children);
//   }
//
//   this.elements[slideIndex].splice(elementIndex, 1);
//   this.cp.elementInstances[slideIndex].splice(elementIndex, 1);
//   this.params[slideIndex].elements.splice(elementIndex, 1);
//
//   $wrapper.remove();
//   if(elementInstance.onDelete) {
//     elementInstance.onDelete(this.params,slideIndex,elementIndex);
//   }
//
//   if (isContinuousText) {
//     this.ct.counter--;
//     H5P.ContinuousText.Engine.run(this);
//   }
// };
//
// /**
//  * Displays the given form in a popup.
//  *
//  * @param {jQuery} $form
//  * @param {jQuery} $wrapper
//  * @param {object} element Params
//  * @returns {undefined}
//  */
// H5PEditor.CoursePresentation.prototype.showElementForm = function (element, $wrapper, elementParams) {
//   var that = this;
//
//   var isContinuousText = (H5P.libraryFromString(elementParams.action.library).machineName === 'H5P.ContinuousText');
//   if (isContinuousText) {
//     // Make sure form uses the right text. There ought to be a better way of
//     // doing this.
//     that.ct.form.find('.text .ckeditor').first().html(that.params[0].ct);
//   }
//
//   if (that.dnb !== undefined) {
//     that.dnb.blur();
//   }
//
//   element.$form.dialog({
//     modal: true,
//     draggable: false,
//     resizable: false,
//     width: '80%',
//     maxHeight: H5P.jQuery('.h5p-coursepresentation-editor').innerHeight(),
//     position: {my: 'top', at: 'top', of: '.h5p-coursepresentation-editor'},
//     dialogClass: "h5p-dialog-no-close",
//     appendTo: '.h5p-course-presentation',
//     buttons: [
//       {
//         text: H5PEditor.t('H5PEditor.CoursePresentation', 'remove'),
//         class: 'h5p-remove',
//         click: function () {
//           if (!confirm(H5PEditor.t('H5PEditor.CoursePresentation', 'confirmRemoveElement'))) {
//             return;
//           }
//           if (H5PEditor.Html) {
//             H5PEditor.Html.removeWysiwyg();
//           }
//           element.$form.dialog('close');
//           that.removeElement(element, $wrapper, isContinuousText);
//         }
//       },
//       {
//         text: H5PEditor.t('H5PEditor.CoursePresentation', 'done'),
//         class: 'h5p-done',
//         click: function () {
//           var elementKids = isContinuousText ? that.ct.children : element.children;
//
//           // Validate children
//           var valid = true;
//           for (var i = 0; i < elementKids.length; i++) {
//             if (elementKids[i].validate() === false) {
//               valid = false;
//             }
//           }
//           if (!valid) {
//             return false;
//           }
//
//           // Need to do reflow, to populate all other CT's
//           // and to get this CT's content after editing
//           if (isContinuousText) {
//             // Get value from form:
//             that.params[0].ct = that.ct.element.action.params.text;
//             // Run reflow for all elements:
//             H5P.ContinuousText.Engine.run(that);
//           }
//           else {
//             that.redrawElement($wrapper, element, elementParams);
//           }
//           if (H5PEditor.Html) {
//             H5PEditor.Html.removeWysiwyg();
//           }
//           element.$form.dialog('close');
//         }
//       }
//     ]
//   });
//   if (H5P.libraryFromString(elementParams.action.library).machineName === 'H5P.DragQuestion') {
//     this.manipulateDragQuestion(element);
//   }
// };
//
// H5PEditor.CoursePresentation.prototype.redrawElement = function($wrapper, element, elementParams) {
//   var elementIndex = $wrapper.index();
//   var slideIndex = this.cp.$current.index();
//   var elementsParams = this.params[slideIndex].elements;
//   var elements = this.elements[slideIndex];
//   var elementInstances = this.cp.elementInstances[slideIndex];
//
//   // Remove instance of lib:
//   elementInstances.splice(elementIndex, 1);
//
//   // Update params
//   elementsParams.splice(elementIndex, 1);
//   elementsParams.push(elementParams);
//
//   // Update elements
//   elements.splice(elementIndex, 1);
//   elements.push(element);
//
//   // Update visuals
//   $wrapper.remove();
//
//   var instance = this.cp.addElement(elementParams, this.cp.$current, slideIndex);
//   var $element = this.cp.attachElement(elementParams, instance, this.cp.$current, slideIndex);
//
//   // Resize element.
//   instance = elementInstances[elementInstances.length - 1];
//   if ((instance.preventResize === undefined || instance.preventResize === false) && instance.$ !== undefined) {
//     instance.$.trigger('resize');
//   }
//
//   var that = this;
//   setTimeout(function () {
//     // Put focus back on element
//     that.dnb.focus($element);
//   }, 1);
// };
//
