import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { styles } from './styles';
import ChannelsContainer from '/imports/ui/components/channels/container';
import Button from '/imports/ui/components/button/component';
import { withModalMounter } from '/imports/ui/components/modal/service';
import BreakoutCreateModalContainer from '/imports/ui/components/breakout-create-modal/container';

import Button from '/imports/ui/components/button/component';

import { withModalMounter } from '/imports/ui/components/modal/service';
import AudioModalContainer from './step-breakoutroom-creation/audio-modal/container';

const propTypes = {
  activeChats: PropTypes.arrayOf(String).isRequired,
  compact: PropTypes.bool,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  currentUser: PropTypes.shape({}).isRequired,
  isPublicChat: PropTypes.func.isRequired,
  setEmojiStatus: PropTypes.func.isRequired,
  roving: PropTypes.func.isRequired,
  pollIsOpen: PropTypes.bool.isRequired,
  forcePollOpen: PropTypes.bool.isRequired,
  requestUserInformation: PropTypes.func.isRequired,
<<<<<<< HEAD
  isBreakoutRecordable: PropTypes.bool.isRequired,
=======
>>>>>>> b4aadc9b7881c76d98533bd1ccc5147be0020bbc
  mountModal: PropTypes.func.isRequired,
};

const defaultProps = {
  compact: false,
};
// const CHAT_ENABLED = Meteor.settings.public.chat.enabled;
const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

class UserContent extends PureComponent {
  constructor() {
    super();

     this.newCreateBreakouts=this.newCreateBreakouts.bind(this);
   
  }
  newCreateBreakouts(){
    const {mountModal}=this.props
<<<<<<< HEAD
    return  mountModal(<AudioModalContainer />)
=======
    return  mountModal(<BreakoutCreateModalContainer/>)
>>>>>>> b4aadc9b7881c76d98533bd1ccc5147be0020bbc
  }
 
  render() {
    const {
      compact,
      intl,
      currentUser,
      setEmojiStatus,
      roving,
      isPublicChat,
      activeChats,
      pollIsOpen,
      forcePollOpen,
      hasBreakoutRoom,
      pendingUsers,
      meetingIsBreakout,
      requestUserInformation,
    } = this.props;

    return (
      <div
        data-test="userListContent"
        className={styles.content}
        role="complementary"
      > 
                
      <Button
            //hideLabel
           // aria-label="New Breakout Channel"
            className={styles.button}
            label="+New Breakout Channel"
           // icon="actions"
            size="lg"
           // circle
           color="primary"
          onClick={this.newCreateBreakouts}
          />
<<<<<<< HEAD
          ) : null
        } */}
        {currentUser.role === ROLE_MODERATOR
          ? (
            <UserCaptionsContainer
              {...{
                intl,
              }}
            />
          ) : null 
        }
        <UserNotesContainer
          {...{
            intl,
          }}
        />
        {pendingUsers.length > 0 && currentUser.role === ROLE_MODERATOR
          ? (
            <WaitingUsers
              {...{
                intl,
                pendingUsers,
              }}
            />
          ) : null
        }
        <UserPolls
          isPresenter={currentUser.presenter}
          {...{
            pollIsOpen,
            forcePollOpen,
          }}
        />
                
      <Button
            
            //hideLabel
           // aria-label="New Breakout Channel"
            className={styles.button}
            label="+New Breakout Channel"
           // icon="actions"
            size="lg"
           // circle
           color="primary"
          onClick={this.newCreateBreakouts}
          />
     
        <BreakoutRoomItem isPresenter={currentUser.presenter} hasBreakoutRoom={hasBreakoutRoom} />
        <UserParticipantsContainer
=======

      <ChannelsContainer
>>>>>>> b4aadc9b7881c76d98533bd1ccc5147be0020bbc
          {...{
            compact,
            intl,
            currentUser,
            setEmojiStatus,
            roving,
            requestUserInformation,
          }}
        />

      </div>
    );
  }
}

UserContent.propTypes = propTypes;
UserContent.defaultProps = defaultProps;

export default withModalMounter(UserContent);
