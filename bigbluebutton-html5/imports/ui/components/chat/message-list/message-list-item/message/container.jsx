import React, { PureComponent } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import Message from './component';
import ChatService from '/imports/ui/components/chat/service'

const CHAT_CONFIG = Meteor.settings.public.chat;
const PUBLIC_CHAT_KEY = CHAT_CONFIG.public_id;
class MessageContainer extends PureComponent {
  render() {
    return (
      <Message {...this.props} />
    );
  }
}

export default withTracker(() => {
  const targetMeetings = ChatService.getCrossChatTargetMeetings();
  let chattype = Session.get('idChatOpen') || PUBLIC_CHAT_KEY;
  return {
    targetMeetings,
    chattype,
    getMessageObj: messageId => ChatService.getMessageObject(messageId),
    currentUser: ChatService.getCurrentUser(),
    sendCrossGroupMsg: (msgObj, meetingId, senderName) => {ChatService.sendCrossGroupMessage(msgObj, meetingId, senderName)}
  };
})(MessageContainer);
