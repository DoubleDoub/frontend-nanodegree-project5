var ko = global.ko;
var $ = require('jquery');

/**
 * Constructor for wikivoyage guide
 * @param {object} [guide] data from wikivoyage api
 * @return {object} guide instance
 */
var Guide = function (guide) {
    // keep the model 
    this.model = guide;
    // some of these don't need to be observables
    // @todo if I have time fix this
    this.title = ko.observable(guide.title);
    this.url = ko.observable(guide.fullurl);
    this.coordinates = ko.observable(guide.coordinates[0]);
    this.intro = ko.observable(guide.extract);
    //saved prop is not present on all guides thus defaults to false
    this.saved = ko.observable(guide.saved || false);
    //jumpTo changes triggers change event and gives this.coordinates()
    //google map will register on change events of this property.
    this.triggerJump = ko.observable(false);
    //placeholder for reference to marker
    this.marker = ko.observable(false);
    // storage for data of instagramPhotos
    this.instagramPhotos = ko.observableArray([]);
};
/**
 * Save the guide to localStorage. 
 * @return {[type]} [description]
 */
Guide.prototype.saveGuide = function() {
    if (!global.savedGuides){
        throw new Error('savedGuides has not been loaded');
    }
    // prevent saving duplicate guides in localStorage
    if (this.saved()){
        // guide is already saved);
        return this;
    }
    global.savedGuides.saveGuide(this);

    return this;
};

Guide.prototype.deleteGuide = function() {
    if (!global.savedGuides){
        throw new Error('savedGuides has not been loaded');
    }
    global.savedGuides.deleteGuide(this);
};

/**
 * triggers triggerJump change event. 
 * @return {[type]} [description]
 */
Guide.prototype.jumpTo = function(vm, event) {
        vm.triggerJump(vm.coordinates());
};

/**
 * fetches photos from instagram servers using the
 * guide's coordinates
 * @param  {guide object} context the guide that the photos are for
 * @return {void}
 */
Guide.prototype.fetchInstagramPhotos = function(context) {
    var url = 'https://api.instagram.com/v1/media/search';
    var req = {
        lat : context.model.coordinates[0].lat,
        lng : context.model.coordinates[0].lon,
        client_id : 'dcd60680c14142938a4ae89995e8e66b'
    };
    $.ajax({
        dataType : 'jsonp',
        url : url,
        data : req,
        success : function (result, status, jqxhr) {
            for (var i = result.data.length - 1; i >= 0; i--) {
                this.instagramPhotos.push(result.data[i]);
            }
        }.bind(this),
        error: function(jqxhr, status, error){
            // Notify the user that there was a problem.
            var message = 'Something went wrong while looking for Instagram photos';
            global.notification.notify( message, 'Error');
        },
    });
};

var GuideList = function () {
    var guides = guides || [];
    //guides shown on the map
    this.mapData = ko.observableArray(guides);

    // get all saved guides from local storage
    var savedGuides = JSON.parse(global.localStorage.getItem('guides')) || [];
    // make an observableArray
    this.savedGuides = ko.observableArray([]);
    //push all saved items to the observable
    for (var i = savedGuides.length - 1; i >= 0; i--) {
        // we need them to be Guide Objects
        this.savedGuides.push(new Guide(savedGuides[i]));
    }
    // The initial filter to prepopulate the input tag. 
    // this value will be ignored when filtering. 
    var InitialFilterValue = '';
    this.filter = ko.observable(InitialFilterValue);
    // guides that are filtered
    this.filteredGuides = ko.computed(function () {
        var filter = this.filter().toLowerCase();
        // If there is no filter return all saved guides.
        if (!filter || filter === InitialFilterValue.toLowerCase()) {
            return this.savedGuides;
        }
        // filter on titles and return the filtered array. 
        var filtered = ko.utils.arrayFilter(this.savedGuides(), function (guide) {
                return guide.title().substring(0, filter.length).toLowerCase() === filter;
            });
        return ko.observableArray(filtered);
    },this);

    this.suggestComplete = ko.computed(function(){
        //get first Item from filtered 
        var guide = this.filteredGuides()()[0];
        //make sure all needed info is there and ignore the initial value
        if (guide && guide.title() && this.filter() !== InitialFilterValue){
            // return suggestion for autoComplete
            var title = this.filteredGuides()()[0].title();
            return this.filter() + title.substring(this.filter().length);
        }
        // if not just give empty string
        return '';
    },this);
};

