// global === window through browserify
// console.log(global === window); //true
var ko = global.ko = require('../../bower_components/knockout/dist/knockout.js');
var GuideModule = global.Guide = require ('./viewModels/guides');

// map place holder
var map;
// array to hold all map markers
var markers = [];
var openInfoWindows = [];
var centerChangeMarkerHandler;



    
    var guideList = GuideModule.GuideList.init();
    var guideListViewModel = guideList.viewModel;
    


//initializes the app
function initMap() {
    // init map
    // document.getElementById('map').style.height = document.getElementsByTagName('main')[0].clientHeight + 'px';
    // 
    var f = window.document.getElementById('list');
    f.appendChild(guideList.view);

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

    for (var i = guideListViewModel.savedGuides().length - 1; i >= 0; i--) {

        var guide = guideListViewModel.savedGuides()[i];
        // 
        guideListViewModel.savedGuides()[i].triggerJump.subscribe(mapJump.bind(guideListViewModel.savedGuides()[i]));
    }


     //register eventlistener when user filters on savedGuides
    // remove markers from the map and only show the filterd ones
    guideListViewModel.filteredGuides.subscribe(function(data){
        deleteAllMarkers(guideListViewModel.mapData());
        createMarkers(null, data());
        
    }.bind(guideListViewModel));


    // change marker handler
    centerChangeMarkerHandler = google.maps.event.addListener(map, 'center_changed', centerChangeMarkers);

    // keep the circle in the center when the center of the map changes
    google.maps.event.addListener(map, 'center_changed', function(e){
        circle.setCenter(new google.maps.LatLng(map.getCenter().lat(), map.getCenter().lng()));
    });

    // Add markers from storage
    createMarkers(null, guideListViewModel.savedGuides());
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
        if (guideList[i].marker().map && !guideList[i].saved()){
            // console.log(guideList[i].saved());
            // console.log(guideList[i].marker().map);
            
            // it has already a marker so we can continue with the rest
            continue;
        }
        // create icon properties for saved guides
        var savedIcon ={
                url : './css/sprite-navigation-white.png',
                origin: new google.maps.Point(5, 39),
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

        google.maps.event.addListener(guide.marker(), 'click', (function (guide) {

            return function () {
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
        //create closure to keep correct reference for guide
        })(guide));
        //tell jshint to start warning again.
        /* jshint +W083 */
    }


};

/**
 * eventListener for when guide viewModel triggerJump change event is fired
 * makes the center of the map move to its location. 
 * Is to be used with the context of the guide ViewModel by .bind(viewModel)
 */
var mapJump = function(){
    map.setZoom(12);
    // if (!this.triggerJump()) {
    //     // start listening again when triggerJump is falsy
    //     google.maps.event.addListener(map, 'center_changed', centerChangeMarkers);
    //     return;
    // }
    // stop adding markers when moving the map center.
    // @todo maybe dont do this?????
    console.log(centerChangeMarkerHandler);
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

    // change center of the map
    map.panTo(new google.maps.LatLng( this.coordinates().lat, this.coordinates().lon));
    

    // dont forget to use the viewModel as the context
};

// updates markers on the map.
var centerChangeMarkers = function(e){
    // only get new guides when the map is not being moved for a short period
    var previousCoordinates = map.getCenter();
    global.setTimeout(function () {
            if (previousCoordinates === map.getCenter()){
                // update guides data then updata markers on the map
                guideListViewModel.update(map.getCenter().lat(), map.getCenter().lng(), createMarkers);
            }
    },200);
};

//https://developers.google.com/maps/documentation/javascript/examples/marker-remove
// Sets the map on all markers in the array.
var setAllMap = function(map, guideList) {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
    if (map === null){
        for (var ii = guideList.length - 1; ii >= 0; ii--) {
            //console.log(guideList[ii].marker());
            guideList[ii].marker();
        }
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


/**
 * initializes the notification UI and exposes its api to the window object
 * @return {void}
 */
function initNotificationUI(){
    var el = global.document.getElementsByClassName('notification')[0];

    var viewModel = {
        notificationWindowOpen : false,
        messages : ko.observableArray([]),
        bttntxt : ko.observable('Ok whatever dude...')
    };

    /**
     * set message and show notification on screen
     * @param  {string} notification the message that is to be shown to the user
     * @param {sting} [header](optional) the Header uses for the notification  
     * @return {void}
     */
    viewModel.notify = function(notification, header){
        // this.messages.push(Object.create(Object.prototype,{
        //     header :  {
        //         value: header || 'Notification'
        //     },
        //     message: {
        //         value: notification
        //     }
        // }));
        // 
        this.messages.push({message : notification, header : header});
        console.log(this.messages());

        if (this.notificationWindowOpen === false){
            //show notification window
            this.toggle();
            this.notificationWindowOpen = true;
        }
    };

    viewModel.reset = function(){
        // make messages empty
        this.messages([]);

        if (this.notificationWindowOpen === true){
            // hide notification window
            this.toggle();
            this.notificationWindowOpen = false;

        }
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
