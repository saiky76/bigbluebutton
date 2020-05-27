import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import RedisPubSub from '/imports/startup/server/redis';

export default function removeOfflineUserFromBreakout(credentials, email, name, breakoutId) {

  console.log("API removeOfflineUserFromBreakout");
  const REDIS_CONFIG = Meteor.settings.private.redis;
  const CHANNEL = REDIS_CONFIG.channels.toAkkaApps;

  const { meetingId, requesterUserId, requesterToken } = credentials;

  check(meetingId, String);
  check(requesterUserId, String);
  check(requesterToken, String);
  check(email, String);
  check(name, String);
  check(breakoutId, String);

  const eventName = 'RemoveOfflineUserFromBreakoutCmdMsg';

  return RedisPubSub.publishUserMessage(
    CHANNEL, eventName, meetingId, requesterUserId,
    {
      email,
      name,
      breakoutId
    },
  );
}
