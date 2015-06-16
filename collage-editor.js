H5PEditor.Collage = (function ($, contentId, Collage) {

  /**
   * Collage Editor widget.
   *
   * @class H5P.CollageEditor
   * @param {Object} parent
   * @param {Object} field
   * @param {Object} params
   * @param {function} setValue
   */
  function CollageEditor(parent, field, params, setValue) {
    var self = this;

    // In case the editor is loaded before the Collage.
    Collage = H5P.Collage;

    // Get field options from semantics
    var layoutField = findField('template', field.fields);
    var optionsField = findField('options', field.fields);
    var heightField = findField('heightRatio', optionsField.fields);
    var spacingField = findField('spacing', optionsField.fields);
    var frameField = findField('frame', optionsField.fields);

    // Set params if none is given
    if (params === undefined) {
      params = {};
      setValue(field, params);
    }

    // Pass ready callbacks if the editor isn't ready yet
    var readyCallbacks = [];
    var passreadyCallbacks = true;
    parent.ready(function () {
      passreadyCallbacks = false;
    });

    // Editor wrapper
    $wrapper = $('<div/>', {
      'class': 'h5p-collage-editor'
    });

    // Create the collage for live preview
    var collage = new Collage({collage: params}, contentId);
    var layoutSelector;

    // Handle clips being added to the collage.
    collage.on('clipAdded', function (event) {
      var clip = event.data;

      if (!clip.empty()) {
        // Make sure we display a warning before changing templates.
        layoutSelector.warn = true;
      }

      /**
       * Upload new image
       * @private
       */
      var changeImage = function () {
        fileUpload(function () {
          // Display loading screen
          clip.loading();
        }, function (err, result) {
          // Update clip
          clip.update(result);

          if (!err) {
            // Make sure we display a warning before changing templates.
            layoutSelector.warn = true;
          }
          else {
            H5P.error(err);
            alert(CollageEditor.t('uploadError'));
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
            if (event.keyCode === 32 || event.charCode === 32) {
              changeImage();
            }
          }
        }
      });
      clip.append($changeButton);

      // Enable users to zoom and pan the image.
      clip.enableRepositioning();
    });

    /**
     * Make sure number appears with two decimals.
     *
     * @param {number} value
     * @returns {string}
     */
    var toHuman = function (value) {
      value = value.toString();
      var dot = value.indexOf('.');
      if (dot === -1) {
        value += '.00';
      }
      else if (value[dot + 2] === undefined) {
        value += '0';
      }
      return value;
    };

    /**
     * @private
     */
    var rangeSelector = function (field, change, step) {
      var last = toHuman(params.options[field.name]);
      CollageEditor.addLabel($wrapper, field.label);
      $('<input/>', {
        'class': 'h5p-collage-' + field.name + '-selector',
        type: 'range',
        min: field.min,
        max: field.max,
        step: (field.max - field.min) / step,
        value: params.options[field.name],
        on: {
          change: function () {
            params.options[field.name] = this.value;
            last = toHuman(this.value);
            $value.html(last);
            change(this.value);
          },
          input: function () {
            $value.html(toHuman(this.value) + ' (' + last + ')');
          }
        },
        appendTo: $wrapper
      });
      var $value = $('<div/>', {
        'class': 'h5p-collage-selector-preview',
        html: last,
        appendTo: $wrapper
      });
    };

    /**
     * Appends the collage editor widget
     *
     * @param {H5P.jQuery} $container
     */
    this.appendTo = function ($container) {
      // Add tiling layout selector
      layoutSelector = new CollageEditor.LayoutSelector($wrapper, layoutField.label, layoutField.options, params.template);
      layoutSelector.on('layoutChanged', function (event) {
        params.template = event.data;
        params.clips = [];
        collage.setLayout(params.template);
      });

      // Add spacing selector
      rangeSelector(spacingField, collage.setSpacing, 20);

      // Add frame options
      CollageEditor.addLabel($wrapper, frameField.label);
      $('<div class="h5p-collage-frame-selector"><label><input type="radio" name="h5p-collage-frame" value="1"' + (params.options.frame ? ' checked="checked"' : '') + '>' + CollageEditor.t('sameAsSpacing') + '</label><br/><label><input type="radio" name="h5p-collage-frame" value="0"' + (params.options.frame ? '' : ' checked="checked"') + '>' + CollageEditor.t('noFrame') + '</label></div>')
        .appendTo($wrapper)
        .find('input').change(function () {
          params.options.frame = (this.value === '1');
          collage.setFrame(params.options.frame ? params.options.spacing : 0);
        });

      // Add height adjustment
      rangeSelector(heightField, collage.setHeight, 38);

      // Add preview/editor label
      CollageEditor.addLabel($wrapper, field.label);

      // Attach Collage preview
      $preview = $('<div/>', {
        'class': 'h5p-collage-preview',
        appendTo: $wrapper
      });
      collage.attach($preview);

      // Add description
      $('<div/>', {
        'class': 'h5peditor-field-description',
        text: field.description,
        appendTo: $wrapper
      });

      // Attach wrapper to container
      $wrapper.appendTo($container);

      // Resize the collage
      collage.trigger('resize');
    };

    /**
     * Collect callbacks to run when the editor is done assembling.
     *
     * @param {function} ready callback
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
     * @returns {boolean}
     */
    this.validate = function () {
      return true;
    };

    /**
     * Remove this field and all child fields from the editor.
     */
    this.remove = function () {
      $wrapper.remove();
    };
  }

  /**
   * Get translations from the CollageEditor namespace.
   *
   * @param {string} key
   * @param {Object} placeholders
   * @returns {string} UI text
   */
  CollageEditor.t = function (key, placeholders) {
    return H5PEditor.t('H5PEditor.Collage', key, placeholders);
  };

  /**
   * Simple helper for creating labels.
   *
   * @param {H5P.jQuery} $container
   * @param {string} text label
   */
  CollageEditor.addLabel = function ($container, text) {
    $('<label/>', {
      'class': 'h5peditor-label',
      text: text,
      appendTo: $container
    });
  };

  /**
   * Look for field with given name in given collection.
   *
   * @private
   * @param {string} name of field
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
   * New file upload.
   *
   * @private
   * @param {function} change
   * @param {function} done
   */
  var fileUpload = function (change, done) {
    getIframe(function (iframe) {
      onChange(iframe, change);
      onResponse(iframe, done);
      iframe.$file.click();
    });
  };

  var iframes = [];

  /**
   * Find available iframe for uploading.
   *
   * @private
   * @param {function} found
   */
  var getIframe = function (found) {
    // Find iframe
    for (var i = 0; i < iframes.length; i++) {
      var iframe = iframes[i];
      if (!iframe.inUse) {
        iframe.$element.unbind('load');
        iframe.$file.unbind('change');
        found(iframe);
        return;
      }
    }

    newIframe(found);
  };

  /**
   * Create new iframe for uploading.
   *
   * @private
   * @param {function} done
   */
  var newIframe = function (done) {
    var $element = $('<iframe/>', {
      css: {
        position: 'absolute',
        width: '1px',
        height: '1px',
        top: '-1px',
        border: 0,
        overflow: 'hidden'
      },
      one: {
        load: function () {
          // Create upload form
          var iframe = {
            inUse: false,
            $element: $(this),
            $form: $('<form/>', {
              method: 'post',
              enctype: 'multipart/form-data',
              action: H5PEditor.getAjaxUrl('files')
            })
          };

          var field = {
            name: 'collageClip',
            type: 'image'
          };

          // Determine allowed file mimes
          var mimes;
          if (field.mimes) {
            mimes = field.mimes.join(',');
          }
          else if (field.type === 'image') {
            mimes = 'image/jpeg,image/png,image/gif';
          }

          // Create input fields
          iframe.$file = $('<input/>', {
            type: 'file',
            name: 'file',
            accept: mimes,
            appendTo: iframe.$form
          });
          $('<input/>', {
            type: 'hidden',
            name: 'field',
            value: JSON.stringify(field),
            appendTo: iframe.$form
          });
          $('<input/>', {
            type: 'hidden',
            name: 'contentId',
            value: contentId ? contentId : 0,
            appendTo: iframe.$form
          });

          var $body = iframe.$element.contents().find('body');
          iframe.$form.appendTo($body);

          iframes.push(iframe);
          if (done) {
            done(iframe);
          }
        }
      },
      appendTo: 'body'
    });
  };

  /**
   * Handle iframe loaded events.
   *
   * @private
   * @param {HTMLElementObject} iframe
   * @param {function} done
   */
  var onResponse = function (iframe, done) {
    iframe.$element.on('load', function () {
      var $body = iframe.$element.contents().find('body');
      var response = $body.text();
      removeIframe(iframe);

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
    });
  };

  /**
   * Remove iframe after uploading.
   *
   * @private
   * @param {HTMLElementObject} iframe
   */
  var removeIframe = function (iframe) {
    iframe.$element.remove();
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i] === iframe)  {
        iframes.splice(i, 1);
        break;
      }
    }
    if (iframes.length === 0) {
      // Always keep an iframe ready
      newIframe();
    }
  };

  /**
   * Handle file selecting.
   *
   * @private
   * @param {HTMLElementObject} iframe
   * @param {function} change
   */
  var onChange = function (iframe, change) {
    iframe.$file.on('change', function () {
      iframe.inUse = true;
      change();
      iframe.$form.submit();
    });
  };

  // Init upload
  newIframe();

  return CollageEditor;
})(H5P.jQuery, H5PEditor.contentId);

// Register widget
H5PEditor.widgets.collage = H5PEditor.Collage;

// Add strings for l10n
H5PEditor.language['H5PEditor.Collage'] = {
  libraryStrings: {
    confirmReset: 'Are you sure you wish to change the tiling layout? This will reset the preview.',
    sameAsSpacing: 'Same as tile spacing',
    noFrame: 'No frame',
    uploadError: 'Unable to upload image. The file is probably to large.'
  }
};
