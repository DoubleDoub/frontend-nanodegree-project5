var ko = global.ko;
var $ = require('jquery');

/**
 * Constructor for wikivoyage guide
 * @param {object} [guide] data from wikivoyage api
 * @return {object} guide instance
 */
var Guide = function (guide) {
    // keep the raw data, so that we can use it to save guides and reinstanciate
    //  them as viewmodels later. 
    this.raw = guide;
    this.title = ko.observable(guide.title);
    this.url = ko.observable(guide.fullurl);
    this.coordinates = ko.observable(guide.coordinates[0]);
    this.intro = ko.observable(guide.extract);
    //saved prop is not present on all guides thus defaults to false
    this.saved = ko.observable(guide.saved || false);
};


/**
 * Save the guide to localStorage. 
 * @return {[type]} [description]
 */
Guide.prototype.saveGuide = function(){
    if (!global.savedGuides){
        throw new Error('savedGuides has not been loaded');
    }
    // prevent saving duplicate guides in localStorage
    if (this.saved()){
        // guide is already saved
        return this;
    }
    global.savedGuides.saveGuide(this);

    return this;
};

ko.components.register('guide', {
    template : require('../views/guide.html')
});


function GuideList(guides) {
    guides = guides || [];
    //Guide data retrieved from misc sources
    this.mapData = ko.observableArray(guides);
}

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
        //rvprop:'content',
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
                var guideKeys = Object.keys(result.query.pages);
                //@Todo figure out what to do about results without extractinfo
                // because of limits on properties of wikivoyage api 
                // console.log(guideKeys.length);
                // console.log(result);
                for (var i = guideKeys.length - 1; i >= 0; i--) {
                    // push only new/unique guides to the mapData ObservableArray.
                    //consolelog((result.query.pages[guideKeys[i]]);
                    // check if this guide has been saved
                    var guide = new Guide(result.query.pages[guideKeys[i]]);
                    var savedGuide;
                    if ( (savedGuide = global.savedGuides.isSaved(guide) ) ) {
                        this.pushUniq(savedGuide, 'map');
                    } else {
                        this.pushUniq(guide, 'map');
                    }
                        guide = null;
                }
                return callback(null, this.mapData);
            } else {
                // wikivoyage did not have any data for these coordinates
                return callback('No data in this area', this.mapData);
            }
        }.bind(this),
        error: function(jqxhr, status, error){
            // Notify the user that there was a problem.
            var message = 'Something went wrong';
            message += status;
            
            global.notification.notify( message, 'connectionError');
        }
    });
};


ko.components.register('guide-list', {
    viewModel : GuideList,
    template : require('../views/guide-list.html')
});

var SavedGuides = function () {
    // The initial filter to prepopulate the input tag. 
    // this value will be ignored when filtering. 
    var filterValue = 'Filter';
    this.filter = ko.observable(filterValue);
    // get all saved guides from local storage
    var savedGuides = JSON.parse(global.localStorage.getItem('guides')) || [];
    // make an observableArray
    this.savedGuides = ko.observableArray([]);
    //push all saved items to the observable
    for (var i = savedGuides.length - 1; i >= 0; i--) {
        this.savedGuides.push(new Guide(savedGuides[i]));
    }
    this.filteredGuides = ko.computed(function () {
        var filter = this.filter().toLowerCase();
        // If there is no filter show all saved guides.
        if (!filter || filter === filterValue.toLowerCase()) {
            return this.savedGuides;
        }
        // filter on titles and return the filtered array. 
        var filtered = ko.utils.arrayFilter(this.savedGuides(), function (guide) {
                return guide.title().substring(0, filter.length).toLowerCase() === filter;
            });
        return ko.observableArray(filtered);
    },this);
};


// SavedGuides.prototype.filter = function () {
//     this.showGuidesGuides( ko.utils.arrayFilter(this.showGuides(), function (guide) {
//         return  string.substring(0, startsWith.length) === startsWith;
//     } ));
// }

SavedGuides.prototype.pushUniq = GuideList.prototype.pushUniq;

/**
 * check if a guide is saved in loca
 * @param  {object}  newGuide the guide to be cecked
 * @return {object || false}  the guide that has been saved or boolean false
 */
SavedGuides.prototype.isSaved = function(newGuide){
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
 * @return this 
 */
SavedGuides.prototype.saveGuide = function(guide){
    // add the guide that needs to be saved to the saved guides array
    this.pushUniq(guide, 'saved');
    //get underlining array of observableArray
    var saved = this.savedGuides();
    // storage for the data that needs to be saved
    var toBeSaved = [];
    for (var i = saved.length - 1; i >= 0; i--) {
        // add saved property to raw data
        saved[i].raw.saved = true;
        // only save the raw data so that it can be reused in Guide constructor
        toBeSaved.push(saved[i].raw);
    }
    // make it json string and save to localStorage
    global.localStorage.setItem('guides', JSON.stringify(toBeSaved));

    // tell the guide it has been saved. 
    guide.saved(true);

    return this;
};

ko.components.register('saved-guides', {
    viewModel : SavedGuides,
    template : require('../views/guide-list.html')
});


SavedGuides.init = function (params) {
    params = params || '';
    var el = global.document.createElement('div');
    el.innerHTML = require('../views/guide-list.html');
    //el.setAttribute('params', params);
    var vm = new SavedGuides();
    ko.applyBindings(vm , el);
    // make the savedGuides viewModel globally available.
    global.savedGuides = vm;

    // return reference to the newly created PlaceListViewModel and element(view)
    return { 'view' : el , 'viewModel' : vm };
};


module.exports = {
    Guide : Guide,
    GuideList : GuideList,
    SavedGuides : SavedGuides
};