/**
 * Push only new / unique items to the observableArray this prevents double items
 * @param {Guide} [newguide] The new guide that needs to be pushed.
 * @param {string} list The list you want to push the new guide to. 
 * @return {observableArray} The observableArray that the guide was pushed to
 */
GuideList.prototype.pushUniq= function (newGuide, list) {
    if (list === 'map'){
        list = this.mapData;
    } else if (list === 'saved') {
        list = this.savedGuides;
    }
    if (!(newGuide instanceof Guide)){
        // We only want the this.mapData to contain Guides
        return console.warn(new Error('parameter for pushUniq is not an instance of Guide'));
    }
    // returns true if newGuide is already in the array.
    var checkDuplicate = function(guideInArray){
        return guideInArray.title() === newGuide.title() ;
    };
    // do the actual check for each item in the observableArray
    var guideDuplicate = ko.utils.arrayFirst(list(), checkDuplicate);
    // if guide is not a dupilicate
    if (!guideDuplicate){
        // push the guide to the mapData ObservableArray.
        list.push(newGuide);
    }

    return list;
};
/**
 * updates the list with new guides found within a 20km radius of given coordinates
 * @param  {string}   Lat      Latitude
 * @param  {string}   Lng      Longitude
 * @param  {Function} callback function to be called when this function is done
 * @return {void}
 */
GuideList.prototype.update = function (Lat, Lng, callback) {
    var req = {
        format: 'json',
        action: 'query',
        //use generator for lookups
        //http://www.mediawiki.org/wiki/API:Query#Generators
        generator: 'geosearch',
        // get these properties
        ggsprop:'type|name|country|region|dim|globe',
        // look for guides in a 20km radius
        ggsradius:'20000',
        // limit to 20 results because of max on other properties in the real request
        ggslimit : 'max',
        ggscoord: String(Lat) + '|' + String(Lng),
        // get properties of actural result of the query generated by generator
        prop:'info|extracts|pageimages|coordinates',
        //coordinates properties
        coprop: 'type|name|country|region|dim|globe',
        colimit : 'max',
        //coprimary: 'all',
        //info properties we want
        inprop:'url',
        rvprop:'content',
        //pageimages properties
        pilimit: 'max',
        piprop : 'thumbnail',
        //extract properties
        exintro : true,
        exlimit : 'max'
    };

    $.ajax({
        url: 'http://en.wikivoyage.org/w/api.php',
        data: req,
        cache: true,
        dataType: 'jsonp',
        success: function(result) {
            // check if we actually got some data surrounding given area
            if ('query' in result &&'pages' in result.query) {
                var guideKeys = Object.keys(result.query.pages); //@Todo figure out what to do about results without extractinfo
                // because of limits on properties of wikivoyage api 
                for (var i = guideKeys.length - 1; i >= 0; i--) {
                    // check if this guide has been saved
                    var guide = new Guide(result.query.pages[guideKeys[i]]);
                    var savedGuide = global.savedGuides.isSaved(guide);
                    if ( savedGuide ) {
                        this.pushUniq(savedGuide, 'map');
                    } else {
                        this.pushUniq(guide, 'map');
                    }
                        guide = null;
                }
                return callback(null, this.mapData());
            } else {
                // wikivoyage did not have any data for these coordinates
                return callback('No data in this area', this.mapData());
            }
        }.bind(this),
        error: function(jqxhr, status, error){
            // Notify the user that there was a problem.
            var message = 'Something went wrong while looking for travel guides from Wikivoyage';
            global.notification.notify( message, 'Error');
        }
    });
};

/**
 * check if a guide is saved in local storage
 * @param  {object}  newGuide the guide to be cecked
 * @return {object || false}  the guide that has been saved or boolean false
 */
