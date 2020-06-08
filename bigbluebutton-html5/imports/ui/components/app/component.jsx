import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { throttle } from 'lodash';
import { defineMessages, injectIntl, intlShape } from 'react-intl';
import Modal from 'react-modal';
import browser from 'browser-detect';
import PanelManager from '/imports/ui/components/panel-manager/component';
import PollingContainer from '/imports/ui/components/polling/container';
import logger from '/imports/startup/client/logger';
import ActivityCheckContainer from '/imports/ui/components/activity-check/container';
import UserInfoContainer from '/imports/ui/components/user-info/container';
import BreakoutRoomInvitation from '/imports/ui/components/channels/invitation/container';
import Resizable from 're-resizable';
import ToastContainer from '../toast/container';
import ModalContainer from '../modal/container';
import NotificationsBarContainer from '../notifications-bar/container';
import AudioContainer from '../audio/container';
import ChatAlertContainer from '../chat/alert/container';
import BannerBarContainer from '/imports/ui/components/banner-bar/container';
import WaitingNotifierContainer from '/imports/ui/components/waiting-users/alert/container';
import LockNotifier from '/imports/ui/components/lock-viewers/notify/container';
import PingPongContainer from '/imports/ui/components/ping-pong/container';
import MediaService from '/imports/ui/components/media/service';
import ManyWebcamsNotifier from '/imports/ui/components/video-provider/many-users-notify/container';
import { styles } from './styles';
import ChatContainer from '/imports/ui/components/chat/container';
import { Session } from 'meteor/session';

// import Resizable from 're-resizable';
import Button from '/imports/ui/components/button/component';
import ActionsBarContainer from '../actions-bar/container';
import { is } from 'useragent';

const MOBILE_MEDIA = 'only screen and (max-width: 53em)';
const APP_CONFIG = Meteor.settings.public.app;
const DESKTOP_FONT_SIZE = APP_CONFIG.desktopFontSize;
const MOBILE_FONT_SIZE = APP_CONFIG.mobileFontSize;
const ENABLE_NETWORK_MONITORING = Meteor.settings.public.networkMonitoring.enableNetworkMonitoring;
const dispatchResizeEvent = () => window.dispatchEvent(new Event('resize'));

const intlMessages = defineMessages({
  userListLabel: {
    id: 'app.userList.label',
    description: 'Aria-label for Userlist Nav',
  },
  chatLabel: {
    id: 'app.chat.label',
    description: 'Aria-label for Chat Section',
  },
  mediaLabel: {
    id: 'app.media.label',
    description: 'Aria-label for Media Section',
  },
  actionsBarLabel: {
    id: 'app.actionsBar.label',
    description: 'Aria-label for ActionsBar Section',
  },
  joinAudio: {
    id: 'app.audio.joinAudio',
    description: 'Join audio button label',
  },
  iOSWarning: {
    id: 'app.iOSWarning.label',
    description: 'message indicating to upgrade ios version',
  },
  clearedEmoji: {
    id: 'app.toast.clearedEmoji.label',
    description: 'message for cleared emoji status',
  },
  setEmoji: {
    id: 'app.toast.setEmoji.label',
    description: 'message when a user emoji has been set',
  },
  meetingMuteOn: {
    id: 'app.toast.meetingMuteOn.label',
    description: 'message used when meeting has been muted',
  },
  meetingMuteOff: {
    id: 'app.toast.meetingMuteOff.label',
    description: 'message used when meeting has been unmuted',
  },
  pollPublishedLabel: {
    id: 'app.whiteboard.annotations.poll',
    description: 'message displayed when a poll is published',
  },
});

const propTypes = {
  navbar: PropTypes.element,
  sidebar: PropTypes.element,
  media: PropTypes.element,
  actionsbar: PropTypes.element,
  captions: PropTypes.element,
  locale: PropTypes.string,
  intl: intlShape.isRequired,
};

const defaultProps = {
  navbar: null,
  sidebar: null,
  media: null,
  actionsbar: null,
  captions: null,
  locale: 'en',
};

