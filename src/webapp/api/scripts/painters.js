/*==================================================
 *  Duration Event Painter
 *==================================================
 */

Timeline.DurationEventPainter = function(params) {
    this._params = params;
    this._theme = params.theme;
    this._layout = params.layout;
    
    this._showText = params.showText;
    this._showLineForNoText = ("showLineForNoText" in params) ? 
        params.showLineForNoText : params.theme.event.instant.showLineForNoText;
        
    this._filterMatcher = null;
    this._highlightMatcher = null;
    this._eventIdToElmt = {};
};

Timeline.DurationEventPainter.prototype.initialize = function(band, timeline) {
    this._band = band;
    this._timeline = timeline;
    this._layout.initialize(band, timeline);
    
    this._eventLayer = null;
    this._highlightLayer = null;
};

Timeline.DurationEventPainter.prototype.getLayout = function() {
    return this._layout;
};

Timeline.DurationEventPainter.prototype.setLayout = function(layout) {
    this._layout = layout;
};

Timeline.DurationEventPainter.prototype.getFilterMatcher = function() {
    return this._filterMatcher;
};

Timeline.DurationEventPainter.prototype.setFilterMatcher = function(filterMatcher) {
    this._filterMatcher = filterMatcher;
};

Timeline.DurationEventPainter.prototype.getHighlightMatcher = function() {
    return this._highlightMatcher;
};

Timeline.DurationEventPainter.prototype.setHighlightMatcher = function(highlightMatcher) {
    this._highlightMatcher = highlightMatcher;
};

Timeline.DurationEventPainter.prototype.paint = function() {
    var eventSource = this._band.getEventSource();
    if (eventSource == null) {
        return;
    }
    
    this._eventIdToElmt = {};
    
    if (this._highlightLayer != null) {
        this._band.removeLayerDiv(this._highlightLayer);
    }
    this._highlightLayer = this._band.createLayerDiv(105);
    this._highlightLayer.setAttribute("name", "event-highlights");
    this._highlightLayer.style.display = "none";
    
    if (this._eventLayer != null) {
        this._band.removeLayerDiv(this._eventLayer);
    }
    this._eventLayer = this._band.createLayerDiv(110);
    this._eventLayer.setAttribute("name", "events");
    this._eventLayer.style.display = "none";
    
    var minDate = this._band.getMinDate();
    var maxDate = this._band.getMaxDate();
    
    var filterMatcher = (this._filterMatcher != null) ? 
        this._filterMatcher :
        function(evt) { return true; };
    var highlightMatcher = (this._highlightMatcher != null) ? 
        this._highlightMatcher :
        function(evt) { return -1; };
    
    var iterator = eventSource.getEventIterator(minDate, maxDate);
    while (iterator.hasNext()) {
        var evt = iterator.next();
        if (filterMatcher(evt)) {
            this.paintEvent(evt, highlightMatcher(evt));
        }
    }
    
    this._highlightLayer.style.display = "block";
    this._eventLayer.style.display = "block";
};

Timeline.DurationEventPainter.prototype.softPaint = function() {
};

Timeline.DurationEventPainter.prototype.paintEvent = function(evt, highlightIndex) {
    var theme = this._params.theme;
    var eventTheme = theme.event;
    var trackOffset = eventTheme.track.offset;
    var trackHeight = ("trackHeight" in this._params) ? this._params.trackHeight : eventTheme.track.height;
    var trackGap = ("trackGap" in this._params) ? this._params.trackGap : eventTheme.track.gap;
    
    var startDate = evt.getStart();
    var endDate = evt.getEnd();
    
    var startPixel = Math.round(this._band.dateToPixelOffset(startDate));
    var endPixel = Math.round(this._band.dateToPixelOffset(endDate));
    
    var streamOffset = (trackOffset + this._layout.getTrack(evt) * (trackHeight + trackGap));
    if (evt.isInstant()) {
        this.paintInstantEvent(evt, startPixel, endPixel, streamOffset + "em", trackHeight,
            highlightIndex, streamOffset - trackGap, trackHeight + 2 * trackGap);
    } else {
        this.paintDurationEvent(evt, startPixel, endPixel, streamOffset + "em", trackHeight,
            highlightIndex, streamOffset - trackGap, trackHeight + 2 * trackGap);
    }
};
    
