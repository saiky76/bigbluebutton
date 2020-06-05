import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedTime, defineMessages, injectIntl } from 'react-intl';
import _ from 'lodash';
import Auth from '/imports/ui/services/auth';
import UserAvatar from '/imports/ui/components/user-avatar/component';
import MessageContainer from './message/container';

import { styles } from './styles';

const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

const propTypes = {
  user: PropTypes.shape({
    color: PropTypes.string,
    isModerator: PropTypes.bool,
    isOnline: PropTypes.bool,
    name: PropTypes.string,
  }),
  messages: PropTypes.arrayOf(Object).isRequired,
  time: PropTypes.number.isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  scrollArea: PropTypes.instanceOf(Element),
  chatAreaId: PropTypes.string.isRequired,
  handleReadMessage: PropTypes.func.isRequired,
  lastReadMessageTime: PropTypes.number,
};

const defaultProps = {
  user: null,
  scrollArea: null,
  lastReadMessageTime: 0,
};

const intlMessages = defineMessages({
  offline: {
    id: 'app.chat.offline',
    description: 'Offline',
  },
});

class MessageListItem extends Component {
  shouldComponentUpdate(nextProps) {
    const {
      scrollArea,
      messages,
      user,
    } = this.props;

    const {
      scrollArea: nextScrollArea,
      messages: nextMessages,
      user: nextUser,
    } = nextProps;

    if (!scrollArea && nextScrollArea) return true;

    const hasNewMessage = messages.length !== nextMessages.length;
    const hasUserChanged = user && nextUser
      && (user.isModerator !== nextUser.isModerator || user.isOnline !== nextUser.isOnline);

    return hasNewMessage || hasUserChanged;
  }

  renderSystemMessage() {
    const {
      messages,
      chatAreaId,
      handleReadMessage,
    } = this.props;

    return (
      <div>
        {messages.map(message => (
          message.text !== ''
            ? (
              <MessageContainer
                className={(message.id ? styles.systemMessage : null)}
                key={_.uniqueId('id-')}
                text={message.text}
                time={message.time}
                chatAreaId={chatAreaId}
                handleReadMessage={handleReadMessage}
                systemMessage={true}
              />
            ) : null
        ))}
      </div>
    );
  }

  render() {
    let {
      user,
      messages,
      time,
      chatAreaId,
      lastReadMessageTime,
      handleReadMessage,
      scrollArea,
      intl,
      isBreakoutMeeting,
      senderEmail,
      senderGroup,
      currentUser
    } = this.props;

    const dateTime = new Date(time);
    let moderator = {
      userId: 'Moderator',
      color: 'rgb(48, 63, 159)',
      isModerator: true,
      isOnline: true,
      name: 'Moderator',
    }
    const regEx = /<a[^>]+>/i;

    if (!user) {
      if((messages[0].color) == undefined){
        return this.renderSystemMessage();
      }
      else{
        user = moderator;
      }
    }
    const groupName = user.isModerator ? "Moderator" : senderGroup;

    return (
      <div>
        {' '}
        {(senderEmail !== currentUser.email) ? (
          <div className={styles.item}>
            <div className={styles.wrapperleft} ref={(ref) => { this.item = ref; }}>
              <div className={styles.avatarWrapper}>
                <UserAvatar
                  className={styles.avatar}
                  color={user.color}
                  moderator={user.isModerator}
                >
                  {user.name.toLowerCase().slice(0, 2)}
                </UserAvatar>
              </div>
              <div className={styles.contentleft}>
                <div className={styles.metaleft}>
                  <div className={user.isOnline ? styles.names : styles.logout}>
                    <span className={styles.name}>{user.name}</span>
                    {(isBreakoutMeeting) ?
                      null
                    : (groupName ? 
                        <span>{"("}{groupName}{")"}</span>
                        : null
                      )
                    
                    }
                    {user.isOnline
                      ? null
                      : (
                        <span className={styles.offline}>
                          {`(${intl.formatMessage(intlMessages.offline)})`}
                        </span>
                      )}
                  </div>
                  <time className={styles.timeleft} dateTime={dateTime}>
                    <FormattedTime value={dateTime} />
                  </time>
                </div>
                <div className={styles.messagesleft}>
                  {messages.map(message => (
                    <MessageContainer
                      className={styles.messageleft}
                      key={message.id}
                      messageId={message.id}
                      text={message.text}
                      time={message.time}
                      file={message.fileData}
                      userid={user.userId}
                      color={message.color}
                      chatAreaId={chatAreaId}
                      lastReadMessageTime={lastReadMessageTime}
                      handleReadMessage={handleReadMessage}
                      scrollArea={scrollArea}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
          : (
            <div className={styles.item}>
              <div className={styles.wrapperright} ref={(ref) => { this.item = ref; }}>
                <div className={styles.contentright}>
                  <div className={styles.metaright}>
                    <time className={styles.timeright} dateTime={dateTime}>
                      <FormattedTime value={dateTime} />
                    </time>
                  </div>
                  <div className={styles.messagesright}>
                    {messages.map(message => (
                      <MessageContainer
                        className={styles.messageright}
                        key={message.id}
                        messageId={message.id}
                        text={message.text}
                        time={message.time}
                        file={message.fileData}
                        userid={user.userId}
                        color={message.color}
                        chatAreaId={chatAreaId}
                        lastReadMessageTime={lastReadMessageTime}
                        handleReadMessage={handleReadMessage}
                        scrollArea={scrollArea}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </div>
    );
  }
}

MessageListItem.propTypes = propTypes;
MessageListItem.defaultProps = defaultProps;

export default injectIntl(MessageListItem);
