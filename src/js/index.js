// global === window through browserify
// console.log(global === window); //true
var ko = global.ko = require('../../bower_components/knockout/dist/knockout.js');

var GuideModule = require ('./viewModels/places');


// map place holder
var map;
//initialize the app
function initMap() {
    // init map
    // document.getElementById('map').style.height = document.getElementsByTagName('main')[0].clientHeight + 'px';

    var mapOptions = {
        zoom : 8,
        center : new google.maps.LatLng(-34.397, 150.644)
    };
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    var f = window.document.getElementById('list');
    var guideList = GuideModule.createObject();
    var guideListViewModel = global.list = guideList.viewModel;
    f.appendChild(guideList.view);


    google.maps.event.addListener(map, 'center_changed', function(e){
        // only get new guides when the map is not being moved for a short period
        var previousCoordinates = map.getCenter();
        global.setTimeout(function () {
                if (previousCoordinates === map.getCenter()){
                    guideListViewModel.update(map.getCenter().lat(), map.getCenter().lng(), updateMarkers);
                }

        },200);
    });
}

/**
 * updates markers on the map and corresponding infowindows
 * @param  {null || string } error     null if no error / error message string
 * @param  {ko.observableArray} guideList observableArray with guideData filled
 *                              with guideModels constructed with observable items
 *                              with data from wikivoyage api.
 * @return {void}
 */
var updateMarkers = function (error, guideList) {
    // array to hold all markers
    var markers = [];
    console.log(guideList().length);
    console.log(guideList());
    guideList = guideList();
    // console.log('array' === instanceof guideList);
    if (error){
        return console.warn(error);
    }

    for (var i = guideList.length - 1; i >= 0; i--) {
        var data = guideList[i];
        var marker = new google.maps.Marker({
            position : new google.maps.LatLng(data.coordinates().lat, data.coordinates().lon),
            map : map,
            title : data.title()
        });

        marker.infoWindow = new google.maps.InfoWindow({
            content : GuideModule.createInfoWindow(data).view
        });

        // tell jshint to ignore function in loop warning
        /* jshint -W083 */
        google.maps.event.addListener(marker, 'click', (function (marker) {
            return function () {
                marker.infoWindow.open(map, marker);
                // close infoWindow when clicked somewhere else on the map and get refencen to hander
                var clickHandler = google.maps.event.addListener(map, 'mousedown', function(e){
                    // close infoWindow
                    marker.infoWindow.close();
                    //remove listener to prevent leak
                    google.maps.event.removeListener(clickHandler);
                });

            };
        })(marker));
        //tell jshint to start warning again.
        /* jshint +W083 */
    }
};

function initNotificationUI(){
    var el = global.document.getElementsByClassName('notification')[0];
    var viewModel = {
        type : ko.observable('Notification'),
        message : ko.observable('Uhmmm I forgot..... Sorry!!'),
        bttntxt : ko.observable('Ok whatever dude...')
    };

    /**
     * set message and show notification on screen
     * @param  {string} notification the message that is to be shown to the user
     * @return {[type]}              [description]
     */
    viewModel.notify = function(notification, type){
        type = type || this.type(); 
        this.message(String(notification));
        this.type(String(type));
        this.toggle();
        console.log(this);
    };

    /**
     * show notification on user screen
     * @return {void}
     */
    viewModel.toggle = function(){
        el.classList.toggle('showNotification');
    };

    ko.applyBindings(viewModel , el);
    // expose as api to window/global
    global.notification = viewModel;
}

var init = function (){
    initMap();
    initNotificationUI();
};

window.onload = init;
