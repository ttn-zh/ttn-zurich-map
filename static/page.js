$(document).ready(function() {
    var ua_is_mobile = navigator.userAgent.indexOf('iPhone') !== -1 || navigator.userAgent.indexOf('Android') !== -1;
    if (ua_is_mobile) {
        $('body').addClass('mobile');
    }

    var map = new google.maps.Map(document.getElementById('map_canvas'), {
        center: new google.maps.LatLng(47.39, 8.55),
        zoom: 13
    });

    var geojson_gist_url = 'https://api.github.com/gists/a96eeeb3a8679ae8b4bd?rid=' + Math.random().toString(36).substring(7);
    $.getJSON(geojson_gist_url, function(gist_json){
        var geojson = JSON.parse(gist_json.files['lorawan-gateways.geojson'].content);

        var map_bounds = new google.maps.LatLngBounds();

        $.each(geojson.features, function(k, f){
            var marker_position = new google.maps.LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
            var marker = new google.maps.Marker({
                position: marker_position,
                map: map,
                title: f.properties.owner
            });
            map_bounds.extend(marker_position);

            var circle = new google.maps.Circle({
                radius: f.properties.radius,
                map: map,
                center: marker_position,
                strokeWeight: 0.5,
                strokeColor: '#0020bc',
                fillColor: '#0071bc',
                fillOpacity: 0.1
            });
        });

        map.fitBounds(map_bounds);
    });
});