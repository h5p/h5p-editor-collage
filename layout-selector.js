/**
 * Extends H5P.CollageEditor with a Layout Selector class.
 */
(function ($, EventDispatcher, CollageEditor) {

  /**
   * A small widget that makes it easy to switch between collage layouts.
   *
   * @class
   * @namespace H5P.CollageEditor
   * @param {jQuery} $container
   * @param {string} label
   * @param {Array} layouts
   * @param {string} selectedDefault
   */
  CollageEditor.LayoutSelector = function ($container, label, layouts, selectedDefault) {
    var self = this;

    // Initialize event inheritance
    EventDispatcher.call(self);

    // Create wrapper
    var $wrapper = $('<div/>', {
      'class': 'h5p-collage-editor-layout-selector'
    });

    // Add label
    CollageEditor.addLabel($wrapper, label);

    // Keep track of selected layout
    var $selected;

    /**
     * Adds a preview of the given layout.
     *
     * @private
     * @param {string} layout
     */
    var addLayout = function (layout) {
      var $layout = $('<div/>', {
        'class': 'h5p-collage-editor-layout-preview' + (layout.value === selectedDefault ? ' h5p-collage-selected-layout' : ''),
        tabIndex: '0',
        role: 'button',
        title: layout.label,
        on: {
          click: function () {
            selectLayout($layout, layout.value);
          },
          keypress: function (event) {
            if (event.keyCode === 32 || event.charCode === 32) {
              selectLayout($layout, layout.value);
            }
          }
        },
        appendTo: $wrapper
      });
      new Collage.Template($layout, 0.25, layout.value);

      if (layout.value === selectedDefault) {
        $selected = $layout;
      }
    };

    /**
     * Selects the given layout.
     *
     * @private
     * @param {jQuery} $preview
     * @param {string} layout
     */
    var selectLayout = function ($preview, layout) {
      // TODO: Only display confirm dialog if the user actually has uploaded something.
      if (!confirm(CollageEditor.t('confirmReset'))) {
        return;
      }

      $selected.removeClass('h5p-collage-selected-layout');
      $selected = $preview.addClass('h5p-collage-selected-layout');

      self.trigger('layoutChanged', layout);
    };

    // Add options
    for (var i = 0; i < layouts.length; i++) {
      addLayout(layouts[i]);
    }
    $wrapper.appendTo($container);
  };

  // Extends the event dispatcher
  CollageEditor.LayoutSelector.prototype = Object.create(EventDispatcher.prototype);
  CollageEditor.LayoutSelector.prototype.constructor = CollageEditor.LayoutSelector;

})(H5P.jQuery, H5P.EventDispatcher, H5P.CollageEditor);
