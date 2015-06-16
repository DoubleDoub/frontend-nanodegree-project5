// global === window through browserify
// console.log(global === window); //true
var ko = global.ko = require('../../bower_components/knockout/dist/knockout.js');
var GuideModule = global.Guide = require ('./viewModels/guides');

console.log(GuideModule);
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

    // draw circle with 20km radius to show limits of wikimedia api queries
    var circle = new google.maps.Circle({ 
        map: map, 
        radius: 20000, 
        center : new google.maps.LatLng(map.getCenter().lat(), map.getCenter().lng())
    });
    var f = window.document.getElementById('list');
    var savedGuides = GuideModule.SavedGuides.init();
    var savedGuidesViewModel = savedGuides.viewModel;
    f.appendChild(savedGuides.view);
    
    //var mapGuideList = new GuideModule.createObject();
    var guideListViewModel = new GuideModule.GuideList();

    google.maps.event.addListener(map, 'center_changed', function(e){
        // only get new guides when the map is not being moved for a short period
        var previousCoordinates = map.getCenter();
        global.setTimeout(function () {
                if (previousCoordinates === map.getCenter()){
                    // update guides data then updata markers on the map
                    guideListViewModel.update(map.getCenter().lat(), map.getCenter().lng(), updateMarkers);
                }
        },200);
        // remove the circle
        //circle.setMap(null);
        // circle = null;
        // // create new circle at new coordinates
        // circle = new google.maps.Circle({ 
        // map: map, 
        // radius: 20000, 
        // center : new google.maps.LatLng(map.getCenter().lat(), map.getCenter().lng())
        // });
        circle.setCenter(new google.maps.LatLng(map.getCenter().lat(), map.getCenter().lng()));
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
    guideList = guideList();
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
            content : createInfoWindow(data).view
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

/**
 * Create innerHtml for an InfoWindow in google maps
 * @param  {object} data(optional) The data to be used in the info Window
 * @return {[type]}      [description]
 */
var createInfoWindow = function(data){
    var vm,el;
    el = global.document.createElement('div');
    el.innerHTML = require('./views/guide-info-window.html');
    // if data is not already a viewModel we need to transform it into one
    if (!(data instanceof GuideModule.Guide)){
        data = new GuideModule.Guide(data);
    }
    ko.applyBindings(data, el);

    return {view : el, viewModel : vm};
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
