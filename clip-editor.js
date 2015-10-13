(function ($, CollageEditor) {

  /**
   * Adds editor functionality to the collage clips.
   *
   * @class H5PEditor.Collage.Clip
   * @extends H5P.Collage.Clip
   * @param {H5P.jQuery} $container
   * @param {Object} content
   * @param {number} contentId
   */
  CollageEditor.Clip = function (layoutSelector, fileUpload) {
    var self = this;

    // Use references
    var $img;
    var $container = self.$container;
    var content = self.content;

    // Makes it possible to pan / move the image around
    var zooming, startPos, currentOffset, maxOffset, lastOffset;

    // Binds all the event listeners when the clip changes
    self.on('change', function (event) {
      $container.removeClass('h5p-collage-loading');

      $img = event.data
        .on('mousedown', mousedown)
        .on('mousewheel DOMMouseScroll', scroll);
      $container
        .attr('tabindex', '0');

      if (zooming === undefined) {
        // Mousewheel zoom enabled while holding the Z key
        zooming = false;
        H5P.$body.on('keydown', function (event) {
          var keyCode = event.keyCode;
          if (keyCode === 90) {
            zooming = true;
          }
          else if ((keyCode === 107 || keyCode === 171 || keyCode === 187) && $container.is(':focus')) {
            zoom(0.1);
          }
          else if ((keyCode === 109 || keyCode === 173 || keyCode === 189) && $container.is(':focus')) {
            zoom(-0.1);
          }
        });
        H5P.$body.on('keyup', function (event) {
          if (event.keyCode === 90) {
            zooming = false;
          }
        });
      }
    });

    if (!self.empty()) {
      // Make sure we display a warning before changing templates.
      layoutSelector.warn = true;
    }

    /**
     * Makes it easy to create buttons
     *
     * @private
     * @param {string} name
     * @param {string} label
     * @param {function} callback
     * @returns {H5P.jQuery}
     */
    var createButton = function (name, label, callback) {
      return $('<div/>', {
        'class': 'h5p-collage-' + name,
        tabIndex: 0,
        role: 'button',
        'aria-label': label,
        on: {
          click: function () {
            callback();
            return false;
          },
          keydown: function (event) {
            if (event.which === 32) {
              event.preventDefault();
            }
          },
          keyup: function (event) {
            if (event.which === 32) {
              callback();
            }
          }
        },
        appendTo: $container
      });
    };

    // Add button for changing image
    var $changeButton = createButton('change-image', H5PEditor.t('H5PEditor.Collage', self.empty() ? 'addImage' : 'changeImage'), function () {
      fileUpload(function () {
        // Display loading screen
        self.loading();
        self.$container.addClass('h5p-collage-loading');
        $changeButton.attr('aria-label', H5PEditor.t('H5PEditor.Collage', 'changeImage'));
      }, function (err, result) {
        // Update clip
        self.update(result); // TODO: Use private?

        if (!err) {
          // Make sure we display a warning before changing templates.
          layoutSelector.warn = true;
        }
        else {
          $container.removeClass('h5p-collage-loading').addClass('h5p-collage-empty');
          $changeButton.attr('aria-label', H5PEditor.t('H5PEditor.Collage', 'addImage'));
          H5P.error(err);
          alert(CollageEditor.t('uploadError'));
        }
      });
    });

    createButton('zoom-out', H5PEditor.t('H5PEditor.Collage', 'zoomOut'), function () {
      zoom(-0.1);
    });

    createButton('zoom-in', H5PEditor.t('H5PEditor.Collage', 'zoomOut'), function () {
      zoom(0.1);
    });

    /**
     * Allows styling for the whole container when the clip is focused.
     *
     * @private
     */
    var focus = function () {
      $container.addClass('h5p-collage-focus');
    };

    /**
     * Remove focus styles.
     *
     * @private
     */
    var blur = function () {
      $container.removeClass('h5p-collage-focus');
    };

    /**
     * Handle mouse grabbing.
     *
     * @private
     * @param {Event} event
     */
    var mousedown = function (event) {
      if (event.button !== 0) {
        return; // Only left click
      }

      // Grab numbers
      var viewPort = getViewPort();
      currentOffset = new Size(pxToNum($img.css('marginLeft')), pxToNum($img.css('marginTop')));
      maxOffset = new Size($img.width() - viewPort.x, $img.height() - viewPort.y);
      startPos = new Size(event.pageX, event.pageY);

      // Listen for further mouse events
      H5P.$window
        .bind('mousemove', move)
        .bind('mouseup', release);

      H5P.$body
        .addClass('h5p-no-select');

      $img.addClass('h5p-collage-grabbed');
      $container.focus();
    };

    /**
     * Move image
     *
     * @private
     * @param {Event} event
     */
    var move = function (event) {
      lastOffset = new Offset(
        currentOffset,
        new Size(startPos.x - event.pageX, startPos.y - event.pageY),
        maxOffset
      );
      $img.css(lastOffset.getPx());
    };

    /**
     * Image released, stop moving
     *
     * @private
     */
    var release = function () {
      H5P.$window
        .unbind('mousemove', move)
        .unbind('mouseup', release);

      H5P.$body
        .removeClass('h5p-no-select');

      $img.removeClass('h5p-collage-grabbed');

      if (lastOffset) {
        content.offset = lastOffset.getPs();
      }
    };

    /**
     * Keep track of container size
     *
     * @private
     * @returns {Size}
     */
    var getViewPort = function () {
      return new Size($container.width(), $container.height());
    };

    /**
     * Handle scroll events
     * @param {Event} event
     */
    var scroll = function (event) {
      if (zooming) {
        // Set focus when hovering image and scrolling
        $container.focus();
        if (event.originalEvent.wheelDelta) {
          zoom(event.originalEvent.wheelDelta > 0 ? 0.1 : -0.1);
          return false;
        }
        else if (event.originalEvent.detail) {
          zoom(event.originalEvent.detail > 0 ? -0.1 : 0.1);
          return false;
        }
      }
    };

    /**
     * A helpers that makes it easier to keep track of size.
     *
     * @private
     * @class
     * @param {Number} x
     * @param {Number} y
     */
    function Size(x, y) {
      this.x = x;
      this.y = y;

      /**
       * Letter than
       *
       * @param {Size} size
       * @returns {boolean}
       */
      this.lt = function (size) {
        return this.x < size.x || this.y < size.y;
      };
    }

    /**
     * Helps calculate a new offset for the image.
     *
     * @private
     * @class
     * @param {Size} current
     * @param {Size} delta change
     * @param {Size} max value
     */
    function Offset(current, delta, max) {
      var x = current.x - delta.x;
      var y = current.y - delta.y;

      if (x > 0) {
        x = 0;
      }
      else if (x < -max.x) {
        x = -max.x;
      }

      if (y > 0) {
        y = 0;
      }
      else if (y < -max.y) {
        y = -max.y;
      }

      /**
       * Get pixel values
       * @returns {object}
       */
      this.getPx = function () {
        return {
          marginLeft: x + 'px',
          marginTop: y + 'px'
        };
      };

      /**
       * Get percentage values
       * @returns {object}
       */
      this.getPs = function () {
        var viewPort = getViewPort();
        var p = viewPort.x / 100;
        return {
          left: x / p,
          top: y / p
        };
      };
    }

    /**
     * Converts css pixel values to number
     *
     * @private
     * @returns {Number}
     */
    function pxToNum(px) {
      return Number(px.replace('px', ''));
    }

    /**
     * Zoom in / out on the clip.
     *
     * @private
     * @param {number} delta
     */
    var zoom = function (delta) {
      // Increase / decrease scale
      content.scale += delta;

      // Keep withing boundries
      if (content.scale < 1) {
        content.scale = 1;
      }
      if (content.scale > 3) {
        content.scale = 3;
      }

      // Keep track of size before scaling
      var before = new Size($img.width(), $img.height());

      // Scale
      $img.css(self.prop, (content.scale * 100) + '%');

      // ... and after scaling
      var after = new Size($img.width(), $img.height());

      var viewPort = getViewPort();
      var offset = new Offset(
        new Size(pxToNum($img.css('marginLeft')), pxToNum($img.css('marginTop'))),
        new Size(((after.x - before.x) / 2), ((after.y - before.y) / 2)),
        new Size(after.x - viewPort.x, after.y - viewPort.y)
      );
      $img.css(offset.getPx());
      content.offset = offset.getPs();
    };

    /**
     * Remove image and display throbber.
     */
    self.loading = function () {
      if ($img) {
        $img.remove();
      }
      $container.addClass('h5p-collage-loading');
    };

    /**
     * Change and load new image.
     * @param {object} newImage
     */
    self.update = function (newImage) {
      content.image = newImage;
      content.scale = 1;
      content.offset = {
        top: 0,
        left: 0
      };
      self.load();
    };

    /**
     * Makes sure the image covers the whole container.
     * Useful when changing the aspect ratio of the container.
     */
    self.fit = function () {
      var imageSize = {
        width: 'auto',
        height: 'auto',
        margin: content.offset.top + '% 0 0 ' + content.offset.left + '%'
      };

      // Reset size
      $img.css(imageSize);

      var containerSize = new Size($container.width(), $container.height());

      // Find ratios
      var imageRatio = ($img.width() / $img.height());
      var containerRatio = (containerSize.x / containerSize.y);

      // Set new size
      imageSize[imageRatio > containerRatio ? 'height' : 'width'] = (content.scale * 100) + '%';
      $img.css(imageSize);

      // Make sure image covers container
      var offset = new Offset(
        new Size(pxToNum($img.css('marginLeft')), pxToNum($img.css('marginTop'))),
        new Size(0, 0),
        new Size($img.width() - containerSize.x, $img.height() - containerSize.y)
      );
      $img.css(offset.getPx());
      content.offset = offset.getPs();
    };
  };

})(H5P.jQuery, H5PEditor.Collage);
