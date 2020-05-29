import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { defineMessages, injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import Auth from '/imports/ui/services/auth';
import Users from '/imports/api/users';
import Meetings from '/imports/api/meetings';
import { notify } from '/imports/ui/services/notification';
import CaptionsContainer from '/imports/ui/components/captions/container';
import CaptionsService from '/imports/ui/components/captions/service';
import getFromUserSettings from '/imports/ui/services/users-settings';
import deviceInfo from '/imports/utils/deviceInfo';
import UserInfos from '/imports/api/users-infos';
import Presentations from '/imports/api/presentations';
import MediaService, { getSwapLayout, shouldEnableSwapLayout } from '../media/service';
import { startBandwidthMonitoring, updateNavigatorConnection } from '/imports/ui/services/network-information/index';
import ScreenshareService from '/imports/ui/components/screenshare/service';

import {
  getFontSize,
  getBreakoutRooms,
  validIOSVersion,
} from './service';

import { withModalMounter } from '../modal/service';
import AudioManager from '/imports/ui/services/audio-manager';
import AudioModalContainer from '/imports/ui/components/audio/audio-modal/container';

import App from './component';
import NavBarContainer from '../nav-bar/container';
import ActionsBarContainer from '../actions-bar/container';
import MediaContainer from '../media/container';

import VoiceUsers from '/imports/api/voice-users';
import VoiceService from '/imports/ui/components/nav-bar/talking-indicator/service';
import PresenterService from '/imports/ui/components/actions-bar/service';
const propTypes = {
  navbar: PropTypes.node,
  actionsbar: PropTypes.node,
  media: PropTypes.node,
};

const defaultProps = {
  navbar: <NavBarContainer />,
  actionsbar: <ActionsBarContainer />,
  media: <MediaContainer />,
};

const intlMessages = defineMessages({
  waitingApprovalMessage: {
    id: 'app.guest.waiting',
    description: 'Message while a guest is waiting to be approved',
  },
});

const endMeeting = (code) => {
  Session.set('codeError', code);
  Session.set('isMeetingEnded', true);
};

const AppContainer = (props) => {
  const {
    navbar,
    actionsbar,
    media,
    ...otherProps
  } = props;

  return (
    <App
      navbar={navbar}
      actionsbar={actionsbar}
      media={media}
      {...otherProps}
    />
  );
};

const currentUserEmoji = currentUser => (currentUser ? {
  status: currentUser.emoji,
  changedAt: currentUser.emojiTime,
} : {
  status: 'none',
  changedAt: null,
});

export default injectIntl(withModalMounter(withTracker(({ intl, baseControls, mountModal }) => {
  const currentUser = Users.findOne({ userId: Auth.userID }, { fields: { approved: 1, emoji: 1 } });
  const currentMeeting = Meetings.findOne({ meetingId: Auth.meetingID },
    { fields: { publishedPoll: 1, voiceProp: 1 } });
  const { publishedPoll, voiceProp } = currentMeeting;

  if (!currentUser.approved) {
    baseControls.updateLoadingState(intl.formatMessage(intlMessages.waitingApprovalMessage));
  }

  // Check if user is removed out of the session
  Users.find({ userId: Auth.userID }, { fields: { connectionId: 1, ejected: 1 } }).observeChanges({
    changed(id, fields) {
      const hasNewConnection = 'connectionId' in fields && (fields.connectionId !== Meteor.connection._lastSessionId);

      if (fields.ejected || hasNewConnection) {
        endMeeting('403');
      }
    },
  });

  const UserInfo = UserInfos.find({
    meetingId: Auth.meetingID,
    requesterUserId: Auth.userID,
  }).fetch();

  const { current_presentation: hasPresentation } = MediaService.getPresentationInfo();
  const talkers = {};
  const meetingId = Auth.meetingID;
  const usersTalking = VoiceUsers.find({ meetingId, joined: true, spoke: true }, {
    fields: {
      callerName: 1,
      talking: 1,
      color: 1,
      startTime: 1,
      voiceUserId: 1,
      muted: 1,
      intId: 1,
    },
  }).fetch().sort(VoiceService.sortVoiceUsers);

  if (usersTalking) {
    for (let i = 0; i < (usersTalking.length <= 2 ? usersTalking.length : 2); i += 1) {
      const {
        callerName, talking, color, voiceUserId, muted, intId,
      } = usersTalking[i];
if( PresenterService.getPresenter().userId != intId ) {  
      talkers[`${intId}`] = {
        color,
        talking,
        voiceUserId,
        muted,
        callerName,
        intId,
      };
    }
    }
  }
  return {
    captions: CaptionsService.isCaptionsActive() ? <CaptionsContainer /> : null,
    fontSize: getFontSize(),
    hasBreakoutRooms: getBreakoutRooms().length > 0,
    customStyle: getFromUserSettings('bbb_custom_style', false),
    customStyleUrl: getFromUserSettings('bbb_custom_style_url', false),
    openPanel: Session.get('openPanel'),
    UserInfo,
    notify,
    validIOSVersion,
    amIPresenter: () => Users.findOne({ userId: Auth.userID },
      { fields: { presenter: 1 } }).presenter,
    amIModerator: () => Users.findOne({ userId: Auth.userID },
      { fields: { role: 1 } }).role === ROLE_MODERATOR,
    inAudio: AudioManager.isConnected && !AudioManager.isEchoTest,
    handleJoinAudio: () => (AudioManager.isConnected ? AudioManager.joinListenOnly() : mountModal(<AudioModalContainer />)),
    isPhone: deviceInfo.type().isPhone,
    isRTL: document.documentElement.getAttribute('dir') === 'rtl',
    meetingMuted: voiceProp.muteOnStart,
    swapLayout: (getSwapLayout() || !hasPresentation) && shouldEnableSwapLayout(),
    currentUserEmoji: currentUserEmoji(currentUser),
    hasPublishedPoll: publishedPoll,
    startBandwidthMonitoring,
    isVideoBroadcasting: ScreenshareService.isVideoBroadcasting(),
    isThereCurrentPresentation: Presentations.findOne({ meetingId: Auth.meetingID, current: true },
      { fields: {} }),
    handleNetworkConnection: () => updateNavigatorConnection(navigator.connection),
    talkers,
  };
})(AppContainer)));

AppContainer.defaultProps = defaultProps;
AppContainer.propTypes = propTypes;
