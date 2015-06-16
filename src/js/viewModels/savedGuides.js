


    // this.saved = ko.computed(function(){
    //     // get saved guides from localStorage and parse it to be usable
    //     var savedGuides = JSON.parse(global.localStorage.getItem('guides')) || [];
    //     // check if this guide is already saved
    //     for (var i = savedGuides.length - 1; i >= 0; i--) {
    //         console.log(savedGuides[i].pageid);
    //         console.log(this.raw.pageid);
            
    //         if (savedGuides[i].pageid === this.raw.pageid){
    //             // guide is already saved
    //             // break out of the loop by returning and stopping the rest of the function
    //             return true;
    //         }
    //     }
    //     // guide is not saved
    //     return false;
    // },this);