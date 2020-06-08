import React, { PureComponent } from 'react';
import { defineMessages, injectIntl, intlShape } from 'react-intl';
import cx from 'classnames';
import browser from 'browser-detect';
import PropTypes from 'prop-types';
import TextareaAutosize from 'react-autosize-textarea/lib';
import TypingIndicatorContainer from './typing-indicator/container';
import { styles } from './styles.scss';
import Button from '../../button/component';
import ChatFileUploaderContainer from './chat-file-drop/container';
import { withModalMounter } from '/imports/ui/components/modal/service';

const propTypes = {
  intl: intlShape.isRequired,
  chatId: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  minMessageLength: PropTypes.number.isRequired,
  maxMessageLength: PropTypes.number.isRequired,
  chatTitle: PropTypes.string.isRequired,
  chatName: PropTypes.string.isRequired,
  className: PropTypes.string,
  chatAreaId: PropTypes.string.isRequired,
  handleSendMessage: PropTypes.func.isRequired,
  UnsentMessagesCollection: PropTypes.objectOf(Object).isRequired,
  connected: PropTypes.bool.isRequired,
  locked: PropTypes.bool.isRequired,
  partnerIsLoggedOut: PropTypes.bool.isRequired,
  stopUserTyping: PropTypes.func.isRequired,
  startUserTyping: PropTypes.func.isRequired,
  mountModal: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
};

const messages = defineMessages({
  submitLabel: {
    id: 'app.chat.submitLabel',
    description: 'Chat submit button label',
  },
  inputLabel: {
    id: 'app.chat.inputLabel',
    description: 'Chat message input label',
  },
  inputPlaceholder: {
    id: 'app.chat.inputPlaceholder',
    description: 'Chat message input placeholder',
  },
  errorMinMessageLength: {
    id: 'app.chat.errorMinMessageLength',
  },
  errorMaxMessageLength: {
    id: 'app.chat.errorMaxMessageLength',
  },
  errorServerDisconnected: {
    id: 'app.chat.disconnected',
  },
  errorChatLocked: {
    id: 'app.chat.locked',
  },
  singularTyping: {
    id: 'app.chat.singularTyping',
    description: 'used to indicate when 1 user is typing',
  },
  pluralTyping: {
    id: 'app.chat.pluralTyping',
    description: 'used to indicate when multiple user are typing',
  },
  severalPeople: {
    id: 'app.chat.severalPeople',
    description: 'displayed when 4 or more users are typing',
  },
});

const CHAT_ENABLED = Meteor.settings.public.chat.enabled;

