$(document).ready(function() {
    var ua_is_mobile = navigator.userAgent.indexOf('iPhone') !== -1 || navigator.userAgent.indexOf('Android') !== -1;
    if (ua_is_mobile) {
        $('body').addClass('mobile');
    }

    var map_styles = [
       {
          "featureType": "poi",
          "stylers":[
             {
                "visibility": "off"
             }
          ]
       },
       {
          featureType: 'poi.park',
          stylers:[
             {
                visibility: 'off'
             }
          ]
       },
       {
          featureType: 'road.highway',
          elementType: 'labels',
          stylers:[
             {
                visibility: 'off'
             }
          ]
       },
       {
          featureType: 'road',
          elementType: 'geometry',
          stylers:[
             {
                "lightness": 50
             }
          ]
       },
       {
          "elementType": "geometry",
          "stylers":[
             {
                "lightness": 50
             }
          ]
       }
    ];

    var map_temp_circle = new google.maps.Circle({});
    function remove_temp_circle() {
        if (map_temp_circle.getMap() === null) {
            return;
        }

        map_temp_circle.setMap(null);
    }

    var map = new google.maps.Map(document.getElementById('map_canvas'), {
        center: new google.maps.LatLng(47.39, 8.55),
        zoom: 13,
        styles: map_styles
    });

    map.addListener('click', function() {
        infowindow.close();
        remove_temp_circle();
    });

    var infowindow = new google.maps.InfoWindow();

    var crossorigin_api_base = 'http://www.vasile.ch/tmp/cors.php';

    var gateway_status_url = crossorigin_api_base + '?url=http://www.ttnstatus.org/gateways';
    $.when($.getJSON(gateway_status_url))
        .then(function (gateways) {
            var status = {};

            $.each(gateways, function(i, gateway) {
                status[gateway.eui] = gateway.status;
            });

            return status;
        })
        .then(function(gateway_status) {
            var geojson_gist_url = 'http://api.jsoneditoronline.org/v1/docs/b3c1d59588e11bdf6d7d648d07a0e69c';
            geojson_gist_url += '?rid=' + Math.random().toString(36).substring(7);

            $.getJSON(geojson_gist_url, function(gist_json) {
                var geojson = JSON.parse(gist_json.data);

                var map_bounds = new google.maps.LatLngBounds();

                $.each(geojson.features, function(k, f) {
                    if (f.properties.gateway_eui in gateway_status) {
                        f.properties.status = gateway_status[f.properties.gateway_eui];
                    }

                    var marker_position = new google.maps.LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
                    var marker = new google.maps.Marker({
                        position: marker_position,
                        map: map,
                        title: f.properties.owner
                    });
                    var status = f.properties.status;
                    marker.addListener('click', function() {
                        remove_temp_circle();

                        var windowLines = [];
                        windowLines.push('<b>Name: </b> ' + f.properties.name);
                        windowLines.push('<b>Gateway: </b> ' + f.properties.gateway);
                        windowLines.push('<b>Contact: </b> <a href="' + f.properties.contact + '" target="_blank">' + f.properties.owner + '</a>');
                        windowLines.push('<b>Status: </b> ' + status);
                        
                        infowindow.set('content', windowLines.join('<br/>'));
                        infowindow.open(marker.get('map'), marker);

                        if (status === 'planned') {
                            var circleProperties = getCircleProperties(marker_position, f.properties.radius, status);
                            map_temp_circle.setOptions(circleProperties);
                        }
                    });

                    map_bounds.extend(marker_position);

                    displayCircle(marker_position, f.properties.radius, f.properties.status);
                });

                map.fitBounds(map_bounds);
            });

        });

    function getCircleProperties(position, radius, style) {
        var circle_styles = {
            'up': {
                strokeColor: '#660000',
                fillColor: '#1AFF00'
            },
            'down': {
                strokeColor: '#660000',
                fillColor: '#ff0000'
            },
            'planned': {
                strokeColor: '#660000',
                fillColor: '#ff9900'
            }
        };

        var circleProperties = {
            radius: radius,
            map: map,
            center: position,
            strokeWeight: 1,
            fillOpacity: 0.2                
        };
        var circle_style = circle_styles[style];
        if (typeof(circle_style) !== 'undefined') {
            for (var key in circle_style) {
                circleProperties[key] = circle_style[key];
            }
        }

        return circleProperties;
    }
    function displayCircle(position, radius, style) {
        if (style === 'planned') {
            return;
        }
        var circleProperties = getCircleProperties(position, radius, style);
        var circle = new google.maps.Circle(circleProperties);
    }

    // TODO - TTN, please gimme API
    var ttn_global_map_url = crossorigin_api_base + '?url=http://thethingsnetwork.org/map';
    $.ajax({
        url: ttn_global_map_url,
    }).done(function(data) {
        var dataRegexp = /var\sgatewaydump = (\[.+?\]);/;
        var dataMatches = dataRegexp.exec(data);
        if (dataMatches) {
            var ttnRows = JSON.parse(dataMatches[1]);
            var map_style_ttn = {
                'AC': 'up',
                'PL': 'planned',
                'MA': 'down'
            };
            var pin_style_ttn = {
                'AC': 'green',
                'PL': 'blue',
                'MA': 'red'
            };

            $.each(ttnRows, function(k, gatewayData){
                var marker_position = new google.maps.LatLng(gatewayData.lat, gatewayData.lon);
                var marker = new google.maps.Marker({
                    position: marker_position,
                    map: map,
                    title: gatewayData.title,
                    icon: 'http://maps.google.com/mapfiles/ms/icons/' + pin_style_ttn[gatewayData.status] + '-dot.png'
                });
                var status = map_style_ttn[gatewayData.status];
                displayCircle(marker_position, gatewayData.rng, status);

                marker.addListener('click', function() {
                    remove_temp_circle();

                    var windowLines = [];
                    windowLines.push('<b>Name: </b> ' + gatewayData.title);
                    windowLines.push('<b>Owner: </b> ' + gatewayData.owner.username);
                    windowLines.push('<b>Created: </b> ' + gatewayData.created);
                    windowLines.push('<b>Updated: </b> ' + gatewayData.updated);
                    windowLines.push('<b>Status: </b> ' + gatewayData.status);
                    windowLines.push('<b>Kickstarter: </b> ' + (gatewayData.kickstarter ? 'Yes' : 'No'));
                    
                    infowindow.set('content', windowLines.join('<br/>'));
                    infowindow.open(marker.get('map'), marker);

                    if (status === 'planned') {
                        var circleProperties = getCircleProperties(marker_position, gatewayData.rng, status);
                        map_temp_circle.setOptions(circleProperties);
                    }
                });
            });
        }
    });
});