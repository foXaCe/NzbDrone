'use strict';
define(
    [
        'marionette',
        'System/StatusModel'
    ], function (Marionette, StatusModel) {
        return Marionette.ItemView.extend({
            template: 'System/Info/About/AboutViewTemplate',

            initialize: function () {
                this.model = StatusModel;
            }
        });
    });