class MessageForm extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      message: '',
      error: null,
      hasErrors: false,
    };

    this.BROWSER_RESULTS = browser();

    this.handleMessageChange = this.handleMessageChange.bind(this);
    this.handleMessageKeyDown = this.handleMessageKeyDown.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.renderChatModal = this.renderChatModal.bind(this);
    this.setMessageHint = this.setMessageHint.bind(this);
  }

  componentDidMount() {
    const { mobile } = this.BROWSER_RESULTS;
    this.setMessageState();
    this.setMessageHint();

    if (!mobile) {
      if (this.textarea) this.textarea.focus();
    }
  }

  componentDidUpdate(prevProps) {
    const {
      chatId,
      connected,
      locked,
      partnerIsLoggedOut,
    } = this.props;
    const { message } = this.state;
    const { mobile } = this.BROWSER_RESULTS;

    if (prevProps.chatId !== chatId && !mobile) {
      if (this.textarea) this.textarea.focus();
    }

    if (prevProps.chatId !== chatId) {
      this.updateUnsentMessagesCollection(prevProps.chatId, message);
      this.setState(
        {
          error: null,
          hasErrors: false,
        }, this.setMessageState(),
      );
    }

    if (
      connected !== prevProps.connected
      || locked !== prevProps.locked
      || partnerIsLoggedOut !== prevProps.partnerIsLoggedOut
    ) {
      this.setMessageHint();
    }
  }

  componentWillUnmount() {
    const { chatId } = this.props;
    const { message } = this.state;
    this.updateUnsentMessagesCollection(chatId, message);
    this.setMessageState();
  }

  setMessageHint() {
    const {
      connected,
      disabled,
      intl,
      locked,
      partnerIsLoggedOut,
    } = this.props;

    let chatDisabledHint = null;

    if (disabled && !partnerIsLoggedOut) {
      if (connected) {
        if (locked) {
          chatDisabledHint = messages.errorChatLocked;
        }
      } else {
        chatDisabledHint = messages.errorServerDisconnected;
      }
    }

    this.setState({
      hasErrors: disabled,
      error: chatDisabledHint ? intl.formatMessage(chatDisabledHint) : null,
    });
  }

  setMessageState() {
    const { chatId, UnsentMessagesCollection } = this.props;
    const unsentMessageByChat = UnsentMessagesCollection.findOne({ chatId },
      { fields: { message: 1 } });
    this.setState({ message: unsentMessageByChat ? unsentMessageByChat.message : '' });
  }

  updateUnsentMessagesCollection(chatId, message) {
    const { UnsentMessagesCollection } = this.props;
    UnsentMessagesCollection.upsert(
      { chatId },
      { $set: { message } },
    );
  }

  handleMessageKeyDown(e) {
    // TODO Prevent send message pressing enter on mobile and/or virtual keyboard
    if (e.keyCode === 13 && !e.shiftKey) {
      e.preventDefault();

      const event = new Event('submit', {
        bubbles: true,
        cancelable: true,
      });

      this.form.dispatchEvent(event);
    }
  }

  handleMessageChange(e) {
    const {
      intl,
      startUserTyping,
      maxMessageLength,
      chatId,
    } = this.props;

    const message = e.target.value;
    let error = null;

    if (message.length > maxMessageLength) {
      error = intl.formatMessage(
        messages.errorMaxMessageLength,
        { 0: message.length - maxMessageLength },
      );
    }

    const handleUserTyping = () => {
      if (error) return;
      startUserTyping(chatId);
    };

    this.setState({
      message,
      error,
    }, handleUserTyping);
  }

  handleSubmit(e) {
    e.preventDefault();

    const {
      intl,
      disabled,
      minMessageLength,
      maxMessageLength,
      handleSendMessage,
      stopUserTyping,
    } = this.props;
    const { message } = this.state;
    let msg = message.trim();

    if (message.length < minMessageLength) {
      this.setState({
        hasErrors: true,
        error: intl.formatMessage(
          messages.errorMinMessageLength,
          { 0: minMessageLength - message.length },
        ),
      });
    }

    if (disabled
      || msg.length === 0
      || msg.length > maxMessageLength) {
      this.setState({ hasErrors: true });
      return false;
    }

    // Sanitize. See: http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/

    const div = document.createElement('div');
    div.appendChild(document.createTextNode(msg));
    msg = div.innerHTML;

    return (
      handleSendMessage(msg),
      this.setState({
        message: '',
        hasErrors: false,
      }, stopUserTyping)
    );
  }

  renderChatModal() {
    const { mountModal, chatName } = this.props;
    return mountModal(
      <ChatFileUploaderContainer
        chatName={chatName}
      />,
    );
  }

  render() {
    const {
      intl,
      chatTitle,
      chatName,
      disabled,
      className,
      chatAreaId,
      RoomName,
    } = this.props;

    const { hasErrors, error, message } = this.state;

    return CHAT_ENABLED ? (
      <div className={styles.wrapper}>
        <form
          ref={(ref) => { this.form = ref; }}
          className={cx(className, styles.form)}
          onSubmit={this.handleSubmit}
        >
        <div className={styles.wrapper}>
          <TextareaAutosize
            className={styles.input}
            id="message-input"
            placeholder={intl.formatMessage(messages.inputPlaceholder, { 0: chatName=="Public Chat"?RoomName:chatName })}
            aria-controls={chatAreaId}
            aria-label={intl.formatMessage(messages.inputLabel, { 0: chatTitle })}
            aria-invalid={hasErrors ? 'true' : 'false'}
            aria-describedby={hasErrors ? 'message-input-error' : null}
            autoCorrect="off"
            autoComplete="off"
            spellCheck="true"
            disabled={disabled}
            value={message}
            onChange={this.handleMessageChange}
            onKeyDown={this.handleMessageKeyDown}
          />
          <Button
            hideLabel
            circle
            className={styles.sendButton}
            aria-label={intl.formatMessage(messages.submitLabel)}
            type="submit"
            disabled={disabled}
            label={intl.formatMessage(messages.submitLabel)}
            color="default"
            icon="send"
            size="lg"
            onClick={() => {}}
            data-test="sendMessageButton"
          />
        </div>
          <TypingIndicatorContainer {...{ error }} />
        </form>
        <Button
          hideLabel
          circle
          className={styles.attachFile}
          icon="icomoon-Attachment"
          size="lg"
          label="attachFile"
          onClick={() => this.renderChatModal()}
        />
      </div>
    ) : null;
  }
}

MessageForm.propTypes = propTypes;
MessageForm.defaultProps = defaultProps;

export default withModalMounter(injectIntl(MessageForm));
