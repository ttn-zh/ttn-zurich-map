$(document).ready(function() {
    var ua_is_mobile = navigator.userAgent.indexOf('iPhone') !== -1 || navigator.userAgent.indexOf('Android') !== -1;
    if (ua_is_mobile) {
        $('body').addClass('mobile');
    }

    var map = new google.maps.Map(document.getElementById('map_canvas'), {
        center: new google.maps.LatLng(47.39, 8.55),
        zoom: 13
    });

    var infowindow = new google.maps.InfoWindow();

    var gateway_status_url = 'http://crossorigin.me/http://www.ttnstatus.org/gateways';
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
                    marker.addListener('click', function() {
                        var windowLines = [];
                        windowLines.push('<b>Name: </b> ' + f.properties.name);
                        windowLines.push('<b>Gateway: </b> ' + f.properties.gateway);
                        windowLines.push('<b>Contact: </b> <a href="' + f.properties.contact + '" target="_blank">' + f.properties.owner + '</a>');
                        windowLines.push('<b>Status: </b> ' + f.properties.status);
                        
                        infowindow.set('content', windowLines.join('<br/>'));
                        infowindow.open(marker.get('map'), marker);
                    });

                    map_bounds.extend(marker_position);

                    displayCircle(marker_position, f.properties.radius, f.properties.status);
                });

                map.fitBounds(map_bounds);
            });

        });

    function displayCircle(position, radius, style) {
        var circle_styles = {
            'up': {
                strokeColor: '#0020bc',
                fillColor: '#0071bc'
            },
            'down': {
                strokeColor: '#660000',
                fillColor: '#ff0000'
            },
            'planned': {
                strokeColor: '#663300',
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
        var circle = new google.maps.Circle(circleProperties);
    }

    // TODO - TTN, please gimme API
    var ttn_global_map_url = 'http://crossorigin.me/http://thethingsnetwork.org/map';
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
                displayCircle(marker_position, gatewayData.rng, map_style_ttn[gatewayData.status]);

                marker.addListener('click', function() {
                    console.log(gatewayData);
                    var windowLines = [];
                    windowLines.push('<b>Name: </b> ' + gatewayData.title);
                    windowLines.push('<b>Created: </b> ' + gatewayData.created);
                    windowLines.push('<b>Updated: </b> ' + gatewayData.updated);
                    windowLines.push('<b>Status: </b> ' + gatewayData.status);
                    windowLines.push('<b>Kickstarter: </b> ' + (gatewayData.kickstarter ? 'Yes' : 'No'));
                    
                    infowindow.set('content', windowLines.join('<br/>'));
                    infowindow.open(marker.get('map'), marker);
                });
            });
        }
    });
});