'use strict';

System.register(['./leaflet.js', 'lodash', 'moment', './css/clock-panel.css!', './leaflet.css!', 'app/plugins/sdk', 'app/core/app_events'], function (_export, _context) {
    "use strict";

    var LL, _, moment, MetricsPanelCtrl, appEvents, _createClass, myMap, coords, highlightedMarker, timeSrv, randomColor, ClockCtrl, Geohash;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    function randomColorFactory(given_seed) {

        // Seed to get repeatable colors
        var seed = given_seed;

        // Shared color dictionary
        var colorDictionary = {};

        // Populate the color dictionary
        loadColorBounds();

        var randomColor = function randomColor(options) {

            options = options || {};

            // Check if there is a seed and ensure it's an
            // integer. Otherwise, reset the seed value.
            if (options.seed !== undefined && options.seed !== null && options.seed === parseInt(options.seed, 10)) {
                seed = options.seed;

                // A string was passed as a seed
            } else if (typeof options.seed === 'string') {
                seed = stringToInteger(options.seed);

                // Something was passed as a seed but it wasn't an integer or string
            } else if (options.seed !== undefined && options.seed !== null) {
                throw new TypeError('The seed value must be an integer or string');

                // No seed, reset the value outside.
            } else {
                    //seed = null;
                }

            var H, S, B;

            // Check if we need to generate multiple colors
            if (options.count !== null && options.count !== undefined) {

                var totalColors = options.count,
                    colors = [];

                options.count = null;

                while (totalColors > colors.length) {

                    // Since we're generating multiple colors,
                    // incremement the seed. Otherwise we'd just
                    // generate the same color each time...
                    if (seed && options.seed) options.seed += 1;

                    colors.push(randomColor(options));
                }

                options.count = totalColors;

                return colors;
            }

            // First we pick a hue (H)
            H = pickHue(options);

            // Then use H to determine saturation (S)
            S = pickSaturation(H, options);

            // Then use S and H to determine brightness (B).
            B = pickBrightness(H, S, options);

            // Then we return the HSB color in the desired format
            return setFormat([H, S, B], options);
        };

        function pickHue(options) {

            var hueRange = getHueRange(options.hue),
                hue = randomWithin(hueRange);

            // Instead of storing red as two seperate ranges,
            // we group them, using negative numbers
            if (hue < 0) {
                hue = 360 + hue;
            }

            return hue;
        }

        function pickSaturation(hue, options) {

            if (options.hue === 'monochrome') {
                return 0;
            }

            if (options.luminosity === 'random') {
                return randomWithin([0, 100]);
            }

            var saturationRange = getSaturationRange(hue);

            var sMin = saturationRange[0],
                sMax = saturationRange[1];

            switch (options.luminosity) {

                case 'bright':
                    sMin = 55;
                    break;

                case 'dark':
                    sMin = sMax - 10;
                    break;

                case 'light':
                    sMax = 55;
                    break;
            }

            return randomWithin([sMin, sMax]);
        }

        function pickBrightness(H, S, options) {

            var bMin = getMinimumBrightness(H, S),
                bMax = 100;

            switch (options.luminosity) {

                case 'dark':
                    bMax = bMin + 20;
                    break;

                case 'light':
                    bMin = (bMax + bMin) / 2;
                    break;

                case 'random':
                    bMin = 0;
                    bMax = 100;
                    break;
            }

            return randomWithin([bMin, bMax]);
        }

        function setFormat(hsv, options) {

            switch (options.format) {

                case 'hsvArray':
                    return hsv;

                case 'hslArray':
                    return HSVtoHSL(hsv);

                case 'hsl':
                    var hsl = HSVtoHSL(hsv);
                    return 'hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)';

                case 'hsla':
                    var hslColor = HSVtoHSL(hsv);
                    var alpha = options.alpha || Math.random();
                    return 'hsla(' + hslColor[0] + ', ' + hslColor[1] + '%, ' + hslColor[2] + '%, ' + alpha + ')';

                case 'rgbArray':
                    return HSVtoRGB(hsv);

                case 'rgb':
                    var rgb = HSVtoRGB(hsv);
                    return 'rgb(' + rgb.join(', ') + ')';

                case 'rgba':
                    var rgbColor = HSVtoRGB(hsv);
                    var alpha = options.alpha || Math.random();
                    return 'rgba(' + rgbColor.join(', ') + ', ' + alpha + ')';

                default:
                    return HSVtoHex(hsv);
            }
        }

        function getMinimumBrightness(H, S) {

            var lowerBounds = getColorInfo(H).lowerBounds;

            for (var i = 0; i < lowerBounds.length - 1; i++) {

                var s1 = lowerBounds[i][0],
                    v1 = lowerBounds[i][1];

                var s2 = lowerBounds[i + 1][0],
                    v2 = lowerBounds[i + 1][1];

                if (S >= s1 && S <= s2) {

                    var m = (v2 - v1) / (s2 - s1),
                        b = v1 - m * s1;

                    return m * S + b;
                }
            }

            return 0;
        }

        function getHueRange(colorInput) {

            if (typeof parseInt(colorInput) === 'number') {

                var number = parseInt(colorInput);

                if (number < 360 && number > 0) {
                    return [number, number];
                }
            }

            if (typeof colorInput === 'string') {

                if (colorDictionary[colorInput]) {
                    var color = colorDictionary[colorInput];
                    if (color.hueRange) {
                        return color.hueRange;
                    }
                } else if (colorInput.match(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i)) {
                    var hue = HexToHSB(colorInput)[0];
                    return [hue, hue];
                }
            }

            return [0, 360];
        }

        function getSaturationRange(hue) {
            return getColorInfo(hue).saturationRange;
        }

        function getColorInfo(hue) {

            // Maps red colors to make picking hue easier
            if (hue >= 334 && hue <= 360) {
                hue -= 360;
            }

            for (var colorName in colorDictionary) {
                var color = colorDictionary[colorName];
                if (color.hueRange && hue >= color.hueRange[0] && hue <= color.hueRange[1]) {
                    return colorDictionary[colorName];
                }
            }return 'Color not found';
        }

        function randomWithin(range) {
            if (seed === null) {
                return Math.floor(range[0] + Math.random() * (range[1] + 1 - range[0]));
            } else {
                //Seeded random algorithm from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
                var max = range[1] || 1;
                var min = range[0] || 0;
                seed = (seed * 9301 + 49297) % 233280;
                var rnd = seed / 233280.0;
                return Math.floor(min + rnd * (max - min));
            }
        }

        function HSVtoHex(hsv) {

            var rgb = HSVtoRGB(hsv);

            function componentToHex(c) {
                var hex = c.toString(16);
                return hex.length == 1 ? '0' + hex : hex;
            }

            var hex = '#' + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);

            return hex;
        }

        function defineColor(name, hueRange, lowerBounds) {

            var sMin = lowerBounds[0][0],
                sMax = lowerBounds[lowerBounds.length - 1][0],
                bMin = lowerBounds[lowerBounds.length - 1][1],
                bMax = lowerBounds[0][1];

            colorDictionary[name] = {
                hueRange: hueRange,
                lowerBounds: lowerBounds,
                saturationRange: [sMin, sMax],
                brightnessRange: [bMin, bMax]
            };
        }

        function loadColorBounds() {

            defineColor('monochrome', null, [[0, 0], [100, 0]]);

            defineColor('red', [-26, 18], [[20, 100], [30, 92], [40, 89], [50, 85], [60, 78], [70, 70], [80, 60], [90, 55], [100, 50]]);

            defineColor('orange', [19, 46], [[20, 100], [30, 93], [40, 88], [50, 86], [60, 85], [70, 70], [100, 70]]);

            defineColor('yellow', [47, 62], [[25, 100], [40, 94], [50, 89], [60, 86], [70, 84], [80, 82], [90, 80], [100, 75]]);

            defineColor('green', [63, 178], [[30, 100], [40, 90], [50, 85], [60, 81], [70, 74], [80, 64], [90, 50], [100, 40]]);

            defineColor('blue', [179, 257], [[20, 100], [30, 86], [40, 80], [50, 74], [60, 60], [70, 52], [80, 44], [90, 39], [100, 35]]);

            defineColor('purple', [258, 282], [[20, 100], [30, 87], [40, 79], [50, 70], [60, 65], [70, 59], [80, 52], [90, 45], [100, 42]]);

            defineColor('pink', [283, 334], [[20, 100], [30, 90], [40, 86], [60, 84], [80, 80], [90, 75], [100, 73]]);
        }

        function HSVtoRGB(hsv) {

            // this doesn't work for the values of 0 and 360
            // here's the hacky fix
            var h = hsv[0];
            if (h === 0) {
                h = 1;
            }
            if (h === 360) {
                h = 359;
            }

            // Rebase the h,s,v values
            h = h / 360;
            var s = hsv[1] / 100,
                v = hsv[2] / 100;

            var h_i = Math.floor(h * 6),
                f = h * 6 - h_i,
                p = v * (1 - s),
                q = v * (1 - f * s),
                t = v * (1 - (1 - f) * s),
                r = 256,
                g = 256,
                b = 256;

            switch (h_i) {
                case 0:
                    r = v;g = t;b = p;break;
                case 1:
                    r = q;g = v;b = p;break;
                case 2:
                    r = p;g = v;b = t;break;
                case 3:
                    r = p;g = q;b = v;break;
                case 4:
                    r = t;g = p;b = v;break;
                case 5:
                    r = v;g = p;b = q;break;
            }

            var result = [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
            return result;
        }

        function HexToHSB(hex) {
            hex = hex.replace(/^#/, '');
            hex = hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex;

            var red = parseInt(hex.substr(0, 2), 16) / 255,
                green = parseInt(hex.substr(2, 2), 16) / 255,
                blue = parseInt(hex.substr(4, 2), 16) / 255;

            var cMax = Math.max(red, green, blue),
                delta = cMax - Math.min(red, green, blue),
                saturation = cMax ? delta / cMax : 0;

            switch (cMax) {
                case red:
                    return [60 * ((green - blue) / delta % 6) || 0, saturation, cMax];
                case green:
                    return [60 * ((blue - red) / delta + 2) || 0, saturation, cMax];
                case blue:
                    return [60 * ((red - green) / delta + 4) || 0, saturation, cMax];
            }
        }

        function HSVtoHSL(hsv) {
            var h = hsv[0],
                s = hsv[1] / 100,
                v = hsv[2] / 100,
                k = (2 - s) * v;

            return [h, Math.round(s * v / (k < 1 ? k : 2 - k) * 10000) / 100, k / 2 * 100];
        }

        function stringToInteger(string) {
            var total = 0;
            for (var i = 0; i !== string.length; i++) {
                if (total >= Number.MAX_SAFE_INTEGER) break;
                total += string.charCodeAt(i);
            }
            return total;
        }

        return randomColor;
    }return {
        setters: [function (_leafletJs) {
            LL = _leafletJs.default;
        }, function (_lodash) {
            _ = _lodash.default;
        }, function (_moment) {
            moment = _moment.default;
        }, function (_cssClockPanelCss) {}, function (_leafletCss) {}, function (_appPluginsSdk) {
            MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
        }, function (_appCoreApp_events) {
            appEvents = _appCoreApp_events.default;
        }],
        execute: function () {
            _createClass = function () {
                function defineProperties(target, props) {
                    for (var i = 0; i < props.length; i++) {
                        var descriptor = props[i];
                        descriptor.enumerable = descriptor.enumerable || false;
                        descriptor.configurable = true;
                        if ("value" in descriptor) descriptor.writable = true;
                        Object.defineProperty(target, descriptor.key, descriptor);
                    }
                }

                return function (Constructor, protoProps, staticProps) {
                    if (protoProps) defineProperties(Constructor.prototype, protoProps);
                    if (staticProps) defineProperties(Constructor, staticProps);
                    return Constructor;
                };
            }();

            coords = [];
            highlightedMarker = null;
            randomColor = randomColorFactory(42);

            _export('ClockCtrl', ClockCtrl = function (_MetricsPanelCtrl) {
                _inherits(ClockCtrl, _MetricsPanelCtrl);

                function ClockCtrl($scope, $injector) {
                    _classCallCheck(this, ClockCtrl);

                    var _this = _possibleConstructorReturn(this, (ClockCtrl.__proto__ || Object.getPrototypeOf(ClockCtrl)).call(this, $scope, $injector));

                    timeSrv = $injector.get('timeSrv');

                    _this.panel.maxDataPoints = 500;

                    var dashboard = _this.dashboard;

                    appEvents.on('graph-hover', function (event) {
                        if (coords) {
                            for (var i = 0; i < coords.length; i++) {
                                if (coords[i].timestamp >= event.pos.x) {
                                    if (coords[i].circle) {
                                        coords[i].circle.setStyle({
                                            fillColor: "red",
                                            color: "red"
                                        });
                                    }
                                    if (highlightedMarker) {
                                        highlightedMarker.setStyle({
                                            fillColor: "none",
                                            color: "none"
                                        });
                                    }
                                    highlightedMarker = coords[i].circle;
                                    break;
                                }
                            }
                        }
                    });

                    _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
                    _this.events.on('panel-teardown', _this.onPanelTeardown.bind(_this));
                    _this.events.on('panel-initialized', _this.render.bind(_this));
                    _this.events.on('data-received', function (data) {

                        if (myMap) {
                            myMap.remove();
                        }

                        var group_indexes = [0];
                        if (data.length == 2) {
                            console.log("NO grouping detected");
                        } else {
                            var groups = Math.ceil(data.length / 2);
                            console.log("Grouping detected: " + groups);

                            group_indexes = _.range(0, groups, 2);
                        }

                        // Find min/max Lat/Lon to fit viewport to it.
                        var minLat = 90;
                        var maxLat = -90;
                        var minLon = 180;
                        var maxLon = -180;

                        // Collect coordinates and polylines.
                        coords = [];
                        var polylines = [];
                        var polyline = [];
                        _.forEach(group_indexes, function (group_index) {

                            for (var i = 0; i < data[group_index].datapoints.length; i++) {

                                var position = data[group_index + 1].datapoints[i][0] ? Geohash.decode(data[group_index + 1].datapoints[i][0]) : null;
                                if (position) {
                                    minLat = Math.min(minLat, position.lat);
                                    minLon = Math.min(minLon, position.lng);
                                    maxLat = Math.max(maxLat, position.lat);
                                    maxLon = Math.max(maxLon, position.lng);
                                    polyline.push(position);

                                    coords.push({
                                        value: data[group_index].datapoints[i][0],
                                        hash: data[group_index + 1].datapoints[i][0],
                                        position: position,
                                        timestamp: data[group_index].datapoints[i][1]
                                    });
                                }
                            }

                            polylines.push(polyline);
                            polyline = [];
                        });

                        // Not needed
                        /*
                        var center = coords.find(point => point.position)
                        center = center ? center.position : [0, 0]
                        */

                        // Create map.
                        myMap = L.map('themap');

                        // Fix: If there is just one value and max==min which results in a NaN error.
                        if (minLat == maxLat) {
                            minLat -= 0.01;
                            maxLat += 0.01;
                        }
                        if (minLon == maxLon) {
                            minLon -= 0.01;
                            maxLon += 0.01;
                        }
                        myMap.fitBounds([[minLat, minLon], [maxLat, maxLon]]);

                        // Not needed
                        /*
                        var CartoDB_PositronNoLabels = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
                        subdomains: 'abcd',
                        maxZoom: 19
                        })
                        */

                        // Not needed
                        /*
                        myMap.on("boxzoomend", function(e) {
                        const coordsInBox = coords.filter(coord =>
                          coord.position && e.boxZoomBounds.contains(L.latLng(coord.position.lat, coord.position.lng)))
                        const minTime = Math.min.apply(Math, coordsInBox.map(coord => coord.timestamp))
                        const maxTime = Math.max.apply(Math, coordsInBox.map(coord => coord.timestamp))
                        if (isFinite(minTime) && isFinite(maxTime)) {
                          timeSrv.setTime({
                            from  : moment.utc(minTime),
                            to    : moment.utc(maxTime),
                          })
                        }
                        })
                        */

                        var OpenTopoMap = L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                            maxZoom: 17
                        });
                        OpenTopoMap.addTo(myMap);

                        // Not needed
                        //var OpenSeaMap = L.tileLayer('http://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {});
                        //OpenSeaMap.addTo(myMap)

                        // Create polylines
                        polylines.forEach(function (polyline) {
                            L.polyline(polyline, {
                                color: randomColor({ luminosity: 'dark' }),
                                weight: 6,
                                opacity: 0.9
                            }).addTo(myMap);
                        });

                        // Draw points with popup.
                        coords.forEach(function (point) {
                            if (point.position) {
                                point.circle = L.circleMarker(point.position, {
                                    color: randomColor({ luminosity: 'bright' }),
                                    stroke: 'false',
                                    fillColor: randomColor({ luminosity: 'dark' }),
                                    fillOpacity: 0.8,
                                    radius: 6
                                });

                                var date = new Date(point.timestamp);
                                var popupContent = "<b>" + point.value + "</b><br/>" + "Time: " + date + "<br/>" + "GPS: " + point.position.lat.toFixed(4) + ", " + point.position.lng.toFixed(4) + "<br/>" + "Geohash: " + point.hash;

                                point.circle.bindPopup(popupContent, {});
                                point.circle.addTo(myMap);
                            }
                        });
                    });

                    return _this;
                }

                _createClass(ClockCtrl, [{
                    key: 'onInitEditMode',
                    value: function onInitEditMode() {
                        this.addEditorTab('Options', 'public/plugins/grafana-clock-panel/editor.html', 2);
                    }
                }, {
                    key: 'onPanelTeardown',
                    value: function onPanelTeardown() {
                        this.$timeout.cancel(this.nextTickPromise);
                    }
                }]);

                return ClockCtrl;
            }(MetricsPanelCtrl));

            _export('ClockCtrl', ClockCtrl);

            ClockCtrl.templateUrl = 'module.html';

            Geohash = {};


            /* (Geohash-specific) Base32 map */
            Geohash.base32 = '0123456789bcdefghjkmnpqrstuvwxyz';

            Geohash.decode = function (geohash) {

                var bounds = Geohash.bounds(geohash); // <-- the hard work
                // now just determine the centre of the cell...

                var latMin = bounds.sw.lat,
                    lonMin = bounds.sw.lng;
                var latMax = bounds.ne.lat,
                    lonMax = bounds.ne.lng;

                // cell centre
                var lat = (latMin + latMax) / 2;
                var lon = (lonMin + lonMax) / 2;

                // round to close to centre without excessive precision: ⌊2-log10(Δ°)⌋ decimal places
                lat = lat.toFixed(Math.floor(2 - Math.log(latMax - latMin) / Math.LN10));
                lon = lon.toFixed(Math.floor(2 - Math.log(lonMax - lonMin) / Math.LN10));

                return {
                    lat: Number(lat),
                    lng: Number(lon)
                };
            };

            Geohash.bounds = function (geohash) {
                if (geohash.length === 0) throw new Error('Invalid geohash');

                geohash = geohash.toLowerCase();

                var evenBit = true;
                var latMin = -90,
                    latMax = 90;
                var lonMin = -180,
                    lonMax = 180;

                for (var i = 0; i < geohash.length; i++) {
                    var chr = geohash.charAt(i);
                    var idx = Geohash.base32.indexOf(chr);
                    if (idx == -1) throw new Error('Invalid geohash');

                    for (var n = 4; n >= 0; n--) {
                        var bitN = idx >> n & 1;
                        if (evenBit) {
                            // longitude
                            var lonMid = (lonMin + lonMax) / 2;
                            if (bitN == 1) {
                                lonMin = lonMid;
                            } else {
                                lonMax = lonMid;
                            }
                        } else {
                            // latitude
                            var latMid = (latMin + latMax) / 2;
                            if (bitN == 1) {
                                latMin = latMid;
                            } else {
                                latMax = latMid;
                            }
                        }
                        evenBit = !evenBit;
                    }
                }

                var bounds = {
                    sw: {
                        lat: latMin,
                        lng: lonMin
                    },
                    ne: {
                        lat: latMax,
                        lng: lonMax
                    }
                };

                return bounds;
            };;
        }
    };
});
//# sourceMappingURL=clock_ctrl.js.map