const LAYERED_BREAKPOINT = 848;
const isLayeredView = window.matchMedia(`(max-width: ${LAYERED_BREAKPOINT}px)`);

const BROWSER_RESULTS = browser();
const isMobileBrowser = BROWSER_RESULTS.mobile || BROWSER_RESULTS.os.includes('Android');
const isLandScapeView = window.orientation === 90 || window.orientation === -90;

const chat_min_width = (isMobileBrowser && isLandScapeView) ? 0.56 : 0.58;
const chat_max_width = (isMobileBrowser && isLandScapeView) ? 0.7 : 0.8;

// Variables for resizing chat.
  const CHAT_MIN_WIDTH =  window.innerWidth * chat_min_width;
  const CHAT_MAX_WIDTH =  window.innerWidth * chat_max_width;

class App extends Component {
  constructor() {
    super();
    this.state = {
      chatWidth: CHAT_MAX_WIDTH,
      enableResize: !window.matchMedia(MOBILE_MEDIA).matches,
      toggleChatLayout: true,
    };


    this.handleWindowResize = throttle(this.handleWindowResize).bind(this);
    this.shouldAriaHide = this.shouldAriaHide.bind(this);
    this.toggleChatPanel = this.toggleChatPanel.bind(this);
  }


  componentDidMount() {
    const {
      locale, notify, intl, validIOSVersion, startBandwidthMonitoring, handleNetworkConnection,
    } = this.props;

    MediaService.setSwapLayout();
    Modal.setAppElement('#app');
    document.getElementsByTagName('html')[0].lang = locale;
    document.getElementsByTagName('html')[0].style.fontSize = isMobileBrowser ? MOBILE_FONT_SIZE : DESKTOP_FONT_SIZE;

    const body = document.getElementsByTagName('body')[0];
    if (BROWSER_RESULTS && BROWSER_RESULTS.name) {
      body.classList.add(`browser-${BROWSER_RESULTS.name}`);
    }
    if (BROWSER_RESULTS && BROWSER_RESULTS.os) {
      body.classList.add(`os-${BROWSER_RESULTS.os.split(' ').shift().toLowerCase()}`);
    }

    if (!validIOSVersion()) {
      notify(
        intl.formatMessage(intlMessages.iOSWarning), 'error', 'warning',
      );
    }

    this.handleWindowResize();
    window.addEventListener('resize', this.handleWindowResize, false);

    if (ENABLE_NETWORK_MONITORING) {
      if (navigator.connection) {
        handleNetworkConnection();
        navigator.connection.addEventListener('change', handleNetworkConnection);
      }

      startBandwidthMonitoring();
    }

    logger.info({ logCode: 'app_component_componentdidmount' }, 'Client loaded successfully');
  }

  componentDidUpdate(prevProps) {
    const {
      meetingMuted, notify, currentUserEmoji, intl, hasPublishedPoll,
    } = this.props;

    if (prevProps.currentUserEmoji.status !== currentUserEmoji.status) {
      const formattedEmojiStatus = intl.formatMessage({ id: `app.actionsBar.emojiMenu.${currentUserEmoji.status}Label` })
      || currentUserEmoji.status;

      notify(
        currentUserEmoji.status === 'none'
          ? intl.formatMessage(intlMessages.clearedEmoji)
          : intl.formatMessage(intlMessages.setEmoji, ({ 0: formattedEmojiStatus })),
        'info',
        currentUserEmoji.status === 'none'
          ? 'clear_status'
          : 'user',
      );
    }
    if (!prevProps.meetingMuted && meetingMuted) {
      notify(
        intl.formatMessage(intlMessages.meetingMuteOn), 'info', 'mute',
      );
    }
    if (prevProps.meetingMuted && !meetingMuted) {
      notify(
        intl.formatMessage(intlMessages.meetingMuteOff), 'info', 'unmute',
      );
    }
    if (!prevProps.hasPublishedPoll && hasPublishedPoll) {
      notify(
        intl.formatMessage(intlMessages.pollPublishedLabel), 'info', 'polling',
      );
    }
  }

