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
import ChannelAvatar from './channelAvatar/component';
import ChannelDropdown from './dropdown/component';
import ConfirmModal from '/imports/ui/components/confirm-modal/container';

const BROWSER_RESULTS = browser();
const isMobileBrowser = BROWSER_RESULTS.mobile || BROWSER_RESULTS.os.includes('Android');
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
    this.renderBreakoutRooms = this.renderBreakoutRooms.bind(this);
    this.transferUserToBreakoutRoom = this.transferUserToBreakoutRoom.bind(this);
    this.returnBackToMeeeting = this.returnBackToMeeeting.bind(this);
    this.getScrollContainerRef = this.getScrollContainerRef.bind(this);
    this.newCreateBreakouts = this.newCreateBreakouts.bind(this);
    this.editBreakoutRoom = this.editBreakoutRoom.bind(this);
    this.confirm = this.confirm.bind(this);
    this.state = {
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


  getScrollContainerRef() {
    return this.refScrollContainer;
  }

  getBreakoutChannelJoinURL(breakoutId) {
    const hasUser = breakoutRoomUser(breakoutId);
    if (hasUser) { return redirectToHtml5JoinURL; }
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

  newCreateBreakouts() {
    const { mountModal } = this.props;
    return mountModal(<BreakoutCreateModalContainer />);
  }
  confirm() {
    const { mountModal } = this.props;
    return mountModal(<ConfirmModal />);
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
      isThereUnassignedUsers,
      isPublicChat,
      activeChats,
    } = this.props;

    logger.info(`auth Id: ${Auth.meetingID}`);

    const { channelId, hideUsers } = this.state;
    const isBreakOutMeeting = meetingIsBreakout();
    const isModerator = currentUser.role === ROLE_MODERATOR;
    const otherUsers = isModerator ? "Unassigned" : "Learning group";

    return (

      <div className={styles.channelListColumn}>

        <div className={styles.container}>
          <div className={styles.buttonWrapper}>
            <Button
              className={styles.master}
              icon="icomoon-Master-Channel"
              onClick={() => null}
              // label="master channel"
              // hideLabel
            />
            <div className={isBreakOutMeeting ? styles.breakoutChannel : styles.masterChannel}>
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
                        isPublicChat,
                        activeChats,
                        requestUserInformation,
                        meetingIdentifier: Auth.meetingID,
                        getScrollContainerRef: this.getScrollContainerRef,
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
                  isPublicChat,
                  activeChats,
                  roving,
                  requestUserInformation,
                  meetingIdentifier: Auth.meetingID,
                  onlyModerators: true,
                  getScrollContainerRef: this.getScrollContainerRef,
                }}
              />
            </div>
          </div>
          }

          </div>
        </div>
  { isBreakOutMeeting && isMobileBrowser ?
                <div 
                  className={styles.createBreakouts}
                  onClick={ this.confirm}
                  role="button"
                  cursor="pointer"
                >
                  <span>Switch Workspace</span>
                </div> 
                : null }
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
      isUserActiveInBreakoutroom,
      activeChats

    } = this.props;

    const isBreakOutMeeting = meetingIsBreakout();
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
        getScrollContainerRef: this.getScrollContainerRef,
        activeChats,
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
}
//Channels.propTypes = PropTypes;
export default withModalMounter(injectIntl(Channels));