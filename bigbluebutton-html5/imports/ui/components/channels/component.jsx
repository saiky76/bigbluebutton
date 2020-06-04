import React, { Fragment, PureComponent } from 'react';
import browser from 'browser-detect';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom';
import Assign from '/imports/ui/components/breakout-create-modal/assign-to-breakouts/container';
import { withModalMounter } from '/imports/ui/components/modal/service';
import BreakoutCreateModalContainer from '/imports/ui/components/breakout-create-modal/container';
import { defineMessages, injectIntl } from 'react-intl';
import _ from 'lodash';
import Button from '/imports/ui/components/button/component';
import { Session } from 'meteor/session';
import logger from '/imports/startup/client/logger';
import { styles } from './styles';
import Auth from '/imports/ui/services/auth';
import UserParticipantsContainer from '/imports/ui/components/user-list/user-list-content/user-participants/container';
import UserOptionsContainer from '/imports/ui/components/user-list/user-list-content/user-participants//user-options/container';
import { meetingIsBreakout } from '/imports/ui/components/app/service';
import Dropdown from '/imports/ui/components/dropdown/component';
import DropdownTrigger from '/imports/ui/components/dropdown/trigger/component';
import DropdownContent from '/imports/ui/components/dropdown/content/component';
import DropdownList from '/imports/ui/components/dropdown/list/component';
import DropdownListItem from '/imports/ui/components/dropdown/list/item/component';
import ChannelAvatar from './channelAvatar/component';
import ChannelDropdown from './dropdown/component';



const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

const intlMessages = defineMessages({
  breakoutTitle: {
    id: 'app.createBreakoutRoom.title',
    description: 'breakout title',
  },
  breakoutAriaTitle: {
    id: 'app.createBreakoutRoom.ariaTitle',
    description: 'breakout aria title',
  },
  breakoutDuration: {
    id: 'app.createBreakoutRoom.duration',
    description: 'breakout duration time',
  },
  breakoutRoom: {
    id: 'app.createBreakoutRoom.room',
    description: 'breakout room',
  },
  breakoutJoin: {
    id: 'app.createBreakoutRoom.join',
    description: 'label for join breakout room',
  },
  breakoutJoinAudio: {
    id: 'app.createBreakoutRoom.joinAudio',
    description: 'label for option to transfer audio',
  },
  breakoutReturnAudio: {
    id: 'app.createBreakoutRoom.returnAudio',
    description: 'label for option to return audio',
  },
  generatingURL: {
    id: 'app.createBreakoutRoom.generatingURL',
    description: 'label for generating breakout room url',
  },
  generatedURL: {
    id: 'app.createBreakoutRoom.generatedURL',
    description: 'label for generate breakout room url',
  },
  endAllBreakouts: {
    id: 'app.createBreakoutRoom.endAllBreakouts',
    description: 'Button label to end all breakout rooms',
  },
  alreadyConnected: {
    id: 'app.createBreakoutRoom.alreadyConnected',
    description: 'label for the user that is already connected to breakout room',
  },
});

class Channels extends PureComponent {

  static checkIfDropdownIsVisible(contentOffSetTop, contentOffsetHeight) {
    return (contentOffSetTop + contentOffsetHeight) < window.innerHeight;
  }
  static sortById(a, b) {
    if (a.userId > b.userId) {
      return 1;
    }

    if (a.userId < b.userId) {
      return -1;
    }

    return 0;
  }

  static sortUsersByName(a, b) {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    if (aName < bName) {
      return -1;
    } if (aName > bName) {
      return 1;
    }

    return 0;
  }

