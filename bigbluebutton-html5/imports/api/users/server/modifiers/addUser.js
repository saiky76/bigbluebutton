import { check } from 'meteor/check';
import Logger from '/imports/startup/server/logger';
import Users from '/imports/api/users';
import Meetings from '/imports/api/meetings';
import VoiceUsers from '/imports/api/voice-users/';

import stringHash from 'string-hash';
import flat from 'flat';

import addVoiceUser from '/imports/api/voice-users/server/modifiers/addVoiceUser';

const COLOR_LIST = [
  '#800000', '#00FF00', '#00FF00', '#C0C0C0','#0000FF', "#7b1fa2", "#303f9f",
  '#88B04B', '#6B5B95', '#92A8D1', '#FF6F61', '#1a237e', '#1565c0',
  '#990066', '#0277bd', '#766F57', '#A9754F', '#E94B3C', '#2E4A62', '#485167', '#BD3D3A'
];

export default function addUser(meetingId, user) {
  check(meetingId, String);

  check(user, {
    intId: String,
    extId: String,
    name: String,
    email: String,
    role: String,
    guest: Boolean,
    authed: Boolean,
    waitingForAcceptance: Match.Maybe(Boolean),
    guestStatus: String,
    emoji: String,
    presenter: Boolean,
    locked: Boolean,
    avatar: String,
    clientType: String,
  });

  const userId = user.intId;

  const selector = {
    meetingId,
    userId,
  };
  const Meeting = Meetings.findOne({ meetingId });

  /* While the akka-apps dont generate a color we just pick one
    from a list based on the userId */
  const color = COLOR_LIST[stringHash(user.intId) % COLOR_LIST.length];

  const modifier = {
    $set: Object.assign(
      {
        meetingId,
        connectionStatus: 'online',
        sortName: user.name.trim().toLowerCase(),
        color,
        breakoutProps: {
          isBreakoutUser: Meeting.meetingProp.isBreakout,
          parentId: Meeting.breakoutProps.parentId,
        },
        effectiveConnectionType: null,
        inactivityCheck: false,
        responseDelay: 0,
        loggedOut: false,
      },
      flat(user),
    ),
  };

  // Only add an empty VoiceUser if there isn't one already and if the user coming in isn't a
  // dial-in user. We want to avoid overwriting good data
  if (user.clientType !== 'dial-in-user' && !VoiceUsers.findOne({ meetingId, intId: userId })) {
    addVoiceUser(meetingId, {
      voiceUserId: '',
      intId: userId,
      callerName: user.name,
      callerNum: '',
      muted: false,
      talking: false,
      callingWith: '',
      listenOnly: false,
      voiceConf: '',
      joined: false,
    });
  }

  const cb = (err, numChanged) => {
    if (err) {
      return Logger.error(`Adding user to collection: ${err}`);
    }

    const { insertedId } = numChanged;
    if (insertedId) {
      return Logger.info(`Added user id=${userId} meeting=${meetingId}`);
    }

    return Logger.info(`Upserted user id=${userId} meeting=${meetingId}`);
  };

  return Users.upsert(selector, modifier, cb);
}
