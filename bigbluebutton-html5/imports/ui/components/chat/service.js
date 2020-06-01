import Users from '/imports/api/users';
import Meetings from '/imports/api/meetings';
import { GroupChatMsg } from '/imports/api/group-chat-msg';
import GroupChat from '/imports/api/group-chat';
import Auth from '/imports/ui/services/auth';
import UnreadMessages from '/imports/ui/services/unread-messages';
import Storage from '/imports/ui/services/storage/session';
import { makeCall } from '/imports/ui/services/api';
import ChannelsService from '/imports/ui/components/channels/service';
import _ from 'lodash';

const CHAT_CONFIG = Meteor.settings.public.chat;
const GROUPING_MESSAGES_WINDOW = CHAT_CONFIG.grouping_messages_window;

const SYSTEM_CHAT_TYPE = CHAT_CONFIG.type_system;

const PUBLIC_CHAT_ID = CHAT_CONFIG.public_id;
const PUBLIC_GROUP_CHAT_ID = CHAT_CONFIG.public_group_id;
const PRIVATE_CHAT_TYPE = CHAT_CONFIG.type_private;
const PUBLIC_CHAT_USER_ID = CHAT_CONFIG.system_userid;
const PUBLIC_CHAT_CLEAR = CHAT_CONFIG.system_messages_keys.chat_clear;

const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

const CONNECTION_STATUS_ONLINE = 'online';

const ScrollCollection = new Mongo.Collection(null);

const UnsentMessagesCollection = new Mongo.Collection(null);

// session for closed chat list
const CLOSED_CHAT_LIST_KEY = 'closedChatList';

const getUser = userId => Users.findOne({ userId });

const getWelcomeProp = () => Meetings.findOne({ meetingId: Auth.meetingID },
  { fields: { welcomeProp: 1 } });


const isMasterChannel = (meeting) => {
  return meeting && meeting.breakoutProps.parentId === 'bbb-none';
}

const getMeeting = () => {
  return Meetings.findOne({ meetingId: Auth.meetingID });
}

const mapGroupMessage = (message) => {
  const mappedMessage = {
    id: message._id,
    content: message.content,
    time: message.timestamp,
    sender: null,
  };

  if (message.sender !== SYSTEM_CHAT_TYPE || message.sender !== 'SYSTEM') {
    const sender = Users.findOne({ userId: message.sender },
      {
        fields: {
          color: 1, role: 1, name: 1, connectionStatus: 1, userId: 1,
        },
      });
    const {
      color,
      role,
      name,
      connectionStatus,
      userId,
    } = sender;

    const mappedSender = {
      color,
      isModerator: role === ROLE_MODERATOR,
      name,
      isOnline: connectionStatus === CONNECTION_STATUS_ONLINE,
      userId,
    };

    mappedMessage.sender = mappedSender;
  }

  return mappedMessage;
};

const reduceGroupMessages = (previous, current) => {
  const lastMessage = previous[previous.length - 1];
  const currentMessage = current;
  currentMessage.content = [{
    id: current.id,
    text: current.message.message,
    fileData: current.message.fileObj,
    color: current.color,
    time: current.timestamp,
  }];

  if (!lastMessage || !currentMessage.chatId === PUBLIC_GROUP_CHAT_ID) {
    return previous.concat(currentMessage);
  }
  // Check if the last message is from the same user and time discrepancy
  // between the two messages exceeds window and then group current message
  // with the last one
  const timeOfLastMessage = lastMessage.content[lastMessage.content.length - 1].time;
  if (lastMessage.sender === currentMessage.sender
    && (currentMessage.timestamp - timeOfLastMessage) <= GROUPING_MESSAGES_WINDOW) {
    lastMessage.content.push(currentMessage.content.pop());
    return previous;
  }

  return previous.concat(currentMessage);
};

const reduceAndMapGroupMessages = messages => (messages
  .reduce(reduceGroupMessages, []).map(mapGroupMessage));

