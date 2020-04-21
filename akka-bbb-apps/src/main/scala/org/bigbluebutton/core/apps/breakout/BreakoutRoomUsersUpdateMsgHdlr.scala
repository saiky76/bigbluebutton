package org.bigbluebutton.core.apps.breakout

import org.bigbluebutton.common2.msgs._
import org.bigbluebutton.core.api.BreakoutRoomUsersUpdateInternalMsg
import org.bigbluebutton.core.domain.{ BreakoutRoom2x, MeetingState2x }
import org.bigbluebutton.core.running.{ MeetingActor, OutMsgRouter }

trait BreakoutRoomUsersUpdateMsgHdlr {
  this: MeetingActor =>

  val outGW: OutMsgRouter

  def handleBreakoutRoomUsersUpdateInternalMsg(msg: BreakoutRoomUsersUpdateInternalMsg, state: MeetingState2x): MeetingState2x = {

    def broadcastEvent(room: BreakoutRoom2x, ejectedUsers: Vector[BreakoutUserVO]): BbbCommonEnvCoreMsg = {
      val routing = Routing.addMsgToClientRouting(MessageTypes.BROADCAST_TO_MEETING, props.meetingProp.intId, "not-used")
      val envelope = BbbCoreEnvelope(UpdateBreakoutUsersEvtMsg.NAME, routing)
      val header = BbbClientMsgHeader(UpdateBreakoutUsersEvtMsg.NAME, props.meetingProp.intId, "not-used")

      val users = room.users.map(u => BreakoutUserVO(u.id, u.name))
      //      val assignedUsers = room.assignedUsers.map(u => BreakoutUserVO(u.id, u.name))
      val body = UpdateBreakoutUsersEvtMsgBody(props.meetingProp.intId, msg.breakoutId, users, ejectedUsers)
      val event = UpdateBreakoutUsersEvtMsg(header, body)
      BbbCommonEnvCoreMsg(envelope, event)
    }

    val breakoutModel = for {
      model <- state.breakout
      room <- model.find(msg.breakoutId)
    } yield {

      val updatedRoom = room.copy(users = msg.users, voiceUsers = msg.voiceUsers,
        assignedUsers = room.assignedUsers.filterNot(u => msg.ejectedUsers.exists(e => (e.email == u.email) && (e.name == u.name))))

      val ejectedAssignedUsers = room.assignedUsers.filter(u => msg.ejectedUsers.exists(e => (e.email == u.email) && (e.name == u.name)))
        .map(u => new BreakoutUserVO(u.id, u.name))

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
