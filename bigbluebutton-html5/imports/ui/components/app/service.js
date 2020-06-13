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

function getMeetingName(meetingId) {
  const meeting = Meetings.findOne({ meetingId: meetingId },
    { fields: { 'meetingProp.isBreakout': 1 } });
  return (meeting ? meeting.name : null);
}


function isMeetingBreakout(meetingIdentifier) {
  const meeting = Meetings.findOne({ meetingId: meetingIdentifier },
    { fields: { 'meetingProp.isBreakout': 1 } });
  return (meeting && meeting.meetingProp.isBreakout);
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

  return meeting.parentMeetingId;
}

export {
  getFontSize,
  meetingIsBreakout,
  isMeetingBreakout,
  getBreakoutRooms,
  validIOSVersion,
  getParentMeetingId,
};