  componentWillUnmount() {
    const { handleNetworkConnection } = this.props;
    window.removeEventListener('resize', this.handleWindowResize, false);
    if (navigator.connection) {
      navigator.connection.addEventListener('change', handleNetworkConnection, false);
    }
  }

  handleWindowResize() {
    const { enableResize } = this.state;
    const shouldEnableResize = !window.matchMedia(MOBILE_MEDIA).matches;
    if (enableResize === shouldEnableResize) return;

    this.setState({ enableResize: shouldEnableResize });
  }

  shouldAriaHide() {
    const { openPanel, isPhone } = this.props;
    return openPanel !== '' && (isPhone || isLayeredView.matches);
  }

  renderPanel() {
    const { enableResize } = this.state;
    const { openPanel, isRTL } = this.props;

    return (
      <PanelManager
        {...{
          openPanel,
          enableResize,
          isRTL,
        }}
        shouldAriaHide={this.shouldAriaHide}
      />
    );
  }

  renderNavBar() {
    const { navbar } = this.props;

    if (!navbar) return null;

    return (
      <header className={styles.navbar}>
        {navbar}
      </header>
    );
  }

  renderSidebar() {
    const { sidebar } = this.props;

    if (!sidebar) return null;

    return (
      <aside className={styles.sidebar}>
        {sidebar}
      </aside>
    );
  }

  renderCaptions() {
    const { captions } = this.props;

    if (!captions) return null;

    return (
      <div className={styles.captionsWrapper}>
        {captions}
      </div>
    );
  }

  renderMedia() {
    const {
      media,
      intl,
      swapLayout,
    } = this.props;

    if (!media) return null;

    return (
      <section
        className={!swapLayout ? styles.media : styles.noMedia}
        aria-label={intl.formatMessage(intlMessages.mediaLabel)}
        aria-hidden={this.shouldAriaHide()}
      >
        {media}
      </section>
    );
  }

  renderActionsBar() {
    const {
      actionsbar,
      intl,
      talkers,
      voiceUsers,
    } = this.props;

    const {
      toggleChatLayout,
    } = this.state;
    if (!actionsbar) return null;

    return (
      <section
        className={styles.actionsbar}
        aria-label={intl.formatMessage(intlMessages.actionsBarLabel)}
        aria-hidden={this.shouldAriaHide()}
      >
        <ActionsBarContainer toggleChatLayout={isMobileBrowser ? !toggleChatLayout : toggleChatLayout} talkers={talkers} voiceUsers={voiceUsers}/>
      </section>
    );
  }

  renderActivityCheck() {
    const { User } = this.props;

    const { inactivityCheck, responseDelay } = User;

    return (inactivityCheck ? (
      <ActivityCheckContainer
        inactivityCheck={inactivityCheck}
        responseDelay={responseDelay}
      />) : null);
  }

  renderUserInformation() {
    const { UserInfo, User } = this.props;

    return (UserInfo.length > 0 ? (
      <UserInfoContainer
        UserInfo={UserInfo}
        requesterUserId={User.userId}
        meetingId={User.meetingId}
      />) : null);
  }

  toggleChatPanel() {
    const { isThereCurrentPresentation, inAudio } = this.props;
    const { chatWidth } = this.state;
    if (chatWidth == CHAT_MIN_WIDTH) {
      if (!isThereCurrentPresentation || (isThereCurrentPresentation && !inAudio) ){
        this.setState({
          chatWidth:CHAT_MAX_WIDTH,
          toggleChatLayout:true
        })
      }
    }
    if(chatWidth == CHAT_MAX_WIDTH){
      this.setState({
        chatWidth:CHAT_MIN_WIDTH,
        toggleChatLayout:false
      })
    }
  }

  renderChat() {
    return (
      <section
        className={styles.chat}
      >
        <ChatContainer />
      </section>
    );
  }