Timeline.DurationEventPainter.prototype.paintInstantEvent = function(
    evt, startPixel, endPixel, streamOffset, trackHeight, highlightIndex, highlightOffset, highlightWidth) {
    
    var p = this;
    var doc = this._timeline.getDocument();
    var theme = this._params.theme;
    var eventTheme = theme.event;
    
    if (evt.isImprecise()) { // imprecise time
        var length = Math.max(endPixel - startPixel, 1);
    
        var divImprecise = doc.createElement("div");
        divImprecise.style.position = "absolute";
        divImprecise.style.overflow = "hidden";
        
        divImprecise.style.top = streamOffset;
        divImprecise.style.height = trackHeight + "em";
        divImprecise.style.left = startPixel + "px";
        divImprecise.style.width = length + "px";
        
        divImprecise.style.background = eventTheme.instant.impreciseColor;
        if (eventTheme.instant.impreciseOpacity < 100) {
            SimileAjax.Graphics.setOpacity(divImprecise, eventTheme.instant.impreciseOpacity);
        }
        
        this._eventLayer.appendChild(divImprecise);
    }
    
    var div = doc.createElement("div");
    div.style.position = "absolute";
    div.style.overflow = "hidden";
    this._eventLayer.appendChild(div);
    
    var foreground = evt.getTextColor();
    var background = evt.getColor();
    
    var realign = -8; // shift left so that icon is centered on startPixel
    var length = 16;
    if (this._showText) {
        div.style.width = eventTheme.label.width + "px";
        div.style.color = foreground != null ? foreground : eventTheme.label.outsideColor;
        
        this._appendIcon(evt, div);
        this._eventIdToElmt[evt.getID()] = div.lastChild;

        div.appendChild(doc.createTextNode(evt.getText()));
    } else {
        if (p._showLineForNoText) {
            div.style.width = "1px";
            div.style.borderLeft = "1px solid " + (background != null ? background : eventTheme.instant.lineColor);
            realign = 0; // no shift
            length = 1;
            
            this._eventIdToElmt[evt.getID()] = div;
        } else {
            this._appendIcon(evt, div);
            this._eventIdToElmt[evt.getID()] = div.lastChild;
        }
    }
    
    div.style.top = streamOffset;
    div.style.height = trackHeight + "em";
    div.style.left = (startPixel + realign) + "px";
    
    this._createHighlightDiv(highlightIndex, (startPixel + realign), length, highlightOffset, highlightWidth);
};

Timeline.DurationEventPainter.prototype.paintDurationEvent = function(
    evt, startPixel, endPixel, streamOffset, trackHeight, highlightIndex, highlightOffset, highlightWidth) {
    
    var p = this;
    var doc = this._timeline.getDocument();
    var theme = this._params.theme;
    var eventTheme = theme.event;
    
    var attachClickEvent = function(elmt) {
        elmt.style.cursor = "pointer";
        SimileAjax.DOM.registerEvent(elmt, "mousedown", function(elmt, domEvt, target) {
            p._onClickDurationEvent(target, domEvt, evt);
            
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        });
    };
    
    var length = Math.max(endPixel - startPixel, 1);
    if (evt.isImprecise()) { // imprecise time
        var div = doc.createElement("div");
        div.style.position = "absolute";
        div.style.overflow = "hidden";
        
        div.style.top = streamOffset;
        div.style.height = trackHeight + "em";
        div.style.left = startPixel + "px";
        div.style.width = length + "px";
        
        div.style.background = eventTheme.duration.impreciseColor;
        if (eventTheme.duration.impreciseOpacity < 100) {
            SimileAjax.Graphics.setOpacity(div, eventTheme.duration.impreciseOpacity);
        }
        
        this._eventLayer.appendChild(div);
        
        var startDate = evt.getLatestStart();
        var endDate = evt.getEarliestEnd();
        
        var startPixel2 = Math.round(p._band.dateToPixelOffset(startDate));
        var endPixel2 = Math.round(p._band.dateToPixelOffset(endDate));
    } else {
        var startPixel2 = startPixel;
        var endPixel2 = endPixel;
    }
    
    var foreground = evt.getTextColor();
    var outside = true;
    if (startPixel2 <= endPixel2) {
        length = Math.max(endPixel2 - startPixel2, 1);
        outside = !(length > eventTheme.label.width);
        
        div = doc.createElement("div");
        div.style.position = "absolute";
        div.style.overflow = "hidden";
        
        div.style.top = streamOffset;
        div.style.height = trackHeight + "em";
        div.style.left = startPixel2 + "px";
        div.style.width = length + "px";
        
        var background = evt.getColor();
        
        div.style.background = background != null ? background : eventTheme.duration.color;
        if (eventTheme.duration.opacity < 100) {
            SimileAjax.Graphics.setOpacity(div, eventTheme.duration.opacity);
        }
        
        this._eventLayer.appendChild(div);
    } else {
        var temp = startPixel2;
        startPixel2 = endPixel2;
        endPixel2 = temp;
    }
    attachClickEvent(div);
        
    if (this._showText) {
        var divLabel = doc.createElement("div");
        divLabel.style.position = "absolute";
        
        divLabel.style.top = streamOffset;
        divLabel.style.height = trackHeight + "em";
        divLabel.style.left = ((length > eventTheme.label.width) ? startPixel2 : endPixel2) + "px";
        divLabel.style.width = eventTheme.label.width + "px";
        divLabel.style.color = foreground != null ? foreground : (outside ? eventTheme.label.outsideColor : eventTheme.label.insideColor);
        divLabel.style.overflow = "hidden";
        divLabel.appendChild(doc.createTextNode(evt.getText()));
        
        this._eventLayer.appendChild(divLabel);
        attachClickEvent(divLabel);
    }
    
    this._createHighlightDiv(highlightIndex, startPixel, endPixel - startPixel, highlightOffset, highlightWidth);
    
    this._eventIdToElmt[evt.getID()] = div;
};

