import React, { Fragment, PureComponent } from 'react';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom';
import Dropdown from '/imports/ui/components/dropdown/component';
import DropdownTrigger from '/imports/ui/components/dropdown/trigger/component';
import DropdownContent from '/imports/ui/components/dropdown/content/component';
import DropdownList from '/imports/ui/components/dropdown/list/component';
import DropdownListItem from '/imports/ui/components/dropdown/list/item/component';
import lockContextContainer from '/imports/ui/components/lock-viewers/context/container'
import ChatFileUploaded from '../chat-file/component';;

import _ from 'lodash';
import { Session } from 'meteor/session';
import { styles } from './styles';


const propTypes = {
  //getScrollContainerRef: PropTypes.func.isRequired,
};
const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

class MessageDropdown extends PureComponent {
  /**
   * Return true if the content fit on the screen, false otherwise.
   *
   * @param {number} contentOffSetTop
   * @param {number} contentOffsetHeight
   * @return True if the content fit on the screen, false otherwise.
   */
  static checkIfDropdownIsVisible(contentOffSetTop, contentOffsetHeight, scrollTop) {
    // return (contentOffSetTop + contentOffsetHeight) < window.innerHeight;
    console.log("contentOffSetTop" , contentOffSetTop);
    console.log("our height" , contentOffsetHeight);
    console.log("window height" , window.innerHeight);
    console.log("scrollAreaInnerHeight" , scrollTop);
    
    return (scrollTop) > 0;
  }

  constructor(props) {
    super(props);

    this.state = {
      isActionsOpen: false,
      dropdownOffset: 0,
      dropdownDirection: 'top',
      dropdownVisible: false,
      showNestedOptions: false,
    };

    this.handleScroll = this.handleScroll.bind(this);
    this.onActionsShow = this.onActionsShow.bind(this);
    this.onActionsHide = this.onActionsHide.bind(this);
    this.getDropdownMenuParent = this.getDropdownMenuParent.bind(this);
    this.resetMenuState = this.resetMenuState.bind(this);
    this.renderMenuItems = this.renderMenuItems.bind(this);
  }


  componentWillMount() {
    this.title = _.uniqueId('dropdown-title-');
    this.seperator = _.uniqueId('action-separator-');
  }

  componentDidUpdate() {
    this.checkDropdownDirection();
  }

  onActionsShow() {
    Session.set('dropdownOpen', true);
    const { scrollArea } = this.props;
    const dropdown = this.getDropdownMenuParent();
    const scrollContainer = scrollArea;
    
    if (dropdown && scrollContainer) {
      const dropdownTrigger = dropdown.children[0];
      console.log("dropdownTrigger is found" );
      this.setState({
        isActionsOpen: true,
        dropdownVisible: false,
        // dropdownOffset: dropdownTrigger.offsetTop - scrollContainer.scrollTop,  
        dropdownOffset: dropdownTrigger.offsetTop - 150, 
        dropdownDirection: 'top',
      });

      scrollContainer.addEventListener('scroll', this.handleScroll, false);
    }
  }

  onActionsHide(callback) {
    const { scrollArea } = this.props;

    this.setState({
      isActionsOpen: false,
      dropdownVisible: false,
      showNestedOptions: false,
    });

    const scrollContainer = scrollArea;
    scrollContainer.removeEventListener('scroll', this.handleScroll, false);

    if (callback) {
      return callback;
    }

    return Session.set('dropdownOpen', false);
  }



  getDropdownMenuParent() {
    return findDOMNode(this.dropdown);
  }


  resetMenuState() {
    return this.setState({
      isActionsOpen: false,
      dropdownOffset: 0,
      dropdownDirection: 'top',
      dropdownVisible: false,
      showNestedOptions: false,
    });
  }


  handleScroll() {
    this.setState({
      isActionsOpen: false,
      showNestedOptions: false,
    });
  }

  /**
   * Check if the dropdown is visible, if so, check if should be draw on top or bottom direction.
   */
  checkDropdownDirection() {
    const { scrollArea } = this.props;
    if (this.isDropdownActivedByUser()) {
      const dropdown = this.getDropdownMenuParent();
      const dropdownTrigger = dropdown.children[0];

      const scrollContainer = scrollArea;

      const nextState = {
        dropdownVisible: true,
      };

      const isDropdownVisible = MessageDropdown.checkIfDropdownIsVisible(
        dropdownTrigger.offsetTop,
        dropdownTrigger.offsetHeight,
        scrollArea.scrollTop
      );

      if (!isDropdownVisible) {
        // const offsetPageTop = (offsetTop + offsetHeight) - scrollContainer.scrollTop;
        // nextState.dropdownOffset = window.innerHeight - offsetPageTop;
        nextState.dropdownOffset = dropdownTrigger.offsetTop -150;
        nextState.dropdownDirection = 'bottom';
      }

      this.setState(nextState);
    }
  }

  /**
  * Check if the dropdown is visible and is opened by the user
  *
  * @return True if is visible and opened by the user
  */
  isDropdownActivedByUser() {
    const { isActionsOpen, dropdownVisible } = this.state;

    return isActionsOpen && !dropdownVisible;
  }

  

  render() {

    const {text, file, userid, className, targetMeetings} = this.props;

    const {
      isActionsOpen,
      dropdownVisible,
      dropdownDirection,
      dropdownOffset
    } = this.state;

    const userItemContentsStyle = {};

    userItemContentsStyle[styles.dropdown] = true;
    userItemContentsStyle[styles.userListItem] = !isActionsOpen;
    userItemContentsStyle[styles.usertListItemWithMenu] = isActionsOpen;

      if(targetMeetings && targetMeetings.length == 0){
        return(
          (file != null)
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
            )
        );
      }else{
      
        return (
        <Dropdown
              ref={(ref) => { this.dropdown = ref; }}
              keepOpen={isActionsOpen}        
              onShow={this.onActionsShow}
              onHide={this.onActionsHide}
              className={userItemContentsStyle}
              className={styles.dropdown}
              autoFocus={false}
              aria-haspopup="true"
              aria-live="assertive"
              aria-relevant="additions"
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
              style={{
                      visibility: dropdownVisible ? 'visible' : 'hidden',
                      // [dropdownDirection]: `${dropdownOffset}px`
                      left: `${dropdownOffset}px`
                  }}
                  // className={styles.dropdownContent}
                  // placement={`right ${dropdownDirection}`}
                  // placement={`top left`}
                  placement={`${dropdownDirection} left`}
                  
            >
              <DropdownList>
                {this.renderMenuItems()}
              </DropdownList>

            </DropdownContent>
            }
          </Dropdown>
       );
     }
    
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

makeDropdownListItem (meeting){
  const {getMessageObj, messageId, sendCrossGroupMsg, currentUser, isBreakoutMeeting} = this.props;
  const messageObj = getMessageObj(messageId);
  
  const senderGroupName = isBreakoutMeeting ? meeting.meetingName 
    : (
      currentUser.role == ROLE_MODERATOR ? 'Moderator' : null
    )

  return(
    <DropdownListItem
      key={this.meetingName}
      icon="application"
      label= {meeting.meetingName}
      onClick={() => {
        sendCrossGroupMsg(messageObj, meeting.meetingId, senderGroupName)
      }}
    />
  )
}
}

MessageDropdown.propTypes = propTypes;
export default lockContextContainer(MessageDropdown);
