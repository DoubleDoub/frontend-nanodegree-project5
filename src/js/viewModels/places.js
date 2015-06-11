var ko = global.ko;
var $ = require('jquery');

// store for all references to instanciated listViewModels this is exported 
var instances = [];

/**
 * Constructor for wikivoyage guide
 * @param {object} [guide] data from wikivoyage api
 * @return {object} guide instance
 */
var GuideViewModel = function (guide) {
    console.log(guide);
    this.title = ko.observable(guide.title);
    this.url = ko.observable(guide.fullurl);
    this.coordinates = ko.observable(guide.coordinates[0]);
    this.intro = ko.observable(guide.extract);
    

};

function GuideListViewModel() {
    this.guideData = ko.observableArray([]);
    instances.push(this.guideData);
}

GuideListViewModel.prototype.update = function (Lat, Lng, callback) {
    var req = {
        format: 'json',
        action: 'query',
        generator: 'geosearch',
        ggsprop:'type|name|country|region',
        ggsradius:'10000',
        ggscoord: String(Lat) + '|' + String(Lng),
        prop:'info|extracts|pageimages|coordinates',
        inprop:'url',
        //rvprop:'content',
        pilimit: 20,
        piprop : 'thumbnail',
        exintro : true,
        exlimit : 20
    };
    
    $.ajax({
        url: 'http://en.wikivoyage.org/w/api.php',
        data: req,
        cache: true,
        dataType: 'jsonp',
        success: function(result) {

            if ('query' in result &&'pages' in result.query) {
                var guide;
                var checkDuplicate = function(guideInArray){
                    return guideInArray.title() === guide.title() ;
                };

                var guideKeys = Object.keys(result.query.pages);

                for (var i = guideKeys.length - 1; i >= 0; i--) {
                    // console.log(result.query.pages[guideKeys[i]]);
                    guide = new GuideViewModel(result.query.pages[guideKeys[i]]);
                    // make sure that the guide isn't already there (prevent doubles/duplicates)

                    var guideDuplicate = ko.utils.arrayFirst(this.guideData(), checkDuplicate);
                    if (!guideDuplicate){
                        // push the guide to the guideData ObservableArray.
                        this.guideData.push(guide);
                    }
                    
                }

                return callback(null, this.guideData);
            } else {
                return callback('No data in this area', this.guideData);
            }
        }.bind(this),
        error: function(jqxhr, status, error){
            // Notify the user that the data could not be accessed
            var message = 'Something went wrong';
            message += status;
            
            global.notification.notify( message, 'connectionError');
        }
    });
};

var create = function (params) {
    params = params || '';
    var el = global.document.createElement('div');
    el.innerHTML =  require('../views/guide-list.html');
    //el.setAttribute('params', params);
    var vm = new GuideListViewModel();
    ko.applyBindings(vm , el);

    // return reference to the newly created PlaceListViewModel and element(view)
    return { 'view' : el , 'viewModel' : vm };
};

var createInfoWindow = function(data){
    var vm,el;
    el = global.document.createElement('div');
    vm = data;
    el.innerHTML = require('../views/guide-info-window.html');
    // if data is not already a viewModel we need to transform it into one
    if (!(vm instanceof GuideViewModel)){
        vm = new GuideViewModel(data);
    }
    ko.applyBindings(vm, el);

    return {view : el, viewModel : vm};
};

ko.components.register('guide-list', {
    viewModel : GuideListViewModel,
    template : require('../views/guide-list.html')
});

ko.components.register('guide', {
    template : require('../views/guide.html')
});

module.exports = {
    createObject : create,
    createInfoWindow : createInfoWindow
};