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
    this.state = {
      sideavatars:[],
    };

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
      allJoined,
    } = this.props;

    const { sideavatars } = this.state;
    Object.keys(talkers).map((id) => {
  
    if( (sideavatars.length >= 1 && sideavatars[0].intId != id) || sideavatars.length == 0)   
     {
      sideavatars.push(talkers[`${id}`]);
      if( sideavatars.length>2 ){
        sideavatars.shift();
      }
    }
    this.setState({ sideavatars: sideavatars })
    });
    for (let i = 0; i < sideavatars.length; i++) {
      let a = 0;
      for (let j = 0; j < allJoined.length; j++) {
        if( sideavatars[i].intId == allJoined[j].intId ){
          a++;
        }
      }   
      if( a!=1 ){
        if( i==0 )
        { sideavatars.shift(); }
        else if(i==1)
        { sideavatars.pop(); }
      }
      this.setState({ sideavatars: sideavatars })
    }
    
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
             sideavatars.length > 0 ? styles.dummy1 : styles.dummy
              : styles.dummy2}>

            {/* <img src="https://miro.medium.com/max/560/1*MccriYX-ciBniUzRKAUsAw.png" alt="" /> */}

         {  
         sideavatars[ sideavatars.length>2 ? sideavatars.length-2 : 0 ] ? 
         <UserAvatar
           key={`user-avatar-`}
          // moderator={u.role === 'MODERATOR'}
           color={sideavatars[ sideavatars.length>2 ? sideavatars.length-2 : 0 ].color}
           >
          {sideavatars[ sideavatars.length>2 ? sideavatars.length-2 : 0 ].callerName.slice(0, 2).toLowerCase()}
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
             sideavatars[sideavatars.length>2 ? sideavatars.length-1 : 1] ? 
             <UserAvatar
             key={`user-avatar-`}
            // moderator={u.role === 'MODERATOR'}
             color={sideavatars[sideavatars.length>2 ? sideavatars.length-1 : 1].color}
            >
            {sideavatars[ sideavatars.length>2 ? sideavatars.length-1 : 1 ].callerName.slice(0, 2).toLowerCase()}
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
