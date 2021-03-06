﻿using NzbDrone.Core.Tv;

namespace NzbDrone.Core.Notifications.Plex
{
    public class PlexClient : NotificationBase<PlexClientSettings>
    {
        private readonly IPlexService _plexProvider;

        public PlexClient(IPlexService plexProvider)
        {
            _plexProvider = plexProvider;
        }

        public override string Link
        {
            get { return "http://www.plexapp.com/"; }
        }

        public override void OnGrab(string message)
        {
            const string header = "NzbDrone [TV] - Grabbed";
            _plexProvider.Notify(Settings, header, message);
        }

        public override void OnDownload(DownloadMessage message)
        {
            const string header = "NzbDrone [TV] - Downloaded";
            _plexProvider.Notify(Settings, header, message.Message);
        }

        public override void AfterRename(Series series)
        {
        }
    }
}
