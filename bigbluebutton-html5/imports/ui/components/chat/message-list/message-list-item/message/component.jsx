import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import fastdom from 'fastdom';
import ChatFileUploaded from '../chat-file/component';
import Dropdown from '/imports/ui/components/dropdown/component';
import DropdownTrigger from '/imports/ui/components/dropdown/trigger/component';
import DropdownContent from '/imports/ui/components/dropdown/content/component';
import DropdownList from '/imports/ui/components/dropdown/list/component';
import DropdownListItem from '/imports/ui/components/dropdown/list/item/component';
import styles from '../styles';

const propTypes = {
  text: PropTypes.string.isRequired,
  time: PropTypes.number.isRequired,
  lastReadMessageTime: PropTypes.number,
  handleReadMessage: PropTypes.func.isRequired,
  scrollArea: PropTypes.instanceOf(Element),
  className: PropTypes.string.isRequired,
};

const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

const defaultProps = {
  lastReadMessageTime: 0,
  scrollArea: undefined,
};

const eventsToBeBound = [
  'scroll',
  'resize',
];

const isElementInViewport = (el) => {
  if (!el) return false;
  const rect = el.getBoundingClientRect();

  return (
    rect.top >= 0
    && rect.left >= 0
    && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    && rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

export default class MessageListItem extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      isUserOptionsOpen: false,
    };
    this.meetingName = _.uniqueId('meeting-item-');

    this.onActionsShow = this.onActionsShow.bind(this);
    this.onActionsHide = this.onActionsHide.bind(this);
    this.renderMenuItems = this.renderMenuItems.bind(this);
    this.renderSharableOption = this.renderSharableOption.bind(this);

    this.ticking = false;

    this.handleMessageInViewport = _.debounce(this.handleMessageInViewport.bind(this), 50);
  }

  onActionsShow() {
    const {scrollArea} = this.props;
    this.setState({
      isUserOptionsOpen: true,
    });

    scrollArea.addEventListener('scroll', this.handleScroll, false);
  }

  onActionsHide() {
    this.setState({
      isUserOptionsOpen: false,
    });
  }

  handleScroll() {
    this.setState({
      isUserOptionsOpen: false,
    });
  }

  componentDidMount() {
    this.listenToUnreadMessages();
  }

  componentDidUpdate() {
    this.listenToUnreadMessages();
  }

  componentWillUnmount() {
    // This was added 3 years ago, but never worked. Leaving it around in case someone returns
    // and decides it needs to be fixed like the one in listenToUnreadMessages()
    // if (!lastReadMessageTime > time) {
    //  return;
    // }

    this.removeScrollListeners();
  }

  addScrollListeners() {
    const {
      scrollArea,
    } = this.props;

    if (scrollArea) {
      eventsToBeBound.forEach(
        e => scrollArea.addEventListener(e, this.handleMessageInViewport),
      );
    }
  }

  handleMessageInViewport() {
    if (!this.ticking) {
      fastdom.measure(() => {
        const node = this.text;
        const {
          handleReadMessage,
          time,
          lastReadMessageTime,
        } = this.props;

        if (lastReadMessageTime > time) {
          this.removeScrollListeners();
          return;
        }

        if (isElementInViewport(node)) {
          handleReadMessage(time);
          this.removeScrollListeners();
        }

        this.ticking = false;
      });
    }

    this.ticking = true;
  }

  removeScrollListeners() {
    const {
      scrollArea,
    } = this.props;

    if (scrollArea) {
      eventsToBeBound.forEach(
        e => scrollArea.removeEventListener(e, this.handleMessageInViewport),
      );
    }
  }

  // depending on whether the message is in viewport or not,
  // either read it or attach a listener
  listenToUnreadMessages() {
    const {
      handleReadMessage,
      time,
      lastReadMessageTime,
    } = this.props;

    if (lastReadMessageTime > time) {
      return;
    }

    const node = this.text;

    fastdom.measure(() => {
      const {
        lastReadMessageTime: updatedLastReadMessageTime,
      } = this.props;
      // this function is called after so we need to get the updated lastReadMessageTime

      if (updatedLastReadMessageTime > time) {
        return;
      }

      if (isElementInViewport(node)) { // no need to listen, the message is already in viewport
        handleReadMessage(time);
      } else {
        this.addScrollListeners();
      }
    });
  }

  makeDropdownListItem (meeting){
    const {getMessageObj, messageId, sendCrossGroupMsg, currentUser} = this.props;
    const messageObj = getMessageObj(messageId);
    
    return(
      <DropdownListItem
        key={this.meetingName}
        icon="application"
        label={meeting.meetingName}
        onClick={() => {
          sendCrossGroupMsg(messageObj, meeting.meetingId, currentUser.role == ROLE_MODERATOR ? 'Moderator' : meeting.meetingName)
        }}
      />
    )
  }

  renderMenuItems() {
    const {
      targetMeetings
    } = this.props;

    this.menuItems = _.compact([
      (<DropdownListItem
          label="Share message to "
        />
      ),
      // (<DropdownListSeparator key={_.uniqueId('list-separator-')} />)
    ])
    targetMeetings.map(meeting => {
      this.menuItems.push(this.makeDropdownListItem(meeting))
    })
    
    return this.menuItems;
  }

  renderSharableOption() {
    const { intl, text, file, userid, className, systemMessage, } = this.props;
    const { isUserOptionsOpen } = this.state;

    return ((systemMessage) ? 
      <p
        ref={(ref) => { this.text = ref; }}
        dangerouslySetInnerHTML={{ __html: text }}
        className={className}
      /> :
      (<div>
        <Dropdown
          ref={(ref) => { this.dropdown = ref; }}
          autoFocus={false}
          isOpen={isUserOptionsOpen}
          onShow={this.onActionsShow}
          onHide={this.onActionsHide}
          className={styles.dropdown}
        >
          <DropdownTrigger tabIndex={0}>
            {(file != null)
            ? (
              <div>
                <ChatFileUploaded
                  text={text}
                  file={file}
                  id={userid}
                />
              </div>
            )
            : (
              <p
                ref={(ref) => { this.text = ref; }}
                dangerouslySetInnerHTML={{ __html: text }}
                className={className}
              />
            )}
          </DropdownTrigger>
          <DropdownContent
            className={styles.dropdownContent}
            placement=""
          >
            <DropdownList>
              {
                this.renderMenuItems()
              }
            </DropdownList>
          </DropdownContent>
        </Dropdown>
      </div>)
    );
  }

  render() {
    return (
      this.renderSharableOption()
    );
  }
}

MessageListItem.propTypes = propTypes;
MessageListItem.defaultProps = defaultProps;
