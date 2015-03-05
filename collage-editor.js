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

        /**
         * Upload new image
         */
        var changeImage = function () {
          fileUpload({
            name: 'collageClip',
            type: 'image'
          }, function () {
            clip.loading();
          }, function (err, result) {
            if (!err) {
              clip.update(result);
            }
          });
        };

        // Add button
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

        // Enable users to zoom and "cut" the image.
        clip.enableRepositioning();
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
