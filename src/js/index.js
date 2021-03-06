// global === window through browserify
// console.log(global === window); //true
var ko = global.ko = require('../../bower_components/knockout/dist/knockout.js');
var GuideModule = global.Guide = require ('./viewModels/guides');
var notifications = require('./viewModels/notifications');

// map place holder
var map;
// array to hold all map markers
var markers = [];
// array to hold all open infoWindows
var openInfoWindows = [];
// ugly trick to get this handler in scope
var centerChangeMarkerHandler;

//initialize the guidelist 
var guideList = GuideModule.GuideList.init();

//initializes the map
function initMap() {

    //add the guide list to the dom
    window.document.getElementById('list').appendChild(guideList.view);

    var mapOptions = {
        zoom : 1,
        center : new google.maps.LatLng(0, 0)
    };
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    // draw circle with 20km radius to show limits of wikimedia api queries
    var circle = new google.maps.Circle({ 
        map: map, 
        radius: 20000, 
        center : new google.maps.LatLng(map.getCenter().lat(), map.getCenter().lng())
    });

    for (var i = guideList.viewModel.savedGuides().length - 1; i >= 0; i--) {

        var guide = guideList.viewModel.savedGuides()[i];
        // tell the map to jump when the saved guide tells it to.
        guide.triggerJump.subscribe(mapJump.bind(guide));
    }

     //register eventlistener when user filters on savedGuides
    // remove markers from the map and only show the filterd ones
    guideList.viewModel.filteredGuides.subscribe(function(data){
        deleteAllMarkers(guideList.viewModel.mapData());
        createMarkers(null, data());
        
    }.bind(guideList.viewModel));


    // change marker handler
    centerChangeMarkerHandler = google.maps.event.addListener(map, 'center_changed', centerChangeMarkers);

    // keep the circle in the center when the center of the map changes
    google.maps.event.addListener(map, 'center_changed', function(e){
        circle.setCenter(new google.maps.LatLng(map.getCenter().lat(), map.getCenter().lng()));
    });

    // Add markers for saved guides in local storage
    createMarkers(null, guideList.viewModel.savedGuides());
}

/**
 * updates markers on the map with corresponding infowindows
 * @param  {null || string } error     null if no error / error message string
 * @param  {array} guideList array with guideData filled
 *                              with guideModels constructed with observable items
 *                              with data from wikivoyage api.
 * @return {void}
 */
var createMarkers = function (error, guideList) {
    var icon;
    if (error){
        return console.warn(error);
    }

    for (var i = guideList.length - 1; i >= 0; i--) {
        var guide = guideList[i];
        // we only need markers for guides without a
        if (guideList[i].marker().map) {
            // it already has a marker so we can continue with the rest
            // or the markers has a map.
            continue;
        }
        // create icon properties for saved guides
        var savedIcon ={
                url : './css/sprite-maps-black.png',
                origin: new google.maps.Point(175, 209),
                size : new google.maps.Size(24, 24, 'px', 'px') 
        };

        if (guideList[i].saved()){
            icon = savedIcon;
        } else {
            // use default google icons for unsaved guides
            icon = null;
        }

        // create the marker
        var marker = new google.maps.Marker({
            position : new google.maps.LatLng(guide.coordinates().lat, guide.coordinates().lon),
            map : map,
            title : guide.title(),
            icon : icon
        });
        // add infoWindow property to the marker object
        marker.infoWindow = new google.maps.InfoWindow({
            content : createInfoWindow(guide).view
        });

        //push marker to store so we can remove them later.
        markers.push(marker);
        // give the guide viewModel a reference to the same marker
        guide.marker(marker);

        // tell jshint to ignore function in loop warning
        /* jshint -W083 */
        // start listening for change events of the saved property
        guide.saved.subscribe(function (guide){
            //@ param saved the new value of guide.saved given by knockout observable
            return function(saved) {
                if (saved) {
                    // give the marker an icon for saved guides
                    guide.marker().setIcon(savedIcon);
                    // markers in the marker store is the same refence as guide.marker()
                    //console.log(markers[markers.indexOf(guide.marker())] === guide.marker()); // true
                    // start listening for jump event
                    // //@todo fix naming for this
                    guide.triggerJump.subscribe(mapJump.bind(guide));
                } else if (!saved){
                    guide.marker().setIcon(null);
                }
            };
        //create closure to keep correct reference for guide
        }(guide));

        google.maps.event.addListener(guide.marker(), 'click', markerClickHandler(guide));
        //tell jshint to start warning again.
        /* jshint +W083 */
    }

};