  constructor(props) {
    super(props);
    this.getBreakoutURL = this.getBreakoutURL.bind(this);
    this.renderBreakoutRooms = this.renderBreakoutRooms.bind(this);
    this.transferUserToBreakoutRoom = this.transferUserToBreakoutRoom.bind(this);
    this.renderUserActions = this.renderUserActions.bind(this);
    this.returnBackToMeeeting = this.returnBackToMeeeting.bind(this);
    this.getScrollContainerRef = this.getScrollContainerRef.bind(this);
    this.onActionsShow = this.onActionsShow.bind(this);
    this.onActionsHide = this.onActionsHide.bind(this);
    this.newCreateBreakouts = this.newCreateBreakouts.bind(this);
    this.editBreakoutRoom = this.editBreakoutRoom.bind(this);
    this.state = {
      requestedBreakoutId: '',
      waiting: false,
      joinedAudioOnly: false,
      breakoutId: '',
      breakOutWindowRefs: new Map(),
      hideUsers: true,
      isChannelOptionsOpen: false,
      channelId: '',
      dropdownVisible: false,
    };
  }

  componentDidMount() {
    const { compact } = this.props;
    if (!compact) {
      this.refScrollContainer.addEventListener(
        'keydown',
        this.rove,
      );
    }
  }

  componentWillUnmount() {
    this.refScrollContainer.removeEventListener('keydown', this.rove);
  }

  getDropdownMenuParent() {
    return findDOMNode(this.dropdown);
  }

  isDropdownActivedByUser() {
    const { isChannelOptionsOpen, dropdownVisible } = this.state;

    return isChannelOptionsOpen && !dropdownVisible;
  }