const getPublicGroupMessages = () => {
  const publicGroupMessages = GroupChatMsg.find({
    meetingId: Auth.meetingID,
    chatId: PUBLIC_GROUP_CHAT_ID,
  }, { sort: ['timestamp'] }).fetch();
  return publicGroupMessages;
};

const getPrivateGroupMessages = () => {
  const chatID = Session.get('idChatOpen');
  const senderId = Auth.userID;

  const privateChat = GroupChat.findOne({
    meetingId: Auth.meetingID,
    users: { $all: [chatID, senderId] },
    access: PRIVATE_CHAT_TYPE,
  });

  let messages = [];

  if (privateChat) {
    const {
      chatId,
    } = privateChat;

    messages = GroupChatMsg.find({
      meetingId: Auth.meetingID,
      chatId,
    }, { sort: ['timestamp'] }).fetch();
  }

  return reduceAndMapGroupMessages(messages, []);
};

const isChatLocked = (receiverID) => {
  const isPublic = receiverID === PUBLIC_CHAT_ID;

  const meeting = Meetings.findOne({ meetingId: Auth.meetingID },
    { fields: { 'lockSettingsProps.disablePublicChat': 1 } });
  const user = Users.findOne({ meetingId: Auth.meetingID, userId: Auth.userID },
    { fields: { locked: 1, role: 1 } });
  const receiver = Users.findOne({ meetingId: Auth.meetingID, userId: receiverID },
    { fields: { role: 1 } });
  const isReceiverModerator = receiver && receiver.role === ROLE_MODERATOR;

  if (meeting.lockSettingsProps !== undefined) {
    if (user.locked && user.role !== ROLE_MODERATOR) {
      if (isPublic) {
        return meeting.lockSettingsProps.disablePublicChat;
      }
      return !isReceiverModerator
        && meeting.lockSettingsProps.disablePrivateChat;
    }
  }

  return false;
};

const hasUnreadMessages = (receiverID) => {
  const isPublic = receiverID === PUBLIC_CHAT_ID;
  const chatType = isPublic ? PUBLIC_GROUP_CHAT_ID : receiverID;
  return UnreadMessages.count(chatType) > 0;
};

const lastReadMessageTime = (receiverID) => {
  const isPublic = receiverID === PUBLIC_CHAT_ID;
  const chatType = isPublic ? PUBLIC_GROUP_CHAT_ID : receiverID;

  return UnreadMessages.get(chatType);
};

const sendGroupMessage = (messageObj) => {

  const chatID = Session.get('idChatOpen') || PUBLIC_CHAT_ID;
  const isPublicChat = chatID === PUBLIC_CHAT_ID;

  let destinationChatId = PUBLIC_GROUP_CHAT_ID;

  const { fullname: senderName, userID: senderUserId } = Auth;
  const receiverId = { id: chatID };

  if (!isPublicChat) {
    const privateChat = GroupChat.findOne({ users: { $all: [chatID, senderUserId] } },
      { fields: { chatId: 1 } });

    if (privateChat) {
      const { chatId: privateChatId } = privateChat;

      destinationChatId = privateChatId;
    }
  }

  const groupChatMsgFromUser = {
    color: '0',
    correlationId: `${senderUserId}-${Date.now()}`,
    sender: {
      id: senderUserId,
      name: senderName,
    },
  };

  const fileData = (messageObj.fileId) ? ({
    fileId: messageObj.fileId,
    fileName: messageObj.fileName,
  }) : undefined;

  groupChatMsgFromUser.messageObj = {
    message: messageObj.message,
    fileObj: fileData,
    senderEmail: messageObj.senderEmail,
    senderGroup: messageObj.senderGroup
  };
  const currentClosedChats = Storage.getItem(CLOSED_CHAT_LIST_KEY);

  // Remove the chat that user send messages from the session.
  if (_.indexOf(currentClosedChats, receiverId.id) > -1) {
    Storage.setItem(CLOSED_CHAT_LIST_KEY, _.without(currentClosedChats, receiverId.id));
  }

  return makeCall('sendGroupChatMsg', destinationChatId, groupChatMsgFromUser);
};

