import React, { PureComponent } from 'react';
import cx from 'classnames';
import { defineMessages } from 'react-intl';
import { styles } from './styles.scss';
import DesktopShare from './desktop-share/component';
import ActionsDropdown from './actions-dropdown/component';
import AudioControlsContainer from '../audio/audio-controls/container';
import JoinVideoOptionsContainer from '../video-provider/video-button/container';
import Button from '/imports/ui/components/button/component';
import TalkingIndicatorContainer from '/imports/ui/components/nav-bar/talking-indicator/container';
import Auth from '/imports/ui/services/auth';
import VideoProviderContainer from '/imports/ui/components/video-provider/container';
import UserAvatar from '/imports/ui/components/user-avatar/component';
import { Session } from 'meteor/session';

const intlMessages = defineMessages({
  joinAudio: {
    id: 'app.audio.joinAudio',
    description: 'Join audio button label',
  },
  leaveAudio: {
    id: 'app.audio.leaveAudio',
    description: 'Leave audio button label',
  },
  muteAudio: {
    id: 'app.actionsBar.muteLabel',
    description: 'Mute audio button label',
  },
  unmuteAudio: {
    id: 'app.actionsBar.unmuteLabel',
    description: 'Unmute audio button label',
  },
});

class ActionsBar extends PureComponent {
  constructor() {
    super();
    Session.set('sideavatars', [])
  }
  
  render() {
    const {
      amIPresenter,
      handleExitVideo,
      handleJoinVideo,
      handleShareScreen,
      handleUnshareScreen,
      isVideoBroadcasting,
      amIModerator,
      screenSharingCheck,
      enableVideo,
      isLayoutSwapped,
      handleTakePresenter,
      intl,
      isSharingVideo,
      screenShareEndAlert,
      stopExternalVideoShare,
      screenshareDataSavingSetting,
      toggleChatLayout,
      isMeteorConnected,
      isPollingEnabled,
      allowExternalVideo,
      inAudio,
      handleLeaveAudio,
      handleJoinAudio,
      isThereCurrentPresentation,
      validateMeetingIsBreakout,
      isVideoStreamTransmitting,
      isSharingWebCam,
      presenter,
      talkers,
      voiceUsers,
    } = this.props;

    let sideavatars = Session.get('sideavatars');

    //Remove presenter and any non existent voice users from sideavatars
    sideavatars = sideavatars.filter(sa => voiceUsers.find(vu => sa.intId == vu.intId) !== undefined);
    if(presenter){
      sideavatars = sideavatars.filter(sa => presenter.intId !== sa.intId);
    }

    //Now replace any new talkers with existing ones
    Object.keys(talkers).map((id) => {
      if(sideavatars.find(sa => sa.intId == id) == undefined){
        console.log("Caller being added ", talkers[`${id}`].callerName);
        sideavatars.push(talkers[`${id}`]);
        if( sideavatars.length > 2 ){
          console.log("Removing a user");
          sideavatars.shift();
        }
      }
    });

    Session.set('sideavatars', sideavatars)
    
    const actionBarClasses = {};

    let joinIcon = '';
    let endCall = false;
    if (inAudio) {
      joinIcon = 'icomoon-End-Call';
      endCall = true;
    }

    actionBarClasses[styles.centerWithActions] = amIPresenter;
    actionBarClasses[styles.center] = true;
    actionBarClasses[styles.mobileLayoutSwapped] = isLayoutSwapped && amIPresenter;

    if(!amIPresenter && isSharingWebCam){
      handleExitVideo();    
    }

    return (
      <div className={cx(actionBarClasses)}>
        <div className={!toggleChatLayout ? styles.actionsController : styles.toggledActions}>
          <AudioControlsContainer />
          <div>
            {enableVideo && amIPresenter && !validateMeetingIsBreakout(Auth.meetingID)
              ? (
                <JoinVideoOptionsContainer
                  handleJoinVideo={handleJoinVideo}
                  handleCloseVideo={handleExitVideo}
                />
              )
              : null}
          </div>
          <div>
            <DesktopShare {...{
              handleShareScreen,
              handleUnshareScreen,
              isVideoBroadcasting,
              amIPresenter,
              screenSharingCheck,
              screenShareEndAlert,
              isMeteorConnected,
              screenshareDataSavingSetting,
            }}
            />
          </div>
          <div>
            <ActionsDropdown {...{
              amIPresenter,
              amIModerator,
              isPollingEnabled,
              allowExternalVideo,
              handleTakePresenter,
              intl,
              isSharingVideo,
              stopExternalVideoShare,
              isMeteorConnected,
              handleUnshareScreen,
              isVideoBroadcasting
            }}
            />
          </div>
        </div>
      {toggleChatLayout ? null :
        <div className={styles.liveActions}>
          <div className={!toggleChatLayout ?
             sideavatars.length > 0 && presenter ? styles.dummy1 : styles.dummy
              : styles.dummy2}>

            {/* <img src="https://miro.medium.com/max/560/1*MccriYX-ciBniUzRKAUsAw.png" alt="" /> */}

         {  
         sideavatars[0] ? 
          <UserAvatar
            key={`user-avatar-`}
            // moderator={u.role === 'MODERATOR'}
            color={sideavatars[0].color}
            >
            {sideavatars[0].callerName.slice(0, 2).toLowerCase()}
          </UserAvatar>  
          :
           null
        }
            {
              (isVideoStreamTransmitting || isSharingWebCam)
                ? (
                  <div className={styles.video}>
                  <VideoProviderContainer
                    swapLayout={false}
                  />
                  </div>
                )
                : 
                 //should show avatar here
                ( presenter ?
                 <div className={styles.presenteravatar}>
                 <UserAvatar
                 key={`user-avatar-${presenter.userId}`}
                // moderator={u.role === 'MODERATOR'}
                 color={presenter.color}
               >
                 {presenter.name.slice(0, 2).toLowerCase()}
               </UserAvatar>
               </div>
               : null)
            }
            { 
             sideavatars[1] ? 
              <UserAvatar
              key={`user-avatar-`}
              // moderator={u.role === 'MODERATOR'}
              color={sideavatars[1].color}
              >
              {sideavatars[1].callerName.slice(0, 2).toLowerCase()}
              </UserAvatar> 
            : 
            null
           }
            {/* <img src="https://miro.medium.com/max/560/1*MccriYX-ciBniUzRKAUsAw.png" alt="" /> */}
          </div>
          <div className={styles.talkingIndicator}>
            <TalkingIndicatorContainer amIModerator={amIModerator} />
          </div>
        </div>
      }
        <div className={styles.audioButton}>
          <Button
            className={cx(styles.button, inAudio, endCall ? styles.endingCall : null)}
            onClick={inAudio ? handleLeaveAudio : handleJoinAudio}
            hideLabel
            label={inAudio ? intl.formatMessage(intlMessages.leaveAudio)
              : intl.formatMessage(intlMessages.joinAudio)}
            color="default"
            ghost={!inAudio}
            icon={joinIcon}
            size={!toggleChatLayout ? 'xl' : 'lg'}
            circle
          />
        </div>
      </div>
    );
  }
}

export default ActionsBar;