import React, { PureComponent } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import ChatList from './component';
import ChatService from '../service';
import ChannelService from '/imports/ui/components/channels/service'
import Auth from '/imports/ui/services/auth';

const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

class ChatContainer extends PureComponent {
  render() {
    return (
      <ChatList {...this.props} />
    );
  }
}

export default withTracker(({ chatId }) => {
  const hasUnreadMessages = ChatService.hasUnreadMessages(chatId);
  const scrollPosition = ChatService.getScrollPosition(chatId);
  const lastReadMessageTime = ChatService.lastReadMessageTime(chatId);
  const currentUser = ChatService.getUser(Auth.userID);
  const amIModerator = currentUser.role === ROLE_MODERATOR;
  const isBreakoutMeeting = ChannelService.validateMeetingIsBreakout(Auth.meetingID)
  return {
    hasUnreadMessages,
    scrollPosition,
    lastReadMessageTime,
    handleScrollUpdate: ChatService.updateScrollPosition,
    handleReadMessage: ChatService.updateUnreadMessage,
    isMeteorConnected: Meteor.status().connected,
    amIModerator,
    isBreakoutMeeting,
    currentUser: ChatService.getUser(Auth.userID),

  };
})(ChatContainer);