GuideList.prototype.isSaved = function(newGuide){
    // returns true if newGuide is already in the array.
    var checkDuplicate = function(guideInArray){
        return guideInArray.title() === newGuide.title() ;
    };
    // do the actual check for each item in the observableArray
    var guideDuplicate = ko.utils.arrayFirst(this.savedGuides(), checkDuplicate);

    return guideDuplicate || false;

};

/**
 * Save a guide to localStorage.
 * @param {guideObject} the guide that needs to be saved.
 */
GuideList.prototype.saveGuide = function(guide) {
    // add the guide that needs to be saved to the saved guides array
    this.pushUniq(guide, 'saved');
    //get underlining array of observableArray
    var saved = this.savedGuides();
    // storage for the guides that needs to be saved
    var toBeSaved = [];
    for (var i = saved.length - 1; i >= 0; i--) {
        // add saved property to the model
        saved[i].model.saved = true;
        // only save the model data
        toBeSaved.push(saved[i].model);
    }
    // make it json string and save to localStorage
    global.localStorage.setItem('guides', JSON.stringify(toBeSaved));

    // tell the guide it has been saved. 
    guide.saved(true);
};

/**
 * Deletes a guide from locat
 * @param  {guieObject} guide the guide that needs to be deleteGuide
 * @return {void}
 */
GuideList.prototype.deleteGuide = function(guide) {
    //let the guide know that it has been deleted
    guide.saved(false);
    this.savedGuides.remove(guide);
    // storage for the guides that needs to be saved
    var toBeSaved = [];
    for (var i = this.savedGuides().length - 1; i >= 0; i--) {
        // add saved property to the model
        this.savedGuides()[i].model.saved = false;
        // only save the model data
        toBeSaved.push(this.savedGuides()[i].model);
    }
    // make the underlying savedGuides array a json string and save them to localStorage
    global.localStorage.setItem('guides', JSON.stringify(toBeSaved));

};

/**
 * Callback for keypress event on the search inputfield
 * completes the string in the search input field. On keypress
 * @return {[type]} [description]
 */
GuideList.prototype.autoComplete = function () {
    // closure to remember what the previous location in the array was
    var i = 0;
    return function(vm, event) {
        switch(event.keyCode) {
            //up arrow pressed
            case (38):
                //user is going back in the array
                i -= 1;
                if(i < 0) {
                    // i can't be lower then array length. Start at the back again.
                    i = vm.savedGuides().length -1;
                }
                vm.filter(vm.savedGuides()[i].title());
                vm.savedGuides()[i].triggerJump(vm.savedGuides()[i].coordinates());
                break;
            //right arrow pressed
            case (39):
                // user has chosen => use the suggestion as filter
                vm.filter(vm.suggestComplete());
                for(var ii = vm.savedGuides().length -1; ii >= 0 ; ii-- ){
                    if (vm.savedGuides()[ii].title().toLowerCase() === vm.filter().toLowerCase() ){
                        vm.savedGuides()[ii].triggerJump(vm.savedGuides()[ii].coordinates());
                        i = 0;
                        break;
                    }
                }
                //user has chosen reset i
                i = 0;
                break;
            //down arrow pressed
            case(40):
                i +=1;
                if (i > vm.savedGuides().length -1 ){
                    // i cant be longer then the Array if so we made a roundtrip 
                    i = 0;
                }
                vm.filter(vm.savedGuides()[i].title());
                vm.savedGuides()[i].triggerJump(vm.savedGuides()[i].coordinates());
                break;
                //return false;
        }
        if (event.keyCode === 39){
        }
        // allow default action to occur because we want the inputfield to get updated
        // with the character
        return true;
    };
}();


GuideList.init = function (params) {
    params = params || '';
    var el = global.document.createElement('div');
    el.innerHTML = require('../views/guide-list.html');
    var vm = new GuideList();
    ko.applyBindings(vm , el);
    // make the savedGuides viewModel globally available.
    // @todo maybe dont do this
    global.savedGuides = vm;

    // return reference to the newly created PlaceListViewModel and element(view)
    return { 'view' : el , 'viewModel' : vm };
};

module.exports = {
    Guide : Guide,
    GuideList : GuideList,
};