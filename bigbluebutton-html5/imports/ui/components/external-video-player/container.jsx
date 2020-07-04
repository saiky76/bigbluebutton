import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { Session } from 'meteor/session';
import { getVideoUrl } from './service';
import ExternalVideo from './component';
import ExternalVideoService from '/imports/ui/components/external-video-player/service';

const ExternalVideoContainer = props => (
  <ExternalVideo {...{ ...props }} />
);

export default withTracker(({ isPresenter }) => {
  const inEchoTest = Session.get('inEchoTest');
  return {
    inEchoTest,
    isPresenter,
    videoUrl: getVideoUrl(),
    stopExternalVideoShare: ExternalVideoService.stopWatching,
  };
})(ExternalVideoContainer);
