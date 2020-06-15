import React, { PureComponent } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import Message from './component';
import ChatService from '/imports/ui/components/chat/service'

class MessageContainer extends PureComponent {
  render() {
    return (
      <Message {...this.props} />
    );
  }
}

export default withTracker(() => {
  const targetMeetings = ChatService.getCrossChatTargetMeetings();
  let chattype = Session.get('idChatOpen');
  if( Session.get('idChatOpen') == "" ){ chattype = "public" }
  return {
    targetMeetings,
    chattype,
    getMessageObj: messageId => ChatService.getMessageObject(messageId),
    currentUser: ChatService.getCurrentUser(),
    sendCrossGroupMsg: (msgObj, meetingId, senderName) => {ChatService.sendCrossGroupMessage(msgObj, meetingId, senderName)}
  };
})(MessageContainer);