  checkDropdownDirection() {
    if (this.isDropdownActivedByUser()) {
      const dropdown = this.getDropdownMenuParent();
      const dropdownTrigger = dropdown.children[0];
      const dropdownContent = dropdown.children[1];

      const scrollContainer = this.getScrollContainerRef();

      const nextState = {
        dropdownVisible: true,
      };

      const isDropdownVisible = Channels.checkIfDropdownIsVisible(
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

  onActionsShow() {
    Session.set('dropdownOpen', true);
    const dropdown = this.getDropdownMenuParent();
    const scrollContainer = this.getScrollContainerRef();

    if (dropdown && scrollContainer) {
      this.resetMenuState();
      const dropdownTrigger = dropdown.children[0];
      const list = findDOMNode(this.list);
      const children = [].slice.call(list.children);
      children.find(child => child.getAttribute('role') === 'menuitem').focus();

      this.setState({
        isChannelOptionsOpen: true,
        dropdownVisible: false,
        dropdownOffset: dropdownTrigger.offsetTop - scrollContainer.scrollTop,
        dropdownDirection: 'top',
      });

      scrollContainer.addEventListener('scroll', this.handleScroll, false);
    }
  }

  onActionsHide(callback) {
    this.setState({
      isChannelOptionsOpen: false,
      dropdownVisible: false,
    });

    const scrollContainer = this.getScrollContainerRef();
    scrollContainer.removeEventListener('scroll', this.handleScroll, false);

    if (callback) {
      return callback;
    }

    return Session.set('dropdownOpen', false);
  }

  resetMenuState() {
    return this.setState({
      isChannelOptionsOpen: false,
      dropdownOffset: 0,
      dropdownDirection: 'top',
      dropdownVisible: false,
    });
  }

  handleScroll() {
    this.setState({
      isChannelOptionsOpen: false,
    });
  }

  getScrollContainerRef() {
    return this.refScrollContainer;
  }

  componentDidUpdate() {
    const {
      breakoutRoomUser,
      breakoutRooms,
      closeBreakoutPanel,
    } = this.props;

    const {
      waiting,
      requestedBreakoutId,
    } = this.state;
    this.checkDropdownDirection();

    if (breakoutRooms.length <= 0) closeBreakoutPanel();

    if (waiting) {
      const breakoutUser = breakoutRoomUser(requestedBreakoutId);

      if (!breakoutUser) return;
      if (breakoutUser.redirectToHtml5JoinURL !== '') {
        window.open(breakoutUser.redirectToHtml5JoinURL, '_blank');
        _.delay(() => this.setState({ waiting: false }), 1000);
      }
    }
  }

  getBreakoutChannelJoinURL(breakoutId) {
    const hasUser = breakoutRoomUser(breakoutId);
    if (hasUser) { return redirectToHtml5JoinURL; }
    return null;
  }




  getBreakoutURL(breakoutId) {
    Session.set('lastBreakoutOpened', breakoutId);
    const { requestJoinURL, breakoutRoomUser } = this.props;
    const { waiting } = this.state;


    const hasUser = breakoutRoomUser(breakoutId);
    if (!hasUser && !waiting) {
      this.setState(
        {
          waiting: true,
          requestedBreakoutId: breakoutId,
        },
        () => requestJoinURL(breakoutId),
      );
    }


    if (hasUser && (breakOutWindowRefs.get(breakoutId) == null || breakOutWindowRefs.get(breakoutId).closed)) {
      const windowRef = window.open(hasUser.redirectToHtml5JoinURL, '_blank');

      // TODO:  Validate if this a deep copy or plain shallow
      let updatedWindowMap = new Map(breakOutWindowRefs);

      updatedWindowMap = updatedWindowMap.set(breakoutId, windowRef);
      console.log(`ref map size${updatedWindowMap.size}`);
      this.setState(
        {
          waiting: false,
          breakOutWindowRefs: updatedWindowMap,
        },
      );
    }
    return null;
  }

  transferUserToBreakoutRoom(breakoutId) {
    const { transferToBreakout } = this.props;
    transferToBreakout(breakoutId);
    this.setState({ joinedAudioOnly: true, breakoutId });
  }

  returnBackToMeeeting(breakoutId) {
    const { transferUserToMeeting, meetingId } = this.props;
    transferUserToMeeting(breakoutId, meetingId);
    this.setState({ joinedAudioOnly: false, breakoutId });
  }

  channelOptions(breakout) {
    const { isChannelOptionsOpen, dropdownDirection, dropdownOffset } = this.state;
    console.log(dropdownOffset);
    
    return (
      <Dropdown
        ref={(ref) => { this.dropdown = ref; }}
        autoFocus={false}
        isOpen={isChannelOptionsOpen}
        onShow={this.onActionsShow}
        onHide={this.onActionsHide}
        className={styles.dropdown}
      >
        <DropdownTrigger tabIndex={0}>
          <Button
            label={breakout.name}
            icon="more"
            color="default"
            hideLabel
            className={styles.optionsButton}
            size="sm"
            onClick={() => null}
          />
        </DropdownTrigger>
        <DropdownContent
          style={{
            //dropdownOffset need to be set properly
            [dropdownDirection]: `${dropdownOffset}px`,
          }}
          className={styles.dropdownContent}
          placement={`right ${dropdownDirection}`}
        >
          <DropdownList
            ref={(ref) => { this.list = ref; }}
            getDropdownMenuParent={this.getDropdownMenuParent}
            onActionsHide={this.onActionsHide}
          >
            {
              this.renderMenuItems(breakout)
            }
          </DropdownList>
        </DropdownContent>
      </Dropdown>
    );
  }


  newCreateBreakouts() {
    const { mountModal } = this.props;
    return mountModal(<BreakoutCreateModalContainer />);
  }

  render() {
    const {
      intl,
      currentUser,
      users,
      compact,
      setEmojiStatus,
      roving,
      requestUserInformation,
      currentMeeting,
      isThereUnassignedUsers
    } = this.props;

    logger.info(`auth Id: ${Auth.meetingID}`);

    const { channelId, hideUsers } = this.state;
    const isBreakOutMeeting = meetingIsBreakout();
    const isModerator = currentUser.role === ROLE_MODERATOR;
    const otherUsers = isModerator ? "Unassigned" : "Learning group";
    const scrollContainer = this.getScrollContainerRef();

    return (

      <div className={styles.channelListColumn}>

        <div className={styles.container}>
          <div className={styles.buttonWrapper}>
            <Button
              className={styles.master}
              icon="icomoon-Master-Channel"
              // label="master channel"
              // hideLabel
            />
            <div className={styles.masterChannel}>
              {isBreakOutMeeting ? 
                (currentMeeting.meetingProp.name)
                : "Master Channel"
              }
            </div>
          </div>
          {currentUser.role === ROLE_MODERATOR
            ? (
              <UserOptionsContainer {...{
                users,
                setEmojiStatus,
                meetingIsBreakout: isBreakOutMeeting,
              }}
              />
            ) : null
          }
        </div>

        <div
          className={styles.scrollableList}
          tabIndex={0}
          ref={(ref) => { this.refScrollContainer = ref; }}
        >
          <div className={styles.channelList}>
            
            {!isBreakOutMeeting && isModerator
              ? (
                <div 
                  className={styles.createBreakouts}
                  onClick={this.newCreateBreakouts}
                  role="button"
                  cursor="pointer"
                >
                  <span>+New Breakout Channel</span>
                </div>
              )
              : null }
            
            {isBreakOutMeeting || !isThereUnassignedUsers ? null
              : (
                <Fragment>
                  <div className={styles.contentWrapper}>
                    {this.renderChannelAvatar(otherUsers)}
                  <span className={styles.unassigned}>{otherUsers}</span>
                  </div>
                  <div className={styles.usersList}>
                    <UserParticipantsContainer
                      {...{
                        compact,
                        intl,
                        currentUser,
                        setEmojiStatus,
                        roving,
                        requestUserInformation,
                        meetingIdentifier: Auth.meetingID,
                        getScrollContainerRef: scrollContainer,
                      }}
                    />
                  </div>
                </Fragment>
              )
            }
            {/* {isMobileBrowser ? this.renderMobile() : this.renderDesktop()} */}
            {this.renderBreakoutRooms()}

          {isBreakOutMeeting ? null :
          <div>
            <div className={styles.contentWrapper}>
              {this.renderChannelAvatar("Moderator")}
              <div className={styles.moderator}>Moderator(s)</div>
            </div>
            <div className={styles.allModerators}>
              <UserParticipantsContainer
                {...{
                  compact,
                  intl,
                  currentUser,
                  setEmojiStatus,
                  roving,
                  requestUserInformation,
                  meetingIdentifier: Auth.meetingID,
                  onlyModerators: true,
                  getScrollContainerRef: scrollContainer,
                }}
              />
            </div>
          </div>
          }

          </div>
        </div>

      </div>
    );
  }
  renderChannelAvatar(channelName) {
    const roomIcon = channelName.toLowerCase().slice(0, 2);

    return (
      <ChannelAvatar className={styles.channelAvatar}>
        {roomIcon}
      </ChannelAvatar>
    );
  }

  renderBreakoutRooms() {
    const {
      breakoutRooms,
      intl,
      exitAudio,
      compact,
      currentUser,
      setEmojiStatus,
      roving,
      requestUserInformation,
      isbreakoutRoomUser,
      normalizeEmojiName,          
      user,
      voiceUser,
      amIModerator,
      isMeteorConnected,
      mountModal,
      breakoutRoomUser,
      requestJoinURL,
      isUserActiveInBreakoutroom

    } = this.props;

    const isBreakOutMeeting = meetingIsBreakout();
    const scrollContainer = this.getScrollContainerRef();
    return (
      breakoutRooms.map(breakout => (
        
        <div>

          {isBreakOutMeeting ? null :
           <ChannelDropdown
        {...{
          breakout,   
          getScrollContainerRef:this.getScrollContainerRef,
          voiceUser,
          amIModerator,
          isMeteorConnected,
          exitAudio,
          isBreakOutMeeting, 
          mountModal,
          breakoutRoomUser,
          requestJoinURL,
          isUserActiveInBreakoutroom
        }}
      />
        }
  

    <div className={styles.breakoutUsersList}>
    <UserParticipantsContainer
      {...{
        compact,
        intl,
        currentUser,
        setEmojiStatus,
        roving,
        requestUserInformation,
        meetingIdentifier: breakout.breakoutId,
        isbreakoutRoomUser,
        getScrollContainerRef: scrollContainer,
      }}
    />
    </div>
    </div>
       

  )));
  }

  editBreakoutRoom(breakoutId, usersToRemove, usersToAdd) {
    const {
      sendInvitation,
      removeUser,
      currentUser,
      getBreakoutMeetingUserId,
    } = this.props;

    // The userIds here are from the parent meeting. We need to get the corresponding user from the
    // break out room.
    usersToRemove.map((user) => {
      const breakoutUser = getBreakoutMeetingUserId(user.email, user.name, breakoutId);
      if (breakoutUser != null && breakoutUser != undefined) {
        console.log(`Removing user to channel: ${breakoutUser.userId}`);
        removeUser(breakoutUser.userId, breakoutId);
      }
    });

    usersToAdd.map((user) => {
      if (user.userId != currentUser.userId) {
        console.log(`Adding user to channel: ${user}`);
        sendInvitation(breakoutId, user.userId);
      }
    });
  }

  renderUserActions(breakoutId, joinedUsers, number) {
    const {
      isMicrophoneUser,
      amIModerator,
      intl,
      isUserInBreakoutRoom,
      exitAudio,
    } = this.props;

    const {
      joinedAudioOnly,
      breakoutId: stateBreakoutId,
      requestedBreakoutId,
      waiting,
    } = this.state;

    const moderatorJoinedAudio = isMicrophoneUser && amIModerator;
    const disable = waiting && requestedBreakoutId !== breakoutId;
    const audioAction = joinedAudioOnly
      ? () => {
        this.returnBackToMeeeting(breakoutId);
        return logger.debug({
          logCode: 'breakoutroom_return_main_audio',
          extraInfo: { logType: 'user_action' },
        }, 'Returning to main audio (breakout room audio closed)');
      }
      : () => {
        this.transferUserToBreakoutRoom(breakoutId);
        return logger.debug({
          logCode: 'breakoutroom_join_audio_from_main_room',
          extraInfo: { logType: 'user_action' },
        }, 'joining breakout room audio (main room audio closed)');
      };
    return (
      <div className={styles.breakoutActions}>
        {isUserInBreakoutRoom(joinedUsers)
          ? (
            <span className={styles.alreadyConnected}>
              {intl.formatMessage(intlMessages.alreadyConnected)}
            </span>
          )
          : (
            <Button
              label={intl.formatMessage(intlMessages.breakoutJoin)}
              aria-label={`${intl.formatMessage(intlMessages.breakoutJoin)} ${number}`}
              onClick={() => {
                this.getBreakoutURL(breakoutId);
                exitAudio();
                logger.debug({
                  logCode: 'breakoutroom_join',
                  extraInfo: { logType: 'user_action' },
                }, 'joining breakout room closed audio in the main room');
              }
              }
              disabled={disable}
              className={styles.joinButton}
            />
          )
        }
        {
          moderatorJoinedAudio
            ? [
              ('|'),
              (
                <Button
                  label={
                    moderatorJoinedAudio
                      && stateBreakoutId === breakoutId
                      && joinedAudioOnly
                      ? intl.formatMessage(intlMessages.breakoutReturnAudio)
                      : intl.formatMessage(intlMessages.breakoutJoinAudio)
                  }
                  className={styles.button}
                  key={`join-audio-${breakoutId}`}
                  onClick={audioAction}
                />
              ),
            ]
            : null
        }
      </div>
    );
  }
}
//Channels.propTypes = PropTypes;
export default withModalMounter(injectIntl(Channels));