const getCrossChatTargetMeetings = () => {
  let meeting  = getMeeting();
  if(isMasterChannel(meeting)){
    return ChannelsService.findBreakouts()
          .map(b => ({meetingId:b.breakoutId, meetingName: b.name}));
  }else{
    //get the master channel
    let arr = [];
    arr.push(({meetingId:meeting.breakoutProps.parentId, meetingName: 'Master Channel'}));
    return arr;
  }
}


/*+++++++++++++++++++++++++++++++++++++++++*/
  //TO BE CALLED FROM UI LAYER

  // console.log("sending message to room0");
  
  // let rooms = getCrossChatTargetMeetings();
  // const currentUser = Users.findOne({ userId: Auth.userID }, { fields: { role: 1} })
  // console.log("sending message to room1");
  // if(rooms && rooms.length > 0){
  //   console.log("sending message to room2");
  //   let room = rooms.shift();
  //   return sendCrossGroupMessage(messageObj, room.meetingId, currentUser.role == ROLE_MODERATOR ? 'Moderator' : room.meetingName);
  // }

  // return null;

  //sendCrossGroupMessage

  /*++++++++++++++++++++++++++++++++++++++++*/
const sendCrossGroupMessage = (messageObj, targetMeetingId, senderGroupName) => {
  const chatID = Session.get('idChatOpen') || PUBLIC_CHAT_ID;
  let destinationChatId = PUBLIC_GROUP_CHAT_ID;

  const receiverId = { id: chatID };

  const fileData = (messageObj.fileId) ? ({
    fileId: messageObj.fileId,
    fileName: messageObj.fileName,
  }) : undefined;

  let user = getUser(Auth.userID);
  let meeting = getMeeting();
  
  messageObj.senderGroupName = senderGroupName;  

  let senderUserId = null;
  let senderName = null;
  
  if (isMasterChannel(meeting)){
    //let breakout = ChannelsService.findBreakouts().map(breakout => breakout).shift();
    if(senderGroupName === 'Moderator'){
      senderName = "SYSTEM";
      senderUserId = "SYSTEM";
    }else{
      let breakoutUser = ChannelsService.getBreakoutMeetingUserId(user.email, user.name, targetMeetingId);
      if(breakoutUser){
        senderName = user.name;
        senderUserId = breakoutUser.userId;
      }
    }
  }else{
    console.log("sending message to master");
    let breakoutRoom = ChannelsService.getBreakout(Auth.meetingID);
    let mainChannelUser = breakoutRoom.users.find(u => u.email == user.email && u.username == user.name);
    if(mainChannelUser){
      senderName = mainChannelUser.username;
      senderUserId =  mainChannelUser.userId;
    }else{
      console.log("cannot find master channel user in targetMeetingId: " + targetMeetingId);
    }
  }

  const groupChatMsgFromUser = {
    color: '0',
    correlationId: `${senderUserId}-${Date.now()}`,
    sender: {
      id: senderUserId != null ? senderUserId : 'Moderator',
      name: senderName,
    },
  };

  groupChatMsgFromUser.messageObj = {
    message: messageObj.message,
    fileObj: fileData,
    senderEmail: messageObj.senderEmail,
    senderGroup: messageObj.senderGroup
  };
 

  const currentClosedChats = Storage.getItem(CLOSED_CHAT_LIST_KEY);

  // Remove the chat that user send messages from the session.
  if (_.indexOf(currentClosedChats, receiverId.id) > -1) {
    Storage.setItem(CLOSED_CHAT_LIST_KEY, _.without(currentClosedChats, receiverId.id));
  }

  return makeCall('sendGroupChatMsg', destinationChatId, groupChatMsgFromUser, targetMeetingId);
};

