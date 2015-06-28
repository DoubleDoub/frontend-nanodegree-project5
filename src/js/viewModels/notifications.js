module.exports = exports = {};
/**
 * initializes the notification UI and exposes its api to the window object
 * @return {void}
 */
exports.initNotificationUI = function(){
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
        this.messages.push(Object.create(Object.prototype,{
            header :  {
                value: header || 'Notification'
            },
            message: {
                value: notification
            }
        }));

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
};