Timeline.DurationEventPainter.prototype._appendIcon = function(evt, div) {
    var p = this;
    var doc = this._timeline.getDocument();
    var theme = this._params.theme;
    var eventTheme = theme.event;
    
    var icon = evt.getIcon();
    var img = SimileAjax.Graphics.createTranslucentImage(
        icon != null ? icon : eventTheme.instant.icon,
        "middle"
    );
    div.appendChild(img);
    div.style.cursor = "pointer";
    
    SimileAjax.DOM.registerEvent(div, "mousedown", function(elmt, domEvt, target) {
        p._onClickInstantEvent(img, domEvt, evt);
        
        SimileAjax.DOM.cancelEvent(evt);
        return false;
    });
};

Timeline.DurationEventPainter.prototype._createHighlightDiv = function(
        highlightIndex, startPixel, length, highlightOffset, highlightWidth) {
        
    if (highlightIndex >= 0) {
        var doc = this._timeline.getDocument();
        var theme = this._params.theme;
        var eventTheme = theme.event;
        
        var color = eventTheme.highlightColors[Math.min(highlightIndex, eventTheme.highlightColors.length - 1)];
        
        var div = doc.createElement("div");
        div.style.position = "absolute";
        div.style.overflow = "hidden";
        div.style.left = (startPixel - 3) + "px";
        div.style.width = (length + 6) + "px";
        div.style.top = highlightOffset + "em";
        div.style.height = highlightWidth + "em";
        div.style.background = color;
        
        this._highlightLayer.appendChild(div);
    }
};

Timeline.DurationEventPainter.prototype._onClickInstantEvent = function(icon, domEvt, evt) {
    domEvt.cancelBubble = true;
    
    var c = SimileAjax.DOM.getPageCoordinates(icon);
    this._showBubble(
        c.left + Math.ceil(icon.offsetWidth / 2), 
        c.top + Math.ceil(icon.offsetHeight / 2),
        evt
    );
};

Timeline.DurationEventPainter.prototype._onClickDurationEvent = function(target, domEvt, evt) {
    domEvt.cancelBubble = true;
    if ("pageX" in domEvt) {
        var x = domEvt.pageX;
        var y = domEvt.pageY;
    } else {
        var c = SimileAjax.DOM.getPageCoordinates(target);
        var x = domEvt.offsetX + c.left;
        var y = domEvt.offsetY + c.top;
    }
    this._showBubble(x, y, evt);
};

Timeline.DurationEventPainter.prototype.showBubble = function(evt) {
    var elmt = this._eventIdToElmt[evt.getID()];
    if (elmt) {
        var c = SimileAjax.DOM.getPageCoordinates(elmt);
        this._showBubble(c.left + elmt.offsetWidth / 2, c.top + elmt.offsetHeight / 2, evt);
    }
};

Timeline.DurationEventPainter.prototype._showBubble = function(x, y, evt) {
    var div = this._band.openBubbleForPoint(
        x, y,
        this._theme.event.bubble.width,
        this._theme.event.bubble.height
    );
    
    evt.fillInfoBubble(div, this._theme, this._band.getLabeller());
};