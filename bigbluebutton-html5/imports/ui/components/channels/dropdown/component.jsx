import React, { Fragment, PureComponent } from 'react';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom';
import Dropdown from '/imports/ui/components/dropdown/component';
import DropdownTrigger from '/imports/ui/components/dropdown/trigger/component';
import DropdownContent from '/imports/ui/components/dropdown/content/component';
import DropdownList from '/imports/ui/components/dropdown/list/component';
import DropdownListItem from '/imports/ui/components/dropdown/list/item/component';
import lockContextContainer from '/imports/ui/components/lock-viewers/context/container';
import ChannelAvatar from './../channelAvatar/component';
import BreakoutEditModalContainer from '/imports/ui/components/breakout-edit-modal/container';
import Auth from '/imports/ui/services/auth';

import _ from 'lodash';
import { Session } from 'meteor/session';
import { styles } from './../styles';


const propTypes = {
  getScrollContainerRef: PropTypes.func.isRequired,
};
const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

class ChannelDropdown extends PureComponent {
  /**
   * Return true if the content fit on the screen, false otherwise.
   *
   * @param {number} contentOffSetTop
   * @param {number} contentOffsetHeight
   * @return True if the content fit on the screen, false otherwise.
   */
  static checkIfDropdownIsVisible(contentOffSetTop, contentOffsetHeight) {
    return (contentOffSetTop + contentOffsetHeight) < window.innerHeight;
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
    this.joinBreakoutRoom = this.joinBreakoutRoom.bind(this);
    this.launchEditRoom = this.launchEditRoom.bind(this);
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
    const { getScrollContainerRef } = this.props;
    const dropdown = this.getDropdownMenuParent();
    const scrollContainer = getScrollContainerRef();

    console.log("dropdown: ", dropdown);
    console.log("scrollContainer: ", scrollContainer);
    
    if (dropdown && scrollContainer) {
      const dropdownTrigger = dropdown.children[0];
      console.log("dropdownTrigger is found" );
      this.setState({
        isActionsOpen: true,
        dropdownVisible: false,
        dropdownOffset: dropdownTrigger.offsetTop - scrollContainer.scrollTop,        
        dropdownDirection: 'top',
      });

      scrollContainer.addEventListener('scroll', this.handleScroll, false);
    }
  }

  onActionsHide(callback) {
    const { getScrollContainerRef } = this.props;

    this.setState({
      isActionsOpen: false,
      dropdownVisible: false,
      showNestedOptions: false,
    });

    const scrollContainer = getScrollContainerRef();
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
    const { getScrollContainerRef } = this.props;
    if (this.isDropdownActivedByUser()) {
      const dropdown = this.getDropdownMenuParent();
      const dropdownTrigger = dropdown.children[0];
      const dropdownContent = dropdown.children[1];

      const scrollContainer = getScrollContainerRef();

      const nextState = {
        dropdownVisible: true,
      };

      const isDropdownVisible = ChannelDropdown.checkIfDropdownIsVisible(
        dropdownContent.offsetTop,
        dropdownContent.offsetHeight,
      );

      if (!isDropdownVisible) {
        const { offsetTop, offsetHeight } = dropdownTrigger;
        const offsetPageTop = (offsetTop + offsetHeight) - scrollContainer.scrollTop;

        nextState.dropdownOffset = window.innerHeight - offsetPageTop;
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

  
  renderMenuItems(breakout) {
    const {
      amIModerator,
      isMeteorConnected,
      getUsersByMeeting,
      getUsersNotAssigned,
      users,
      exitAudio,
      isBreakOutMeeting
    } = this.props;

    const {
      channelId,
    } = this.state;
    // const isBreakOutMeeting = meetingIsBreakout();

    this.menuItems = _.compact([
      (isMeteorConnected && !isBreakOutMeeting ? (
        <DropdownListItem
          key={this.clearStatusId}
          icon="application"
          label="Join Room"
          onClick={() => {
            this.joinBreakoutRoom(breakout.breakoutId);
            exitAudio();
          }}
        />) : null
      ),

      ((isMeteorConnected && amIModerator && !isBreakOutMeeting) ? (
        <DropdownListItem
          key={this.muteAllId}
          icon="rooms"
          label="Edit Room"
          onClick={() => {
            this.launchEditRoom(breakout.breakoutId, breakout.name);
          }}
        />) : null),

    

    ]);

    return this.menuItems;
  }
  
  launchEditRoom(breakoutId,name) {
    const { mountModal } = this.props;
    return mountModal(<BreakoutEditModalContainer breakoutId={breakoutId} name={name} />);
  }

  joinBreakoutRoom(breakoutId) {
    Session.set('lastBreakoutOpened', breakoutId);
    const { requestJoinURL, breakoutRoomUser, isUserActiveInBreakoutroom } = this.props;
    const { waiting } = this.state;

    const breakoutUser = breakoutRoomUser(breakoutId);
    if (!breakoutUser && !waiting) {
      // This should only be the case for a moderator in master channel
      console.log('Adding the users to assigned users in the backend');
      this.setState(
        {
          waiting: true,
          requestedBreakoutId: breakoutId,
        },
        () => requestJoinURL(breakoutId),
      );
    }
    // I am a break out room user and I am not active in it
    if (breakoutUser && !isUserActiveInBreakoutroom(Auth.userID)) {
      window.open(breakoutUser.redirectToHtml5JoinURL, '_blank');

      this.setState(
        {
          waiting: false,
        },
      );
    }
    return null;
  }




  renderChannelAvatar(channelName) {
    const roomIcon = channelName.toLowerCase().slice(0, 2);

    return (
      <ChannelAvatar className={styles.channelAvatar}>
        {roomIcon}
      </ChannelAvatar>
    );
  }

  render() {
    const {
     breakout
    } = this.props;

    const {
      isActionsOpen,
      dropdownVisible,
      dropdownDirection,
      dropdownOffset,
      showNestedOptions,
      isBreakOutMeeting
    } = this.state;

    const userItemContentsStyle = {};

    userItemContentsStyle[styles.dropdown] = true;
    userItemContentsStyle[styles.userListItem] = !isActionsOpen;
    userItemContentsStyle[styles.usertListItemWithMenu] = isActionsOpen;

    return (
          <Dropdown
            ref={(ref) => { this.dropdown = ref; }}
            keepOpen={true}        
            onShow={this.onActionsShow}
            onHide={this.onActionsHide}
            //className={userItemContentsStyle}
            className={styles.dropdown}
            autoFocus={false}
            aria-haspopup="true"
            aria-live="assertive"
            aria-relevant="additions"
          >
            <DropdownTrigger tabIndex={0}>
              {isBreakOutMeeting ? null :
              <div className={styles.channelName}>
                <div className={styles.channelWrapper} cursor="pointer"> 
                  {this.renderChannelAvatar(breakout.name)}
                <span className={styles.unassigned}>{breakout.name}</span>
              </div>
              </div>}
            </DropdownTrigger>

            <DropdownContent
                
                 placement= "bottom"
                // style={{
                //     visibility: dropdownVisible ? 'visible' : 'hidden',
                //     [dropdownDirection]: `${dropdownOffset}px`
                // }}
                // className={styles.dropdownContent}
                // placement={`right ${dropdownDirection}`}
                >
              <DropdownList>
                {
                   this.renderMenuItems(breakout)
                }
              </DropdownList>
            </DropdownContent>
          </Dropdown> 
    );
  }
}

ChannelDropdown.propTypes = propTypes;
export default lockContextContainer(ChannelDropdown);
