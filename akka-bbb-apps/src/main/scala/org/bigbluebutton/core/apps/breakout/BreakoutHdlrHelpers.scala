package org.bigbluebutton.core.apps.breakout

import org.bigbluebutton.SystemConfiguration
import org.bigbluebutton.common2.msgs._
import org.bigbluebutton.core.api.{ BreakoutRoomUsersUpdateInternalMsg }
import org.bigbluebutton.core.bus.{ BigBlueButtonEvent, InternalEventBus }
import org.bigbluebutton.core.domain.{ BreakoutUser, BreakoutVoiceUser }
import org.bigbluebutton.core.models.{ Users2x, VoiceUsers }
import org.bigbluebutton.core.running.{ LiveMeeting, OutMsgRouter }

object BreakoutHdlrHelpers extends SystemConfiguration {
  def sendJoinURL(
      liveMeeting:       LiveMeeting,
      outGW:             OutMsgRouter,
      userId:            String,
      externalMeetingId: String,
      roomSequence:      String,
      breakoutId:        String
  ) {
    for {
      user <- Users2x.findWithIntId(liveMeeting.users2x, userId)

      apiCall = "join"
      (redirectParams, redirectToHtml5Params) = BreakoutRoomsUtil.joinParams(user.name, userId + "-" + roomSequence, user.email, true,
        externalMeetingId, liveMeeting.props.password.moderatorPass)
      // We generate a first url with redirect -> true
      redirectBaseString = BreakoutRoomsUtil.createBaseString(redirectParams)
      redirectJoinURL = BreakoutRoomsUtil.createJoinURL(bbbWebAPI, apiCall, redirectBaseString,
        BreakoutRoomsUtil.calculateChecksum(apiCall, redirectBaseString, bbbWebSharedSecret))
      // We generate a second url with redirect -> true and joinViaHtml5 -> true
      redirectToHtml5BaseString = BreakoutRoomsUtil.createBaseString(redirectToHtml5Params)
      redirectToHtml5JoinURL = BreakoutRoomsUtil.createJoinURL(bbbWebAPI, apiCall, redirectToHtml5BaseString,
        BreakoutRoomsUtil.calculateChecksum(apiCall, redirectToHtml5BaseString, bbbWebSharedSecret))

      //Add the new user to the assigned list in break out room

    } yield {
      sendJoinURLMsg(
        outGW,
        liveMeeting.props.meetingProp.intId,
        breakoutId,
        externalMeetingId,
        userId,
        user.name,
        user.email,
        redirectJoinURL,
        redirectToHtml5JoinURL
      )
    }
  }

  def sendJoinURLMsg(
      outGW:                  OutMsgRouter,
      meetingId:              String,
      breakoutId:             String,
      externalId:             String,
      userId:                 String,
      userName:               String,
      email:                  String,
      redirectJoinURL:        String,
      redirectToHtml5JoinURL: String
  ): Unit = {
    def build(meetingId: String, breakoutId: String,
              userId: String, userName: String, email: String, redirectJoinURL: String, redirectToHtml5JoinURL: String): BbbCommonEnvCoreMsg = {
      val routing = Routing.addMsgToClientRouting(MessageTypes.DIRECT, meetingId, userId)
      val envelope = BbbCoreEnvelope(BreakoutRoomJoinURLEvtMsg.NAME, routing)
      val header = BbbClientMsgHeader(BreakoutRoomJoinURLEvtMsg.NAME, meetingId, userId)

      val body = BreakoutRoomJoinURLEvtMsgBody(meetingId, breakoutId, externalId,
        userId, userName, email, redirectJoinURL, redirectToHtml5JoinURL)
      val event = BreakoutRoomJoinURLEvtMsg(header, body)
      BbbCommonEnvCoreMsg(envelope, event)
    }

    val msgEvent = build(meetingId, breakoutId, userId, userName, email, redirectJoinURL, redirectToHtml5JoinURL)
    outGW.send(msgEvent)

  }

  def updateParentMeetingWithUsers(
      liveMeeting: LiveMeeting,
      eventBus:    InternalEventBus
  ): Unit = {

    val users = Users2x.findAll(liveMeeting.users2x)
    val ejectedUsers = Users2x.findAllEjectedUsers(liveMeeting.users2x)

    val breakoutUsers = users map { u => new BreakoutUser(u.extId, u.name, u.email) }
    val recentlyEjectedUsers = ejectedUsers map { u =>
      Users2x.removeEjectedUser(liveMeeting.users2x, u.intId)
      new BreakoutUser(u.extId, u.name, u.email)
    }

    val voiceUsers = VoiceUsers.findAll(liveMeeting.voiceUsers)
    val breakoutVoiceUsers = voiceUsers map { vu => BreakoutVoiceUser(vu.intId, vu.intId, vu.voiceUserId) }

    eventBus.publish(BigBlueButtonEvent(
      liveMeeting.props.breakoutProps.parentId,
      new BreakoutRoomUsersUpdateInternalMsg(liveMeeting.props.breakoutProps.parentId, liveMeeting.props.meetingProp.intId,
        breakoutUsers, breakoutVoiceUsers, recentlyEjectedUsers)
    ))
  }
}