/*const updateMessageObjForCrossChannel = (message, fileData) => {
  let user = getUser(Auth.userID);
  let meetingid = Auth.meetingID;

  let meeting = getMeeting();
  
  if (isMasterChannel(meeting)){
    let breakout = ChannelsService.findBreakouts().map(breakout => breakout).shift();
    let breakoutUser = ChannelsService.getBreakoutMeetingUserId(user.email, user.name, breakout.breakoutId);
    if(breakoutUser){
       return {message: message, 
                fileData: fileData,
                senderGroupName: breakout.name,
                crossChannelMsg: true,
                crossChannelMeetingId: breakout.breakoutId,
                senderUsername: user.name,
                senderUserId: breakoutUser.userId
              } 
    }
  }else{
    let breakoutRoom = ChannelsService.getBreakout(Auth.meetingID);
    let mainChannelUser = breakoutRoom.users.find(u => u.email == user.email && u.username == user.name)
    console.log("Auth.meetingID: ", Auth.meetingID);    
    console.log("meeting.breakoutProps.parentId: ", meeting.breakoutProps.parentId);
    console.log("user.email: ", user.email);
    console.log("user.email: ", user.name);
    //let masterChannelUser = ChannelsService.getMeetingUserId(user.email, user.name, meeting.breakoutProps.parentId);
    console.log("mainChannelUser: ", mainChannelUser);

    return {message: message, 
      fileData: fileData,
      senderGroupName: breakoutRoom.name,
      crossChannelMsg: true,
      crossChannelMeetingId:meeting.breakoutProps.parentId,
      senderUsername: mainChannelUser.username,
      senderUserId: mainChannelUser.userId
    }

  }

}*/

//For non moderator
// const updateMessageObjForCrossChannel = (message, fileData) => {
//   let user = getUser(Auth.userID);
//   let meetingid = Auth.meetingID;

//   let meeting = getMeeting();
  
//   if (isMasterChannel(meeting)){
//     let breakout = ChannelsService.findBreakouts().map(breakout => breakout).shift();
//     let breakoutUser = ChannelsService.getBreakoutMeetingUserId(user.email, user.name, breakout.breakoutId);
//     if(breakoutUser){
//        return {message: message, 
//                 fileData: fileData,
//                 senderGroupName: breakout.name,
//                 crossChannelMsg: true,
//                 crossChannelMeetingId: breakout.breakoutId,
//                 senderUsername: user.name,
//                 senderUserId: breakoutUser.userId
//               } 
//     }
//   }else{
//     let breakoutRoom = ChannelsService.getBreakout(Auth.meetingID);
//     let mainChannelUser = breakoutRoom.users.find(u => u.email == user.email && u.username == user.name)
//     console.log("Auth.meetingID: ", Auth.meetingID);    
//     console.log("meeting.breakoutProps.parentId: ", meeting.breakoutProps.parentId);
//     console.log("user.email: ", user.email);
//     console.log("user.email: ", user.name);
//     //let masterChannelUser = ChannelsService.getMeetingUserId(user.email, user.name, meeting.breakoutProps.parentId);
//     console.log("mainChannelUser: ", mainChannelUser);

//     return {message: message, 
//       fileData: fileData,
//       senderGroupName: breakoutRoom.name,
//       crossChannelMsg: true,
//       crossChannelMeetingId:meeting.breakoutProps.parentId,
//       senderUsername: mainChannelUser.username,
//       senderUserId: mainChannelUser.userId
//     }

//   }

// }

const getScrollPosition = (receiverID) => {
  const scroll = ScrollCollection.findOne({ receiver: receiverID },
    { fields: { position: 1 } }) || { position: null };
  return scroll.position;
};

const updateScrollPosition = position => ScrollCollection.upsert(
  { receiver: Session.get('idChatOpen') },
  { $set: { position } },
);

const updateUnreadMessage = (timestamp) => {
  const chatID = Session.get('idChatOpen') || PUBLIC_CHAT_ID;
  const isPublic = chatID === PUBLIC_CHAT_ID;
  const chatType = isPublic ? PUBLIC_GROUP_CHAT_ID : chatID;
  return UnreadMessages.update(chatType, timestamp);
};

const clearPublicChatHistory = () => (makeCall('clearPublicChatHistory'));

