'use strict';
define(
    [
        'jquery',
        'underscore',
        'vent',
        'reqres',
        'marionette',
        'backbone',
        'Series/EpisodeCollection',
        'Series/EpisodeFileCollection',
        'Series/SeasonCollection',
        'Series/Details/SeasonCollectionView',
        'Series/Details/InfoView',
        'Commands/CommandController',
        'Shared/LoadingView',
        'backstrech',
        'Mixins/backbone.signalr.mixin'
    ], function ($,
                 _,
                 vent,
                 reqres,
                 Marionette,
                 Backbone,
                 EpisodeCollection,
                 EpisodeFileCollection,
                 SeasonCollection,
                 SeasonCollectionView,
                 InfoView,
                 CommandController,
                 LoadingView) {
        return Marionette.Layout.extend({

            itemViewContainer: '.x-series-seasons',
            template         : 'Series/Details/SeriesDetailsTemplate',

            regions: {
                seasons: '#seasons',
                info   : '#info'
            },

            ui: {
                header   : '.x-header',
                monitored: '.x-monitored',
                edit     : '.x-edit',
                refresh  : '.x-refresh',
                rename   : '.x-rename',
                search   : '.x-search'
            },

            events: {
                'click .x-monitored': '_toggleMonitored',
                'click .x-edit'     : '_editSeries',
                'click .x-refresh'  : '_refreshSeries',
                'click .x-rename'   : '_renameSeries',
                'click .x-search'   : '_seriesSearch'
            },

            initialize: function () {
                this.listenTo(this.model, 'change:monitored', this._setMonitoredState);
                this.listenTo(vent, vent.Events.SeriesDeleted, this._onSeriesDeleted);

                vent.on(vent.Events.CommandComplete, this._commandComplete, this);
            },

            onShow: function () {
                $('body').addClass('backdrop');
                var fanArt = this._getFanArt();

                if (fanArt) {
                    this._backstrech = $.backstretch(fanArt);
                }
                else {
                    $('body').removeClass('backdrop');
                }

                this._showSeasons();
                this._setMonitoredState();
                this._showInfo();
            },

            onRender: function () {
                CommandController.bindToCommand({
                    element: this.ui.refresh,
                    command: {
                        name: 'refreshSeries'
                    }
                });

                CommandController.bindToCommand({
                    element: this.ui.search,
                    command: {
                        name: 'seriesSearch'
                    }
                });

                CommandController.bindToCommand({
                    element: this.ui.rename,
                    command: {
                        name        : 'renameFiles',
                        seriesId    : this.model.id,
                        seasonNumber: -1
                    }
                });
            },

            _getFanArt: function () {
                var fanArt = _.where(this.model.get('images'), {coverType: 'fanart'});

                if (fanArt && fanArt[0]) {
                    return fanArt[0].url;
                }

                return undefined;
            },

            onClose: function () {

                if (this._backstrech) {
                    this._backstrech.destroy();
                    delete this._backstrech;
                }

                $('body').removeClass('backdrop');
                reqres.removeHandler(reqres.Requests.GetEpisodeFileById);
            },

            _toggleMonitored: function () {
                var savePromise = this.model.save('monitored', !this.model.get('monitored'), {
                    wait: true
                });

                this.ui.monitored.spinForPromise(savePromise);
            },

            _setMonitoredState: function () {
                var monitored = this.model.get('monitored');

                this.ui.monitored.removeAttr('data-idle-icon');

                if (monitored) {
                    this.ui.monitored.addClass('icon-nd-monitored');
                    this.ui.monitored.removeClass('icon-nd-unmonitored');
                    this.$el.removeClass('series-not-monitored');
                }
                else {
                    this.ui.monitored.addClass('icon-nd-unmonitored');
                    this.ui.monitored.removeClass('icon-nd-monitored');
                    this.$el.addClass('series-not-monitored');
                }
            },

            _editSeries: function () {
                vent.trigger(vent.Commands.EditSeriesCommand, {series: this.model});
            },

            _refreshSeries: function () {
                CommandController.Execute('refreshSeries', {
                    name    : 'refreshSeries',
                    seriesId: this.model.id
                });
            },

            _onSeriesDeleted: function (event) {

                if (this.model.get('id') === event.series.get('id')) {
                    Backbone.history.navigate('/', { trigger: true });
                }
            },

            _renameSeries: function () {
                vent.trigger(vent.Commands.ShowRenamePreview, { series: this.model });
            },

            _seriesSearch: function () {
                CommandController.Execute('seriesSearch', {
                    name    : 'seriesSearch',
                    seriesId: this.model.id
                });
            },

            _showSeasons: function () {
                var self = this;

                this.seasons.show(new LoadingView());

                this.seasonCollection = new SeasonCollection(this.model.get('seasons'));
                this.episodeCollection = new EpisodeCollection({ seriesId: this.model.id }).bindSignalR();
                this.episodeFileCollection = new EpisodeFileCollection({ seriesId: this.model.id }).bindSignalR();

                reqres.setHandler(reqres.Requests.GetEpisodeFileById, function (episodeFileId) {
                    return self.episodeFileCollection.get(episodeFileId);
                });

                $.when(this.episodeCollection.fetch(), this.episodeFileCollection.fetch()).done(function () {
                    var seasonCollectionView = new SeasonCollectionView({
                        collection       : self.seasonCollection,
                        episodeCollection: self.episodeCollection,
                        series           : self.model
                    });

                    self.seasons.show(seasonCollectionView);
                });
            },

            _showInfo: function () {
                this.info.show(new InfoView({ model: this.model }));
            },

            _commandComplete: function (options) {
                if (options.command.get('name') === 'refreshseries' || options.command.get('name') === 'renamefiles') {
                    if (options.command.get('seriesId') === this.model.get('id')) {
                        this._showSeasons();
                        this._setMonitoredState();
                        this._showInfo();
                    }
                }
            }
        });
    });