/**
 * creates a function that handles clicks on markers
 * @param  {object} guide the guide that needs to do stuff
 * @return {void}
 */
var markerClickHandler = function (guide){
    return function() {
        //close other openInfoWindows
        for (var ii = openInfoWindows.length - 1; ii >= 0; ii--) {
            openInfoWindows[ii].close();
        }
        
        guide.marker().infoWindow.open(map, guide.marker());
        // keep track of open infoWindows
        openInfoWindows.push(guide.marker().infoWindow);

        //fetch instagram photos for the area near this guide
        guide.fetchInstagramPhotos(guide);
        // close infoWindow when clicked somewhere else on the map and get reference to hander
        var clickHandler = google.maps.event.addListener(map, 'mousedown', function(e){
            // close infoWindow
            guide.marker().infoWindow.close();
            //remove listener
            google.maps.event.removeListener(clickHandler);
        });
    };
};

/**
 * eventListener for when guide viewModel triggerJump change event is fired
 * makes the center of the map move to its location. 
 * Is to be used with the context of the guide ViewModel by .bind(viewModel)
 */
var mapJump = function(){
    map.setZoom(12);
    // stop adding markers when moving the map center.
    // @todo maybe dont do this?????
    google.maps.event.removeListener(centerChangeMarkerHandler);
    // first time the user moves center of map don't create new markers but
    // tell map to start doing it again the next time.
    var handler = google.maps.event.addListener(map, 'center_changed', function(){
        // removing this functionality will introduce a bug
        // saving a guide after filtering will remove all markers from the map
        centerChangeMarkerHandler = google.maps.event.addListener(map, 'center_changed', centerChangeMarkers);
        //only do this once.
        google.maps.event.removeListener(handler);
    });

    document.getElementById('menu-button').click();
    // do the same stuff that happens when a marker gets clicked
    markerClickHandler(this)();

    // dont forget to use the viewModel as the context
};

// updates markers on the map.
var centerChangeMarkers = function(e){
    // only get new guides when the map is not being moved for a short period
    var previousCoordinates = map.getCenter();
    global.setTimeout(function () {
            if (previousCoordinates === map.getCenter()){
                // update guides data then updata markers on the map
                guideList.viewModel.update(map.getCenter().lat(), map.getCenter().lng(), createMarkers);
            }
    },200);
};

//https://developers.google.com/maps/documentation/javascript/examples/marker-remove
// Sets the map on all markers in the array.
var setAllMap = function(map, guideList) {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
};

// Deletes all markers in the array by removing references to them.
var deleteAllMarkers = function(guideList) {
    clearMarkers(guideList);
    markers = [];
};

var showMarkers = function(guideList) {
    setAllMap(map, guideList);
};
var clearMarkers = function(guideList){
    setAllMap(null,guideList);
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


var init = function (){
    initMap();
    notifications.initNotificationUI();
    //make menu-button work
    document.getElementById('menu-button').addEventListener('click', function (e) {
        var listEl = document.getElementById('list');
        var mapEl = document.getElementById('map');
        if (e.target.classList.contains('list-active')){
            listEl.classList.remove('list-active');
            mapEl.classList.remove('list-active');
            e.target.classList.remove('list-active');
            return;
        }
        listEl.classList.add('list-active');
        mapEl.classList.add('list-active');
        e.target.classList.add('list-active');
    });
};

window.onload = init;
