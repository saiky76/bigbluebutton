import Breakouts from '/imports/api/breakouts';
import Meetings from '/imports/api/meetings';
import Settings from '/imports/ui/services/settings';
import Auth from '/imports/ui/services/auth/index';

const getFontSize = () => {
  const applicationSettings = Settings.application;
  return applicationSettings ? applicationSettings.fontSize : '16px';
};

const getBreakoutRooms = () => Breakouts.find().fetch();

function meetingIsBreakout() {
  const meeting = Meetings.findOne({ meetingId: Auth.meetingID },
    { fields: { 'meetingProp.isBreakout': 1 } });
  return (meeting && meeting.meetingProp.isBreakout);
}

function isMeetingBreakout(meetingIdentifier) {
  const meeting = Meetings.findOne({ meetingId: meetingIdentifier },
    { fields: { 'meetingProp.isBreakout': 1 } });
  return (meeting && meeting.meetingProp.isBreakout);
}

function canUserJoinAudio() {
  const userid = localStorage.getItem("VOICE_USER_ID");
  if (userid == null) {
    return true;
  }
  else if (userid != Auth.userID) {
    return false;
  }
  else {
    return true;
  }
}

const validIOSVersion = () => {
  const SUPPORTED_OS_VERSION = 12.2;
  const iosMatch = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (iosMatch) {
    const versionNumber = iosMatch[0].split(' ')[1].replace('_', '.');
    const isInvalid = parseFloat(versionNumber) < SUPPORTED_OS_VERSION;
    if (isInvalid) return false;
  }
  return true;
};

function getParentMeetingId(breakoutId) {
  const meeting = Breakouts.findOne({breakoutId: breakoutId}, 
    { fields: {parentMeetingId: 1}}
  )

  return meeting ? meeting.parentMeetingId : null;
}

export {
  getFontSize,
  meetingIsBreakout,
  isMeetingBreakout,
  getBreakoutRooms,
  validIOSVersion,
  getParentMeetingId,
  canUserJoinAudio
};