const closePrivateChat = () => {
  const chatID = Session.get('idChatOpen');
  const currentClosedChats = Storage.getItem(CLOSED_CHAT_LIST_KEY) || [];

  if (_.indexOf(currentClosedChats, chatID) < 0) {
    currentClosedChats.push(chatID);

    Storage.setItem(CLOSED_CHAT_LIST_KEY, currentClosedChats);
  }
};

// if this private chat has been added to the list of closed ones, remove it
const removeFromClosedChatsSession = () => {
  const chatID = Session.get('idChatOpen');
  const currentClosedChats = Storage.getItem(CLOSED_CHAT_LIST_KEY);
  if (_.indexOf(currentClosedChats, chatID) > -1) {
    Storage.setItem(CLOSED_CHAT_LIST_KEY, _.without(currentClosedChats, chatID));
  }
};

// We decode to prevent HTML5 escaped characters.
const htmlDecode = (input) => {
  const e = document.createElement('div');
  e.innerHTML = input;
  const messages = Array.from(e.childNodes);
  const message = messages.map(chatMessage => chatMessage.textContent);
  return message.join('');
};

// Export the chat as [Hour:Min] user: message
const exportChat = (messageList) => {
  const { welcomeProp } = getWelcomeProp();
  const { loginTime } = Users.findOne({ userId: Auth.userID }, { fields: { loginTime: 1 } });
  const { welcomeMsg } = welcomeProp;

  const clearMessage = messageList.filter(message => message.message === PUBLIC_CHAT_CLEAR);

  const hasClearMessage = clearMessage.length;

  if (!hasClearMessage || (hasClearMessage && clearMessage[0].timestamp < loginTime)) {
    messageList.push({
      timestamp: loginTime,
      message: welcomeMsg,
      type: SYSTEM_CHAT_TYPE,
      sender: PUBLIC_CHAT_USER_ID,
    });
  }

  messageList.sort((a, b) => a.timestamp - b.timestamp);

  return messageList.map((message) => {
    const date = new Date(message.timestamp);
    const hour = date.getHours().toString().padStart(2, 0);
    const min = date.getMinutes().toString().padStart(2, 0);
    const hourMin = `[${hour}:${min}]`;
    if (message.type === SYSTEM_CHAT_TYPE) {
      return `${hourMin} ${message.message}`;
    }
    const userName = message.sender === PUBLIC_CHAT_USER_ID
      ? ''
      : `${getUser(message.sender).name} :`;
    return `${hourMin} ${userName} ${htmlDecode(message.message)}`;
  }).join('\n');
};

const getAllMessages = (chatID) => {
  const filter = {
    sender: { $ne: Auth.userID },
  };
  if (chatID === PUBLIC_GROUP_CHAT_ID) {
    filter.chatId = { $eq: chatID };
  } else {
    const privateChat = GroupChat.findOne({ users: { $all: [chatID, Auth.userID] } });

    filter.chatId = { $ne: PUBLIC_GROUP_CHAT_ID };

    if (privateChat) {
      filter.chatId = privateChat.chatId;
    }
  }
  const messages = GroupChatMsg.find(filter).fetch();
  return messages;
};

const maxTimestampReducer = (max, el) => ((el.timestamp > max) ? el.timestamp : max);

const maxNumberReducer = (max, el) => ((el > max) ? el : max);

const getLastMessageTimestampFromChatList = activeChats => activeChats
  .map(chat => ((chat.userId === 'public') ? 'MAIN-PUBLIC-GROUP-CHAT' : chat.userId))
  .map(chatId => getAllMessages(chatId).reduce(maxTimestampReducer, 0))
  .reduce(maxNumberReducer, 0);

export default {
  reduceAndMapGroupMessages,
  getPublicGroupMessages,
  getPrivateGroupMessages,
  getUser,
  getWelcomeProp,
  getScrollPosition,
  hasUnreadMessages,
  lastReadMessageTime,
  isChatLocked,
  updateScrollPosition,
  updateUnreadMessage,
  sendGroupMessage,
  closePrivateChat,
  removeFromClosedChatsSession,
  exportChat,
  clearPublicChatHistory,
  maxTimestampReducer,
  getLastMessageTimestampFromChatList,
  UnsentMessagesCollection,
};