  renderChatResizable() {
    const { isThereCurrentPresentation, isVideoBroadcasting, isRTL, inAudio } = this.props;
    const { chatWidth } = this.state;

    if(!inAudio) {}
    else if((isThereCurrentPresentation || isVideoBroadcasting) && chatWidth == CHAT_MAX_WIDTH) {
      this.toggleChatPanel();
    }

    const resizableEnableOptions = {
      top: false,
      right: !isRTL,
      bottom: false,
      left: !!isRTL,
      topRight: false,
      bottomRight: false,
      bottomLeft: false,
      topLeft: false,
    };

    return (
    <div className={styles.chatWrapper}>
        <Resizable
          minWidth={CHAT_MIN_WIDTH}
          maxWidth={CHAT_MAX_WIDTH}
         enable={resizableEnableOptions}
          size={{ width: chatWidth }}
          onResize={dispatchResizeEvent}
          className={styles.chatChannel}
        >
          {this.renderChat()}
        </Resizable>
        <div className={styles.slide}>
          <Button
            hideLabel
            onClick={() => this.toggleChatPanel()}
            size="sm"
            icon={(chatWidth !== CHAT_MAX_WIDTH) ? 'icomoon-Collapse-Call-Panel' : 'icomoon-Expand-Call-Panel'}
            className={styles.hide}
            color="default"
            label="toggle"
          />
        </div>
      </div>
    );
  }

  render() {
    const {
      customStyle, customStyleUrl, openPanel, inAudio, handleJoinAudio, intl,
    } = this.props;
    const { enableResize } = this.state;
    return (
      <main className={styles.main}>
        {this.renderActivityCheck()}
        {this.renderUserInformation()}
        <BannerBarContainer />
        <NotificationsBarContainer />
        <section className={styles.wrapper}>
          {this.renderPanel()}
          <div className={styles.container}>
            { isMobileBrowser
             ?  Session.get('openPanel') == 'chat'   ?  this.renderNavBar()  : null
            : this.renderNavBar()
            }
            <div className={styles.panelContainer}>
              <div className={styles.presentationPanel}>
               { isMobileBrowser && Session.get('openPanel') == '' ? 
               <div className={styles.togglechat} > 
               <Button
                    onClick={()=>{
                      Session.set('idChatOpen', '');
                      Session.set('openPanel', 'chat');
                    } }
                    hideLabel
                    label="toggle chat"
                    color="default"
                   // ghost={!inAudio}
                    icon="icomoon-Chat"
                    size='lg'
                    circle
                  /> 
                  </div>
                  :  null
                  }
              { inAudio ?
                <div className={openPanel ? styles.content : styles.noPanelContent}>
                  {this.renderMedia()}
                  {this.renderActionsBar()}
                </div>
                 : 
                <div className={styles.noAudio}>
                  <Button
                    className={styles.button}
                    onClick={handleJoinAudio}
                    hideLabel
                    label={intl.formatMessage(intlMessages.joinAudio)}
                    color="default"
                    ghost={!inAudio}
                    icon="icomoon-Join-Call"
                    size='lg'
                    circle
                  />
                </div>
              }
              </div>
              { 
              (openPanel !== '' && !isMobileBrowser ) ? (
                 (enableResize) ?  this.renderChatResizable() :  null
               
              ) :

             ( (openPanel == 'chat')
               ?
               (enableResize) ? this.renderChatResizable() : this.renderChat()
              :
               null)
               }
            </div>
          </div>
        </section>
        <BreakoutRoomInvitation />
        <PollingContainer />
        <ModalContainer />
        <AudioContainer />
        <ToastContainer rtl />
        <ChatAlertContainer />
        <WaitingNotifierContainer />
        <LockNotifier />
        <PingPongContainer />
        <ManyWebcamsNotifier />
        {customStyleUrl ? <link rel="stylesheet" type="text/css" href={customStyleUrl} /> : null}
        {customStyle ? <link rel="stylesheet" type="text/css" href={`data:text/css;charset=UTF-8,${encodeURIComponent(customStyle)}`} /> : null}
      </main>
    );
  }
}

App.propTypes = propTypes;
App.defaultProps = defaultProps;

export default injectIntl(App);
