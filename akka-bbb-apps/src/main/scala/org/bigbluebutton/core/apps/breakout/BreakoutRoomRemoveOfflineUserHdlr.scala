package org.bigbluebutton.core.apps.breakout

import org.bigbluebutton.common2.msgs._
import org.bigbluebutton.core.domain.{ BreakoutRoom2x, MeetingState2x }
import org.bigbluebutton.core.running.{ MeetingActor, OutMsgRouter }

trait BreakoutRoomRemoveOfflineUserHdlr {
  this: MeetingActor =>

  val outGW: OutMsgRouter

  def handleRemoveOfflineUserFromBreakoutCmdMsg(msg: RemoveOfflineUserFromBreakoutCmdMsg, state: MeetingState2x): MeetingState2x = {

    val breakoutId = msg.body.breakoutId
    val email = msg.body.email
    val name = msg.body.name

    def broadcastEvent(room: BreakoutRoom2x, ejectedUsers: Vector[BreakoutUserVO]): BbbCommonEnvCoreMsg = {
      val routing = Routing.addMsgToClientRouting(MessageTypes.BROADCAST_TO_MEETING, props.meetingProp.intId, "not-used")
      val envelope = BbbCoreEnvelope(UpdateBreakoutUsersEvtMsg.NAME, routing)
      val header = BbbClientMsgHeader(UpdateBreakoutUsersEvtMsg.NAME, props.meetingProp.intId, "not-used")

      val users = room.users.map(u => BreakoutUserVO(u.id, u.name))
      val body = UpdateBreakoutUsersEvtMsgBody(props.meetingProp.intId, breakoutId, users, ejectedUsers)
      val event = UpdateBreakoutUsersEvtMsg(header, body)
      BbbCommonEnvCoreMsg(envelope, event)
    }

    val breakoutModel = for {
      model <- state.breakout
      room <- model.find(breakoutId)
    } yield {

      val updatedRoom = room.copy(assignedUsers = room.assignedUsers.filterNot(u => (email == u.email) && (name == u.name)))

      val ejectedAssignedUsers = room.assignedUsers.filter(u => (email == u.email) && (name == u.name))
        .map(u => new BreakoutUserVO(u.email, u.name))

      val msgEvent = broadcastEvent(updatedRoom, ejectedAssignedUsers)
      outGW.send(msgEvent)
      model.update(updatedRoom)
    }

    breakoutModel match {
      case Some(model) => state.update(Some(model))
      case None        => state
    }
  }
}
